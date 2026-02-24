import React, { useMemo, useState, useCallback } from 'react';
import { Bar } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import {
    formatDate, getCommitTags, getTagClass, getTagStyleObject,
    getAuthorEmail, getAuthorName, getCommitSubject,
    sanitizeMessage, getWorkPattern, getAdditions, getDeletions, handleKeyActivate
} from '../utils.js';
import { aggregateByWeekPeriod, aggregateByDayPeriod } from '../charts.js';
import { seriesColors, accentColor, getSeriesColor } from '../chartColors.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';

export default function TimelineTab() {
    const { state, dispatch, filteredCommits, viewConfig, openDetailPane, isMobile } = useApp();
    const [visibleCount, setVisibleCount] = useState(100);

    // Reset visible count when filtered commits change
    const commitCountRef = React.useRef(filteredCommits.length);
    if (commitCountRef.current !== filteredCommits.length) {
        commitCountRef.current = filteredCommits.length;
        if (visibleCount !== 100) setVisibleCount(100);
    }

    // Summary card data
    const summaryData = useMemo(() => {
        const totalCommits = filteredCommits.length;
        const uniqueDays = new Set(filteredCommits.map(c => c.timestamp?.substring(0, 10)).filter(Boolean));
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
    }, [filteredCommits]);

    // Activity timeline chart data
    const activityChartData = useMemo(() => {
        const commitsByDate = {};
        const repos = [...new Set(filteredCommits.map(c => c.repo_id).filter(Boolean))];
        const repoColors = {};
        repos.forEach((repo, i) => {
            repoColors[repo] = getSeriesColor(i);
        });

        filteredCommits.forEach(commit => {
            const dateStr = commit.timestamp?.substring(0, 10);
            if (!dateStr) return;
            if (!commitsByDate[dateStr]) {
                commitsByDate[dateStr] = { total: 0, byRepo: {} };
            }
            commitsByDate[dateStr].total++;
            if (commit.repo_id) {
                commitsByDate[dateStr].byRepo[commit.repo_id] =
                    (commitsByDate[dateStr].byRepo[commit.repo_id] || 0) + 1;
            }
        });

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

        const mobile = isMobile;
        return {
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: repos.length > 1,
                        position: 'top',
                        labels: { font: { size: mobile ? 10 : 12 }, boxWidth: mobile ? 8 : 40 },
                    },
                },
                scales: {
                    x: {
                        stacked: repos.length > 1,
                        ticks: {
                            maxRotation: mobile ? 60 : 45,
                            font: { size: mobile ? 10 : 12 },
                            callback: function (value, index) {
                                const step = Math.ceil(sortedDates.length / (mobile ? 8 : 15));
                                return index % step === 0 ? this.getLabelForValue(value) : '';
                            },
                        },
                    },
                    y: {
                        stacked: repos.length > 1,
                        beginAtZero: true,
                        ticks: { stepSize: 1, font: { size: mobile ? 10 : 12 } },
                    },
                },
            },
        };
    }, [filteredCommits, isMobile]);

    // Code changes timeline chart data
    const codeChangesChartData = useMemo(() => {
        const changesByDate = {};
        const repos = [...new Set(filteredCommits.map(c => c.repo_id).filter(Boolean))];
        const repoColors = {};
        repos.forEach((repo, i) => {
            repoColors[repo] = getSeriesColor(i);
        });

        filteredCommits.forEach(commit => {
            const dateStr = commit.timestamp?.substring(0, 10);
            if (!dateStr) return;
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

        const mobile = isMobile;
        return {
            data: { labels, datasets },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        display: repos.length > 1,
                        position: 'top',
                        labels: { font: { size: mobile ? 10 : 12 }, boxWidth: mobile ? 8 : 40 },
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
                            maxRotation: mobile ? 60 : 45,
                            font: { size: mobile ? 10 : 12 },
                            callback: function (value, index) {
                                const step = Math.ceil(sortedDates.length / (mobile ? 8 : 15));
                                return index % step === 0 ? this.getLabelForValue(value) : '';
                            },
                        },
                    },
                    y: {
                        stacked: repos.length > 1,
                        ticks: {
                            font: { size: mobile ? 10 : 12 },
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
    }, [filteredCommits, isMobile]);

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
            return filteredCommits.slice(0, visibleCount).map((commit, idx) => {
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
    }, [filteredCommits, visibleCount, viewConfig, handlePeriodClick]);

    const showingText = viewConfig.drilldown === 'commits'
        ? `Showing ${Math.min(filteredCommits.length, visibleCount)} of ${filteredCommits.length}`
        : `${filteredCommits.length} total commits`;

    const hasMore = viewConfig.drilldown === 'commits' && filteredCommits.length > visibleCount;
    const remaining = filteredCommits.length - visibleCount;

    const chartHeight = isMobile ? '220px' : '300px';

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <CollapsibleSection title="Activity Summary">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div
                        className="p-4 bg-themed-tertiary rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        role="button"
                        tabIndex={0}
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

            {/* Activity Timeline Chart */}
            {activityChartData && (
                <CollapsibleSection title="Commit Activity" subtitle="Daily commit count over time">
                    <div data-embed-id="activity-timeline" style={{ height: chartHeight }}>
                        <Bar data={activityChartData.data} options={activityChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Code Changes Timeline Chart — collapsed on mobile since Activity chart covers the key story */}
            {codeChangesChartData && (
                <CollapsibleSection title="Lines Changed" subtitle="Net code additions and deletions" defaultExpanded={!isMobile}>
                    <div data-embed-id="code-changes-timeline" style={{ height: chartHeight }}>
                        <Bar data={codeChangesChartData.data} options={codeChangesChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Commit List — collapsed on mobile to reduce scroll length */}
            <CollapsibleSection title="Recent Changes" subtitle={showingText} defaultExpanded={!isMobile}>
                <div className="space-y-2">
                    {commitListContent.length > 0 ? (
                        commitListContent
                    ) : (
                        <p className="text-themed-tertiary">No changes match the current filters</p>
                    )}
                    {hasMore && (
                        <button
                            className="w-full py-3 text-sm font-medium text-themed-secondary hover:text-themed-primary bg-themed-tertiary hover:bg-gray-600 rounded-lg transition-colors cursor-pointer border-0"
                            onClick={() => setVisibleCount(v => v + 100)}
                        >
                            Load {Math.min(remaining, 100)} more ({remaining} remaining)
                        </button>
                    )}
                </div>
            </CollapsibleSection>
        </div>
    );
}
