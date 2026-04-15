import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useState } from 'react';
import { state as globalState, VIEW_LEVELS } from './state.js';
import { getCommitTags, getAuthorEmail, getUrgencyLabel, safeStorageGet, safeStorageSet } from './utils.js';
import { applyTheme, validLightTheme, validDarkTheme } from './themes.js';
import { resolveRuntimeAccent, resolveRuntimeMuted } from './chartColors.js';

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

// --- Default filter shape (single source of truth) ---
const DEFAULT_FILTERS = {
    tag: { values: ['merge'], mode: 'exclude' },
    author: { values: [], mode: 'include' },
    repo: { values: [], mode: 'include' },
    urgency: { values: [], mode: 'include' },
    impact: { values: [], mode: 'include' },
    dateFrom: '',
    dateTo: '',
};

// --- Initial State ---
function loadInitialState() {
    let savedFilters = null;
    try {
        const saved = safeStorageGet('dashboardFilters');
        if (saved) savedFilters = JSON.parse(saved);
    } catch (e) { console.warn('Failed to read filters from localStorage:', e.message); }

    // Requirement: Dark mode + per-mode theme name state must match the
    //   classes/attributes the flash prevention script in <head> already
    //   applied. Read from localStorage with system preference fallback,
    //   validate each theme name against the catalog in themes.js so a
    //   removed theme falls back silently.
    // Approach: Mirror the flash prevention script's logic exactly —
    //   localStorage first, matchMedia as fallback. Reading matchMedia
    //   directly (rather than reading the .dark class the script just
    //   applied) keeps this function independent of DOM side effects and
    //   makes it unit-testable without a full DOM.
    // Alternatives:
    //   - Read directly from DOM attributes (classList / data-theme): Rejected —
    //     couples initial state to the flash prevention script's side effects
    //     and obscures the actual source of truth (localStorage + matchMedia).
    const storedDark = safeStorageGet('darkMode');
    const initialDarkMode = storedDark !== null
        ? storedDark === 'true'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;

    // Per-mode theme names (Approach A). Validators in themes.js fall back
    // to DEFAULT_LIGHT_THEME / DEFAULT_DARK_THEME when the stored value is
    // null or not in the allowlist.
    const initialLightTheme = validLightTheme(safeStorageGet('lightTheme'));
    const initialDarkTheme = validDarkTheme(safeStorageGet('darkTheme'));

    return {
        data: null,
        darkMode: initialDarkMode,
        // --- Theme state ---
        // darkMode picks which of these two is currently applied; both stay
        // in state so a future theme picker UI can change one without
        // mode-flipping, and the cross-tab storage listener can update the
        // non-current mode's theme unconditionally.
        lightTheme: initialLightTheme,
        darkTheme: initialDarkTheme,
        // Chart.js dataset accent / muted colors, resolved from the active
        // theme's --color-primary / --color-base-content at runtime. Seeded
        // at init by calling resolveRuntimeAccent() / resolveRuntimeMuted()
        // directly — by the time React mounts, index.html's flash-prevention
        // script in <head> has already applied the DaisyUI theme (set the
        // <html data-theme> attribute) so getComputedStyle returns the
        // correct values for the initial render. The darkMode useEffect
        // still dispatches SET_THEME_COLORS on every subsequent theme
        // change to keep these values in sync.
        themeAccent: resolveRuntimeAccent(),
        themeMuted: resolveRuntimeMuted(),
        activeTab: 'overview',
        currentViewLevel: safeStorageGet('viewLevel') || 'developer',
        useUTC: safeStorageGet('useUTC') === 'true',
        workHourStart: parseInt(safeStorageGet('workHourStart') || '8', 10),
        workHourEnd: parseInt(safeStorageGet('workHourEnd') || '17', 10),
        detailPane: { open: false, title: '', subtitle: '', commits: [], filterInfo: null },
        filterSidebarOpen: false,
        settingsPaneOpen: false,
        filters: savedFilters || { ...DEFAULT_FILTERS },
        // Requirement: Track commit loading state for time-windowed lazy loading
        // Approach: Separate commitsLoading flag so dashboard can show charts from
        //   pre-aggregated data while commits are still loading in background
        // Alternatives: Block rendering until commits load — rejected, wastes pre-aggregated data
        commitsLoading: false,
    };
}

