import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useState } from 'react';
import { state as globalState, VIEW_LEVELS } from './state.js';
import { getCommitTags, getAuthorEmail, getUrgencyLabel, safeStorageGet, safeStorageSet } from './utils.js';
import { applyTheme, validLightTheme, validDarkTheme } from './themes.js';
import { resolveRuntimeAccent, resolveRuntimeMuted } from './chartColors.js';
import { loadInitialState, reducer, filterCommits } from './appReducer.js';

// Requirement: Prevent unnecessary re-renders when components only need to dispatch actions
// Approach: Split into two contexts — DispatchContext (stable identity, never changes) and
//   AppStateContext (changes on every state update). Components using useAppDispatch() only
//   subscribe to the stable context and skip re-renders on state changes.
// Alternatives:
//   - Single context: Rejected — every dispatch-only component (e.g., event handlers in
//     deeply nested children) would re-render on every state change
//   - External state library (Zustand, Redux): Rejected — adds dependency for a pattern
//     achievable with built-in React Context
const AppStateContext = createContext(null);
const DispatchContext = createContext(null);

// Theme catalog, validators, meta colors, and the applyTheme() helper live
// in ./themes.js so AppContext.jsx stays focused on reducer/state concerns.
// The inline flash prevention script in index.html keeps its own small
// duplicated copy (inline scripts can't import ES modules) — the allowlist
// and meta color map in that script must stay in sync with themes.js, and
// `scripts/generate-theme-meta.mjs` regenerates `generated/themeMeta.js` on
// every build to catch DaisyUI drift automatically.
//
// The reducer, initial-state loader, DEFAULT_FILTERS, and filterCommits
// live in ./appReducer.js (extracted 2026-04-15 to keep this file under
// the 500-line soft-limit). This file owns the React-specific layer:
// context creation, the provider component, every useEffect / useMemo /
// useCallback hook, the useApp / useAppDispatch consumer hooks.

