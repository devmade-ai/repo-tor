import { state, isMobile } from '../state.js';
import { getCommitTags, getTagColor, getTagClass, getTagStyle } from '../utils.js';
import { getFilteredCommits } from '../filters.js';

export function renderTags() {
    const commits = getFilteredCommits();
    // Build tag breakdown from commits (counting each tag occurrence)
    const tagBreakdown = {};
    commits.forEach(commit => {
        const tags = getCommitTags(commit);
        tags.forEach(tag => {
            tagBreakdown[tag] = (tagBreakdown[tag] || 0) + 1;
        });
    });

    // Sort tags by count (descending) for consistent display
    const sortedTags = Object.entries(tagBreakdown)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

    const tags = sortedTags.map(t => t.tag);
    const counts = sortedTags.map(t => t.count);
    const colors = tags.map(t => getTagColor(t));
    const total = counts.reduce((a, b) => a + b, 0);

    // Tags Pie Chart
    const mobileTags = isMobile();
    if (state.charts.tags) state.charts.tags.destroy();
    state.charts.tags = new Chart(document.getElementById('tags-chart'), {
        type: 'doughnut',
        data: {
            labels: tags,
            datasets: [{
                data: counts,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: mobileTags ? 8 : 12,
                        padding: mobileTags ? 4 : 8,
                        font: { size: mobileTags ? 9 : 11 },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            return data.labels.map((label, i) => ({
                                text: `${label} (${data.datasets[0].data[i]})`,
                                fillStyle: data.datasets[0].backgroundColor[i],
                                fontColor: Chart.defaults.color,
                                hidden: false,
                                index: i
                            }));
                        }
                    }
                }
            }
        }
    });

    const breakdownHtml = sortedTags.map(({ tag, count }) => `
        <div class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors" data-tag-filter="${tag}">
            <span class="tag ${getTagClass(tag)}" style="${getTagStyle(tag)}">${tag}</span>
            <div class="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div class="h-2 rounded-full" style="width: ${(count / total * 100).toFixed(1)}%; background-color: ${getTagColor(tag)}"></div>
            </div>
            <span class="text-sm text-themed-secondary">${count} (${(count / total * 100).toFixed(1)}%)</span>
        </div>
    `).join('');
    document.getElementById('tag-breakdown').innerHTML = breakdownHtml;

    // Click handlers are delegated via setupDelegatedHandlers()
}
