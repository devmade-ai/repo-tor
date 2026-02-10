import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import {
    getTagClass, getTagStyleObject, getTagColor,
    aggregateContributors, getAuthorEmail, getAuthorName, sanitizeName, handleKeyActivate
} from '../utils.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';

export default function ContributorsTab() {
    const { filteredCommits, viewConfig, openDetailPane, isMobile } = useApp();

    // Aggregated contributor data based on view level
    const aggregated = useMemo(() => {
        return aggregateContributors(filteredCommits);
    }, [filteredCommits]);

    // Complexity chart data
    const complexityChartData = useMemo(() => {
        const top8 = aggregated.slice(0, 8);
        if (top8.length === 0) return null;

        const chartLabels = top8.map(item => {
            const name = item.displayName;
            return name.length > 20 ? name.substring(0, 17) + '...' : name;
        });

        const avgComplexities = top8.map(item => {
            if (!item.complexities || item.complexities.length === 0) return 0;
            return item.complexities.reduce((a, b) => a + b, 0) / item.complexities.length;
        });

        const mobile = isMobile();
        return {
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Avg Complexity',
                    data: avgComplexities,
                    backgroundColor: avgComplexities.map(c =>
                        c >= 3.5 ? '#8b5cf6' : c >= 2.5 ? '#2D68FF' : '#94a3b8'
                    ),
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: mobile ? 9 : 12 } } },
                    y: { ticks: { font: { size: mobile ? 9 : 12 } } },
                },
            },
        };
    }, [aggregated, isMobile]);

    const handleCardClick = (item) => {
        let relevantCommits;
        let displayName = item.label;

        if (viewConfig.contributors === 'total') {
            relevantCommits = filteredCommits;
            displayName = 'All Contributors';
        } else if (viewConfig.contributors === 'repo') {
            relevantCommits = filteredCommits.filter(c => (c.repo_id || 'default') === item.label);
        } else {
            relevantCommits = filteredCommits.filter(c => getAuthorEmail(c) === item.label);
            if (relevantCommits.length > 0) {
                displayName = sanitizeName(getAuthorName(relevantCommits[0]), item.label);
            }
        }

        openDetailPane(displayName, `${relevantCommits.length} commits`, relevantCommits);
    };

    return (
        <div className="space-y-6">
            {/* Who Does What */}
            <CollapsibleSection title="Who Does What">
                {aggregated.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {aggregated.slice(0, 8).map((item, idx) => {
                            const totalTags = Object.values(item.breakdown).reduce((s, v) => s + v, 0);
                            const topTags = Object.entries(item.breakdown)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5);

                            return (
                                <div
                                    key={item.label || idx}
                                    className="p-3 bg-themed-tertiary rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleCardClick(item)}
                                    onKeyDown={handleKeyActivate(() => handleCardClick(item))}
                                >
                                    <p className="font-medium text-themed-primary mb-1">{item.displayName}</p>
                                    <p className="text-xs text-themed-tertiary mb-2">{item.count} commits</p>
                                    <div className="space-y-1">
                                        {topTags.map(([tag, count]) => {
                                            const pct = totalTags > 0 ? Math.round((count / totalTags) * 100) : 0;
                                            return (
                                                <div key={tag} className="flex items-center gap-2">
                                                    <span
                                                        className={`tag ${getTagClass(tag)}`}
                                                        style={getTagStyleObject(tag)}
                                                    >
                                                        {tag}
                                                    </span>
                                                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                        <div
                                                            className="h-2 rounded-full"
                                                            style={{ width: `${pct}%`, backgroundColor: getTagColor(tag) }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-themed-tertiary w-8">{pct}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-themed-tertiary">No contributor data</p>
                )}
            </CollapsibleSection>

            {/* Complexity by Contributor */}
            {complexityChartData && (
                <CollapsibleSection title="Complexity by Contributor">
                    <div style={{ height: `${Math.max(200, aggregated.slice(0, 8).length * 40)}px` }}>
                        <Bar data={complexityChartData.data} options={complexityChartData.options} />
                    </div>
                </CollapsibleSection>
            )}
        </div>
    );
}
