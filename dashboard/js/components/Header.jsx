import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../AppContext.jsx';

const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

export default function Header() {
    const { state, dispatch, activeFilterCount } = useApp();
    const [updateAvailable, setUpdateAvailable] = useState(false);

    const repoName = state.data?.metadata?.repo_name;
    const commitCount = state.data?.commits?.length || 0;

    let repoDisplay = '';
    if (repoName) {
        repoDisplay = Array.isArray(repoName) ? repoName.join(', ') : repoName;
    }

    const subtitle = repoDisplay
        ? `${repoDisplay} \u2014 ${commitCount.toLocaleString()} commits`
        : `${commitCount.toLocaleString()} commits`;

    // Listen for PWA events dispatched by pwa.js
    useEffect(() => {
        const handleUpdateAvailable = () => setUpdateAvailable(true);

        window.addEventListener('pwa-update-available', handleUpdateAvailable);

        return () => {
            window.removeEventListener('pwa-update-available', handleUpdateAvailable);
        };
    }, []);

    const handleInstall = useCallback(async () => {
        try {
            const { installPWA } = await import('../pwa.js');
            const prompted = await installPWA();
            if (!prompted) {
                // No native prompt — open settings for manual instructions
                dispatch({ type: 'TOGGLE_SETTINGS_PANE' });
            }
        } catch {
            // PWA module not available — show settings with manual instructions
            dispatch({ type: 'TOGGLE_SETTINGS_PANE' });
        }
    }, [dispatch]);

    const handleUpdate = useCallback(async () => {
        try {
            const { applyUpdate } = await import('../pwa.js');
            applyUpdate();
        } catch {
            // PWA module not available
        }
    }, []);

    return (
        <header className="dashboard-header px-4 md:px-8 py-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div>
                        <h1 className="text-2xl font-bold text-themed-primary">Git Analytics</h1>
                        <p className="text-sm text-themed-tertiary mt-1">
                            {subtitle}
                        </p>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        {updateAvailable && (
                            <button
                                onClick={handleUpdate}
                                className="btn-icon btn-primary"
                                aria-label="Update available"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                </svg>
                                Update
                            </button>
                        )}
                        {!isStandalone && (
                            <button
                                onClick={handleInstall}
                                className="btn-icon btn-secondary"
                                aria-label="Install app"
                            >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                </svg>
                                Install
                            </button>
                        )}
                        <button
                            onClick={() => dispatch({ type: 'TOGGLE_FILTER_SIDEBAR' })}
                            className={`filter-toggle relative ${state.filterSidebarOpen ? 'active' : ''}`}
                            aria-label={activeFilterCount > 0 ? `Toggle filters (${activeFilterCount} active)` : 'Toggle filters'}
                            aria-expanded={state.filterSidebarOpen}
                        >
                            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                                />
                            </svg>
                            {activeFilterCount > 0 && (
                                <span className="filter-badge">{activeFilterCount}</span>
                            )}
                        </button>
                        <button
                            onClick={() => dispatch({ type: 'TOGGLE_SETTINGS_PANE' })}
                            className="btn-theme"
                            aria-label="Settings"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                />
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </div>
        </header>
    );
}
