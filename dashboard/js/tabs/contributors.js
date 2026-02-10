import { state, getViewConfig, isMobile } from '../state.js';
import { escapeHtml, getTagClass, getTagStyle, getTagColor, aggregateContributors } from '../utils.js';
import { getFilteredCommits } from '../filters.js';

export function renderContributors() {
    const commits = getFilteredCommits();
    const config = getViewConfig();

    // Use aggregation layer for view-level-appropriate grouping
    const aggregated = aggregateContributors(commits);

    // Who Does What - work type breakdown (cards)
    // Different granularity based on view level:
    // - executive: single "All Contributors" card
    // - management: one card per repo
    // - developer: one card per person (current behavior)
    const workTypesHtml = aggregated.slice(0, 8).map(item => {
        const totalTags = Object.values(item.breakdown).reduce((s, v) => s + v, 0);
        const tagBars = Object.entries(item.breakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag, count]) => {
                const pct = totalTags > 0 ? Math.round((count / totalTags) * 100) : 0;
                return `<div class="flex items-center gap-2">
                    <span class="tag ${getTagClass(tag)}" style="${getTagStyle(tag)}">${tag}</span>
                    <div class="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div class="h-2 rounded-full" style="width: ${pct}%; background-color: ${getTagColor(tag)}"></div>
                    </div>
                    <span class="text-xs text-themed-tertiary w-8">${pct}%</span>
                </div>`;
            }).join('');
        return `
            <div class="p-3 bg-themed-tertiary rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" data-drilldown-label="${escapeHtml(item.label)}">
                <p class="font-medium text-themed-primary mb-1">${escapeHtml(item.displayName)}</p>
                <p class="text-xs text-themed-tertiary mb-2">${item.count} commits</p>
                <div class="space-y-1">${tagBars}</div>
            </div>
        `;
    }).join('');
    document.getElementById('contributor-work-types').innerHTML = workTypesHtml || '<p class="text-themed-tertiary">No contributor data</p>';
    // Click handlers are delegated via setupDelegatedHandlers()

    // Complexity chart - same shape, different labels based on view level
    const top8 = aggregated.slice(0, 8);
    const chartLabels = top8.map(item => {
        // Truncate long labels for chart
        const name = item.displayName;
        return name.length > 20 ? name.substring(0, 17) + '...' : name;
    });
    const avgComplexities = top8.map(item => {
        if (!item.complexities || item.complexities.length === 0) return 0;
        return item.complexities.reduce((a, b) => a + b, 0) / item.complexities.length;
    });

    const mobileCC = isMobile();
    if (state.charts.contributorComplexity) state.charts.contributorComplexity.destroy();
    state.charts.contributorComplexity = new Chart(document.getElementById('contributor-complexity-chart'), {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Avg Complexity',
                data: avgComplexities,
                backgroundColor: avgComplexities.map(c => c >= 3.5 ? '#8b5cf6' : c >= 2.5 ? '#2D68FF' : '#94a3b8')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: mobileCC ? 9 : 12 } } },
                y: { ticks: { font: { size: mobileCC ? 9 : 12 } } }
            }
        }
    });
}
