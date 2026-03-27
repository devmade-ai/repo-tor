# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard V2:** Implementation complete with role-based view levels, consistent section layouts, and PWA support.

**Recent Updates (2026-03-27 — Mobile UX improvements):**
- Reduced header size on mobile (smaller padding, title, buttons)
- Changed "commits" to "changes" in header subtitle (plain language for non-technical users)
- Header shows "Showing X of Y changes · Filtered" when filters are active, clickable to open filter sidebar
- Added hamburger menu grouping secondary actions (Quick Guide, PDF, Install, Update, version)
- Added Quick Guide tutorial modal (4-step walkthrough, auto-shows on first visit)
- Added responsive pagination across 7 sections via `useShowMore` hook:
  - DetailPane: 10 mobile / 20 desktop
  - Timeline commits: 10 mobile / 25 desktop (was 100)
  - Progress epics: 6 mobile / 12 desktop
  - Contributors: 6 mobile / 8 desktop
  - Tags: 8 mobile / all desktop
  - Discover files: 5 mobile / 10 desktop
  - Projects: 6 mobile / 12 desktop
- Extracted shared hooks: `useShowMore`, `useEscapeKey`, `useClickOutside`
- Extracted shared component: `ShowMoreButton`
- Cleaned redundant `const mobile = isMobile` aliasing across 4 section files
- Fixed `hasOwnProperty` → `in` operator in Progress
- Simplified redundant null-or-empty check in Contributors
- Removed redundant `handleDone` wrapper in QuickGuide
- Moved DetailPane empty state inline style to `.detail-pane-empty` CSS class
- Moved Projects error card inline style to `.projects-error` CSS class
- Added arrow key navigation to HamburgerMenu dropdown (WAI-ARIA menu pattern)
- Added auto-focus first menu item when HamburgerMenu opens
- Added focus management to QuickGuide modal (focuses container on open)
- Imported version from package.json in HamburgerMenu (was hardcoded v1.0.0)
- Added `aria-label` to ShowMoreButton for screen readers
- Added `type="button"` to DetailPane close button
- Added arrow key + Enter/Space keyboard test scenarios to TESTING_GUIDE.md
- Centralized pagination limits in `PAGE_LIMITS` constant in state.js
- Removed `className` prop from ShowMoreButton (spacing now consistent via CSS)

**New files:**
- `dashboard/js/hooks/useShowMore.js` — Pagination hook
- `dashboard/js/hooks/useEscapeKey.js` — Escape key listener hook
- `dashboard/js/hooks/useClickOutside.js` — Click-outside listener hook
- `dashboard/js/components/ShowMoreButton.jsx` — Shared "Show more" button
- `dashboard/js/components/HamburgerMenu.jsx` — Hamburger dropdown menu
- `dashboard/js/components/QuickGuide.jsx` — Tutorial modal

**Modified files:** Header.jsx, DetailPane.jsx, Timeline.jsx, Contributors.jsx, Tags.jsx, Progress.jsx, Discover.jsx, Projects.jsx, styles.css

**Branch:** `claude/check-mobile-header-size-ihXVc`

**Previous Updates (2026-03-26 — glow-props alignment + implementations):**
- Aligned CLAUDE.md with glow-props standard structure
- Added Suggested Implementations section (PWA, Debug, Icons, PDF, Timer fix, HTTPS Proxy)
- Standardized Principles to glow-props 7 (moved extras to AI Notes)
- Standardized Documentation section to 9-file managed set
- Moved `@coder`/`@data` personas into AI Notes
- Renamed `docs/AI_LESSONS.md` → `docs/AI_MISTAKES.md` (standard name)
- Renamed `docs/USER_TESTING.md` → `docs/TESTING_GUIDE.md` (standard name)
- Updated all active references across docs, README.md, and source code
- Fixed PWA manifest: added `id: '/'` and `prefer_related_applications: false`
- Added PDF download button to Header (calls `window.print()`)
- Enhanced print CSS: text color overrides, link styles, section break-inside, header styling
- Added `no-print` to TabBar, FilterSidebar, DetailPane, SettingsPane in App.jsx

**Previous Updates (2026-03-23 — Documentation audit fixes):**
- Fixed README.md: `js/tabs/` → `js/sections/` (stale directory reference from March 4 rename)
- Fixed CLAUDE.md: `TABS_PATH=dashboard/js/tabs` → `SECTIONS_PATH=dashboard/js/sections` (stale path constant)

**Previous Updates (2026-03-15 — few-lap live URL):**
- Added `liveUrl` for few-lap in `projects.json` so it appears under Live Projects in the dashboard

**Previous Updates (2026-03-13 — Batch Preamble + Playbook Rename):**
- Created `config/batch-preamble.md` — analysis instructions embedded in every batch by `pending.js`
- Renamed `docs/EXTRACTION_PLAYBOOK.md` → `docs/DATA_OPERATIONS.md` — trimmed duplicated content, references preamble
- All analysis fields now required (no blanks) — risk, debt, epic, semver no longer optional
- Updated all references across CLAUDE.md, docs, and scripts

**Previous Updates (2026-03-13 — glow-props CLAUDE.md sync):**
- Adopted 8 new patterns from glow-props cross-project CLAUDE.md
- Added trigger system (10 single-word analysis commands: `review`, `audit`, `docs`, `mobile`, `clean`, `performance`, `security`, `debug`, `improve`, `start`)
- Added Download as PDF pattern (`window.print()`, `no-print` class, print-friendly CSS)
- Added commit metadata footers format with full field definitions to CLAUDE.md
- Changed cleanup rule: commented-out code needs `// KEEP:` with reason to be preserved
- Added 2 new prohibitions: no interactive prompts, no feature removal during cleanup without checking docs
- Added bug report ASK rule to AI Notes (clarify before coding)
- Enhanced USER_TESTING.md checklist item with structured test format guidance
- Updated cross-project reference last reviewed date to 2026-03-13

