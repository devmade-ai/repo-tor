# History

Log of significant changes to code and documentation.

## 2026-03-13

### glow-props CLAUDE.md Sync — 8 New Patterns Adopted

**Why:** Periodic review of the cross-project glow-props CLAUDE.md revealed patterns not yet adopted in repo-tor.

**What:**
1. **Trigger system** — 10 single-word analysis commands (`review`/`rev`, `audit`/`aud`, `docs`/`doc`, `mobile`/`tap`, `clean`/`cln`, `performance`/`perf`, `security`/`sec`, `debug`/`dbg`, `improve`/`imp`, `start`/`go`) with `fix`/`skip`/`stop` flow control
2. **Download as PDF** — `window.print()` pattern with `no-print` class and print-friendly CSS overrides
3. **Commit metadata footers** — Full format with field definitions added to CLAUDE.md (Tags, Complexity, Urgency, Impact, Risk, Debt, Epic, Semver)
4. **`// KEEP:` convention** — Commented-out code must use `// KEEP:` with reason to be preserved
5. **Prohibition: no interactive prompts** — List options as numbered text instead
6. **Prohibition: no feature removal during cleanup** — Must check if documented as intentional first
7. **Bug report ASK rule** — Ask clarifying questions before writing code for bug reports
8. **TESTING_GUIDE.md format** — Structured test scenarios (step-by-step actions, expected results, regression checklist)

**Alternatives considered:** N/A — these are cross-project standards to adopt.

---

## 2026-03-04

### Cross-Tab Audit — 6 Fixes

**Why:** Full audit of all 6 tabs and their sections revealed 2 bugs, 2 UX issues, and 2 minor correctness/robustness issues.

**What:**
- **Fix: Projects filter bug** — `Projects.jsx` used `state.data?.commits` (unfiltered) for commit counts in Phase 2 instead of `filteredCommits`. Counts now respond to user-applied filters.
- **Fix: Timeline UTC mismatch** — Urgency/debt/impact trend charts (moved from Health) used `.substring(0,7)` for month grouping instead of `getUTCMonthKey()`. Could mismatch pre-aggregated UTC keys near midnight.
- **UX: Bottom padding** — Added `pb-12` to the content wrapper so last section doesn't sit flush against viewport bottom.
- **UX: Section separators** — Added subtle `<hr>` dividers between stacked sections in Timeline and Breakdown tabs.
- **UX: Discover file insights loading** — Shows spinner during Phase 1 instead of "No file data available".
- **Fix: Health fallback robustness** — Changed `||` to `??` (nullish coalescing) for summary breakdown fallbacks.

**Alternatives considered:**
- Larger gap instead of `<hr>`: Rejected — gap alone doesn't clearly separate sections; a subtle line does.
- Pre-aggregate file insights: Rejected — file lists are large and not in summary data.

### Section Reorganization + Terminology Cleanup

**Why:** Dashboard used "Tab" naming for both the 6 navigation buttons and the content components they render, causing confusion. Health tab was overloaded with 11+ sections while Security tab was too thin. Discover had no Phase 1 support.

**What:**
- **Renamed `tabs/` → `sections/`** — All section component files moved, "Tab" suffix dropped from filenames and component names. "Tab" now exclusively means the 6 navigation buttons; content within is a "section".
- **Merged Security into Health** — Deleted `SecurityTab.jsx`. Security events now render as a CollapsibleSection within `Health.jsx`, view-level aware.
- **Moved trend charts to Timeline** — Urgency trend, impact over time, debt trend line charts moved from Health/useHealthData to Timeline section (inline useMemo).
- **Moved per-contributor urgency/impact to Contributors** — Per-contributor urgency and impact bars moved from Health to Contributors section.
- **Discover Phase 1** — Added `calcCodeStats()` to aggregate-processed.js. Discover derives 9 of 11 metrics from summary data during Phase 1 (remaining 2 show em dash until commits load).
- **useHealthData simplified** — Removed trends and per-contributor computations. Returns only breakdown data.
- **State/EmbedRenderer updates** — `TAB_MAPPING` → `TAB_SECTIONS`. Embed ID mappings updated (trend charts now map to Timeline).

**Alternatives considered:**
- Extract each chart into its own file: Rejected — too large a refactor, duplicates data/filter logic.
- Keep Security as separate section component: Rejected — too thin (single metric), better as part of Health.
- Keep "Tab" naming: Rejected — user explicitly requested terminology cleanup to avoid confusion.

### Phase 1 Pre-Aggregated Fallbacks for All Tabs

**Why:** During Phase 1 (summary loaded, commits still fetching), most tabs showed spinners or empty content. The summary JSON already contains enough pre-aggregated data to render meaningful charts and breakdowns instantly.

**What:**
- **TagsTab**: Uses `summary.tagBreakdown` for full doughnut chart + tag list during Phase 1.
- **HealthTab**: Uses `summary.urgencyBreakdown` (converted 1-5 scale → planned/normal/reactive), `impactBreakdown`, `riskBreakdown`, `debtBreakdown`. Shows all breakdown bars and risk/debt sections. Trend charts + per-contributor sections hidden until commits load. Fixed React hooks rule violation (useHealthData called after conditional return).
- **ContributorsTab**: Maps `summary.contributors[]` to aggregateContributors format — full "Who Does What" cards + complexity chart.
- **SecurityTab**: Shows `summary.security_events` count + simplified event list during Phase 1.
- **TimingTab**: Uses new `summary.hourlyHeatmap` (24×7 matrix, byHour, byDay arrays in UTC) for heatmap, hourly chart, daily chart. Developer patterns section deferred to Phase 2.
- **ProjectsTab**: Uses new `summary.repoCommitCounts` for instant commit counts on cards.
- **DiscoverTab**: Retains loading spinner (needs per-commit stats — no summary fallback possible).
- **New aggregations**: Added `calcRepoCommitCounts()` and `calcHourlyHeatmap()` to `aggregate-processed.js`.
- **Component updates**: HealthWorkPatterns, RiskAssessment, DebtBalance handle optional click handlers gracefully (non-clickable when commits not yet loaded).

**Alternatives considered:**
- Keep spinners for all tabs: Rejected — summary already has the data, just needed mapping.
- Conditional hook calls with early returns: Rejected — violates React hooks rules. Fixed by always calling hooks unconditionally and using summary data for rendering when commits not loaded.

## 2026-03-03

### Tab Data Usage Audit — Filter Fallback, UTC Consistency, Nullish Coalescing

**Why:** Full review of all 10 dashboard tabs found three correctness bugs in how tabs use pre-aggregated data vs filtered commits: (1) filter fallback showing unfiltered summary data when all commits excluded, (2) `||` treating `0` as falsy for stats fields, (3) date grouping using local time instead of UTC (mismatching pre-aggregated keys).

**What:**
- **Filter fallback fix** — Changed `commitsLoaded && filteredCommits.length > 0` to `commitsLoaded` in SummaryTab, TimelineTab, ProgressTab. Previously, when user filters excluded all commits, the condition fell through to the pre-aggregated summary which is unfiltered — showing stale wrong numbers.
- **`||` → `??` in utils.js** — `getAdditions()`, `getDeletions()`, `getFilesChanged()` now use nullish coalescing (`??`) so that `0` values are not treated as falsy.
- **`||` → `??` in DiscoverTab** — 9 instances of `c.stats?.additions || 0` / `c.stats?.deletions || 0` changed to `??`.
- **UTC date helpers in dashboard** — Added `getUTCDateKey(timestamp)` and `getUTCMonthKey(timestamp)` to `dashboard/js/utils.js`. Applied in TimelineTab (daily chart, code changes chart, summary stats) and ProgressTab (feature/bugfix trend, complexity trend) to match UTC keys from `aggregate-processed.js`.

**Alternatives considered:**
- Add pre-aggregated fallbacks to all 6 tabs missing them: Deferred — requires timezone/work-hour config at build time for TimingTab, per-contributor aggregation for ContributorsTab. Documented for future work.
- Fix `substring(0, 10)` everywhere including useHealthData.js: Deferred — useHealthData has no pre-aggregated fallback, so no mismatch possible. Lower priority.

### Pipeline Audit — save-commit.js Validation + accumulateBucket Fix

**Why:** Full audit of extraction/processing/aggregation pipeline found that `save-commit.js` only checked for field presence (not value validity). This allowed invalid values like `impact: "infra"` or `complexity: 99` to be saved to processed data uncaught. Also found `accumulateBucket` used `||` operator for `stats.additions` fallback, which would incorrectly treat `0` as falsy.

**What:**
- **save-commit.js validation** — Added value validation for analysis fields: tags must be an array, complexity/urgency must be integer 1-5, impact must be one of `['internal', 'user-facing', 'infrastructure', 'api']`. Now matches the validation in `merge-analysis.js`.
- **accumulateBucket `??` operator** — Changed `commit.stats?.additions || commit.additions || 0` to `commit.stats?.additions ?? commit.additions ?? 0`. Prevents a commit with `stats.additions: 0` from incorrectly falling through to a top-level `additions` field.

**Alternatives considered:**
- Only fix in aggregation (map bad values): Rejected — fix should be at the input gate to prevent bad data from accumulating
- Require stats field in save-commit.js: Rejected — 431 existing commits lack stats (from legacy batch path). Would block legitimate data.

### Time-Windowed Data + Weekly/Daily Pre-Aggregation

**Why:** `data.json` was 2.9 MB (all 2,097 commits inline), causing slow initial dashboard load and exceeding PWA precache limits. Dashboard tabs iterated the full commits array on every render to compute chart data. Non-technical users experienced 3-5 second load times.

**What:**
- **Aggregation script redesign** — `scripts/aggregate-processed.js` now outputs:
  - Summary file (`data.json`, ~126 KB): metadata, pre-aggregated weekly/daily/monthly buckets, contributors, filter options, security events. No raw commits.
  - Per-month commit files (`data-commits/YYYY-MM.json`): raw commits grouped by month for lazy loading.
- **Shared bucket helpers** — Refactored monthly aggregation to use `createEmptyBucket()`/`accumulateBucket()`/`finalizeBucket()`. New weekly and daily functions share the same helpers (DRY).
- **Two-phase dashboard loading** — `App.jsx` loads summary first (fast paint), then lazy-loads all month files in background. Summary renders charts immediately via pre-aggregated data; commit files enable drilldowns/filters.
- **Pre-computed filter options** — `filterOptions` object in summary replaces per-commit iteration for FilterSidebar. Falls back to legacy computation for uploaded files.
- **Tab pre-aggregated rendering** — SummaryTab, TimelineTab, ProgressTab derive metrics from summary breakdowns before commits load. HealthTab/others render after commits arrive.
- **PWA caching** — Added `data-commits/*.json` runtime cache rule (NetworkFirst, 36 max entries)

**Alternatives considered:**
- Keep all commits in data.json: Rejected — 2.9 MB payload, slow initial load
- Split by repo instead of month: Rejected — month-based matches time-windowed UI pattern
- Aggregate only in dashboard: Rejected — moves computation to client, delays rendering
- Pre-compute filtered aggregations (excluding merges): Rejected — doubles data, complex to maintain

### Data Accuracy Fixes — UTC Consistency + Impact Alias

**Why:** Comprehensive verification of generated data files revealed two accuracy issues:
1. Daily/monthly aggregation used `substring(0, 10)` on timestamp strings (local time), while weekly used `new Date().getUTC*()` (UTC). This caused 62 commits with non-zero timezone offsets (e.g., `+02:00`) to land in different daily/monthly buckets than their weekly bucket. A commit at `2026-01-01T00:12+02:00` appeared in the "Jan 1" daily bucket but the "Dec 31" weekly bucket.
2. Two commits had `impact: "infra"` which was silently dropped by `calcImpactBreakdown` (only recognized the canonical `infrastructure` value), causing the impact sum to be 2095 instead of 2097.

**What:**
- **UTC date helpers** — Added `getUTCDateKey(timestamp)` and `getUTCMonthKey(timestamp)` that parse timestamps with `new Date()` and extract UTC components. Daily, monthly, and per-month file grouping all use these instead of `substring()`.
- **Impact alias mapping** — Added `infra → infrastructure` normalization in `calcImpactBreakdown`, `accumulateBucket`, contributor impact aggregation, and `calcFilterOptions`. Impact sum now correctly equals 2097.
- **Verification results** — 18/18 checks pass: all breakdown sums equal 2097, all aggregation levels (weekly/daily/monthly) match raw commit counts, per-month files align with monthly buckets, filterOptions are complete, per-repo totals consistent.

**Alternatives considered:**
- Use local time (substring) for all aggregation levels: Rejected — requires parsing timezone offsets manually for weekly ISO week calculation, complex and error-prone
- Leave the 62-commit discrepancy: Rejected — users could see inconsistent numbers between chart views

### Fix Partial Month Cliff on Trend Charts

**Why:** Monthly trend charts showed a misleading 95% drop for the current month (March 2026) because only 2 days of data (39 commits) were displayed at equal visual weight as full months (800+ commits). Non-technical users would interpret this as something going wrong.

**What:**
- **Added `excludeIncompleteLastMonth()` utility** to `dashboard/js/utils.js` — checks if the latest commit day in the last month is before the 15th; if so, excludes that month from trend chart data
- **Applied to `ProgressTab.jsx`** — Features vs Bug Fixes Over Time and Complexity Over Time charts
- **Applied to `useHealthData.js`** — Urgency Trend (which cascades to Impact Over Time via shared `sortedMonths`) and Debt Trend charts

**Alternatives considered:**
- Normalize to daily rate (commits per day) — Rejected: changes y-axis meaning, harder for non-technical users to interpret
- Show partial month with dashed line/annotation — Rejected: adds visual complexity, still misleading at first glance
- Use calendar "today" date to detect current month — Rejected: data.json is static, detection should be data-driven based on actual commit dates

### Documentation Review & Corrections

**Why:** Full codebase audit found documentation had drifted significantly from actual code — wrong tab counts, removed features still documented, incorrect data loading claims, and missing components/files.

