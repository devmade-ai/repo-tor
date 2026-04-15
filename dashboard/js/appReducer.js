/**
 * AppContext reducer, initial-state loader, and filter logic.
 *
 * Requirement: AppContext.jsx was 579 lines — over the 500-line soft-limit
 *   from CLAUDE.md "Code Organization". Most of that mass was pure data
 *   logic (reducer switch, initial-state loader, filter predicate) that
 *   doesn't depend on React — it uses plain imports from utils.js,
 *   themes.js, and chartColors.js.
 * Approach: Extract the pure-data layer into this module. AppContext.jsx
 *   keeps every React-specific concern (createContext, useReducer,
 *   useEffect, useMemo, useCallback, hooks) and imports the reducer,
 *   loader, DEFAULT_FILTERS, and filterCommits from here. This is a
 *   straight code-organization split — no behavioural change, and the
 *   reducer remains a pure function of (state, action) that can be
 *   unit-tested without mounting a React tree.
 * Alternatives:
 *   - Split into three files (reducer, initial-state, filter): Rejected —
 *     they're tightly coupled (the reducer references DEFAULT_FILTERS,
 *     loadInitialState seeds filters from it), and three files for
 *     ~280 lines fragments the logic pointlessly.
 *   - Move filterCommits to utils.js: Rejected — it's tied to the
 *     filters shape defined in this module, not a generic helper.
 *
 * Extracted from AppContext.jsx on 2026-04-15.
 */

import { safeStorageGet, getCommitTags, getAuthorEmail, getUrgencyLabel } from './utils.js';
import { validLightTheme, validDarkTheme } from './themes.js';
import { resolveRuntimeAccent, resolveRuntimeMuted } from './chartColors.js';

// --- Default filter shape (single source of truth) ---
export const DEFAULT_FILTERS = {
    tag: { values: ['merge'], mode: 'exclude' },
    author: { values: [], mode: 'include' },
    repo: { values: [], mode: 'include' },
    urgency: { values: [], mode: 'include' },
    impact: { values: [], mode: 'include' },
    dateFrom: '',
    dateTo: '',
};

// --- Initial state loader ---
// Reads persisted preferences from localStorage and constructs the
// reducer's initial state. Runs exactly once when AppProvider mounts.
export function loadInitialState() {
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
// Pure function of (state, action). All DOM mutations live in the
// AppProvider's useEffect hooks, not here.
export function reducer(state, action) {
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

// --- Filter predicate ---
// Applied in AppProvider's `filteredCommits` useMemo via useMemo deps on
// [state.data?.commits, state.filters]. Kept out of the reducer because
// filtering is a pure view over state, not a state transition.
export function filterCommits(commits, filters) {
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