// --- Provider ---
export function AppProvider({ children }) {
    const [state, dispatch] = useReducer(reducer, null, loadInitialState);

    // Sync React state to global state object for utils.js compatibility.
    // MUST run before useMemo hooks — getAuthorEmail/getAuthorName read
    // globalState.data, so it needs to be current before those run.
    globalState.data = state.data;
    globalState.useUTC = state.useUTC;
    globalState.workHourStart = state.workHourStart;
    globalState.workHourEnd = state.workHourEnd;
    globalState.currentViewLevel = state.currentViewLevel;

    // Memoized filtered commits — only available after commits are loaded
    const filteredCommits = useMemo(
        () => filterCommits(state.data?.commits, state.filters),
        [state.data?.commits, state.filters]
    );

    // Memoized view config
    const viewConfig = useMemo(
        () => VIEW_LEVELS[state.currentViewLevel] || VIEW_LEVELS.developer,
        [state.currentViewLevel]
    );

    // Requirement: Use pre-computed filter options from summary when available
    // Approach: Check for data.filterOptions (new format from aggregate-processed.js),
    //   fall back to computing from commits (legacy format / file upload)
    // Alternatives: Always compute from commits — rejected, requires loading all commits
    //   before FilterSidebar can render
    const filterOptions = useMemo(() => {
        // New format: pre-computed filter options from aggregation script
        if (state.data?.filterOptions) {
            return state.data.filterOptions;
        }
        // Legacy format: compute from commits array
        if (!state.data?.commits) return { tags: [], authors: [], repos: [], urgencies: [], impacts: [] };
        const tags = new Set();
        const authors = new Set();
        const repos = new Set();
        const urgencies = new Set();
        const impacts = new Set();
        state.data.commits.forEach(c => {
            getCommitTags(c).forEach(t => tags.add(t));
            authors.add(getAuthorEmail(c));
            if (c.repo_id) repos.add(c.repo_id);
            if (c.urgency) urgencies.add(getUrgencyLabel(c.urgency));
            if (c.impact) impacts.add(c.impact);
        });
        return {
            tags: [...tags].sort(),
            authors: [...authors].sort(),
            repos: [...repos].sort(),
            urgencies: [...urgencies].sort(),
            impacts: [...impacts].sort(),
        };
    }, [state.data?.filterOptions, state.data?.commits]);

    // Whether commits have been loaded (either inline or via lazy loading)
    const commitsLoaded = useMemo(
        () => Array.isArray(state.data?.commits) && state.data.commits.length > 0,
        [state.data?.commits]
    );

    // Persist settings to localStorage
    useEffect(() => {
        safeStorageSet('viewLevel', state.currentViewLevel);
    }, [state.currentViewLevel]);
    useEffect(() => {
        safeStorageSet('useUTC', String(state.useUTC));
    }, [state.useUTC]);
    useEffect(() => {
        safeStorageSet('workHourStart', String(state.workHourStart));
        safeStorageSet('workHourEnd', String(state.workHourEnd));
    }, [state.workHourStart, state.workHourEnd]);
    useEffect(() => {
        try {
            safeStorageSet('dashboardFilters', JSON.stringify(state.filters));
        } catch (e) {
            console.warn('Failed to save filters to localStorage:', e.message);
        }
    }, [state.filters]);

    // Apply dark mode to DOM, sync Chart.js defaults, and persist.
    // Requirement: Dual-layer theming — set both .dark (Tailwind dark: variant)
    //   AND data-theme (DaisyUI semantic tokens) atomically on every theme
    //   change. Update <meta name="theme-color"> so the PWA status bar tracks
    //   the active theme. Chart axis labels and grid lines must also update.
    // Approach: Compute the currently active theme name from reducer state
    //   and call applyTheme() from themes.js — the single source of truth
    //   for these DOM mutations. The effect only depends on darkMode and
    //   the derived activeTheme so a cross-tab event that updates the
    //   NON-active mode's theme (e.g. user picks Dracula in tab A while
    //   tab B is in light mode) doesn't cause an unnecessary effect re-run
    //   in tab B — reducer state still updates via the storage listener so
    //   the value is ready for the next toggle.
    // Alternatives:
    //   - Inlining the DOM mutations here: Rejected — duplicated the same
    //     logic in 3 places (AppContext, App.jsx embed, inline script) and
    //     drifted between them.
    //   - Depending on [darkMode, lightTheme, darkTheme]: Rejected — caused
    //     the effect to re-run on every cross-tab theme change regardless
    //     of which mode was currently applied. The DOM mutations were
    //     no-ops but the getComputedStyle + Chart.js defaults writes were
    //     wasteful.
    //   - Reading from localStorage inside the effect: Rejected — couples
    //     the effect to storage instead of reducer state, making the React
    //     tree slightly lie about its own theme state.
    const activeTheme = state.darkMode ? state.darkTheme : state.lightTheme;
    useEffect(() => {
        applyTheme(state.darkMode, activeTheme);
        // After applyTheme() has mutated <html>'s data-theme attribute,
        // getComputedStyle returns the NEW theme's --color-primary and
        // --color-base-content values synchronously. Resolve them via the
        // chartColors helpers (which respect the embedder's URL override)
        // and dispatch SET_THEME_COLORS so Chart.js dataset colors track
        // the active theme in components that read state.themeAccent /
        // state.themeMuted via useApp(). This causes one extra render in
        // the same tick — the first render pass uses the previous theme's
        // accent (harmless: the DOM hasn't painted yet), the second pass
        // after this dispatch uses the new theme's accent. The no-op
        // guard in the reducer short-circuits when the URL override is
        // set (accent doesn't change on theme toggle) or when the new
        // theme happens to have identical --color-primary to the old one.
        //
        // Requirement: Chart.js dataset colors must track the active
        //   DaisyUI theme so the hour-of-day heatmap, contributor bars,
        //   timeline accent, and other single-accent visualizations match
        //   the user's theme. The vanilla-DaisyUI sweep (2026-04-14)
        //   deleted every brand-hex palette — chartColors.js now reads
        //   8 DaisyUI semantic CSS variables at runtime.
        // Approach: Dispatch resolved hex/oklch/color-mix strings. Chart.js
        //   canvas rendering handles oklch() and color-mix() directly in
        //   modern browsers (same capability the existing ChartJS.defaults
        //   sync in themes.js already relies on), so no JS-side conversion
        //   is needed.
        dispatch({
            type: 'SET_THEME_COLORS',
            payload: {
                accent: resolveRuntimeAccent(),
                muted: resolveRuntimeMuted(),
            },
        });
    }, [state.darkMode, activeTheme]);

    // Cross-tab sync: listen for theme changes from other tabs.
    // Requirement: Match the reference handler shape — when another tab
    //   writes darkMode / lightTheme / darkTheme to localStorage, this tab
    //   updates its reducer state so the darkMode effect picks up the
    //   change and calls applyTheme(). The 'storage' event only fires in
    //   OTHER tabs (not the one that wrote), so there's no infinite loop.
    // Approach: Dispatch unconditionally for each of the three keys,
    //   INCLUDING when e.newValue is null (key removed). The lightTheme
    //   and darkTheme keys are removed by persistTheme when the user
    //   reverts to the default theme — other tabs need to see that signal
    //   and update their reducer state back to the default. The reducer's
    //   validLightTheme / validDarkTheme fall back to defaults on null
    //   input, so dispatching with a null payload updates state to the
    //   default. This matches the "remove key means revert to default"
    //   contract the flash prevention script and persistTheme rely on.
    // Alternatives:
    //   - Only dispatch when the key matches the current mode (earlier
    //     draft): Rejected — the non-current mode's state silently lagged
    //     behind localStorage, which diverged from the reference handler
    //     shape and made reducer state lie about the current theme choice.
    //   - Filter out e.newValue === null (earlier draft): Rejected — the
    //     revert-to-default path would be invisible to other tabs.
    //   - Full page reload on storage change: Rejected — kills in-flight
    //     analysis and scroll position.
    useEffect(() => {
        function handleStorage(e) {
            if (e.key === 'darkMode') {
                // darkMode being removed is unusual (persistTheme always
                // writes it) but handle it gracefully: fall back to the
                // system preference, same as a fresh visit.
                const next = e.newValue !== null
                    ? e.newValue === 'true'
                    : window.matchMedia('(prefers-color-scheme: dark)').matches;
                dispatch({ type: 'SET_DARK_MODE', payload: next });
                return;
            }
            if (e.key === 'lightTheme') {
                // e.newValue may be null (key removed = revert to default)
                // or a theme id. validLightTheme handles both.
                dispatch({ type: 'SET_LIGHT_THEME', payload: e.newValue });
                return;
            }
            if (e.key === 'darkTheme') {
                dispatch({ type: 'SET_DARK_THEME', payload: e.newValue });
                return;
            }
        }
        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    // System preference fallback: track OS dark mode changes, but only when
    // the user hasn't manually set a preference (no darkMode in localStorage).
    // Once they toggle manually, their choice persists and OS changes are ignored.
    useEffect(() => {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        function handleChange(e) {
            if (safeStorageGet('darkMode') === null) {
                dispatch({ type: 'SET_DARK_MODE', payload: e.matches });
            }
        }
        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, []);

    // Helper to count active filters
    const activeFilterCount = useMemo(() => {
        let count = 0;
        ['tag', 'author', 'repo', 'urgency', 'impact'].forEach(key => {
            if (state.filters[key].values.length > 0) count++;
        });
        if (state.filters.dateFrom || state.filters.dateTo) count++;
        return count;
    }, [state.filters]);

    // Helper: openDetailPane
    const openDetailPane = useCallback((title, subtitle, commits, filterInfo) => {
        dispatch({ type: 'OPEN_DETAIL_PANE', payload: { title, subtitle, commits, filterInfo } });
    }, []);

    // Helper: setTheme(themeName)
    // Requirement: Components calling into the theme picker shouldn't need
    //   to know about dispatch, action type names, or which action to fire
    //   for light vs dark mode. One helper, one arg.
    // Approach: Infer which mode the theme belongs to by checking both
    //   allowlists (via validLightTheme / validDarkTheme) — whichever
    //   returns the original id without fallback is the target mode. If
    //   the id is in neither allowlist, this is a no-op (reducer guards
    //   prevent garbage state).
    // Alternatives:
    //   - Take a { dark, theme } object: Rejected — caller already knows
    //     the active mode via state.darkMode, doesn't need to repeat it.
    //   - Separate setLightTheme / setDarkTheme exports: Rejected — more
    //     API surface for no benefit; the mode is deterministic from the id.
    const setTheme = useCallback((themeName) => {
        if (validLightTheme(themeName) === themeName) {
            dispatch({ type: 'SET_LIGHT_THEME', payload: themeName });
        } else if (validDarkTheme(themeName) === themeName) {
            dispatch({ type: 'SET_DARK_THEME', payload: themeName });
        }
        // else: unknown theme, silently ignore. Validators log nothing but
        // the reducer cases would accept garbage — guard here instead.
    }, []);

    // Track mobile state reactively so charts recompute on resize
    const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
    useEffect(() => {
        let timeout;
        function onResize() {
            clearTimeout(timeout);
            timeout = setTimeout(() => setIsMobile(window.innerWidth < 640), 150);
        }
        window.addEventListener('resize', onResize);
        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', onResize);
        };
    }, []);

    // Stable dispatch context — never changes identity
    const dispatchValue = useMemo(() => ({
        dispatch,
        openDetailPane,
        setTheme,
    }), [openDetailPane, setTheme]);

    const stateValue = useMemo(() => ({
        state,
        filteredCommits,
        viewConfig,
        filterOptions,
        activeFilterCount,
        isMobile,
        commitsLoaded,
    }), [state, filteredCommits, viewConfig, filterOptions, activeFilterCount, isMobile, commitsLoaded]);

    return (
        <DispatchContext.Provider value={dispatchValue}>
            <AppStateContext.Provider value={stateValue}>
                {children}
            </AppStateContext.Provider>
        </DispatchContext.Provider>
    );
}

// Primary hook — returns both state and dispatch (backward compatible)
export function useApp() {
    const stateCtx = useContext(AppStateContext);
    const dispatchCtx = useContext(DispatchContext);
    if (!stateCtx || !dispatchCtx) throw new Error('useApp must be used within AppProvider');
    return { ...stateCtx, ...dispatchCtx };
}

// Dispatch-only hook — components using this won't re-render on state changes
export function useAppDispatch() {
    const ctx = useContext(DispatchContext);
    if (!ctx) throw new Error('useAppDispatch must be used within AppProvider');
    return ctx;
}

