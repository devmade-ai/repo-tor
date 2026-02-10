// Barrel file — re-exports all tab render functions from their individual modules.
// Consumers import from './tabs/index.js' (or './tabs.js' via the old path).

export { renderTimeline } from './timeline.js';
export { renderProgress } from './progress.js';
export { renderContributors } from './contributors.js';
export { renderSecurity } from './security.js';
export { renderHealth } from './health.js';
export { renderTags } from './tags.js';
export { renderTiming, renderDeveloperPatterns } from './timing.js';
export { renderSummary } from './summary.js';
export { renderDiscover, renderFileInsights, renderComparisons, DISCOVER_METRICS, getHumorousFileName, discoverState, getRandomMetrics } from './discover.js';
export { setupDelegatedHandlers } from './delegated-handlers.js';
