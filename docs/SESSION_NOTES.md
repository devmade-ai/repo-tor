# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard V2:** Implementation complete with role-based view levels, consistent tab layouts, and PWA support.

**Recent Updates (2026-02-10):**
- **Filter Indicator Fix** - Default filters now show visual indication on load:
  - `updateFilterIndicator()` now shows "X of Y" whenever any filter is active, regardless of whether the filter changes the commit count
  - Previously, the indicator was hidden when `filtered.length === total` (e.g., when no merge commits exist to exclude)
  - Filter badge (count on toggle button) was already correct — only the text indicator was affected
- **Privacy Mode Removed** - Sanitization is now always-on (names and messages always anonymized):
  - Removed `btn-sanitize` eye toggle button from header
  - Removed Privacy Mode toggle from Settings panel
  - Removed `initSanitizeMode()`, `applySanitizeMode()`, `toggleSanitizeMode()` functions from ui.js
  - `sanitizeName()` and `sanitizeMessage()` in utils.js now always anonymize (no `isSanitized` guard)
  - Removed `isSanitized` from state.js and `sanitized` localStorage key
  - Security tab commit details always show `[Details hidden]`
  - Build: 110KB JS bundle (down from 112KB)
- **Architecture Decision Record** - Documented vanilla JS decision in `docs/ADR-001-vanilla-js.md`:
  - Explains why no framework was adopted, trade-offs accepted, and when to reconsider
- **Code Refactoring** - Three improvements to dashboard codebase organization:
  - **Template helpers**: Added `renderUrgencyBar()`, `renderImpactBar()`, `renderStatCard()` to `utils.js` — eliminates 6 duplicated urgency/impact bar implementations
  - **Event delegation complete**: Migrated all remaining `addEventListener` with init flags (activity, work, health, summary, period, security repo, load-more) into single `setupDelegatedHandlers()` — removed 4 `*HandlersInitialized` flags from state.js and all `setTimeout` workarounds
  - **tabs.js split**: Monolithic 2,100-line `tabs.js` split into 10 focused modules under `js/tabs/` (timeline, progress, contributors, security, health, tags, timing, summary, discover, delegated-handlers) + barrel `index.js`. Old `tabs.js` now re-exports from barrel for backward compatibility. Build output unchanged (112KB).
- **Dashboard module structure** - `js/tabs/` directory:
  - `timeline.js` (renderTimeline)
  - `progress.js` (renderProgress)
  - `contributors.js` (renderContributors)
  - `security.js` (renderSecurity)
  - `health.js` (renderHealth)
  - `tags.js` (renderTags)
  - `timing.js` (renderTiming, renderDeveloperPatterns)
  - `summary.js` (renderSummary)
  - `discover.js` (renderDiscover + metrics + file insights + comparisons)
  - `delegated-handlers.js` (setupDelegatedHandlers — single click handler for all data-* attrs)
  - `index.js` (barrel re-export)
- **PWA Rewrite** - Complete rewrite of PWA install + update system in dedicated `dashboard/js/pwa.js` module:
  - Switched from `registerType: 'autoUpdate'` to `'prompt'` for explicit control over SW activation
  - Uses `virtual:pwa-register` (vanilla JS) instead of `injectRegister: 'script'`
  - Install: `beforeinstallprompt` for Chromium + fallback modal with browser-specific instructions for Safari/Firefox
  - Updates: Hourly polling via `setInterval`, green "Update" button in header when available, `visibilitychange` passive checks
  - Removed all PWA code from `export.js` — clean separation of concerns
- **PWA Install Button Fix** - Install button no longer shows after app has been installed:
  - Persist installed state to localStorage (`pwaInstalled` flag)
  - Check both localStorage flag and `display-mode: standalone` media query
  - `beforeinstallprompt` handler guarded against both conditions
  - Settings panel still shows install section in browser (for reference) but hides it in standalone
- **Default Filters Fix** - `applyUrlState()` no longer overwrites default date filters:
  - Date filters now only applied from URL when URL actually contains date params
  - Previously, empty URL params would clear the defaults set by `applyDefaultFilters()`
