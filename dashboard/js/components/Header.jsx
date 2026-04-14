import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useApp, useAppDispatch } from '../AppContext.jsx';
import { installPWA, applyUpdate, getPWAState, getInstallInstructions, supportsManualInstall, isInstalledPWA } from '../pwa.js';
import { LIGHT_THEMES, DARK_THEMES } from '../themes.js';
import HamburgerMenu from './HamburgerMenu.jsx';
import QuickGuide from './QuickGuide.jsx';
import InstallInstructionsModal from './InstallInstructionsModal.jsx';

// Requirement: Clean, minimal header with hamburger menu for secondary actions
// Approach: Keep filter toggle + settings as direct buttons (frequently used),
//   move PDF/Install/Update/Guide/Theme into a data-driven hamburger menu.
//   Items array constructed per the standard menu items table in BURGER_MENU.md.
// Alternatives:
//   - Keep all buttons visible: Rejected — too many buttons, especially on mobile
//   - Tab bar with overflow: Rejected — confuses navigation tabs with actions

// SVG icon helpers — kept inline to avoid extra component files for simple icons
const icons = {
    guide: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>,
    pdf: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>,
    theme: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" /></svg>,
    palette: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" /></svg>,
    check: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>,
    install: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>,
    update: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>,
    book: <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>,
};