**Previous Updates (2026-03-04 — Cross-Tab Audit + 6 Fixes):**
- **Fix: Projects filter bug** — Commit counts now use `filteredCommits` instead of unfiltered `state.data?.commits`.
- **Fix: Timeline UTC mismatch** — Trend charts now use `getUTCMonthKey()` instead of `.substring(0,7)`.
- **UX: Bottom padding** — Added `pb-12` to content wrapper for breathing room at page bottom.
- **UX: Section separators** — Subtle `<hr>` dividers between stacked sections in Timeline and Breakdown tabs.
- **UX: Discover file insights** — Shows loading spinner during Phase 1 instead of "No file data available".
- **Fix: Health fallback** — `||` → `??` for summary breakdown fallbacks (prevents empty `{}` issues).
- **Files changed**: `App.jsx`, `Projects.jsx`, `Timeline.jsx`, `Discover.jsx`, `Health.jsx`

**Previous Updates (2026-03-04 — Section Reorganization + Terminology Cleanup):**
- **Renamed `tabs/` → `sections/`** — All section component files moved from `js/tabs/` to `js/sections/`. Dropped "Tab" suffix from all filenames and component names (e.g., `HealthTab.jsx` → `Health.jsx`, `TimelineTab` → `Timeline`). "Tab" now refers exclusively to the 6 top-level navigation buttons; everything rendered within a tab is a "section".
- **Merged Security into Health** — SecurityTab deleted. Security events now render as a CollapsibleSection within Health.jsx, view-level aware (executive/management/developer).
- **Moved trend charts to Timeline** — Urgency trend, impact over time, and debt trend line charts moved from Health (via useHealthData) to Timeline section. Computed inline via useMemo in Timeline.jsx.
- **Moved per-contributor urgency/impact to Contributors** — Per-contributor urgency and impact bar sections moved from Health to Contributors section. Uses UrgencyBar/ImpactBar components from HealthBars.jsx.
- **Discover Phase 1 support** — Added `calcCodeStats()` to aggregate-processed.js (summary.codeStats). Discover now derives 9 of 11 metrics from summary data during Phase 1 instead of showing a spinner.
- **useHealthData simplified** — Removed trends and per-contributor computations (moved to their respective sections). Now returns only breakdown data.
- **State constant renamed** — `TAB_MAPPING` → `TAB_SECTIONS` in state.js to reflect terminology.
- **EmbedRenderer updated** — Imports, variable names, and embed ID mappings updated for new section paths. Trend chart embed IDs now map to Timeline instead of Health.
- **Files changed**: All files in `dashboard/js/sections/` (renamed from tabs/), `dashboard/js/App.jsx`, `dashboard/js/state.js`, `dashboard/js/hooks/useHealthData.js`, `dashboard/js/components/EmbedRenderer.jsx`, `scripts/aggregate-processed.js`, `CLAUDE.md`

**Previous Updates (2026-03-04 — Phase 1 Pre-Aggregated Fallbacks):**
- **Pre-aggregated fallbacks** — Replaced loading spinners with actual data during Phase 1 for 6 sections. Each section uses summary data from the initial `data.json` load, showing real charts/breakdowns instantly.
- **New aggregations in aggregate-processed.js**: `calcRepoCommitCounts()` and `calcHourlyHeatmap()`, added to summary output.
- **Component fixes** — HealthWorkPatterns, RiskAssessment, DebtBalance handle optional click handlers (non-clickable during Phase 1).

**Previous Updates (2026-03-03 — Tab Data Usage Audit + 3 Bug Fixes):**
- **Full tab review** — Reviewed all 10 dashboard tabs for correct usage of pre-aggregated data, identifying 3 bugs and documenting which tabs have/lack pre-aggregated fallbacks.
- **Fix 1: Filter fallback to unfiltered data** — SummaryTab, TimelineTab, ProgressTab used `commitsLoaded && filteredCommits.length > 0` as the condition to use filtered commits. When filters excluded ALL commits, this fell through to the unfiltered summary data, showing wrong numbers. Fixed: changed to `commitsLoaded` (always use filtered commits once loaded, even if empty).
- **Fix 2: `||` → `??` in utils.js and DiscoverTab** — `getAdditions()`, `getDeletions()`, `getFilesChanged()` in utils.js used `||` which treats `0` as falsy. Same pattern in DiscoverTab (9 instances of `c.stats?.additions || 0`). Fixed to use `??` (nullish coalescing).
- **Fix 3: Local time → UTC date grouping** — TimelineTab used `substring(0, 10)` and ProgressTab used `substring(0, 7)` for date/month grouping, extracting local timezone from ISO strings. Pre-aggregated keys use UTC. Added `getUTCDateKey()`/`getUTCMonthKey()` helpers to dashboard utils.js and applied in both tabs for consistency.
- **Files changed**: `dashboard/js/utils.js`, `dashboard/js/tabs/SummaryTab.jsx`, `dashboard/js/tabs/TimelineTab.jsx`, `dashboard/js/tabs/ProgressTab.jsx`, `dashboard/js/tabs/DiscoverTab.jsx`

**Previous Updates (2026-03-03 — Pipeline Audit + Validation Fixes):**
- **Full pipeline audit** — Reviewed all extraction/processing/aggregation scripts and verified field mapping from extraction through to dashboard output.
- **save-commit.js validation hardened** — Added value validation for analysis fields (tags must be array, complexity/urgency must be integer 1-5, impact must be one of the 4 canonical values). Previously only checked for field presence, which allowed invalid values like `impact:"infra"` to pass through unchecked.
- **accumulateBucket `??` fix** — Changed `||` to `??` (nullish coalescing) for `stats.additions`/`stats.deletions` fallback. Prevents `0` being treated as falsy (theoretical edge case, no current data affected).
- **Data quality observations** — 431 commits (21%) lack `stats` field (from legacy batch-based analysis path before merge-analysis.js existed). These show 0 additions/deletions in charts. 69 commits (3%) lack `repo_id` (auto-filled by aggregation from directory name). Neither causes incorrect aggregation.

