import React from 'react';

// Requirement: Render the activity heatmap in three flavours
//   (weekly bar grid, daily bar list, and full 24×7 hourly grid).
//   Extracted from sections/Timing.jsx 2026-04-15 to keep the parent
//   under the 500-line component soft-limit (CLAUDE.md "Code
//   Organization"). The parent still owns data shaping inside
//   `heatmapContent` and just hands the resulting object to this
//   component.
// Approach: One presentational component, three render branches keyed
//   on `heatmapContent.type`. No state, no effects, no data fetching —
//   parent does all of that.
// Alternatives:
//   - Three separate components (TimingHeatmapWeekly / Daily / Hourly):
//     Rejected — each branch is short and they share `getHeatmapLevel`
//     + `HEATMAP_LEVEL_CLASSES`. Splitting further fragments the code
//     for marginal benefit and forces parent to type-discriminate
//     before picking the right component.
//   - Inline render function inside Timing.jsx: previous state, the
//     reason Timing.jsx was 573 lines.

function getHeatmapLevel(count, maxCount) {
    if (count === 0) return 0;
    const ratio = count / maxCount;
    if (ratio <= 0.25) return 1;
    if (ratio <= 0.5) return 2;
    if (ratio <= 0.75) return 3;
    return 4;
}

// Vanilla-DaisyUI heatmap intensity palette: each level maps to a
// stock Tailwind utility that tracks the active DaisyUI theme's primary
// colour. Tailwind v4's content scanner sees these literal strings in
// the array and generates the utility rules without needing a safelist.
// Previously `.heatmap-0..4` custom classes in styles.css — removed
// 2026-04-14 in the vanilla-DaisyUI sweep.
const HEATMAP_LEVEL_CLASSES = [
    'bg-base-300',    // level 0 — no activity
    'bg-primary/20',  // level 1
    'bg-primary/40',  // level 2
    'bg-primary/60',  // level 3
    'bg-primary',     // level 4 — max activity
];

function WeeklyHeatmap({ weeks, maxCount, totalCommits, totalWeeks, avgPerWeek }) {
    return (
        <div>
            <p className="text-xs text-base-content/60 mb-2">Weekly commit activity (most recent weeks)</p>
            <div className="flex flex-wrap gap-1">
                {weeks.map(([weekKey, count]) => {
                    const level = getHeatmapLevel(count, maxCount);
                    const weekDate = new Date(weekKey);
                    const weekLabel = weekDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    return (
                        <div
                            key={weekKey}
                            className={`w-4 h-4 min-w-4 min-h-4 rounded-sm cursor-default transition-transform duration-100 hover:scale-110 hover:z-10 ${HEATMAP_LEVEL_CLASSES[level]}`}
                            data-tooltip={`Week of ${weekLabel}: ${count} commits`}
                        />
                    );
                })}
            </div>
            <p className="text-xs text-base-content/60 mt-2">
                {totalCommits} commits over {totalWeeks} weeks (avg {avgPerWeek}/week)
            </p>
        </div>
    );
}

function DailyHeatmap({ byDay, dayOrder, dayLabels, maxCount, weekdayCommits, weekendCommits, weekendPct }) {
    return (
        <div>
            <p className="text-xs text-base-content/60 mb-3">Commits by day of week</p>
            <div className="space-y-2">
                {dayOrder.map((dayIdx, i) => {
                    const count = byDay[dayIdx];
                    const level = getHeatmapLevel(count, maxCount);
                    const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
                    return (
                        <div key={dayIdx} className="flex items-center gap-3">
                            <span className="text-sm text-base-content/80 w-24">{dayLabels[i]}</span>
                            <div className="flex-1 bg-base-300 rounded-full h-4">
                                <div
                                    className={`h-4 rounded-full ${HEATMAP_LEVEL_CLASSES[level]}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            <span className="text-sm text-base-content/60 w-16 text-right">{count} commits</span>
                        </div>
                    );
                })}
            </div>
            <p className="text-xs text-base-content/60 mt-3">
                Weekday: {weekdayCommits} | Weekend: {weekendCommits} ({weekendPct}%)
            </p>
        </div>
    );
}

// Developer view: full 24×7 hourly heatmap.
//
// Layout: single CSS grid with `auto repeat(7, 1fr)` — label
// column is `auto` (fits text content), day columns are equal
// 1fr width. Each hour row contains 1 label cell + 7 day
// cells as siblings in the same grid, so row heights are
// shared automatically. Labels and data always align.
//
// Previous attempts:
//   - Flex wrapper + separate `grid-cols-7` for day cells
//     (2026-04-14 vanilla-sweep first pass): Broke row
//     alignment because label column and data grid had
//     independent cell sizing. Labels were `aspect-square`
//     at w-12 → 48px, while data cells at flex-1 were
//     ~91px on desktop. Rows didn't line up.
//   - `grid-cols-8` with label as column 1: Makes label
//     column 1/8 of grid width — too wide on desktop, wastes
//     horizontal space, labels look lost in their cell.
//
// `grid-cols-[auto_repeat(7,1fr)]` is one of the documented
// arbitrary bracket exceptions in the vanilla-DaisyUI policy.
// Grid templates with mixed auto + repeat() aren't expressible
// as stock Tailwind utilities, and row alignment is a
// functional data-correctness requirement (not cosmetic).
// Documented in CLAUDE.md "Frontend: Styles and Scripts" as a
// permitted exception.
function HourlyHeatmap({ matrix, maxCount, dayOrder, dayLabels }) {
    return (
        <div className="grid grid-cols-[auto_repeat(7,1fr)] gap-0.5 min-w-70 sm:min-w-100">
            {/* Header row: empty top-left corner + 7 day labels */}
            <div className="h-4 sm:h-5" />
            {dayLabels.map(d => (
                <div key={d} className="flex items-center justify-center text-xs font-medium text-base-content/80 h-4 sm:h-5">{d}</div>
            ))}
            {/* Data rows: for each hour, 1 label cell + 7 day cells */}
            {Array.from({ length: 24 }, (_, hour) => (
                <React.Fragment key={hour}>
                    <div className="flex items-center justify-end pr-1 sm:pr-2 text-xs text-base-content/60 whitespace-nowrap">
                        {hour % 3 === 0 ? `${hour.toString().padStart(2, '0')}:00` : ''}
                    </div>
                    {dayOrder.map((dayIdx, i) => {
                        const count = matrix[hour][dayIdx];
                        const level = getHeatmapLevel(count, maxCount);
                        const tooltip = `${dayLabels[i]} ${hour}:00 - ${count} commit${count !== 1 ? 's' : ''}`;
                        return (
                            <div
                                key={`${hour}-${dayIdx}`}
                                className={`aspect-square min-w-5 min-h-5 sm:min-w-7 sm:min-h-7 rounded-sm cursor-default transition-transform duration-100 hover:scale-110 hover:z-10 ${HEATMAP_LEVEL_CLASSES[level]}`}
                                data-tooltip={tooltip}
                            />
                        );
                    })}
                </React.Fragment>
            ))}
        </div>
    );
}

export default function TimingHeatmap({ heatmapContent }) {
    if (heatmapContent.type === 'weekly') {
        return <WeeklyHeatmap {...heatmapContent} />;
    }
    if (heatmapContent.type === 'daily') {
        return <DailyHeatmap {...heatmapContent} />;
    }
    return <HourlyHeatmap {...heatmapContent} />;
}
