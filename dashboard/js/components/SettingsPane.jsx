import React, { useEffect } from 'react';
import { useApp } from '../AppContext.jsx';
import useFocusTrap from '../hooks/useFocusTrap.js';

const VIEW_LEVEL_DESCRIPTIONS = {
    executive: 'High-level summary, aggregated metrics',
    management: 'Per-repo groupings, team overview',
    developer: 'Full detail, individual commits',
};

// Shared Tailwind class strings for settings pane building blocks.
// Kept as JS constants instead of custom CSS classes per the 2026-04-13
// custom-CSS cleanup rule (no custom class unless the pattern needs
// CSS features Tailwind can't express). These strings are read by the
// JSX below; nothing else in the app consumes them.
//
// TOGGLE_ROW_CLASSES: Shared row layout for both the ViewLevel radio
// rows AND the UTC checkbox label — base surface is `bg-base-300`
// (lifted tile), hover applies a 5% `base-content` tint overlay for a
// theme-aware interactive feedback (the earlier migration wrote
// `hover:bg-base-300` which is a no-op on a `bg-base-300` base —
// silent regression caught in the 2026-04-14 post-migration audit).
const SECTION_TITLE_CLASSES = 'text-xs font-semibold uppercase tracking-wider text-base-content/60 mb-3';
const TOGGLE_ROW_CLASSES = 'flex items-center justify-between p-3 bg-base-300 rounded-md cursor-pointer transition-colors hover:bg-base-content/5';
const TOGGLE_LABEL_CLASSES = 'text-sm font-medium text-base-content/80';
const TOGGLE_HINT_CLASSES = 'text-xs text-base-content/40 mt-0.5';

function capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function formatHour(h) {
    if (h === 0) return '12:00 AM';
    if (h < 12) return `${h}:00 AM`;
    if (h === 12) return '12:00 PM';
    return `${h - 12}:00 PM`;
}

