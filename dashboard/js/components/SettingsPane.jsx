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
const SECTION_TITLE_CLASSES = 'text-[11px] font-semibold uppercase tracking-wider text-base-content/60 mb-3';
const TOGGLE_BASE_CLASSES = 'flex items-center justify-between p-3 bg-base-300 rounded-md cursor-pointer transition-colors hover:bg-base-300';
const TOGGLE_LABEL_CLASSES = 'text-[13px] font-medium text-base-content/80';
const TOGGLE_HINT_CLASSES = 'text-[11px] text-base-content/40 mt-0.5';

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

    function handleToggleUTC() {
        dispatch({ type: 'SET_USE_UTC', payload: !state.useUTC });
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
        <>
            <div
                className={`settings-pane-overlay ${state.settingsPaneOpen ? 'open' : ''}`}
                onClick={handleClose}
                role="presentation"
            />
            <div
                ref={trapRef}
                className={`settings-pane ${state.settingsPaneOpen ? 'open' : ''}`}
                role="dialog"
                aria-modal={state.settingsPaneOpen}
                aria-label="Settings"
            >
                {/* `settings-pane-header` is kept as a zero-style marker
                    class so the mobile `::before` pseudo drag-handle rule
                    in styles.css can still target it. All layout styles
                    are inline. */}
                <div className="settings-pane-header flex items-center justify-between px-6 py-4 border-b border-base-300 shrink-0 max-md:px-4 max-md:py-3 max-md:relative">
                    <span className="text-lg font-semibold text-base-content">Settings</span>
                    <button className="btn btn-sm btn-circle btn-ghost" onClick={handleClose} aria-label="Close settings">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 max-md:p-4">
                    {/* View Level */}
                    <div className="mb-6" role="radiogroup" aria-label="View level">
                        <div className={SECTION_TITLE_CLASSES}>View Level</div>
                        <div className="flex flex-col gap-2">
                            {['executive', 'management', 'developer'].map(level => {
                                const isActive = state.currentViewLevel === level;
                                return (
                                    <div
                                        key={level}
                                        className={TOGGLE_BASE_CLASSES}
                                        role="radio"
                                        aria-checked={isActive}
                                        tabIndex={0}
                                        onClick={() => handleViewLevel(level)}
                                        onKeyDown={(e) => {
                                            if (e.key === 'Enter' || e.key === ' ') {
                                                e.preventDefault();
                                                handleViewLevel(level);
                                            }
                                        }}
                                    >
                                        <div>
                                            <div className={TOGGLE_LABEL_CLASSES}>{capitalize(level)}</div>
                                            <div className={TOGGLE_HINT_CLASSES}>{VIEW_LEVEL_DESCRIPTIONS[level]}</div>
                                        </div>
                                        {isActive && (
                                            <svg className="w-5 h-5 shrink-0 text-primary" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Timezone */}
                    <div className="mb-6">
                        <div className={SECTION_TITLE_CLASSES}>Timezone</div>
                        <div
                            className={TOGGLE_BASE_CLASSES}
                            role="switch"
                            aria-checked={state.useUTC}
                            tabIndex={0}
                            onClick={handleToggleUTC}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault();
                                    handleToggleUTC();
                                }
                            }}
                        >
                            <div>
                                <div className={TOGGLE_LABEL_CLASSES}>Use UTC</div>
                                <div className={TOGGLE_HINT_CLASSES}>Show times in UTC instead of local</div>
                            </div>
                            {/* DaisyUI native `toggle` component — the parent
                                row owns role="switch" + keyboard handling, so
                                the checkbox is presentational (tabIndex=-1,
                                aria-hidden). readOnly silences React's
                                controlled-without-onChange warning; the
                                parent onClick mutates state.useUTC. */}
                            <input
                                type="checkbox"
                                className="toggle toggle-primary shrink-0"
                                checked={state.useUTC}
                                readOnly
                                tabIndex={-1}
                                aria-hidden="true"
                            />
                        </div>
                    </div>

                    {/* Work Hours */}
                    <div className="mb-6">
                        <div className={SECTION_TITLE_CLASSES}>Work Hours</div>
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label htmlFor="work-hour-start" className="block text-[13px] font-medium text-base-content/80 mb-1.5">Start</label>
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
                                <label htmlFor="work-hour-end" className="block text-[13px] font-medium text-base-content/80 mb-1.5">End</label>
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
                        <div className="text-[11px] text-base-content/40 mt-2">
                            Commits outside these hours are flagged as after-hours
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