**Previous Updates (2026-03-03 — Time-Windowed Data + Weekly/Daily Pre-Aggregation):**
- **Architecture change** — Redesigned data pipeline for time-windowed reporting:
  - `aggregate-processed.js` now outputs a **summary file** (`data.json`, ~126 KB) and **per-month commit files** (`data-commits/YYYY-MM.json`)
  - Summary file contains weekly (ISO week), daily, and monthly pre-aggregated buckets with full metric breakdowns (tags, impact, risk, debt, semver, complexity, urgency, code changes, per-repo splits)
  - Initial dashboard payload reduced from **2.9 MB → 126 KB** (96% smaller)
  - Dashboard loads summary instantly, lazy-loads commit files in background for drilldowns/filters
- **Data accuracy fixes** — UTC consistency for daily/monthly aggregation (62 commits affected by timezone offset). Impact "infra" → "infrastructure" alias mapping (2 commits). All 18 verification checks pass.
- **Files changed**: `scripts/aggregate-processed.js`, `scripts/save-commit.js`, `dashboard/js/App.jsx`, `dashboard/js/AppContext.jsx`, `dashboard/js/tabs/SummaryTab.jsx`, `dashboard/js/tabs/TimelineTab.jsx`, `dashboard/js/tabs/ProgressTab.jsx`, `vite.config.js`

**Previous Updates (2026-03-03 — Fix Partial Month Cliff on Trend Charts):**
- **Bug fix** — Monthly trend charts (Features vs Bug Fixes, Impact Over Time, Urgency, Complexity, Debt) showed a misleading dramatic drop for the current month when data was incomplete (e.g., only 2 days into March vs full months with 800+ commits).
- **Root cause**: Charts rendered raw monthly counts with no handling for partial months — 39 commits (2 days) shown at equal visual weight as 800+ commits (full month).
- **Fix**: Added `excludeIncompleteLastMonth()` utility to `js/utils.js`. Applied in `ProgressTab.jsx` (features vs bugfix trend, complexity trend) and `useHealthData.js` (urgency trend → cascades to impact trend, debt trend). If the last month's latest commit day is before the 15th, that month is excluded from trend charts.
- **Files changed**: `dashboard/js/utils.js`, `dashboard/js/tabs/ProgressTab.jsx`, `dashboard/js/hooks/useHealthData.js`

**Previous Updates (2026-03-03 — Documentation Review & Corrections):**
- **Full codebase audit** — Compared all documentation against actual code. Found and fixed ~30 discrepancies across README.md, CLAUDE.md, USER_GUIDE.md, ADMIN_GUIDE.md, SESSION_NOTES.md.
- **Key fixes**: README rewritten for React/Vite era, removed Privacy Mode and Share/PDF ghost features from USER_GUIDE, fixed auto-loading data claims in ADMIN_GUIDE, replaced gh CLI section with token-based setup, corrected tab counts (5→6), corrected manifest.js false deletion claim, added decision documentation to AppContext.jsx split context pattern.
- **Code change**: Added What/Why/Alternatives comment to `AppContext.jsx` split context pattern.

**Previous Updates (2026-03-02 — Feed the Chicken: 151 New Commits):**
- **Feed the Chicken — 151 New Commits** — Incremental extraction and AI analysis of 151 new commits across 10 repos: budgy-ting (+30), canva-grid (+10), few-lap (+27), glow-props (+12), graphiki (+8), model-pear (+7), repo-tor (+13), see-veo (+14), synctone (+14), tool-till-tees (+16). All batches human-approved. Dashboard re-aggregated: 14 repos, 2097 total commits.
- **Process guardrails added** — After presenting the first batch in a wrong format (not matching DATA_OPERATIONS.md), implemented 4 guardrails: pre-flight checklist in playbook, AI Lessons entry, CLAUDE.md prohibition against improvising workflows, stronger prescriptive language in review format section.

**Previous Updates (2026-03-02 — Fix Dashboard JSON Loading Error):**
- **Bug fix** — Dashboard on Vercel (including PWA) was showing JSON parse error when loading data:
  - Root cause: Vercel SPA rewrite rule was rewriting `data.json` requests to `index.html`
  - Fix 1: Updated `vercel.json` rewrite to exclude files with extensions from SPA fallback
  - Fix 2: Moved `data.json` from `dashboard/` to `dashboard/public/` so Vite includes it in build output
  - Fix 3: Updated `aggregate-processed.js` default output to `dashboard/public/`
  - Fix 4: Added content-type guard and user-friendly error messages in `App.jsx`
  - Fix 5: Excluded `data.json` from PWA precache (`globPatterns`) — too large (2.68MB > 2MB limit), added `NetworkFirst` runtime cache instead
  - Updated all documentation references to the new path

**Previous Updates (2026-03-02 — Migrate from GitHub Pages to Vercel):**
- **Deployment migration** — Switched from GitHub Actions + GitHub Pages to Vercel:
  - Added `vercel.json` with SPA rewrite rule for client-side routing
  - Deleted `.github/workflows/deploy.yml`
  - Changed `vite.config.js` base from `'./'` to `'/'`
  - Updated all live URL references from `devmade-ai.github.io/repo-tor/` to `repo-tor.vercel.app/`
  - Updated ADMIN_GUIDE deployment section with Vercel setup instructions
- **User action required:** Connect the repo in the Vercel dashboard to enable auto-deploy. If the assigned URL differs from `repo-tor.vercel.app`, update references accordingly.

**Previous Updates (2026-02-26 — Adopt Patterns from glow-props CLAUDE.md):**
- **Cross-project pattern adoption** — Reviewed glow-props CLAUDE.md and adopted 5 patterns:
  - PWA `beforeinstallprompt` race condition fix (inline capture in index.html before module scripts)
  - Timer leak fixes in App.jsx (AbortController on data fetch, ref-tracked toast timeout)
  - SVG → PNG icon generation pipeline (`scripts/generate-icons.mjs` via Sharp)
  - Commit-msg hook now suggests all metadata footers (complexity, epic, semver)
  - Cross-project reference section added to CLAUDE.md with glow-props URL