- **Filter Checkbox Alignment** - Dropdown checkboxes now properly align with text:
  - Added `flex-shrink: 0` and explicit `width`/`height` (14px) to checkboxes
  - Added `line-height: 1.25` to option labels for consistent vertical alignment
- **Default Filters** - First-time visitors now see sensible defaults:
  - Tag filter: exclude `merge` commits by default
  - Date filter: starts at December 1, 2025 by default
  - Defaults only apply on first visit (no localStorage, no URL params)
  - User changes are saved to localStorage and override defaults on return visits
  - Config lives in `FILTER_DEFAULTS` in `js/state.js` for easy adjustment

**Recent Updates (2026-02-09):**
- **PWA Install Button Fix** - Install button no longer appears when running as an installed PWA:
  - Added `isStandalone` flag to guard against `beforeinstallprompt` firing in standalone mode
  - Standalone detection now hides button and entire PWA settings section
  - Added `flex-wrap` to header buttons so they wrap properly on mobile
- **PWA Pull-to-Refresh Update Fix** - Pull-to-refresh (and page reload) now properly updates to the latest PWA version:
  - Added `controllerchange` listener to auto-reload when new service worker takes control
  - Added `visibilitychange` listener to check for updates when returning to the app
  - Updated `checkForUpdate()` to reload instead of telling users to "close and reopen"
  - Updated Settings panel text to reflect new behavior
- **Mobile Graph Optimization** - All charts and heatmaps optimized for mobile:
  - Chart containers: responsive heights (h-48 md:h-64 pattern) for all 10 charts
  - Heatmap: smaller cells (20px vs 28px), reduced grid min-width (280px vs 400px), smaller labels on mobile
  - Chart.js: mobile-aware font sizes (9px), increased label skipping, tighter legends
  - Cards: tighter padding (16px) and smaller stat text on mobile
  - Added `isMobile()` helper in state.js used across all chart modules
- **UI/UX Remaining Items** - Completed all 9 remaining UI/UX backlog items:
  - Tab names fixed: "Breakdown"/"Risk" renamed to "Work"/"Health" to match code/docs
  - Filter labels: "Inc"/"Exc" replaced with "Include"/"Exclude"
  - Load More: Changes list now has "Load more" button instead of hard 100 cap
  - Lazy rendering: `applyFilters()` only re-renders active tab, others marked dirty
  - Event delegation: Replaced per-render `addEventListener` with single delegated handler on `#dashboard`
  - Custom heatmap tooltips: `title` attributes replaced with instant custom tooltip (touch + mouse)
  - Build-time Tailwind: Migrated from CDN to Tailwind v4 Vite plugin (`@tailwindcss/vite`)
  - Keyboard-navigable filters: Enter/Space to open dropdowns, arrows to navigate, Escape to close
  - Color-only bars: Added percentage text labels below all urgency/impact stacked bars

**Previous Updates (2026-02-07):**
- **UI/UX Review & Fixes** - Comprehensive review identifying 21 issues. Fixed 10 most impactful:
  - **Bug fixes:** Filter badge always visible, `hasActiveFilters()` always true, toast destroying DOM, duplicate function, artificial delay
  - **UX improvements:** Drag-and-drop file upload, filter badge count, active date preset
  - **Accessibility:** Keyboard-navigable collapsible headers, aria-labels on icon buttons

**Previous Updates (2026-02-06):**
- **Doc Cleanup** - Removed completed items from TODO.md, fixed outdated hosting instructions in ADMIN_GUIDE.md (now references Vite dev server and `dist/` build), corrected HISTORY.md file references post-modularization
- **Dashboard Modularization** - Split monolithic 6,927-line index.html into ES modules:
  - `index.html` (889 lines) - HTML structure only
  - `styles.css` (1,200 lines) - Extracted CSS
  - `js/state.js` (178) - Shared state and config
  - `js/utils.js` (524) - Utility functions, tag helpers, holidays, sanitization
  - `js/filters.js` (479) - Filter system and persistence
  - `js/ui.js` (448) - Detail pane, settings, dark mode, collapsible sections
  - `js/charts.js` (475) - Chart.js timeline and heatmap rendering
  - `js/tabs.js` (2,028) - Tab-specific render functions (largest module)
  - `js/data.js` (231) - Data loading and combining
  - `js/export.js` (495) - PDF export, URL state, PWA support
  - `js/main.js` (107) - Entry point, tab navigation, initialization
  - Vite build passes cleanly, bundling all modules for production
