import React, { useState, useEffect, useCallback } from 'react';
import { useApp } from '../AppContext.jsx';
import { installPWA, applyUpdate, getPWAState, getInstallInstructions, supportsManualInstall } from '../pwa.js';
import HamburgerMenu from './HamburgerMenu.jsx';
import QuickGuide from './QuickGuide.jsx';
import InstallInstructionsModal from './InstallInstructionsModal.jsx';

// Requirement: Clean, minimal header with hamburger menu for secondary actions
// Approach: Keep filter toggle + settings as direct buttons (frequently used),
//   move PDF/Install/Update/Guide into a hamburger menu to reduce clutter.
// Alternatives:
//   - Keep all buttons visible: Rejected — too many buttons, especially on mobile
//   - Tab bar with overflow: Rejected — confuses navigation tabs with actions

export default function Header() {
    const { state, dispatch, activeFilterCount, filteredCommits } = useApp();
    const [installReady, setInstallReady] = useState(false);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [guideOpen, setGuideOpen] = useState(false);
    const [installModalOpen, setInstallModalOpen] = useState(false);

    const repoName = state.data?.metadata?.repo_name;
    const totalCount = state.data?.commits?.length || 0;
    const filteredCount = filteredCommits?.length || 0;
    const isFiltered = activeFilterCount > 0;

    let repoDisplay = '';
    if (repoName) {
        repoDisplay = Array.isArray(repoName) ? repoName.join(', ') : repoName;
    }

    // Requirement: Make it clear when filters reduce the visible data set
    // Approach: Show "Showing X of Y changes" when filtered, clickable to open filters.
    //   Plain "Y changes" when no filters active.
    // Alternatives:
    //   - Always show total only: Rejected — hides that filters are active, confusing
    //   - Badge/icon indicator: Rejected — less clear than explicit text for non-technical users
    //   - Dismissible banner: Rejected — adds clutter; inline clickable text is less intrusive
    const handleOpenFilters = useCallback(() => {
        if (!state.filterSidebarOpen) {
            dispatch({ type: 'TOGGLE_FILTER_SIDEBAR' });
        }
    }, [state.filterSidebarOpen, dispatch]);

    // Seed from pwa.js module state (catches events that fired before mount),
    // then listen for subsequent changes. Also show install option for browsers
    // that support manual installation (Safari, Firefox) after a short delay.
    useEffect(() => {
        const current = getPWAState();
        if (current.installReady) setInstallReady(true);
        if (current.updateAvailable) setUpdateAvailable(true);

        const handleInstallReady = () => setInstallReady(true);
        const handleInstalled = () => setInstallReady(false);
        const handleUpdateAvailable = () => setUpdateAvailable(true);

        window.addEventListener('pwa-install-ready', handleInstallReady);
        window.addEventListener('pwa-installed', handleInstalled);
        window.addEventListener('pwa-update-available', handleUpdateAvailable);

        // For Safari/Firefox: show install option after 1s if no native prompt fires
        const manualTimeout = setTimeout(() => {
            if (!getPWAState().installReady && supportsManualInstall()) {
                setInstallReady(true);
            }
        }, 1000);

        return () => {
            window.removeEventListener('pwa-install-ready', handleInstallReady);
            window.removeEventListener('pwa-installed', handleInstalled);
            window.removeEventListener('pwa-update-available', handleUpdateAvailable);
            clearTimeout(manualTimeout);
        };
    }, []);

    // Auto-show guide on first visit (after data loads so user sees a real dashboard behind it)
    useEffect(() => {
        if (state.data && QuickGuide.shouldAutoShow()) {
            setGuideOpen(true);
            QuickGuide.markSeen();
        }
    }, [state.data]);

    // Requirement: Show native install prompt on Chromium, manual instructions elsewhere
    // Approach: Try native prompt first. If unavailable (Safari/Firefox), show the
    //   data-driven InstallInstructionsModal with browser-specific steps.
    // Alternatives:
    //   - Always show modal: Rejected — native prompt is better UX when available
    //   - Open settings pane: Rejected — install instructions deserve their own focused modal
    const handleInstall = useCallback(async () => {
        const prompted = await installPWA();
        if (!prompted) {
            setInstallModalOpen(true);
        }
    }, []);

    const handleUpdate = useCallback(() => {
        applyUpdate();
    }, []);

    const handleOpenGuide = useCallback(() => {
        setGuideOpen(true);
    }, []);

    const handleCloseGuide = useCallback(() => {
        setGuideOpen(false);
        QuickGuide.markSeen();
    }, []);

    return (
        <>
            <header className="dashboard-header px-4 md:px-8 py-3 sm:py-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-themed-primary">Git Analytics</h1>
                            <p className="text-sm text-themed-tertiary mt-1">
                                {repoDisplay && <>{repoDisplay} &mdash; </>}
                                {isFiltered ? (
                                    <button
                                        type="button"
                                        onClick={handleOpenFilters}
                                        className="header-filter-hint"
                                    >
                                        Showing {filteredCount.toLocaleString()} of {totalCount.toLocaleString()} changes &middot; Filtered
                                    </button>
                                ) : (
                                    <>{totalCount.toLocaleString()} changes</>
                                )}
                            </p>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap no-print">
                            {updateAvailable && (
                                <span className="hamburger-update-dot" title="Update available" />
                            )}
                            <HamburgerMenu
                                onOpenGuide={handleOpenGuide}
                                onSavePDF={() => window.print()}
                                onInstall={handleInstall}
                                onUpdate={handleUpdate}
                                installReady={installReady}
                                updateAvailable={updateAvailable}
                            />
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
            <QuickGuide open={guideOpen} onClose={handleCloseGuide} />
            <InstallInstructionsModal
                isOpen={installModalOpen}
                onClose={() => setInstallModalOpen(false)}
                instructions={installModalOpen ? getInstallInstructions() : null}
            />
        </>
    );
}
