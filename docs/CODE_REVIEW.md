# Code Review: Git Analytics Reporting System

**Date:** 2026-02-10
**Scope:** Full codebase review — scripts, dashboard (React), configuration, CI/CD, and documentation.

---

## Executive Summary

The project is a well-documented git analytics dashboard built with React 19, Vite 6, Tailwind CSS v4, and Chart.js. The documentation practices are excellent — session notes, AI lessons, history logs, and user guides are thorough and well-maintained.

The review found **3 critical issues**, **12 high-severity issues**, **19 medium-severity issues**, and various low-severity items across security, architecture, performance, and accessibility.

The most impactful findings are:
1. **Command injection vulnerabilities** in extraction scripts via `execSync()` string interpolation
2. **ESM/CommonJS mismatch** — `package.json` declares `"type": "module"` but all scripts use `require()`
3. **`escapeHtml` is undefined** — functions in `utils.js` call it but it was removed, causing runtime crashes
4. **React context structure** causes every component to re-render on every state change

---

## Table of Contents

1. [Critical Issues](#1-critical-issues)
2. [Security](#2-security)
3. [Architecture & Design](#3-architecture--design)
4. [React & Performance](#4-react--performance)
5. [Accessibility](#5-accessibility)
6. [Build & CI/CD](#6-build--cicd)
7. [Code Quality](#7-code-quality)
8. [Documentation & Project Hygiene](#8-documentation--project-hygiene)
9. [Summary Table](#9-summary-table)

---

## 1. Critical Issues

These issues will cause runtime failures or present immediate security risks.

### 1.1 `escapeHtml` is undefined — runtime crash

**Files:** `dashboard/js/utils.js` (lines ~498, ~556, ~594)

`renderDrilldownSummary()`, `renderUrgencyBar()`, and `renderImpactBar()` all call `escapeHtml()`, but this function was removed during the React migration. Any code path that invokes these functions will throw a `ReferenceError`.

**Fix:** Either re-add `escapeHtml` or replace these HTML-template functions with React components.

### 1.2 ESM/CommonJS mismatch — scripts cannot run

**Files:** `package.json` (line 5), all `scripts/*.js`

`package.json` declares `"type": "module"`, but every script uses CommonJS (`require()`, `module.exports`). Running `node scripts/extract.js` on Node.js 20+ will fail with `ReferenceError: require is not defined`.

Additionally, `scripts/update-all.sh` uses `node -e "const config = require('...')"` inline, which also fails under ESM mode.

**Fix:** Either rename scripts to `.cjs` extension, or convert them to ES module syntax (`import`/`export`).

### 1.3 Command injection via `execSync()` string interpolation

**Files:** `scripts/extract.js:34`, `scripts/extract-api.js:91,112`, `scripts/fix-malformed.js:38,61,77`

All scripts pass interpolated strings directly to `execSync()`, which spawns a shell:

```js
// extract.js:34
execSync(`git ${command}`, ...)

// extract-api.js:112
cmd += ` --jq '${options.jq}'`

// fix-malformed.js:38
execSync(`git clone ${repoUrl} ${repoPath}`, ...)
```

If any interpolated value contains shell metacharacters (`;`, `|`, `$()`, backticks), arbitrary commands can execute. While the primary inputs come from config files and git output (not direct user input), compromised config or malformed data could be exploited.

**Fix:** Use `execFileSync()` or `child_process.spawnSync()` which bypass the shell entirely.

---

## 2. Security

### 2.1 HTML template functions with potential XSS vectors (HIGH)

**Files:** `dashboard/js/utils.js`

Functions like `renderStatCard()`, `renderDrilldownSummary()`, `renderUrgencyBar()`, and `renderImpactBar()` return raw HTML strings with interpolated values. Some values (dates, labels) are not escaped. If these are ever used with `dangerouslySetInnerHTML` or `innerHTML`, and the data contains attacker-controlled content (git commit messages can contain arbitrary strings), XSS is possible.

Currently the React components do not use `dangerouslySetInnerHTML`, so the practical risk is low. But these functions are a liability waiting to be misused.

### 2.2 PII in tracked config (MEDIUM)

**File:** `config/author-map.json`

Contains real email addresses committed to a public repository. This file should be gitignored (with only the example file tracked) or the emails anonymized.

### 2.3 SHA values used as filenames without sanitization (MEDIUM)

**Files:** `scripts/save-commit.js`, `scripts/migrate-batches-to-commits.js`, `scripts/merge-analysis.js`

`commit.sha` is used directly in `path.join(dir, `${commit.sha}.json`)`. A malformed SHA like `../../etc/passwd` would cause path traversal. While git SHAs are hex-only, corrupted data files could exploit this.

**Fix:** Validate SHAs match `/^[0-9a-f]{7,40}$/` before using as filenames.

### 2.4 Token placeholder matches real format (LOW)

**File:** `.env.example`

The placeholder `GH_TOKEN=ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx` uses GitHub's real token prefix `ghp_`, which may trigger automated secret scanners. Use `GH_TOKEN=your_token_here` instead.

### 2.5 No JSON validation on uploaded files (LOW)

**File:** `dashboard/js/App.jsx`

The `handleFiles` callback parses uploaded JSON but performs no schema validation. Malformed data (e.g., `{ "commits": "not-an-array" }`) would cause runtime errors in downstream components.

---

## 3. Architecture & Design

### 3.1 Hybrid React/vanilla JS architecture (HIGH)

The codebase is in a transitional state:
- `state.js` contains mutable global state AND direct DOM manipulation functions (`renderSectionGuidance`, `updateAllSectionGuidance`)
- `utils.js` contains functions that return raw HTML strings (pre-React pattern)
- `AppContext.jsx` syncs React state to a mutable global object during render (lines 207-213)
- `App.jsx` has a `useEffect` that manipulates DOM directly for heatmap tooltips

This hybrid approach creates invisible coupling, makes data flow hard to reason about, and will break with React's concurrent features.

### 3.2 Massive code duplication in scripts (HIGH)

The following function groups are duplicated across 2-5 files:
- `parseCommitMessage`, `extractBreakingChange`, `extractReferences` — in `extract.js` and `extract-api.js`
- `getManifestPath`, `readManifest`, `writeManifest` — in 5 files (`save-batch.js`, `save-commit.js`, `manifest-update.js`, `merge-analysis.js`, `pending.js`)
- `extractContributors`, `buildAuthorsMap`, `generateSummary` — in `extract.js`, `extract-api.js`, and `aggregate.js`

These should be extracted into shared modules (e.g., `scripts/lib/git-parsing.js`, `scripts/lib/manifest.js`).

### 3.3 Duplicated computation logic across tabs (MEDIUM)

Feature/bug counts, weekend/after-hours detection, and urgency classification are independently computed in 4+ tab components. Logic changes must be updated in multiple files, and subtle inconsistencies already exist (e.g., `SummaryTab` uses `getWorkPattern()` for after-hours but `HealthTab` manually checks `date.getHours()`).

### 3.4 Dead state properties (LOW)

`state.js` contains properties that are never read or are superseded by React state: `isDarkMode`, `detailPaneOpen`, `currentDetailState`, `filterSidebarOpen`, `settingsPaneOpen`, `currentCommits`, `dirtyTabs`, `charts`.

### 3.5 Dead code — `renderSectionGuidance` and `updateAllSectionGuidance` (LOW)

**File:** `dashboard/js/state.js` (lines ~127-165)

These functions perform direct DOM manipulation (pre-React pattern) and appear to be unused after the React migration.

---

## 4. React & Performance

### 4.1 Context structure causes full re-renders on every dispatch (HIGH)

**File:** `dashboard/js/AppContext.jsx` (lines 261-270)

The `useMemo` for the context value includes `state` as a dependency. Since the reducer returns a new object on every dispatch, `state` changes identity on every action. This means **every dispatch re-renders every context consumer** — all tabs, header, sidebar, settings, etc.

**Fix:** Split into separate contexts (state, dispatch, derived data), or use a state management library with selectors.

### 4.2 Global state mutation during render (HIGH)

**File:** `dashboard/js/AppContext.jsx` (lines 207-213)

React state is synced to a mutable global `state` object inline during the render path. This is an anti-pattern that will break with React concurrent features.

**Fix:** Refactor `utils.js` functions to accept values as parameters instead of reading from the global state.

### 4.3 `isMobile` wrapped in unnecessary `useCallback` (MEDIUM)

**File:** `dashboard/js/AppContext.jsx` (line 259)

`isMobile` is a boolean wrapped in a function via `useCallback`. This adds pointless indirection, and since the callback is recreated every time `isMobileView` changes, it triggers chart recalculations across all tabs on every window resize.

**Fix:** Expose `isMobile` as a plain boolean value.

### 4.4 State update during render in TimelineTab (MEDIUM)

**File:** `dashboard/js/tabs/TimelineTab.jsx` (lines 17-21)

`setVisibleCount` is called during the render phase (outside of `useEffect`). This causes double renders and is flagged by React Strict Mode.

**Fix:** Move to a `useEffect` with `filteredCommits.length` as a dependency.

### 4.5 Multiple passes over `filteredCommits` (MEDIUM)

**Files:** `dashboard/js/tabs/SummaryTab.jsx`, `dashboard/js/tabs/DiscoverTab.jsx`

`SummaryTab` iterates `filteredCommits` 7 separate times with `.filter()` + `getCommitTags()`. `DiscoverTab` independently iterates for each metric. A single-pass approach accumulating all metrics would be more efficient for large datasets.

### 4.6 No `React.memo` anywhere in the component tree (MEDIUM)

Combined with issue 4.1, every state change re-renders every component. Adding `React.memo` to tab components and shared components would prevent unnecessary re-renders.

### 4.7 No list virtualization for large commit lists (LOW)

**File:** `dashboard/js/tabs/TimelineTab.jsx`

The "Load more" pagination helps, but accumulating hundreds of DOM nodes without windowing can cause jank on large datasets.

### 4.8 Missing `<React.StrictMode>` (LOW)

**File:** `dashboard/js/main.jsx`

StrictMode helps detect common issues during development. It is not currently enabled.

### 4.9 PWA import error handling is broken (LOW)

**File:** `dashboard/js/App.jsx` (lines 80-87)

Dynamic `import('./pwa.js')` is wrapped in a try/catch that only catches synchronous errors. The correct pattern is `import('./pwa.js').catch(() => {})`.

### 4.10 Hard-coded dark mode (LOW)

**File:** `dashboard/js/main.jsx` (line 30)

`document.documentElement.classList.add('dark')` unconditionally forces dark mode. There is no `prefers-color-scheme` detection, and `state.isDarkMode` is dead.

---

## 5. Accessibility

### 5.1 TabBar missing arrow-key navigation (MEDIUM)

**File:** `dashboard/js/components/TabBar.jsx`

The `role="tablist"` does not implement the expected WAI-ARIA keyboard pattern (arrow keys to move between tabs, active tab has tabIndex=0, inactive tabs have tabIndex=-1).

### 5.2 Chart accessibility — no screen reader alternatives (MEDIUM)

All Chart.js charts render to `<canvas>` elements, which are inherently inaccessible. There are no `aria-label` attributes on chart containers to provide text alternatives.

### 5.3 Heatmap cells lack accessible labels (MEDIUM)

**File:** `dashboard/js/tabs/TimingTab.jsx`

Heatmap cells use `data-tooltip` attributes (custom JS tooltips) but have no `aria-label`, `title`, or `role` for screen readers.

### 5.4 Focus trap does not restore previous focus (MEDIUM)

**File:** `dashboard/js/hooks/useFocusTrap.js`

When a dialog closes, focus should return to the trigger element. Currently it is lost, causing keyboard users to lose their place.

### 5.5 Interactive elements missing `aria-label` (LOW)

Stat cards across all tabs have `role="button"` but no `aria-label` communicating their clickable purpose.

### 5.6 Date inputs lack accessible labels (LOW)

**File:** `dashboard/js/components/FilterSidebar.jsx`

The date range inputs are not associated with `<label>` elements via `htmlFor`/`id`.

### 5.7 ARIA role mismatch on dropdown (LOW)

**File:** `dashboard/js/components/FilterSidebar.jsx`

The dropdown uses `role="listbox"` containing `<input type="checkbox">` inside `role="option"`. ARIA `option` elements should not contain interactive children. `menuitemcheckbox` would be more appropriate.

### 5.8 Color-only differentiation (LOW)

Several components use color alone to convey meaning (work hour percentages as green/amber/red, comparison bars as green/amber) without text or icon alternatives.

---

## 6. Build & CI/CD

### 6.1 GitHub Actions deploy silently ignores missing data files (MEDIUM)

**File:** `.github/workflows/deploy.yml`

All `cp` commands use `2>/dev/null || true`, meaning missing data files produce no error. The deploy succeeds and ships a broken dashboard with no data.

**Fix:** Either fail the build if essential files are missing, or emit visible warnings.

### 6.2 PWA precaches all JSON including frequently changing data (MEDIUM)

**File:** `vite.config.js` (line ~52)

`globPatterns: ['**/*.{js,css,html,ico,png,svg,json}']` precaches per-repo JSON data. Every data update invalidates the entire service worker cache, and users may see stale data.

**Fix:** Exclude `*.json` from precache and use a runtime caching strategy (NetworkFirst) for data files.

### 6.3 GitHub Actions pinned to mutable tags (MEDIUM)

**File:** `.github/workflows/deploy.yml`

Uses `@v4`/`@v3` tags that can be updated by action maintainers. Pin to specific commit SHAs for supply chain security.

### 6.4 No linting, type checking, or `npm audit` in CI (MEDIUM)

`@types/react` and `@types/react-dom` are installed but there is no `tsconfig.json`, no ESLint config, and no lint/type-check/audit step in CI.

### 6.5 `sharp` installed with no apparent usage (LOW)

**File:** `package.json`

`sharp@^0.34.5` is a native image processing library listed in devDependencies but no code references it. It adds significant install time.

### 6.6 Stale Jekyll entries in `.gitignore` (LOW)

The project is Vite/React but `.gitignore` contains Jekyll-specific entries from the GitHub Pages template.

### 6.7 Duplicate icons directories (LOW)

Icons exist in both `dashboard/icons/` and `dashboard/public/icons/`. One set is likely unused.

### 6.8 `cancel-in-progress: false` wastes CI minutes (LOW)

Rapid successive pushes to main will queue multiple deployments instead of cancelling obsolete ones.

### 6.9 No `engines` field in `package.json` (LOW)

CI uses Node 20 but the project does not declare a required Node version. Local development on incompatible versions would produce confusing errors.

---

## 7. Code Quality

### 7.1 Unprotected `JSON.parse` calls throughout scripts (MEDIUM)

Most `JSON.parse(fs.readFileSync(...))` calls in scripts have no try/catch. A single corrupted JSON file crashes the entire pipeline.

### 7.2 Triplicated default filter definitions (MEDIUM)

**File:** `dashboard/js/AppContext.jsx`

The default filter shape is defined in three places: `loadInitialState()`, the `CLEAR_FILTERS` reducer case, and `FILTER_DEFAULTS` in `state.js`. These must be manually kept in sync.

### 7.3 Inconsistent urgency null-handling across tabs (MEDIUM)

`SummaryTab` properly checks `c.urgency != null` before computing averages. `HealthTab` does `c.urgency >= 4` without null guards, silently dropping commits with undefined urgency from all categories. The tabs can show different totals for the same data.

### 7.4 `HealthTab.jsx` is disproportionately large — 569 lines (LOW)

Contains 2 sub-components, 10 `useMemo` hooks, and 4 click handlers covering 3-4 distinct features. Should be decomposed.

### 7.5 Anonymous name pool limited to 8 entries (LOW)

**File:** `dashboard/js/state.js`

`anonymousNames` has 8 entries. With more than 8 authors, names repeat, defeating anonymization.

### 7.6 `FILTER_DEFAULTS.dateFrom` hard-coded to `'2025-12-01'` (LOW)

**File:** `dashboard/js/state.js` (line ~171)

Will become stale over time. Should be computed relative to the current date.

### 7.7 Commit delimiter collision risk (LOW)

**File:** `scripts/extract.js`

The git log format uses `---COMMIT_DELIMITER---` as a separator. If a commit message body contains this exact string, parsing breaks silently.

### 7.8 `setup-gh.sh` has a `$?` evaluation bug (LOW)

**File:** `scripts/setup-gh.sh` (line ~279)

`if [[ "$choice" == "3" && $? -eq 0 ]]` — the `$?` checks the exit code of the preceding `[[ ... ]]` test, not the `gh auth login` command.

---

## 8. Documentation & Project Hygiene

### 8.1 ~~Untested feature marked as available~~ RESOLVED (2026-02-24)

`extract-api.js` was rewritten to use curl instead of `gh` CLI, tested, and confirmed working. No longer untested.

### 8.2 Documentation is excellent (POSITIVE)

The project has thorough documentation: `CLAUDE.md`, `SESSION_NOTES.md`, `AI_LESSONS.md`, `TODO.md`, `HISTORY.md`, `USER_GUIDE.md`, `ADMIN_GUIDE.md`, `USER_TESTING.md`, `EXTRACTION_PLAYBOOK.md`, `COMMIT_CONVENTION.md`, and an ADR. The AI lessons file documenting past mistakes is an unusually mature practice.

### 8.3 `config/author-map.json` vs `.example` (NOTE)

The real config is tracked, the example is also tracked. The real config contains PII (see 2.2). Standard practice is to gitignore the real config and only track the example.

---

## 9. Summary Table

| # | Issue | Severity | Category |
|---|-------|----------|----------|
| 1.1 | `escapeHtml` undefined — runtime crash | **Critical** | Bug |
| 1.2 | ESM/CJS mismatch — scripts cannot run | **Critical** | Config |
| 1.3 | Command injection via `execSync()` | **Critical** | Security |
| 2.1 | HTML template functions with XSS vectors | High | Security |
| 3.1 | Hybrid React/vanilla JS architecture | High | Architecture |
| 3.2 | Massive code duplication in scripts | High | Code Quality |
| 4.1 | Context causes full re-renders on all dispatches | High | Performance |
| 4.2 | Global state mutation during render | High | React |
| 2.2 | PII (emails) in tracked config | Medium | Security |
| 2.3 | SHA used as filename without validation | Medium | Security |
| 3.3 | Duplicated computation logic across tabs | Medium | Architecture |
| 4.3 | `isMobile` function wrapper triggers chart recalcs | Medium | Performance |
| 4.4 | State update during render in TimelineTab | Medium | React |
| 4.5 | Multiple passes over commits array | Medium | Performance |
| 4.6 | No `React.memo` anywhere | Medium | Performance |
| 5.1 | TabBar missing arrow-key navigation | Medium | Accessibility |
| 5.2 | Charts have no screen reader alternatives | Medium | Accessibility |
| 5.3 | Heatmap cells lack accessible labels | Medium | Accessibility |
| 5.4 | Focus trap doesn't restore previous focus | Medium | Accessibility |
| 6.1 | Deploy silently ignores missing data files | Medium | CI/CD |
| 6.2 | PWA precaches frequently changing data | Medium | CI/CD |
| 6.3 | Actions pinned to mutable tags | Medium | CI/CD |
| 6.4 | No linting/type-checking/audit in CI | Medium | CI/CD |
| 7.1 | Unprotected `JSON.parse` calls in scripts | Medium | Code Quality |
| 7.2 | Triplicated default filter definitions | Medium | Code Quality |
| 7.3 | Inconsistent urgency null-handling | Medium | Code Quality |
| 8.1 | Untested feature as default path | Medium | Process |

*Low-severity items (16 total) are documented in sections above but omitted from this summary table for brevity.*

---

*Review generated 2026-02-10. Covers all files in `scripts/`, `dashboard/js/`, config files, and CI workflows.*