- **Component audit** — Reviewed all 14 useEffect/timer patterns in React components; 12 already had proper cleanup, fixed the 2 that didn't
- Build passes: 67 modules, 502KB bundle

**Previous Updates (2026-02-25 — Feed the Chicken: 38 New Commits):**
- **Feed the Chicken — 38 New Commits** — Incremental extraction and AI analysis of 38 new commits across 3 repos: budgy-ting (9+2 initial setup not previously extracted→+9 net new), graphiki (3), repo-tor (26). All batches human-approved. Dashboard re-aggregated: 14 repos, 1946 total commits.

**Previous Updates (2026-02-25 — Codebase Review Round 2: UX, A11y, Code Quality):**
- **Second Codebase Audit** — Reviewed all dashboard components, styles, and infrastructure. Identified and fixed ~17 issues:
  - **UX (7 items)**: Filter labels "Inc"/"Exc"→"Include"/"Exclude", upload success toast, urgency labels to plain language ("Planned Work"/"Routine Work"/"Urgent Fixes"), work hours color legend, security tab subtitle, standardized empty states across 5 tabs, improved error messages (SyntaxError vs generic)
  - **Accessibility (4 items)**: focus-visible outlines on all interactive elements, tab active state via CSS variables (not hardcoded Tailwind), tag contrast increased (0.2/0.3→0.3/0.5 opacity), prefers-reduced-motion media query
  - **Code quality (3 items)**: Error boundary inline styles→CSS classes, centralized THRESHOLDS constants in state.js, code cleanup (note: scripts/lib/manifest.js was incorrectly listed as deleted — it is actively used by 5 scripts)
  - **Infrastructure (3 items)**: extract-api.js error.code check, PWA glob patterns narrowed (exclude large data files), sourcemap disabled in production
- Build passes: 67 modules, 502KB bundle

**Previous Updates (2026-02-24 — Codebase Review & 20 Fixes):**
- **Full Codebase Audit** — Reviewed all dashboard components, scripts, CSS, and configuration. Identified and fixed 20 issues across bugs, security, performance, and code quality:
  - **Bugs fixed**: TimelineTab render-time setState (infinite loop risk), combineDatasets metadata overwrite, stale closure in DiscoverTab handlePinToggle
  - **Security**: Command injection in update-all.sh (sed→bash param substitution), API response validation in extract-api.js, hex color URL param validation
  - **UX**: File size validation on upload (50MB limit), extended anonymous names (8→20), Easter computed algorithmically (no more 2030 expiry)
  - **Code quality**: Removed 30+ CSS !important overrides, replaced hardcoded colors with CSS variables, eliminated silent error catches, added AbortController to ProjectsTab fetch
  - **Architecture**: HealthTab decomposed from 780→630 lines (extracted HealthBars, HealthAnomalies, HealthWorkPatterns components)
  - **Scripts**: Recovery logic for pending.js atomic renames, skip count tracking in merge-analysis.js, unmapped author warnings in aggregate-processed.js
- Build passes: 66 modules, 500KB bundle

**Previous Updates (2026-02-24 — Mobile Tab Layout):**
- **Discover Metric Labels Clarified** — Replaced developer jargon in all 20 Discover tab metric labels/sub-text with plain language for non-technical users: "Avg Commit Size"→"Avg Change Size", "Deletion Ratio"→"Code Removed", "Feature:Bug Ratio"→"Features per Bug Fix", "Test Investment"→"Testing Effort", "Docs Investment"→"Documentation Effort", "Untagged Commits"→"Uncategorized Changes", "Breaking Changes"→"Major Updates", "Avg Files/Commit"→"Files per Change", "Single-File Commits"→"Focused Changes", "Refactor Work"→"Code Cleanup". All "commits" sub-text→"changes".
- **Section Reordering by Interest** — Reordered sections within each tab from most interesting/engaging to least interesting:
  - **SummaryTab**: Key Highlights → Activity Snapshot → Key Stats (insights first, raw numbers last)
  - **TimelineTab**: Commit Activity chart → Recent Changes → Lines Changed → Activity Summary (visual hook first, stats last)
  - **TimingTab**: Commits by Hour → When Work Happens → Developer Patterns → Commits by Day (peak hours first, "it's weekdays" last)
  - **ProgressTab**: Features vs Bug Fixes → Change Types → Work by Initiative → Complexity Over Time → Summary (main story first, stats last)
  - **TagsTab**: Fixed CSS order bug (parent needed `flex flex-col` for `order-*` classes to work); chart first on desktop (eye-catching), list first on mobile (scannable)
  - **HealthTab**: Health Overview → Risk Assessment → Tech Debt Balance → Prioritization → Impact → trend charts → per-person detail (red flags after overview, detailed breakdowns last)
  - **DiscoverTab**: Metrics → Head to Head → Most Changed Files (interactive cards first, file list last)
  - **ContributorsTab/SecurityTab**: No change needed (already well-ordered)
- **Mobile Tab Layout Improvements** — Comprehensive mobile UX pass across all 9 tab components:
  - **HealthTab** (biggest improvement): Collapsed 7 of 10 sections by default on mobile (trends, risk, debt, per-contributor breakdowns), improved section titles with descriptive subtitles ("How Work Gets Prioritized", "Where Changes Land"), reduced chart heights from 300px→220px
  - **TimelineTab**: Collapsed commit list and code changes chart on mobile, reduced chart heights, renamed sections for clarity ("Commit Activity", "Lines Changed", "Recent Changes")
  - **TimingTab**: Collapsed Developer Patterns on mobile, reduced chart heights from 250px→200px, renamed sections ("When Work Happens", "Commits by Hour/Day"), bumped chart font sizes from 9px→10px
  - **TagsTab**: Reordered sections — Tag Breakdown list shown first on mobile (more scannable), chart collapsed by default. Reduced doughnut height from 350px→250px
  - **ProgressTab**: Collapsed Complexity Over Time on mobile, reduced chart heights, added descriptive subtitles
  - **ContributorsTab**: Collapsed Complexity chart on mobile, added subtitles
  - **DiscoverTab**: Improved metric card layout (truncating selector, responsive value size), tighter comparison bar labels on mobile (w-16 vs w-20), renamed sections ("Most Changed Files", "Head to Head")
  - **SummaryTab**: Added descriptive subtitles to all sections
  - **CSS**: Tighter section spacing on mobile (24px→16px gap), reduced collapsible header padding, hidden subtitles on mobile to save space
  - **Chart fonts**: All tabs bumped from 9px→10px minimum for mobile readability

