import React, { useEffect } from 'react';
import { useApp } from '../AppContext.jsx';

const VIEW_LEVEL_DESCRIPTIONS = {
    executive: 'High-level summary, aggregated metrics',
    management: 'Per-repo groupings, team overview',
    developer: 'Full detail, individual commits',
};

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

    function handleClose() {
        dispatch({ type: 'CLOSE_SETTINGS_PANE' });
    }

    // Escape key to close
    useEffect(() => {
        if (!state.settingsPaneOpen) return;
        function handleKey(e) {
            if (e.key === 'Escape') handleClose();
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [state.settingsPaneOpen]);

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
            />
            <div
                className={`settings-pane ${state.settingsPaneOpen ? 'open' : ''}`}
                role="dialog"
                aria-modal={state.settingsPaneOpen}
                aria-label="Settings"
            >
                <div className="settings-pane-header">
                    <span className="settings-pane-title">Settings</span>
                    <button className="settings-pane-close" onClick={handleClose} aria-label="Close settings">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="settings-pane-content">
                    {/* View Level */}
                    <div className="settings-section" role="radiogroup" aria-label="View level">
                        <div className="settings-section-title">View Level</div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {['executive', 'management', 'developer'].map(level => {
                                const isActive = state.currentViewLevel === level;
                                return (
                                    <div
                                        key={level}
                                        className={`settings-toggle ${isActive ? 'active' : ''}`}
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
                                            <div className="settings-toggle-label">{capitalize(level)}</div>
                                            <div className="settings-toggle-hint">{VIEW_LEVEL_DESCRIPTIONS[level]}</div>
                                        </div>
                                        {isActive && (
                                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--color-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <polyline points="20 6 9 17 4 12" />
                                            </svg>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Timezone */}
                    <div className="settings-section">
                        <div className="settings-section-title">Timezone</div>
                        <div
                            className={`settings-toggle ${state.useUTC ? 'active' : ''}`}
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
                                <div className="settings-toggle-label">Use UTC</div>
                                <div className="settings-toggle-hint">Show times in UTC instead of local</div>
                            </div>
                            <div className="settings-toggle-switch" />
                        </div>
                    </div>

                    {/* Work Hours */}
                    <div className="settings-section">
                        <div className="settings-section-title">Work Hours</div>
                        <div className="settings-row">
                            <div className="settings-group">
                                <label>Start</label>
                                <select
                                    className="filter-select"
                                    value={state.workHourStart}
                                    onChange={handleWorkHourStart}
                                >
                                    {hours.map(h => (
                                        <option key={h} value={h}>{formatHour(h)}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="settings-group">
                                <label>End</label>
                                <select
                                    className="filter-select"
                                    value={state.workHourEnd}
                                    onChange={handleWorkHourEnd}
                                >
                                    {hours.map(h => (
                                        <option key={h} value={h}>{formatHour(h)}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                        <div className="settings-hint" style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '8px' }}>
                            Commits outside these hours are flagged as after-hours
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
