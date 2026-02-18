import React, { useMemo } from 'react';
import { Line, Doughnut } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import { getCommitTags, handleKeyActivate } from '../utils.js';
import { getSeriesColor, withOpacity } from '../chartColors.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';

export default function ProgressTab() {
    const { filteredCommits, openDetailPane, isMobile } = useApp();

    // Summary metrics
    const metrics = useMemo(() => {
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
    }, [filteredCommits]);

    // Feature vs Bug Fix Trend chart data
    const featFixChartData = useMemo(() => {
        const monthSet = new Set(filteredCommits.map(c => c.timestamp?.substring(0, 7)).filter(Boolean));
        const months = [...monthSet].sort();

        const monthlyTagCounts = {};
        filteredCommits.forEach(commit => {
            const month = commit.timestamp?.substring(0, 7);
            if (!month) return;
            if (!monthlyTagCounts[month]) monthlyTagCounts[month] = { feature: 0, bugfix: 0 };
            const tags = getCommitTags(commit);
            if (tags.includes('feature')) monthlyTagCounts[month].feature++;
            if (tags.includes('bugfix') || tags.includes('fix')) monthlyTagCounts[month].bugfix++;
        });

        const featData = months.map(m => monthlyTagCounts[m]?.feature || 0);
        const fixData = months.map(m => monthlyTagCounts[m]?.bugfix || 0);

        if (months.length === 0) return null;

        const mobile = isMobile;
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
                    legend: { labels: { font: { size: mobile ? 9 : 12 }, boxWidth: mobile ? 8 : 40 } },
                },
                scales: {
                    x: { ticks: { font: { size: mobile ? 9 : 12 }, maxRotation: mobile ? 60 : 45 } },
                    y: { ticks: { font: { size: mobile ? 9 : 12 } } },
                },
            },
        };
    }, [filteredCommits, isMobile]);

    // Complexity Over Time chart data
    const complexityChartData = useMemo(() => {
        const monthSet = new Set(filteredCommits.map(c => c.timestamp?.substring(0, 7)).filter(Boolean));
        const months = [...monthSet].sort();

        const monthlyComplexity = {};
        filteredCommits.forEach(commit => {
            const month = commit.timestamp?.substring(0, 7);
            if (!month) return;
            if (!monthlyComplexity[month]) monthlyComplexity[month] = { total: 0, count: 0 };
            if (commit.complexity != null) {
                monthlyComplexity[month].total += commit.complexity;
                monthlyComplexity[month].count++;
            }
        });

        const complexityData = months.map(m => {
            const mc = monthlyComplexity[m];
            return mc && mc.count > 0 ? (mc.total / mc.count) : null;
        });

        if (months.length === 0) return null;

        const mobile = isMobile;
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
                    x: { ticks: { font: { size: mobile ? 9 : 12 }, maxRotation: mobile ? 60 : 45 } },
                    y: {
                        min: 1,
                        max: 5,
                        ticks: { stepSize: 1, font: { size: mobile ? 9 : 12 } },
                    },
                },
            },
        };
    }, [filteredCommits, isMobile]);

    // Epic breakdown — groups commits by epic label
    const epicBreakdown = useMemo(() => {
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
    }, [filteredCommits]);

    const hasEpicData = epicBreakdown.length > 0;

    // Semver breakdown — patch/minor/major distribution
    const semverBreakdown = useMemo(() => {
        const breakdown = { patch: 0, minor: 0, major: 0 };
        filteredCommits.forEach(c => {
            if (c.semver && breakdown.hasOwnProperty(c.semver)) {
                breakdown[c.semver]++;
            }
        });
        return breakdown;
    }, [filteredCommits]);

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
    }, [semverBreakdown, hasSemverData]);

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

    return (
        <div className="space-y-6">
            {/* Work Summary Cards */}
            <CollapsibleSection title="Summary">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div
                        className="p-4 bg-themed-tertiary rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCardClick('features')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('features'))}
                    >
                        <div className="text-2xl font-semibold text-themed-primary">{metrics.featureCount}</div>
                        <div className="text-sm text-themed-tertiary">Features</div>
                    </div>
                    <div
                        className="p-4 bg-themed-tertiary rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCardClick('bugfixes')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('bugfixes'))}
                    >
                        <div className="text-2xl font-semibold text-themed-primary">{metrics.bugfixCount}</div>
                        <div className="text-sm text-themed-tertiary">Bug Fixes</div>
                    </div>
                    <div
                        className="p-4 bg-themed-tertiary rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleCardClick('refactors')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('refactors'))}
                    >
                        <div className="text-2xl font-semibold text-themed-primary">{metrics.refactorCount}</div>
                        <div className="text-sm text-themed-tertiary">Refactors</div>
                    </div>
                    <div className="p-4 bg-themed-tertiary rounded-lg text-center">
                        <div className="text-2xl font-semibold text-themed-primary">{metrics.avgComplexity}</div>
                        <div className="text-sm text-themed-tertiary">Avg Complexity</div>
                    </div>
                </div>
            </CollapsibleSection>

            {/* Feature vs Bug Fix Trend */}
            {featFixChartData && (
                <CollapsibleSection title="Feature vs Bug Fix Trend">
                    <div data-embed-id="feature-vs-bugfix-trend" style={{ height: '300px' }}>
                        <Line data={featFixChartData.data} options={featFixChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Complexity Over Time */}
            {complexityChartData && (
                <CollapsibleSection title="Complexity Over Time">
                    <div data-embed-id="complexity-over-time" style={{ height: '300px' }}>
                        <Line data={complexityChartData.data} options={complexityChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Epic Breakdown — only shown when commits have epic labels */}
            {hasEpicData && (
                <CollapsibleSection title="Work by Initiative">
                    <div className="space-y-3">
                        {epicBreakdown.map(([epic, count]) => {
                            const pct = filteredCommits.length > 0
                                ? Math.round((count / filteredCommits.length) * 100) : 0;
                            return (
                                <div
                                    key={epic}
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleEpicClick(epic)}
                                    onKeyDown={handleKeyActivate(() => handleEpicClick(epic))}
                                >
                                    <div className="flex justify-between text-sm mb-1">
                                        <span className="text-themed-secondary font-medium">{epic}</span>
                                        <span className="text-themed-primary font-medium">{count} commits ({pct}%)</span>
                                    </div>
                                    <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                        <div className="bg-indigo-500 h-2 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </CollapsibleSection>
            )}

            {/* Semver Breakdown — only shown when commits have semver data */}
            {hasSemverData && (
                <CollapsibleSection title="Change Types">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div data-embed-id="semver-distribution" style={{ height: '200px' }}>
                            <Doughnut data={semverChartData.data} options={semverChartData.options} />
                        </div>
                        <div className="space-y-3 flex flex-col justify-center">
                            {[
                                { key: 'patch', label: 'Patches', desc: 'Bug fixes', colorClass: 'bg-blue-500' },
                                { key: 'minor', label: 'Minor', desc: 'New features', colorClass: 'bg-green-500' },
                                { key: 'major', label: 'Major', desc: 'Breaking changes', colorClass: 'bg-red-500' },
                            ].map(({ key, label, desc, colorClass }) => {
                                const count = semverBreakdown[key];
                                const pct = semverTotal > 0 ? Math.round((count / semverTotal) * 100) : 0;
                                return (
                                    <div
                                        key={key}
                                        className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors"
                                        role="button"
                                        tabIndex={0}
                                        onClick={() => handleSemverClick(key)}
                                        onKeyDown={handleKeyActivate(() => handleSemverClick(key))}
                                    >
                                        <div className="flex items-center gap-2">
                                            <div className={`w-3 h-3 rounded-full ${colorClass}`} />
                                            <span className="text-sm text-themed-secondary font-medium">{label}</span>
                                            <span className="text-xs text-themed-tertiary">({desc})</span>
                                            <span className="ml-auto text-sm text-themed-primary font-medium">{count} ({pct}%)</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </CollapsibleSection>
            )}
        </div>
    );
}
