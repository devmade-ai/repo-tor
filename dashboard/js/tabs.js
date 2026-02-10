// This file now re-exports from the split tab modules in ./tabs/
// All render functions and exports remain available at the same import paths.
export {
    renderTimeline,
    renderProgress,
    renderContributors,
    renderSecurity,
    renderHealth,
    renderTags,
    renderTiming,
    renderDeveloperPatterns,
    renderSummary,
    renderDiscover,
    renderFileInsights,
    renderComparisons,
    DISCOVER_METRICS,
    getHumorousFileName,
    discoverState,
    getRandomMetrics,
    setupDelegatedHandlers
} from './tabs/index.js';
