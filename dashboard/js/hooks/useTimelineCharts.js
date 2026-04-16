import { useMemo } from 'react';
import { useApp } from '../AppContext.jsx';
import {
    getAdditions,
    getDeletions,
    getUTCDateKey,
    getUTCMonthKey,
    excludeIncompleteLastMonth,
} from '../utils.js';
import {
    getSeriesColor,
    withOpacity,
    buildRepoColorMap,
} from '../chartColors.js';

/**
 * Build all five Timeline-tab chart data objects.
 *
 * Requirement: sections/Timeline.jsx had grown to 735 lines, well over
 *   the 500-line component soft-limit (CLAUDE.md "Code Organization").
 *   The five chart-data useMemo blocks (~350 lines combined) had no
 *   React-render surface area — they're pure data shaping with theme
 *   colour resolution.
 * Approach: Extract into a hook that calls useApp() internally and
 *   returns all five chart-data objects. The hook owns all
 *   `useMemo([...deps])` declarations so Timeline.jsx stays focused on
 *   render, event handlers, and the commit-list builder. Each chart
 *   data object retains its original deps array (filteredCommits,
 *   commitsLoaded, state.data?.summary, isMobile, state.darkMode,
 *   state.themeAccent, state.themeMuted) so memoization behaviour
 *   matches the previous inline version exactly.
 *
 *   Returns:
 *     activityChartData      — 60-day stacked bar of commit count by repo
 *     codeChangesChartData   — 60-day stacked bar of net lines by repo
 *     urgencyTrendData       — monthly average urgency line
 *     debtTrendData          — monthly debt added vs paid lines
 *     impactTrendData        — monthly stacked bar by impact type
 *
 * Alternatives:
 *   - Pure-function helpers + 5 inline useMemo in Timeline.jsx:
 *     Rejected — leaves the 5 useMemo declarations and dep arrays in
 *     the parent component, only saves the function bodies. Net win
 *     would be ~250 lines instead of ~350, less worth doing.
 *   - One useMemo returning all five in a single object: Rejected —
 *     would re-build all five charts on any dep change, undoing the
 *     fine-grained memoization that lets a single chart re-render
 *     without disturbing the others.
 *
 * Extracted from sections/Timeline.jsx 2026-04-15.
 */
export default function useTimelineCharts() {
    const { state, filteredCommits, isMobile, commitsLoaded } = useApp();

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
                backgroundColor: state.themeAccent,
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
    }, [filteredCommits, commitsLoaded, state.data?.summary?.daily, isMobile, state.darkMode, state.themeAccent, state.themeMuted]);

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
                backgroundColor: state.themeAccent,
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
    }, [filteredCommits, commitsLoaded, state.data?.summary?.daily, isMobile, state.darkMode, state.themeAccent, state.themeMuted]);

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
    }, [filteredCommits, isMobile, commitsLoaded, state.darkMode, state.themeAccent, state.themeMuted]);

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
    }, [filteredCommits, isMobile, commitsLoaded, state.darkMode, state.themeAccent, state.themeMuted]);

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
            'user-facing': getSeriesColor(0), 'internal': state.themeMuted,
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
    }, [filteredCommits, urgencyTrendData, isMobile, commitsLoaded, state.darkMode, state.themeAccent, state.themeMuted]);

    return {
        activityChartData,
        codeChangesChartData,
        urgencyTrendData,
        debtTrendData,
        impactTrendData,
    };
}