export default function Header() {
    const { state, activeFilterCount, filteredCommits } = useApp();
    const { dispatch, setTheme } = useAppDispatch();
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

    const handleInstall = useCallback(async () => {
        const prompted = await installPWA();
        if (!prompted) {
            setInstallModalOpen(true);
        }
    }, []);

    const handleToggleDarkMode = useCallback(() => {
        dispatch({ type: 'SET_DARK_MODE', payload: !state.darkMode });
    }, [state.darkMode, dispatch]);

    const handleCloseGuide = useCallback(() => {
        setGuideOpen(false);
        QuickGuide.markSeen();
    }, []);

    // Requirement: Data-driven menu items per BURGER_MENU.md standard menu items table.
    //   Menu contains: info links (Quick Guide / User Guide), mode toggle (Light/Dark),
    //   theme picker items (one per theme in the current mode, active one highlighted),
    //   and action items (Save as PDF / Install / Update).
    // Approach: Build items array with visibility conditions. Menu renders only visible items.
    //   The theme picker entries are generated from themes.js LIGHT_THEMES / DARK_THEMES
    //   and filtered to the CURRENT mode — so picking a different mode is a two-click
    //   action (toggle mode, then pick theme) rather than mixing 8 themes in the
    //   same list. The active theme is marked via `highlight: true` and a checkmark icon.
    // Reference: docs/implementations/THEME_DARK_MODE.md theme picker section;
    //   BURGER_MENU.md "Theme UI in Burger Menu".
    // Alternatives:
    //   - Hardcoded JSX per item in menu: Rejected — adding items requires component edits.
    //   - Flat list of all 8 themes: Rejected — forces the user to mentally filter dark-only
    //     themes when in light mode, and doubles the menu height.
    //   - Submenu ("Theme..." → nested menu): Rejected — adds a whole new UI layer
    //     (keyboard nav, escape handling, focus trap) for something flat entries solve cleanly.
    const activeThemeCatalog = state.darkMode ? DARK_THEMES : LIGHT_THEMES;
    const activeThemeId = state.darkMode ? state.darkTheme : state.lightTheme;

    const menuItems = useMemo(() => {
        // Build theme picker entries for the current mode. Each entry calls
        // setTheme(id) via dispatch context — the effect in AppContext picks
        // up the reducer state change and calls applyTheme() through themes.js.
        //
        // keepOpen: true keeps the burger menu open after each theme click so
        // users can rapid-preview multiple themes without reopening the menu.
        // The active-theme highlight updates in place as the React tree
        // re-renders from the reducer state change. Pattern borrowed from
        // glow-props where theme-picker buttons deliberately omit the
        // `data-close` attribute that other menu items carry.
        const themeItems = activeThemeCatalog.map((theme, idx) => ({
            label: theme.name,
            // Spell out the transition for screen readers so "Nord" isn't read as
            // just "Nord, button". Include the description so users who pause on
            // the item get the one-liner context.
            ariaLabel: `Use ${theme.name} theme (${theme.description})${theme.id === activeThemeId ? ', currently active' : ''}`,
            action: () => setTheme(theme.id),
            // Show a checkmark on the active theme and use the highlight class
            // (same accent the "Update Now" item uses) so the active pick stands
            // out without a dedicated "selected" prop.
            icon: theme.id === activeThemeId ? icons.check : icons.palette,
            highlight: theme.id === activeThemeId,
            // First theme item gets a separator above it to visually group the
            // picker under the mode toggle.
            separator: idx === 0,
            keepOpen: true,
        }));

        return [
            { label: 'Quick Guide', action: () => setGuideOpen(true), icon: icons.guide },
            { label: 'User Guide', action: () => window.open('https://github.com/devmade-ai/repo-tor#readme', '_blank'), icon: icons.book, external: true },
            {
                // Requirement: Theme toggle menu item must expose to assistive tech
                //   (1) what mode the user is currently in and (2) what will happen
                //   when they activate the item. The `label` text describes the
                //   destination ("Light mode") which is ambiguous without the
                //   current state; the explicit `ariaLabel` spells out the
                //   transition so screen readers announce "Switch to light mode".
                // Approach: Pass a dedicated `ariaLabel` prop that HamburgerMenu
                //   threads into the rendered button's aria-label attribute.
                //   keepOpen: true lets the user toggle modes and then pick a
                //   theme for the new mode in a single menu session — the
                //   theme list below swaps to the new mode's themes as soon as
                //   the toggle action dispatches.
                // Reference: THEME_DARK_MODE.md Phase 5 accessibility checklist
                //   "Theme toggle button should have aria-label (e.g., 'Switch to
                //   dark mode') that updates when toggled."
                label: state.darkMode ? 'Light mode' : 'Dark mode',
                ariaLabel: state.darkMode ? 'Switch to light mode' : 'Switch to dark mode',
                action: handleToggleDarkMode,
                icon: icons.theme,
                separator: true,
                keepOpen: true,
            },
            ...themeItems,
            { label: 'Save as PDF', action: () => window.print(), icon: icons.pdf, separator: true },
            { label: 'Install App', action: handleInstall, icon: icons.install, visible: installReady && !isInstalledPWA(), separator: true },
            { label: 'Update Now', action: () => applyUpdate(), icon: icons.update, visible: updateAvailable, highlight: true },
        ];
    }, [
        state.darkMode,
        activeThemeCatalog,
        activeThemeId,
        setTheme,
        handleToggleDarkMode,
        handleInstall,
        installReady,
        updateAvailable,
        setGuideOpen,
    ]);

    return (
        <>
            <header className="dashboard-header relative z-[var(--z-sticky-header)] px-4 md:px-8 py-3 sm:py-6">
                <div className="max-w-7xl mx-auto">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-base-content">Git Analytics</h1>
                            <p className="text-sm text-base-content/60 mt-1">
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
                        <div className="flex items-center gap-2 flex-wrap print:hidden">
                            {updateAvailable && (
                                <span className="hamburger-update-dot" title="Update available" />
                            )}
                            <HamburgerMenu items={menuItems} />
                            <button
                                onClick={() => dispatch({ type: 'TOGGLE_FILTER_SIDEBAR' })}
                                className={`btn btn-ghost btn-square relative ${state.filterSidebarOpen ? 'btn-active' : ''}`}
                                aria-label={activeFilterCount > 0 ? `Toggle filters (${activeFilterCount} active)` : 'Toggle filters'}
                                aria-expanded={state.filterSidebarOpen}
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                                    />
                                </svg>
                                {activeFilterCount > 0 && (
                                    <span className="badge badge-primary badge-xs absolute -top-0.5 -right-0.5">{activeFilterCount}</span>
                                )}
                            </button>
                            <button
                                onClick={() => dispatch({ type: 'TOGGLE_SETTINGS_PANE' })}
                                className="btn btn-ghost btn-square"
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