**Previous Updates (2026-02-24):**
- **Fix Projects Tab Loading in Production** — `projects.json` was missing from the build output because it was in `dashboard/` (not `public/`) and wasn't listed in the deploy workflow's copy step. Moved to `dashboard/public/projects.json` so Vite includes it automatically, and added it to `deploy.yml` as a safety net.
- **Fix TagsTab Initialization Crash** — Production build crashed with `ReferenceError: Cannot access 'vf' before initialization`. Root cause: `TagsTab.jsx` line 13 had `const CHART_TEXT_COLOR = CHART_TEXT_COLOR;` — a self-referential assignment that triggered the temporal dead zone. The minifier renamed the variable to `vf`, making the error opaque. Fixed by reading the `--text-secondary` CSS variable via `getComputedStyle()` at module load (matching the approach in `main.jsx` for Chart.js defaults).
- **Move Debug Pill to HTML Level** — Debug pill was part of the JS bundle (`main.jsx`), so it didn't show when the bundle failed to load — exactly when you need it most. Moved all debug pill code (error capture, diagnostics, circular buffer, click handlers) to an inline `<script>` in `index.html`. Added 10-second loading timeout that warns the user if React hasn't mounted. `main.jsx` now bridges to the HTML pill via `window.__debugPushError()` for React-specific errors (component stacks). Removed ~170 lines of duplicate code from `main.jsx`.
- **Comprehensive Code Review & Bug Fixes (24 issues)** — Full project audit identifying security, performance, accessibility, and code quality issues. All fixes applied:
  - **Security:** XSS fix in debug banner (innerHTML→DOM API), predictable temp file path→os.tmpdir(), event delegation replaces per-render listeners
  - **Performance:** Batched git stat extraction (1 command vs 2n), concurrent API fetching (5-worker pool vs sequential), getComputedStyle moved out of render path
  - **Data integrity:** Atomic pending batch deletion (write-to-temp-then-rename), fixed filesChanged calculation, added repo_id to API security events, added metadata fields (branches, currentBranch) to API extractor
  - **Accessibility:** aria-labels on stat cards/contributor cards/drop zone/date inputs, aria-controls on CollapsibleSection, consistent empty state messages
  - **Code quality:** Silent catch blocks→proper error logging (localStorage, pwa.js), stale closure fix in SettingsPane, inline styles→CSS classes, Easter dates extended 2020-2030, unused sharp dependency removed
  - **CSS/Config:** Defined missing --shadow-lg and --color-primary-alpha variables, collapsible max-height cap removed, woff2 added to PWA precache
- **Add New Repos & Projects Tab** — Added `budgy-ting` and `tool-till-tees` to config/repos.json. Created new Projects tab in dashboard showing all 14 projects with live site links and GitHub repo links. Projects split into "Live Projects" (8 with deployed sites) and "Other Repositories" (6 repo-only).
- **Feed the Chicken — 206 New Commits** — Incremental extraction and AI analysis of 206 new commits across 7 repos: glow-props (6), few-lap (16), budgy-ting (19), repo-tor (22), see-veo (41), tool-till-tees (39), graphiki (63). All batches human-approved. Dashboard re-aggregated: 14 repos, 1908 total commits.
- **Refactor extract-api.js — Remove gh CLI dependency** — Rewrote `extract-api.js` to use curl instead of `gh` CLI. Added multi-token discovery (`GH_TOKEN`, `GITHUB_TOKEN`, `GITHUB_ALL_REPO_TOKEN`). Updated `update-all.sh` to match. Tested and confirmed working. No more cloning needed for extraction.
- **Show commit messages in detail view** — `sanitizeMessage()` was hiding commit subjects with `[message hidden]`. Updated to show the full subject line in all view levels (DetailPane, TimelineTab, SecurityTab). Removed `[Details hidden]` text from SecurityTab.

**Previous Updates (2026-02-19):**
- **Embed Auto-Resize Helper Script** — Added `dashboard/public/embed.js`, a standalone script that parent pages include to auto-resize all repo-tor iframes. Eliminates need for embedders to write their own `postMessage` listener. One `<script>` tag handles everything. Docs updated to use this as the primary approach.
- **Fix Embed Resize Height Measurement** — Auto-height was measuring `document.documentElement.scrollHeight` (full page including tooltip divs and pseudo-elements outside the embed container) instead of `container.scrollHeight`. Also added 100ms delay before initial height post to let Chart.js finish its first `requestAnimationFrame` render, and de-duplicates messages by tracking last posted height.
- **Custom Background Color for Embeds** — New `?bg=` URL parameter lets embedder apps set the background color of the embedded element. Accepts hex values (`?bg=FFFFFF`) or `transparent` to inherit from the parent page. Overrides the `--bg-primary` CSS variable. Decorative grid pattern (`body::before`) is now hidden in embed mode to prevent visual artifacts with custom backgrounds.
- **Auto-Height for Embed Mode** — Embedded iframes now post their content height to the parent window via `postMessage({ type: 'repo-tor:resize', height })`. Uses `ResizeObserver` on the embed container, debounced with `requestAnimationFrame`. Parent pages add a simple `message` event listener to resize the iframe. Works with single or multiple iframes. No effect when not embedded.