**What:**
- **README.md** — Full rewrite: updated from 4 tabs to 6, added React/Vite/Tailwind stack info, replaced `open dashboard/index.html` with `npm run dev`, added complete project structure with all components/hooks/scripts
- **CLAUDE.md** — Updated tab count from 5→6 (added Projects), expanded components list (added ErrorBoundary, EmbedRenderer, HealthAnomalies, HealthBars, HealthWorkPatterns), added `js/hooks/` and `js/chartColors.js`, fixed extract-api.js description (uses curl, not untested), replaced legacy "container IDs" table with actual component routing
- **USER_GUIDE.md** — Removed Privacy Mode references (feature removed 2026-02-10), removed Share/PDF button references (never implemented in React), updated Summary Cards from "Files Changed/Contributors" to actual "Features Built/Bugs Fixed/Avg Urgency/% Planned", updated 18 Discover metric labels to match plain language names in code, added Projects tab section, fixed filter mode label "Inc/Exc"→"Include/Exclude", updated tips section
- **ADMIN_GUIDE.md** — Fixed auto-loading data (was claiming 3-step `../reports/*/data.json` → `./data.json` → upload; actual: `./data.json` only), replaced extensive GitHub CLI section with simpler token-based setup (extract-api.js uses curl since 2026-02-24), fixed static server section (was suggesting `python -m http.server` which won't work with ES modules)
- **SESSION_NOTES.md** — Corrected false claim about deleting `scripts/lib/manifest.js` (file is actively imported by 5 scripts), fixed "5-tab" → "6-tab", fixed "View Level in filter sidebar" → "in Settings"
- **AppContext.jsx** — Added full decision documentation comment (What/Why/Alternatives) to the split context pattern

**Alternatives considered:**
- Partial fixes only — Rejected: documentation drift compounds; better to fix all known issues in one pass
- Deleting stale sections without replacement — Rejected: users need accurate information, not gaps

## 2026-03-02

### Fix Dashboard JSON Loading Error on Vercel

**Why:** Dashboard on Vercel (including installed PWA) showed "Could not load dashboard data" with a JSON parse error. The Vercel SPA rewrite rule was catching `data.json` requests and returning `index.html` (HTML) instead. Additionally, `data.json` was not in `dashboard/public/` so Vite never included it in the build output, and was too large (2.68 MB) to precache via workbox.

**What:**
- **Fixed `vercel.json` rewrite rule** — Changed from `/((?!assets/).*)` to `/((?!assets/|.*\..+$).*)` so requests for files with extensions (`.json`, `.js`, `.css`, etc.) are not rewritten to `index.html`
- **Moved `data.json` to `dashboard/public/`** — Vite copies `public/` contents to `dist/` during build, so `data.json` is now included in the deployed output
- **Updated `aggregate-processed.js`** — Default output changed from `dashboard/` to `dashboard/public/` so future aggregation writes to the correct location
- **Improved error handling in `App.jsx`** — Added content-type check before JSON parsing (detects HTML-instead-of-JSON), and replaced raw error messages with user-friendly text per CLAUDE.md guidelines
- **Excluded `data.json` from PWA precache** — Removed from `globPatterns` (exceeded 2 MiB workbox limit), added `NetworkFirst` runtime caching rule instead
- **Updated documentation** — EXTRACTION_PLAYBOOK.md, ADMIN_GUIDE.md, SESSION_NOTES.md, update-all.sh path references

**Root cause:** The Vercel rewrite `/((?!assets/).*)` only excluded `assets/` paths. All other requests — including `data.json` — were rewritten to `/index.html`. The fetch received a 200 OK with HTML content, bypassing the 404 graceful fallback, and `.json()` threw a `SyntaxError`.

**Alternatives considered:**
- Only fix the rewrite rule (not move data.json) — Rejected: data.json still wouldn't be in the build output, so it would 404 even with a correct rewrite
- Add a Vite copy plugin — Rejected: unnecessary complexity when `public/` already handles static file copying
- Increase `maximumFileSizeToCacheInBytes` — Rejected: precaching 2.6MB+ of mutable data wastes bandwidth on every SW update

### Migrate Deployment from GitHub Pages to Vercel

**Why:** GitHub Pages has friction for SPAs: no native client-side routing support (requires `404.html` hack), no environment variable injection at build, and manual "source" setting in repo UI. Vercel handles SPA rewrites, env vars, and auto-deploy out of the box.

**What:**
- **Added `vercel.json`** — Build command, output directory, Vite framework hint, and SPA rewrite rule (all non-asset paths serve `index.html`)
- **Deleted `.github/workflows/deploy.yml`** — GitHub Actions deployment workflow no longer needed
- **Updated `vite.config.js`** — Changed `base` from `'./'` (relative, for GitHub Pages) to `'/'` (absolute, for Vercel root deployment)
- **Updated live URLs** — All references to `devmade-ai.github.io/repo-tor/` changed to `repo-tor.vercel.app/` across: CLAUDE.md, projects.json, embed.js, USER_GUIDE.md, ADMIN_GUIDE.md, EMBED_REFERENCE.md, EMBED_IMPLEMENTATION.md, SESSION_NOTES.md
- **Updated ADMIN_GUIDE.md** — Replaced GitHub Pages deployment section with Vercel setup instructions

**Alternatives considered:**
- Keep GitHub Pages with `404.html` hack — Rejected: fragile SPA routing, no env var support
- Netlify — Viable but Vercel has better Vite integration and is already used by other devmade-ai projects

**Files:** vercel.json (new), .github/workflows/deploy.yml (deleted), vite.config.js, dashboard/public/projects.json, dashboard/public/embed.js, CLAUDE.md, docs/SESSION_NOTES.md, docs/HISTORY.md, docs/ADMIN_GUIDE.md, docs/USER_GUIDE.md, docs/EMBED_REFERENCE.md, docs/EMBED_IMPLEMENTATION.md

---

## 2026-02-26

### Adopt Patterns from glow-props CLAUDE.md

**Why:** Cross-project review of glow-props CLAUDE.md identified reusable patterns for PWA robustness, timer leak prevention, icon generation, and commit metadata. Adopting these improves code quality and establishes a shared standard.

**What:**
- **CLAUDE.md** — Added Cross-Project References section with glow-props URL, adopted patterns list, and review date
- **PWA race condition fix** — Added inline `<script>` in index.html to capture `beforeinstallprompt` before module scripts load; pwa.js now consumes early-captured event on load (covers cached SW repeat visits)
- **Timer leak fixes** — App.jsx data fetch now uses AbortController (matches ProjectsTab.jsx pattern); toast timeout tracked in ref with cleanup on unmount
- **Commit-msg hook** — Now suggests all metadata footers (complexity, epic, semver) in addition to existing risk/debt hints; consolidated into single "Consider adding" tip
- **Icon generation pipeline** — Created `scripts/generate-icons.mjs` using Sharp to convert SVG source to all required PNG sizes; added `npm run generate-icons` script
- **Audit result** — Full React component audit found 12/14 patterns with proper cleanup; the 2 leaks are now fixed

**Files:** CLAUDE.md, dashboard/index.html, dashboard/js/pwa.js, dashboard/js/App.jsx, hooks/commit-msg, scripts/generate-icons.mjs, package.json, docs/

---

## 2026-02-25

### Feed the Chicken — 38 New Commits (Incremental)

**Why:** Incremental extraction to keep dashboard data current with latest repository activity.

**What:**
- Extracted 38 new commits via GitHub API across 3 repos: budgy-ting (+9), graphiki (+3), repo-tor (+26)
- AI-analyzed all commits in 4 batches, all human-approved
- Re-aggregated dashboard data: 14 repos, 1946 total commits (was 1908)

**Files:** processed/ commit files (38 new), dashboard/data.json, dashboard/repos/ (3 updated)

---

### Codebase Review Round 2 — UX, Accessibility, Code Quality (~17 Fixes)

**Why:** Second full codebase audit focused on user experience polish, accessibility compliance, code quality, and infrastructure improvements.

**UX improvements (7 items):**
- **FilterSidebar.jsx** — Changed cryptic "Inc"/"Exc" to "Include"/"Exclude" with descriptive title attributes
- **App.jsx** — Added upload success toast (commit count + repo count), improved error messages (SyntaxError vs generic)
- **HealthTab.jsx** — Replaced jargon urgency labels: "Planned (1-2)"→"Planned Work", "Normal (3)"→"Routine Work", "Reactive (4-5)"→"Urgent Fixes"
- **TimingTab.jsx** — Added color legend (green/amber/red dots) explaining work hours indicators
- **SecurityTab.jsx** — Added subtitle explaining security criteria for non-technical users
- **5 tabs** — Standardized empty state messages: "Nothing matches the current filters. Try adjusting your selections."

**Accessibility improvements (4 items):**
- **styles.css** — Added focus-visible outlines on all interactive elements (.tab-btn, .btn-icon, .collapsible-header, filter controls, role="button"/role="tab")
- **styles.css** — Added prefers-reduced-motion media query (suppresses animations)
- **styles.css** — Increased tag opacity from 0.2/0.3 to 0.3/0.5 for WCAG AA contrast
- **TabBar.jsx + styles.css** — Replaced hardcoded Tailwind border-blue-500/text-blue-600 with .tab-btn-active class using CSS variables

**Code quality improvements (3 items):**
- **main.jsx + ErrorBoundary.jsx + styles.css** — Moved inline styles to CSS classes (root-error-message, root-error-detail, root-error-hint, error-boundary-card)
- **state.js + TimingTab.jsx** — Extracted magic numbers into centralized THRESHOLDS constants
- **scripts/lib/manifest.js** — Deleted dead code (4 unused exports, no imports found anywhere)

**Infrastructure improvements (3 items):**
- **extract-api.js** — Fixed error handling: added error.code check alongside error.status for curl failures
- **vite.config.js** — Narrowed PWA glob patterns (excluded large data files from precache), disabled sourcemaps in production
- **Debug banner** — Investigated HTML sanitization, confirmed already safe (uses textContent throughout)

**Files:** 15 modified, 1 deleted

---

## 2026-02-24

### Comprehensive Codebase Review — 20 Issues Fixed

**Why:** Full codebase audit identified bugs, security issues, performance concerns, and code quality problems across dashboard components, scripts, and CSS.

**Dashboard fixes (12 files):**
- **TimelineTab.jsx** — Fixed render-time side effect: setState during render moved to useEffect (prevented potential infinite loop)
- **App.jsx** — Added 50MB file size validation on upload; fixed combineDatasets metadata merge (was overwriting, now deep-merges); replaced hardcoded inline styles with CSS classes
- **chartColors.js** — Added hex color validation for URL params; invalid values now silently ignored
- **TagsTab.jsx** — Moved module-level getComputedStyle into useLayoutEffect hook
- **AppContext.jsx** — Replaced silent catch with console.warn
- **DiscoverTab.jsx** — Fixed stale closure in handlePinToggle; replaced silent localStorage catches
- **ProjectsTab.jsx** — Added AbortController to fetch with cleanup on unmount
- **main.jsx** — Replaced hardcoded color inline styles in error boundary with CSS classes
- **utils.js** — Computed Easter algorithmically replacing hardcoded 2020-2030 table
- **state.js** — Extended anonymous names from 8 to 20
- **styles.css** — Removed 30+ `!important` overrides (Tailwind v4 layers make them unnecessary)
- **index.html** — Documented intentional duplicate @keyframes spin

**HealthTab decomposition (780 → 630 lines):**
- Extracted HealthBars.jsx (89 lines), HealthAnomalies.jsx (124 lines), HealthWorkPatterns.jsx (51 lines)

**Script fixes (6 files):**
- **update-all.sh** — Fixed command injection via sed → bash parameter substitution
- **extract-api.js** — Added API response validation and improved pagination handling
- **merge-analysis.js** — Added skip count tracking for invalid JSON lines
- **pending.js** — Added recovery logic for interrupted atomic renames
- **aggregate-processed.js** — Added unmapped author tracking with summary warning
- **extract.js** — Documented fallback code path; added warning for empty numstat

**Files:** 19 modified, 3 new components created

### Discover Metric Labels Clarified for Non-Technical Users

**Why:** Discover tab metric cards used developer jargon ("commit", "ratio", "refactor", "untagged") that violates the CLAUDE.md hard rule: "no jargon, technical terms, or developer-speak" for non-technical users.

**Changes:**
- Labels: "Avg Commit Size"→"Avg Change Size", "Deletion Ratio"→"Code Removed", "Feature:Bug Ratio"→"Features per Bug Fix", "Test Investment"→"Testing Effort", "Docs Investment"→"Documentation Effort", "Untagged Commits"→"Uncategorized Changes", "Breaking Changes"→"Major Updates", "Avg Files/Commit"→"Files per Change", "Single-File Commits"→"Focused Changes", "Refactor Work"→"Code Cleanup"
- Sub-text: Replaced all "commits" with "changes" (e.g., "5 test commits"→"5 test changes", "of commits"→"of all changes")
- Added descriptive sub-text where missing (e.g., "commits"→"changes that may affect users" for Major Updates)

**Files:** `dashboard/js/tabs/DiscoverTab.jsx`

### Section Reordering by Interest Level

**Why:** Sections within each tab were ordered structurally (stats first, then charts, then details) rather than by what a user would find most engaging. Stats/numbers are reference data — useful but not interesting. Charts, insights, and actionable breakdowns are what draw users in.

**Changes:**
- **SummaryTab**: Key Highlights → Activity Snapshot → Key Stats (insights/patterns first, raw counts last)
- **TimelineTab**: Commit Activity chart → Recent Changes → Lines Changed → Activity Summary (visual hook first, reference stats last)
- **TimingTab**: Commits by Hour → When Work Happens → Developer Patterns → Commits by Day (peak hours most interesting, "busiest day" least surprising)
- **ProgressTab**: Features vs Bug Fixes → Change Types → Work by Initiative → Complexity Over Time → Summary (main story first, niche detail and reference numbers last)
- **TagsTab**: Fixed CSS order bug — parent `div` used `order-*` classes without being a flex container. Changed `space-y-6` to `flex flex-col gap-6`. Chart shows first on desktop (visually engaging), list shows first on mobile (more scannable)
- **HealthTab**: Health Overview (anchor) → Risk Assessment → Tech Debt Balance → Prioritization → Impact → trend charts → per-person detail. Moved "red flag" sections (risk, debt) right after overview; trend charts and per-contributor breakdowns pushed to the end
- **DiscoverTab**: Swapped last two sections — Head to Head (visually engaging comparisons) now before Most Changed Files (niche file list)
- **ContributorsTab/SecurityTab**: No change needed

**Files:** `dashboard/js/tabs/SummaryTab.jsx`, `TimelineTab.jsx`, `TimingTab.jsx`, `ProgressTab.jsx`, `TagsTab.jsx`, `HealthTab.jsx`, `DiscoverTab.jsx`

### Mobile Tab Layout Improvements

**Why:** Dashboard tabs were too long and content-heavy on mobile. Charts at fixed 300px height took up too much vertical space, all sections expanded by default created excessive scrolling (especially HealthTab with 10 sections), and some section titles were unclear for non-technical users.

**Changes:**
- **All tabs**: Added descriptive subtitles to CollapsibleSection headers (hidden on mobile via CSS to save space, visible on desktop for context)
- **HealthTab**: Collapsed 7 of 10 sections on mobile (trends, risk, debt, per-contributor); improved titles ("How Work Gets Prioritized", "Where Changes Land"); reduced chart heights 300px→220px
- **TimelineTab**: Collapsed commit list and code changes chart on mobile; renamed sections ("Commit Activity", "Lines Changed", "Recent Changes"); reduced chart heights
- **TimingTab**: Collapsed Developer Patterns on mobile; renamed sections ("When Work Happens", "Commits by Hour/Day"); reduced chart heights 250px→200px
- **TagsTab**: Reordered — list shown first on mobile (more scannable), chart collapsed by default; reduced doughnut 350px→250px
- **ProgressTab**: Collapsed Complexity Over Time on mobile; reduced chart heights; added subtitles
- **ContributorsTab**: Collapsed complexity chart on mobile; added subtitles
- **DiscoverTab**: Improved metric card layout for narrow screens (truncating selector, responsive value size text-2xl vs text-3xl); tighter comparison labels (w-16 on mobile); renamed "File Insights"→"Most Changed Files", "Comparisons"→"Head to Head"
- **CSS**: Tighter section spacing on mobile (24px→16px gap), reduced header padding, subtitles hidden on mobile
- **Chart fonts**: All tabs bumped from 9px→10px minimum for mobile readability

**Files:** `dashboard/js/tabs/HealthTab.jsx`, `TimelineTab.jsx`, `TimingTab.jsx`, `TagsTab.jsx`, `ProgressTab.jsx`, `ContributorsTab.jsx`, `DiscoverTab.jsx`, `SummaryTab.jsx`, `dashboard/styles.css`

### Fix Projects Tab Loading Error in Production

**Why:** ProjectsTab fetched `./projects.json` at runtime, but the file was never copied to the `dist/` build output. It worked in dev mode (Vite serves from the root directory) but failed on GitHub Pages with "Could not load project list. The file may not be deployed yet."

**Root cause:** When the Projects tab was added, `projects.json` was placed in `dashboard/` alongside other data files, but was not added to the deploy workflow's copy step (`deploy.yml` lines 43-50). Unlike `data.json` and other data files which were listed there, `projects.json` was missed.

**Changes:**
- Moved `dashboard/projects.json` → `dashboard/public/projects.json` so Vite automatically includes it in build output (same pattern as `embed.js` and icons)
- Added explicit copy of `projects.json` in `.github/workflows/deploy.yml` as a safety net

**Files:** `dashboard/public/projects.json` (moved from `dashboard/`), `.github/workflows/deploy.yml`

### Fix TagsTab Initialization Crash (ReferenceError: Cannot access 'vf' before initialization)

**Why:** Production build crashed immediately on load. The minified error `Cannot access 'vf' before initialization` traced back to `TagsTab.jsx` line 13: `const CHART_TEXT_COLOR = CHART_TEXT_COLOR;` — a self-referential assignment that reads the variable during its own initialization (temporal dead zone). The intent was to read the `--text-secondary` CSS variable once at module load.

**Changes:**
- `TagsTab.jsx` — Replaced self-referential `const CHART_TEXT_COLOR = CHART_TEXT_COLOR` with `getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#e5e7eb'`. Matches the same pattern used in `main.jsx` for Chart.js defaults.

**Files:** `dashboard/js/tabs/TagsTab.jsx`

### Move Debug Pill to HTML Level (Fix: Pill Not Showing During Loading Issues)

**Why:** Debug pill was created inside the JS bundle (`main.jsx`). If the bundle failed to load, parse, or execute (stale service worker cache, network error, JS runtime error), the debug pill never appeared — defeating its purpose. Users saw an infinite loading spinner with no way to diagnose the problem.

**Changes:**
- `index.html` — Added inline `<script>` that creates the debug pill and error capture at the HTML level, independent of the JS bundle. Features:
  - Circular buffer event store (200-entry max) for error logging
  - `window.onerror` and `unhandledrejection` listeners (work before bundle loads)
  - Clickable pill: "0 errors" (green) or "N errors" (red), expandable to diagnostics/error log
  - Copy and close actions via event delegation (`data-action` attributes)
  - 10-second loading timeout: warns user if React hasn't mounted yet
  - Exposes `window.__debugPushError()`, `window.__debugErrors`, `window.__debugClearLoadTimer()` for the bundle to enhance
  - Skipped in embed mode (`?embed=`)
- `main.jsx` — Removed ~170 lines of duplicate debug banner code. Now bridges to the HTML pill via `window.__debugPushError()` for React-specific errors (component stacks from `RootErrorBoundary`). Signals mount via `window.__debugClearLoadTimer()`.

**Files:** `dashboard/index.html`, `dashboard/js/main.jsx`

### Comprehensive Code Review & Bug Fixes (24 issues)

**Why:** Full project audit to identify and fix security vulnerabilities, performance bottlenecks, accessibility gaps, and code quality issues across all project files.

**Security fixes:**
- `main.jsx` — Replaced `innerHTML` with DOM API (`textContent`/`createElement`) to prevent XSS via error messages. Added event delegation on banner root instead of per-render `addEventListener` calls (eliminated listener leak).
- `extract-api.js` — Temp header file moved from predictable project-root path to `os.tmpdir()` with unique PID+timestamp suffix (prevents TOCTOU race condition).

**Performance fixes:**
- `extract.js` — Batched git stat extraction: single `git log --numstat` command replaces 2×N individual `git show` calls. For 1000 commits, this is ~2000× fewer process spawns.
- `extract-api.js` — Concurrent API fetching: 5-worker pool using async `execFile` + `pMap()` instead of sequential `execFileSync`. Reduces detail fetch time by ~5×.
- `TagsTab.jsx` — Moved `getComputedStyle()` call from inside `useMemo` (runs on every render) to module-level constant.

**Data integrity fixes:**
- `pending.js` — Atomic batch deletion: writes to temp dir, then renames. If interrupted mid-write, old data survives.
- `extract-api.js` — Fixed `filesChanged` calculation (was gated on `stats.total` which is additions+deletions sum, not file count). Added `repo_id` to security events. Added `branches`/`currentBranch` to metadata.

**Accessibility fixes:**
- `SummaryTab.jsx`, `ContributorsTab.jsx` — Added descriptive `aria-label` to all stat cards and contributor cards.
- `DropZone.jsx` — Added `aria-label` describing the upload action.
- `FilterSidebar.jsx` — Added `aria-label` to date filter inputs.
- `CollapsibleSection.jsx` — Added `aria-controls` linking header to content panel.
- Empty state messages standardized across all tabs to "No data matches the current filters".

**Code quality fixes:**
- `AppContext.jsx` — Silent `catch { /* ignore */ }` replaced with `console.warn` for localStorage quota errors.
- `pwa.js` — Silent `.catch(() => {})` replaced with `console.warn` logging.
- `SettingsPane.jsx` — Fixed stale closure: Escape handler now uses `dispatch` directly (stable ref) instead of capturing `handleClose`.
- `DropZone.jsx`, `FilterSidebar.jsx`, `SettingsPane.jsx` — Inline `style={{}}` objects moved to CSS classes per CLAUDE.md convention.
- `utils.js` — Easter dates extended from 2024-2027 to 2020-2030 to match `buildHolidaySet()` year range.
- `package.json` — Removed unused `sharp` devDependency.

**CSS/Config fixes:**
- `styles.css` — Defined missing `--shadow-lg` and `--color-primary-alpha` variables. Replaced `max-height: 2000px` cap on collapsible content with `max-height: none`.
- `vite.config.js` — Added `woff2` to PWA precache glob patterns.

**Files changed:** main.jsx, extract-api.js, extract.js, pending.js, TagsTab.jsx, AppContext.jsx, pwa.js, SettingsPane.jsx, CollapsibleSection.jsx, DropZone.jsx, FilterSidebar.jsx, SummaryTab.jsx, ContributorsTab.jsx, HealthTab.jsx, App.jsx, utils.js, state.js (via utils.js), styles.css, vite.config.js, package.json

---

### Show Commit Messages in Detail View

**Why:** Commit subjects were hidden behind `[message hidden]` text in all detail views. User wanted to see the actual commit messages.

**Changes:**
- Updated `sanitizeMessage()` in `utils.js` to return the full subject line instead of masking it
- Removed `[Details hidden]` text from SecurityTab commit list
- Applies to all view levels (Executive, Management, Developer)

**Files:**
- `dashboard/js/utils.js` — `sanitizeMessage()` now returns message as-is
- `dashboard/js/tabs/SecurityTab.jsx` — Removed `[Details hidden]` line

---

### Add New Repos and Projects Tab

**Why:** User requested adding all latest repos to the tracked list and creating a page to access all live projects from the dashboard.

**Changes:**
- Added `budgy-ting` (public) and `tool-till-tees` (private) to `config/repos.json` — discovered via GitHub API
- Created `dashboard/projects.json` with all 14 projects, live URLs (GitHub Pages/Vercel), repo URLs, and language info
- Created `dashboard/js/tabs/ProjectsTab.jsx` — fetches projects.json, enriches with commit counts from analytics data, splits into "Live Projects" and "Other Repositories" sections
- Added project card CSS to `dashboard/styles.css`
- Updated `dashboard/js/state.js` TAB_MAPPING, `dashboard/js/components/TabBar.jsx` TABS array, `dashboard/js/App.jsx` imports and render

**Files:**
- `config/repos.json`
- `dashboard/projects.json` (new)
- `dashboard/js/tabs/ProjectsTab.jsx` (new)
- `dashboard/styles.css`
- `dashboard/js/state.js`
- `dashboard/js/components/TabBar.jsx`
- `dashboard/js/App.jsx`

---

### Refactor extract-api.js — Remove gh CLI Dependency

**Why:** `extract-api.js` required `gh` CLI which is often not installed in CI/cloud environments. This caused AI sessions to fall back to cloning entire repos just to get git history, which is slow and wasteful. Also, the script only checked `GH_TOKEN` but the available env var was `GITHUB_ALL_REPO_TOKEN`.

**Changes:**
- Rewrote all GitHub API calls to use `curl` instead of `gh` CLI — curl is universally available and handles HTTP proxies correctly
- Added multi-token discovery: checks `GH_TOKEN`, `GITHUB_TOKEN`, `GITHUB_ALL_REPO_TOKEN` (in order)
- Updated `update-all.sh` to remove `gh` CLI check, replaced with token presence check
- Updated `docs/USER_ACTIONS.md` — removed gh CLI setup instructions (no longer needed)
- Updated `docs/ADMIN_GUIDE.md` — prerequisites now list token + curl instead of gh CLI
- Added AI lesson about cloning vs API and env var discovery

**Files:**
- `scripts/extract-api.js` — Rewritten HTTP layer
- `scripts/update-all.sh` — Removed gh CLI check
- `docs/USER_ACTIONS.md`
- `docs/ADMIN_GUIDE.md`
- `docs/AI_LESSONS.md`

---

### Feed the Chicken — 206 New Commits (7 repos)

**Why:** Incremental extraction to process new commits not yet analyzed across all tracked repositories.

**Changes:**
- Extracted git data from all 14 repos (clone-based, gh CLI unavailable)
- Generated 206 pending commits across 11 batches in 7 repos
- AI-analyzed all batches with human approval: glow-props (6), few-lap (16), budgy-ting (19), repo-tor (22), see-veo (41), tool-till-tees (39), graphiki (63)
- Merged via `scripts/merge-analysis.js`, re-aggregated via `scripts/aggregate-processed.js`
- Final totals: 14 repos, 1908 commits

**Files:**
- `processed/*/commits/*.json` — 206 new commit files across 7 repos
- `processed/*/manifest.json` — updated manifests for 7 repos
- `dashboard/data.json` — re-aggregated
- `dashboard/repos/*.json` — 16 files (14 repos + 2 new)

---

## 2026-02-19

### Embed Auto-Resize Helper Script

**Why:** The auto-height mechanism required embedders to write their own `postMessage` listener in JavaScript. This was documented but easy to miss — the iframe would load and show the chart, but the height wouldn't adjust because no listener was in place on the parent page.

**Changes:**
- Created `dashboard/public/embed.js` — standalone helper script (no dependencies, <1KB) that listens for `repo-tor:resize` messages and auto-sizes all repo-tor iframes on the page
- Updated `docs/EMBED_IMPLEMENTATION.md` — script-tag approach is now the primary method; manual listener moved to "Advanced" section; added `embed.js` to files table
- Updated `docs/EMBED_REFERENCE.md` — auto-height section now shows script-tag approach

**Files:**
- `dashboard/public/embed.js` (new)
- `docs/EMBED_IMPLEMENTATION.md`
- `docs/EMBED_REFERENCE.md`

---

### Fix Embed Resize Height Measurement

**Why:** The auto-height `postMessage` was using `document.documentElement.scrollHeight` to measure content height. This included elements outside the embed container (the `#heatmap-tooltip` div, `body` pseudo-elements), reporting incorrect heights to the parent iframe. Additionally, the initial height was posted immediately via `postHeight()` before Chart.js had finished its first `requestAnimationFrame`-based render, so the parent could receive a pre-chart height.

**Changes:**
- Changed height measurement from `document.documentElement.scrollHeight` to `container.scrollHeight` in `EmbedRenderer.jsx` — only measures the embed container itself
- Added `lastHeight` tracking to skip duplicate `postMessage` calls when height hasn't changed
- Replaced immediate `postHeight()` with `setTimeout(postHeight, 100)` to let Chart.js complete its initial render before measuring
- Added `clearTimeout` cleanup in the effect teardown

**Files:**
- `dashboard/js/components/EmbedRenderer.jsx`

---

### Custom Background Color for Embeds

**Why:** Embedded charts showed the dashboard's dark background (`#1B1B1B`) inside the iframe, clashing with light-themed or custom-themed embedding sites. Embedders had no way to change it.

**Changes:**
- Added `?bg=hex` URL parameter in `App.jsx` — overrides `--bg-primary` CSS variable (read by `body` and `.embed-mode` styles). Accepts hex values or `transparent`
- Added CSS rule to hide decorative `body::before` grid pattern in embed mode — prevents it from leaking through with `?bg=transparent`
- Updated `docs/EMBED_REFERENCE.md` with `bg` parameter in URL table and quick examples
- Updated `docs/EMBED_IMPLEMENTATION.md` with `bg` parameter, usage examples, How It Works step, and test cases

**Files:**
- `dashboard/js/App.jsx`
- `dashboard/styles.css`
- `docs/EMBED_REFERENCE.md`
- `docs/EMBED_IMPLEMENTATION.md`

---

### Auto-Height for Embed Mode

**Why:** Embedding apps had to guess an iframe `height` value. Charts vary in height depending on data, view level, and viewport width — a fixed height either clips content or wastes space.

**Changes:**
- Added `ResizeObserver` + `postMessage` to `EmbedRenderer.jsx` — posts `{ type: 'repo-tor:resize', height }` to parent window whenever content size changes
- Debounced via `requestAnimationFrame` to avoid flooding during chart animations
- Only activates when running inside an iframe (`window.parent !== window`)
- Updated `docs/EMBED_IMPLEMENTATION.md` with Auto-Height section (protocol, single/multi-iframe parent snippets, opt-out), security note, testing checklist items, and updated status/files
- Updated `docs/EMBED_REFERENCE.md` with Auto-Height quick-reference section

**Files:**
- `dashboard/js/components/EmbedRenderer.jsx`
- `docs/EMBED_IMPLEMENTATION.md`
- `docs/EMBED_REFERENCE.md`

---

## 2026-02-18

### Custom Graph Colors for Embeds

**Why:** Embedding apps need to match chart colors to their own brand. The dashboard's default blue palette doesn't suit every context. Hardcoded hex values were scattered across 6 tab files with no central control.

**Changes:**
- Created `dashboard/js/chartColors.js` — centralized color config with URL parameter parsing
- Added 4 new URL parameters: `palette`, `colors`, `accent`, `muted`
- Added 6 named palette presets (default, warm, cool, earth, vibrant, mono)
- Updated 5 tab components (TimelineTab, TimingTab, ProgressTab, ContributorsTab, HealthTab) to import from `chartColors.js`
- Updated heatmap CSS to use `--chart-accent-rgb` CSS variable (set from resolved accent color in main.jsx)
- Tag distribution doughnut colors remain semantic (green=feature, red=bugfix) — not overridden
- Updated `docs/EMBED_IMPLEMENTATION.md` with color architecture, parameters, palettes, testing checklist
- Updated `docs/EMBED_REFERENCE.md` with custom colors section, quick examples, and "what affects what" table

**Files:**
- `dashboard/js/chartColors.js` (new)
- `dashboard/js/main.jsx` (set --chart-accent-rgb CSS variable)
- `dashboard/styles.css` (heatmap classes use CSS variable)
- `dashboard/js/tabs/TimelineTab.jsx`, `TimingTab.jsx`, `ProgressTab.jsx`, `ContributorsTab.jsx`, `HealthTab.jsx`
- `docs/EMBED_IMPLEMENTATION.md`, `docs/EMBED_REFERENCE.md`

---

### Feed the Chicken — Incremental Extraction (156 new commits)

**Why:** New commits accumulated across 6 repos since last extraction. Incremental analysis keeps dashboard data current.

**Changes:**
- Extracted fresh git data from all 12 repos via `--clone` mode
- Generated pending batches: 156 new commits across 6 repos in 11 batches
- AI analyzed all batches with human review/approval
- Re-aggregated all 1,702 commits into dashboard JSON

**Repos updated:**
- canva-grid: +3 (332 total) — PWA fix, fill layout feature
- glow-props: +14 (15 total) — session-start hooks, CI, static hosting
- graphiki: +59 (65 total) — full product build (schema, query, import, analysis, PWA, conventions, UI refinement)
- repo-tor: +28 (393 total) — embed mode, PWA fix, metadata fields, extraction fixes, feed-the-chicken chores
- see-veo: +51 (68 total) — CV content/layout/skills, interest form, debug banner, email API, portfolio attribution
- synctone: +1 (359 total) — CLAUDE.md coding standards

---

### Implement Embed Mode

**Why:** With `data-embed-id` attributes in place (see below), the dashboard now needs to actually support rendering individual charts in isolation for iframe embedding. External apps should be able to use `?embed=activity-timeline` to get just that chart, with no dashboard chrome.

**Changes:**
- `dashboard/js/components/EmbedRenderer.jsx` — **New file** — Maps embed IDs to tab components, renders only needed tabs, uses `useLayoutEffect` to hide non-target CollapsibleSections via DOM traversal
- `dashboard/js/App.jsx` — Reads `?embed=` and `?theme=` query params; when embed mode active, renders `EmbedRenderer` instead of full dashboard; shows error state if data missing
- `dashboard/js/main.jsx` — Skips debug error banner creation in embed mode
- `dashboard/styles.css` — Added `.embed-mode` styles (transparent card backgrounds, hidden section headers, forced expanded content, error state styling, debug banner hiding)

**Design decisions:**
- DOM traversal (`closest('.card')`) to hide non-target sections rather than CSS `:has()` — more reliable across enterprise browser environments
- `useLayoutEffect` (not `useEffect`) to hide cards before paint — prevents flash of all charts before hiding
- Theme override via `?theme=light|dark` so embeds can match the consuming app's theme
- Multi-chart support via comma-separated IDs: `?embed=id1,id2` renders both in one iframe (single bundle load)
- Tab deduplication: if two requested charts are in the same tab, the tab renders only once
- Invalid IDs show a friendly error with link to EMBED_REFERENCE.md rather than blank iframe

---

### Enable Element Embedding (Groundwork)

**Why:** Need the ability to pull individual dashboard charts (e.g., activity timeline, tag distribution) into external apps like a CV site. This requires each chart to be individually addressable, plus documentation of what's available and how to implement the embed feature.

**Changes:**
- `dashboard/js/tabs/TimelineTab.jsx` — Added `data-embed-id` to `activity-timeline` and `code-changes-timeline` chart containers
- `dashboard/js/tabs/TimingTab.jsx` — Added `data-embed-id` to `activity-heatmap`, `hourly-distribution`, `daily-distribution`
- `dashboard/js/tabs/ProgressTab.jsx` — Added `data-embed-id` to `feature-vs-bugfix-trend`, `complexity-over-time`, `semver-distribution`
- `dashboard/js/tabs/ContributorsTab.jsx` — Added `data-embed-id` to `contributor-complexity`
- `dashboard/js/tabs/TagsTab.jsx` — Added `data-embed-id` to `tag-distribution`
- `dashboard/js/tabs/HealthTab.jsx` — Added `data-embed-id` to `urgency-trend`, `impact-over-time`, `debt-trend`
- `docs/EMBED_REFERENCE.md` — **New file** — Quick-reference catalog of all 13 embeddable elements
- `docs/EMBED_IMPLEMENTATION.md` — **New file** — Implementation plan for URL-based embed mode

**Design decisions:**
- Used `data-embed-id` (not `id`) to avoid collisions with any existing DOM IDs and to clearly signal these are for the embed system
- IDs use kebab-case matching the chart's purpose (e.g., `activity-timeline` not `timeline-bar-1`) for readability
- Chose iframe-based embed mode (Option 1) as simplest first step; Web Components documented as upgrade path
- No runtime changes yet — the `data-embed-id` attributes are passive (no JS reads them until embed mode is implemented)

---

## 2026-02-16

### Fix SW Update Interval Cleanup

**Why:** The hourly `setInterval` in `pwa.js` `onRegisteredSW` was created without storing its handle, making it impossible to clear. While the module-level execution means it only fires once (no React mount/unmount leak risk), storing the handle is defensive hygiene that enables cleanup if ever needed.

**Changes:**
- `dashboard/js/pwa.js` — Store `setInterval` return value in `updateInterval` variable; added `stopUpdatePolling()` export to clear the interval

**Design decisions:**
- Kept the fix in module-level JS rather than converting to a React hook — SW registration is a global singleton, not component-scoped
- `stopUpdatePolling()` exported but not currently called anywhere — available for future use (e.g., test teardown, manual pause)

---

## 2026-02-15

### Add Risk, Debt, Epic, Semver Fields (Full Pipeline)

**Why:** Commit metadata only tracked tags, complexity, urgency, and impact. Risk (how dangerous a change is), Debt (whether tech debt is accumulating), Epic (grouping commits to initiatives), and Semver (release type) provide richer reporting — enabling questions like "how much risky work happened this sprint" or "is tech debt growing."

**Changes:**
- `scripts/extract.js` + `scripts/extract-api.js` — Initialize `risk`, `debt`, `epic`, `semver` as `null` on raw commits
- `scripts/merge-analysis.js` — Validate optional fields (risk: low|medium|high, debt: added|paid|neutral, epic: string, semver: patch|minor|major); merge into commit objects when present
- `scripts/save-commit.js` — Validate optional fields when present (don't require them)
- `scripts/aggregate-processed.js` — Add `calcRiskBreakdown()`, `calcDebtBreakdown()`, `calcEpicBreakdown()`, `calcSemverBreakdown()`; include in summary, monthly, and contributor aggregations
- `dashboard/js/tabs/HealthTab.jsx` — Risk Assessment section (bars: high/medium/low), Debt Balance section (bars + net indicator), Debt Trend chart (monthly added vs paid)
- `dashboard/js/tabs/ProgressTab.jsx` — "Work by Initiative" (epic bars), "Change Types" (semver doughnut + detail)
- `dashboard/js/tabs/SummaryTab.jsx` — Risk and Debt highlights in Key Highlights (conditional)
- `hooks/commit-msg` — Added tips for risk/debt when tags footer is present
- `docs/COMMIT_CONVENTION.md` — Full documentation of all 4 new fields with examples
- `docs/EXTRACTION_PLAYBOOK.md` — Updated schema, review format, guidelines, validation, examples table

**Design decisions:**
- Fields are optional everywhere for backward compatibility (1163 existing commits have no data)
- Dashboard sections only render when data exists (conditional `hasRiskData`/`hasDebtData`/etc.)
- Epic is normalized to lowercase for consistent grouping

---

### Fix extract-api.js Missing Commits (Pagination Bug)

**Why:** GitHub API extraction was missing commits — 6 in canva-grid (all by `jacotheron87@gmail.com`) and 1 in model-pear (by `noreply@anthropic.com`). Root cause: `fetchCommitList()` used a manual `?page=N` loop calling `gh()` directly, bypassing the `ghApi()` helper that already supported `--paginate`. Manual pagination can miss commits when the API reorders results between page requests.

**Changes:**
- `scripts/extract-api.js` — Replaced manual pagination loop with single `ghApi(endpoint, { paginate: true })` call. The `gh` CLI's `--paginate` flag follows Link headers for reliable cursor-based traversal, eliminating page boundary gaps.

---

## 2026-02-13

### CLAUDE.md — Merge Development Standards

**Why:** The existing CLAUDE.md had strong project-specific documentation and AI session management but lacked explicit coding standards (best practices, code organization thresholds, cleanup rules, quality checks, UX guidelines, prohibitions). Merged a reference template of development standards to fill these gaps.

**Changes:**
- `CLAUDE.md` — Added 9 new sections from reference template:
  - **HARD RULES** at top: Before Making Changes, Best Practices (SOLID/DRY), Code Organization (line thresholds), Decision Documentation in Code (with project-specific example), User Experience (non-technical users, good/bad examples), Frontend: Styles and Scripts (adapted for React + Tailwind), Documentation, Cleanup, Quality Checks
  - **Project-Specific Configuration**: Paths, Stack, and Conventions filled in with actual project values
  - **Communication Style**: Direct, concise, no filler
  - **Testing**: Rules + note about no current test framework
  - **Prohibitions**: 12 "never" rules including 4 drawn from AI Lessons
  - Updated Principles #1, #3, #8 to cross-reference their expanded Hard Rules sections
  - Added cleanup check to Before Each Commit checklist
  - Trimmed AI Notes to 3 items (others now covered by Hard Rules/Prohibitions)

---

## 2026-02-11

### Fix Pie Chart Legend Text Color

**Why:** The tag distribution doughnut chart legend text was coloured to match each slice's background colour (e.g., green for "feature", red for "bugfix"), making labels hard to read against the dark background. Chart.js doughnut/pie defaults use segment colours for legend text when a custom `generateLabels` doesn't explicitly set `fontColor`.

**Changes:**
- `dashboard/js/tabs/TagsTab.jsx` — Added `color` to legend labels config and `fontColor` to each label returned by `generateLabels`, both reading `--text-secondary` CSS variable for theme consistency.

### Tab Renames & Discover UI Fixes

**Why:** Tab names didn't accurately describe their content. "Overview" was vague for a summary page. "Activity" could mean anything — the content is temporal (timeline charts, heatmaps, timing patterns). "Work" was too generic since every tab is about work — the content specifically decomposes data by type, person, and category. The Discover tab's first section had multiple UI issues: redundant title, accessibility violation (interactive button nested in interactive collapsible header), unlabeled pin buttons, and inconsistent select styling.

**Changes:**
- `dashboard/js/components/TabBar.jsx` — Tab labels renamed: Overview→Summary, Activity→Timeline, Work→Breakdown (internal IDs unchanged for backward compatibility)
- `dashboard/js/tabs/DiscoverTab.jsx` — Section title "Discover"→"Metrics". Shuffle button moved from CollapsibleSection subtitle to content area. Pin buttons given `aria-label`. Select dropdown restyled with `bg-themed-tertiary rounded` instead of `bg-transparent border-none`.
- `dashboard/js/tabs/ProgressTab.jsx` — "Work Summary" section renamed to "Summary" (avoid repeating tab name in section title)
- Updated docs: CLAUDE.md, USER_GUIDE.md, USER_TESTING.md, SESSION_NOTES.md

### Fix PWA Install Button Missing After Uninstall

**Why:** After uninstalling the PWA, the install button didn't reappear. The `appinstalled` event sets `localStorage.pwaInstalled = 'true'`, but nothing cleared it on uninstall. The `beforeinstallprompt` handler checked this stale flag and bailed out, suppressing the install prompt.

**Fix:** `beforeinstallprompt` is the browser's authoritative signal that the app is NOT installed. The handler now clears the stale `pwaInstalled` localStorage flag when this event fires, then proceeds normally to capture the prompt and show the install button. Also made `isInstalledPWA()` read live state instead of a one-time const.

**Changes:**
- `dashboard/js/pwa.js` — Removed `isPWAInstalled` const (was computed once at load, became stale). `beforeinstallprompt` handler now clears `localStorage.pwaInstalled` instead of checking it. `isInstalledPWA()` now reads `isStandalone` and localStorage live.

### Sticky Tabs & Filter Button Relocation

**Why:** The tab bar scrolled out of view on long pages, making tab navigation inconvenient. The filter toggle button was awkwardly placed inside the tab bar — filters are a global action that affects all tabs, not a tab navigation concern.

**Changes:**
- `dashboard/js/App.jsx` — Moved `<TabBar />` above the `max-w-7xl` container so it sits at the top level, allowing the sticky background to span full viewport width.
- `dashboard/js/components/TabBar.jsx` — Removed the filter toggle button. Added inner `max-w-7xl` container to align tab buttons with page content. Simplified to only tab navigation concerns.
- `dashboard/js/components/Header.jsx` — Added filter toggle button (with badge) next to the settings gear. Filters now live alongside other global controls (install, update, settings).
- `dashboard/styles.css` — Removed negative margin/padding hack from `.tabs-bar` (no longer needed since it's full-width at top level). Sticky positioning preserved.

### Eliminate PWA Event Race Condition

**Why:** Header's `useEffect` event listeners could miss `pwa-install-ready` or `pwa-update-available` events if they fired before React mounted. The static import fix made this unlikely but not impossible — the race still existed in theory between module-level code execution and React's first useEffect run.

**Fix:** `pwa.js` now tracks its own state with `_installReady` and `_updateAvailable` booleans, updated whenever events fire. A new `getPWAState()` export returns the current values. Header calls this on mount to seed its local state, with event listeners still handling subsequent changes. No globals, no hacks — just a getter function.

**Changes:**
- `dashboard/js/pwa.js` — Added `_installReady`/`_updateAvailable` state booleans, exported `getPWAState()`. State updated in `beforeinstallprompt`, `appinstalled`, `onNeedRefresh`, and `checkForUpdate`.
- `dashboard/js/components/Header.jsx` — Imported `getPWAState`, calls it at the start of the PWA useEffect to seed `installReady`/`updateAvailable` state.

### Fix Install Button Not Appearing

**Why:** `pwa.js` was dynamically imported in a `useEffect` — it loaded after React rendered, so `beforeinstallprompt` could fire before the listener existed. The prompt was lost and the install button never appeared.

**Fix:** Static `import './pwa.js'` in `main.jsx`. Module loads synchronously with everything else, listener is ready before the browser fires the event. No race condition.

**Changes:**
- `dashboard/js/main.jsx` — Static import of `pwa.js` (replaces early-capture hack)
- `dashboard/js/App.jsx` — Removed dynamic `import('./pwa.js')` useEffect
- `dashboard/js/components/Header.jsx` — Static import of `installPWA`/`applyUpdate` from pwa.js (replaces dynamic imports)
- `dashboard/js/pwa.js` — Reverted to clean state (no global variable sync)

### Interactive Debug Banner

**Why:** The "0 errors" debug pill was non-interactive — clicking it did nothing. A debug banner should always provide useful info.

**Changes:**
- `dashboard/js/main.jsx` — Clicking the "0 errors" pill now expands to a diagnostics panel showing: SW support, SW controller status, standalone mode, PWA install state, install prompt status, error count, and user agent. Has Copy and Close buttons.

### Fix Missing UI Elements (Post-Migration)

**Why:** Several UI elements were lost during the React migration: (1) the debug error banner was hidden by default (display:none until first error), so users couldn't see it existed; (2) the Install and Update PWA buttons were never ported from vanilla JS to the React Header component — only the Settings gear button remained; (3) multi-component tabs (Activity, Work, Health) had no spacing between their sub-components because React fragments don't add layout; (4) Chart.js legend text was invisible on dark background because Chart.defaults.color was never set (defaulted to #666 instead of reading --text-secondary).

**Changes:**
- `dashboard/js/main.jsx` — Debug banner now creates eagerly on page load and always shows: a small green "0 errors" pill in the bottom-right when clean, expanding to the full red error log when errors occur. Also added `Chart.defaults.color` and `Chart.defaults.borderColor` read from CSS variables for proper dark theme support.
- `dashboard/js/components/Header.jsx` — Restored Install and Update buttons. Listens for `pwa-install-ready`, `pwa-installed`, and `pwa-update-available` custom events from pwa.js. Install button triggers native prompt (Chromium) or falls back to opening Settings. Update button applies pending SW update. Buttons use existing `btn-icon` / `btn-primary` / `btn-secondary` CSS. Added `flex-wrap` for mobile.
- `dashboard/js/App.jsx` — Wrapped multi-component tab content in `<div className="space-y-6">` instead of bare fragments, so there's consistent 24px spacing between TimelineTab/TimingTab, ProgressTab/ContributorsTab/TagsTab, and HealthTab/SecurityTab.

### Debug Error Banner

**Why:** Diagnosing dashboard issues required users to open browser dev tools to see error messages. Added a visible error banner that captures all errors and lets users copy-paste them for bug reports.

**Changes:**
- `dashboard/js/main.jsx` — Added global error capture (`window.onerror`, `unhandledrejection`) and a fixed-position red banner at the bottom of the screen. Shows error messages with timestamps, has "Copy" and "Close" buttons. Works independently of React (vanilla DOM). `RootErrorBoundary.componentDidCatch` now feeds errors into the banner with component stack traces.

### Force Fresh JS/CSS on Pull-to-Refresh

**Why:** PWA served cached JS/CSS on pull-to-refresh even after a new build was deployed. Users had to manually click "Update" in settings or wait for the hourly check.

**Changes:**
- `vite.config.js` — Added `skipWaiting: true` + `clientsClaim: true` to workbox config so new service workers activate immediately instead of waiting.
- `dashboard/js/pwa.js` — Added `controllerchange` listener that reloads the page when a new SW takes control, ensuring the reload picks up fresh assets.

### Fix Dashboard Null Metadata Crash

**Why:** Dashboard crashed on load with "Cannot read properties of null (reading 'metadata')". The `RootErrorBoundary` caught it and showed "Something went wrong loading the dashboard." The root cause was a timing issue: in `AppContext.jsx`, the global state sync (`globalState.data = state.data`) ran after the `useMemo` hooks that depend on it. When `LOAD_DATA` triggered a re-render, `filterOptions` useMemo called `getAuthorEmail()`, which read `globalState.data.metadata` — but `globalState.data` was still `null` from the previous render.

**Changes:**
- `dashboard/js/AppContext.jsx` — Moved global state sync to run before all `useMemo` hooks so utility functions always see current data.
- `dashboard/js/utils.js` — Added defensive optional chaining (`state.data?.metadata`) in `getAuthorName` and `getAuthorEmail` as a safety net.

### Fix Loading Indicator Flash & Black Screen

**Why:** After the previous loading indicator fix, users saw the loading indicator flash briefly before the screen went black again. Root causes: (1) data loading errors were silently swallowed — `.catch(() => {})` hid real failures (network errors, JSON parse errors, CORS issues), leaving users with an invisible DropZone on a dark background; (2) no visual transition between loading and content states; (3) PWA import error not properly caught (try/catch on a promise); (4) DropZone was too subtle on dark background when shown as fallback.

**Changes:**
- `dashboard/js/App.jsx` — Proper error handling: only 404 is silently ignored (expected when no data file), all other errors show a visible error card with retry button. Added `dashboard-enter` fade-in class to both dashboard and no-data states. Fixed PWA import to properly handle promise rejection.
- `dashboard/styles.css` — Added `dashboard-enter` fade-in animation (0.3s ease-out) for smooth loading-to-content transition.
- `dashboard/js/components/DropZone.jsx` — Added title heading and vertical centering so the DropZone is clearly visible when no data is loaded.

### Fix Black Screen — Loading Feedback & Error Recovery

**Why:** Users could see a black screen with no feedback if: (1) React failed to mount or crashed during render, (2) the loading spinner was too subtle to notice (thin 2px border on dark background), or (3) JavaScript failed to load entirely.

**Changes:**
- `dashboard/index.html` — Added HTML-level loading indicator inside `#root` (spinner + "Loading dashboard..." text + noscript fallback). Visible immediately before JS loads; replaced when React mounts.
- `dashboard/js/main.jsx` — Added `RootErrorBoundary` wrapping the entire app. Catches any unhandled React error and shows an error message with reload button instead of a blank screen.
- `dashboard/js/App.jsx` — Improved React loading state: thicker spinner border (3px), added "Loading dashboard..." text below spinner.

## 2026-02-10

### Fix DropZone Flash on Pull-to-Refresh

**Why:** Pull-to-refresh briefly flashed the "Drop JSON here" DropZone before data loaded, because `state.data` starts as `null` and the `data.json` fetch runs in a `useEffect` (after first render).

**Changes:**
- `dashboard/js/App.jsx` — Added `initialLoading` state; shows centered spinner (reuses existing `.loading-spinner` CSS) until initial fetch completes, then shows dashboard or DropZone

### Fix PWA White Screen — Missing CSS Import

**Why:** React migration removed `<link rel="stylesheet" href="./styles.css">` from `index.html` but never added a JS import in `main.jsx`. The build produced no CSS file, causing white text on white background (dark theme colors undefined).

**Changes:**
- `dashboard/js/main.jsx` — Added `import '../styles.css'` so Vite includes CSS in the build
- Build: 59 modules, 475KB JS + 47KB CSS, 14 precache entries

### React Migration Fixes (Final 7)

**Why:** Completed all remaining post-migration issues (22/22 done).

**Changes:**
- `dashboard/js/components/FilterSidebar.jsx` — Added `aria-expanded`, `aria-haspopup="listbox"`, `role="listbox"`, `role="option"`, `aria-selected`, `aria-pressed` on mode toggles, Escape to close dropdown
- `dashboard/js/hooks/useFocusTrap.js` — New shared hook: traps Tab/Shift+Tab within a container, auto-focuses first element
- `dashboard/js/components/DetailPane.jsx` — Added focus trap ref, removed body overflow management (centralized)
- `dashboard/js/components/SettingsPane.jsx` — Added focus trap ref
- `dashboard/js/App.jsx` — Centralized body overflow: single useEffect watches both `detailPane.open` and `settingsPaneOpen`
- `dashboard/js/AppContext.jsx` — Replaced async `useEffect` global state sync with synchronous inline assignment (eliminates one-frame lag)
- `dashboard/js/tabs/DiscoverTab.jsx` — Moved `fileNameCache` from module-level to `useRef` (GC'd on unmount, no unbounded growth)
- Build: 58 modules, 475KB bundle

### React Migration Fixes (First 15)

**Why:** Fixed 15 of 22 issues identified during post-migration review.

**Changes:**
- Deleted 17 vanilla JS files: `main.js`, `filters.js`, `ui.js`, `export.js`, `data.js`, `tabs.js`, `tabs/*.js`
- `dashboard/js/pwa.js` — Rewrote: removed `ui.js` import, replaced DOM manipulation with custom events
- `dashboard/js/charts.js` — Removed `filters.js` import and vanilla render functions; only exports pure data functions
- `dashboard/js/components/ErrorBoundary.jsx` — New error boundary component
- `dashboard/js/App.jsx` — Wrapped tab content with ErrorBoundary, removed unused isDragOver state
- `dashboard/js/AppContext.jsx` — isMobile now tracks window resize via debounced state
- `dashboard/js/utils.js` — Added `getTagStyleObject()` returning React-compatible style objects
- `dashboard/js/components/DetailPane.jsx` — Removed escapeHtml/parseInlineStyle, added dialog role, Escape key, aria-label
- `dashboard/js/components/SettingsPane.jsx` — Added dialog role, Escape key, aria-label, role/tabIndex on toggles
- `dashboard/js/components/TabBar.jsx` — Added role="tablist"/role="tab"/aria-selected, removed data-tab
- `dashboard/js/components/CollapsibleSection.jsx` — Added role="button"/tabIndex/keyboard, removed data-section
- `dashboard/js/components/Header.jsx` — aria-label on settings button
- `dashboard/js/tabs/TimelineTab.jsx`, `ContributorsTab.jsx`, `TagsTab.jsx` — Removed escapeHtml import, parseInlineStyle, use getTagStyleObject
- `dashboard/js/tabs/TimingTab.jsx`, `SecurityTab.jsx`, `HealthTab.jsx` — Removed escapeHtml import
- `dashboard/js/tabs/SummaryTab.jsx` — Removed data-summary-card, fixed index keys
- `dashboard/js/tabs/ProgressTab.jsx` — Removed data-work-card
- `dashboard/js/tabs/DiscoverTab.jsx` — Fixed index keys on metric cards and comparisons
- Build: 70 → 57 modules transformed

### React Migration Review

**Why:** Post-migration review to catch issues missed during the React migration.

**Findings:** 22 issues identified across critical (5), functional (5), accessibility (6), and code quality (6) categories. All documented in TODO.md.

### React + Tailwind Migration

**Why:** Migrated dashboard from vanilla JS to React for declarative rendering, component isolation, and better developer ergonomics.

**Changes:**
- `vite.config.js` — Added @vitejs/plugin-react
- `package.json` — Added react, react-dom, react-chartjs-2, @vitejs/plugin-react
- `dashboard/index.html` — Simplified to root div + script tag (was 880 lines)
- `dashboard/js/main.jsx` — New React entry point with Chart.js registration
- `dashboard/js/AppContext.jsx` — React Context + useReducer state management
- `dashboard/js/App.jsx` — Main app component with data loading and tab routing
- `dashboard/js/components/` — 7 shared components (Header, TabBar, DropZone, FilterSidebar, DetailPane, SettingsPane, CollapsibleSection)
- `dashboard/js/tabs/*.jsx` — 9 tab components (Summary, Timeline, Timing, Progress, Contributors, Tags, Health, Security, Discover)

**Architecture:**
- State: AppContext with useReducer (replaces mutable global state object)
- Charts: react-chartjs-2 declarative components (replaces manual destroy/recreate)
- Events: React onClick props (replaces delegated-handlers.js)
- Filters: Controlled React components
- Compatibility: useEffect syncs React state → global state object so utils.js works unchanged

---

### Docs: React + Tailwind Migration Analysis

**Why:** Initial effort assessment before implementation.

---

### Fix: Default Filter Indicator on Load

**Why:** When default filters were applied on first visit (exclude merge, date from 2025-12-01), the filter indicator ("X of Y") and badge didn't show in the UI, giving no visual feedback that filters were active.

**Changes:**
- `dashboard/js/filters.js` — `updateFilterIndicator()` now shows the indicator whenever any filter is active, removing the `filtered.length !== total` gate that suppressed it when defaults didn't reduce the commit count.

---

### Remove: Privacy Mode Toggle (Always-On Sanitization)

**Why:** Filenames should never be revealed. The privacy toggle allowed users to disable sanitization, which conflicts with the tool's design goal. Sanitization (anonymized names and messages) should always be active.

**Changes:**
- `dashboard/index.html` — Removed `btn-sanitize` button (eye icon) from header and `settings-privacy-toggle` from Settings panel.
- `dashboard/js/utils.js` — `sanitizeName()` and `sanitizeMessage()` now always anonymize (removed `if (!state.isSanitized) return` guards).
- `dashboard/js/state.js` — Removed `isSanitized` property.
- `dashboard/js/ui.js` — Removed `initSanitizeMode()`, `applySanitizeMode()`, `toggleSanitizeMode()` functions and privacy toggle handler from `setupSettingsPanel()`. Cleaned up imports.
- `dashboard/js/main.js` — Removed `initSanitizeMode` import and call.
- `dashboard/js/export.js` — Removed `toggleSanitizeMode` import and `btn-sanitize` event listener.
- `dashboard/js/tabs/security.js` — Commit body details always show `[Details hidden]`.

**Impact:** Build reduced from ~112KB to ~111KB. Privacy is now enforced at the code level with no user override.

---

### Docs: Architecture Decision Record — Vanilla JS

**Why:** No documented rationale existed for choosing vanilla JS over a framework. Future contributors need to understand the reasoning and know when to reconsider.

**Changes:**
- `docs/ADR-001-vanilla-js.md` — **New.** Explains the decision, trade-offs accepted, mitigations (template helpers, event delegation, module split), and criteria for when to adopt a framework.

---

### Refactor: Template Helpers, Event Delegation, tabs.js Split

**Why:** The dashboard had three code organization pain points: (1) duplicated HTML template patterns for urgency/impact bars across 3 view levels each, (2) remaining `addEventListener` with init flags and `setTimeout` workarounds that weren't yet migrated to delegation, (3) a 2,100-line monolithic `tabs.js` file.

**Changes:**
- `dashboard/js/utils.js` — Added `renderUrgencyBar()`, `renderImpactBar()`, `renderStatCard()` template helpers. Each replaces 15-25 lines of duplicated HTML string building.
- `dashboard/js/tabs.js` — Now a thin re-export barrel from `./tabs/index.js`. All existing imports from `./tabs.js` continue to work unchanged.
- `dashboard/js/tabs/` — **New directory.** 10 focused modules + barrel:
  - `timeline.js`, `progress.js`, `contributors.js`, `security.js`, `health.js`, `tags.js`, `timing.js`, `summary.js`, `discover.js`, `delegated-handlers.js`, `index.js`
- `dashboard/js/tabs/delegated-handlers.js` — `setupDelegatedHandlers()` now handles ALL click delegation: activity cards, work cards, health cards, summary cards, period cards, security repo, load-more button, plus all previously-delegated urgency/impact/tag/contributor/repo handlers.
- `dashboard/js/state.js` — Removed 4 handler initialization flags (no longer needed).

**Impact:** Build output unchanged (112KB gzipped ~29KB). 27 modules transformed (up from 16). No functional changes — pure code organization.

---

### Refactor: PWA Rewrite — Dedicated Module with Prompt-Based Updates

**Why:** Previous PWA implementation (autoUpdate + injectRegister:'script' in export.js) was unreliable. Rewrote to match a proven working pattern from another project, adapted to vanilla JS.

**Changes:**
- `dashboard/js/pwa.js` — **New module.** Install flow with `beforeinstallprompt` for Chromium + `getInstallInstructions()` fallback modal for Safari/Firefox. Update flow uses `virtual:pwa-register` with `registerType:'prompt'` for explicit SW activation control. Hourly update polling via `setInterval`. Green "Update" button in header when update is available. `visibilitychange` listener for passive update checks.
- `dashboard/js/export.js` — Removed all PWA code (install prompt, update checks, SW listeners).
- `dashboard/js/main.js` — Imports `installPWA`, `checkForUpdate`, `applyUpdate` from pwa.js instead of export.js.
- `vite.config.js` — Changed `registerType` from `'autoUpdate'` to `'prompt'`, removed `injectRegister: 'script'`.
- `dashboard/index.html` — Added green "Update" button in header (hidden by default, shown when update detected). Updated Settings panel update text.

---

### Fix: PWA Install Button, Default Filters, Filter Alignment

**Why:** Three UI bugs: (1) PWA install button still visible after installing the app because installed state wasn't persisted across sessions, (2) default date filters were overwritten by `applyUrlState()` even when no URL params existed, (3) filter dropdown checkboxes and text were misaligned due to missing flex-shrink and sizing on checkboxes.

**Changes:**
- `dashboard/js/export.js` — Persist PWA installed state in localStorage (`pwaInstalled`). Check both localStorage and `display-mode: standalone` media query. Guard `beforeinstallprompt` against both. Fix `applyUrlState()` to only set date filters when URL params actually contain date values.
- `dashboard/styles.css` — Add `flex-shrink: 0`, explicit `width`/`height` (14px), and `line-height` to filter dropdown options for consistent checkbox/text alignment.

---

### Feature: Default Filters (Exclude Merges, Date from Dec 2025)

**Why:** First-time visitors saw all data including merge commits and old history. Sensible defaults provide a better out-of-box experience while still being overridable.

**Changes:**
- `dashboard/js/state.js` — Added `FILTER_DEFAULTS` config: tag exclude `merge`, dateFrom `2025-12-01`
- `dashboard/js/filters.js` — Added `applyDefaultFilters()` that sets state + updates UI (checkboxes, mode toggles, date inputs)
- `dashboard/js/data.js` — Calls `applyDefaultFilters()` when no localStorage and no URL params exist

**Behavior:** Defaults only apply on first visit. Once the user changes any filter, their choices are saved to localStorage and used on subsequent visits. URL params also override defaults.

---

## 2026-02-09

### Fix: PWA Install Button Visible in Standalone Mode + Mobile Button Wrapping

**Why:** The install button could appear when running as an installed PWA because the standalone detection only updated status text without hiding the button or guarding the `beforeinstallprompt` handler. Header buttons also overflowed on mobile due to missing `flex-wrap`.

**Changes:**
- `dashboard/js/export.js` — Added `isStandalone` flag checked at module load. `beforeinstallprompt` handler now returns early in standalone mode. Standalone detection now calls `hidePWAInstallButton()` and hides the entire PWA settings section.
- `dashboard/index.html` — Added `flex-wrap` to `#export-buttons` container so buttons wrap on narrow screens.

---

### Fix: PWA Pull-to-Refresh Not Updating to Latest Version

Pull-to-refresh and page reload now properly update the PWA to the latest version.

**Why:** With `registerType: 'autoUpdate'`, the service worker calls `skipWaiting()` on install and takes control automatically. But the page loaded from the old cache was never told to reload when the new SW took over. Users had to fully close and reopen the app to see updates — pull-to-refresh served stale cached content.

**Changes:**
- `dashboard/js/export.js` — Added `controllerchange` listener that auto-reloads the page when a new service worker takes control. This is the key fix: when the new SW activates (even mid-session), the page reloads to get fresh content from the new cache.
- `dashboard/js/export.js` — Added `visibilitychange` listener to trigger SW update checks when the user returns to the app (e.g., switching from another app). This ensures updates are detected sooner.
- `dashboard/js/export.js` — Updated `checkForUpdate()` to show "Reloading..." and auto-reload instead of telling users to "close and reopen."
- `dashboard/index.html` — Updated Settings panel update description to say "Pull to refresh or reload" instead of "Close and reopen."

---

### Improve: Mobile-Optimized Charts and Graphs

All charts, heatmaps, and graph containers optimized for mobile viewports.

**Why:** Fixed-height chart containers, large heatmap cells, and desktop-sized Chart.js fonts made graphs hard to read on mobile devices. Charts were either clipped, overflowed, or had overlapping labels on small screens.

**Chart containers (index.html):**
- 8 charts changed from fixed `h-64`/`h-80`/`h-48` to responsive heights: `h-48 md:h-64`, `h-56 md:h-80`, `h-40 md:h-48`

**Heatmap (styles.css):**
- Grid: `min-width` reduced from 400px to 280px on mobile, label column from 50px to 36px
- Cells: `min-width`/`min-height` reduced from 28px to 20px on mobile
- Labels and headers: font-size 9px on mobile, 11px on desktop

**Chart.js instances (charts.js, tabs.js):**
- All 10 charts now use `isMobile()` helper from `state.js` for responsive options
- Tick/axis font sizes: 9px on mobile, 12px on desktop
- Legend labels: smaller box widths (8px) and font sizes (9px) on mobile
- X-axis rotation: 60deg on mobile (vs 45deg) for tighter label fit
- Label skip frequency increased on mobile (show fewer labels to prevent overlap)
- Doughnut legend: tighter padding and smaller font on mobile

**Card layout (styles.css):**
- Card padding: 16px on mobile (vs 24px desktop)
- Stat numbers: 1.5rem on mobile (vs default 1.875rem)

---

### Improve: Complete UI/UX Backlog — 9 Items

Completed all remaining UI/UX improvements from the 2026-02-07 review.

**Why:** The initial review identified 21 issues and fixed 10. This batch addresses the remaining 9 actionable items (file anonymization kept as-is by design) covering usability, performance, accessibility, and build quality.

**Usability:**
- `index.html` — Tab buttons renamed from "Breakdown"/"Risk" to "Work"/"Health" to match TAB_MAPPING keys and docs
- `index.html` — Filter mode toggles now say "Include"/"Exclude" instead of cryptic "Inc"/"Exc"
- `tabs.js` — Changes list has "Load more" button (100 at a time) instead of hard 100 cap

**Performance:**
- `filters.js` — `applyFilters()` now only renders the active tab; others marked dirty and re-rendered on switch via `state.activeTab`/`state.dirtyTabs`
- `tabs.js` — Replaced per-render `addEventListener` calls with single delegated click handler on `#dashboard` (`setupDelegatedHandlers()`) — eliminates listener accumulation across re-renders

**Accessibility:**
- `charts.js`, `main.js`, `styles.css` — Replaced native `title` heatmap tooltips with custom floating tooltip (instant on mouse, works on touch with 2s display)
- `filters.js` — Multi-select dropdowns now keyboard navigable: Enter/Space opens, Arrow Up/Down navigates options, Escape closes
- `tabs.js` — Added percentage text labels below all stacked urgency/impact bars (mgmt + dev views) for color-blind accessibility

**Build:**
- `vite.config.js`, `package.json`, `styles.css`, `index.html` — Migrated from CDN Tailwind (`cdn.tailwindcss.com` script) to build-time Tailwind v4 via `@tailwindcss/vite` plugin. Removed CDN script tag and runtime caching rule. Added `@import "tailwindcss"` and `@custom-variant dark` for class-based dark mode.

---

## 2026-02-07

### Fix: UI/UX Review — Bugs, Usability, and Accessibility

Comprehensive UI/UX review identified 21 issues. Fixed the 10 most impactful.

**Why:** Several bugs caused incorrect visual state (filter badge always visible, PDF always showing "Filtered view"), toast notifications destroyed their own DOM element, and the detail pane had an unnecessary 150ms skeleton delay. The file upload was a bare `<input>`, collapsible sections weren't keyboard accessible, and icon buttons lacked screen reader labels.

**Bug Fixes:**
- `filters.js` — `updateFilterBadge()` checked `state.filters.tag` (always-truthy object) instead of `state.filters.tag.values.length > 0`
- `export.js` — `hasActiveFilters()` had the same truthy-object bug, making PDF export always say "Filtered view"
- `ui.js` — `showToast()` removed the static `#toast` element from DOM on first call; now reuses it
- `ui.js` — Removed duplicate `updateFilterBadge()` definition (canonical version is in `filters.js`)
- `ui.js` — Removed artificial 150ms `setTimeout` delay in `openDetailPane()` (data is already in memory)

**UX Improvements:**
- `index.html`, `styles.css`, `main.js` — Replaced bare file input with styled drag-and-drop drop zone
- `filters.js`, `styles.css` — Filter badge now shows active filter count (number) instead of 8px dot
- `filters.js`, `styles.css` — Quick-select date preset buttons show `.active` state when selected

**Accessibility:**
- `ui.js` — Collapsible headers now have `tabindex="0"`, `role="button"`, and keyboard handlers (Enter/Space)
- `index.html` — Added `aria-label` to 6 icon-only buttons (settings, privacy, share, install, export, filter toggle)

**Remaining items** added to `docs/TODO.md` backlog (10 items including tab naming, event listener cleanup, lazy rendering, keyboard-navigable filters).

---

## 2026-02-06

### Docs: Post-Modularization Cleanup

Updated documentation that was stale after the Vite migration and dashboard modularization.

**Why:** Several docs still referenced the pre-modularization single-file dashboard. Hosting instructions told users to open `dashboard/index.html` directly (won't work with ES modules). TODO.md had 10 completed items that should have been removed. HISTORY.md had incorrect file references for the PDF export fix.

**Changes:**
- **TODO.md** - Removed all completed `[x]` items (already tracked in HISTORY.md), kept only untested warnings and open research items
- **ADMIN_GUIDE.md** - Updated hosting section: replaced "open index.html" with dev server instructions, updated static host section to reference `dist/` build output
- **HISTORY.md** - Fixed PDF export entry to reference actual modular files (`export.js`, `ui.js`) instead of just `index.html`
- **CLAUDE.md** - Updated Key Components to reflect modular dashboard structure and Vite build

---

### Refactor: Dashboard Modularization

Split the monolithic 6,927-line `dashboard/index.html` into ES modules for maintainability.

**Why:** The single-file dashboard had grown to ~1,200 lines of CSS, ~870 lines of HTML, and ~4,840 lines of JavaScript all inlined. This made it difficult to navigate, edit, or review specific concerns. Splitting into focused modules makes each concern independently readable and editable.

**Changes:**
- Extracted CSS to `dashboard/styles.css` (1,200 lines)
- Split JS into 9 ES modules in `dashboard/js/`:
  - `state.js` - Shared state object, VIEW_LEVELS, SECTION_GUIDANCE
  - `utils.js` - Tag helpers, author resolution, formatting, holidays, sanitization
  - `filters.js` - Filter system, persistence, multi-select dropdowns
  - `ui.js` - Detail pane, settings panel, dark mode, collapsible sections
  - `charts.js` - Chart.js timeline and heatmap rendering
  - `tabs.js` - All tab-specific rendering (Overview, Activity, Work, Health, Discover)
  - `data.js` - Data loading and multi-file combining
  - `export.js` - PDF export, shareable URLs, PWA support
  - `main.js` - Entry point, tab navigation, initialization
- Slimmed `index.html` to 889 lines (HTML structure only)
- Vite bundles all modules into a single JS file for production

**Files added:** `dashboard/styles.css`, `dashboard/js/*.js` (9 files)
**Files modified:** `dashboard/index.html`

---

### Fix: PDF Export, Button Icons, and PWA Updates

Fixed three user-reported issues with the dashboard.

**Why:** The Install and PDF buttons had identical download-arrow icons with text hidden on mobile, making them indistinguishable. PDF export produced a blank white page due to two bugs: wrong tab ID lookup (using `tab-work` instead of the actual containers from TAB_MAPPING), and dark theme text becoming invisible on the white PDF background. Installed PWA users had no way to check for or trigger updates.

**Changes:**
- **Button icons:** Install now uses an app-install icon; PDF uses a document icon. Labels always visible (not just on sm+)
- **PDF export:** Uses TAB_MAPPING to find correct content containers for all tabs. Converts chart canvases to images before cloning. Overrides dark theme colors to ensure text/cards are readable on white background
- **PWA updates:** Added "Check for Updates" button in Settings with status feedback. Added explanation that the app auto-updates and users should close/reopen to apply

**Files updated:**
- `dashboard/index.html` - Button icons, PWA settings section
- `dashboard/js/export.js` - PDF export fix (TAB_MAPPING, canvas-to-image, dark theme overrides)
- `dashboard/js/ui.js` - PWA update check button

---

## 2026-02-05

### Feature: Vite + PWA Plugin Setup

Migrated from manual PWA setup to Vite with vite-plugin-pwa for proper PWA support.

**Why:** The manual service worker and manifest setup wasn't working reliably. vite-plugin-pwa handles all the complexity: service worker generation, manifest injection, workbox caching strategies, and auto-updates.

**Changes:**
- Added Vite as build tool (`npm run dev`, `npm run build`, `npm run preview`)
- Added vite-plugin-pwa with workbox for robust offline support
- Configured runtime caching for CDN assets (Tailwind, Chart.js, fonts)
- Updated GitHub Actions workflow to build with Vite before deploying
- Removed manual sw.js and manifest.json (now auto-generated)

**Files added:**
- `vite.config.js` - Vite configuration with PWA plugin
- `dashboard/public/icons/` - Static icons directory for Vite

**Files updated:**
- `package.json` - Added Vite dependencies and scripts
- `.github/workflows/deploy.yml` - Build with Vite before deploying
- `.gitignore` - Added `dist/` folder
- `dashboard/index.html` - Removed manual service worker registration

**Files removed:**
- `dashboard/sw.js` - Now generated by vite-plugin-pwa
- `dashboard/manifest.json` - Now generated by vite-plugin-pwa

**Development:**
```bash
npm install    # Install dependencies
npm run dev    # Start dev server with hot reload
npm run build  # Production build to dist/
npm run preview # Preview production build
```

---

## 2026-02-04

### Fix: PWA Installation Not Working on GitHub Pages

Fixed the PWA not being installable on GitHub Pages.

**Problem:** The manifest.json used absolute paths (`"scope": "/"`, `"start_url": "/"`) which point to the root of github.io, not the `/repo-tor/` subdirectory where the dashboard is actually served.

**Solution:** Changed to relative paths that work regardless of deployment location:
- `"scope": "./"` - Scope relative to manifest location
- `"start_url": "./index.html"` - Start URL relative to manifest location

Also updated service worker precache paths to use relative URLs and bumped cache version to force refresh.

**Files updated:**
- `dashboard/manifest.json` - Changed scope and start_url to relative paths
- `dashboard/sw.js` - Changed precache paths to relative, bumped version to v2

---

### Feature: Per-Filter Modes & PWA Help

Improved filter UX with per-filter modes and added PWA install guidance in Settings.

**Filters - Per-Filter Modes:**
- Removed global AND/OR/Exclude mode selector (didn't make logical sense globally)
- Added per-filter Include/Exclude toggle for each filter type
- Converted single-select dropdowns to multi-select checkboxes
- Filter modes are now: Tag (Inc/Exc), Author (Inc/Exc), Repo (Inc/Exc), Urgency (Inc/Exc), Impact (Inc/Exc)
- Updated URL shareable links to support multi-select (comma-separated, `!` prefix for exclude)
- Updated localStorage persistence for new filter structure

**PWA Install Help:**
- Added "Install App" section to Settings panel
- Shows install status (Ready/Installed/Unsupported)
- Includes "Install Dashboard" button
- Manual install instructions for Chrome, Safari, Firefox
- Auto-detects if already running as standalone app

**Files updated:**
- `dashboard/index.html` - Filter UI, filter logic, PWA section in settings
- `docs/USER_GUIDE.md` - Added Filters and PWA sections
- `docs/SESSION_NOTES.md` - Updated recent changes
- `docs/TODO.md` - Marked items complete

---

### Feature: Dashboard Polish & PWA Support

Completed all remaining polish items and added PWA offline support.

**Detail Pane:**
- Loading states with skeleton placeholders
- Fade-in animation when content loads
- Shareable URL state (tag, author, impact, urgency drilldowns)

**PDF Export:**
- Updated for new 4-tab layout
- Shows all 4 key metrics (Features, Bugs, Urgency, Planned)
- Fixed tab name references

**Filters:**
- Added urgency filter dropdown (Planned/Normal/Reactive)
- Added impact filter dropdown (User-facing/Internal/Infrastructure/API)
- Added quick select presets (30 days, 90 days, This year, Last year)

**Visual Theme:**
- Added JetBrains Mono font for headings, numbers, tabs, buttons
- Added subtle grid pattern background
- Added glow effects on card hover
- Added gradient accent line under header
- Updated tabs with uppercase monospace styling

**PWA Support:**
- Service worker with cache-first strategy
- Web app manifest with theme colors
- Install button (appears when browser supports it)
- Update prompt when new version available
- SVG + PNG icons for all platforms

**Files updated:**
- `dashboard/index.html` - All features above
- `dashboard/manifest.json` - PWA manifest
- `dashboard/sw.js` - Service worker
- `dashboard/icons/` - SVG and PNG icons
- `docs/TODO.md` - Marked items complete

---

## 2026-01-29

### Feature: Discover tab

Added a new Discover tab for exploring metrics in a randomized, interactive way.

**Metric Cards:**
- 4 randomizable cards showing 20+ different metrics
- Shuffle button to get new random metrics
- Dropdown to select specific metrics
- Pin button to keep a metric fixed during shuffle
- Preferences saved to localStorage

**Metrics available:**
- Net Code Growth, Avg Commit Size, Deletion Ratio
- Feature:Bug Ratio, Test/Docs Investment
- Untagged/Breaking Commits
- Peak Hour/Day, Top Contributor
- Avg Files/Commit, Single-File/Large Commits
- Refactor/Security Work, Weekend/Night/Early patterns

**File Activity:**
- Top 10 most-changed files with anonymized names
- Humorous name generator (e.g., "Grumpy Dragon", "Sleepy Unicorn")
- Names are consistent per file (hash-based) but hide actual paths

**Comparisons:**
- Visual side-by-side comparisons with progress bars
- Weekend vs Weekday, Features vs Bugs, Additions vs Deletions
- Planned vs Reactive, Simple vs Complex

**Files updated:**
- `dashboard/index.html` - Tab button, content, and all JavaScript
- `docs/USER_GUIDE.md` - Added Discover tab documentation

---

## 2026-01-28

### Refactor: Remove duplicated content from Overview tab

Removed elements from Overview tab that were duplicated in the Breakdown tab, keeping Overview focused as an executive summary.

**Removed from Overview:**
- Avg Complexity card (duplicated in Breakdown tab's work summary)
- Work Breakdown doughnut chart (Breakdown tab has both doughnut and trend over time)

**Overview now shows:**
- Quick Stats: Features Built, Bugs Fixed, Avg Urgency, % Planned
- Additional Stats: Files Changed, Contributors (reduced from 3 to 2 cards)
- Key Highlights (now full width)
- Activity Snapshot

**Files updated:**
- `dashboard/index.html` - Removed HTML, JavaScript, and export code
- `docs/USER_GUIDE.md` - Updated to reflect changes

---

### Fix: Bug count inconsistency between tabs

Fixed the mismatch where Overview tab only counted 'bugfix' tags while Breakdown tab counted both 'bugfix' and 'fix' tags.

**Changes:**
- Overview tab `renderSummary()` now counts both 'bugfix' and 'fix' tags
- Breakdown tab Work Type Trend chart now counts both tags (was only 'bugfix')
- Overview tab click handler for fixes card now filters both tags

**Files updated:**
- `dashboard/index.html` - 3 locations fixed for consistent bug counting

---

### Fix: Chart legend text color on dark background

Fixed Work Breakdown doughnut charts displaying dark text on dark background when using custom `generateLabels()` functions.

**Change:** Added `fontColor: Chart.defaults.color` to all custom legend label generators, ensuring they inherit the theme-aware text color.

**Files updated:**
- `dashboard/index.html` - 2 chart configurations updated

---

### Removed: Period comparison from Overview tab

Removed the "Compare" dropdown and period-based trend indicators from the Overview tab.

**What was removed:**
- Compare dropdown (Last 7 Days / Last 30 Days / This Quarter)
- Trend indicators (↑ 10% vs previous period) from stat cards
- Period-based filtering of Overview stats

**Why:** Simplifies the Overview tab - stats now show totals from all filtered commits rather than period-restricted values. Use date filters for time-based analysis.

**Files updated:**
- `dashboard/index.html` - Removed period comparison UI and logic
- `docs/USER_GUIDE.md` - Updated to remove period comparison documentation

---

### Feature: Settings panel

Consolidated all settings into a dedicated slide-out panel accessible via the gear icon in the header.

**Settings moved to panel:**
- View Level (Executive/Management/Developer) - moved from filter sidebar
- Privacy Mode toggle - moved from header icon to toggle switch in panel
- Timezone (Local/UTC) - moved from Activity tab header
- Work Hours Start/End - moved from Activity tab collapsible card

**Benefits:**
- Cleaner filter sidebar (now only contains data filters)
- Settings are logically grouped together
- Privacy mode has a proper toggle switch
- Activity tab is less cluttered

**Files updated:**
- `dashboard/index.html` - Added settings panel CSS, HTML, and JavaScript
- `docs/USER_GUIDE.md` - Updated to document settings panel

---

### Improvement: Shortened chart axis labels

Updated the Code Changes Over Time chart to display abbreviated numbers on the y-axis for better readability.

**Change:** Y-axis labels now show "50k" instead of "50,000", "1.5M" instead of "1,500,000".

**Files updated:**
- `dashboard/index.html` - Updated y-axis tick callback to format large numbers with k/M suffixes

---

## 2026-01-27

### Feature: Code Changes Over Time chart

Added a new chart to the Activity tab showing net lines changed (additions - deletions) over time by project.

**Problem:** The dashboard extracted and stored insertions/deletions data per commit and per project totals, but this data was never displayed to users.

**Solution:** Added "Code Changes Over Time" stacked bar chart in the Activity tab, similar to the existing "Activity Timeline" chart:
- Shows net lines changed (additions - deletions) by date
- Multi-repo view shows stacked bars by project with same color palette as commits chart
- Tooltips show "+N lines" or "-N lines" for clarity
- Y-axis shows positive/negative values with sign prefix

**Files updated:**
- `dashboard/index.html` - Added chart HTML, `renderCodeChangesTimeline()` function, integration with Activity tab render

---

## 2026-01-25

### Feature: Dashboard tab consistency and UX improvements

Fixed several inconsistencies in the dashboard layout and improved visibility.

**Problems addressed:**
- Chart text (labels, legends) not visible enough in dark mode
- Activity and Breakdown tabs lacked summary cards (inconsistent with Overview and Risk tabs)
- All sections collapsed by default, poor first-time user experience
- Non-developer roles lacked context for interpreting detailed data

**Solutions:**
1. **Chart text visibility**: Read CSS variables with `getComputedStyle()` instead of hardcoding color values
2. **Summary cards**: Added 4-card summary rows to Activity tab (Total Commits, Active Days, Contributors, Avg/Day) and Breakdown tab (Features, Bug Fixes, Refactors, Avg Complexity)
3. **Section defaults**: Removed section state persistence - consistent defaults on every page load (primary sections expanded)
4. **Role-specific guidance**: Added interpretation hints for Executive/Management views (e.g., "high weekend % may signal burnout risk"). Developers see raw data without hints.

**Files updated:**
- `dashboard/index.html` - Chart defaults, summary cards, section state logic, SECTION_GUIDANCE config
- `docs/TODO.md` - Added backlog items: techy theme, date exclusions, filter presets, match all/any

---

## 2026-01-24

### Feature: Role-based view levels for different audiences

Added view level selector (Executive/Management/Developer) that changes data granularity while keeping the same dashboard layout.

**Problem:** Different stakeholders need different levels of detail:
- Executives want high-level summaries, not individual contributor data
- Managers want project-level views, not hourly breakdowns
- Developers want full detail for debugging and self-analysis

**Solution:** Aggregation layer that transforms data based on selected view level:

| View | Contributors | Heatmap | Drilldown |
|------|-------------|---------|-----------|
| Executive | "All Contributors (45)" | Weekly activity | Stats summary |
| Management | "repo-api (12 people)" | Day-of-week bars | Stats + repo split |
| Developer | "Alice Chen" | 24×7 hourly grid | Full commit list |

**Key design decisions:**
- Same layout and charts for all views (no hidden tabs or sections)
- Filters still apply across all view levels
- Selection persists in localStorage

**Files updated:**
- `dashboard/index.html` - Added VIEW_LEVELS config, aggregation functions, modified render functions
- `docs/TODO.md` - Added role-based view levels to backlog with implementation checklist
- `docs/SESSION_NOTES.md` - Updated with new feature details

### Extension: Role-based view levels to all tabs

Extended view level support to remaining dashboard sections:

**Health tab:**
- Urgency by Contributor → Executive: single aggregated bar, Management: by repo, Developer: by person
- Impact by Contributor → Same pattern

**Security tab:**
- Executive: shows count and date range only
- Management: shows per-repo breakdown with click-to-drill
- Developer: full commit details (original)

**Timeline:**
- Executive: weekly period summaries with tag breakdown
- Management: daily period summaries with tag breakdown
- Developer: individual commit list (original)

---

## 2026-01-22

### Setup: GitHub CLI installation and authentication with .env support

Added `scripts/setup-gh.sh` and `.env` file support for API-based extraction authentication.

**Problem:** The API-based extraction (`extract-api.js`) requires GitHub authentication, but:
- Interactive `gh auth login` doesn't work in AI sessions (no browser)
- Environment variables don't persist between sessions
- No standardized way to configure authentication

**Solution:** Multi-layered authentication support:
1. **`.env` file** - Store `GH_TOKEN` in project root (gitignored)
2. **Environment variable** - `GH_TOKEN=xxx` for one-off runs
3. **Setup script** - Interactive or token-based authentication
4. **Auto-loading** - Scripts automatically read from `.env`

**Usage:**
```bash
# Option 1: Create .env file (recommended for AI sessions)
cp .env.example .env
# Edit .env and set GH_TOKEN=ghp_xxx

# Option 2: Interactive setup
./scripts/setup-gh.sh

# Option 3: Token + save to .env
./scripts/setup-gh.sh --token=ghp_xxx --save-env

# Option 4: One-off with env var
GH_TOKEN=ghp_xxx node scripts/extract-api.js owner/repo
```

**Files added:**
- `scripts/setup-gh.sh` - Cross-platform gh CLI setup script
- `.env.example` - Template for environment configuration

**Files updated:**
- `scripts/extract-api.js` - Added .env file loading and GH_TOKEN support
- `.gitignore` - Added `.env` to ignore list
- `docs/ADMIN_GUIDE.md` - Added GitHub CLI and .env setup sections
- `docs/USER_ACTIONS.md` - Added detailed setup instructions for all methods

---

### Optimization: API-based extraction (no cloning required)

Added `scripts/extract-api.js` to extract git data directly via GitHub API without cloning repos.

**Problem:** Clone-based extraction required downloading full repos (potentially large) just to read commit history.

**Solution:** Use GitHub API via `gh` CLI:
- Fetches commit list with pagination
- Gets stats and files per commit via API
- Outputs same format as clone-based extractor

**Benefits:**
- No disk space for clones
- Faster for initial setup
- Works without git installed (only needs `gh` CLI)
- Supports `--since` flag for incremental fetches

**Usage:**
```bash
scripts/update-all.sh           # API mode (default)
scripts/update-all.sh --clone   # Clone mode (if needed)
```

**Files added:**
- `scripts/extract-api.js` - GitHub API-based extractor

**Files updated:**
- `scripts/update-all.sh` - Default to API mode, `--clone` flag for old behavior

---

### Optimization: Merge-analysis script for faster feeding

Added `scripts/merge-analysis.js` to dramatically reduce AI output tokens during the "feed the chicken" workflow.

**Problem:** When processing pending batches, AI had to output full commit objects (500-800 tokens each) including all git metadata. This was slow and wasteful since the git data already exists in `reports/`.

**Solution:** New merge-based workflow:
1. AI outputs **only analysis fields**: `{sha, tags, complexity, urgency, impact}`
2. Script merges with raw git data from `reports/<repo>/commits/<sha>.json`
3. Saves complete commit to `processed/<repo>/commits/<sha>.json`

**Token savings:** ~10x reduction in AI output per commit (50-80 tokens vs 500-800)

**Files added:**
- `scripts/merge-analysis.js` - Merges analysis with raw git data

**Files updated:**
- `docs/EXTRACTION_PLAYBOOK.md` - Updated feed workflow to use merge-analysis.js

---

### Fix: Skip malformed commits and prevent incomplete saves

Dashboard was showing empty sections because malformed commits (missing timestamp, author)
were causing JavaScript errors that halted execution before event listeners were attached.

**Root Cause:**
- 65 processed commit files were missing required fields (timestamp, author_id, repo_id)
- When AI analyzed batches, it only output analysis fields (tags, complexity, urgency, impact)
  instead of the complete commit object (original metadata + analysis)
- `save-commit.js` had no validation, so incomplete commits were saved
- Dashboard JavaScript crashed trying to access undefined `.timestamp`

**Changes:**
- `save-commit.js`: Added validation for required fields (sha, timestamp, subject, author)
  and analysis fields (tags, complexity, urgency, impact) - rejects incomplete commits
- `aggregate-processed.js`: Added `validateCommit()` as safety net to skip malformed commits
- `dashboard/index.html`: Added null guard in `getWorkPattern()` for timestamps
- `dashboard/index.html`: Added `renderSummary()` on Overview tab switch

**Prevention:** `save-commit.js` now fails fast with clear error message if commit objects
are missing required fields, preventing incomplete commits from being saved in the future.

## 2026-01-21

### Fix: Remove orphaned stat-top-tag JavaScript causing dashboard to break

The dashboard was showing 0 for Contributors, Features Built, and Bugs Fixed because
JavaScript code was trying to set a `stat-top-tag` element that no longer existed in
the HTML. This caused a TypeError that stopped script execution, preventing subsequent
stats and render functions from completing.

**Root Cause:**
- HTML was updated to show only 3 stat cards (Files Changed, Avg Complexity, Contributors)
- JavaScript still tried to set `stat-top-tag` and `stat-top-tag-sub` elements
- `document.getElementById('stat-top-tag')` returned null
- Calling `.textContent` on null threw an error, halting execution

**Changes:**
- Removed orphaned `stat-top-tag` code from `updateSummaryStats()`
- Updated PDF export to match 3-card layout (was 4 columns, now 3)

### Enhancement: Dark Theme Implementation

Complete visual redesign of the dashboard with a dark-only theme.

**Color System (Dark-Only Theme):**
- Background: #1B1B1B (page), #2a2a2a (cards)
- Primary blue: #2D68FF (links, CTAs, focus states)
- Text: #FFFFFF (primary), #767676 (secondary)
- Borders: #333333
- Semantic: #16A34A (success), #EF4444 (error), #EAB308 (warning)

**Typography:**
- Font: Figtree (loaded from Google Fonts)
- Weights: 400 (regular), 500 (medium), 600 (semibold)

**Spacing:**
- Base unit: 8px
- Section gaps: 24px
- Card padding: 24px
- Component gaps: 8px, 16px

**Border Radius:**
- Small: 4px (buttons, icons)
- Medium: 8px (inputs, alerts)
- Large: 12px (cards, dialogs)
- Full: 9999px (badges, pills)

**Components Updated:**
- Cards: border instead of shadow, #2a2a2a background
- Buttons: primary (#2D68FF), secondary (transparent with border)
- Inputs: 40px height, 2px border, 8px radius
- Tags/badges: transparent backgrounds with colored text and borders
- Modal backdrop: rgba(0, 0, 0, 0.8)

**Dark Mode:**
- Removed light mode toggle (dark-only)
- Chart.js defaults set for dark theme
- Heatmap colors adjusted for dark backgrounds


---

### Enhancement: Redesigned Dashboard Layout with Sticky Tabs and Filter Sidebar

Major UI restructure for improved navigation and screen real estate.

**Changes:**

1. **Sticky Tabs Bar**
   - Tabs now stick to top of viewport when scrolling
   - Immediate access to tab navigation from anywhere on the page
   - Filter toggle button integrated into tabs bar

2. **Collapsible Filter Sidebar**
   - Filters moved from inline card to collapsible left sidebar
   - Default state: collapsed (more content visible)
   - Desktop: pushes content when expanded
   - Mobile: overlays as slide-out panel
   - Filter badge shows when filters are active

3. **Consolidated Overview Metrics**
   - Removed redundant global summary cards section
   - Merged Files Changed, Avg Complexity, Contributors into Overview tab
   - Removed Top Work Type (redundant with Work Breakdown chart)
   - Overview now shows 7 metrics: Features, Bugs Fixed, Urgency, % Planned, Files, Complexity, Contributors

**Result:** Cleaner layout with tabs always accessible, more vertical space for content, and filters available on demand.

---

### Fix: Consistent Section Spacing Across Tabs

Fixed inconsistent spacing between sections when multiple tab content containers are displayed together.

**Problem:**
- Tabs like Work and Activity display multiple tab-content containers together (e.g., Work shows tab-progress + tab-contributors + tab-tags)
- The last section in each container was missing `mb-6` spacing, creating visual gaps between containers

**Changes to `dashboard/index.html`:**
- Added `mb-6` to Changes section in tab-activity (spacing before tab-timing)
- Added `mb-6` to Complexity Over Time section in tab-progress (spacing before tab-contributors)
- Added `mb-6` to Complexity by Contributor section in tab-contributors (spacing before tab-tags)
- Added `mb-6` to tag grid in tab-tags

**Result:** Consistent 1.5rem spacing between all sections across all tabs.

---

### Fix: JavaScript Error in updateFilteredStats()

Removed orphaned `updateFilteredStats()` function that was causing console errors when making filter selections.

**Problem:**

- `updateFilteredStats()` tried to set `textContent` on element `stat-commits-filtered` which doesn't exist
- This threw an uncaught TypeError every time filters were changed
- The function was redundant since `updateFilterIndicator()` already handles showing filtered counts

**Changes to `dashboard/index.html`:**

- Removed the call to `updateFilteredStats()` from `applyFilters()`
- Removed the orphaned `updateFilteredStats()` function

**Result:** Filter selections no longer throw console errors.

---

### Fix: JavaScript Error Breaking Filter Updates

Fixed a JavaScript error in `renderSecurity()` that was preventing filters from updating the Overview tab.

**Problem:**
- `renderSecurity()` tried to set `textContent` on element `security-count` which doesn't exist
- This threw an uncaught TypeError that stopped `applyFilters()` execution
- Since `renderSummary()` is called after `renderSecurity()` in `applyFilters()`, the Overview tab never updated

**Changes to `dashboard/index.html`:**
- Removed the broken `document.getElementById('security-count')` line from `renderSecurity()`
- The security count is already correctly displayed by `renderHealth()` via `health-security-count`

**Result:** Filter changes now properly trigger all render functions including `renderSummary()`, fixing the Overview tab updates.

---

### Fix: Overview Tab Filters Not Updating

Fixed filters and Compare dropdown not affecting the Overview tab display and click handlers.

**Problem:**
1. Overview tab card click handlers (Features Built, Bugs Fixed, etc.) captured commit data from closure at render time, showing stale data when filters changed
2. Health tab card click handlers had the same stale closure issue
3. Event listeners were being added repeatedly on each re-render without cleanup

**Changes to `dashboard/index.html`:**
- Added `getCurrentPeriodCommits()` helper function to dynamically compute filtered commits based on current filters AND summary period
- Added `summaryCardHandlersInitialized` flag to prevent duplicate event listeners on Overview tab cards
- Changed Overview card click handlers to call `getCurrentPeriodCommits()` at click time instead of using closure-captured data
- Added `healthCardHandlersInitialized` flag for Health tab cards
- Changed Health card click handlers to call `getFilteredCommits()` at click time

**Result:** Overview and Health tab cards now correctly respond to filter changes and show current filtered data when clicked.

---

### Enhancement: UI Consistency Improvements

Improved UI consistency across all dashboard components.

**Changes to `dashboard/index.html`:**

1. **Collapsible Sections**
   - Added collapsible functionality to all card sections
   - Sections default to collapsed state on first load
   - State is persisted to localStorage per section
   - Click header to expand/collapse with chevron indicator
   - Smooth animation transitions

2. **Standardized Text Colors**
   - Replaced inconsistent `text-gray-*` Tailwind classes with themed CSS variables
   - Added `text-themed-primary`, `text-themed-secondary`, `text-themed-tertiary`, `text-themed-muted` utilities
   - Better dark mode support through CSS variable theming
   - Consistent color hierarchy across all tabs

3. **Standardized Spacing**
   - Consistent `mb-6` between sections
   - Consistent `gap-4` for small grids, `gap-6` for larger layouts
   - Added CSS variables for spacing (`--section-gap`, `--card-gap`, `--content-padding`)

4. **Tag Display Consistency**
   - All tag renders now use `getTagClass()` function
   - Consistent tag styling across commit lists, breakdowns, and contributors
   - Removed redundant size classes (tags use base `.tag` styling)

**Result:** Dashboard now has consistent visual hierarchy, better dark mode support, and less visual clutter with collapsible sections.

---

### Fix: Charts Not Rendering in Hidden Tabs

Fixed charts in Activity, Work, and Health tabs appearing empty on mobile.

**Problem:** Chart.js cannot properly render charts inside hidden containers (display: none or visibility: hidden). When the dashboard loads, only the Overview tab is visible. Charts rendered to hidden tabs would fail silently because their parent containers had zero width/height.

**Changes to `dashboard/index.html`:**
- Added re-render logic to tab click handler
- When switching to 'activity' tab: calls `renderTiming()` to re-render timing charts
- When switching to 'work' tab: calls `renderTags()` to re-render tag charts
- When switching to 'health' tab: calls `renderHealth()` to re-render health charts

**Result:** Charts now render correctly when users switch to Activity, Work, or Health tabs.

---

### Fix: Author Identity Mapping in Aggregation

Fixed author identity mapping not being applied during data aggregation.

**Problem:** The `config/author-map.json` existed to merge multiple email addresses (e.g., `jacotheron87@gmail.com` and `34473836+jacotheron87@users.noreply.github.com`) into a single identity, but the aggregation script wasn't using it.

**Changes to `scripts/aggregate-processed.js`:**
- Added `loadAuthorMap()` to read `config/author-map.json` at startup
- Added `resolveAuthorId()` to map raw emails to canonical IDs
- Updated `generateAggregation()` to normalize `author_id` in all commits
- Updated `calcContributorAggregations()` to merge commits by canonical ID
- Added `metadata.authors` to generated data for dashboard resolution
- Contributors now include `name`, `email`, and `emails` (if merged)

**Result:**
- Before: 5 contributors (same person counted twice)
- After: 4 contributors (emails properly merged)
- Dashboard filter dropdown now shows one entry per person

---

### Feature: Global Filters Across All Tabs

Made dashboard filters apply globally to all tabs instead of just the Activity tab.

**Problems Fixed:**
1. Filter bar was only visible on Activity tab
2. Filters only affected the commit list, not other tabs (Work, Health, etc.)
3. Filter state was lost when switching between repos

**Changes:**
- Moved filter bar above tabs (always visible)
- Added filter indicator showing "X of Y" when filters are active
- Updated all render functions to use `getFilteredCommits()`:
  - `updateSummaryStats()`, `renderProgress()`, `renderContributors()`
  - `renderTags()`, `renderHealth()`, `renderSecurity()`
  - `renderTiming()`, `renderHeatmap()`, `renderDeveloperPatterns()`
  - `renderSummary()`, all click handlers
- Filter state now persists across repo switches (validates options exist)

**Files changed:**
- `dashboard/index.html` - Global filter implementation

---

### Fix: Dashboard Data Format Inconsistencies

Fixed multiple data format inconsistencies causing incorrect stats and missing data in dashboard.

**Problem:** Different commits had different field formats due to varied extraction sources:

| Field | Format 1 | Format 2 | Missing |
|-------|----------|----------|---------|
| Files changed | `stats.filesChanged` (267) | `files_changed` (44) | 265 |
| Commit text | `subject` (532) | `message` (44) | 0 |
| Additions | `stats.additions` (267) | `lines_added` (44) | 265 |
| Deletions | `stats.deletions` (267) | `lines_deleted` (44) | 265 |

**Solution:** Added helper functions to normalize across all formats:
```javascript
function getFilesChanged(commit) {
    return commit.stats?.filesChanged || commit.filesChanged || commit.files_changed || 0;
}
function getCommitSubject(commit) {
    return commit.subject || commit.message || '';
}
function getAdditions(commit) {
    return commit.stats?.additions || commit.lines_added || 0;
}
function getDeletions(commit) {
    return commit.stats?.deletions || commit.lines_deleted || 0;
}
```

**Result:**
- Files changed: now shows 1,689 (was 0)
- All 576 commits now display subject/message correctly
- Additions/deletions now aggregated from all sources: 277,817 / 275,506

**Files changed:**
- `dashboard/index.html` - Added 4 helper functions, updated all field references

---

## 2026-01-20

### Storage Migration: Batches to Individual Commit Files

Migrated from storing commits in batch files to individual commit files.

**Old structure:** `processed/<repo>/batches/batch-NNN.json` (15 commits per file)
**New structure:** `processed/<repo>/commits/<sha>.json` (1 file per commit)

**Benefits:**
- Simpler deduplication (file existence = processed, no manifest sync issues)
- Atomic edits (fix one commit without touching others)
- Lower corruption risk (lose one file = lose one commit, not 15)
- Cleaner git diffs (individual commit changes are isolated)

**Files changed:**
- `scripts/save-commit.js` - New script replacing save-batch.js
- `scripts/aggregate-processed.js` - Updated to read from commits/
- `scripts/extract.js` - Updated to write individual commit files
- `scripts/migrate-batches-to-commits.js` - One-time migration script
- `docs/EXTRACTION_PLAYBOOK.md` - Updated workflow documentation

**Migration stats:**
- 4 repositories migrated
- 57 batch files converted
- 576 individual commit files created

---

### Fast Batch Saving Script

Added `scripts/save-batch.js` to speed up batch processing workflow.

**Problem:** Writing approved batches via IDE tools (Write/Edit) required approval dialogs for each file, which slowed down significantly as sessions got longer.

**Solution:** Script-based saving that writes both batch file and manifest in one fast bash command with no IDE dialogs.

**Usage:**
```bash
cat <<'EOF' | node scripts/save-batch.js <repo>
{"commits": [...analyzed commits...]}
EOF
```

**Files updated:**
- `scripts/save-batch.js` - New script for fast batch saving
- `docs/EXTRACTION_PLAYBOOK.md` - Updated workflow to use script

---

### Dashboard V2 Complete - Detail Pane and Visualizations

Completed the remaining Dashboard V2 features:

**Detail Pane Component:**
- Slide-out panel from right (30% width on desktop)
- Bottom sheet variant for mobile (85% viewport height)
- Click-outside or Escape key to dismiss
- Smooth CSS transition animations
- Shows filtered commits with message, author, date, tags, urgency/impact labels

**Click Interactions:**
- Overview cards → filtered commits (features, fixes, urgency, planned)
- Health cards → filtered commits (security, reactive, weekend, after-hours)
- Urgency distribution bars → commits by urgency level
- Impact distribution bars → commits by impact category
- Tag breakdown bars → commits with that tag
- Contributor cards → contributor's commits
- Urgency/Impact by contributor → contributor's commits

**New Visualizations Added:**
- Urgency Trend chart (line chart by month, lower is better)
- Impact Over Time chart (stacked bar chart by month)
- Urgency by Contributor (stacked bars showing planned/normal/reactive)
- Impact by Contributor (stacked bars showing user-facing/internal/infra/api)

**Dark Mode Support:**
- Added renderHealth() to dark mode re-render list
- New charts and detail pane respect dark mode

**Files updated:**
- `dashboard/index.html` - Detail pane, trend charts, contributor visualizations
- `docs/SESSION_NOTES.md` - Updated with completion status
- `docs/TODO.md` - Marked priorities 2 and 3 as complete

---

### Dashboard V2 Implementation Progress

Implemented core Dashboard V2 features:

**Aggregation Script:**
- Created `scripts/aggregate-processed.js` to read from processed/ data
- Outputs `dashboard/data.json` (overall) and `dashboard/repos/*.json` (per-repo)
- Includes urgency and impact breakdowns in aggregations
- Same schema for both overall and per-repo views

**Dashboard Structure:**
- Reorganized from 7 tabs to 4 tabs (Overview, Activity, Work, Health)
- Implemented TAB_MAPPING to show multiple content containers per tab
- No breaking changes - existing render functions continue to work

**New Visualizations:**
- Health tab: Security count, Reactive %, Weekend %, After Hours % cards
- Health tab: Urgency Distribution (Planned/Normal/Reactive bars)
- Health tab: Impact Distribution (user-facing/internal/infra/api bars)
- Overview tab: Avg Urgency card with trend indicator
- Overview tab: % Planned card (urgency 1-2 ratio)

**Files created:**
- `scripts/aggregate-processed.js` - New aggregation script
- `dashboard/repos/*.json` - Per-repo aggregated data

**Files updated:**
- `dashboard/index.html` - V2 tab structure and visualizations
- `dashboard/data.json` - Regenerated with urgency/impact data
- `docs/SESSION_NOTES.md` - Current progress
- `docs/TODO.md` - Updated completion status

**Remaining:**
- Detail pane component
- Click interactions for drill-down
- More visualizations (urgency trend, impact by contributor)

---

### Dashboard V2 Design Complete

Conducted reporting discovery session and designed new dashboard architecture.

**Process followed:**
1. Reviewed processed data to understand new dimensions (urgency, impact)
2. Referenced original [Discovery Session](DISCOVERY_SESSION.md) for user flows
3. Evaluated 5 design options for dashboard organization
4. Selected hybrid approach: Logical Groupings + Contextual Detail Pane

**Design decisions:**

| Decision | Rationale |
|----------|-----------|
| 4 tabs (down from 7) | Clearer mental model, less cognitive load |
| Detail pane (not navigation) | Preserves context while drilling down |
| Same schema for overall + per-repo | Enables consistent views at both levels |
| Urgency in Health tab | Operational health is a "health" concern |
| Impact in Work + Overview | Shows where effort goes |

**New dashboard structure:**
- **Overview** - Executive landing (quick scan in 10 seconds)
- **Activity** - When work happens (timeline + timing combined)
- **Work** - What's being done (progress + tags + contributors)
- **Health** - Operational concerns (security + urgency)

**New visualizations planned:**
- Urgency Distribution (planned vs reactive)
- Urgency Trend (operational health over time)
- Urgency by Contributor (who handles emergencies)
- Impact Allocation (where effort goes)
- Impact Over Time (shifting priorities)
- Impact by Contributor (who works on what)

**Key requirement identified:**
Aggregation must read from `processed/` (AI-tagged data) not `reports/` (raw data).
Output same schema for overall and per-repo views.

**Files created:**
- `docs/DASHBOARD_V2_DESIGN.md` - Full design specification

**Files updated:**
- `docs/SESSION_NOTES.md` - Current state and next actions
- `docs/TODO.md` - Reorganized for V2 implementation

---

### Manifest-Based Incremental Processing

Implemented SHA-based tracking for reliable incremental processing ("feed the chicken"):

**Problem:** Batch file numbers shift when new commits are added, making it impossible to safely resume processing after a merge/extraction cycle.

**Solution:** Track processed commits by SHA, not batch number:
- `processed/<repo>/manifest.json` - Source of truth for which commits have been processed
- `scripts/pending.js` - Compares manifest SHAs against fresh extraction, generates pending batches
- `scripts/manifest-update.js` - Updates manifest after each batch approval

**How it works:**
1. `pending.js` reads manifest to get list of processed SHAs
2. Compares against `reports/<repo>/commits.json` to find unprocessed commits
3. Generates `pending/<repo>/batches/` with only unprocessed commits
4. After approval, `manifest-update.js` adds new SHAs to manifest
5. Safe to add new commits between sessions - they'll appear in next pending batch

**Files added:**
- `scripts/pending.js` - Pending batch generator
- `scripts/manifest-update.js` - Manifest updater
- `processed/*/manifest.json` - Per-repo manifests (4 files)

**Files updated:**
- `docs/EXTRACTION_PLAYBOOK.md` - Updated "Feed the Chicken" workflow
- `.gitignore` - Added `pending/` directory
- `docs/SESSION_NOTES.md` - Updated progress and key files

### Schema Update: Urgency and Impact Dimensions

Added two new dimensions for commit analysis beyond tags and complexity:

**Urgency (1-5)** - How critical was the change? Reactive vs planned work:
- 1 = Planned (scheduled work, no time pressure)
- 2 = Normal (regular development pace)
- 3 = Elevated (needs attention soon)
- 4 = Urgent (high priority, blocking work)
- 5 = Critical (production down, security vulnerability)

**Impact** - Who/what is affected by the change:
- `internal` - Only affects developers (tests, refactoring, docs)
- `user-facing` - Directly affects end users (UI, features, bug fixes)
- `infrastructure` - Affects deployment/operations (CI/CD, Docker, monitoring)
- `api` - Affects external integrations (endpoints, breaking changes)

**Value for users:**
- Dev Managers: See ratio of planned vs reactive work over time
- Executives: Operational health metric — high urgency % = problems
- Both: Understand where effort goes (internal vs user-facing vs infrastructure)

**Files updated:**
- `docs/EXTRACTION_PLAYBOOK.md` - Added urgency/impact guidelines, examples, schema
- `docs/SESSION_NOTES.md` - Updated workflow description
- `docs/COMMIT_CONVENTION.md` - Added urgency/impact to format, examples, checklist

### New Extraction Architecture

Redesigned the extraction system for efficiency and persistence:

**Two triggers:**
- **"hatch the chicken"** - Full reset: delete everything, AI analyzes ALL commits from scratch
- **"feed the chicken"** - Incremental: AI analyzes only NEW commits not yet processed

**New file structure:**
- `processed/<repo>/commits.json` - Source of truth (AI-analyzed commits, committed to git)
- `reports/` folder removed (was ephemeral)
- Dashboard data generated from `processed/`

**Changes:**
- Deleted `scripts/tag-commits.js` (AI analyzes commits directly instead of script)
- Rewrote `docs/EXTRACTION_PLAYBOOK.md` with new architecture
- Updated `CLAUDE.md` with both trigger commands

**Key benefit:** Don't redo all commits each time. Process incrementally - only analyze new commits.

### AI Persona Triggers

Added two personas to CLAUDE.md for focused interactions:

- **@coder** - Trigger with `@coder` at message start. Focus: development work (writing code, bug fixes, features, refactoring, architecture)
- **@data** - Trigger with `@data` at message start. Focus: data extraction and processing (playbooks, reports, aggregation)

The existing "feed the chicken" command is now part of the @data persona.

### Activity Timeline Chart

Added visual timeline to the Timeline tab:

- **Bar chart** showing commits by date across all projects
- **Multi-repo support** - Stacked bars color-coded by repository
- **Filter-responsive** - Updates when applying tag/author/repo/date filters
- **Date range** - Shows last 60 dates with activity
- **Adaptive labels** - Shows date labels intelligently based on data density

### Rolling Period Comparison

Changed period comparison from calendar-based to rolling:

- **Last 7 Days** - Rolling 7-day window (replaces "This Week")
- **Last 30 Days** - Rolling 30-day window (replaces "This Month")
- **More intuitive** - Users checking recent activity get predictable ranges
- **Consistent trends** - Comparison periods are always equal length

### Mobile Layout Fixes

Improved responsive layout for small screens:

- **Executive Summary header** - Stacks title and dropdown on mobile
- **Timing tab header** - Stacks title and timezone selector on mobile
- **Work Hours Settings** - Stacks title and time selectors on mobile
- **Shorter dropdown labels** - "Last 7 Days" instead of verbose text

### Developer Activity Patterns

Added per-contributor timing analysis to the Timing tab:

- **Per-author breakdown** - Shows timing patterns for top 6 contributors
- **Key metrics per person:**
  - Peak Hour - most common commit time
  - Peak Day - most common commit day
  - Work Hours % - percentage during configured work hours
  - Weekends % - percentage on Saturday/Sunday
- **Color-coded indicators** - Green (healthy), amber (moderate), red (concern)
- **Responds to configurable work hours**

### Configurable Work Hours

Added ability to customize what counts as "work hours":

- **Start/end time selectors** - Added to Timing tab
- **Range:** 6:00-10:00 start, 16:00-20:00 end
- **Default:** 8:00-17:00
- **Updates dynamically:**
  - Hour chart coloring
  - Work pattern badges
  - Developer activity patterns
  - Summary statistics
- **Persists to localStorage**

### Loading States

Added loading feedback during data fetch:

- **Loading spinner** - Animated spinner during auto-load
- **Status message** - "Loading dashboard data..."
- **Graceful fallback** - Shows file picker if no data found
- **CSS animations** - Skeleton loading and spin animations

### Private Repo Sanitization Mode

Added privacy mode for sensitive repositories:

- **Eye toggle button** - In header, next to theme toggle
- **Author anonymization** - Names become "Developer A", "Developer B", etc.
- **Message hiding** - Commit subjects sanitized to "[message hidden]"
- **Conventional commits** - Preserves type prefix (e.g., "feat: [message hidden]")
- **Security tab** - Hides commit body details
- **Persistence** - Saved to localStorage
- **Toast notification** - Confirms mode toggle

### Activity Heatmap

Added commit time heatmap to the Timing tab:

- **24×7 grid visualization** - Hours (0-23) on Y-axis, days (Mon-Sun) on X-axis
- **Color intensity** - 5 levels from gray (0) to dark blue (most commits)
- **Interactive cells** - Hover shows exact commit count for each hour/day slot
- **Timezone aware** - Updates when Local/UTC toggle changes
- **Monday-first ordering** - Business-friendly day sequence
- **Responsive** - Scrollable on mobile, full-width on desktop
- **Legend** - Visual scale explaining color intensity

### Dark Mode

Implemented full dark mode support:

- **Theme toggle** - Moon/sun button in header
- **System preference** - Auto-detects `prefers-color-scheme: dark` on first visit
- **Persistence** - Saves preference to localStorage
- **CSS variables** - Clean theming with `--bg-primary`, `--text-primary`, etc.
- **Chart.js integration** - Charts re-render with appropriate colors
- **Comprehensive coverage** - All cards, badges, inputs, heatmap cells styled
- **Instant switch** - No page reload needed, applied via class toggle on `<html>`

### Filter Persistence

Added localStorage persistence for dashboard state:

- **What's saved:**
  - Filter values (tag, author, repo, date range)
  - Active tab
  - Summary period (week/month/quarter)
  - Timezone (local/utc)
- **Load behavior:**
  - Restores on page load if no URL params present
  - URL params take priority (for shareable links)
- **Save triggers:**
  - Any filter change
  - Tab switch
  - Period or timezone change
- **Implementation:** Single `dashboardState` key in localStorage

## 2026-01-18

### Timeline Horizontal Bar Chart
- Changed timeline chart from vertical columns to horizontal bars
- Dates on Y-axis (newest at top), commit counts on X-axis
- Better mobile experience - more room for date labels, natural vertical scroll

### Mobile Timeline Improvements
- Improved filter bar layout with responsive grid (2-col mobile, 3-col tablet, flex desktop)
- Stacked filter labels above inputs for better touch targets
- Reduced chart height on mobile (`h-48` vs `h-64`)
- Redesigned commit list items with responsive layout:
  - Commit message wraps on mobile, truncates on desktop
  - Metadata flows with dot separators on mobile, full text on desktop
  - Line counts (+/-) show inline on desktop, below metadata on mobile

### Mobile Tab Fix
- Fixed dashboard tabs overflowing on mobile screens
- Added `overflow-x-auto` for horizontal scrolling
- Added `whitespace-nowrap` to all tab buttons
- Used negative margin (`-mx-4 px-4`) for edge-to-edge scroll area on mobile
- Added CSS class `.scrollbar-hide` to hide scrollbar while maintaining scroll functionality
- Touch scrolling enabled via `-webkit-overflow-scrolling: touch`

## 2026-01-19

### Cache-Busting for Data Files

Added automatic cache-busting to prevent browsers from serving stale data.json:

- Modified deploy.yml to append git commit hash as query parameter
- Transforms `fetch('data.json')` to `fetch('data.json?v=abc123')` during deployment
- Ensures users always get the latest data after each deployment

### Executive Summary View

Added new "Summary" tab as the default view for executive quick scanning:

- **Period comparison** - Select week/month/quarter to compare against previous period
- **Quick stats cards** with trend indicators:
  - Commits with ↑/↓ percentage vs previous period
  - Active contributors count
  - Features count
  - Bug fixes count
- **Work breakdown chart** - Doughnut chart showing top 5 tag categories
- **Key highlights** - Auto-generated insights:
  - Top contributor for the period
  - Busiest day
  - Most active repo (for aggregated data)
  - After-hours work percentage
- **Activity snapshot** - At-a-glance metrics:
  - Average commits per day
  - After-hours commit count
  - Weekend commit count
  - Holiday commit count

Implementation:
- Summary tab positioned first for quick executive access
- Dynamic period calculations for week/month/quarter
- Trend indicators show green (↑) for increases, red (↓) for decreases
- Integrates with work pattern helpers for after-hours/weekend/holiday stats

### Work Pattern Styling

Added visual indicators for after-hours, weekend, and holiday commits:

- **Commit list badges** - Each commit shows applicable work pattern indicators:
  - "After Hours" (amber) - commits before 8:00 or after 17:00
  - "Weekend" (indigo) - commits on Saturday or Sunday
  - "Holiday" (pink) - commits on South African public holidays
- **SA public holidays** - Complete holiday data for 2020-2030:
  - 10 fixed holidays (New Year's, Freedom Day, Christmas, etc.)
  - Easter-based moveable feasts (Good Friday, Family Day)
  - Sunday→Monday observance rule applied
- **Legend/key** - Added to Timeline tab filter card explaining badge meanings
- **Helper functions** - `getWorkPattern()`, `getWorkPatternBadges()` for reuse

### Timestamp Views (Timing Tab)

Added new "Timing" tab to dashboard for visualizing when work happens:

- **Commits by Hour chart** - Bar chart showing distribution across 24 hours (0-23)
  - Work hours (8:00-17:00) displayed in blue
  - After-hours displayed in gray
  - Tooltip shows "Work hours" or "After hours" context
- **Commits by Day of Week chart** - Bar chart showing Mon-Sun distribution
  - Weekdays (Mon-Fri) displayed in blue
  - Weekends (Sat-Sun) displayed in gray
  - Days ordered Monday-first for business context
- **Timezone toggle** - Switch between Local and UTC time display
  - Charts dynamically update when timezone changes
  - Default is local browser timezone

Implementation details:
- Added `useUTC` global state variable
- Added `getCommitDateTime()` helper for consistent date handling
- Added `renderTiming()` function to render both charts
- Added `setupTimezoneToggle()` event listener

### Discovery Framework Validation

Applied the Discovery Framework to validate our solution against user needs:

- Conducted systematic discovery session documenting people, flow, data, and context
- **Key finding:** Two distinct audiences with different needs (Executive vs Dev Manager)
- **Gaps identified:**
  - Timestamp views (when work happens) - data stored but not visualized
  - Work pattern distinction (after hours, weekends, holidays)
  - Executive summary view (high-level, quick-to-scan)
  - PDF export for sharing
- **Verdict:** Core infrastructure solid, minimal over-engineering, main miss is time dimension
- Created `docs/DISCOVERY_SESSION.md` documenting full session
- Reorganized `docs/TODO.md` around discovered priorities

### Feature Roadmap Planning

Added high-priority TODO items for next phase of development:
- **Timestamp Views & Developer Insights** - Commits by hour (0-23), commits by day of week (Mon-Sun), heatmaps, developer activity patterns, commit type trends
- **Work Pattern Visual Distinction** - Work hours (8-5) vs after-hours, weekends, SA public holidays - all visually different across ALL tabs/views
- **Filter Persistence & Cross-Tab Behavior** - Global filter state across all tabs, URL params for shareable links, localStorage for session persistence
- **Visual Design & Dark Mode** - Full dark theme with system preference detection, color palette refinement, typography improvements
- **Private Repository Security** - Sanitization mode, anonymization options, content filtering, local-only mode documentation
- **Repository Management** - Repo rename handling, alias support, migration tools, archive detection

New Research/Investigation section:
- **Device/Platform Attribution** - Split contributions by committer name (mobile vs desktop)
- **AI-Powered Commit Categorization** - Use Claude to read messages + diffs and intelligently tag
- **Multi-Tag Commit Model** - Rethink single-type assumption; one commit can have multiple tags
- **Tag-Centric Reporting** - Shift from commit counts to accomplishment-based metrics

### Direction Shift: Tag-Based Analytics

Refocused tool around three core metrics:

- **When** - Timestamp analytics (hour, day, work hours, weekends, holidays)
- **What** - AI-analyzed tags from commit messages (multiple per commit)
- **Complexity** - Score based on files changed + tag count (scale 1-5)

Created:

- `docs/EXTRACTION_PLAYBOOK.md` - AI-driven extraction process, triggered by "feed the chicken"
- Updated CLAUDE.md with trigger phrase section
- Reorganized TODO.md around new direction (removed completed items, added Foundation section)

Key decisions:

- AI analyzes each commit message (replaces regex parsing)
- Schema: `type` → `tags[]`, add `complexity` field
- User triggers, AI executes, user commits/pushes

### Dashboard Multi-Tag Support (Phase 2)

Implemented multi-tag support in the dashboard (no backward compatibility needed - data regenerates):

- Added `getCommitTags()`, `getAllTags()`, `getTagColor()`, `getTagClass()` helpers
- Added TAG_COLORS constant with new tag vocabulary
- Filter renamed from "Type" to "Tag" - matches commits with any matching tag
- Commit list shows all tags (up to 3 with "+N" overflow indicator)
- "By Type" tab renamed to "By Tag" - counts each tag occurrence
- Progress tab Feature vs Bug Fix now tag-based
- `combineDataFiles()` builds tagBreakdown
- Removed backward compat code (TYPE_COLORS, TYPE_TO_TAG, legacy CSS)

### Extraction Script Tag Support (Phase 1)

Updated `scripts/extract.js` for new tag-based model:

- Added `CONVENTIONAL_TO_TAG` mapping (feat → feature, fix → bugfix, etc.)
- `parseCommitMessage()` returns `tags[]` array instead of single `type`
- Added `calculateComplexity()` function (1-5 scale based on files changed + tag count)
- Summary outputs `tagBreakdown` and `complexityBreakdown`
- Contributors track `tagCounts` instead of `types`
- Files track `tagCounts` instead of `commitTypes`

### Aggregation Script Tag Support (Phase 4)

Updated `scripts/aggregate.js` for tag-aware aggregation:

- Contributors aggregation uses `tagCounts` instead of `types`
- File aggregation uses `tagCounts` instead of `commitTypes`
- Summary outputs `tagBreakdown` and `complexityBreakdown`
- Monthly aggregation tracks tags per month instead of types
- Security detection uses `tags.includes('security')`

### Added chatty-chart Repository

- Added `illuminAI-select/chatty-chart` to tracked repositories
- Repository stats: 42 commits, 4 contributors, 9 files tracked
- Total dashboard now shows 543 commits across 4 repositories
- Updated `config/repos.json` and re-aggregated all data

### Duplicate Contributor Fix

- Created `config/author-map.json` to merge duplicate contributor entries
- Issue: jacotheron87 appeared twice due to different email addresses:
  - `jacotheron87@gmail.com` (51 commits)
  - `34473836+jacotheron87@users.noreply.github.com` (1 commit via GitHub web)
- Solution: Added author mapping to merge both emails under single identity
- Re-aggregated data with `--author-map` flag
- Contributors reduced from 4 to 3 (correct count)

### Multi-Repo Admin Setup

- Created `config/repos.json` - Central config file tracking repository URLs
  - Stores name, URL, and date added for each repo
  - Enables reproducible extraction without re-providing URLs
- Created `scripts/update-all.sh` - Automated update script
  - Reads repos from `config/repos.json`
  - Clones new repos to `.repo-cache/` (gitignored)
  - Pulls updates for existing repos
  - Runs extraction on each repo
  - Aggregates all data into `dashboard/data.json`
  - Supports `--fresh` flag to re-clone everything
- Added repos: social-ad-creator (156 commits), model-pear (302 commits)
- Updated `docs/ADMIN_GUIDE.md` with managed repos workflow
- Simplified `.gitignore`: track all `reports/`, ignore `.repo-cache/`

### GitHub Pages Deployment Fix

- Fixed `data.json` not loading on live GitHub Pages site
- Issue: `deploy.yml` copied `dashboard/index.html` but not `dashboard/data.json`
- Fix: Added step to copy `dashboard/data.json` to `_site/data.json`
- Now `fetch('data.json')` resolves correctly on the deployed site

### Dashboard Cleanup - Remove Vanity Elements

Removed all vanity metrics and charts from the dashboard:

**Progress Tab:**
- Removed: Monthly Commit Volume chart
- Removed: Cumulative Growth (Lines of Code) chart
- Added: Complexity Over Time chart (avg complexity by month)
- Kept: Feature vs Bug Fix Trend

**Contributors Tab - Complete Rework:**
- Removed: Commits by Contributor chart
- Removed: Lines Changed by Contributor chart
- Removed: Contributor Details list (showed commits + lines)
- Added: "Who Does What" - work type breakdown per contributor
- Added: Complexity by Contributor chart

**Timeline Tab:**
- Removed: Commit Timeline chart (just showed daily counts)
- Removed: +/- lines display from commit list
- Added: Complexity badge (1-5) on each commit
- Increased visible commits from 50 to 100

**Summary Tab Highlights:**
- Removed: "Top Contributor" (vanity)
- Removed: "Busiest Day" (vanity)
- Added: "Complex Changes" (high vs simple count)
- Added: "Quality Work" (refactors + tests count)
- Kept: "Most Active Repo" (for aggregated data)
- Kept: "Off-Hours Work" (burnout indicator)

**Summary Tab Activity Snapshot:**
- Removed: "Avg commits/day" (vanity)
- Added: "Complex" count
- Kept: After-hours, Weekend, Holiday (burnout indicators)

### Metrics Overhaul - Focus on What Matters

Replaced vanity metrics (commits, lines of code) with meaningful work metrics:

**Main Summary Cards (top of dashboard):**
- ~~Lines Added~~ → **Files Changed** (scope of work)
- ~~Lines Removed~~ → **Avg Complexity** (1-5 scale)
- ~~Commits~~ → **Top Work Type** (primary focus)
- Contributors (kept)

**Executive Summary Tab:**
- ~~Commits count~~ → **Features Built** (what was delivered)
- ~~Active Contributors~~ → **Bugs Fixed** (quality work)
- Added **Avg Complexity** with trend
- Added **Files Touched** with trend

**PDF Export:**
- Updated to show new metrics instead of lines added/removed

**Rationale:** Lines of code and commit counts are vanity metrics that don't reflect actual work value. The new metrics focus on:
- What kind of work (tags/types)
- How complex the changes are
- How much of the codebase was affected

### Export and Share Features (Priority 4)

Added PDF export and shareable links to the dashboard:

**PDF Export:**
- Button in header to generate PDF report
- Exports current tab with all charts and statistics
- Includes header with repo name, date range, timestamp
- Shows "Filtered view" indicator when filters active
- Uses html2pdf.js library for client-side generation
- Landscape A4 format for optimal chart display
- Loading spinner during generation

**Shareable Links:**
- Button to copy current view URL to clipboard
- Encodes in URL parameters:
  - Current tab (summary, timeline, timing, etc.)
  - Filter state (tag, author, repo, date range)
  - Summary period (week/month/quarter)
  - Timezone setting (local/utc)
- Auto-applies URL state on page load
- Toast notification confirms copy success

**UI additions:**
- Share and Export PDF buttons in dashboard header
- Buttons hide until data loads
- Responsive layout (icons-only on mobile)
- Toast notification system for feedback
- Print styles for clean output

### Summary Tab and Tag Display Fixes

Fixed two bugs in the dashboard:

1. **Summary tab showing zeros** - Date range comparison was excluding current day's commits
   - Issue: `currentEnd` was set to midnight (00:00:00) causing commits made after midnight to be excluded
   - Fix: Added `endOfDay()` helper that sets time to 23:59:59.999
   - Affects: Summary tab quick stats, work breakdown chart, key highlights, activity snapshot

2. **Tag display order inconsistency** - Pie chart and breakdown list showed tags in different order
   - Issue: Pie chart showed tags in encounter order, list showed them sorted by count
   - Fix: Sort tags by count before rendering the chart so both views are consistent
   - Highest count tag now appears first in both the pie chart legend and the breakdown list

## 2026-01-18

### Dashboard Auto-Load Fix
- Copied `data.json` to `dashboard/` folder for GitHub Pages auto-load
- Previously, relative path `../reports/repo-tor/data.json` didn't resolve on GitHub Pages
- Now dashboard auto-loads sample data immediately without file picker
- Added live dashboard URL to `docs/USER_GUIDE.md` and `docs/ADMIN_GUIDE.md`
- Live dashboard: https://devmade-ai.github.io/repo-tor/

### Schema Alignment
- Updated `scripts/extract.js` with new schema:
  - Added `author_id` field to commits (references metadata.authors)
  - Changed `parseMethod` to `is_conventional` boolean
  - Added `authors` map to metadata.json for author lookup
  - Added `security_events` array to summary.json with commit details
  - Wrapped commits.json in `{ "commits": [...] }` object
- Updated `scripts/aggregate.js` to match new schema
- Updated `dashboard/index.html`:
  - Added author resolution from metadata.authors
  - Uses security_events from summary when available

### Dashboard - Multiple Data Files
- Added multi-file support to `dashboard/index.html`:
  - File picker accepts multiple files (HTML5 `multiple` attribute)
  - Client-side `combineDataFiles()` function merges data
  - Combines commits, contributors, files from multiple repos
  - Merges authors from metadata of all files
  - Shows repo filter when multiple repos loaded
- Updated `docs/USER_GUIDE.md` with multiple file instructions

### Data Extraction
- Ran extraction on this repository using `scripts/extract.js`
- Captured 21 commits from 3 contributors across all branches
- Committed extracted data to `reports/repo-tor/`
- Updated `.gitignore` to keep repo-tor data while ignoring other extractions

### GitHub Pages Deployment
- Created `.github/workflows/deploy.yml` - Automated deployment workflow
  - Triggers on push to main/master branches
  - Supports manual trigger via workflow_dispatch
  - Deploys dashboard to GitHub Pages
  - Copies reports folder if present
- Updated `docs/ADMIN_GUIDE.md` with GitHub Pages setup instructions

### Dashboard Filters
- Added filter bar to Timeline tab in `dashboard/index.html`:
  - Type dropdown - filter commits by type (feat, fix, etc.)
  - Author dropdown - filter commits by contributor
  - Repo dropdown - filter by repository (auto-hides for single-repo data)
  - Date range picker - filter by from/to dates
  - Clear Filters button to reset all filters
- Filters apply to both timeline chart and commit list
- Added commit counter showing "Showing X of Y commits"
- Updated `docs/USER_GUIDE.md` with filter documentation
- Updated `docs/TODO.md` to mark filters as complete

### D3 - Aggregation Script
- Created `scripts/aggregate.js` - Multi-repository aggregation
  - Combines data from multiple repository extractions
  - Adds `repo_id` to track commit source
  - Supports optional author identity mapping
  - Generates cross-repo contributor statistics
  - Produces aggregated summary with per-repo breakdown
- Created `config/author-map.example.json` - Example configuration
  - Maps multiple email addresses to canonical author identity
  - Enables consistent contributor tracking across repos
- Created `config/author-map.schema.json` - JSON schema for validation
- Updated `scripts/extract.js` to include `repo_id`:
  - Added `repo_id` (kebab-case) to metadata
  - Added `repo_id` to each commit for aggregation support
- Updated `docs/ADMIN_GUIDE.md` with aggregation documentation
- Updated `docs/USER_GUIDE.md` with multi-repository view section
- Updated `docs/TODO.md` to mark D3 as complete

### Documentation Reorganization
- Split documentation into separate user and admin guides:
  - `docs/USER_GUIDE.md` - Refocused on dashboard UI and interpretation
    - Dashboard overview and summary cards
    - Each tab explained with "what to look for" guidance
    - Commit type color coding and meanings
    - Overall health interpretation patterns
    - Tips for effective use
  - `docs/ADMIN_GUIDE.md` - New guide for setup and operations
    - Prerequisites and installation
    - Data extraction commands and output structure
    - Commit type detection explanation
    - Hook setup instructions
    - Hosting options (local, server, GitHub Pages)
    - Troubleshooting section
- Updated README.md with links to both guides

### Commit Convention Guide (D2)
- Created `docs/COMMIT_CONVENTION.md` - Full guide for conventional commits
  - Commit message format specification
  - Type definitions with analytics impact
  - Special tags (security, breaking, dependency)
  - Examples for each commit type
  - Quick reference and checklist
- Created `.gitmessage` - Commit message template
  - Use with `git config commit.template .gitmessage`
- Created `hooks/commit-msg` - Validation hook
  - Validates conventional commit format
  - Checks subject length (max 72 chars)
  - Warns about non-imperative mood
- Created `hooks/setup.sh` - Hook installation script

### Git Analytics Reporting System
- Created `scripts/extract.js` - Node.js extraction script
  - Parses git log with commit metadata and stats
  - Supports conventional commits and keyword-based type detection
  - Extracts tags, references, file changes
  - Outputs structured JSON (commits, contributors, files, summary)
- Created `scripts/extract.sh` - Shell wrapper for easier usage
- Created `dashboard/index.html` - Static analytics dashboard
  - Timeline view with daily commit chart and commit list
  - Progress view with monthly volume, cumulative growth, feature vs fix trends
  - Contributors view with commit and lines breakdown
  - Security view highlighting security-related commits
  - Type breakdown with pie chart and percentage bars
  - Uses Chart.js for visualizations, Tailwind CSS for styling
  - Auto-loads data.json or accepts file upload
- Updated USER_GUIDE.md with full usage documentation

### Initial Setup
- Created repository structure
- Added CLAUDE.md with AI assistant preferences and checklists
- Added .gitignore entry for Claude Code local settings
- Created docs/ folder with: SESSION_NOTES.md, TODO.md, HISTORY.md, USER_ACTIONS.md
- Added USER_TESTING.md and USER_GUIDE.md
- Added USER_GUIDE.md and USER_TESTING.md to CLAUDE.md checklists

---
