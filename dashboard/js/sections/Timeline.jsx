import React, { useMemo, useCallback } from 'react';
import { Bar, Line } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import {
    formatDate, getCommitTags, getTagBadgeClass,
    getAuthorEmail, getAuthorName, getCommitSubject,
    sanitizeMessage, getWorkPattern, handleKeyActivate,
    getUTCDateKey,
} from '../utils.js';
import { aggregateByWeekPeriod, aggregateByDayPeriod } from '../charts.js';
import { PAGE_LIMITS } from '../state.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import ShowMoreButton from '../components/ShowMoreButton.jsx';
import useShowMore from '../hooks/useShowMore.js';
// All five chart-data builders were extracted into a hook on
// 2026-04-15 to keep this component under the 500-line soft-limit.
// The hook reads useApp() internally and returns the same five
// memoized chart-data objects with their original dep arrays; render
// behaviour is unchanged. See dashboard/js/hooks/useTimelineCharts.js.
import useTimelineCharts from '../hooks/useTimelineCharts.js';

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

    // Chart data builders extracted to useTimelineCharts hook 2026-04-15.
    // Hook reads useApp() internally and returns the same five memoized
    // chart-data objects with their original dep arrays.
    const {
        activityChartData,
        codeChangesChartData,
        urgencyTrendData,
        debtTrendData,
        impactTrendData,
    } = useTimelineCharts();

    // Handle card clicks
    const handleCardClick = useCallback((type) => {
        if (type === 'total') {
            openDetailPane('All Commits', `${filteredCommits.length} commits`, filteredCommits, { type: 'all', value: '' });
        } else if (type === 'contributors') {
            // Only the unique-count is needed for the detail-pane subtitle.
            // The full `filteredCommits` array is passed through as the
            // payload — the detail pane does its own per-author
            // aggregation downstream, so there's no reason to build an
            // intermediate name/count map here. A prior version allocated
            // a full object map + sorted array just to read `.length` off
            // it; replaced with a Set over the author email stream.
            const uniqueAuthors = new Set(filteredCommits.map(getAuthorEmail)).size;
            openDetailPane('Contributors', `${uniqueAuthors} active`, filteredCommits);
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
                    <div key={commit.sha || idx} className="p-3 bg-base-300 rounded-lg">
                        <div className="flex items-start gap-2 sm:gap-3">
                            <div className="flex flex-wrap gap-1 shrink-0">
                                {tags.slice(0, 3).map(t => (
                                    <span
                                        key={t}
                                        className={`badge badge-sm shrink-0 ${getTagBadgeClass(t)}`}
                                    >
                                        {t}
                                    </span>
                                ))}
                                {tags.length > 3 && (
                                    <span className="badge badge-sm badge-neutral shrink-0">+{tags.length - 3}</span>
                                )}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-base-content break-words sm:truncate">
                                    {sanitizeMessage(getCommitSubject(commit))}
                                </p>
                            </div>
                            {/*
                              Complexity badge — 3 visual tiers mapped to DaisyUI
                              semantic tokens that auto-switch with the theme:
                                high (4-5)  → secondary  (strongest accent)
                                medium (2-3) → info       (mid-intensity)
                                low (0-1)   → base-300   (neutral filler)
                              Previously used bg-purple-100/dark:bg-purple-900 pairs
                              with hardcoded tier colors; migrated to eliminate the
                              `dark:` variant and let the theme control contrast.
                            */}
                            {commit.complexity != null && (
                                <span className={`text-xs px-1.5 py-0.5 rounded ${
                                    commit.complexity >= 4
                                        ? 'bg-secondary/20 text-secondary'
                                        : commit.complexity >= 2
                                            ? 'bg-info/20 text-info'
                                            : 'bg-base-300 text-base-content/80'
                                }`}>
                                    {commit.complexity}/5
                                </span>
                            )}
                        </div>
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-base-content/60">
                            <span>{getAuthorName(commit)}</span>
                            <span>&middot;</span>
                            <span>{formatDate(commit.timestamp)}</span>
                            {commit.repo_id && (
                                <span className="text-base-content/40">&middot; {commit.repo_id}</span>
                            )}
                            {/*
                              Work-pattern badges — DaisyUI semantic variants
                              (badge-accent for Holiday, badge-info for Weekend,
                              badge-warning for After Hours). Previously used
                              custom .badge-holiday / .badge-weekend /
                              .badge-after-hours classes that hand-rolled rgba
                              colors AND shadowed DaisyUI's built-in .badge.
                              badge-sm keeps the footprint compact inside the
                              commit metadata row.
                            */}
                            {workPattern.isHoliday && (
                                <span className="badge badge-accent badge-sm ml-1">Holiday</span>
                            )}
                            {workPattern.isWeekend && (
                                <span className="badge badge-info badge-sm ml-1">Weekend</span>
                            )}
                            {!workPattern.isWeekend && workPattern.isAfterHours && (
                                <span className="badge badge-warning badge-sm ml-1">After Hours</span>
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
                        className="p-3 bg-base-300 rounded-lg cursor-pointer hover:bg-base-300 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 transition-colors"
                        role="button"
                        tabIndex={0}
                        aria-label={`View ${period.label}: ${period.count} commits`}
                        onClick={() => handlePeriodClick(period.key)}
                        onKeyDown={handleKeyActivate(() => handlePeriodClick(period.key))}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-base-content">{period.label}</span>
                            <span className="text-sm text-base-content/80">{period.count} commits</span>
                        </div>
                        <div className="flex flex-wrap gap-1">
                            {tagSummary.map(([tag, count]) => (
                                <span
                                    key={tag}
                                    className={`badge badge-sm ${getTagBadgeClass(tag)}`}
                                >
                                    {tag} ({count})
                                </span>
                            ))}
                        </div>
                        {period.repos && period.repos.length > 1 && (
                            <div className="text-xs text-base-content/60 mt-1">{period.repos.length} repos</div>
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

    // Chart container height — breakpoint-derived (220px mobile, 300px desktop).
    // Exact stock Tailwind: h-55 (13.75rem = 220px) and h-75 (18.75rem = 300px).
    // Per CLAUDE.md "No inline style={} unless values are runtime-computed
    // from data" — a breakpoint switch is not data, it's a responsive class.
    const chartHeightClasses = 'h-55 sm:h-75';

    // Requirement: Order sections from most interesting to least interesting
    // Approach: Visual chart first (shows activity bursts), then browsable commit list,
    //   then secondary chart, then reference stats last
    // Alternatives:
    //   - Stats first: Rejected — raw numbers are least engaging
    //   - Commit list first: Rejected — chart gives a faster visual overview
    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Activity Timeline Chart — most engaging: visual pattern of activity bursts */}
            {activityChartData && (
                <CollapsibleSection title="Commit Activity" subtitle="Daily commit count over time">
                    <div data-embed-id="activity-timeline" className={chartHeightClasses}>
                        <Bar data={activityChartData.data} options={activityChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Commit List — browsable real content, collapsed on mobile */}
            <CollapsibleSection title="Recent Changes" subtitle={showingText} defaultExpanded={!isMobile}>
                <div className="space-y-2">
                    {!commitsLoaded && state.commitsLoading ? (
                        <div
                            className="flex items-center gap-2 py-4 justify-center"
                            role="status"
                        >
                            <span className="loading loading-spinner loading-sm text-primary" aria-hidden="true" />
                            <p className="text-base-content/60 text-sm">Loading commit details&hellip;</p>
                        </div>
                    ) : commitListContent.length > 0 ? (
                        commitListContent
                    ) : (
                        <p className="text-base-content/60">Nothing matches the current filters. Try adjusting your selections.</p>
                    )}
                    {hasMore && (
                        <ShowMoreButton remaining={remaining} pageSize={isMobile ? PAGE_LIMITS.timeline[0] : PAGE_LIMITS.timeline[1]} onClick={showMoreCommits} />
                    )}
                </div>
            </CollapsibleSection>

            {/* Code Changes Timeline Chart — secondary chart, collapsed on mobile */}
            {codeChangesChartData && (
                <CollapsibleSection title="Lines Changed" subtitle="Net code additions and deletions" defaultExpanded={!isMobile}>
                    <div data-embed-id="code-changes-timeline" className={chartHeightClasses}>
                        <Bar data={codeChangesChartData.data} options={codeChangesChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Urgency Trend — only shows after commits load */}
            {urgencyTrendData && (
                <CollapsibleSection title="Urgency Over Time" subtitle="Is urgency increasing or decreasing?" defaultExpanded={!isMobile}>
                    <div data-embed-id="urgency-trend" className={chartHeightClasses}>
                        <Line data={urgencyTrendData.data} options={urgencyTrendData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Debt Trend — only shows after commits load */}
            {debtTrendData && (
                <CollapsibleSection title="Debt Trend" subtitle="Monthly debt added vs paid" defaultExpanded={!isMobile}>
                    <div data-embed-id="debt-trend" className={chartHeightClasses}>
                        <Line data={debtTrendData.data} options={debtTrendData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Impact Over Time — only shows after commits load */}
            {impactTrendData && (
                <CollapsibleSection title="Impact Over Time" subtitle="Monthly breakdown by area" defaultExpanded={!isMobile}>
                    <div data-embed-id="impact-over-time" className={chartHeightClasses}>
                        <Bar data={impactTrendData.data} options={impactTrendData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Summary Cards — reference numbers, least engaging */}
            <CollapsibleSection title="Activity Summary">
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
                    <div
                        className="p-4 bg-base-300 rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all"
                        role="button"
                        tabIndex={0}
                        aria-label={`View all ${summaryData.totalCommits} commits`}
                        onClick={() => handleCardClick('total')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('total'))}
                    >
                        <div className="text-2xl font-semibold font-mono tracking-tight text-base-content">{summaryData.totalCommits}</div>
                        <div className="text-sm text-base-content/60">Total Commits</div>
                    </div>
                    <div className="p-4 bg-base-300 rounded-lg text-center">
                        <div className="text-2xl font-semibold font-mono tracking-tight text-base-content">{summaryData.activeDays}</div>
                        <div className="text-sm text-base-content/60">Active Days</div>
                    </div>
                    <div className="p-4 bg-base-300 rounded-lg text-center">
                        <div className="text-2xl font-semibold font-mono tracking-tight text-base-content">
                            {summaryData.earliest !== 'No data'
                                ? `${summaryData.earliest} — ${summaryData.latest}`
                                : 'No data'}
                        </div>
                        <div className="text-sm text-base-content/60">{summaryData.daySpan || 'Date Range'}</div>
                    </div>
                    <div
                        className="p-4 bg-base-300 rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all"
                        role="button"
                        tabIndex={0}
                        aria-label={`View ${summaryData.contributors} contributors`}
                        onClick={() => handleCardClick('contributors')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('contributors'))}
                    >
                        <div className="text-2xl font-semibold font-mono tracking-tight text-base-content">{summaryData.contributors}</div>
                        <div className="text-sm text-base-content/60">Contributors</div>
                    </div>
                    <div className="p-4 bg-base-300 rounded-lg text-center">
                        <div className="text-2xl font-semibold font-mono tracking-tight text-base-content">{summaryData.avgPerDay}</div>
                        <div className="text-sm text-base-content/60">Avg/Day</div>
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
}
