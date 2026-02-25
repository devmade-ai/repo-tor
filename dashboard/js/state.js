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
// Fix: Extended from 8 to 20 names to reduce collisions. Previously, with 9+
// contributors in anonymous mode, names wrapped around (Author 1 and Author 9
// both became "Developer A"), which was confusing in the dashboard.
export const anonymousNames = [
    'Developer A', 'Developer B', 'Developer C', 'Developer D',
    'Developer E', 'Developer F', 'Developer G', 'Developer H',
    'Developer J', 'Developer K', 'Developer L', 'Developer M',
    'Developer N', 'Developer P', 'Developer Q', 'Developer R',
    'Developer S', 'Developer T', 'Developer U', 'Developer V',
];
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

// === Dashboard Constants ===
// Centralized thresholds and magic numbers used across tab components.
// Keeping them here prevents inconsistency when values are used in multiple places.
export const THRESHOLDS = {
    // Complexity color thresholds (used in TimelineTab, ProgressTab)
    complexityHigh: 4,    // complexity >= 4 → high (purple)
    complexityMid: 2,     // complexity >= 2 → medium (blue)
    // Work hours color thresholds (used in TimingTab developer patterns)
    workHoursGood: 70,    // >= 70% during work hours → green
    workHoursMixed: 50,   // >= 50% → amber; below → red
    weekendLow: 10,       // <= 10% weekend → green
    weekendMid: 25,       // <= 25% → amber; above → red
    // Chart display limits
    chartDateLimit: 60,   // Max days shown in timeline charts
    topDevelopers: 6,     // Max developers in timing patterns
};

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
