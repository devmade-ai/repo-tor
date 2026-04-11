import React, { useMemo, useCallback } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import {
    formatDate, getCommitTags, getTagClass, getTagStyleObject,
    getAuthorEmail, getAuthorName, getCommitSubject,
    sanitizeMessage, getWorkPattern, getAdditions, getDeletions, handleKeyActivate,
    getUTCDateKey, getUTCMonthKey, excludeIncompleteLastMonth,
} from '../utils.js';
import { aggregateByWeekPeriod, aggregateByDayPeriod } from '../charts.js';
import { seriesColors, accentColor, getSeriesColor, withOpacity, mutedColor, buildRepoColorMap } from '../chartColors.js';
import { PAGE_LIMITS } from '../state.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import ShowMoreButton from '../components/ShowMoreButton.jsx';
import useShowMore from '../hooks/useShowMore.js';

export default function Timeline() {
    const { state, dispatch, filteredCommits, viewConfig, openDetailPane, isMobile, commitsLoaded } = useApp();

    // Requirement: Paginate commit list — 100 was far too many on mobile
    // Approach: 10 mobile / 25 desktop initial, batched "Show more"
    const {
        visible: visibleCommits,
        hasMore: commitsHasMore,
        remaining: commitsRemaining,
        showMore: showMoreCommits,
    } = useShowMore(filteredCommits, ...PAGE_LIMITS.timeline, isMobile);

    // Summary card data
    // Requirement: Show summary stats from pre-aggregated data before commits load
    // Once commits are loaded, always use filteredCommits (even if empty due to filters)
    // to avoid falling back to unfiltered summary data
    const summaryData = useMemo(() => {
        if (commitsLoaded) {
            const totalCommits = filteredCommits.length;
            const uniqueDays = new Set(filteredCommits.map(c => c.timestamp ? getUTCDateKey(c.timestamp) : null).filter(Boolean));
            const activeDays = uniqueDays.size;
            const sortedDates = [...uniqueDays].sort();

            let earliest = 'No data';
            let latest = '';
            let daySpan = '';
            if (sortedDates.length > 0) {
                earliest = new Date(sortedDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                latest = new Date(sortedDates[sortedDates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                daySpan = `in ${sortedDates.length} day span`;
            }

            const uniqueContributors = new Set(filteredCommits.map(c => getAuthorEmail(c)));
            const avgPerDay = activeDays > 0 ? (totalCommits / activeDays).toFixed(1) : '0';

            return {
                totalCommits, activeDays, earliest, latest, daySpan,
                contributors: uniqueContributors.size, avgPerDay,
            };
        }

        // Pre-aggregated fallback
        const summary = state.data?.summary;
        const dateRange = summary?.dateRange;
        const daily = summary?.daily;
        if (summary && daily) {
            const totalCommits = summary.totalCommits || 0;
            const activeDays = Object.keys(daily).length;
            const sortedDates = Object.keys(daily).sort();

            let earliest = 'No data';
            let latest = '';
            let daySpan = '';
            if (sortedDates.length > 0) {
                earliest = new Date(sortedDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                latest = new Date(sortedDates[sortedDates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                daySpan = `in ${sortedDates.length} day span`;
            }

            const contributors = state.data?.contributors?.length || summary.totalContributors || 0;
            const avgPerDay = activeDays > 0 ? (totalCommits / activeDays).toFixed(1) : '0';

            return {
                totalCommits, activeDays, earliest, latest, daySpan,
                contributors, avgPerDay,
            };
        }

        return {
            totalCommits: 0, activeDays: 0, earliest: 'No data', latest: '',
            daySpan: '', contributors: 0, avgPerDay: '0',
        };
    }, [filteredCommits, commitsLoaded, state.data?.summary]);

    // Activity timeline chart data
    // Requirement: Render chart from pre-aggregated daily data when commits aren't loaded
    // Approach: Use summary.daily buckets for initial render, switch to filteredCommits
    //   once commits are loaded (for filter-aware rendering)
    // Alternatives: Wait for commits — rejected, delays chart rendering unnecessarily
    const activityChartData = useMemo(() => {
        let commitsByDate = {};
        let repos = [];

        if (commitsLoaded) {
            // Commits loaded: compute from filtered commits (supports all filters)
            repos = [...new Set(filteredCommits.map(c => c.repo_id).filter(Boolean))];

            filteredCommits.forEach(commit => {
                if (!commit.timestamp) return;
                const dateStr = getUTCDateKey(commit.timestamp);
                if (!commitsByDate[dateStr]) {
                    commitsByDate[dateStr] = { total: 0, byRepo: {} };
                }
                commitsByDate[dateStr].total++;
                if (commit.repo_id) {
                    commitsByDate[dateStr].byRepo[commit.repo_id] =
                        (commitsByDate[dateStr].byRepo[commit.repo_id] || 0) + 1;
                }
            });
        } else if (state.data?.summary?.daily) {
            // Pre-aggregated: use daily buckets from summary
            const daily = state.data.summary.daily;
            for (const [dateStr, bucket] of Object.entries(daily)) {
                commitsByDate[dateStr] = {
                    total: bucket.commits,
                    byRepo: bucket.repos || {},
                };
                // Collect repo names from bucket data
                for (const repo of Object.keys(bucket.repos || {})) {
                    if (!repos.includes(repo)) repos.push(repo);
                }
            }
        }

        const repoColors = buildRepoColorMap(repos);

        const sortedDates = Object.keys(commitsByDate).sort().slice(-60);
        if (sortedDates.length === 0) return null;

        const labels = sortedDates.map(d => {
            const date = new Date(d);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        let datasets;
        if (repos.length > 1) {
            datasets = repos.map(repo => ({
                label: repo,
                data: sortedDates.map(d => commitsByDate[d]?.byRepo[repo] || 0),
                backgroundColor: repoColors[repo],
                borderRadius: 2,
            }));
        } else {
            datasets = [{
                label: 'Commits',
                data: sortedDates.map(d => commitsByDate[d]?.total || 0),
                backgroundColor: accentColor,
                borderRadius: 2,
            }];
        }


        return {
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: repos.length > 1,
                        position: 'top',
                        labels: { font: { size: isMobile ? 10 : 12 }, boxWidth: isMobile ? 8 : 40 },
                    },
                },
                scales: {
                    x: {
                        stacked: repos.length > 1,
                        ticks: {
                            maxRotation: isMobile ? 60 : 45,
                            font: { size: isMobile ? 10 : 12 },
                            callback: function (value, index) {
                                const step = Math.ceil(sortedDates.length / (isMobile ? 8 : 15));
                                return index % step === 0 ? this.getLabelForValue(value) : '';
                            },
                        },
                    },
                    y: {
                        stacked: repos.length > 1,
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { size: isMobile ? 10 : 12 } },
                    },
                },
            },
        };
    // state.darkMode: bust memo on theme toggle so react-chartjs-2 calls chart.update(),
    // picking up the new Chart.js defaults set in AppContext's darkMode effect
    }, [filteredCommits, commitsLoaded, state.data?.summary?.daily, isMobile, state.darkMode]);

    // Code changes timeline chart data
    // Uses pre-aggregated daily data (additions/deletions) when commits aren't loaded
    const codeChangesChartData = useMemo(() => {
        let changesByDate = {};
        let repos = [];

        if (commitsLoaded) {
            repos = [...new Set(filteredCommits.map(c => c.repo_id).filter(Boolean))];

            filteredCommits.forEach(commit => {
                if (!commit.timestamp) return;
                const dateStr = getUTCDateKey(commit.timestamp);
                if (!changesByDate[dateStr]) {
                    changesByDate[dateStr] = { total: 0, byRepo: {} };
                }
                const additions = getAdditions(commit);
                const deletions = getDeletions(commit);
                const netChange = additions - deletions;
                changesByDate[dateStr].total += netChange;
                if (commit.repo_id) {
                    changesByDate[dateStr].byRepo[commit.repo_id] =
                        (changesByDate[dateStr].byRepo[commit.repo_id] || 0) + netChange;
                }
            });
        } else if (state.data?.summary?.daily) {
            // Pre-aggregated: use daily bucket additions/deletions
            const daily = state.data.summary.daily;
            for (const [dateStr, bucket] of Object.entries(daily)) {
                const netChange = (bucket.additions || 0) - (bucket.deletions || 0);
                changesByDate[dateStr] = { total: netChange, byRepo: {} };
            }
        }

        const repoColors = buildRepoColorMap(repos);

        const sortedDates = Object.keys(changesByDate).sort().slice(-60);
        if (sortedDates.length === 0) return null;

        const labels = sortedDates.map(d => {
            const date = new Date(d);
            return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        });

        let datasets;
        if (repos.length > 1) {
            datasets = repos.map(repo => ({
                label: repo,
                data: sortedDates.map(d => changesByDate[d]?.byRepo[repo] || 0),
                backgroundColor: repoColors[repo],
                borderRadius: 2,
            }));
        } else {
            datasets = [{
                label: 'Net Lines',
                data: sortedDates.map(d => changesByDate[d]?.total || 0),
                backgroundColor: accentColor,
                borderRadius: 2,
            }];
        }


        return {
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: repos.length > 1,
                        position: 'top',
                        labels: { font: { size: isMobile ? 10 : 12 }, boxWidth: isMobile ? 8 : 40 },
                    },
                    tooltip: {
                        callbacks: {
                            label: function (context) {
                                const value = context.raw;
                                const sign = value >= 0 ? '+' : '';
                                return `${context.dataset.label}: ${sign}${value.toLocaleString()} lines`;
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        stacked: repos.length > 1,
                        ticks: {
                            maxRotation: isMobile ? 60 : 45,
                            font: { size: isMobile ? 10 : 12 },
                            callback: function (value, index) {
                                const step = Math.ceil(sortedDates.length / (isMobile ? 8 : 15));
                                return index % step === 0 ? this.getLabelForValue(value) : '';
                            },
                        },
                    },
                    y: {
                        stacked: repos.length > 1,
                        ticks: {
                            font: { size: isMobile ? 10 : 12 },
                            callback: function (value) {
                                const sign = value >= 0 ? '+' : '';
                                const absValue = Math.abs(value);
                                let formatted;
                                if (absValue >= 1000000) {
                                    formatted = (absValue / 1000000).toFixed(absValue % 1000000 === 0 ? 0 : 1) + 'M';
                                } else if (absValue >= 1000) {
                                    formatted = (absValue / 1000).toFixed(absValue % 1000 === 0 ? 0 : 1) + 'k';
                                } else {
                                    formatted = absValue.toString();
                                }
                                return sign + formatted;
                            },
                        },
                    },
                },
            },
        };
    }, [filteredCommits, commitsLoaded, state.data?.summary?.daily, isMobile, state.darkMode]);

    // --- Trend charts (moved from Health section — time-based data belongs here) ---

    // Urgency Trend — monthly average urgency line chart
    // Only computed from loaded commits (no pre-aggregated monthly urgency data)
    const urgencyTrendData = useMemo(() => {
        if (!commitsLoaded) return null;
        const monthlyUrgency = {};
        filteredCommits.forEach(c => {
            if (!c.timestamp || !c.urgency) return;
            const month = getUTCMonthKey(c.timestamp);
            if (!monthlyUrgency[month]) monthlyUrgency[month] = { sum: 0, count: 0 };
            monthlyUrgency[month].sum += c.urgency;
            monthlyUrgency[month].count++;
        });
        const { months: sortedMonths } = excludeIncompleteLastMonth(
            Object.keys(monthlyUrgency).sort(), filteredCommits
        );
        if (sortedMonths.length === 0) return null;
        const urgencyData = sortedMonths.map(m =>
            Math.round((monthlyUrgency[m].sum / monthlyUrgency[m].count) * 100) / 100
        );

        return {
            data: {
                labels: sortedMonths.map(m => {
                    const [year, month] = m.split('-');
                    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }),
                datasets: [{
                    label: 'Avg Urgency',
                    data: urgencyData,
                    borderColor: getSeriesColor(2),
                    backgroundColor: withOpacity(getSeriesColor(2), 0.1),
                    fill: true, tension: 0.3,
                }],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { font: { size: isMobile ? 10 : 12 }, maxRotation: isMobile ? 60 : 45 } },
                    y: { min: 1, max: 5, ticks: { stepSize: 1, font: { size: isMobile ? 10 : 12 } } },
                },
            },
            sortedMonths,
        };
    }, [filteredCommits, isMobile, commitsLoaded, state.darkMode]);

    // Debt Trend — monthly debt added vs paid
    const debtTrendData = useMemo(() => {
        if (!commitsLoaded) return null;
        const monthlyDebt = {};
        filteredCommits.forEach(c => {
            if (!c.timestamp || !c.debt) return;
            const month = getUTCMonthKey(c.timestamp);
            if (!monthlyDebt[month]) monthlyDebt[month] = { added: 0, paid: 0, neutral: 0 };
            if (monthlyDebt[month].hasOwnProperty(c.debt)) monthlyDebt[month][c.debt]++;
        });
        const hasDebt = Object.values(monthlyDebt).some(m => m.added + m.paid > 0);
        if (!hasDebt) return null;
        const { months: sortedMonths } = excludeIncompleteLastMonth(
            Object.keys(monthlyDebt).sort(), filteredCommits
        );
        if (sortedMonths.length === 0) return null;

        return {
            data: {
                labels: sortedMonths.map(m => {
                    const [year, month] = m.split('-');
                    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }),
                datasets: [
                    {
                        label: 'Debt Added', data: sortedMonths.map(m => monthlyDebt[m]?.added || 0),
                        borderColor: getSeriesColor(4), backgroundColor: withOpacity(getSeriesColor(4), 0.1),
                        fill: true, tension: 0.3,
                    },
                    {
                        label: 'Debt Paid', data: sortedMonths.map(m => monthlyDebt[m]?.paid || 0),
                        borderColor: getSeriesColor(1), backgroundColor: withOpacity(getSeriesColor(1), 0.1),
                        fill: true, tension: 0.3,
                    },
                ],
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: isMobile ? 8 : 12, font: { size: isMobile ? 9 : 10 }, padding: isMobile ? 4 : 10 } } },
                scales: {
                    x: { ticks: { font: { size: isMobile ? 10 : 12 }, maxRotation: isMobile ? 60 : 45 } },
                    y: { ticks: { font: { size: isMobile ? 10 : 12 } } },
                },
            },
        };
    }, [filteredCommits, isMobile, commitsLoaded, state.darkMode]);

    // Impact Over Time — monthly stacked bar by impact type
    const impactTrendData = useMemo(() => {
        if (!commitsLoaded) return null;
        const monthlyImpact = {};
        filteredCommits.forEach(c => {
            if (!c.timestamp || !c.impact) return;
            const month = getUTCMonthKey(c.timestamp);
            if (!monthlyImpact[month]) monthlyImpact[month] = { 'user-facing': 0, 'internal': 0, 'infrastructure': 0, 'api': 0 };
            if (monthlyImpact[month].hasOwnProperty(c.impact)) monthlyImpact[month][c.impact]++;
        });
        const sortedMonths = urgencyTrendData?.sortedMonths || Object.keys(monthlyImpact).sort();
        if (sortedMonths.length === 0) return null;
        const impactColors = {
            'user-facing': getSeriesColor(0), 'internal': mutedColor,
            'infrastructure': getSeriesColor(3), 'api': getSeriesColor(1),
        };

        return {
            data: {
                labels: sortedMonths.map(m => {
                    const [year, month] = m.split('-');
                    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }),
                datasets: ['user-facing', 'internal', 'infrastructure', 'api'].map(impact => ({
                    label: impact, data: sortedMonths.map(m => monthlyImpact[m]?.[impact] || 0),
                    backgroundColor: impactColors[impact],
                })),
            },
            options: {
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { position: 'bottom', labels: { boxWidth: isMobile ? 8 : 12, font: { size: isMobile ? 9 : 10 }, padding: isMobile ? 4 : 10 } } },
                scales: {
                    x: { stacked: true, ticks: { font: { size: isMobile ? 10 : 12 }, maxRotation: isMobile ? 60 : 45 } },
                    y: { stacked: true, ticks: { font: { size: isMobile ? 10 : 12 } } },
                },
            },
        };
    }, [filteredCommits, urgencyTrendData, isMobile, commitsLoaded, state.darkMode]);

    // Handle card clicks
    const handleCardClick = useCallback((type) => {
        if (type === 'total') {
            openDetailPane('All Commits', `${filteredCommits.length} commits`, filteredCommits, { type: 'all', value: '' });
        } else if (type === 'contributors') {
            const contributors = {};
            filteredCommits.forEach(c => {
                const email = getAuthorEmail(c);
                if (!contributors[email]) {
                    contributors[email] = { name: getAuthorName(c), count: 0 };
                }
                contributors[email].count++;
            });
            const sorted = Object.values(contributors).sort((a, b) => b.count - a.count);
            openDetailPane('Contributors', `${sorted.length} active`, filteredCommits);
        }
    }, [filteredCommits, openDetailPane]);

    // Handle period click (executive/management aggregated view)
    const handlePeriodClick = useCallback((periodKey) => {
        const periodCommits = viewConfig.timing === 'week'
            ? aggregateByWeekPeriod(filteredCommits)
            : aggregateByDayPeriod(filteredCommits);
        const period = periodCommits.find(p => p.key === periodKey);
        if (period) {
            openDetailPane(period.label, `${period.count} commits`, period.commits);
        }
    }, [filteredCommits, viewConfig, openDetailPane]);

    // Commit list rendering
    const commitListContent = useMemo(() => {
        if (viewConfig.drilldown === 'commits') {
            // Developer view: individual commits
            return visibleCommits.map((commit, idx) => {
                const tags = getCommitTags(commit);
                const workPattern = getWorkPattern(commit);

                return (
                    <div key={commit.sha || idx} className="p-3 bg-themed-tertiary rounded-lg">
                        <div className="flex items-start gap-2 sm:gap-3">
                            <div className="flex flex-wrap gap-1 shrink-0">
                                {tags.slice(0, 3).map(t => (
                                    <span
                                        key={t}
                                        className={`tag ${getTagClass(t)} shrink-0`}
                                        style={getTagStyleObject(t)}
                                    >
                                        {t}
                                    </span>
                                ))}
                                {tags.length > 3 && (
                                    <span className="tag tag-other shrink-0">+{tags.length - 3}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-themed-primary break-words sm:truncate">
                                    {sanitizeMessage(getCommitSubject(commit))}
                                </p>
                            </div>
                            {commit.complexity != null && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    commit.complexity >= 4
                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300'
                                        : commit.complexity >= 2
                                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300'
                                            : 'bg-gray-100 text-themed-secondary dark:bg-gray-700'
                                }`}>
                                    {commit.complexity}/5
                                </span>
                            )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-themed-tertiary">
                            <span>{getAuthorName(commit)}</span>
                            <span>&middot;</span>
                            <span>{formatDate(commit.timestamp)}</span>
                            {commit.repo_id && (
                                <span className="text-themed-muted">&middot; {commit.repo_id}</span>
                            )}
                            {workPattern.isHoliday && (
                                <span className="badge badge-holiday ml-1">Holiday</span>
                            )}
                            {workPattern.isWeekend && (
                                <span className="badge badge-weekend ml-1">Weekend</span>
                            )}
                            {!workPattern.isWeekend && workPattern.isAfterHours && (
                                <span className="badge badge-after-hours ml-1">After Hours</span>
                            )}
                        </div>
                    </div>
                );
            });
        } else {
            // Executive/Management view: aggregated by time period
            const periodData = viewConfig.timing === 'week'
                ? aggregateByWeekPeriod(filteredCommits)
                : aggregateByDayPeriod(filteredCommits);

            return periodData.slice(0, 20).map(period => {
                const tagSummary = Object.entries(period.tags)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 4);

                return (
                    <div
                        key={period.key}
                        className="p-3 bg-themed-tertiary rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                        role="button"
                        tabIndex={0}
                        aria-label={`View ${period.label}: ${period.count} commits`}
                        onClick={() => handlePeriodClick(period.key)}
                        onKeyDown={handleKeyActivate(() => handlePeriodClick(period.key))}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-themed-primary">{period.label}</span>
                            <span className="text-sm text-themed-secondary">{period.count} commits</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {tagSummary.map(([tag, count]) => (
                                <span
                                    key={tag}
                                    className={`tag ${getTagClass(tag)}`}
                                    style={getTagStyleObject(tag)}
                                >
                                    {tag} ({count})
                                </span>
                            ))}
                        </div>
                        {period.repos && period.repos.length > 1 && (
                            <div className="text-xs text-themed-tertiary mt-1">{period.repos.length} repos</div>
                        )}
                    </div>
                );
            });
        }
    }, [visibleCommits, filteredCommits, viewConfig, handlePeriodClick]);

    const showingText = viewConfig.drilldown === 'commits'
        ? `Showing ${visibleCommits.length} of ${filteredCommits.length}`
        : `${filteredCommits.length} total commits`;

    const hasMore = viewConfig.drilldown === 'commits' && commitsHasMore;
    const remaining = commitsRemaining;

    const chartHeight = isMobile ? '220px' : '300px';

    // Requirement: Order sections from most interesting to least interesting
    // Approach: Visual chart first (shows activity bursts), then browsable commit list,
    //   then secondary chart, then reference stats last
    // Alternatives:
    //   - Stats first: Rejected — raw numbers are least engaging
    //   - Commit list first: Rejected — chart gives a faster visual overview
    return (
        <div className="space-y-6">
            {/* Activity Timeline Chart — most engaging: visual pattern of activity bursts */}
            {activityChartData && (
                <CollapsibleSection title="Commit Activity" subtitle="Daily commit count over time">
                    <div data-embed-id="activity-timeline" style={{ height: chartHeight }}>
                        <Bar data={activityChartData.data} options={activityChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Commit List — browsable real content, collapsed on mobile */}
            <CollapsibleSection title="Recent Changes" subtitle={showingText} defaultExpanded={!isMobile}>
                <div className="space-y-2">
                    {!commitsLoaded && state.commitsLoading ? (
                        <div className="flex items-center gap-2 py-4 justify-center">
                            <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                            <p className="text-themed-tertiary text-sm">Loading commit details&hellip;</p>
                        </div>
                    ) : commitListContent.length > 0 ? (
                        commitListContent
                    ) : (
                        <p className="text-themed-tertiary">Nothing matches the current filters. Try adjusting your selections.</p>
                    )}
                    {hasMore && (
                        <ShowMoreButton remaining={remaining} pageSize={isMobile ? PAGE_LIMITS.timeline[0] : PAGE_LIMITS.timeline[1]} onClick={showMoreCommits} />
                    )}
                </div>
            </CollapsibleSection>

            {/* Code Changes Timeline Chart — secondary chart, collapsed on mobile */}
            {codeChangesChartData && (
                <CollapsibleSection title="Lines Changed" subtitle="Net code additions and deletions" defaultExpanded={!isMobile}>
                    <div data-embed-id="code-changes-timeline" style={{ height: chartHeight }}>
                        <Bar data={codeChangesChartData.data} options={codeChangesChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Urgency Trend — only shows after commits load */}
            {urgencyTrendData && (
                <CollapsibleSection title="Urgency Over Time" subtitle="Is urgency increasing or decreasing?" defaultExpanded={!isMobile}>
                    <div data-embed-id="urgency-trend" style={{ height: chartHeight }}>
                        <Line data={urgencyTrendData.data} options={urgencyTrendData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Debt Trend — only shows after commits load */}
            {debtTrendData && (
                <CollapsibleSection title="Debt Trend" subtitle="Monthly debt added vs paid" defaultExpanded={!isMobile}>
                    <div data-embed-id="debt-trend" style={{ height: chartHeight }}>
                        <Line data={debtTrendData.data} options={debtTrendData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Impact Over Time — only shows after commits load */}
            {impactTrendData && (
                <CollapsibleSection title="Impact Over Time" subtitle="Monthly breakdown by area" defaultExpanded={!isMobile}>
                    <div data-embed-id="impact-over-time" style={{ height: chartHeight }}>
                        <Bar data={impactTrendData.data} options={impactTrendData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Summary Cards — reference numbers, least engaging */}
            <CollapsibleSection title="Activity Summary">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div
                        className="p-4 bg-themed-tertiary rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        role="button"
                        tabIndex={0}
                        aria-label={`View all ${summaryData.totalCommits} commits`}
                        onClick={() => handleCardClick('total')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('total'))}
                    >
                        <div className="text-2xl font-semibold text-themed-primary">{summaryData.totalCommits}</div>
                        <div className="text-sm text-themed-tertiary">Total Commits</div>
                    </div>
                    <div className="p-4 bg-themed-tertiary rounded-lg text-center">
                        <div className="text-2xl font-semibold text-themed-primary">{summaryData.activeDays}</div>
                        <div className="text-sm text-themed-tertiary">Active Days</div>
                    </div>
                    <div className="p-4 bg-themed-tertiary rounded-lg text-center">
                        <div className="text-2xl font-semibold text-themed-primary">
                            {summaryData.earliest !== 'No data'
                                ? `${summaryData.earliest} — ${summaryData.latest}`
                                : 'No data'}
                        </div>
                        <div className="text-sm text-themed-tertiary">{summaryData.daySpan || 'Date Range'}</div>
                    </div>
                    <div
                        className="p-4 bg-themed-tertiary rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        role="button"
                        tabIndex={0}
                        aria-label={`View ${summaryData.contributors} contributors`}
                        onClick={() => handleCardClick('contributors')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('contributors'))}
                    >
                        <div className="text-2xl font-semibold text-themed-primary">{summaryData.contributors}</div>
                        <div className="text-sm text-themed-tertiary">Contributors</div>
                    </div>
                    <div className="p-4 bg-themed-tertiary rounded-lg text-center">
                        <div className="text-2xl font-semibold text-themed-primary">{summaryData.avgPerDay}</div>
                        <div className="text-sm text-themed-tertiary">Avg/Day</div>
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
}
