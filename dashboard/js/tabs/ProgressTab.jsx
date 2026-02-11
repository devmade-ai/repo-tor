import React, { useMemo } from 'react';
import { Line } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import { getCommitTags, handleKeyActivate } from '../utils.js';
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
                        borderColor: '#16A34A',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        fill: true,
                        tension: 0.3,
                    },
                    {
                        label: 'Bug Fixes',
                        data: fixData,
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
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
                    borderColor: '#8b5cf6',
                    backgroundColor: 'rgba(139, 92, 246, 0.1)',
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
                    <div style={{ height: '300px' }}>
                        <Line data={featFixChartData.data} options={featFixChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Complexity Over Time */}
            {complexityChartData && (
                <CollapsibleSection title="Complexity Over Time">
                    <div style={{ height: '300px' }}>
                        <Line data={complexityChartData.data} options={complexityChartData.options} />
                    </div>
                </CollapsibleSection>
            )}
        </div>
    );
}