**Previous Updates (2026-02-18):**
- **Custom Graph Colors for Embeds** - Embedding apps can now customize chart colors via URL parameters. Created centralized `chartColors.js` module that all tab components import from. Supports: `?palette=warm` (6 named presets), `?colors=hex1,hex2` (custom series), `?accent=hex` (primary color for heatmaps/single-dataset charts), `?muted=hex` (secondary color). Heatmap CSS updated to use `--chart-accent-rgb` CSS variable. Tag distribution colors remain semantic (not overridden). All 5 chart tab files updated to use centralized colors.
- **Implement Embed Mode** - Full iframe-based embed mode. Append `?embed=<chart-id>` to the dashboard URL to render only the requested chart(s), no header/tabs/sidebar. Supports comma-separated IDs (`?embed=id1,id2`) and theme override (`?theme=light`). Created `EmbedRenderer.jsx` component, modified `App.jsx` for embed detection, added embed CSS, and suppressed debug banner in embed mode. Invalid IDs show a helpful error linking to EMBED_REFERENCE.md.
- **Enable Element Embedding (Groundwork)** - Added `data-embed-id` attributes to all 13 embeddable chart/visualization containers across 6 tab files. Created `docs/EMBED_REFERENCE.md` (quick-reference catalog of all embeddable elements with IDs, types, tabs, and CV recommendations) and `docs/EMBED_IMPLEMENTATION.md` (implementation plan).

**Previous Updates (2026-02-16):**
- **Fix SW Update Interval Cleanup** - Stored `setInterval` handle in `pwa.js` and added `stopUpdatePolling()` export. The interval was created without saving a reference, making it impossible to clear. While the module-level execution means it only fires once (no React mount/unmount leak), storing the handle is defensive hygiene that enables cleanup if ever needed.

**Previous Updates (2026-02-15):**
- **Add Risk, Debt, Epic, Semver Fields** - Four new optional commit metadata fields added end-to-end:
  - **Risk** (`low|medium|high`) — Change risk level independent of complexity
  - **Debt** (`added|paid|neutral`) — Tech debt tracking for trend analysis
  - **Epic** (free-text) — Group commits to initiatives for effort reporting
  - **Semver** (`patch|minor|major`) — Release type classification
  - Pipeline: extract.js, extract-api.js initialize null; merge-analysis.js and save-commit.js validate when present; aggregate-processed.js computes breakdowns (overall, monthly, per-contributor)
  - Dashboard: HealthTab shows Risk Assessment bars and Debt Balance with net indicator + Debt Trend chart; ProgressTab shows Epic ("Work by Initiative") breakdown and Semver ("Change Types") doughnut; SummaryTab shows risk/debt in Key Highlights when data exists
  - All sections conditionally render — existing data without these fields works unchanged
  - Docs: COMMIT_CONVENTION.md, DATA_OPERATIONS.md, commit-msg hook all updated
- **Fix extract-api.js Missing Commits** - API extraction was missing 6 commits in canva-grid and 1 in model-pear. Root cause: `fetchCommitList()` used a manual `?page=N` loop instead of the `ghApi()` helper's `--paginate` flag. Manual pagination misses commits when the API reorders results between page requests. Fixed by replacing the manual loop with `ghApi(endpoint, { paginate: true })`. Removed untested warning from TODO.md.

**Previous Updates (2026-02-13):**
- **CLAUDE.md — Merge Development Standards** - Merged a reference template of coding standards into the existing CLAUDE.md. Added: HARD RULES section (Before Making Changes, Best Practices, Code Organization thresholds, Decision Documentation format, UX guidelines for non-technical users, Frontend rules adapted for React + Tailwind, Documentation, Cleanup, Quality Checks), Project-Specific Configuration (paths, stack, conventions filled in), Communication Style, Testing, and Prohibitions sections. Existing Principles updated to cross-reference expanded Hard Rules. AI Notes trimmed to avoid duplication.

