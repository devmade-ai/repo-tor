import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useState } from 'react';
import { Chart as ChartJS } from 'chart.js';
import { state as globalState, VIEW_LEVELS } from './state.js';
import { getCommitTags, getAuthorEmail, getUrgencyLabel, safeStorageGet, safeStorageSet } from './utils.js';

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

// DaisyUI theme names + PWA meta colors for dual-layer theming.
// MUST match the inline flash prevention script in index.html and the
// @plugin "daisyui" config in styles.css. Inline script can't import
// ES modules, so this duplication is unavoidable.
// Meta colors are the DaisyUI base-100 values for each theme (lofi=#ffffff,
// black=#000000) — the color the PWA status bar should blend with.
const LIGHT_THEME = 'lofi';
const DARK_THEME = 'black';
const LIGHT_META_COLOR = '#ffffff';
const DARK_META_COLOR = '#000000';

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

    // Requirement: Dark mode state must match the class applied by the flash
    //   prevention script in index.html <head>. Read from localStorage with
    //   system preference fallback — same logic as the inline script.
    // Approach: Initial state reads darkMode from localStorage. If not set,
    //   falls back to prefers-color-scheme media query. Persists on toggle.
    const storedDark = safeStorageGet('darkMode');
    const initialDarkMode = storedDark !== null
        ? storedDark === 'true'
        : document.documentElement.classList.contains('dark');

    return {
        data: null,
        darkMode: initialDarkMode,
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
        case 'CLOSE_FILTER_SIDEBAR':
            return { ...state, filterSidebarOpen: false };
        case 'TOGGLE_SETTINGS_PANE':
            return { ...state, settingsPaneOpen: !state.settingsPaneOpen };
        case 'CLOSE_SETTINGS_PANE':
            return { ...state, settingsPaneOpen: false };
        case 'SET_DARK_MODE':
            return { ...state, darkMode: action.payload };
        default:
            return state;
    }
}

// --- Filter logic ---
function filterCommits(commits, filters) {
    if (!commits) return [];
    return commits.filter(commit => {
        // Date range
        if (filters.dateFrom) {
            const fromDate = new Date(filters.dateFrom);
            const commitDate = new Date(commit.timestamp);
            if (commitDate < fromDate) return false;
        }
        if (filters.dateTo) {
            const toDate = new Date(filters.dateTo);
            toDate.setHours(23, 59, 59, 999);
            const commitDate = new Date(commit.timestamp);
            if (commitDate > toDate) return false;
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
    //   AND data-theme (DaisyUI semantic tokens) on every theme change. Update
    //   <meta name="theme-color"> so the PWA status bar tracks the active theme.
    //   Chart axis labels and grid lines must also update on toggle.
    // Approach: Re-read CSS variables after class change and update Chart.js
    //   global defaults. Previously set once in main.jsx at mount — charts kept
    //   stale colors after toggling between light and dark mode.
    //   Theme names and meta colors MUST match the inline flash prevention
    //   script in index.html — duplication is unavoidable because the inline
    //   script runs before any module loads.
    // Alternatives:
    //   - Per-chart color props: Rejected — every chart would need theme awareness
    //   - CSS-only chart theming: Rejected — Chart.js renders to canvas, not DOM
    //   - Only .dark class (skip data-theme): Rejected — DaisyUI components
    //     fall out of sync with Tailwind dark: utilities, producing visual bugs.
    useEffect(() => {
        const root = document.documentElement;
        if (state.darkMode) {
            root.classList.add('dark');
        } else {
            root.classList.remove('dark');
        }
        root.setAttribute('data-theme', state.darkMode ? DARK_THEME : LIGHT_THEME);
        // Overwrite BOTH <meta name="theme-color"> tags so the active theme wins
        // regardless of the OS preference media query.
        const color = state.darkMode ? DARK_META_COLOR : LIGHT_META_COLOR;
        document.querySelectorAll('meta[name="theme-color"]').forEach(meta => {
            meta.setAttribute('content', color);
        });
        // Re-read CSS variables after class change and update Chart.js defaults
        const styles = getComputedStyle(root);
        ChartJS.defaults.color = styles.getPropertyValue('--text-secondary').trim() || '#e5e7eb';
        ChartJS.defaults.borderColor = styles.getPropertyValue('--chart-grid').trim() || 'rgba(255,255,255,0.1)';
        safeStorageSet('darkMode', String(state.darkMode));
    }, [state.darkMode]);

    // Cross-tab sync: listen for darkMode changes from other tabs.
    // The storage event only fires in OTHER tabs (not the one that wrote),
    // so there's no infinite loop. Empty dependency array — listener lives
    // for the entire component lifecycle. No stale closure issue because
    // we dispatch unconditionally (reducer handles dedup).
    useEffect(() => {
        function handleStorage(e) {
            if (e.key === 'darkMode' && e.newValue !== null) {
                dispatch({ type: 'SET_DARK_MODE', payload: e.newValue === 'true' });
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
    }), [openDetailPane]);

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
