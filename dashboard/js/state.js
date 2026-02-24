// === Shared Global State ===
// All modules import this to access/modify shared state.
// Centralizes mutable globals, configuration constants, and their helpers.

// Global state — synced from React AppContext for use by pure utility functions.
// Only properties actually read by utils.js functions are kept here.
export const state = {
    data: null,
    useUTC: false,
    workHourStart: 8,
    workHourEnd: 17,
    currentViewLevel: 'developer',
};

// === Anonymous Name Mapping ===
export const anonymousNames = ['Developer A', 'Developer B', 'Developer C', 'Developer D', 'Developer E', 'Developer F', 'Developer G', 'Developer H'];
export const authorAnonMap = new Map();

// === View Level Configuration ===
// Different data granularity for different audiences
export const VIEW_LEVELS = {
    executive: {
        label: 'Executive',
        contributors: 'total',      // Single aggregate: "45 contributors"
        timing: 'week',             // Weekly buckets only
        drilldown: 'summary',       // Stats only, no commit list
        showAuthorNames: false,
        showCommitMessages: false
    },
    management: {
        label: 'Management',
        contributors: 'repo',       // Group by project
        timing: 'day',              // Daily buckets
        drilldown: 'summary',       // Stats, not individual commits
        showAuthorNames: true,
        showCommitMessages: false
    },
    developer: {
        label: 'Developer',
        contributors: 'individual', // Per-person (current behavior)
        timing: 'hour',             // Hourly detail
        drilldown: 'commits',       // Full commit list
        showAuthorNames: true,
        showCommitMessages: true
    }
};

export function getViewConfig() {
    return VIEW_LEVELS[state.currentViewLevel] || VIEW_LEVELS.developer;
}

// === Tab Navigation (V2: 4 grouped tabs + Projects directory) ===
// Map new tabs to the content containers they should show
export const TAB_MAPPING = {
    'overview': ['tab-overview'],
    'activity': ['tab-activity', 'tab-timing'],
    'work': ['tab-progress', 'tab-tags', 'tab-contributors'],
    'health': ['tab-security'],
    'discover': ['tab-discover'],
    'projects': ['tab-projects']
};