- **PDF Export Fix** - Fixed blank white page: uses TAB_MAPPING for correct tab containers, converts canvases to images, overrides dark theme colors for readability
- **Button Icons** - Install and PDF buttons now have distinct icons (app-install vs document) with always-visible labels
- **PWA Update Mechanism** - Added "Check for Updates" button in Settings with status feedback and usage instructions

**Previous Updates (2026-02-05):**
- **Vite + PWA Plugin** - Migrated to Vite with vite-plugin-pwa for proper PWA support
  - `npm run dev` for local development with hot reload
  - `npm run build` for production build to `dist/`
  - Workbox-powered service worker with runtime caching for CDN assets
  - Auto-update service worker (registerType: 'autoUpdate')
  - GitHub Actions workflow updated to build with Vite

**Previous Updates (2026-02-04):**
- Fixed PWA installation paths for GitHub Pages compatibility
- Added loading states for detail pane (skeleton placeholders + fade-in)
- Updated PDF export for new 4-tab layout
- Added shareable links for detail pane state (URL params)
- Added urgency and impact filter dropdowns
- Added quick select filter presets (30 days, 90 days, This year, Last year)
- Added techy theme (JetBrains Mono font, grid background, glow effects)
- Replaced global filter mode with per-filter Include/Exclude toggles
- Converted filters to multi-select checkboxes
- Added PWA install section to Settings panel with status and manual instructions

**Previous Updates (2026-01-28):**
- Fixed bug count inconsistency: Overview and Breakdown tabs now both count 'bugfix' OR 'fix' tags
- Fixed chart legend text color using Chart.defaults.color for proper theme support
- Shortened chart axis labels to use abbreviated format (50k instead of 50,000)

**Role-Based View Levels:** Different audiences see appropriate detail levels:
- **Executive**: Aggregated totals, weekly heatmap, summary drilldowns + interpretation guidance
- **Management**: Per-repo groupings, daily heatmap, summary drilldowns + interpretation guidance
- **Developer**: Individual contributors, hourly heatmap, full commit lists (no hints needed)

**Extraction System:** AI analysis complete. 1163 commits processed across 6 repositories. All previously malformed commits have been fixed.

**Feed Optimization:**
- Added `extract-api.js` for API-based extraction (no cloning required, faster)
- Added `merge-analysis.js` for ~10x token reduction during "feed the chicken" workflow

**GitHub CLI Setup:** Authentication for API extraction with multiple options:
- `.env` file support - Store `GH_TOKEN` for AI sessions (gitignored)
- `scripts/setup-gh.sh` - Cross-platform installation and auth
- Auto-loading - Scripts read from `.env` automatically
- See docs/USER_ACTIONS.md for detailed setup instructions

**Live Dashboard:** https://devmade-ai.github.io/repo-tor/

---

## Dashboard V2 Progress

### Completed

- [x] **Aggregation script** - `scripts/aggregate-processed.js` reads from processed/ data
- [x] **4-tab structure** - Overview, Activity, Work, Health
- [x] **Tab mapping** - JavaScript maps new tabs to show multiple content containers
- [x] **Urgency/Impact in Health tab** - Distribution bars, operational health cards
- [x] **Urgency/Planned in Overview** - Executive summary cards
- [x] **Detail pane** - Slide-out panel (desktop) / bottom sheet (mobile)
- [x] **Urgency trend chart** - Line chart showing average urgency by month
- [x] **Impact over time chart** - Stacked bar chart by month
- [x] **Urgency by contributor** - Per-person breakdown with stacked bars
- [x] **Impact by contributor** - Per-person breakdown with stacked bars
- [x] **Click interactions** - Cards, charts, and bars all trigger detail pane

### Detail Pane Features