export default function SettingsPane() {
    const { state, dispatch } = useApp();
    const trapRef = useFocusTrap(state.settingsPaneOpen);

    function handleClose() {
        dispatch({ type: 'CLOSE_SETTINGS_PANE' });
    }

    // Escape key to close
    // Fix: Include dispatch in deps instead of handleClose to avoid stale closure.
    // dispatch is stable (from useReducer), so this effect only re-runs when pane opens/closes.
    useEffect(() => {
        if (!state.settingsPaneOpen) return;
        function handleKey(e) {
            if (e.key === 'Escape') dispatch({ type: 'CLOSE_SETTINGS_PANE' });
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [state.settingsPaneOpen, dispatch]);

    function handleViewLevel(level) {
        dispatch({ type: 'SET_VIEW_LEVEL', payload: level });
    }

    function handleToggleUTC(e) {
        // Native checkbox onChange provides the new value on e.target.checked.
        // Reading from the event (not the closure) matches the work-hour
        // select handlers and avoids any stale-closure surprise if React
        // ever batches multiple dispatches.
        dispatch({ type: 'SET_USE_UTC', payload: e.target.checked });
    }

    function handleWorkHourStart(e) {
        dispatch({
            type: 'SET_WORK_HOURS',
            payload: { start: parseInt(e.target.value, 10), end: state.workHourEnd },
        });
    }

    function handleWorkHourEnd(e) {
        dispatch({
            type: 'SET_WORK_HOURS',
            payload: { start: state.workHourStart, end: parseInt(e.target.value, 10) },
        });
    }

    const hours = Array.from({ length: 24 }, (_, i) => i);

    return (
        <div
            ref={trapRef}
            className="flex flex-col h-full w-full max-w-sm bg-base-200 border-l border-base-300"
            role="dialog"
            aria-modal={state.settingsPaneOpen}
            aria-label="Settings"
        >
            <div className="flex items-center justify-between px-6 py-4 border-b border-base-300 shrink-0">
                <span className="text-lg font-semibold text-base-content">Settings</span>
                <button className="btn btn-sm btn-circle btn-ghost" onClick={handleClose} aria-label="Close settings">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
                {/* View Level
                    Requirement: Three mutually-exclusive view modes (Executive,
                      Management, Developer). Accessible to keyboard + screen
                      readers per WAI-ARIA radiogroup pattern.
                    Approach: Native `<fieldset>` + `<legend>` + three
                      `<input type="radio">` + wrapping `<label>` per option.
                      HTML handles roving tabindex (Tab moves to the radio
                      group; arrow keys move between options), focus, ARIA
                      semantics ("1 of 3" announced once per group, not per
                      option), and form association — all for free.
                    Alternatives:
                      - `<div role="radiogroup">` + `<div role="radio" tabIndex={0}>`
                        per option (previous state, deleted 2026-04-15):
                        Rejected. Every radio had `tabIndex={0}` so Tab cycled
                        through all 3 individually; arrow-key navigation
                        wasn't implemented; screen readers announced "radio
                        button, 1 of 3" three times. Roving tabindex requires
                        manual focus management — way more code than the
                        native pattern.
                      - DaisyUI `radio` component on each option without
                        fieldset: Rejected. The `<fieldset>` + `<legend>`
                        wrapper is the proper a11y container for grouped
                        radios; without it the legend isn't associated with
                        the group. */}
                <fieldset className="mb-6">
                    <legend className={SECTION_TITLE_CLASSES}>View Level</legend>
                    <div className="flex flex-col gap-2">
                        {['executive', 'management', 'developer'].map(level => (
                            <label key={level} className={TOGGLE_ROW_CLASSES}>
                                <input
                                    type="radio"
                                    name="view-level"
                                    value={level}
                                    checked={state.currentViewLevel === level}
                                    onChange={() => handleViewLevel(level)}
                                    className="radio radio-primary shrink-0 order-2"
                                    aria-describedby={`view-level-${level}-desc`}
                                />
                                <div className="flex-1">
                                    <div className={TOGGLE_LABEL_CLASSES}>{capitalize(level)}</div>
                                    <div id={`view-level-${level}-desc`} className={TOGGLE_HINT_CLASSES}>
                                        {VIEW_LEVEL_DESCRIPTIONS[level]}
                                    </div>
                                </div>
                            </label>
                        ))}
                    </div>
                </fieldset>

                {/* Timezone
                    Requirement: Switch-style toggle for UTC vs local
                      timezone. Accessible to keyboard + screen readers.
                    Approach: Native `<input type="checkbox">` inside a
                      wrapping `<label>` so clicking anywhere on the row
                      toggles the checkbox through HTML's native label
                      association. The input owns all semantics (focus,
                      Space/Enter activation, role="checkbox"), so the
                      label is pure presentation with no ARIA duplication.
                      DaisyUI's `toggle toggle-primary` renders the pill
                      switch visual.
                    Alternatives:
                      - `<div role="switch">` + custom onClick/onKeyDown +
                        `readOnly` presentational checkbox: Rejected
                        2026-04-14. Duplicated semantics, `readOnly` is
                        a no-op on checkboxes per HTML spec (React only
                        accepts it to silence a warning), and direct
                        clicks on the checkbox caused a flicker race
                        where React reconciled back the native toggle.
                      - Hand-rolled `after:` pseudo thumb: Rejected —
                        reimplements what DaisyUI ships natively, and
                        hardcoded `after:bg-white` violated the "never
                        hardcode theme values" rule. */}
                <div className="mb-6">
                    <div className={SECTION_TITLE_CLASSES}>Timezone</div>
                    <label className={TOGGLE_ROW_CLASSES}>
                        <div>
                            <div className={TOGGLE_LABEL_CLASSES}>Use UTC</div>
                            <div className={TOGGLE_HINT_CLASSES}>Show times in UTC instead of local</div>
                        </div>
                        <input
                            type="checkbox"
                            className="toggle toggle-primary shrink-0"
                            checked={state.useUTC}
                            onChange={handleToggleUTC}
                            aria-label="Use UTC timezone"
                        />
                    </label>
                </div>

                {/* Work Hours */}
                <div className="mb-6">
                    <div className={SECTION_TITLE_CLASSES}>Work Hours</div>
                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label htmlFor="work-hour-start" className="block text-sm font-medium text-base-content/80 mb-1.5">Start</label>
                            <select
                                id="work-hour-start"
                                className="select select-sm w-full"
                                value={state.workHourStart}
                                onChange={handleWorkHourStart}
                            >
                                {hours.map(h => (
                                    <option key={h} value={h}>{formatHour(h)}</option>
                                ))}
                            </select>
                        </div>
                        <div className="flex-1">
                            <label htmlFor="work-hour-end" className="block text-sm font-medium text-base-content/80 mb-1.5">End</label>
                            <select
                                id="work-hour-end"
                                className="select select-sm w-full"
                                value={state.workHourEnd}
                                onChange={handleWorkHourEnd}
                            >
                                {hours.map(h => (
                                    <option key={h} value={h}>{formatHour(h)}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="text-xs text-base-content/40 mt-2">
                        Commits outside these hours are flagged as after-hours
                    </div>
                </div>
            </div>
        </div>
    );
}
