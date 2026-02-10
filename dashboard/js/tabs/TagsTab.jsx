import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import { getCommitTags, getTagColor, getTagClass, getTagStyle } from '../utils.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';

function parseInlineStyle(styleStr) {
    if (!styleStr) return {};
    const style = {};
    styleStr.split(';').forEach(pair => {
        const [key, val] = pair.split(':').map(s => s.trim());
        if (key && val) style[key] = val;
    });
    return style;
}

export default function TagsTab() {
    const { filteredCommits, openDetailPane, isMobile } = useApp();

    // Tag breakdown data
    const tagData = useMemo(() => {
        const tagBreakdown = {};
        filteredCommits.forEach(commit => {
            const tags = getCommitTags(commit);
            tags.forEach(tag => {
                tagBreakdown[tag] = (tagBreakdown[tag] || 0) + 1;
            });
        });

        const sortedTags = Object.entries(tagBreakdown)
            .map(([tag, count]) => ({ tag, count }))
            .sort((a, b) => b.count - a.count);

        const tags = sortedTags.map(t => t.tag);
        const counts = sortedTags.map(t => t.count);
        const colors = tags.map(t => getTagColor(t));
        const total = counts.reduce((a, b) => a + b, 0);

        return { sortedTags, tags, counts, colors, total };
    }, [filteredCommits]);

    // Doughnut chart config
    const doughnutChartData = useMemo(() => {
        if (tagData.tags.length === 0) return null;

        const mobile = isMobile();
        return {
            data: {
                labels: tagData.tags,
                datasets: [{
                    data: tagData.counts,
                    backgroundColor: tagData.colors,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            boxWidth: mobile ? 8 : 12,
                            padding: mobile ? 4 : 8,
                            font: { size: mobile ? 9 : 11 },
                            generateLabels: function (chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                    text: `${label} (${data.datasets[0].data[i]})`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    hidden: false,
                                    index: i,
                                }));
                            },
                        },
                    },
                },
            },
        };
    }, [tagData, isMobile]);

    const handleTagClick = (tag) => {
        const filtered = filteredCommits.filter(c => getCommitTags(c).includes(tag));
        openDetailPane(`${tag} Commits`, `${filtered.length} commits`, filtered, { type: 'tag', value: tag });
    };

    return (
        <div className="space-y-6">
            {/* Tag Distribution Chart */}
            {doughnutChartData && (
                <CollapsibleSection title="Tag Distribution">
                    <div style={{ height: '350px' }}>
                        <Doughnut data={doughnutChartData.data} options={doughnutChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Tag Breakdown List */}
            <CollapsibleSection title="Tag Breakdown">
                {tagData.sortedTags.length > 0 ? (
                    <div className="space-y-3">
                        {tagData.sortedTags.map(({ tag, count }) => (
                            <div
                                key={tag}
                                className="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors"
                                onClick={() => handleTagClick(tag)}
                            >
                                <span
                                    className={`tag ${getTagClass(tag)}`}
                                    style={parseInlineStyle(getTagStyle(tag))}
                                >
                                    {tag}
                                </span>
                                <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div
                                        className="h-2 rounded-full"
                                        style={{
                                            width: `${(count / tagData.total * 100).toFixed(1)}%`,
                                            backgroundColor: getTagColor(tag),
                                        }}
                                    />
                                </div>
                                <span className="text-sm text-themed-secondary">
                                    {count} ({(count / tagData.total * 100).toFixed(1)}%)
                                </span>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-themed-tertiary text-sm">No tag data available</p>
                )}
            </CollapsibleSection>
        </div>
    );
}
