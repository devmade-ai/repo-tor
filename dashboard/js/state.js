// === Shared Global State ===
// All modules import this to access/modify shared state.
// Centralizes mutable globals, configuration constants, and their helpers.

export const state = {
    data: null,
    charts: {},
    // Multi-select filters with per-filter modes
    filters: {
        tag: { values: [], mode: 'include' },
        author: { values: [], mode: 'include' },
        repo: { values: [], mode: 'include' },
        urgency: { values: [], mode: 'include' },
        impact: { values: [], mode: 'include' },
        dateFrom: '',
        dateTo: ''
    },
    useUTC: false,
    isDarkMode: false,
    workHourStart: 8,
    workHourEnd: 17,
    isSanitized: false,
    detailPaneOpen: false,
    currentDetailState: null, // Tracks what's shown in detail pane: { type: 'tag'|'author'|'impact'|..., value: string }
    currentViewLevel: 'developer',
    filterSidebarOpen: false,
    settingsPaneOpen: false,
    // Handler initialized flags
    activityCardHandlersInitialized: false,
    workCardHandlersInitialized: false,
    healthCardHandlersInitialized: false,
    summaryCardHandlersInitialized: false,
    // Current filtered commits cache
    currentCommits: [],
    // Active tab tracking for lazy rendering
    activeTab: 'overview',
    dirtyTabs: new Set()
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

export function renderSectionGuidance(sectionName, containerId) {
    const guidance = getSectionGuidance(sectionName);
    const container = document.getElementById(containerId);
    if (!container) return;

    // Find or create guidance element
    let guidanceEl = container.parentElement?.querySelector('.section-guidance');

    if (guidance) {
        if (!guidanceEl) {
            guidanceEl = document.createElement('p');
            guidanceEl.className = 'section-guidance text-xs text-blue-600 dark:text-blue-400 mb-3 flex items-center gap-1';
            guidanceEl.innerHTML = `<svg class="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clip-rule="evenodd"></path></svg><span></span>`;
            container.parentElement?.insertBefore(guidanceEl, container);
        }
        guidanceEl.querySelector('span').textContent = guidance;
        guidanceEl.style.display = '';
    } else if (guidanceEl) {
        guidanceEl.style.display = 'none';
    }
}

export function updateAllSectionGuidance() {
    // Map section names to their content container IDs
    const sectionMappings = {
        'developer-patterns': 'developer-patterns',
        'who-does-what': 'contributor-work-types',
        'complexity-by-contributor': 'contributor-complexity-chart',
        'urgency-by-contributor': 'urgency-by-contributor',
        'impact-by-contributor': 'impact-by-contributor',
        'security-commits': 'security-list',
        'urgency-distribution': 'urgency-breakdown',
        'activity-heatmap': 'heatmap'
    };

    Object.entries(sectionMappings).forEach(([section, containerId]) => {
        renderSectionGuidance(section, containerId);
    });
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