// --- Reducer ---
function reducer(state, action) {
    switch (action.type) {
        case 'LOAD_DATA':
            return { ...state, data: action.payload };
        // Requirement: Merge lazy-loaded commits into existing summary data
        // Approach: New action type merges commits array into state.data without
        //   replacing the summary/aggregation data already loaded
        case 'LOAD_COMMITS':
            return {
                ...state,
                data: state.data
                    ? { ...state.data, commits: action.payload }
                    : state.data,
                commitsLoading: false,
            };
        case 'SET_COMMITS_LOADING':
            return { ...state, commitsLoading: action.payload };
        case 'SET_ACTIVE_TAB':
            return { ...state, activeTab: action.payload };
        case 'SET_VIEW_LEVEL':
            return { ...state, currentViewLevel: action.payload };
        case 'SET_USE_UTC':
            return { ...state, useUTC: action.payload };
        case 'SET_WORK_HOURS':
            return { ...state, workHourStart: action.payload.start, workHourEnd: action.payload.end };
        case 'SET_FILTERS':
            return { ...state, filters: action.payload };
        case 'UPDATE_FILTER': {
            const { filterType, ...rest } = action.payload;
            return {
                ...state,
                filters: {
                    ...state.filters,
                    [filterType]: { ...state.filters[filterType], ...rest },
                },
            };
        }
        case 'SET_DATE_FILTER':
            return {
                ...state,
                filters: { ...state.filters, [action.payload.field]: action.payload.value },
            };
        case 'CLEAR_FILTERS':
            return { ...state, filters: { ...DEFAULT_FILTERS } };
        case 'OPEN_DETAIL_PANE':
            return {
                ...state,
                detailPane: {
                    open: true,
                    title: action.payload.title,
                    subtitle: action.payload.subtitle,
                    commits: action.payload.commits,
                    filterInfo: action.payload.filterInfo || null,
                },
            };
        case 'CLOSE_DETAIL_PANE':
            return { ...state, detailPane: { ...state.detailPane, open: false } };
        case 'TOGGLE_FILTER_SIDEBAR':
            return { ...state, filterSidebarOpen: !state.filterSidebarOpen };
        case 'OPEN_FILTER_SIDEBAR':
            return { ...state, filterSidebarOpen: true };
        case 'CLOSE_FILTER_SIDEBAR':
            return { ...state, filterSidebarOpen: false };
        case 'TOGGLE_SETTINGS_PANE':
            return { ...state, settingsPaneOpen: !state.settingsPaneOpen };
        case 'CLOSE_SETTINGS_PANE':
            return { ...state, settingsPaneOpen: false };
        case 'SET_DARK_MODE':
            // Skip no-op dispatches so cross-tab storage events that replay
            // the current value (e.g. initial-mount persistence from another
            // tab) don't cause a re-render. Primitive equality is safe here.
            if (state.darkMode === action.payload) return state;
            return { ...state, darkMode: action.payload };
        case 'SET_LIGHT_THEME': {
            // Validate against allowlist — payload may come from cross-tab
            // storage events where another tab could have any value. Falls
            // back to DEFAULT_LIGHT_THEME on miss.
            const validated = validLightTheme(action.payload);
            if (state.lightTheme === validated) return state;
            return { ...state, lightTheme: validated };
        }
        case 'SET_DARK_THEME': {
            const validated = validDarkTheme(action.payload);
            if (state.darkTheme === validated) return state;
            return { ...state, darkTheme: validated };
        }
        case 'SET_THEME_COLORS': {
            // Dispatched by the darkMode useEffect AFTER applyTheme() has
            // run, so getComputedStyle on the <html> element returns the
            // newly-activated theme's CSS variable values. The dispatcher
            // already ran resolveRuntimeAccent / resolveRuntimeMuted and
            // passes in the resolved strings — the reducer just stores
            // them. No-op guard skips re-renders when the resolved values
            // are unchanged (e.g. toggling dark/light when both modes'
            // themes happen to produce the same --color-primary, which is
            // unlikely but cheap to guard against).
            const { accent, muted } = action.payload;
            if (state.themeAccent === accent && state.themeMuted === muted) return state;
            return { ...state, themeAccent: accent, themeMuted: muted };
        }
        default:
            return state;
    }
}

// --- Filter logic ---
function filterCommits(commits, filters) {
    if (!commits) return [];

    // Hoist date-range bounds out of the filter callback. Without this,
    // every commit triggers two `new Date()` constructions plus a
    // setHours mutation — for a 10k-commit dataset that's 20k+
    // allocations per filter operation. Hoisted: 0-2 allocations total.
    const fromBoundMs = filters.dateFrom ? new Date(filters.dateFrom).getTime() : null;
    let toBoundMs = null;
    if (filters.dateTo) {
        const toDate = new Date(filters.dateTo);
        toDate.setHours(23, 59, 59, 999);
        toBoundMs = toDate.getTime();
    }

    return commits.filter(commit => {
        // Date range — compare in milliseconds to avoid per-commit Date construction
        if (fromBoundMs !== null || toBoundMs !== null) {
            const commitMs = new Date(commit.timestamp).getTime();
            if (fromBoundMs !== null && commitMs < fromBoundMs) return false;
            if (toBoundMs !== null && commitMs > toBoundMs) return false;
        }
        // Tag filter
        if (filters.tag.values.length > 0) {
            const commitTags = getCommitTags(commit);
            const hasMatch = filters.tag.values.some(t => commitTags.includes(t));
            if (filters.tag.mode === 'include' && !hasMatch) return false;
            if (filters.tag.mode === 'exclude' && hasMatch) return false;
        }
        // Author filter
        if (filters.author.values.length > 0) {
            const email = getAuthorEmail(commit);
            const hasMatch = filters.author.values.includes(email);
            if (filters.author.mode === 'include' && !hasMatch) return false;
            if (filters.author.mode === 'exclude' && hasMatch) return false;
        }
        // Repo filter
        if (filters.repo.values.length > 0) {
            const repo = commit.repo_id || 'default';
            const hasMatch = filters.repo.values.includes(repo);
            if (filters.repo.mode === 'include' && !hasMatch) return false;
            if (filters.repo.mode === 'exclude' && hasMatch) return false;
        }
        // Urgency filter
        if (filters.urgency.values.length > 0) {
            const label = getUrgencyLabel(commit.urgency);
            const hasMatch = filters.urgency.values.includes(label);
            if (filters.urgency.mode === 'include' && !hasMatch) return false;
            if (filters.urgency.mode === 'exclude' && hasMatch) return false;
        }
        // Impact filter
        if (filters.impact.values.length > 0) {
            const hasMatch = filters.impact.values.includes(commit.impact);
            if (filters.impact.mode === 'include' && !hasMatch) return false;
            if (filters.impact.mode === 'exclude' && hasMatch) return false;
        }
        return true;
    });
}

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
