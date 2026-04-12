import React, { useMemo } from 'react';
import { Doughnut } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import { getCommitTags, getTagColor, getTagClass, getTagStyleObject, handleKeyActivate } from '../utils.js';
import { PAGE_LIMITS } from '../state.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import ShowMoreButton from '../components/ShowMoreButton.jsx';
import useShowMore from '../hooks/useShowMore.js';

// Requirement: The doughnut legend labels must follow the active theme.
// Approach: Rely on Chart.js global defaults. AppContext's darkMode effect
//   sets ChartJS.defaults.color to `color-mix(in oklab, var(--color-base-content) 80%, transparent)`
//   on every theme change, and this chart's useMemo has state.darkMode as a
//   dep so the chart rebuilds and picks up the new default.
//   No per-component theme sync needed — single source of truth in AppContext.
// Alternatives:
//   - Per-component CSS variable read (previous approach): Rejected — duplicated
//     theme-sync logic across every chart-rendering section.
//   - Hardcoded color: Rejected — breaks theme changes.

export default function Tags() {
    const { state, filteredCommits, openDetailPane, isMobile, commitsLoaded } = useApp();

    // Requirement: Show tag data instantly during Phase 1 using pre-aggregated summary
    // Approach: When commits haven't loaded yet, use summary.tagBreakdown (computed at
    //   aggregation time). Once commits load, recompute from filteredCommits to respect
    //   user-applied filters. Same output format for both paths → same rendering code.
    // Alternatives:
    //   - Show spinner during Phase 1: Rejected — summary already has the data we need
    //   - Conditional hook call (early return): Rejected — violates React hooks rules
    const tagData = useMemo(() => {
        // Phase 1: use pre-aggregated tag breakdown from summary
        if (!commitsLoaded) {
            const breakdown = state.data?.summary?.tagBreakdown;
            if (!breakdown || Object.keys(breakdown).length === 0) {
                return { sortedTags: [], tags: [], counts: [], colors: [], total: 0 };
            }
            const sortedTags = Object.entries(breakdown)
                .map(([tag, count]) => ({ tag, count }))
                .sort((a, b) => b.count - a.count);
            const tags = sortedTags.map(t => t.tag);
            const counts = sortedTags.map(t => t.count);
            const colors = tags.map(t => getTagColor(t));
            const total = counts.reduce((a, b) => a + b, 0);
            return { sortedTags, tags, counts, colors, total };
        }

        // Phase 2: compute from filtered commits (respects user-applied filters)
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
    }, [filteredCommits, commitsLoaded, state.data?.summary?.tagBreakdown]);

    // Paginate tag list — 8 mobile / show all desktop (0 = no limit)
    const {
        visible: visibleTags,
        hasMore: tagsHasMore,
        remaining: tagsRemaining,
        showMore: showMoreTags,
    } = useShowMore(tagData.sortedTags, ...PAGE_LIMITS.tags, isMobile);

    // Doughnut chart config
    const doughnutChartData = useMemo(() => {
        if (tagData.tags.length === 0) return null;


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
                            boxWidth: isMobile ? 8 : 12,
                            padding: isMobile ? 4 : 8,
                            font: { size: isMobile ? 10 : 11 },
                            // color inherits from ChartJS.defaults.color — set by
                            // AppContext's darkMode effect. The useMemo's state.darkMode
                            // dep rebuilds this options object on toggle.
                            generateLabels: function (chart) {
                                const data = chart.data;
                                return data.labels.map((label, i) => ({
                                    text: `${label} (${data.datasets[0].data[i]})`,
                                    fillStyle: data.datasets[0].backgroundColor[i],
                                    // fontColor inherits from legend.labels.color above
                                    hidden: false,
                                    index: i,
                                }));
                            },
                        },
                    },
                },
            },
        };
    // state.darkMode: bust memo on theme toggle so chart picks up new Chart.js defaults
    }, [tagData, isMobile, state.darkMode]);

    const handleTagClick = (tag) => {
        // During Phase 1, no commits to filter — clicking does nothing useful
        if (!commitsLoaded) return;
        const filtered = filteredCommits.filter(c => getCommitTags(c).includes(tag));
        openDetailPane(`${tag} Commits`, `${filtered.length} commits`, filtered, { type: 'tag', value: tag });
    };

    // Requirement: Order by interest — chart is more visually engaging on desktop,
    //   but list is more scannable/actionable on mobile.
    // Approach: Use flex+order to swap section order between mobile and desktop.
    //   Previous implementation used order classes without a flex parent (bug — order
    //   only works in flex/grid contexts). Fixed by adding flex flex-col to parent.
    // Alternatives:
    //   - Duplicate JSX: Rejected — harder to maintain
    //   - Chart always first: Rejected — list is more practical on small screens
    const chartHeight = isMobile ? '250px' : '350px';

    return (
        <div className="flex flex-col gap-6">
            {/* Tag Breakdown List — more scannable on mobile (order-1), secondary on desktop (order-2) */}
            <div className={isMobile ? 'order-1' : 'order-2'}>
                <CollapsibleSection title="Tag Breakdown" subtitle={commitsLoaded ? 'Tap any tag to see its commits' : 'Overall tag distribution'}>
                    {tagData.sortedTags.length > 0 ? (
                        <div className="space-y-3">
                            {visibleTags.map(({ tag, count }) => (
                                <div
                                    key={tag}
                                    className={`flex items-center gap-3 rounded p-2 -m-2 transition-colors ${commitsLoaded ? 'cursor-pointer hover:bg-base-200' : ''}`}
                                    role={commitsLoaded ? 'button' : undefined}
                                    tabIndex={commitsLoaded ? 0 : undefined}
                                    onClick={() => handleTagClick(tag)}
                                    onKeyDown={commitsLoaded ? handleKeyActivate(() => handleTagClick(tag)) : undefined}
                                >
                                    <span
                                        className={`tag ${getTagClass(tag)}`}
                                        style={getTagStyleObject(tag)}
                                    >
                                        {tag}
                                    </span>
                                    <div className="flex-1 bg-base-300 rounded-full h-2">
                                        <div
                                            className="h-2 rounded-full"
                                            style={{
                                                width: `${(count / tagData.total * 100).toFixed(1)}%`,
                                                backgroundColor: getTagColor(tag),
                                            }}
                                        />
                                    </div>
                                    <span className="text-sm text-base-content/80 whitespace-nowrap">
                                        {count} ({(count / tagData.total * 100).toFixed(0)}%)
                                    </span>
                                </div>
                            ))}
                            {tagsHasMore && (
                                <ShowMoreButton remaining={tagsRemaining} pageSize={PAGE_LIMITS.tags[0]} onClick={showMoreTags} />
                            )}
                        </div>
                    ) : (
                        <p className="text-base-content/60 text-sm">Nothing matches the current filters. Try adjusting your selections.</p>
                    )}
                </CollapsibleSection>
            </div>

            {/* Tag Distribution Chart — visually engaging on desktop (order-1), secondary on mobile (order-2) */}
            {doughnutChartData && (
                <div className={isMobile ? 'order-2' : 'order-1'}>
                    <CollapsibleSection title="Tag Distribution" subtitle="Visual breakdown of commit types" defaultExpanded={!isMobile}>
                        <div data-embed-id="tag-distribution" style={{ height: chartHeight }}>
                            <Doughnut data={doughnutChartData.data} options={doughnutChartData.options} />
                        </div>
                    </CollapsibleSection>
                </div>
            )}
        </div>
    );
}