**Previous Updates (2026-02-11):**
- **Fix Pie Chart Legend Text Color** - Tag distribution doughnut legend text was colored to match each slice's background color (e.g., green text for "feature"), making it hard to read. Chart.js doughnut defaults use segment colors for legend text when `generateLabels` doesn't specify `fontColor`. Fixed by setting both `color` on the labels config and `fontColor` on each generated label to use `--text-secondary`.
- **Tab Renames & Discover UI Fixes** - Reviewed all tab names vs content and fixed Discover first section:
  - Tab renames: Overview→Summary, Activity→Timeline, Work→Breakdown (internal IDs unchanged)
  - Discover first section: title "Discover"→"Metrics" (was redundant with tab name)
  - Moved Shuffle button out of CollapsibleSection header (was interactive element inside interactive element — accessibility violation)
  - Added aria-label to pin/unpin buttons
  - Fixed select dropdown styling: `bg-transparent border-none` → `bg-themed-tertiary rounded` for consistent rendering
  - Renamed "Work Summary" section to "Summary" in ProgressTab (don't repeat tab name)
- **Fix PWA Install Button After Uninstall** - Install button didn't reappear after uninstalling the PWA:
  - Root cause: `appinstalled` event sets `localStorage.pwaInstalled = 'true'`, but nothing cleared it on uninstall. `beforeinstallprompt` handler checked this stale flag and suppressed the install prompt.
  - Fix: `beforeinstallprompt` is the browser's signal the app is NOT installed — handler now clears the stale localStorage flag and proceeds normally. Removed one-time `isPWAInstalled` const; `isInstalledPWA()` now reads live state.
- **Sticky Tabs & Filter Relocation** - Two layout improvements:
  - Tab bar now sticks to top of viewport when scrolling (full-width background)
  - Filter toggle button moved from tab bar to header, next to settings gear — filters are a global action, not a tab concern
- **Fix Install Button Not Appearing** - `pwa.js` was dynamically imported (useEffect), so `beforeinstallprompt` could fire before the listener existed. Fixed by making it a static import in `main.jsx` — loads synchronously, no race condition.
- **Eliminate PWA Event Race Condition** - Header's useEffect listeners could miss events dispatched before React mounts. Added `getPWAState()` export to `pwa.js` that returns current `{installReady, updateAvailable}` booleans. Header seeds state on mount from this, with event listeners for subsequent changes.
- **Interactive Debug Banner** - "0 errors" pill now clickable: expands to show diagnostics (SW status, standalone mode, install prompt state, user agent) with Copy/Close buttons.
- **Fix Missing UI Elements** - Four post-migration issues fixed:
  - Debug banner captures all JS errors with copy-paste support
  - Install + Update PWA buttons restored in Header (were lost in React migration, only Settings showed)
  - Multi-component tab spacing fixed: Activity, Work, Health tabs now have consistent 24px gaps between sections
  - Chart legend/axis text now readable: `Chart.defaults.color` set from CSS `--text-secondary`, `borderColor` from `--chart-grid`
- **Debug Error Banner** - Added global error capture with copy-paste support:
  - Catches all JS errors: `window.onerror`, `unhandledrejection`, and React ErrorBoundary
  - Always-visible banner at bottom of screen with "Copy" button for easy bug reporting
  - Works even if React crashes — uses vanilla DOM, created eagerly on page load
  - `RootErrorBoundary` now feeds errors into the banner with component stack traces
- **Force Fresh JS/CSS on Pull-to-Refresh** - PWA now auto-activates new service workers:
  - Added `skipWaiting: true` + `clientsClaim: true` to workbox config — new SW activates immediately
  - Added `controllerchange` listener in `pwa.js` — page reloads when new SW takes control
  - Result: pull-to-refresh (or any reload) gets fresh JS/CSS when a new build is deployed
- **Fix Dashboard Null Metadata Crash** - Dashboard crashed with "Cannot read properties of null (reading 'metadata')":
  - Root cause: In `AppContext.jsx`, global state sync (`globalState.data = state.data`) ran AFTER useMemo hooks that called `getAuthorEmail`/`getAuthorName`. When LOAD_DATA fired, the useMemo hooks re-executed and read `globalState.data.metadata` while it was still `null` from the previous render.
  - Fix: Moved global state sync BEFORE the useMemo hooks so `globalState.data` is current when utility functions read it.
  - Also added defensive `?.` optional chaining in `getAuthorName`/`getAuthorEmail` in `utils.js` as a safety net.
- **Fix Loading Indicator Flash & Black Screen** - After previous fix, loading indicator flashed briefly then black screen returned:
  - Root cause: `.catch(() => {})` silently swallowed ALL data loading errors (network failures, JSON parse errors, CORS issues) — not just 404
  - Fix: only 404 silently handled (no data file expected); all other errors show visible error card with "Could not load dashboard data" message + retry button
  - Added `dashboard-enter` fade-in animation (0.3s) for smooth transition from loading to content
  - Fixed PWA dynamic import — `try/catch` doesn't catch promise rejections; now properly uses `.catch()`
  - Made DropZone more visible: added title heading, vertical centering (min-height 60vh)
- **Fix Black Screen / Loading Feedback** - Users reported only seeing a black screen with grid pattern, no content:
  - Added HTML-level loading indicator inside `#root` div — visible before JS loads, replaced when React mounts via `createRoot`
  - Added `RootErrorBoundary` in `main.jsx` wrapping the entire app — catches any unhandled React error and shows error message + reload button
  - Improved React loading spinner: thicker border (3px vs 2px), added "Loading dashboard..." text below spinner
  - Added `<noscript>` fallback for users without JavaScript

**Previous Updates (2026-02-10):**
- **Fix DropZone flash on reload** - Pull-to-refresh briefly showed "Drop JSON here" before data loaded:
  - On mount, `state.data` is `null` so DropZone rendered immediately; `data.json` fetch ran in useEffect (after first paint)
  - Fix: added `initialLoading` state — shows centered spinner (existing `.loading-spinner` CSS) until fetch completes, then shows dashboard or DropZone
- **Fix PWA White Screen** - CSS was missing from production build:
  - React migration removed `<link rel="stylesheet">` from `index.html` but never added `import '../styles.css'` to `main.jsx`
  - Build produced no CSS file → dark theme white text on default white background = white screen
  - Fix: added CSS import to `main.jsx`. Build now outputs 47KB CSS file, 14 precache entries
- **React Migration Fixes (Final 7)** - Completed all remaining post-migration issues:
  - FilterSidebar ARIA: added aria-expanded, aria-haspopup="listbox", role="listbox", role="option", aria-selected, aria-pressed, Escape to close dropdown
  - Focus trap: created shared `useFocusTrap` hook (`js/hooks/useFocusTrap.js`), applied to DetailPane and SettingsPane
  - Body overflow: centralized in App.jsx (single useEffect watches both panes), removed from DetailPane
  - State sync: replaced async useEffect sync with synchronous inline assignment in AppProvider render path — eliminates one-frame lag
  - fileNameCache: moved from module-level to useRef inside DiscoverTab — GC'd on unmount
  - escapeHtml removed, handleKeyActivate added to all 17 clickable divs across 6 tab files
  - Build: 58 modules, 475KB bundle
- **React Migration Fixes (First 15)** - Fixed 15 of 22 post-migration issues:
  - Deleted 17 dead vanilla JS files (main.js, filters.js, ui.js, export.js, data.js, tabs.js, all tabs/*.js)
  - Rewrote pwa.js to use custom events instead of DOM manipulation (removed ui.js import chain)
  - Cleaned charts.js to only export pure data functions (removed filters.js import)
  - Added ErrorBoundary component wrapping tab content in App.jsx
  - Removed unused isDragOver state from App.jsx
  - Removed escapeHtml from all .jsx imports and usage (React auto-escapes)
  - Added getTagStyleObject() to utils.js, eliminated parseInlineStyle duplication from 4 files
  - Fixed isMobile to track resize events via debounced state in AppContext
  - Added ARIA: tablist/tab/aria-selected on TabBar, dialog/aria-modal/Escape on DetailPane & SettingsPane, role/tabIndex/keyboard on CollapsibleSection and settings toggles, aria-label on close buttons
  - Removed leftover data-* attributes from TabBar, SummaryTab, ProgressTab, TimingTab, CollapsibleSection
  - Fixed index-based React keys in SummaryTab, TimingTab, DiscoverTab
  - Build: 70 → 57 modules, PWA chunk now separate (4.5KB)
- **React Migration Review** - Comprehensive review identified all 22 issues
- **React + Tailwind Migration** - Full migration from vanilla JS to React:
  - Added React 19 + react-chartjs-2 + @vitejs/plugin-react
  - Created AppContext.jsx (useReducer state management, replaces global state)
  - 20 React components: App, Header, TabBar, DropZone, FilterSidebar, DetailPane, SettingsPane, CollapsibleSection + 9 tab components
  - All charts now use react-chartjs-2 declarative components
  - Delegated handlers eliminated (React onClick props instead)
  - utils.js and styles.css unchanged; global state sync via useEffect for compat
  - Build passes, dev server runs successfully
- **React Migration Analysis** - Initial effort assessment documented in TODO.md and ADR-001
- **Filter Indicator Fix** - Default filters now show visual indication on load:
  - `updateFilterIndicator()` now shows "X of Y" whenever any filter is active, regardless of whether the filter changes the commit count
  - Previously, the indicator was hidden when `filtered.length === total` (e.g., when no merge commits exist to exclude)
  - Filter badge (count on toggle button) was already correct — only the text indicator was affected
- **Privacy Mode Removed** - Sanitization always-on for names (anonymized), commit messages now shown:
  - Removed `btn-sanitize` eye toggle button from header
  - Removed Privacy Mode toggle from Settings panel
  - Removed `initSanitizeMode()`, `applySanitizeMode()`, `toggleSanitizeMode()` functions from ui.js
  - `sanitizeName()` always anonymizes; `sanitizeMessage()` now shows full subject (updated 2026-02-24)
  - Removed `isSanitized` from state.js and `sanitized` localStorage key
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

**Extraction System:** AI analysis complete. 2097 commits processed across 14 repositories. All previously malformed commits have been fixed.

**Feed Optimization:**
- `extract-api.js` for API-based extraction (no cloning required, faster) — pagination bug fixed 2026-02-15
- `merge-analysis.js` for ~10x token reduction during "feed the chicken" workflow

**GitHub CLI Setup:** Authentication for API extraction with multiple options:
- `.env` file support - Store `GH_TOKEN` for AI sessions (gitignored)
- `scripts/setup-gh.sh` - Cross-platform installation and auth
- Auto-loading - Scripts read from `.env` automatically
- See docs/USER_ACTIONS.md for detailed setup instructions

**Live Dashboard:** https://repo-tor.vercel.app/

---

## Dashboard V2 Progress

### Completed

- [x] **Aggregation script** - `scripts/aggregate-processed.js` reads from processed/ data
- [x] **6-tab structure** - Summary, Timeline, Breakdown, Health, Discover, Projects
- [x] **Tab mapping** - JavaScript maps new tabs to show multiple content containers
- [x] **Urgency/Impact in Health tab** - Distribution bars, operational health cards
- [x] **Urgency/Planned in Summary** - Executive summary cards
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

Access via the "View Level" selector in Settings (gear icon). Selection persists in localStorage.

### Click Interactions

The following elements open the detail pane:

**Summary Tab:**
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

**Breakdown Tab:**
- Tag breakdown bars → commits with that tag
- Contributor cards → contributor's commits

---

## Tab Mapping

```javascript
const TAB_MAPPING = {
    'overview': ['tab-overview'],       // Summary tab
    'activity': ['tab-activity', 'tab-timing'],  // Timeline tab
    'work': ['tab-progress', 'tab-tags', 'tab-contributors'],  // Breakdown tab
    'health': ['tab-security'],         // Health tab
    'discover': ['tab-discover'],       // Discover tab
    'projects': ['tab-projects']        // Projects tab
};
```

---

## Key Files

| File | Purpose |
|------|---------|
| `vite.config.js` | Vite + PWA plugin configuration |
| `dashboard/index.html` | Dashboard HTML structure (modularized) |
| `dashboard/styles.css` | Dashboard CSS styles |
| `dashboard/js/main.jsx` | React entry point with Chart.js registration |
| `dashboard/js/AppContext.jsx` | React Context + useReducer state management |
| `dashboard/js/App.jsx` | Main app component (data loading, tab routing, layout) |
| `dashboard/js/pwa.js` | PWA install + update module (custom events) |
| `dashboard/js/state.js` | Constants (VIEW_LEVELS, TAB_MAPPING) + global state compat shim |
| `scripts/setup-gh.sh` | GitHub CLI installation and authentication |
| `scripts/extract-api.js` | GitHub API-based extraction (no cloning) |
| `scripts/aggregate-processed.js` | Aggregation from processed/ data |
| `scripts/merge-analysis.js` | Merge AI analysis with raw git data (optimized feed) |
| `scripts/save-commit.js` | Save individual commit files (legacy, full objects) |
| `scripts/pending.js` | Generate pending batches from manifest |
| `dashboard/public/data.json` | Overall aggregated data |
| `dashboard/repos/*.json` | Per-repo aggregated data |
| `docs/DATA_OPERATIONS.md` | Data extraction & operations workflow |
| `config/batch-preamble.md` | Analysis instructions (embedded in batches) |

---

## Remaining Work

### Research (Optional)
- [ ] Device/platform attribution (mobile vs desktop commits)
- [ ] Merge commit filtering options

### Extraction Progress

| Repo | Status | Commits |
|------|--------|---------|
| budgy-ting | Complete | 58 |
| canva-grid | Complete | 342 |
| canva-grid-assets | Complete | 2 |
| chatty-chart | Complete | 42 |
| coin-zapp | Complete | 81 |
| few-lap | Complete | 48 |
| glow-props | Complete | 33 |
| graphiki | Complete | 139 |
| model-pear | Complete | 329 |
| plant-fur | Complete | 18 |
| repo-tor | Complete | 454 |
| see-veo | Complete | 123 |
| synctone | Complete | 373 |
| tool-till-tees | Complete | 55 |

**Total Processed:** 2097 commits
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

*Last updated: 2026-03-03 - Fix partial month cliff on trend charts. Incomplete months (less than 15 days of data) now excluded from all monthly trend charts.*
