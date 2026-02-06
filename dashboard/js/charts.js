import { state } from './state.js';
import { getViewConfig } from './state.js';
import { getAdditions, getDeletions, getCommitTags, getCommitDateTime } from './utils.js';
import { getFilteredCommits } from './filters.js';

// Helper: aggregate commits by week for executive view
function aggregateByWeekPeriod(commits) {
    const byWeek = {};
    commits.forEach(c => {
        if (!c.timestamp) return;
        const date = new Date(c.timestamp);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        const key = weekStart.toISOString().substring(0, 10);
        if (!byWeek[key]) {
            byWeek[key] = { commits: [], tags: {}, repos: new Set() };
        }
        byWeek[key].commits.push(c);
        getCommitTags(c).forEach(tag => {
            byWeek[key].tags[tag] = (byWeek[key].tags[tag] || 0) + 1;
        });
        if (c.repo_id) byWeek[key].repos.add(c.repo_id);
    });

    return Object.entries(byWeek)
        .sort((a, b) => b[0].localeCompare(a[0]))  // Most recent first
        .map(([key, data]) => ({
            key,
            label: `Week of ${new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
            count: data.commits.length,
            commits: data.commits,
            tags: data.tags,
            repos: [...data.repos]
        }));
}

// Helper: aggregate commits by day for management view
function aggregateByDayPeriod(commits) {
    const byDay = {};
    commits.forEach(c => {
        if (!c.timestamp) return;
        const key = c.timestamp.substring(0, 10);
        if (!byDay[key]) {
            byDay[key] = { commits: [], tags: {}, repos: new Set() };
        }
        byDay[key].commits.push(c);
        getCommitTags(c).forEach(tag => {
            byDay[key].tags[tag] = (byDay[key].tags[tag] || 0) + 1;
        });
        if (c.repo_id) byDay[key].repos.add(c.repo_id);
    });

    return Object.entries(byDay)
        .sort((a, b) => b[0].localeCompare(a[0]))  // Most recent first
        .map(([key, data]) => ({
            key,
            label: new Date(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            count: data.commits.length,
            commits: data.commits,
            tags: data.tags,
            repos: [...data.repos]
        }));
}

function renderActivityTimeline(commits) {
    // Group commits by date
    const commitsByDate = {};
    const repoColors = {};
    const repos = [...new Set(commits.map(c => c.repo_id).filter(Boolean))];

    // Assign colors to repos - dark theme palette
    const repoColorPalette = ['#2D68FF', '#16A34A', '#EAB308', '#a78bfa', '#EF4444', '#22d3ee'];
    repos.forEach((repo, i) => {
        repoColors[repo] = repoColorPalette[i % repoColorPalette.length];
    });

    commits.forEach(commit => {
        const dateStr = commit.timestamp?.substring(0, 10);
        if (!dateStr) return;
        if (!commitsByDate[dateStr]) {
            commitsByDate[dateStr] = { total: 0, byRepo: {} };
        }
        commitsByDate[dateStr].total++;
        if (commit.repo_id) {
            commitsByDate[dateStr].byRepo[commit.repo_id] = (commitsByDate[dateStr].byRepo[commit.repo_id] || 0) + 1;
        }
    });

    // Sort dates and limit to reasonable range (last 60 dates with activity)
    const sortedDates = Object.keys(commitsByDate).sort().slice(-60);

    if (sortedDates.length === 0) {
        if (state.charts.activityTimeline) state.charts.activityTimeline.destroy();
        return;
    }

    // Build datasets
    let datasets;
    if (repos.length > 1) {
        // Multi-repo: stacked bar chart by repo
        datasets = repos.map(repo => ({
            label: repo,
            data: sortedDates.map(d => commitsByDate[d]?.byRepo[repo] || 0),
            backgroundColor: repoColors[repo],
            borderRadius: 2
        }));
    } else {
        // Single repo: simple bar chart
        datasets = [{
            label: 'Commits',
            data: sortedDates.map(d => commitsByDate[d]?.total || 0),
            backgroundColor: '#2D68FF',
            borderRadius: 2
        }];
    }

    // Format date labels (show month/day for readability)
    const labels = sortedDates.map(d => {
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    if (state.charts.activityTimeline) state.charts.activityTimeline.destroy();
    state.charts.activityTimeline = new Chart(document.getElementById('activity-timeline-chart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: repos.length > 1,
                    position: 'top'
                }
            },
            scales: {
                x: {
                    stacked: repos.length > 1,
                    ticks: {
                        maxRotation: 45,
                        callback: function(value, index) {
                            // Show fewer labels on smaller datasets
                            const step = Math.ceil(sortedDates.length / 15);
                            return index % step === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    stacked: repos.length > 1,
                    beginAtZero: true,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

function renderCodeChangesTimeline(commits) {
    // Group code changes by date and repo
    const changesByDate = {};
    const repoColors = {};
    const repos = [...new Set(commits.map(c => c.repo_id).filter(Boolean))];

    // Assign colors to repos - same palette as activity timeline
    const repoColorPalette = ['#2D68FF', '#16A34A', '#EAB308', '#a78bfa', '#EF4444', '#22d3ee'];
    repos.forEach((repo, i) => {
        repoColors[repo] = repoColorPalette[i % repoColorPalette.length];
    });

    commits.forEach(commit => {
        const dateStr = commit.timestamp?.substring(0, 10);
        if (!dateStr) return;
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

    // Sort dates and limit to reasonable range (last 60 dates with activity)
    const sortedDates = Object.keys(changesByDate).sort().slice(-60);

    if (sortedDates.length === 0) {
        if (state.charts.codeChangesTimeline) state.charts.codeChangesTimeline.destroy();
        return;
    }

    // Build datasets
    let datasets;
    if (repos.length > 1) {
        // Multi-repo: stacked bar chart by repo
        datasets = repos.map(repo => ({
            label: repo,
            data: sortedDates.map(d => changesByDate[d]?.byRepo[repo] || 0),
            backgroundColor: repoColors[repo],
            borderRadius: 2
        }));
    } else {
        // Single repo: simple bar chart
        datasets = [{
            label: 'Net Lines',
            data: sortedDates.map(d => changesByDate[d]?.total || 0),
            backgroundColor: '#2D68FF',
            borderRadius: 2
        }];
    }

    // Format date labels (show month/day for readability)
    const labels = sortedDates.map(d => {
        const date = new Date(d);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    });

    if (state.charts.codeChangesTimeline) state.charts.codeChangesTimeline.destroy();
    state.charts.codeChangesTimeline = new Chart(document.getElementById('code-changes-timeline-chart'), {
        type: 'bar',
        data: {
            labels: labels,
            datasets: datasets
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: repos.length > 1,
                    position: 'top'
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const value = context.raw;
                            const sign = value >= 0 ? '+' : '';
                            return `${context.dataset.label}: ${sign}${value.toLocaleString()} lines`;
                        }
                    }
                }
            },
            scales: {
                x: {
                    stacked: repos.length > 1,
                    ticks: {
                        maxRotation: 45,
                        callback: function(value, index) {
                            const step = Math.ceil(sortedDates.length / 15);
                            return index % step === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: {
                    stacked: repos.length > 1,
                    ticks: {
                        callback: function(value) {
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
                        }
                    }
                }
            }
        }
    });
}

function renderHeatmap() {
    const commits = getFilteredCommits();
    const config = getViewConfig();

    // Different granularity based on view level
    if (config.timing === 'week') {
        renderWeeklyHeatmap(commits);
        return;
    } else if (config.timing === 'day') {
        renderDailyHeatmap(commits);
        return;
    }

    // Developer view: full 24x7 hourly heatmap (current behavior)
    // Build 24x7 matrix (hours x days)
    const matrix = Array.from({ length: 24 }, () => new Array(7).fill(0));

    commits.forEach(commit => {
        const { hour, dayOfWeek } = getCommitDateTime(commit);
        matrix[hour][dayOfWeek]++;
    });

    // Find max for intensity scaling
    const maxCount = Math.max(...matrix.flat(), 1);

    // Get intensity level (0-4)
    const getIntensity = (count) => {
        if (count === 0) return 0;
        const ratio = count / maxCount;
        if (ratio <= 0.25) return 1;
        if (ratio <= 0.5) return 2;
        if (ratio <= 0.75) return 3;
        return 4;
    };

    // Reorder to Monday-first
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
    const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    // Build HTML
    let html = '';

    // Header row (empty corner + day names)
    html += '<div class="heatmap-label"></div>';
    dayLabels.forEach(day => {
        html += `<div class="heatmap-header">${day}</div>`;
    });

    // Data rows (hour label + cells)
    for (let hour = 0; hour < 24; hour++) {
        // Hour label (show every 3 hours)
        const hourLabel = hour % 3 === 0 ? `${hour.toString().padStart(2, '0')}:00` : '';
        html += `<div class="heatmap-label">${hourLabel}</div>`;

        // Day cells
        dayOrder.forEach((dayIdx, i) => {
            const count = matrix[hour][dayIdx];
            const intensity = getIntensity(count);
            const isWorkHours = hour >= 8 && hour < 17;
            const isWeekday = i < 5;
            const tooltip = `${dayLabels[i]} ${hour}:00 - ${count} commit${count !== 1 ? 's' : ''}`;

            html += `<div class="heatmap-cell heatmap-${intensity}" title="${tooltip}">${count || ''}</div>`;
        });
    }

    document.getElementById('heatmap').innerHTML = html;
}

/**
 * Weekly heatmap for Executive view
 * Shows a simplified week-by-week view instead of hourly detail
 */
function renderWeeklyHeatmap(commits) {
    // Group commits by week
    const byWeek = {};
    commits.forEach(commit => {
        if (!commit.timestamp) return;
        const date = new Date(commit.timestamp);
        // Get ISO week start (Monday)
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        const weekKey = weekStart.toISOString().substring(0, 10);
        byWeek[weekKey] = (byWeek[weekKey] || 0) + 1;
    });

    const weeks = Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0]));
    const maxCount = Math.max(...weeks.map(w => w[1]), 1);

    const getIntensity = (count) => {
        if (count === 0) return 0;
        const ratio = count / maxCount;
        if (ratio <= 0.25) return 1;
        if (ratio <= 0.5) return 2;
        if (ratio <= 0.75) return 3;
        return 4;
    };

    // Build a grid of weeks (similar to GitHub contribution graph)
    let html = '<div class="weekly-heatmap">';
    html += '<p class="text-xs text-themed-tertiary mb-2">Weekly commit activity (most recent weeks)</p>';
    html += '<div class="flex flex-wrap gap-1">';

    // Show last 26 weeks (half year)
    const recentWeeks = weeks.slice(-26);
    recentWeeks.forEach(([weekKey, count]) => {
        const intensity = getIntensity(count);
        const weekDate = new Date(weekKey);
        const weekLabel = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        html += `<div class="heatmap-cell heatmap-${intensity}" style="width: 16px; height: 16px;" title="Week of ${weekLabel}: ${count} commits">${count > 9 ? '' : count || ''}</div>`;
    });

    html += '</div>';

    // Summary stats
    const totalWeeks = recentWeeks.length;
    const totalCommits = recentWeeks.reduce((sum, [_, c]) => sum + c, 0);
    const avgPerWeek = totalWeeks > 0 ? Math.round(totalCommits / totalWeeks) : 0;
    html += `<p class="text-xs text-themed-tertiary mt-2">${totalCommits} commits over ${totalWeeks} weeks (avg ${avgPerWeek}/week)</p>`;
    html += '</div>';

    document.getElementById('heatmap').innerHTML = html;
}

/**
 * Daily heatmap for Management view
 * Shows day-of-week distribution without hourly breakdown
 */
function renderDailyHeatmap(commits) {
    // Aggregate by day of week
    const byDay = new Array(7).fill(0);
    commits.forEach(commit => {
        const { dayOfWeek } = getCommitDateTime(commit);
        byDay[dayOfWeek]++;
    });

    // Reorder to Monday-first
    const dayOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
    const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const maxCount = Math.max(...byDay, 1);

    const getIntensity = (count) => {
        if (count === 0) return 0;
        const ratio = count / maxCount;
        if (ratio <= 0.25) return 1;
        if (ratio <= 0.5) return 2;
        if (ratio <= 0.75) return 3;
        return 4;
    };

    let html = '<div class="daily-heatmap">';
    html += '<p class="text-xs text-themed-tertiary mb-3">Commits by day of week</p>';
    html += '<div class="space-y-2">';

    dayOrder.forEach((dayIdx, i) => {
        const count = byDay[dayIdx];
        const intensity = getIntensity(count);
        const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
        const isWeekend = i >= 5;

        html += `
                    <div class="flex items-center gap-3">
                        <span class="text-sm text-themed-secondary w-24">${dayLabels[i]}</span>
                        <div class="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-4">
                            <div class="h-4 rounded-full heatmap-${intensity}" style="width: ${pct}%;"></div>
                        </div>
                        <span class="text-sm text-themed-tertiary w-16 text-right">${count} commits</span>
                    </div>
                `;
    });

    html += '</div>';

    // Weekday vs weekend summary
    const weekdayCommits = dayOrder.slice(0, 5).reduce((sum, idx) => sum + byDay[idx], 0);
    const weekendCommits = dayOrder.slice(5).reduce((sum, idx) => sum + byDay[idx], 0);
    const weekendPct = commits.length > 0 ? Math.round((weekendCommits / commits.length) * 100) : 0;

    html += `<p class="text-xs text-themed-tertiary mt-3">Weekday: ${weekdayCommits} | Weekend: ${weekendCommits} (${weekendPct}%)</p>`;
    html += '</div>';

    document.getElementById('heatmap').innerHTML = html;
}

export {
    renderActivityTimeline,
    renderCodeChangesTimeline,
    renderHeatmap,
    renderWeeklyHeatmap,
    renderDailyHeatmap,
    aggregateByWeekPeriod,
    aggregateByDayPeriod
};