- Slide-out panel from right (30% width on desktop)
- Bottom sheet on mobile (85% viewport height)
- Click-outside or Escape key to close
- Smooth transition animations
- **View-level aware drilldowns:**
  - Developer: Full commit list with message, author, date, repo, tags
  - Executive/Management: Summary stats (commit counts, contributor counts, tag breakdown, date range)

### Role-Based View Levels

| View | Contributors | Heatmap | Drilldown |
|------|-------------|---------|-----------|
| Executive | "All (45 contributors)" | Weekly blocks | Stats only |
| Management | "repo-api (12 contributors)" | Day-of-week bars | Stats + repo split |
| Developer | Individual names | 24×7 hourly grid | Full commit list |

**Full coverage across all tabs:**
- **Health tab**: Urgency/Impact by contributor → aggregated by total/repo/individual
- **Security tab**: Executive sees count only, Management sees per-repo breakdown
- **Timeline**: Executive sees weekly summaries, Management sees daily summaries
- **Tags/Progress**: Drilldowns automatically use view-level-aware detail pane

Access via the "View Level" selector in the filter sidebar. Selection persists in localStorage.

### Click Interactions

The following elements open the detail pane:

**Overview Tab:**
- Features Built card → shows feature commits
- Bugs Fixed card → shows bugfix commits
- Avg Urgency card → shows reactive commits
- % Planned card → shows planned commits

**Health Tab:**
- Security/Reactive/Weekend/After Hours cards → filtered commits
- Urgency distribution bars → commits by urgency level
- Impact distribution bars → commits by impact category
- Urgency by contributor → contributor's commits
- Impact by contributor → contributor's commits

**Work Tab:**
- Tag breakdown bars → commits with that tag
- Contributor cards → contributor's commits

---

## Tab Mapping

```javascript
const TAB_MAPPING = {
    'overview': ['tab-overview'],
    'activity': ['tab-activity', 'tab-timing'],
    'work': ['tab-progress', 'tab-tags', 'tab-contributors'],
    'health': ['tab-security']
};
```

---

## Key Files

| File | Purpose |
|------|---------|
| `vite.config.js` | Vite + PWA plugin configuration |
| `dashboard/index.html` | Dashboard HTML structure (modularized) |
| `dashboard/styles.css` | Dashboard CSS styles |
| `dashboard/js/main.js` | Dashboard JS entry point |
| `dashboard/js/pwa.js` | PWA install + update module |
| `dashboard/js/state.js` | Shared state and config constants |
| `dashboard/js/tabs.js` | Tab rendering functions (largest module) |
| `scripts/setup-gh.sh` | GitHub CLI installation and authentication |
| `scripts/extract-api.js` | GitHub API-based extraction (no cloning) |
| `scripts/aggregate-processed.js` | Aggregation from processed/ data |
| `scripts/merge-analysis.js` | Merge AI analysis with raw git data (optimized feed) |
| `scripts/save-commit.js` | Save individual commit files (legacy, full objects) |
| `scripts/pending.js` | Generate pending batches from manifest |
| `dashboard/data.json` | Overall aggregated data |
| `dashboard/repos/*.json` | Per-repo aggregated data |
| `docs/EXTRACTION_PLAYBOOK.md` | Extraction workflow |

---

## Remaining Work

### Research (Optional)
- [ ] Device/platform attribution (mobile vs desktop commits)
- [ ] Merge commit filtering options

### Extraction Progress

| Repo | Status | Commits |
|------|--------|---------|
| chatty-chart | Complete | 42 |
| repo-tor | Complete | 250 |
| social-ad-creator | Complete | 184 |
| model-pear | Complete | 318 |
| coin-zapp | Complete | 81 |
| synctone | Complete | 288 |

**Total Processed:** 1163 commits
**Remaining:** 0 - All repos complete!

### Storage Migration

Migrated from batch files to individual commit files:

**Old:** `processed/<repo>/batches/batch-NNN.json` (15 commits each)
**New:** `processed/<repo>/commits/<sha>.json` (1 commit per file)

Benefits:
- Simpler deduplication (file existence = processed)
- Atomic edits (fix one commit without touching others)
- Cleaner git diffs

---

*Last updated: 2026-02-10 - Fixed filter indicator for defaults on load. Removed privacy mode toggle (sanitization always-on).*
