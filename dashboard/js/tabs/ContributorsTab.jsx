import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import {
    getTagClass, getTagStyleObject, getTagColor,
    aggregateContributors, getAuthorEmail, getAuthorName, sanitizeName, handleKeyActivate
} from '../utils.js';
import { getSeriesColor, mutedColor } from '../chartColors.js';
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

        const mobile = isMobile;
        return {
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Avg Complexity',
                    data: avgComplexities,
                    backgroundColor: avgComplexities.map(c =>
                        c >= 3.5 ? getSeriesColor(3) : c >= 2.5 ? getSeriesColor(0) : mutedColor
                    ),
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: mobile ? 10 : 12 } } },
                    y: { ticks: { font: { size: mobile ? 10 : 12 } } },
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
            <CollapsibleSection title="Who Does What" subtitle="Top contributors and their focus areas">
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
                                    aria-label={`${item.displayName}, ${item.count} commits — click for details`}
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
                    <p className="text-themed-tertiary">Nothing matches the current filters. Try adjusting your selections.</p>
                )}
            </CollapsibleSection>

            {/* Complexity by Contributor — collapsed on mobile since the cards above show the key info */}
            {complexityChartData && (
                <CollapsibleSection title="Complexity by Contributor" subtitle="Average complexity of each person's work" defaultExpanded={!isMobile}>
                    <div data-embed-id="contributor-complexity" style={{ height: `${Math.max(200, aggregated.slice(0, 8).length * (isMobile ? 35 : 40))}px` }}>
                        <Bar data={complexityChartData.data} options={complexityChartData.options} />
                    </div>
                </CollapsibleSection>
            )}
        </div>
    );
}
