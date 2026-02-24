import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import {
    getAuthorEmail, getAuthorName, getCommitDateTime, DAY_NAMES_SHORT
} from '../utils.js';
import { accentColor, mutedColor } from '../chartColors.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';

function getHeatmapLevel(count, maxCount) {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
}

export default function TimingTab() {
    const { state, filteredCommits, viewConfig, isMobile } = useApp();

    // Build heatmap data based on view level
    const heatmapContent = useMemo(() => {
        const commits = filteredCommits;
        const timing = viewConfig.timing;

        if (timing === 'week') {
            // Executive view: weekly heatmap
            const byWeek = {};
            commits.forEach(commit => {
                if (!commit.timestamp) return;
                const date = new Date(commit.timestamp);
                const weekStart = new Date(date);
                weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7));
                const weekKey = weekStart.toISOString().substring(0, 10);
                byWeek[weekKey] = (byWeek[weekKey] || 0) + 1;
            });

            const weeks = Object.entries(byWeek).sort((a, b) => a[0].localeCompare(b[0]));
            const maxCount = Math.max(...weeks.map(w => w[1]), 1);
            const recentWeeks = weeks.slice(-26);
            const totalCommits = recentWeeks.reduce((sum, [, c]) => sum + c, 0);
            const avgPerWeek = recentWeeks.length > 0 ? Math.round(totalCommits / recentWeeks.length) : 0;

            return {
                type: 'weekly',
                weeks: recentWeeks,
                maxCount,
                totalCommits,
                totalWeeks: recentWeeks.length,
                avgPerWeek,
            };
        } else if (timing === 'day') {
            // Management view: daily heatmap
            const byDay = new Array(7).fill(0);
            commits.forEach(commit => {
                const { dayOfWeek } = getCommitDateTime(commit);
                byDay[dayOfWeek]++;
            });

            const dayOrder = [1, 2, 3, 4, 5, 6, 0];
            const dayLabels = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
            const maxCount = Math.max(...byDay, 1);

            const weekdayCommits = dayOrder.slice(0, 5).reduce((sum, idx) => sum + byDay[idx], 0);
            const weekendCommits = dayOrder.slice(5).reduce((sum, idx) => sum + byDay[idx], 0);
            const weekendPct = commits.length > 0 ? Math.round((weekendCommits / commits.length) * 100) : 0;

            return {
                type: 'daily',
                byDay,
                dayOrder,
                dayLabels,
                maxCount,
                weekdayCommits,
                weekendCommits,
                weekendPct,
            };
        } else {
            // Developer view: full 24x7 hourly heatmap
            const matrix = Array.from({ length: 24 }, () => new Array(7).fill(0));
            commits.forEach(commit => {
                const { hour, dayOfWeek } = getCommitDateTime(commit);
                matrix[hour][dayOfWeek]++;
            });
            const maxCount = Math.max(...matrix.flat(), 1);
            const dayOrder = [1, 2, 3, 4, 5, 6, 0];
            const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

            return {
                type: 'hourly',
                matrix,
                maxCount,
                dayOrder,
                dayLabels,
            };
        }
    }, [filteredCommits, viewConfig]);

    // Hourly distribution chart
    const hourChartData = useMemo(() => {
        if (viewConfig.timing !== 'hour') return null;

        const byHour = new Array(24).fill(0);
        filteredCommits.forEach(commit => {
            const { hour } = getCommitDateTime(commit);
            byHour[hour]++;
        });

        const hourLabels = Array.from({ length: 24 }, (_, i) =>
            i.toString().padStart(2, '0') + ':00'
        );

        const mobile = isMobile;
        return {
            data: {
                labels: hourLabels,
                datasets: [{
                    label: 'Commits',
                    data: byHour,
                    backgroundColor: byHour.map((_, i) =>
                        (i >= state.workHourStart && i < state.workHourEnd) ? accentColor : mutedColor
                    ),
                    borderRadius: 2,
                }],
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
                            },
                        },
                    },
                },
                scales: {
                    x: {
                        ticks: {
                            maxRotation: mobile ? 60 : 45,
                            font: { size: mobile ? 10 : 12 },
                            callback: function (value, index) {
                                const step = mobile ? 4 : 3;
                                return index % step === 0 ? this.getLabelForValue(value) : '';
                            },
                        },
                    },
                    y: { beginAtZero: true, ticks: { font: { size: mobile ? 10 : 12 } } },
                },
            },
        };
    }, [filteredCommits, viewConfig, state.workHourStart, state.workHourEnd, isMobile]);

    // Daily distribution chart
    const dayChartData = useMemo(() => {
        const byDay = new Array(7).fill(0);
        filteredCommits.forEach(commit => {
            const { dayOfWeek } = getCommitDateTime(commit);
            byDay[dayOfWeek]++;
        });

        const mondayFirstOrder = [1, 2, 3, 4, 5, 6, 0];
        const dayLabels = mondayFirstOrder.map(i => DAY_NAMES_SHORT[i]);
        const dayData = mondayFirstOrder.map(i => byDay[i]);

        const mobile = isMobile;
        return {
            data: {
                labels: dayLabels,
                datasets: [{
                    label: 'Commits',
                    data: dayData,
                    backgroundColor: dayData.map((_, i) =>
                        (i < 5) ? accentColor : mutedColor
                    ),
                    borderRadius: 2,
                }],
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
                            },
                        },
                    },
                },
                scales: {
                    x: { ticks: { font: { size: mobile ? 10 : 12 } } },
                    y: { beginAtZero: true, ticks: { font: { size: mobile ? 10 : 12 } } },
                },
            },
        };
    }, [filteredCommits, isMobile]);

    // Developer patterns
    const developerPatterns = useMemo(() => {
        if (viewConfig.timing !== 'hour') return [];

        const authorPatterns = {};
        filteredCommits.forEach(commit => {
            const email = getAuthorEmail(commit);
            const name = getAuthorName(commit);
            const { hour, dayOfWeek } = getCommitDateTime(commit);

            if (!authorPatterns[email]) {
                authorPatterns[email] = {
                    name, email,
                    commitCount: 0,
                    byHour: new Array(24).fill(0),
                    byDay: new Array(7).fill(0),
                    afterHours: 0,
                    weekend: 0,
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

        return Object.values(authorPatterns)
            .sort((a, b) => b.commitCount - a.commitCount)
            .slice(0, 6)
            .map(author => {
                const peakHour = author.byHour.indexOf(Math.max(...author.byHour));
                const peakDayIdx = author.byDay.indexOf(Math.max(...author.byDay));
                const peakDayLabel = DAY_NAMES_SHORT[peakDayIdx];
                const afterHoursPct = Math.round((author.afterHours / author.commitCount) * 100);
                const weekendPct = Math.round((author.weekend / author.commitCount) * 100);
                const workHoursCommits = author.byHour
                    .slice(state.workHourStart, state.workHourEnd)
                    .reduce((a, b) => a + b, 0);
                const workHoursPct = Math.round((workHoursCommits / author.commitCount) * 100);

                return {
                    name: author.name,
                    commitCount: author.commitCount,
                    peakHour,
                    peakDayLabel,
                    workHoursPct,
                    weekendPct,
                };
            });
    }, [filteredCommits, viewConfig, state.workHourStart, state.workHourEnd]);

    // Render heatmap based on type
    const renderHeatmap = () => {
        if (heatmapContent.type === 'weekly') {
            const { weeks, maxCount, totalCommits, totalWeeks, avgPerWeek } = heatmapContent;
            return (
                <div className="weekly-heatmap">
                    <p className="text-xs text-themed-tertiary mb-2">Weekly commit activity (most recent weeks)</p>
                    <div className="flex flex-wrap gap-1">
                        {weeks.map(([weekKey, count]) => {
                            const level = getHeatmapLevel(count, maxCount);
                            const weekDate = new Date(weekKey);
                            const weekLabel = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                            return (
                                <div
                                    key={weekKey}
                                    className={`heatmap-cell heatmap-${level}`}
                                    style={{ width: '16px', height: '16px' }}
                                    data-tooltip={`Week of ${weekLabel}: ${count} commits`}
                                >
                                    {count > 9 ? '' : count || ''}
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs text-themed-tertiary mt-2">
                        {totalCommits} commits over {totalWeeks} weeks (avg {avgPerWeek}/week)
                    </p>
                </div>
            );
        } else if (heatmapContent.type === 'daily') {
            const { byDay, dayOrder, dayLabels, maxCount, weekdayCommits, weekendCommits, weekendPct } = heatmapContent;
            return (
                <div className="daily-heatmap">
                    <p className="text-xs text-themed-tertiary mb-3">Commits by day of week</p>
                    <div className="space-y-2">
                        {dayOrder.map((dayIdx, i) => {
                            const count = byDay[dayIdx];
                            const level = getHeatmapLevel(count, maxCount);
                            const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                            return (
                                <div key={dayIdx} className="flex items-center gap-3">
                                    <span className="text-sm text-themed-secondary w-24">{dayLabels[i]}</span>
                                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-4">
                                        <div
                                            className={`h-4 rounded-full heatmap-${level}`}
                                            style={{ width: `${pct}%` }}
                                        />
                                    </div>
                                    <span className="text-sm text-themed-tertiary w-16 text-right">{count} commits</span>
                                </div>
                            );
                        })}
                    </div>
                    <p className="text-xs text-themed-tertiary mt-3">
                        Weekday: {weekdayCommits} | Weekend: {weekendCommits} ({weekendPct}%)
                    </p>
                </div>
            );
        } else {
            // Developer view: full 24x7 hourly heatmap
            const { matrix, maxCount, dayOrder, dayLabels } = heatmapContent;
            return (
                <div className="heatmap-grid">
                    {/* Header row */}
                    <div className="heatmap-label"></div>
                    {dayLabels.map(d => (
                        <div key={d} className="heatmap-header">{d}</div>
                    ))}

                    {/* Data rows */}
                    {Array.from({ length: 24 }, (_, hour) => (
                        <React.Fragment key={hour}>
                            <div className="heatmap-label">
                                {hour % 3 === 0 ? `${hour.toString().padStart(2, '0')}:00` : ''}
                            </div>
                            {dayOrder.map((dayIdx, i) => {
                                const count = matrix[hour][dayIdx];
                                const level = getHeatmapLevel(count, maxCount);
                                const tooltip = `${dayLabels[i]} ${hour}:00 - ${count} commit${count !== 1 ? 's' : ''}`;
                                return (
                                    <div
                                        key={dayIdx}
                                        className={`heatmap-cell heatmap-${level}`}
                                        data-tooltip={tooltip}
                                    >
                                        {count || ''}
                                    </div>
                                );
                            })}
                        </React.Fragment>
                    ))}
                </div>
            );
        }
    };

    const chartHeight = isMobile ? '200px' : '250px';

    // Requirement: Order sections from most interesting to least interesting
    // Approach: Hour chart first (reveals peak hours — immediately engaging), then heatmap
    //   (rich visual), then per-person patterns (fascinating detail), then day chart last
    //   (least surprising — it's always weekdays)
    // Alternatives:
    //   - Heatmap first: Rejected — dense grid is harder to parse than a simple bar chart
    //   - Day chart higher: Rejected — "busiest day is Tuesday" is the least surprising insight
    return (
        <div className="space-y-6">
            {/* Hourly Distribution — most interesting: reveals peak hours, early birds, night owls */}
            {viewConfig.timing === 'hour' && hourChartData && (
                <CollapsibleSection title="Commits by Hour" subtitle="Which hours are busiest?">
                    <div data-embed-id="hourly-distribution" style={{ height: chartHeight }}>
                        <Bar data={hourChartData.data} options={hourChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Activity Heatmap — engaging visual pattern */}
            <CollapsibleSection title="When Work Happens" subtitle="Commit activity patterns">
                <div data-embed-id="activity-heatmap">
                    {renderHeatmap()}
                </div>
            </CollapsibleSection>

            {/* Developer Patterns — fascinating per-person detail, collapsed on mobile */}
            {viewConfig.timing === 'hour' && developerPatterns.length > 0 && (
                <CollapsibleSection title="Developer Patterns" subtitle="Individual work habits" defaultExpanded={!isMobile}>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {developerPatterns.map((author) => (
                            <div key={author.name} className="p-3 bg-themed-tertiary rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-medium text-themed-primary">{author.name}</span>
                                    <span className="text-xs text-themed-tertiary">{author.commitCount} commits</span>
                                </div>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                                    <div className="p-2 bg-themed-secondary rounded">
                                        <span className="text-themed-tertiary">Peak Hour</span>
                                        <p className="font-semibold text-themed-primary">
                                            {author.peakHour.toString().padStart(2, '0')}:00
                                        </p>
                                    </div>
                                    <div className="p-2 bg-themed-secondary rounded">
                                        <span className="text-themed-tertiary">Peak Day</span>
                                        <p className="font-semibold text-themed-primary">{author.peakDayLabel}</p>
                                    </div>
                                    <div className="p-2 bg-themed-secondary rounded">
                                        <span className="text-themed-tertiary">Work Hours</span>
                                        <p className={`font-semibold ${
                                            author.workHoursPct >= 70 ? 'text-green-600'
                                                : author.workHoursPct >= 50 ? 'text-amber-600'
                                                    : 'text-red-600'
                                        }`}>
                                            {author.workHoursPct}%
                                        </p>
                                    </div>
                                    <div className="p-2 bg-themed-secondary rounded">
                                        <span className="text-themed-tertiary">Weekends</span>
                                        <p className={`font-semibold ${
                                            author.weekendPct <= 10 ? 'text-green-600'
                                                : author.weekendPct <= 25 ? 'text-amber-600'
                                                    : 'text-red-600'
                                        }`}>
                                            {author.weekendPct}%
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </CollapsibleSection>
            )}

            {/* Daily Distribution — least surprising: it's always weekdays */}
            <CollapsibleSection title="Commits by Day" subtitle="Which days are busiest?">
                <div data-embed-id="daily-distribution" style={{ height: chartHeight }}>
                    <Bar data={dayChartData.data} options={dayChartData.options} />
                </div>
            </CollapsibleSection>
        </div>
    );
}
