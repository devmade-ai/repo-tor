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

// === Role-Specific Section Guidance ===
// Helps different audiences interpret the data appropriately
export const SECTION_GUIDANCE = {
    'developer-patterns': {
        executive: 'Team work patterns — high weekend/after-hours % may signal burnout risk or deadline pressure',
        management: 'Individual schedules — use for 1:1 conversations about work-life balance',
        developer: null  // Developers understand this data
    },
    'who-does-what': {
        executive: 'Team specialization — balanced distribution indicates healthy knowledge sharing',
        management: 'Workload distribution — watch for overloaded individuals or siloed expertise',
        developer: null
    },
    'complexity-by-contributor': {
        executive: 'Complex work allocation — concentrated complexity = knowledge risk',
        management: 'Task distribution — spread complex work to build team capability',
        developer: null
    },
    'urgency-by-contributor': {
        executive: 'Reactive vs planned work — high urgency indicates process or planning gaps',
        management: 'Who is firefighting — may need support or process improvements',
        developer: null
    },
    'impact-by-contributor': {
        executive: 'Where effort goes — track alignment with strategic priorities',
        management: 'Resource allocation — ensure effort matches project priorities',
        developer: null
    },
    'security-commits': {
        executive: 'Security posture — trend matters more than absolute count',
        management: 'Track by project — prioritize review for affected repositories',
        developer: null
    },
    'activity-timeline': {
        executive: 'Overall velocity — look for consistent output rather than spikes',
        management: 'Team rhythm — identify capacity for new initiatives',
        developer: null
    },
    'urgency-distribution': {
        executive: 'Planned vs reactive — healthy teams spend most time on planned work (urgency 1-2)',
        management: 'Process health — high reactive % may indicate technical debt or unclear requirements',
        developer: null
    },
    'activity-heatmap': {
        executive: 'When work happens — significant off-hours work may indicate staffing or deadline issues',
        management: 'Team availability patterns — useful for meeting scheduling and on-call planning',
        developer: null
    }
};

export function getSectionGuidance(sectionName) {
    const guidance = SECTION_GUIDANCE[sectionName];
    if (!guidance) return null;
    return guidance[state.currentViewLevel] || null;
}


// === Default Filter Configuration ===
// Applied on first visit (no localStorage, no URL params)
export const FILTER_DEFAULTS = {
    tag: { values: ['merge'], mode: 'exclude' },
    dateFrom: '2025-12-01'
};

// === Mobile Detection ===
// Used by chart modules for responsive font sizes, label skipping, etc.
export function isMobile() {
    return window.innerWidth < 640;
}

// === Tab Navigation (V2: 4 grouped tabs) ===
// Map new tabs to the content containers they should show
export const TAB_MAPPING = {
    'overview': ['tab-overview'],
    'activity': ['tab-activity', 'tab-timing'],
    'work': ['tab-progress', 'tab-tags', 'tab-contributors'],
    'health': ['tab-security'],
    'discover': ['tab-discover']
};
