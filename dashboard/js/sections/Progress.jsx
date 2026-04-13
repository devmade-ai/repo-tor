import React, { useMemo } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import { getCommitTags, handleKeyActivate, excludeIncompleteLastMonth, getUTCMonthKey } from '../utils.js';
import { getSeriesColor, withOpacity } from '../chartColors.js';
import { PAGE_LIMITS } from '../state.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import ShowMoreButton from '../components/ShowMoreButton.jsx';
import useShowMore from '../hooks/useShowMore.js';

export default function Progress() {
    const { state, filteredCommits, commitsLoaded, openDetailPane, isMobile } = useApp();

    // Summary metrics — use pre-aggregated data when commits aren't loaded
    // Once commits are loaded, always use filteredCommits (even if empty due to filters)
    // to avoid falling back to unfiltered summary data
    const metrics = useMemo(() => {
        if (commitsLoaded) {
            let featureCount = 0, bugfixCount = 0, refactorCount = 0;
            let complexitySum = 0, complexityCount = 0;

            filteredCommits.forEach(commit => {
                const tags = getCommitTags(commit);
                if (tags.includes('feature')) featureCount++;
                if (tags.includes('bugfix') || tags.includes('fix')) bugfixCount++;
                if (tags.includes('refactor')) refactorCount++;
                if (commit.complexity != null) {
                    complexitySum += commit.complexity;
                    complexityCount++;
                }
            });

            const avgComplexity = complexityCount > 0 ? (complexitySum / complexityCount).toFixed(1) : '-';
            return { featureCount, bugfixCount, refactorCount, avgComplexity };
        }

        // Pre-aggregated fallback
        const tb = state.data?.summary?.tagBreakdown || {};
        const avgComplexity = state.data?.summary?.avgComplexity;
        return {
            featureCount: tb.feature || 0,
            bugfixCount: (tb.bugfix || 0) + (tb.fix || 0),
            refactorCount: tb.refactor || 0,
            avgComplexity: avgComplexity != null ? avgComplexity.toFixed(1) : '-',
        };
    }, [filteredCommits, commitsLoaded, state.data?.summary]);

    // Feature vs Bug Fix Trend chart data
    // Excludes incomplete last month to prevent misleading cliff on trend charts
    // Uses pre-aggregated monthly data when commits aren't loaded
    const featFixChartData = useMemo(() => {
        let months, featData, fixData;

        if (commitsLoaded) {
            const monthSet = new Set(filteredCommits.map(c => c.timestamp ? getUTCMonthKey(c.timestamp) : null).filter(Boolean));
            const allMonths = [...monthSet].sort();
            ({ months } = excludeIncompleteLastMonth(allMonths, filteredCommits));

            const monthlyTagCounts = {};
            filteredCommits.forEach(commit => {
                if (!commit.timestamp) return;
                const month = getUTCMonthKey(commit.timestamp);
                if (!monthlyTagCounts[month]) monthlyTagCounts[month] = { feature: 0, bugfix: 0 };
                const tags = getCommitTags(commit);
                if (tags.includes('feature')) monthlyTagCounts[month].feature++;
                if (tags.includes('bugfix') || tags.includes('fix')) monthlyTagCounts[month].bugfix++;
            });

            featData = months.map(m => monthlyTagCounts[m]?.feature || 0);
            fixData = months.map(m => monthlyTagCounts[m]?.bugfix || 0);
        } else if (state.data?.summary?.monthly) {
            // Pre-aggregated: read feature/bugfix counts from monthly buckets
            const monthly = state.data.summary.monthly;
            months = Object.keys(monthly).sort();
            // Apply incomplete month exclusion using bucket data
            if (months.length > 0) {
                const lastMonth = months[months.length - 1];
                const lastBucket = monthly[lastMonth];
                // If last month has fewer than 15 days of data, exclude it
                const [year, mon] = lastMonth.split('-').map(Number);
                const daysInMonth = new Date(year, mon, 0).getDate();
                if (lastBucket.commits < daysInMonth * 0.5) {
                    months = months.slice(0, -1);
                }
            }

            featData = months.map(m => monthly[m]?.tags?.feature || 0);
            fixData = months.map(m => (monthly[m]?.tags?.bugfix || 0) + (monthly[m]?.tags?.fix || 0));
        } else {
            return null;
        }

        if (!months || months.length === 0) return null;


        return {
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Features',
                        data: featData,
                        borderColor: getSeriesColor(1),
                        backgroundColor: withOpacity(getSeriesColor(1), 0.1),
                        fill: true,
                        tension: 0.3,
                    },
                    {
                        label: 'Bug Fixes',
                        data: fixData,
                        borderColor: getSeriesColor(4),
                        backgroundColor: withOpacity(getSeriesColor(4), 0.1),
                        fill: true,
                        tension: 0.3,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: { labels: { font: { size: isMobile ? 10 : 12 }, boxWidth: isMobile ? 8 : 40 } },
                },
                scales: {
                    x: { ticks: { font: { size: isMobile ? 10 : 12 }, maxRotation: isMobile ? 60 : 45 } },
                    y: { ticks: { font: { size: isMobile ? 10 : 12 } } },
                },
            },
        };
    // state.darkMode: bust memo on theme toggle so react-chartjs-2 calls chart.update(),
    // picking up the new Chart.js defaults set in AppContext's darkMode effect
    }, [filteredCommits, commitsLoaded, state.data?.summary?.monthly, isMobile, state.darkMode]);

    // Complexity Over Time chart data
    // Excludes incomplete last month (same reason as features vs bugfix trend)
    // Uses pre-aggregated monthly avgComplexity when commits aren't loaded
    const complexityChartData = useMemo(() => {
        let months, complexityData;

        if (commitsLoaded) {
            const monthSet = new Set(filteredCommits.map(c => c.timestamp ? getUTCMonthKey(c.timestamp) : null).filter(Boolean));
            ({ months } = excludeIncompleteLastMonth([...monthSet].sort(), filteredCommits));

            const monthlyComplexity = {};
            filteredCommits.forEach(commit => {
                if (!commit.timestamp) return;
                const month = getUTCMonthKey(commit.timestamp);
                if (!monthlyComplexity[month]) monthlyComplexity[month] = { total: 0, count: 0 };
                if (commit.complexity != null) {
                    monthlyComplexity[month].total += commit.complexity;
                    monthlyComplexity[month].count++;
                }
            });

            complexityData = months.map(m => {
                const mc = monthlyComplexity[m];
                return mc && mc.count > 0 ? (mc.total / mc.count) : null;
            });
        } else if (state.data?.summary?.monthly) {
            const monthly = state.data.summary.monthly;
            months = Object.keys(monthly).sort();
            // Incomplete month exclusion
            if (months.length > 0) {
                const lastMonth = months[months.length - 1];
                const lastBucket = monthly[lastMonth];
                const [year, mon] = lastMonth.split('-').map(Number);
                const daysInMonth = new Date(year, mon, 0).getDate();
                if (lastBucket.commits < daysInMonth * 0.5) {
                    months = months.slice(0, -1);
                }
            }
            complexityData = months.map(m => monthly[m]?.avgComplexity ?? null);
        } else {
            return null;
        }

        if (!months || months.length === 0) return null;


        return {
            data: {
                labels: months,
                datasets: [{
                    label: 'Avg Complexity',
                    data: complexityData,
                    borderColor: getSeriesColor(3),
                    backgroundColor: withOpacity(getSeriesColor(3), 0.1),
                    fill: true,
                    tension: 0.3,
                    spanGaps: true,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { font: { size: isMobile ? 10 : 12 }, maxRotation: isMobile ? 60 : 45 } },
                    y: {
                        min: 1,
                        max: 5,
                        ticks: { stepSize: 1, font: { size: isMobile ? 10 : 12 } },
                    },
                },
            },
        };
    }, [filteredCommits, commitsLoaded, state.data?.summary?.monthly, isMobile, state.darkMode]);

    // Epic breakdown — groups commits by epic label
    // Uses pre-aggregated epicBreakdown from summary when commits aren't loaded
    const epicBreakdown = useMemo(() => {
        if (commitsLoaded) {
            const epics = {};
            filteredCommits.forEach(c => {
                if (c.epic && typeof c.epic === 'string') {
                    const epic = c.epic.trim().toLowerCase();
                    if (epic) {
                        epics[epic] = (epics[epic] || 0) + 1;
                    }
                }
            });
            return Object.entries(epics)
                .sort((a, b) => b[1] - a[1]);
        }

        // Pre-aggregated fallback
        const eb = state.data?.summary?.epicBreakdown;
        if (eb) {
            return Object.entries(eb).sort((a, b) => b[1] - a[1]);
        }
        return [];
    }, [filteredCommits, commitsLoaded, state.data?.summary?.epicBreakdown]);

    const hasEpicData = epicBreakdown.length > 0;

    // Paginate epics — 6 mobile / 12 desktop
    const {
        visible: visibleEpics,
        hasMore: epicsHasMore,
        remaining: epicsRemaining,
        showMore: showMoreEpics,
    } = useShowMore(epicBreakdown, ...PAGE_LIMITS.epics, isMobile);

    // Semver breakdown — patch/minor/major distribution
    // Uses pre-aggregated semverBreakdown from summary when commits aren't loaded
    const semverBreakdown = useMemo(() => {
        if (commitsLoaded) {
            const breakdown = { patch: 0, minor: 0, major: 0 };
            filteredCommits.forEach(c => {
                if (c.semver && c.semver in breakdown) {
                    breakdown[c.semver]++;
                }
            });
            return breakdown;
        }

        return state.data?.summary?.semverBreakdown || { patch: 0, minor: 0, major: 0 };
    }, [filteredCommits, commitsLoaded, state.data?.summary?.semverBreakdown]);

    const hasSemverData = semverBreakdown.patch + semverBreakdown.minor + semverBreakdown.major > 0;
    const semverTotal = semverBreakdown.patch + semverBreakdown.minor + semverBreakdown.major;

    // Semver doughnut chart data
    const semverChartData = useMemo(() => {
        if (!hasSemverData) return null;

        return {
            data: {
                labels: ['Patch', 'Minor', 'Major'],
                datasets: [{
                    data: [semverBreakdown.patch, semverBreakdown.minor, semverBreakdown.major],
                    backgroundColor: [getSeriesColor(0), getSeriesColor(1), getSeriesColor(4)],
                    borderWidth: 0,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: 12, font: { size: 11 }, padding: 10 },
                    },
                },
            },
        };
    }, [semverBreakdown, hasSemverData, state.darkMode]);

    const handleCardClick = (type) => {
        let filtered, title;
        if (type === 'features') {
            filtered = filteredCommits.filter(c => getCommitTags(c).includes('feature'));
            title = 'Feature Commits';
        } else if (type === 'bugfixes') {
            filtered = filteredCommits.filter(c => {
                const tags = getCommitTags(c);
                return tags.includes('bugfix') || tags.includes('fix');
            });
            title = 'Bug Fix Commits';
        } else if (type === 'refactors') {
            filtered = filteredCommits.filter(c => getCommitTags(c).includes('refactor'));
            title = 'Refactor Commits';
        }
        if (filtered) {
            openDetailPane(title, `${filtered.length} commits`, filtered);
        }
    };

    const handleEpicClick = (epicName) => {
        const filtered = filteredCommits.filter(c =>
            c.epic && c.epic.trim().toLowerCase() === epicName
        );
        openDetailPane(`Epic: ${epicName}`, `${filtered.length} commits`, filtered);
    };

    const handleSemverClick = (level) => {
        const labels = { patch: 'Patch Changes', minor: 'Minor Changes', major: 'Major Changes' };
        const filtered = filteredCommits.filter(c => c.semver === level);
        openDetailPane(labels[level] || level, `${filtered.length} commits`, filtered);
    };

    const chartHeight = isMobile ? '220px' : '300px';

    // Requirement: Order sections from most interesting to least interesting
    // Approach: Trend chart first (tells the main story), then visual doughnut, then
    //   initiative breakdown, then complexity trend, then reference stats last
    // Alternatives:
    //   - Summary first: Rejected — raw counts are least engaging
    //   - Complexity before initiatives: Rejected — epic groupings are more actionable
    return (
        <div className="space-y-4 sm:space-y-6">
            {/* Feature vs Bug Fix Trend — the main story: are we building or fixing? */}
            {featFixChartData && (
                <CollapsibleSection title="Features vs Bug Fixes Over Time" subtitle="Monthly trend">
                    <div data-embed-id="feature-vs-bugfix-trend" style={{ height: chartHeight }}>
                        <Line data={featFixChartData.data} options={featFixChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Semver Breakdown — glanceable pie chart showing what kind of releases */}
            {hasSemverData && (
                <CollapsibleSection title="Change Types" subtitle="Patch, minor, and major releases">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div data-embed-id="semver-distribution" style={{ height: isMobile ? '180px' : '200px' }}>
                            <Doughnut data={semverChartData.data} options={semverChartData.options} />
                        </div>
                        <div className="space-y-3 flex flex-col justify-center">
                            {/* Semantic DaisyUI tokens so semver severity gradient tracks theme.
                                patch=info (safe), minor=success (forward progress), major=error (breaking). */}
                            {[
                                { key: 'patch', label: 'Patches', desc: 'Bug fixes', colorClass: 'bg-info' },
                                { key: 'minor', label: 'Minor', desc: 'New features', colorClass: 'bg-success' },
                                { key: 'major', label: 'Major', desc: 'Breaking changes', colorClass: 'bg-error' },
                            ].map(({ key, label, desc, colorClass }) => {
                                const count = semverBreakdown[key];
                                const pct = semverTotal > 0 ? Math.round((count / semverTotal) * 100) : 0;
                                return (
                                    <div
                                        key={key}
                                        className="cursor-pointer hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded p-2 -m-2 transition-colors"
                                        role="button"
                                        tabIndex={0}
                                        aria-label={`View ${label}: ${count} commits (${pct}%)`}
                                        onClick={() => handleSemverClick(key)}
                                        onKeyDown={handleKeyActivate(() => handleSemverClick(key))}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                                            <span className="text-sm text-base-content/80 font-medium">{label}</span>
                                            <span className="text-xs text-base-content/60">({desc})</span>
                                            <span className="ml-auto text-sm text-base-content font-medium">{count} ({pct}%)</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            {/* Epic Breakdown — where effort goes, actionable groupings */}
            {hasEpicData && (
                <CollapsibleSection title="Work by Initiative" subtitle="Commits grouped by initiative">
                    <div className="space-y-3">
                        {visibleEpics.map(([epic, count]) => {
                            const pct = filteredCommits.length > 0
                                ? Math.round((count / filteredCommits.length) * 100) : 0;
                            return (
                                <div
                                    key={epic}
                                    className="cursor-pointer hover:bg-base-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2 rounded p-2 -m-2 transition-colors"
                                    role="button"
                                    tabIndex={0}
                                    aria-label={`View ${epic}: ${count} commits (${pct}%)`}
                                    onClick={() => handleEpicClick(epic)}
                                    onKeyDown={handleKeyActivate(() => handleEpicClick(epic))}
                                >
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-base-content/80 font-medium">{epic}</span>
                                        <span className="text-base-content font-medium">{count} commits ({pct}%)</span>
                                    </div>
                                    {/* Native <progress> with DaisyUI's progress class + progress-primary
                                        theme variant — gives us screen-reader "X% of 100" announcement,
                                        a single semantic element, and auto-switch of the fill color to
                                        the active theme's primary accent. DaisyUI v5 ships .progress at
                                        height .5rem which matches our prior custom h-2 visual. */}
                                    <progress
                                        className="progress progress-primary w-full"
                                        value={pct}
                                        max="100"
                                        aria-label={`${epic} progress: ${pct} percent`}
                                    />
                                </div>
                            );
                        })}
                        {epicsHasMore && (
                            <ShowMoreButton remaining={epicsRemaining} pageSize={isMobile ? PAGE_LIMITS.epics[0] : PAGE_LIMITS.epics[1]} onClick={showMoreEpics} />
                        )}
                    </div>
                </CollapsibleSection>
            )}

            {/* Complexity Over Time — niche trend, collapsed on mobile */}
            {complexityChartData && (
                <CollapsibleSection title="Complexity Over Time" subtitle="Average complexity per month" defaultExpanded={!isMobile}>
                    <div data-embed-id="complexity-over-time" style={{ height: chartHeight }}>
                        <Line data={complexityChartData.data} options={complexityChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Work Summary Cards — reference numbers, least engaging */}
            <CollapsibleSection title="Summary">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div
                        className="p-4 bg-base-300 rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all"
                        role="button"
                        tabIndex={0}
                        aria-label={`View ${metrics.featureCount} feature commits`}
                        onClick={() => handleCardClick('features')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('features'))}
                    >
                        <div className="text-2xl font-semibold font-mono tracking-tight text-base-content">{metrics.featureCount}</div>
                        <div className="text-sm text-base-content/60">Features</div>
                    </div>
                    <div
                        className="p-4 bg-base-300 rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all"
                        role="button"
                        tabIndex={0}
                        aria-label={`View ${metrics.bugfixCount} bug fix commits`}
                        onClick={() => handleCardClick('bugfixes')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('bugfixes'))}
                    >
                        <div className="text-2xl font-semibold font-mono tracking-tight text-base-content">{metrics.bugfixCount}</div>
                        <div className="text-sm text-base-content/60">Bug Fixes</div>
                    </div>
                    <div
                        className="p-4 bg-base-300 rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-primary focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none transition-all"
                        role="button"
                        tabIndex={0}
                        aria-label={`View ${metrics.refactorCount} refactor commits`}
                        onClick={() => handleCardClick('refactors')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('refactors'))}
                    >
                        <div className="text-2xl font-semibold font-mono tracking-tight text-base-content">{metrics.refactorCount}</div>
                        <div className="text-sm text-base-content/60">Refactors</div>
                    </div>
                    <div className="p-4 bg-base-300 rounded-lg text-center">
                        <div className="text-2xl font-semibold font-mono tracking-tight text-base-content">{metrics.avgComplexity}</div>
                        <div className="text-sm text-base-content/60">Avg Complexity</div>
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
}
