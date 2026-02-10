import { state, getViewConfig, isMobile } from '../state.js';
import { escapeHtml, getAuthorEmail, getAuthorName, getCommitDateTime, DAY_NAMES_SHORT } from '../utils.js';
import { getFilteredCommits } from '../filters.js';
import { renderHeatmap } from '../charts.js';

export function renderTiming() {
    const commits = getFilteredCommits();
    const config = getViewConfig();

    // Render the heatmap (handles its own granularity)
    renderHeatmap();

    // Aggregate commits by hour (0-23)
    const byHour = new Array(24).fill(0);
    // Aggregate commits by day of week (0=Sun, 6=Sat)
    const byDay = new Array(7).fill(0);

    commits.forEach(commit => {
        const { hour, dayOfWeek } = getCommitDateTime(commit);
        byHour[hour]++;
        byDay[dayOfWeek]++;
    });

    // Hour chart - only show for developer view (hourly granularity)
    const hourChartContainer = document.getElementById('hour-chart')?.parentElement?.parentElement;
    if (hourChartContainer) {
        if (config.timing === 'hour') {
            hourChartContainer.style.display = '';
        } else {
            hourChartContainer.style.display = 'none';
        }
    }

    // Hour Chart
    const hourLabels = Array.from({ length: 24 }, (_, i) =>
        i.toString().padStart(2, '0') + ':00'
    );

    const mobileHr = isMobile();
    if (state.charts.hour) state.charts.hour.destroy();
    state.charts.hour = new Chart(document.getElementById('hour-chart'), {
        type: 'bar',
        data: {
            labels: hourLabels,
            datasets: [{
                label: 'Commits',
                data: byHour,
                backgroundColor: byHour.map((_, i) =>
                    (i >= state.workHourStart && i < state.workHourEnd) ? '#2D68FF' : '#94a3b8'
                ),
                borderRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: (ctx) => {
                            const hour = ctx.dataIndex;
                            if (hour >= state.workHourStart && hour < state.workHourEnd) return 'Work hours';
                            return 'After hours';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: mobileHr ? 60 : 45,
                        font: { size: mobileHr ? 9 : 12 },
                        callback: function(value, index) {
                            const step = mobileHr ? 4 : 3;
                            return index % step === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: { beginAtZero: true, ticks: { font: { size: mobileHr ? 9 : 12 } } }
            }
        }
    });

    // Day of Week Chart - reorder to start with Monday
    const mondayFirstOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
    const dayLabels = mondayFirstOrder.map(i => DAY_NAMES_SHORT[i]);
    const dayData = mondayFirstOrder.map(i => byDay[i]);

    const mobileDay = isMobile();
    if (state.charts.day) state.charts.day.destroy();
    state.charts.day = new Chart(document.getElementById('day-chart'), {
        type: 'bar',
        data: {
            labels: dayLabels,
            datasets: [{
                label: 'Commits',
                data: dayData,
                backgroundColor: dayData.map((_, i) =>
                    (i < 5) ? '#2D68FF' : '#94a3b8'  // Mon-Fri blue, Sat-Sun gray
                ),
                borderRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: (ctx) => {
                            return ctx.dataIndex < 5 ? 'Weekday' : 'Weekend';
                        }
                    }
                }
            },
            scales: {
                x: { ticks: { font: { size: mobileDay ? 9 : 12 } } },
                y: { beginAtZero: true, ticks: { font: { size: mobileDay ? 9 : 12 } } }
            }
        }
    });

    // Render developer activity patterns - only for developer view
    const devPatternsContainer = document.querySelector('[data-section="developer-patterns"]');
    if (devPatternsContainer) {
        if (config.timing === 'hour') {
            devPatternsContainer.style.display = '';
            renderDeveloperPatterns();
        } else {
            devPatternsContainer.style.display = 'none';
        }
    }
}

export function renderDeveloperPatterns() {
    const commits = getFilteredCommits();

    // Get per-author timing data
    const authorPatterns = {};

    commits.forEach(commit => {
        const email = getAuthorEmail(commit);
        const name = getAuthorName(commit);
        const { hour, dayOfWeek } = getCommitDateTime(commit);

        if (!authorPatterns[email]) {
            authorPatterns[email] = {
                name,
                email,
                commitCount: 0,
                byHour: new Array(24).fill(0),
                byDay: new Array(7).fill(0),
                afterHours: 0,
                weekend: 0
            };
        }

        authorPatterns[email].commitCount++;
        authorPatterns[email].byHour[hour]++;
        authorPatterns[email].byDay[dayOfWeek]++;

        if (hour < state.workHourStart || hour >= state.workHourEnd) {
            authorPatterns[email].afterHours++;
        }
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            authorPatterns[email].weekend++;
        }
    });

    // Sort by commit count
    const sorted = Object.values(authorPatterns).sort((a, b) => b.commitCount - a.commitCount);

    // Render top contributors
    const html = sorted.slice(0, 6).map(author => {
        // Find peak hour
        const peakHour = author.byHour.indexOf(Math.max(...author.byHour));
        // Find peak day
        const peakDayIdx = author.byDay.indexOf(Math.max(...author.byDay));
        const peakDayLabel = DAY_NAMES_SHORT[peakDayIdx];

        // After hours percentage
        const afterHoursPct = Math.round((author.afterHours / author.commitCount) * 100);
        const weekendPct = Math.round((author.weekend / author.commitCount) * 100);

        // Mini sparkline for hours (simplified - just show work vs after hours)
        const workHoursCommits = author.byHour.slice(state.workHourStart, state.workHourEnd).reduce((a, b) => a + b, 0);
        const workHoursPct = Math.round((workHoursCommits / author.commitCount) * 100);

        return `
            <div class="p-3 bg-themed-tertiary rounded-lg">
                <div class="flex items-center justify-between mb-2">
                    <span class="font-medium text-themed-primary">${escapeHtml(author.name)}</span>
                    <span class="text-xs text-themed-tertiary">${author.commitCount} commits</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div class="p-2 bg-themed-secondary rounded">
                        <span class="text-themed-tertiary">Peak Hour</span>
                        <p class="font-semibold text-themed-primary">${peakHour.toString().padStart(2, '0')}:00</p>
                    </div>
                    <div class="p-2 bg-themed-secondary rounded">
                        <span class="text-themed-tertiary">Peak Day</span>
                        <p class="font-semibold text-themed-primary">${peakDayLabel}</p>
                    </div>
                    <div class="p-2 bg-themed-secondary rounded">
                        <span class="text-themed-tertiary">Work Hours</span>
                        <p class="font-semibold ${workHoursPct >= 70 ? 'text-green-600' : workHoursPct >= 50 ? 'text-amber-600' : 'text-red-600'}">${workHoursPct}%</p>
                    </div>
                    <div class="p-2 bg-themed-secondary rounded">
                        <span class="text-themed-tertiary">Weekends</span>
                        <p class="font-semibold ${weekendPct <= 10 ? 'text-green-600' : weekendPct <= 25 ? 'text-amber-600' : 'text-red-600'}">${weekendPct}%</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('developer-patterns').innerHTML = html || '<p class="text-themed-tertiary">No contributor data</p>';
}
