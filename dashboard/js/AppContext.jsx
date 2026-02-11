import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, useState } from 'react';
import { state as globalState, VIEW_LEVELS } from './state.js';
import { getCommitTags, getAuthorEmail, getUrgencyLabel } from './utils.js';

// Split contexts: DispatchContext is stable (never changes identity),
// so components that only dispatch actions won't re-render on state changes.
const AppStateContext = createContext(null);
const DispatchContext = createContext(null);

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
        const saved = localStorage.getItem('dashboardFilters');
        if (saved) savedFilters = JSON.parse(saved);
    } catch (e) { /* ignore */ }

    return {
        data: null,
        activeTab: 'overview',
        currentViewLevel: localStorage.getItem('viewLevel') || 'developer',
        useUTC: localStorage.getItem('useUTC') === 'true',
        workHourStart: parseInt(localStorage.getItem('workHourStart') || '8', 10),
        workHourEnd: parseInt(localStorage.getItem('workHourEnd') || '17', 10),
        detailPane: { open: false, title: '', subtitle: '', commits: [], filterInfo: null },
        filterSidebarOpen: false,
        settingsPaneOpen: false,
        filters: savedFilters || { ...DEFAULT_FILTERS },
        commitListVisible: 100,
    };
}

// --- Reducer ---
function reducer(state, action) {
    switch (action.type) {
        case 'LOAD_DATA':
            return { ...state, data: action.payload, commitListVisible: 100 };
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
        case 'SET_COMMIT_LIST_VISIBLE':
            return { ...state, commitListVisible: action.payload };
        case 'LOAD_MORE_COMMITS':
            return { ...state, commitListVisible: state.commitListVisible + 100 };
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

    // Memoized filtered commits
    const filteredCommits = useMemo(
        () => filterCommits(state.data?.commits, state.filters),
        [state.data?.commits, state.filters]
    );

    // Memoized view config
    const viewConfig = useMemo(
        () => VIEW_LEVELS[state.currentViewLevel] || VIEW_LEVELS.developer,
        [state.currentViewLevel]
    );

    // Available filter options (derived from data)
    const filterOptions = useMemo(() => {
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
    }, [state.data?.commits]);

    // Persist settings to localStorage
    useEffect(() => {
        localStorage.setItem('viewLevel', state.currentViewLevel);
    }, [state.currentViewLevel]);
    useEffect(() => {
        localStorage.setItem('useUTC', String(state.useUTC));
    }, [state.useUTC]);
    useEffect(() => {
        localStorage.setItem('workHourStart', String(state.workHourStart));
        localStorage.setItem('workHourEnd', String(state.workHourEnd));
    }, [state.workHourStart, state.workHourEnd]);
    useEffect(() => {
        try { localStorage.setItem('dashboardFilters', JSON.stringify(state.filters)); } catch (e) { /* ignore */ }
    }, [state.filters]);

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
    }), [state, filteredCommits, viewConfig, filterOptions, activeFilterCount, isMobile]);

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
