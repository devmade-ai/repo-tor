# History

Log of significant changes to code and documentation.

## 2026-04-16

### Wire focus trap and keyboard nav improvements to HamburgerMenu

Completed several items from the BURGER_MENU partial-to-complete checklist:

1. **Extracted `useDisclosureFocus` hook** — Focus-on-open and return-to-trigger-on-close logic was inlined in HamburgerMenu.jsx. Extracted to `dashboard/js/hooks/useDisclosureFocus.js` following the glow-props BURGER_MENU.md spec. Reusable across any disclosure component.

2. **Wired `useFocusTrap` to the menu** — The existing hook trapped Tab/Shift+Tab but was never imported by HamburgerMenu. Added an optional `externalRef` second parameter to the hook signature (backward-compatible — 4 existing callers unchanged) so HamburgerMenu can pass its own `menuRef`. Tab can no longer escape the open menu.

3. **Added Home/End key support** — `handleMenuKeyDown` now handles Home (first item) and End (last item) in addition to ArrowDown/ArrowUp. Refactored from if/else to a switch statement.

4. **Added `disabled` item support** — Items with `disabled: true` render with `opacity-40 cursor-not-allowed`, have the HTML `disabled` attribute set on the button, are skipped by arrow/Home/End keyboard navigation (via `button:not([disabled])` selector), and are guarded against click in `handleItem`.

5. **Theme UI already present** — Verified that the dark/light toggle and per-mode theme picker (Approach A) were already fully implemented in Header.jsx with `keepOpen: true` behavior.

Files changed: `HamburgerMenu.jsx`, `useFocusTrap.js`, new `useDisclosureFocus.js`, `CLAUDE.md`.

## 2026-04-15

### Retrospective pass — tripwire invariants, file-size findings, index.html scope

A "trust but verify" pass on the previous three audit cleanups caught
five issues the audits missed or papered over. Four commits:

1. **`a7a9126`** `test(tripwire): enforce CLAUDE.md exception lists at
   source level` — The tripwire at
   `scripts/__tests__/daisyui-surfaces.test.mjs` verified DaisyUI
   component-class usage and the empty custom-CSS allowlist, but had
   ZERO machine-enforced checks on the CLAUDE.md exception lists that
   three passes had spent 29 commits locking down. A contributor
   could drift right past the rules. Added three regression guards:

   - **Bracket-value allowlist** — scans every JSX `className` attribute
     for Tailwind-style `utility-[...]` patterns and diffs against the
     hard-coded 4-item allowlist (`z-[var(--z-sticky-header)]`,
     `z-[var(--z-toast)]`, `grid-cols-[auto_repeat(7,1fr)]`,
     `max-w-[calc(100vw-2rem)]`). Any new bracket value fails with a
     specific offender list.
   - **Hex literal scope** — scans every `.js`/`.jsx` under
     `dashboard/js/` for `#[0-9a-fA-F]{6}` in stripped source (comments
     removed). Allowlist: `components/DebugPill.jsx`, the whole
     `components/debug/` subtree, and `generated/themeMeta.js`.
   - **JSX heading font-mono** — matches every `<h1|<h2|<h3>` opening
     tag and fails if `font-mono` isn't in its className. Enforces
     the contract that replaced the deleted `h1, h2, h3 { font-mono }`
     element-selector rule from styles.css.

   Each test emits file:line + offender, so a regression is
   actionable instead of mysterious. Sanity-checked the regexes
   against synthetic violations before committing. Test count went
   60 → 63.

2. **`460e161`** `docs(todo): flag pwa.js + scripts/ file-size
   findings from retrospective` — Ran a file-size sweep over the
   whole repo (not just `dashboard/js/sections/` / `components/`).
   Caught three files the audit missed:

   - **`dashboard/js/pwa.js` 578 lines** (OVER soft-limit 500) — the
     PWA install + update logic. None of the three audit passes
     touched it because none ran a file-size sweep over the
     top-level `dashboard/js/*.js` modules. Added to TODO.md with
     split guidance (install flow / update flow / instructions
     data / event bridge).
   - **`scripts/aggregate-processed.js` 1042 lines** (OVER
     strong-limit 800) — the active dashboard data pipeline. Not
     touched because `scripts/` was out of scope for the audit.
     Added to TODO.md with suggested `scripts/aggregate/` subdirectory
     split (read-commits / summary / time-windows / authors).
   - **`scripts/extract-api.js` 699 lines** (OVER soft-limit 500) —
     same out-of-scope reason. Added to TODO.md for monitoring.

   None of the three are actionable today (audit batch is closing),
   but they're now captured so the next session doesn't re-discover
   them from scratch.

3. **`57e2423`** `docs(claude): scope note — index.html pre-React
   hex/inline-style is out of policy` — A future reviewer looking at
   `dashboard/index.html` would see inline `style="..."` blocks with
   hex literals (loading spinner, noscript fallback, PWA early-capture
   warnings) and might think the vanilla-DaisyUI policy was being
   violated. Those inline styles are intentional: they render BEFORE
   React mounts and BEFORE the main CSS bundle loads, so Tailwind
   classes would be invisible in the pre-React window. Added a "Scope
   note" sub-bullet to the hex-literal exception list in CLAUDE.md
   explaining this is a separate layer with its own pre-React rules.

4. **`<this commit>`** `docs(audit): retrospective rollup in HISTORY
   + SESSION_NOTES` — records the retrospective pass itself.

### Verified invariants at the end of the retrospective

The retrospective also double-checked assumptions from the prior
passes:

- **`<body class="font-sans">` inheritance** — verified Tailwind v4
  preflight sets `html { font-family: var(--default-font-family) }`
  where `--default-font-family` resolves to our `:root --font-sans`
  Figtree stack (via unlayered-CSS precedence over Tailwind's
  `@layer theme` default). The body class is strictly redundant but
  harmless and explicit. Also discovered that the OLD `* { font-family
  }` rule was a latent BUG: it overrode Tailwind preflight's
  `code, kbd, samp, pre { font-family: monospace }` rule, forcing
  `<code>` elements to render in Figtree instead of monospace. The
  2026-04-15 removal of the `*` rule fixed a bug nobody had noticed.

- **Remaining inline style={} scope** — repo-wide grep of `style=\{\{`
  showed 27 remaining sites across `dashboard/js/`. Every one is
  either runtime-data-derived (progress widths, Contributors height
  from row count, portal positioning, runtime tag colours) or in the
  DebugPill subsystem. No static inline-style regressions.

- **Remaining arbitrary bracket values** — repo-wide grep showed
  exactly 4 sites in JSX className attributes, matching the CLAUDE.md
  allowlist exactly. Plus comment-only mentions. Clean.

- **DaisyUI v5 base layer** — re-verified that
  `node_modules/daisyui/base/rootcolor.css` still emits
  `:root, [data-theme] { background: var(--page-scroll-bg,
  var(--root-bg)); color: var(--color-base-content) }` so the
  `body { background-color / color }` removal from commit 39cd3cf
  still holds across DaisyUI upgrades.

- **Test count monotonic increase** — 60 (start of retrospective)
  → 63 (after tripwire strengthening). No tests deleted, no tests
  weakened.

Build clean (879.94 kB), 63/63 tests pass.

### Third audit-cleanup pass — exception strengthening + aggregate.js investigation

A tier-based review of the CLAUDE.md exception list classified each
of the 13 documented exceptions by "what breaks if you remove it"
(critical / resilience / design-preference / cost). The Tier-4
"arguably removable" exceptions were then actually removed, rather
than left as permanent documented scar tissue. Six commits:

1. **`12cd65d`** `refactor(styles): drop * font-family reset — use
   body class="font-sans"` — The `*` universal selector was
   applying `font-family: var(--font-sans)` explicitly to every
   element, but the same effect is achievable by setting
   `font-sans` on a single ancestor (body) and letting CSS
   inheritance propagate. Verified Tailwind v4 emits
   `.font-sans{font-family:var(--font-sans)}` by reading the
   design-token CSS variable from `:root`. Removes one of the
   three element-selector exceptions in styles.css.

2. **`aea7c43`** `refactor(errorboundary): root fallback uses
   Tailwind utilities, not inline style` — The root ErrorBoundary
   in `main.jsx` had a static inline `style={}` block with
   `minHeight: '100vh'`, flex centering, padding, gap. The
   exception existed as defensive scaffolding for the rare
   CSS-load-failure case, but browser user-agent default styling
   still renders the fallback legibly in that scenario. Converted
   to `min-h-screen flex flex-col items-center justify-center
   gap-4 p-6 text-center`. Removes the "Root ErrorBoundary" entry
   from the static-inline-style exception list, leaving DebugPill
   subsystem as the only remaining exception in that category.

3. **`5bcc2c2`** `refactor(styles): drop h1/h2/h3 font-mono rule —
   use explicit utility classes` — Repo-wide grep for
   `<h1|<h2|<h3` found only 4 JSX headings (Header, QuickGuide,
   InstallInstructionsModal, DropZone) — the "15-20 files" boilerplate
   estimate turned out to be much smaller. Added explicit `font-mono`
   to the 3 headings that didn't already have it (DropZone already
   did, pre-existing). Removes the second element-selector
   exception, leaving only `body::before` decorative grid.

4. **`0cc5d6e`** `refactor(themes): getMetaColor fallback uses
   default theme's hex, not #808080` — The `themes.js #808080`
   fallback was a safety net for the "unknown theme name" case,
   but the `generate-theme-meta.mjs` build-time validator
   guarantees every theme in the catalog has a META_COLORS entry.
   Rewrote `getMetaColor()` to read `META_COLORS[DEFAULT_LIGHT_THEME]`
   as the fallback (the default theme's generated hex — guaranteed
   to exist by the generator's own invariant) and log a debug
   event on the unreachable branch so the anomaly would surface
   via the debug pill if it ever fires. `themes.js` source code
   now contains zero hex literals. Removes the third hex-literal
   exception.

5. **`1e19858`** `chore(dashboard): delete 5 stale aggregate
   artefacts at dashboard/ root` — Resolved the parked `aggregate.js`
   investigation from the previous pass. The script is NOT dead
   code — it's the multi-repository aggregation tool for the
   @data / admin persona, documented in ADMIN_GUIDE.md,
   DATA_OPERATIONS.md, DISCOVERY_SESSION.md, and CODE_REVIEW.md.
   But the 5 JSON files at `dashboard/` root (commits.json,
   contributors.json, files.json, metadata.json, summary.json —
   ~960 kB total) were artefacts of a deprecated workflow that
   used `--output=dashboard`, before the 2026-02 restructure to
   `dashboard/public/data/` served by Vite. Zero consumers
   anywhere in the tree — verified via repo-wide grep. Deleted;
   `aggregate.js` and `aggregate-processed.js` both kept as-is.

6. **`<this commit>`** `docs(claude): consolidate exception lists
   after third-pass cleanup` — CLAUDE.md exception lists updated
   to reflect the four removed exceptions. Summary of the final
   state:

     - Element-selector exceptions: 1 (was 3) — `body::before`
       decorative grid only
     - Arbitrary bracket value exceptions: 4 (unchanged) —
       z-21, z-70, `grid-cols-[auto_repeat(7,1fr)]`,
       `max-w-[calc(100vw-2rem)]`
     - Hex literal exceptions: 2 (was 3) — DebugPill subsystem,
       generated/themeMeta.js
     - Static inline style exceptions: 1 (was 2) — DebugPill
       subsystem only

   Every remaining exception has a stated capability-gap or
   resilience rationale. None of the remaining exceptions are
   pure design preferences that could be eliminated by touching
   more JSX — the third pass burned through those.

Build + tests pass after every commit. Total files touched across
the six commits: 15. Net change: 5 JSON artefacts deleted
(-27,580 lines), 3 CSS element-selector rules removed, 9 hex /
inline-style references removed, 4 JSX headings updated, 1
ErrorBoundary render() rewritten, CLAUDE.md exception list
trimmed from ~15 documented exceptions to 8.

### Second audit-cleanup pass — CLAUDE.md exceptions, dead code, inline styles, body rule, AppContext split

A fresh-eyes audit pass over the `claude/migrate-daisyui-dark-mode-toG0Y`
branch (reading files as if new to the codebase, cross-checking actual
code against CLAUDE.md rules, spot-checking agent reports) caught 20
issues the first audit pass missed. Eight commits landed:

1. **`09ca333`** `docs(claude): expand exceptions for debug subsystem +
   ErrorBoundary + paths` — CLAUDE.md hex-literal exception expanded
   from just `DebugPill.jsx` to cover the entire `components/debug/`
   subtree (the 2026-04-15 split moved most hex into
   `debug/debugStyles.js` and `debug/DebugTabs.jsx` — both inherit the
   same "isolated React root must survive CSS load failure" rationale
   but weren't explicitly named). Bracket-value exception for
   `grid-cols-[auto_repeat(7,1fr)]` updated from `Timing.jsx` to
   `components/TimingHeatmap.jsx` path. New "inline style" exception
   documented for the root ErrorBoundary in `main.jsx` (static layout
   values are intentional so the fallback renders even when Tailwind
   CSS fails to load). `docs/ADMIN_GUIDE.md` added to the docs table.
   Key Components list refreshed with `TimingHeatmap`, `components/debug/`,
   `sections/discover/`, `useTimelineCharts`, and `appReducer.js`.

2. **`3520a6f`** `refactor(cleanup): delete 4 dead exports, unexport 4
   internals, drop dead hook` — repo-wide grep found 9 zero-consumer
   exports. Deleted: `debugLog.js` `debugGetEntries` + `diagnoseFailure`;
   `utils.js` `formatNumber` + `aggregateForDrilldown` + `DAY_NAMES`;
   `hooks/useClickOutside.js` file (no imports anywhere). Demoted to
   module-private: `utils.js` `SA_HOLIDAYS` + `aggregateByTag`;
   `chartColors.js` `getRepoColor`; `debug/debugStyles.js` `SOURCE_COLORS`
   + `SEVERITY_COLORS`. Close call averted: `getCommitDateRange` was
   briefly considered dead but Health.jsx:217 still uses it.

3. **`44b6393`** `chore(hygiene): session notes shas, hamburger comment,
   header dep array` — `SESSION_NOTES.md` commit shas 7-13 backfilled,
   HamburgerMenu.jsx stale `z-[40]/z-[50]` comment rewritten to
   describe the current stock `z-40`/`z-50` utilities, Header.jsx
   `menuItems` useMemo dropped the useState setter from its dep array.

4. **`7a5a5c9`** `refactor(charts): replace chartHeight inline style
   with utility classes` — eleven call sites across five files
   converted from `style={{ height: chartHeight }}` (where chartHeight
   was a breakpoint-based string) to `className={chartHeightClasses}`
   using stock Tailwind h-N utilities. Height mapping: Timing
   `h-50 sm:h-62` (200 / 248), Progress `h-55 sm:h-75` (220 / 300),
   Timeline `h-55 sm:h-75` (220 / 300), Tags `h-62 sm:h-87` (248 / 348).
   The 2px deltas on Timing/Tags are imperceptible and honour the
   CLAUDE.md "round to nearest stock" rule. Contributors.jsx inline
   height at line 266 deliberately preserved — its height is
   runtime-computed from the number of top contributors (1 to 8),
   which is the "runtime-computed from data" allowance.

5. **`dfc7245`** `perf(timeline): handleCardClick builds only the count
   it needs` — the "Contributors" summary card handler was allocating a
   full `{email: {name, count}}` map + sorted array just to read the
   unique-author count. Replaced with
   `new Set(filteredCommits.map(getAuthorEmail)).size`. Identical
   behaviour (same subtitle string, same payload), O(n) allocation
   instead of O(n) objects + O(k log k) sort on 10k-commit datasets.

6. **`39cd3cf`** `fix(styles): drop redundant body bg/color — DaisyUI
   base already sets it` — verified by reading
   `node_modules/daisyui/base/rootcolor.css` that DaisyUI v5's base
   layer emits `:root, [data-theme] { background: var(--page-scroll-bg,
   var(--root-bg)); color: var(--color-base-content); }`. Since the
   theme flash-prevention script sets `data-theme` on `<html>`, DaisyUI
   paints the viewport background on the root element automatically —
   our explicit `body { background-color / color }` pair was
   overpainting with the identical tokens DaisyUI already emitted.
   Removed the two declarations; the body rule now only holds
   safe-area padding. Confirmed via grep of the built CSS bundle that
   the DaisyUI `:root, [data-theme]` rule still ships. Live browser
   verification across all 8 themes filed under post-sweep-verification
   TODO item #4.

7. **`5ecfad7`** `refactor(context): extract reducer + filter logic to
   appReducer.js` — `AppContext.jsx` was 579 lines (over the 500-line
   soft-limit). Clean split at the pure-data / React boundary: the
   reducer switch, `loadInitialState`, `DEFAULT_FILTERS`, and
   `filterCommits` moved into `dashboard/js/appReducer.js` (285 lines,
   zero React imports). `AppContext.jsx` now owns only the
   React-specific layer (context creation, provider component, every
   useEffect / useMemo / useCallback, consumer hooks) and is 338
   lines. The `daisyui-surfaces.test.mjs` tripwire for `SET_THEME_COLORS`
   was updated to read both files and verify the import wiring.

8. **`<this commit>`** `docs(todo): monitoring entries + second-pass
   verification checklist` — `docs/TODO.md` updated with
   post-sweep-verification item #4 (second-pass browser spot-checks),
   new "File-size monitoring" section for `useTimelineCharts.js` (416
   lines, 84 lines of headroom) and `AppContext.jsx` (338 lines,
   monitoring guidance if it grows again). Footer summary rewritten
   to describe both audit passes and their scope.

All eight commits: build clean, 60/60 tests pass after each commit.

### Removed Playwright + e2e dir + visual baselines

Deleted everything Playwright-related from the project. The original
2026-04-13 commit (`af0f02d test(daisyui): add three-layer automated
regression coverage`) added 1337 lines across 8 files (`playwright.config.js`,
`dashboard/e2e/README.md`, `dashboard/e2e/daisyui-surfaces.spec.js`,
`dashboard/e2e/visual/theme-baselines.spec.js`, `@playwright/test`
devDep, 5 npm scripts, `.gitignore` patterns) — but never produced any
baseline screenshots because the session that committed it had no
Chromium binary in its sandbox. The spec files sat unrun across every
subsequent session. By the 2026-04-15 fresh-eyes audit it was clear
the visual regression "coverage" was misleading documentation rather
than working tests, and several earlier audit reports incorrectly
warned that "baselines will drift" when there were no baselines to
drift from.

Deleted in this commit:
  - `playwright.config.js`
  - `dashboard/e2e/` directory (3 files, 642 lines)
  - `@playwright/test ^1.59.1` devDependency from package.json
  - 5 npm scripts: `test:e2e`, `test:e2e:install`, `test:e2e:ui`,
    `test:visual`, `test:visual:update`
  - 5 `.gitignore` lines for Playwright artifacts
  - 1 row from CLAUDE.md docs table (`dashboard/e2e/README.md` entry)
  - Stale references in TESTING_GUIDE.md (rewrote "Automated coverage"
    section to describe only the source-level tripwire layer)
  - Stale "Re-capture Playwright baselines" entry from TODO.md

Re-installed node_modules to refresh package-lock.json — confirmed
`@playwright/test` and transitive deps (`playwright`, `playwright-core`)
are no longer present.

Future re-introduction is tracked in `docs/TODO.md` "Browser test
coverage (future)" with notes on what to do differently:
  - Verify the runner can actually execute in the target environment
    BEFORE writing specs. The previous attempt set up everything
    without ever running it.
  - Decide scope first. Visual regression has high maintenance cost
    (every UI change requires baseline re-capture + visual review).
    Functional smoke tests are higher value-per-byte. Start with
    smoke only.
  - Existing source-level tripwire (`scripts/__tests__/daisyui-surfaces.test.mjs`)
    catches DaisyUI class regressions without a browser. New browser
    tests should complement it, not replace it.
  - Reference for the previous attempt: commit `af0f02d` in git
    history. Resurrect as a starting point if useful, but treat as a
    draft — most assertions reference DaisyUI v5 phase markers that
    have shifted with subsequent refactors.

Verified after removal:
  - vite build clean
  - 60/60 source-level tests still pass (`npm test`)
  - Zero references to playwright / dashboard/e2e / @playwright /
    test:e2e / test:visual / theme-baselines remain in CLAUDE.md,
    package.json, .gitignore, TESTING_GUIDE.md, or TODO.md
    (historical references in older HISTORY.md entries are left in
    place as changelog context)

Tags: chore, testing, cleanup, dependency
Complexity: 2
Urgency: 1
Impact: infrastructure
Risk: low
Debt: paid
Epic: dependency-cleanup
Semver: patch

## 2026-04-14

### Vanilla-DaisyUI sweep — 8 phases, zero custom CSS

User directive: "the daisy theme is the brand colour, i don't want
brand colours or static colours anywhere. i don't want custom borders
or shadows or anything similar. i want everything a vanilla as possible
using daisyui".

Executed a full 8-phase sweep that ended with:
- Zero custom CSS classes in `dashboard/styles.css` (down from 24)
- Zero `@theme` tokens, zero `@utility` directives
- Zero arbitrary Tailwind bracket values (except `z-[var(--z-toast)]`
  which references a :root design-token CSS variable)
- Zero hardcoded hex colour literals in JSX
- Zero brand-fixed colour palettes in data constants (except
  `DebugPill.jsx` inline hex which survives CSS load failure, and
  `themes.js:137` fallback `#808080` as a single safety-net)

Every dashboard surface now renders through DaisyUI component classes,
DaisyUI semantic tokens, and stock Tailwind v4 utilities.

**Phase 3 — revert @theme/@utility** (`1e82da2`)
Deleted the `@theme` + `@utility` blocks added in the previous session.
Replaced `text-8/9/10/11/13` with `text-xs`/`text-sm`, shadows with
`shadow-lg`/`shadow-xl`, heatmap text dropped entirely (too small to
read at stock sizes), grid template restructured to flex + grid-cols-7.

**Phase 4c — heatmap intensity** (`4cb677e`)
Deleted `.heatmap-0..4` custom classes. Replaced with
`HEATMAP_LEVEL_CLASSES` JS constant mapping each level to stock
`bg-base-300` / `bg-primary/20..100` utilities.

**Phase 1 — tag colours** (`5e88695`)
Deleted `TAG_COLORS` (34 brand hex), `TAG_TEXT_OVERRIDES`,
`DYNAMIC_TAG_PALETTE`, `getTagColor`, `getTagStyleObject`,
`hashString`, `getDynamicTagColor`. Replaced with `TAG_SEMANTIC` map
of 34 tag names to 7 DaisyUI badge variants, `getTagBadgeClass(tag)`
returning the variant class, and `resolveTagSemanticColor(tag)`
reading the active theme's semantic CSS var at runtime for Chart.js
datasets. 5 JSX consumers updated to use `badge badge-sm ${variant}`.

**Phase 2 — chart colours** (`77050e8`)
Rewrote `chartColors.js` end-to-end. Deleted `DEFAULT_SERIES` (20-hex
palette), 4 alternate palettes (`passionate/ocean/earth/neon`),
`DEFAULT_ACCENT`, `DEFAULT_ACCENT_MUTED`, `parseColorOverrides`,
`hasUrlAccentOverride`, `hasUrlMutedOverride`, `seriesColors`,
`accentColor`, `mutedColor`, `palettes`. URL parameters `?palette=`,
`?accent=`, `?muted=`, `?colors=` all removed. Added
`SEMANTIC_CYCLE` of 8 DaisyUI semantic variable names;
`getSeriesColor(i)` cycles through them via `getComputedStyle` at
call time. `resolveRuntimeAccent/Muted/getSemanticPalette/
getRepoColor/buildRepoColorMap` all resolve DaisyUI CSS vars at
runtime. `main.jsx` dropped the `--chart-accent-override` URL bridge.
`AppContext` state.themeAccent / themeMuted seed empty; dispatched
on mount + every theme change.

**Phase 4b + 4g — CollapsibleSection + embed-mode** (`68d21e5`)
CollapsibleSection migrated to DaisyUI `collapse collapse-arrow` with
a native checkbox wired to React state. In embed mode it short-
circuits to `<>{children}</>` so embedders get bare charts. Deleted
`.collapsible-content` + `.embed-mode` + 7 descendant selectors. The
embed `.card` wrapper traversal in `EmbedRenderer.jsx` now walks to
top-level container children instead of `.card` ancestors.

**Phase 4a — Drawers** (`063147b`)
Replaced three custom slide-over panes with DaisyUI's native `drawer`
component. `App.jsx` restructured into three nested drawer wrappers:
outer `drawer lg:drawer-open` for FilterSidebar (inline on desktop,
overlay below lg), middle `drawer drawer-end` for DetailPane, inner
`drawer drawer-end` for SettingsPane. Each drawer's `<input
type="checkbox" className="drawer-toggle">` is React-controlled via
`checked={state.xxxOpen} onChange={dispatch(...)}`. Added
`OPEN_FILTER_SIDEBAR` + `OPEN_SETTINGS_PANE` reducer actions.
FilterSidebar / DetailPane / SettingsPane simplified to content-only
components (no wrapper, no overlay, no slide transform). Deleted 10+
CSS rules including `.filter-sidebar`, `.detail-pane`, `.settings-pane`,
their overlays, mobile bottom-sheet `@media`, `::before` drag handle
pseudos, and the `dashboard-enter` fade-in animation.

**Phase 4d-j — remaining custom classes** (`414e348`)
Deleted the last 9 custom classes: `.dashboard-header` + `::after`
gradient, `.hamburger-dropdown` + fade-in keyframes,
`.hamburger-update-dot` + pulse keyframes, `.scrollbar-hide`,
`.header-filter-hint`, `.root-error-message/detail/hint`.
- HamburgerMenu dropdown: inline Tailwind utilities (`fixed min-w-52
  bg-base-200 border border-base-300 rounded-md shadow-xl z-50 py-1`)
- Update indicator: `w-2 h-2 rounded-full bg-primary animate-pulse`
- Filter hint button: DaisyUI `btn btn-link btn-sm`
- Header divider: `border-b border-base-300`
- Root error fallback: inline Tailwind text utilities
- Mobile scrollbar: accept native scrollbar (aesthetic regression)
- Print @media block: only element selectors (body/a/section) remain

`LEGITIMATE_CUSTOM_CLASSES` allowlist set to empty Set. Zero-custom-
class policy enforced by test.

**Phase 6 — docs + final verify**
CLAUDE.md "Frontend: Styles and Scripts" rewritten as a vanilla-only
policy. DAISYUI_V5_NOTES.md "Project conventions" section rewritten
with the empty-allowlist rule, the new tag-chip pattern, the drawer +
collapse component adoptions, and the rationale for the deleted
components. The "Deliberately NOT used" section now flags only
`dropdown` and `menu` (drawer and collapse moved into "now used").

**Verified after each phase:**
- `vite build` clean
- `npm test` 60/60 pass (one test dropped when two tag-chip tests
  were merged into one during Phase 1)
- Allowlist test passes with empty Set — any new custom class in
  styles.css would fail the test

**Visual regressions (all accepted per vanilla directive):**
- 34 tag colours → 7 semantic variants (tags in same category look identical)
- 20-hex chart palette → 8 semantic cycle (charts >8 series repeat colours)
- Heatmap cells no longer show count text inline (tooltip-only)
- Heatmap text rounded from 8-10px to 12px (`text-xs`)
- Tooltip/dropdown shadows softer (~10% opacity vs ~25-30% custom)
- DropZone drag-over glow replaced with ring-primary (stroke, no halo)
- TabBar active label glow removed
- Modal widths use DaisyUI defaults (no custom w-modal-responsive)
- DropZone min-height uses `min-h-screen` (100vh vs custom 60vh)
- Detail/Settings panes slide from the right on mobile too (no
  bottom-sheet variant — DaisyUI drawer doesn't ship one)
- Mobile drag-handle pills on pane headers removed
- Page-load fade-in animation removed
- Hamburger dropdown fade-in animation removed
- Header gradient accent line replaced with plain border
- Mobile TabBar shows native scrollbar when overflowing
- PWA update indicator uses stock `animate-pulse` (simpler rhythm)

**URL params removed:**
- `?palette=name` (chart preset)
- `?accent=hex` (chart brand override)
- `?muted=hex` (chart muted override)
- `?colors=h1,h2,h3` (chart per-series override)

Embedders still get `?theme=light|dark`, `?bg=`, `?data=`, `?embed=`.

## 2026-04-14

### Zero-arbitrary-values sweep — @theme + @utility token migration

User asked "are there any tailwind utilities / daisyui tokens that can replace hard coded values / custom / inline code? i don't want any custom / inline / hard coded Tailwind / css unless absolutely necessary (only with explicit approval)". Phase 1 shipped the safe drop-ins (Tailwind v4 stock spacing scale, CSS var restoration, ring-inset utility). Phase 2 is this commit — a full sweep of every remaining arbitrary Tailwind bracket value to either `@theme` tokens or `@utility` directives in `dashboard/styles.css`.

**`@theme` tokens added** (Tailwind v4 standard namespaces that auto-generate utilities):

- `--text-8` through `--text-13` (five font-size tokens: 8/9/10/11/13 px) → `text-8`, `text-9`, `text-10`, `text-11`, `text-13` utilities
- `--shadow-tooltip`, `--shadow-dropdown`, `--shadow-dropzone-glow` → `shadow-tooltip`, `shadow-dropdown`, `shadow-dropzone-glow` utilities with full `--tw-inset-shadow`/`--tw-ring-shadow` composition so they stack with other Tailwind shadow variants correctly

**`@utility` directives added** (non-standard namespaces that `@theme` can't express):

- `grid-heatmap-m` / `grid-heatmap-d` — `grid-template-columns: 36px repeat(7, 1fr)` / `50px repeat(7, 1fr)` for the Timing heatmap mobile + desktop variants
- `w-modal-responsive` — `width: min(420px, calc(100vw - 32px))` for QuickGuide
- `max-w-viewport-margin` — `max-width: calc(100vw - 32px)` for InstallInstructionsModal
- `min-h-hero` — `min-height: 60vh` for the dashboard drop zone landing
- `text-shadow-primary-glow` — `text-shadow: 0 0 10px color-mix(primary 50%)` for active tab label (Tailwind v4 has no text-shadow utility out of the box)

**JSX replacements across 10 files:**

| Before | After |
|---|---|
| `text-[8px]`, `text-[9px]`, `text-[10px]`, `text-[11px]`, `text-[13px]` | `text-8`, `text-9`, `text-10`, `text-11`, `text-13` |
| `shadow-[0_2px_8px_rgba(0,0,0,0.3)]` | `shadow-tooltip` |
| `shadow-[0_10px_25px_rgb(0_0_0/0.25)]` | `shadow-dropdown` |
| `shadow-[0_0_20px_color-mix(...)]` | `shadow-dropzone-glow` |
| `[text-shadow:0_0_10px_color-mix(...)]` | `text-shadow-primary-glow` |
| `grid-cols-[36px_repeat(7,1fr)]` | `grid-heatmap-m` |
| `sm:grid-cols-[50px_repeat(7,1fr)]` | `sm:grid-heatmap-d` |
| `w-[min(420px,calc(100vw-32px))]` | `w-modal-responsive` |
| `max-w-[calc(100vw-32px)]` | `max-w-viewport-margin` |
| `min-h-[60vh]` | `min-h-hero` |

Files touched: `Timing.jsx` (heatmap cells + grid + labels, 5 replacements), `Projects.jsx`, `HamburgerMenu.jsx`, `HeatmapTooltip.jsx`, `TabBar.jsx`, `SettingsPane.jsx` (shared constants + work-hour labels + hint, 5 replacements), `EmbedRenderer.jsx`, `DropZone.jsx`, `FilterSidebar.jsx`, `QuickGuide.jsx`, `InstallInstructionsModal.jsx`.

**Test update:** `Phase 7 — TabBar uses DaisyUI tabs + tab class composition with ARIA` assertion updated to match `/text-shadow-primary-glow/` instead of the removed `/\[text-shadow:0_0_10px_color-mix/` regex.

**CLAUDE.md** — added a new rule under "Frontend: Styles and Scripts" listing the 6-tier precedence for replacing arbitrary values: stock Tailwind → DaisyUI semantic token → CSS var inside arbitrary → `@theme` token → `@utility` directive → arbitrary bracket (last resort, document rationale).

**DAISYUI_V5_NOTES.md** — added "Zero arbitrary Tailwind values" note under project conventions enumerating every `@theme` token and `@utility` directive currently defined, with the rationale for each.

**Verified:**
- `vite build` clean (2.92s, CSS 149.91 KB → 149.91 KB, negligible delta)
- `npm test` — 61/61 pass
- All new utilities confirmed in built CSS: `.text-8`, `.text-9`, `.text-10`, `.text-11`, `.text-13`, `.shadow-tooltip`, `.shadow-dropdown`, `.shadow-dropzone-glow`, `.grid-heatmap-m`, `.sm\:grid-heatmap-d`, `.w-modal-responsive`, `.max-w-viewport-margin`, `.min-h-hero`, `.text-shadow-primary-glow`
- Grep of `dashboard/js` for `text-\[[0-9]|shadow-\[[0-9_]|\[text-shadow|grid-cols-\[[0-9]|min-h-\[[0-9]|max-h-\[[0-9]|w-\[[0-9]|min-w-\[[0-9]|max-w-\[calc|w-\[min\(` returns zero actual code hits (the one match is in a CollapsibleSection.jsx comment explaining why `max-h-[9999px]` would clip)
- 24-class allowlist test still passes — `@theme` and `@utility` don't write `.classname {` primary rules in styles.css, so the regex scanner doesn't detect them as new custom classes

**Remaining legitimate arbitraries / inline styles** (documented, not regressions):

- Dynamic `style={{ width: \`${pct}%\` }}` progress bars and `style={{ height: chartHeight }}` chart containers — computed from data at runtime
- DebugPill.jsx inline styles — isolated React root that must survive CSS load failure (documented)
- main.jsx error boundary inline layout — must render without CSS (documented)
- Tags.jsx / Contributors.jsx `style={{ backgroundColor: getTagColor(tag) }}` — brand-fixed per-tag palette (documented as intentional non-theme-tracked)

### Post-migration audit — follow-up commit (deferred/skipped items cleanup)

After the first audit commit shipped, the user asked for a no-shortcuts review of the audit's own output to catch anything deferred or skipped. This follow-up addresses everything the first pass left on the table.

**SettingsPane UTC toggle — proper native architecture.** The first audit fix replaced the hand-rolled `after:` pseudo + hardcoded `after:bg-white` with DaisyUI's `.toggle toggle-primary` class, but kept the parent `<div role="switch">` + `onClick` + `onKeyDown` + `readOnly` + `aria-hidden` presentational pattern. Two issues: (1) `readOnly` is a no-op on HTML checkboxes per spec — React only accepts it to silence the controlled-without-onChange warning, but the attribute has no runtime effect, so direct clicks on the checkbox would fire a native toggle that React reconciled back on the next render; (2) `role="switch"` on the div duplicated semantics the native input already provides. The follow-up refactored to a native `<label>` wrapping `<input type="checkbox" className="toggle toggle-primary" onChange={...}>`. HTML's native label-for association makes the entire row clickable via bubbling, `onChange` receives the new value via `e.target.checked` (no stale-closure reliance), and the input natively handles focus / Space / Enter / screen reader semantics. Zero ARIA duplication.

**TOGGLE_BASE_CLASSES no-op hover.** Renamed to `TOGGLE_ROW_CLASSES` and replaced `hover:bg-base-300` with `hover:bg-base-content/5`. The old CSS `.settings-toggle { background: var(--bg-tertiary) /* #333 */ }` + `.settings-toggle:hover { background: var(--bg-hover) /* #222 */ }` used two different colours; the migration mapped both to `bg-base-300` by accident, making the hover a silent visual no-op. The `base-content/5` overlay replacement is theme-aware: on dark themes base-content is near-white so the hover reads as a slight lift; on light themes base-content is near-black so it reads as a slight press. Affects both the UTC row and the ViewLevel radio rows that share the constant.

**FilterSidebar MultiSelect highlighted+selected state.** The first audit fix only addressed the mouse-hover branch of the 2×2 `isSelected × isHighlighted` state grid, leaving keyboard-highlighted selected rows still flattened to `bg-base-300` (losing the primary tint). The follow-up enumerates all four combinations explicitly:

```js
const bgClass = isHighlighted && isSelected
    ? 'bg-primary/30'              // strongest tint, preserves "selected" during nav
    : isHighlighted
    ? 'bg-base-300'                // neutral lift matching mouse hover
    : isSelected
    ? 'bg-primary/10 hover:bg-primary/20'  // mouse hover deepens selection
    : 'hover:bg-base-300';         // default discoverable hover
```

**Dead code removed.** `FOCUS_RING_CLASSES` export in `dashboard/js/utils.js` had zero consumers (`grep -r 'import.*FOCUS_RING_CLASSES' dashboard/js` → no hits). It was declared during round-3 as a shared helper but every JSX consumer ended up inlining the raw string instead. Deleted the export + its ~20-line rationale block per CLAUDE.md's dead-code rule.

**Stale docs.**

- `dashboard/styles.css` lines 645-651 — comment block in the "removed classes" section still described the UTC switch as `pure Tailwind with after: pseudo variant`, which was wrong after the first audit fix. Rewritten to reference DaisyUI's `.toggle` component and the `TOGGLE_ROW_CLASSES` constant.
- `docs/DAISYUI_V5_NOTES.md` — added a new "Toggles (switches)" bullet under project conventions. Documents the `<label>` + `<input type="checkbox" class="toggle toggle-primary">` pattern with explicit warnings against the two wrong approaches (hand-rolled `after:` + `readOnly` presentational checkbox).
- `docs/AI_MISTAKES.md` — added a 2026-04-14 entry titled "Migrating state-dependent classes without tracing cascade priority between variants". Covers all five regressions the audit caught (SettingsPane toggle hardcoded colour, FilterSidebar selected-hover inversion, FilterSidebar highlighted+selected flattening, SettingsPane no-op hover, DropZone outline-none removing the global-rule focus ring) and documents five prevention rules: (1) write down the 2^N state truth table before migrating, (2) check source order when `:hover` + state class set the same property, (3) grep for attribute-selector rules when removing classes, (4) diff pre/post migration in both mouse AND keyboard interaction modes, (5) prefer native DaisyUI form controls over hand-rolled ones.

**Outstanding (intentionally deferred):**

- **Playwright visual regression baselines will drift.** The toggle pixel layout changed (from hand-rolled divs to DaisyUI pill), the hover backgrounds shifted, the FilterSidebar highlighted-selected state now uses `primary/30`, and the DropZone focus state has a visible outline ring. Baselines in `dashboard/e2e/visual/theme-baselines.spec.js` should be re-captured with `--update-snapshots` after a live visual check.
- **SettingsPane ViewLevel radiogroup a11y** — still `<div role="radio">` + `tabIndex={0}` on every item with only Enter/Space handling. A compliant WAI-ARIA radiogroup would have one `tabIndex=0` at a time (the focused one) and arrow-key navigation moving between items. Converting to native `<input type="radio">` + `<label>` is a larger refactor outside the audit scope; flagged in SESSION_NOTES.

**Verified:**

- `./node_modules/.bin/vite build` clean (2.75s)
- `npm test` — 61/61 pass
- `hover:bg-base-content/5`, `bg-primary/30`, `toggle`, `toggle-primary` all verified present in built CSS
- No `FOCUS_RING_CLASSES` or `TOGGLE_BASE_CLASSES` references remain in `dashboard/js`
- No `focus-visible:outline focus-visible:outline-2` pairings remain (confirmed by follow-up grep)

## 2026-04-13

### Post-migration audit fixes (8 issues across 12 files)

Fresh-eyes audit of the `claude/migrate-daisyui-dark-mode-toG0Y` branch caught 2 CLAUDE.md violations, 2 user-visible UX regressions, 1 a11y regression, and 3 hygiene items introduced during the round-3 custom-CSS sweep. All fixed without architectural changes.

**Fix 1+2 — SettingsPane toggle (SettingsPane.jsx):** The UTC toggle was hand-rolled as `<div className="relative w-11 h-6 ... after:content-[''] after:bg-white ...">`, reimplementing DaisyUI's native `.toggle` component AND violating the "never hardcode theme values" CLAUDE.md rule via `after:bg-white` (which left the thumb pure white on every light theme). Replaced with `<input type="checkbox" className="toggle toggle-primary shrink-0" checked={state.useUTC} readOnly tabIndex={-1} aria-hidden="true" />`. The parent row still owns `role="switch"` + keyboard handling; the input is purely presentational. `readOnly` silences React's controlled-without-onChange warning.

**Fix 3 — FilterSidebar selected-row hover inversion (FilterSidebar.jsx:159):** My Tailwind migration of the MultiSelect option cascade wrote `'bg-primary/10 hover:bg-base-300'` for the selected branch — meaning hovering a selected row *replaced* the selection tint with the default hover tint, visually deselecting it. The old CSS kept the `.selected` background through `:hover` via cascade order. Fixed to `'bg-primary/10 hover:bg-primary/20'` so hovering a selected row *deepens* the tint.

**Fix 4 — DetailPane hardcoded hover color (DetailPane.jsx:79):** Commit row used `hover:bg-white/5` which is invisible on the 4 light themes (lofi, nord, emerald, caramellatte) AND violates "never hardcode theme values". Replaced with `hover:bg-base-content/5` — 5% of the inverted text color, so it shows as a subtle dark tint on light themes and a subtle light tint on dark themes.

**Fix 5 — DropZone focus outline a11y regression (DropZone.jsx):** The migration added `focus-visible:outline-none` that wasn't in the old CSS, leaving keyboard users with only a subtle border/bg tint on focus. Replaced with explicit `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2` — matches TabBar's focus pattern for consistency.

**Fix 6+7 — FilterSidebar stale references (FilterSidebar.jsx):** The MultiSelect rationale comment still described the deleted `.filter-multi-select-*` custom classes and their theme-tracking via `var(--color-base-*)` — rewrote to describe the current inline-Tailwind approach. The `mb-0` override on the FilterGroup `<label>` was a no-op carried over from the deleted `.filter-sidebar-inner label` descendant selector — removed.

**Fix 8 — Redundant `focus-visible:outline` + `outline-2` (9 files):** In Tailwind v4, `.outline-2` already sets `outline-style:var(--tw-outline-style);outline-width:2px` and `--tw-outline-style` defaults to `solid`, so the bare `focus-visible:outline` alongside `focus-visible:outline-2` is redundant (and sets outline-width:1px which cascade overrides with 2px). Removed the bare class from: `utils.js FOCUS_RING_CLASSES`, `TabBar.jsx`, `CollapsibleSection.jsx`, `FilterSidebar.jsx` (MultiSelect trigger), `DropZone.jsx`, `Progress.jsx` (×2), `Health.jsx` (×3), `Timeline.jsx`, `HealthAnomalies.jsx` (×2), `HealthBars.jsx` (×2). Visually identical — verified by rebuilding and confirming `.focus-visible\:outline-2:focus-visible{outline-style:var(--tw-outline-style);outline-width:2px}` still ships.

**Verified:**
- `./node_modules/.bin/vite build` clean (3.37s)
- `npm test` — 61/61 pass
- DaisyUI `.toggle` + `.toggle-primary` both ship in built CSS (`.toggle-primary:checked,.toggle-primary[aria-checked=true]{--input-color:var(--color-primary)}`)
- `hover:bg-base-content/5`, `hover:bg-primary/20`, `focus-visible:outline-2` all present in built CSS
- No `focus-visible:outline focus-visible:outline-2` pairings remain in dashboard/js

### Custom-CSS cleanup — round 3 (full sweep to the strict minimum)

User flagged that round 2 was still too conservative after asking "why does it look like there are still a shit ton of unnecessary custom stuff?". Honest audit showed ~80 of the ~96 custom classes were just named aliases for Tailwind utility groupings with no Tailwind-incompatible features — I'd been drawing the "needs custom" line at "has any CSS feature worth naming" instead of "has a Tailwind-incompatible feature". Round 3 is the full sweep to the strict minimum.

**Scope:** 72 custom classes deleted, 24 remain (all with documented Tailwind-incompatible features). ~100 JSX className edits across 15 files. `dashboard/styles.css` 1531 → 1008 lines (−34%).

**Group A — Trivial one-liners:** `.hamburger-menu`, `.hamburger-list`, `.hamburger-divider`, `.hamburger-version`, `.dashboard-layout`, `.tabs-bar`, `.tab-content-area`, `.settings-section`. Each was 1-5 CSS declarations that map 1:1 to Tailwind utilities.

**Group B — Dashboard header base:** The `::after` gradient pseudo-element stays (pseudo-elements can't be Tailwind utilities). The base rule (`position: relative; z-index: var(--z-sticky-header)`) migrated to inline `relative z-[21]` in Header.jsx.

**Group C — Collapsible section internals:** `.collapsible-header`, `.collapsible-title`, `.collapsible-subtitle`, `.collapsible-chevron` all migrated. The chevron rotation is now driven by React state via conditional `rotate-180` instead of the previous `[aria-expanded="true"]` descendant selector (React already has the expanded state — no reason to round-trip through an attribute). `.collapsible-content` STAYS — the `max-height: 0 → none` transition has no Tailwind primitive (Tailwind's `max-h-*` utilities don't include `none`, and clamping to `max-h-[9999px]` would clip long sections). `.collapsible-header` kept as zero-style marker class ONLY so `.embed-mode .collapsible-header { display: none }` can still target it in embed iframes.

**Group D — Hamburger menu items:** `.hamburger-item`, `.hamburger-item-icon`, `.hamburger-item-label`, `.hamburger-item-external`, `.hamburger-item-highlight`, `.hamburger-item-destructive`, `.hamburger-backdrop` all migrated. Destructive and highlight state variants are now conditional className builders driven by `item.destructive` / `item.highlight` props. The CSS descendant selectors for icon color (`.hamburger-item-destructive .hamburger-item-icon { color: error }`) are replaced with explicit conditional `text-*` classes on the icon span.

**Group E — Filter multi-select listbox:** `.filter-multi-select`, `.filter-multi-select-trigger`, `.filter-multi-select-dropdown`, `.filter-multi-select-option` (+ `.selected-text` and `.arrow` descendants), `.filter-group` all migrated. Open/closed dropdown state, selected-row highlight, and keyboard-highlighted row now driven by conditional className builders in JSX (React state is the source of truth — no more state-class + descendant selector round trip). Focus-visible ring inlined on the trigger button.

**Group F — Detail pane internals:** `.detail-pane-header`, `.detail-pane-title`, `.detail-pane-subtitle`, `.detail-pane-content`, `.detail-pane-empty`, `.detail-pane-loading`, `.detail-commit`, `.detail-commit-message`, `.detail-commit-meta`, `.detail-commit-tags` all migrated. Mobile padding overrides use `max-md:` Tailwind variants. `.detail-pane` + `.detail-pane-overlay` STAY (transform-based slide-over transitions). `.detail-pane-header` kept as zero-style marker for mobile `::before` drag-handle.

**Group G — Settings pane internals:** `.settings-pane-title`, `.settings-pane-content`, `.settings-section-title`, `.settings-group`, `.settings-toggle` (+ all variants), `.settings-toggle-switch` with `::after` thumb, `.settings-toggle.active` state, `.settings-row`, `.settings-view-level-group`, `.settings-work-hours-hint`, `.settings-hint` all migrated. The toggle switch's `::after` thumb pseudo-element is now expressed via Tailwind's `after:` variant with `after:content-['']` + `after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform`. Active state conditional: `bg-primary after:translate-x-5` vs default `bg-base-300`. Shared Tailwind class strings extracted as JS constants (`SECTION_TITLE_CLASSES`, `TOGGLE_BASE_CLASSES`, `TOGGLE_LABEL_CLASSES`, `TOGGLE_HINT_CLASSES`) inside SettingsPane.jsx.

**Group H — Drop zone:** `.drop-zone`, `.drop-zone-container`, `.drop-zone-heading`, `.drop-zone-icon` all migrated. Drag-over state driven by React `isDragOver` state via conditional className builder (`dropZoneBase` + optional `dropZoneActive`). Icon color flip (`text-base-content/60` → `text-primary` during drag-over) also inline conditional. Focus-visible state via Tailwind `focus-visible:*` variants.

**Group I — Filter sidebar inner:** `.filter-sidebar-inner` base + mobile drawer overrides migrated. Desktop `w-[280px] p-4 bg-base-200 rounded-lg border border-base-300 space-y-4` inline; mobile `max-md:w-full max-md:h-full max-md:rounded-none max-md:border-0 max-md:overflow-y-auto max-md:pt-6` via Tailwind's `max-md:` variants. `.filter-sidebar-inner label { display: block; font-size: 12px; ... }` global descendant selector replaced with explicit `block text-xs text-base-content/60 mb-1` on each `<label>` in JSX — makes the label typography visible at each call site instead of hidden in a cross-cutting CSS rule.

**Group J — Heatmap:** `.heatmap-grid`, `.heatmap-header`, `.heatmap-label`, `.heatmap-cell`, `.heatmap-cell-sm`, `.heatmap-tooltip-inner` all migrated. The grid template columns use Tailwind arbitrary values (`grid-cols-[36px_repeat(7,1fr)]` desktop, `grid-cols-[50px_repeat(7,1fr)]` via `sm:` variant). The tooltip's `.visible` state class replaced with conditional `opacity-0`/`opacity-100`. The 5 intensity-level classes (`.heatmap-0` .. `.heatmap-4`) STAY — they're semantic data-viz tokens referenced dynamically in JSX via `heatmap-${level}` template strings, and the color-mix() gradient expressions are too long to inline at every cell (which would duplicate 168 times in the 24×7 full heatmap).

**Group K — Embed + misc:** `.embed-error` + its `code` / `a` descendants migrated. `.project-lang-badge` migrated with `text-[10px]` arbitrary value.

**Group L — TabBar:** `.tab-btn` and `.tab-btn-active` both migrated. Shared class strings extracted as `TAB_BASE_CLASSES` and `TAB_ACTIVE_CLASSES` JS constants inside TabBar.jsx. Active-state text-shadow glow uses Tailwind's `[text-shadow:...]` arbitrary property syntax because Tailwind v4 doesn't ship a text-shadow utility out of the box.

**Global a11y rule removed:** `[role="button"]:focus-visible, [role="tab"]:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px }` was the last non-class custom CSS rule. Replaced by inlining `focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2` (or the `focus-visible:ring-*` equivalent when the element already has a matching `hover:ring-*` pattern) on every `role="button"` consumer: Summary tiles (×4), Timeline stat tiles + period card (×4), Progress tiles + rows (×5), Health tiles + repo card (×3), HealthAnomalies risk/debt rows, HealthBars urgency/impact wrappers, HealthWorkPatterns tile, CollapsibleSection header, DropZone container. `FOCUS_RING_CLASSES` constant exported from utils.js for consumers that want the long string as a variable instead of inline.

**Final regression guard — styles.css allowlist:**

`scripts/__tests__/daisyui-surfaces.test.mjs` gained a strict `styles.css allowlist` test that enumerates the 24 legitimate custom classes and fails if ANY new primary rule head appears in styles.css that isn't in the list. The allowlist body includes inline guidance: add a class only if it has a Tailwind-incompatible feature documented in a rationale block (pseudo-element, @keyframes, non-Tailwind transition value, transform-based slide-over, CSS-load-failure survival, or unshipped utility). Otherwise migrate to inline Tailwind at the JSX consumer. Test also verifies every allowlisted class still has a rule in styles.css — stale allowlist entries are as bad as unauthorized new rules.

**Final allowlist (24 classes):**

```
Pseudo-element / ::after / ::before:
  dashboard-header, detail-pane-header, settings-pane-header

@keyframes animations:
  dashboard-enter, hamburger-dropdown, hamburger-update-dot

Non-Tailwind CSS transition (max-height: 0 → none):
  collapsible-content

Transform-based slide-over drawer shells:
  filter-sidebar, filter-sidebar-overlay,
  detail-pane, detail-pane-overlay,
  settings-pane, settings-pane-overlay

Not shipped by Tailwind:
  scrollbar-hide (::webkit-scrollbar), header-filter-hint (font: inherit)

Data-viz intensity levels (dynamic JSX reference):
  heatmap-0, heatmap-1, heatmap-2, heatmap-3, heatmap-4

Isolated rendering (survives CSS load failure):
  root-error-message, root-error-detail, root-error-hint

Root state marker (read by descendant selectors):
  embed-mode
```

**Verified:**

- `./node_modules/.bin/vite build` clean after every group (12 intermediate builds).
- `npm test` 61/61 pass (21 existing oklchToHex + 36 DaisyUI surface assertions + 1 new strict allowlist guard + earlier additions).
- `playwright test --list` still enumerates all 62 e2e tests.
- `dashboard/styles.css` 1531 → 1008 lines (−523, −34%).
- No `.stat-card` / `.metric-selector` / `.pin-btn` / `.tag-{name}` / `.skeleton` / `.loading-spinner` / `.detail-commit` / `.hamburger-item` / `.settings-toggle` / `.collapsible-header` / `.tab-btn` / etc. anywhere in JSX or CSS.
- FilterSidebar label `mb-0` override no longer needed — the descendant `.filter-sidebar-inner label` rule that caused it is gone.
- Every `role="button"` consumer in dashboard/js carries its own focus-visible ring inline; the global attribute selector rule is gone.

### Custom-CSS cleanup pass — round 2 (base classes + print variant + filter helpers + caught regressions)

Immediate follow-up to the first custom-CSS cleanup round earlier today. Post-cleanup self-audit flagged a handful of additional Tailwind-replaceable custom classes AND three consumers I missed in the tag cleanup sweep.

**Additional Tailwind-utility migrations:**

1. **`.tag` base class → inline Tailwind utilities.** The earlier round deleted the 40+ `.tag-{name}` per-tag color rules and `.tag-dynamic` variable bridge but kept `.tag` as a base layout class (padding, border-radius, font-size, font-weight). All five declarations are available as Tailwind utilities: `inline-block px-2 py-0.5 rounded-full text-xs font-medium`. Deleted the `.tag` rule; all 5 JSX consumers now carry the full 5-utility class string inline. There is no `.tag` CSS class anywhere — tag chip layout AND colors are both inline.

2. **`.no-print` custom class → Tailwind `print:hidden` variant.** The custom class was a 1-rule `@media print { display: none !important }` block. Tailwind v4 ships a `print:` variant that generates an equivalent rule automatically when `print:hidden` appears in source. Migrated 7 consumers (App.jsx ×4, Toast.jsx, Header.jsx) and deleted the custom rule. Verified `.print\:hidden` ships in the built CSS after the migration.

3. **`.filter-group-header` → `flex items-center mb-1`.** Plus the associated `.filter-group-header label { margin-bottom: 0 }` override — replaced with an explicit `mb-0` class on the label in JSX (needed because the global `.filter-sidebar-inner label { margin-bottom: 4px }` rule would otherwise apply to labels inside the flex wrapper).

4. **`.filter-date-group` → `flex flex-col gap-1.5`.** 1 consumer in FilterSidebar.jsx, 3 declarations all Tailwind-replaceable.

5. **`.filter-empty-option` → `text-base-content/40 cursor-default`.** 1 consumer, 2 declarations all Tailwind-replaceable.

**Regression caught during the audit:**

A sweep for stale `className="tag"` patterns surfaced three consumers I missed in the earlier tag-color cleanup sweep:
- `Health.jsx:199` — hardcoded `<span className="tag tag-security">security</span>` label inside the security event alert
- `Health.jsx:270` — same, in a different security panel
- `Timeline.jsx:507` — `<span className="tag tag-other shrink-0">+{tags.length - 3}</span>` "+N more" badge for tags beyond the first 3 displayed

These used the old `.tag` + `.tag-{name}` CSS class combo, which was deleted in the earlier round. Since the CSS rules no longer exist, these three spans were rendering as UNSTYLED text (no background, no padding, no border-radius). Probably not noticeable on a local dev preview but would have been a visible regression on any deployed build. Fixed by migrating all three to the same `inline-block px-2 py-0.5 rounded-full text-xs font-medium` + `style={getTagStyleObject(...)}` pattern the other tag chip consumers use. Health.jsx also gained a `getTagStyleObject` import (previously didn't need it).

**Strengthened regression guard:**

The source-level `.tag base class stays deleted` test was previously weak — it only verified that the 4 originally-known tag consumer files contained the Tailwind class string at least once, and that `.tag { ... }` wasn't in styles.css. The strengthened version sweeps every `.jsx` file in `dashboard/js/` and fails if any `className` attribute contains:

- `tag` as a bare space-delimited token (catches `className="tag"` / `className="tag shrink-0"` / `className="tag tag-security"`), OR
- Any `tag-{name}` per-tag class from the 34+ legacy names (`tag-feature`, `tag-bugfix`, `tag-docs`, etc.)

Comment-stripped so rationale blocks that mention the removed classes don't false-trigger. Added Health.jsx to the consumer-list assertion so future tag chips in that file are covered too. This is the test that WOULD have caught the three missed consumers if it had existed during the earlier round.

**Documentation sync:**

- `docs/DAISYUI_V5_NOTES.md` "Tag chips" section: updated the JSX usage example from `className="tag"` to the full Tailwind utility string, noted the `.tag` base class was deleted in the follow-up pass.
- `dashboard/js/utils.js` `getTagClass` removal comment: updated to mention the base-class deletion too.
- `dashboard/styles.css` `.tag-{name}` removal rationale block: updated to reflect that the `.tag` base class is also gone.
- `dashboard/js/components/Toast.jsx`: inline comment about `no-print` updated to mention the `print:hidden` migration.

**Build impact:**

- styles.css: 1456 → 1455 lines (-1 from delete/comment swap balance).
- No change to bundled CSS size (the deleted rules were small; the migration shifted to inline utility classes that Tailwind tree-shakes per-file usage).
- `npm test` 57 → 60 (3 new assertions: tag sweep, `.no-print` custom class absence, print:hidden variant presence in built CSS).
- `vite build` clean; `playwright test --list` still enumerates 62 e2e tests.

**Verified invariants after the round:**

- Zero `.tag { }` base class, zero `.tag-{name}` per-tag rules, zero `.tag-dynamic` CSS-variable bridge.
- Zero `className="tag"` or `className="tag-..."` in any JSX file (the sweep test catches both).
- Zero `.no-print` custom class, zero `className="...no-print..."` consumers.
- Zero `.filter-group-header`, `.filter-date-group`, `.filter-empty-option` custom rules.
- All 5 Tailwind chip utilities (`inline-block`, `px-2`, `py-0.5`, `rounded-full`, `text-xs`, `font-medium`) plus `print:hidden`, `flex`, `items-center`, `mb-0`, `mb-1`, `flex-col`, `gap-1.5`, `text-base-content/40`, `cursor-default` all present in the built CSS.

### Custom-CSS cleanup pass — utility-hijack removal, dead rule deletion, tag-color deduplication

Driven by a fresh audit of the codebase against "no custom Tailwind / CSS unless absolutely necessary — only with explicit approval". Six cleanup groups shipped as a single pass after user approval.

**Group 1 — Dead CSS removal** (zero behavior change):

- Deleted `.skeleton` + `.skeleton-commit` + `.skeleton-line[-short|-medium]` + `@keyframes skeleton-loading`. Zero JSX consumers. Also shadowed DaisyUI v5's own `.skeleton` component, so removing our custom rule lets a future consumer use `<div className="skeleton h-4 w-full" />` directly.
- Deleted `.timeline-dot`, `.stat-label`, `.stat-value`, `.detail-pane-content-loaded`, `@keyframes fadeIn`. All had zero consumers.
- Net: ~35 lines removed from styles.css.

**Group 2 — Custom Tailwind utility hijacks removed**:

Three rules in the pre-existing styles.css hijacked Tailwind utilities by targeting `.text-3xl` / `.text-2xl` / `.card .text-3xl` / `.space-y-6` etc. in selector lists. This violated the "no custom CSS hijacking utilities" rule — JSX consumers couldn't tell by reading the code what typography/sizing they'd get without also knowing the CSS.

1. `styles.css` global rule `.font-mono, h1, h2, h3, .stat-value, .text-3xl, .text-2xl { font-family: var(--font-mono); }` → narrowed to `h1, h2, h3 { font-family: var(--font-mono); }`. Semantic-HTML element targeting is legitimate CSS (not utility hijacking). Explicit `font-mono tracking-tight` classes added to the 22 JSX elements across Summary/Timeline/Progress/Health/HealthWorkPatterns/Discover that need mono numeric displays.
2. `styles.css` card descendant rule `.card .text-3xl, .card .text-2xl { font-family: var(--font-mono); letter-spacing: -0.02em; }` → deleted. The mono part duplicated the global rule; the tracking-tight part is now an explicit `tracking-tight` class in JSX.
3. `styles.css` mobile media query cleanup — four rules deleted:
   - `.card { padding: 16px }` was dead (DaisyUI's `.card` has no padding; `.card-body` does — our rule added padding to the wrapper element, which is structurally wrong)
   - `.card .text-3xl { font-size: 1.5rem }` was redundant (the only consumer — Discover's metric card — already used the responsive Tailwind form `text-2xl sm:text-3xl`)
   - `.card .text-lg { font-size: 0.9375rem }` migrated: `CollapsibleSection` h3 title now `text-base sm:text-lg`
   - `.space-y-6 > * + * { margin-top: 16px }` → migrated to `space-y-4 sm:space-y-6` at all 10 consumer call sites (App.jsx ×2, Contributors, Discover, Health, Progress, Projects, Summary, Timeline, Timing)

**Group 3a — safeStorage helper deduplication**:

`dashboard/js/pwa.js` previously defined private `safeStorageGet/Set/Remove` copies alongside `utils.js`'s identical exports. The old "avoid utils chain" comment was premature optimization — utils.js only imports from state.js (a constants-only module with no side-effects). `pwa.js` now imports the three helpers from utils.js. The two `safeSessionGet/Set` wrappers stay local because sessionStorage isn't wrapped in utils.js and they're the only consumers; rationale comment added.

**Group 3b — Tag color duplication collapsed**:

Before: the 34 tag colors were defined TWICE — once as hex strings in `TAG_COLORS` (utils.js, used for Chart.js dataset colors), and once as rgba rules in 40+ `.tag-{name}` CSS classes (styles.css, used for chip display styling). Adding, renaming, or recoloring a tag required editing both files in sync.

After:
- Extended utils.js with `TAG_TEXT_OVERRIDES` — the 8 tags where the chip text uses a lighter brand variant for readability on the 30%-opaque background (`security`, `refactor`, `cleanup`, `config`, `style`, `performance`, `dependency`, `other`). These mismatches were previously encoded only in the CSS.
- Generalized `getTagStyleObject(tag)` in utils.js to return a direct `{ backgroundColor, color, border }` object for all tags. Static tags: `0.3`/`0.5` alphas (higher presence for known categories). Dynamic tags: `0.2`/`0.3` alphas (muted for ad-hoc labels). Text color: `TAG_COLORS[tag]` by default, `TAG_TEXT_OVERRIDES[tag]` when present.
- Removed `getTagClass` export from utils.js.
- Deleted all 40+ `.tag-{name}` CSS rules, the `.tag-dynamic` CSS-variable bridge, and the dead `.tag-breaking` rule from styles.css.
- Updated 5 JSX consumers — `sections/Tags.jsx`, `sections/Timeline.jsx` ×2, `sections/Contributors.jsx`, `components/DetailPane.jsx` — to drop the `getTagClass` import + call and use `className="tag"` with the inline style.

Result: 34 tag colors + 8 text overrides defined in exactly one place (utils.js). The `.tag` base class in styles.css remains — it provides the common layout (padding, border-radius, font-size, font-weight) shared across all tags.

**Group 4 — `TAB_SECTIONS` dead export removed**:

`dashboard/js/state.js` exported a `TAB_SECTIONS` map documenting the tab→section mapping. Zero JSX consumers — the comment even said "Actual routing is in App.jsx — this documents the structure". That documentation exists in the CLAUDE.md "Dashboard Architecture" table already. Deleted the export; updated CLAUDE.md to explicitly note routing is in App.jsx's switch statement and that the doc table is the single source of truth. `state.js` rationale comment added.

**New regression-guard assertions**:

`scripts/__tests__/daisyui-surfaces.test.mjs` gained 6 new tests so the cleanup invariants are protected by the source-level tripwire:

1. Dead classes stay deleted (skeleton, timeline-dot, stat-label, stat-value, detail-pane-content-loaded, @keyframes skeleton-loading) — CSS-comment-stripped so rationale blocks mentioning the removed names don't false-trigger.
2. Tailwind utility hijack rules stay deleted — `.text-3xl`/`.text-2xl`/`.font-mono`/`.stat-value` in `font-family` selectors, `.card .text-3xl`/`.card .text-2xl` descendant selectors, `.space-y-6 > *` descendant selector.
3. Per-tag CSS rule re-introduction — any `.tag-{name} { ... }` block pattern (the `.tag` base class is allowed).
4. `getTagClass` export re-introduction in utils.js.
5. `TAB_SECTIONS` export re-introduction in state.js.
6. Local `safeStorageGet` definition re-introduction in pwa.js + verifies the import from utils.js is present.

Total surface assertions: 30 → 36. `npm test` total: 51 → 57 (21 oklchToHex + 36 surfaces).

**Build impact**:

- `dashboard/styles.css`: 1531 → 1456 lines (-75, -5%).
- `dist/assets/index-*.css`: ~158 KB → ~156 KB (-2 KB, includes DaisyUI's baseline).
- `dist/assets/index-*.js`: unchanged ±100 bytes.
- `vite build` clean after every group.
- `npm test` 57/57 pass.
- `playwright test --list` 62 tests (14 smoke + 48 visual) — config still parses, specs still discoverable.

**Verified invariants after the pass**:

- Zero custom CSS rules shadowing DaisyUI component classes (`.card`, `.btn-*`, `.badge`, `.toast-*`, `.skeleton`, `.loading-spinner` all gone).
- Zero Tailwind utility hijacks (`.text-3xl`/`.text-2xl`/`.space-y-6`/`.card .text-lg` all deleted).
- Zero hardcoded Tailwind color shades in dashboard/js/**/*.jsx.
- Zero dead marker classes in JSX className attributes.
- Zero v4 DaisyUI cruft (`select-bordered` / `input-bordered` / `btn-bordered` etc.) in built CSS.
- Zero per-tag `.tag-{name}` CSS rules — tag colors sourced from TAG_COLORS + TAG_TEXT_OVERRIDES in utils.js.
- Tag chip CSS now: 1 base `.tag` class (shared layout) + inline styles from `getTagStyleObject(tag)`.
- safeStorage helpers defined once (utils.js), imported by AppContext/themes/pwa/QuickGuide/Discover.

### Chart.js runtime theme-tracking + Playwright test infrastructure — deferred follow-ups landed

After two audit passes closed the immediate DaisyUI v5 gaps, the three items that had been documented in `docs/TODO.md` as deferred ("too big for the audit pass") are now shipped. This pass addresses them in one go.

**1. Chart.js single-accent runtime theme-tracking**

Previously, `dashboard/js/chartColors.js` exported static `accentColor` / `mutedColor` values that were frozen at module load from URL params or the hardcoded default `#2D68FF` brand blue. Chart components imported them directly, so non-default themes (`emerald`, `dracula`, `caramellatte` etc.) rendered single-accent charts (hour-of-day heatmap, weekday bars, commit volume bar, contributor complexity bar) in brand blue while the rest of the dashboard followed the user's theme.

The fix:

- `chartColors.js`:
  - New exports `resolveRuntimeAccent()` and `resolveRuntimeMuted()` that return the URL override (sticky for branded embeds) or read `--color-primary` / `--color-base-content` from `getComputedStyle(document.documentElement)` at call time.
  - New booleans `hasUrlAccentOverride` / `hasUrlMutedOverride` exposed from the URL parser so the resolvers can distinguish "embedder set `?accent=` to the default value" from "no URL override".
  - `parseColorOverrides()` now tracks explicit override state alongside the resolved color.
  - The muted resolver uses `color-mix(in oklab, var(--color-base-content) 40%, transparent)` — matches the dashboard's existing `text-base-content/40` tertiary text tint. Chart.js canvas parses color-mix() directly in modern browsers (same capability the existing `themes.js applyTheme()` uses for `ChartJS.defaults.color`).

- `AppContext.jsx`:
  - Reducer state gains `themeAccent` / `themeMuted`, seeded from `chartColors` bootstrap values.
  - New `SET_THEME_COLORS` action type with a no-op guard that skips re-renders when the resolved values haven't changed (e.g. dark/light toggle between two themes with identical `--color-primary`).
  - `darkMode` effect now dispatches `SET_THEME_COLORS` with `resolveRuntimeAccent()` / `resolveRuntimeMuted()` return values AFTER `applyTheme()` has mutated `data-theme`. Two-render sequence: first render uses the previous theme's accent (harmless — DOM hasn't painted yet), second render after the dispatch uses the new theme's accent and charts re-memo with the new values.

- Chart section consumers migrated:
  - `sections/Timing.jsx`: hour-of-day + weekday bar backgroundColor — now `state.themeAccent` / `state.themeMuted`. Removed the direct `accentColor` / `mutedColor` import.
  - `sections/Timeline.jsx`: commit-volume bar + net-lines bar backgroundColor — now `state.themeAccent`. Impact chart's 'internal' segment now `state.themeMuted`. Removed `accentColor` / `mutedColor` from the imports.
  - `sections/Contributors.jsx`: low-complexity segment color — now `state.themeMuted`. Removed `mutedColor` import.
  - All affected `useMemo` deps updated to include `state.themeAccent` / `state.themeMuted` so chart configs rebuild when the theme changes.

- `main.jsx` bootstrap updated: the `--chart-accent-override` CSS variable is now set ONLY when `hasUrlAccentOverride === true`. Previously the bootstrap always set `--chart-accent-rgb` from the resolved accent, which shadowed the theme's `--color-primary` even when no embedder was involved.

Rationale blocks added at every touched site explaining the pattern with pointers to the chartColors.js comment for the URL-override precedence rules. Bootstrap-path `accentColor` / `mutedColor` exports are kept as documented "bootstrap fallbacks" for pre-React code + SSR paths.

**2. Heatmap CSS theme-tracking + embed override redesign**

The old heatmap CSS used `rgba(var(--chart-accent-rgb, 45, 104, 255), X%)` with a comma-separated RGB triple stored in a CSS variable. That pattern only worked because main.jsx parsed `accentColor` at bootstrap and wrote `--chart-accent-rgb: R, G, B`. It could never track theme changes (one-shot bootstrap) and couldn't handle DaisyUI's oklch() color values (wrong format).

Replaced with the nested-var + color-mix approach:

```css
.heatmap-1 { background-color: color-mix(in oklab, var(--chart-accent-override, var(--color-primary)) 15%, transparent); }
.heatmap-4 {
    background-color: var(--chart-accent-override, var(--color-primary));
    color: var(--color-primary-content);
}
```

- Default path: `var(--color-primary)` resolves per-theme via DaisyUI's theme plugin, so the heatmap cells pick up `nord` blue / `emerald` green / `coffee` brown automatically.
- Embed override: when the embedder sets `--chart-accent-override` (via `main.jsx` bootstrap from the URL `?accent=` param), that takes precedence across all themes.
- Text contrast: high-intensity cells (`.heatmap-3`, `.heatmap-4`) now use `var(--color-primary-content)` instead of hardcoded `white`. On light themes where the primary is a pale color, white text was invisible; `--color-primary-content` is DaisyUI's semantic "contrasting foreground for content on primary" token.
- Deleted the old `--chart-accent-rgb` variable + its RGB-parse bootstrap block in `main.jsx`.

**3. Test infrastructure — three layers**

Added three complementary layers of automated regression coverage for the DaisyUI migration.

**Layer 1: Source-level tripwire** — `scripts/__tests__/daisyui-surfaces.test.mjs`

- 30 assertions across every migration phase (1–10) + follow-up fixes (color tokens, loading spinner shadow, progress bars, dead marker classes, Chart.js theme-tracking, heatmap CSS).
- Runs via `node:test` on every `npm test` — no browser, no transpilation, ~230ms total runtime.
- Strategy: read source files, assert that expected DaisyUI class names are present at expected call sites AND that removed custom classes are NOT re-introduced.
- Comment-stripping helper so rationale blocks that intentionally reference removed class names don't false-trigger the regression checks.
- Also verifies the BUILT CSS ships the DaisyUI classes we reference (`dist/assets/index-*.css` greps for `.modal-open`, `.loading-spinner`, `.progress-info`, etc.) — skips gracefully when `dist/` is missing for fresh-clone test runs.
- Includes a sweep-style test that walks every `.jsx` file under `dashboard/js/` and asserts zero hardcoded Tailwind color shades (`bg-red-500`, `bg-green-500`, etc.) remain outside comment blocks.
- Includes a dead-marker-class sweep for `stat-card` / `metric-selector` / `pin-btn` re-introductions.
- Pass rate after this commit: 51/51 total tests (30 new surface assertions + 21 existing oklchToHex tests).

**Layer 2: Runtime smoke** — `dashboard/e2e/daisyui-surfaces.spec.js` (Playwright)

- 14 Playwright tests walking the TESTING_GUIDE "DaisyUI component-class migration" checklist in a real Chromium instance.
- Each test asserts a specific migrated surface renders with the expected DaisyUI classes on real DOM nodes AFTER React has rendered and CSS has resolved.
- Interaction coverage: opens QuickGuide modal via hamburger → asserts `.modal.modal-open` / `.modal-box` / `.modal-backdrop` / `.modal-action` all present → presses Escape → asserts hidden.
- Portal / stacking-context assertion for the HamburgerMenu Phase 9 fix — walks the DOM parent chain via `page.evaluate` to verify the dropdown is NOT a descendant of `.dashboard-header`, and reads `getComputedStyle(nav).position` to assert `"fixed"` (confirming `createPortal` worked).
- Chart.js theme tracking: picks a non-active theme via the burger menu, waits for the chart re-memo, asserts the dataset's resolved `backgroundColor` has changed.
- v4 cruft regression guard: `select-bordered`, `input-bordered` explicitly asserted absent via `toHaveClass(/... /).not.` — catches re-introductions that look visually correct.
- Beforeach helper waits for the `"Loading dashboard…"` splash to go away before running assertions.

**Layer 3: Visual regression** — `dashboard/e2e/visual/theme-baselines.spec.js` (Playwright)

- 48 screenshot baselines = 6 tabs × (4 light + 4 dark) themes. Generated via `npm run test:visual:update`, committed to `dashboard/e2e/visual/__screenshots__/`.
- Applies each theme by writing `darkMode` + `lightTheme` / `darkTheme` to `localStorage` and reloading — goes through the same flash-prevention + AppContext bootstrap path that users hit on fresh load. Sanity-checks `html[data-theme]` before capturing.
- `maxDiffPixelRatio: 0.002` (0.2% pixel difference threshold) tolerates font-rendering variance across Linux headless Chromium versions without letting real regressions slip through.
- Full-page screenshots (`fullPage: true`) so long scrolling sections (Breakdown, Projects) are in the baseline too.
- Purpose: catch silent visual regressions that the source-level and runtime smoke tests can't see — the exact class of bug the `-bordered` v4 cruft fell into (looked correct in the default theme, never exercised in non-default themes).

**Playwright configuration** — `playwright.config.js`

- Two projects: `smoke` (DOM assertions) and `visual` (screenshot baselines). Smoke runs fast for every commit; visual runs explicitly via `npm run test:visual`.
- `webServer` launches `npm run build && npm run preview --strictPort` automatically so tests always run against the production build (matches what ships).
- `launchOptions` block honors `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` env variable so sandboxed / firewalled environments can use a system-installed Chromium as a drop-in replacement for Playwright's managed binary. Documented in `dashboard/e2e/README.md`.
- CI-aware: `forbidOnly` rejects `test.only()` on CI, `retries: 2` on CI vs 0 locally, dot reporter on CI vs HTML locally.

**Package scripts**

- `npm test` — unit + source-level tests (existing, now includes the 30 new surface assertions).
- `npm run test:e2e:install` — installs Chromium + system deps (~170MB, run once per machine/CI runner).
- `npm run test:e2e` — runs the smoke project.
- `npm run test:e2e:ui` — Playwright's interactive UI for debugging.
- `npm run test:visual` — runs the visual regression project.
- `npm run test:visual:update` — regenerates screenshot baselines after intentional visual changes.

**Documentation**

- `dashboard/e2e/README.md`: full rationale, maintenance guide, CI setup recipe, troubleshooting (including "Host not allowed" errors on sandboxed networks), cross-reference to `docs/TESTING_GUIDE.md`.
- `.gitignore`: added entries for Playwright transient output (`test-results/`, `playwright-report/`, `playwright/.cache/`, screenshot diff PNGs) while keeping committed baselines tracked.

**Verified**

- `./node_modules/.bin/vite build` clean.
- `npm test` → 51/51 pass (21 oklchToHex + 30 new DaisyUI surface assertions).
- `playwright test --list` enumerates 14 smoke tests + 48 visual tests across both projects — confirms config parses and specs are discoverable. The tests themselves can't run in the current sandbox (no Chromium binary available, CDN blocked) but are ready for CI and any machine with `npm run test:e2e:install` or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` set.

### Second audit pass — DaisyUI v5 gap sweep (hardcoded colors, loading spinner shadow, progress bars, dead marker classes)

A fresh run of the 10-step DaisyUI v5 compliance audit against the post-first-audit codebase turned up four additional gaps that hadn't been caught. All four are fixed in commit `de2e6ad`.

**1. Hardcoded Tailwind color classes → DaisyUI semantic tokens**

The data-viz categories across Health, Progress, Discover, Timing, HealthBars, and HealthAnomalies were using fixed `bg-green-500` / `bg-red-500` / `bg-amber-500` / `bg-blue-500` / `bg-purple-500` / `bg-gray-500` / `bg-indigo-500` shades that don't track the active theme. This violates the CLAUDE.md rule against hardcoding theme values, and on dark themes (`black`, `dim`, `coffee`) or warm themes (`caramellatte`) the mid-saturation tones can blend with or clash against the page base. Mapped to DaisyUI semantic tokens:

- `bg-green-500` → `bg-success` (planned work, low risk, debt paid, minor semver, left-side comparison, "work hours" legend dot)
- `bg-red-500` / `bg-red-600` → `bg-error` (high risk, debt added, major semver, "outside work hours" legend dot)
- `bg-amber-500` / `bg-amber-600` → `bg-warning` (reactive work, medium risk, right-side comparison, "mixed hours" legend dot)
- `bg-blue-500` → `bg-info` (routine work, user-facing impact, patch semver)
- `bg-gray-400` / `bg-gray-500` → `bg-neutral` (internal impact, neutral debt)
- `bg-purple-500` → `bg-secondary` (infrastructure impact)
- `bg-indigo-500` → `bg-primary` (generic epic progress bar)
- `bg-green-500` (api impact) → `bg-accent` — distinct from `bg-success` (planned work) so that within any given theme, the 4-category impact chart renders with 4 visibly distinct colors instead of repeating

Rationale comment blocks added next to the color arrays in `Health.jsx` and `HealthBars.jsx` explaining why the 4-token impact palette uses `info` / `neutral` / `secondary` / `accent`.

**2. `.loading-spinner` custom class shadow removal**

The custom `.loading-spinner` rule in `dashboard/styles.css` was shadowing DaisyUI v5's own `.loading-spinner` animation variant — exactly the same trap as the `.card` / `.btn` / `.badge` / `.toast` shadow cases caught in the 10-phase sweep. Our custom class provided full styling (display, size, border-radius, border-top-color, animation keyframes) so consumers using `className="loading-spinner loading-spinner-sm"` hit our custom code instead of DaisyUI's `@layer components` definition.

Migrated all four consumers (`App.jsx`, `sections/Timeline.jsx`, `sections/Projects.jsx`, `sections/Discover.jsx`) to the proper DaisyUI pattern:

```jsx
// Before:
<div className="loading-spinner loading-spinner-sm" />
// After:
<span className="loading loading-spinner loading-sm text-primary" aria-label="Loading" />
```

Every migrated consumer is now a `<span>` (inline element) matching DaisyUI's `display: inline-block` + `mask-image` base, with `aria-label="Loading"` for screen readers. The `text-primary` override threads the active theme's primary color through DaisyUI's `currentColor` fill so the spinner matches the theme's accent.

CSS cleanup: deleted `.loading-spinner`, `.loading-spinner-sm/md/lg`, dead `.loading-overlay` (no JSX consumer anywhere), and unused `@keyframes spin`. Simplified the `prefers-reduced-motion` rule — dropped the stale `.loading-spinner` target since the universal selector already catches every animated element.

**3. Single-value progress bars → native `<progress>`**

Two places (`Progress.jsx` epic breakdown bar, `Discover.jsx` file-change bar) rolled their own two-div wrapper+fill progress pattern. Both migrated to the native HTML `<progress>` element with DaisyUI's `progress` class + theme-aware `progress-{variant}` color:

```jsx
// Before:
<div className="w-full bg-base-300 rounded-full h-2">
  <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
</div>

// After:
<progress
  className="progress progress-primary w-full"
  value={pct} max="100"
  aria-label={`${epic} progress: ${pct} percent`}
/>
```

Wins:
- One semantic element per bar (was two divs)
- Free screen-reader announcement "X percent of 100" via the native element
- Fill color tracks theme via `progress-{primary|info}` — theme swap updates every bar in place
- DaisyUI's `.progress` ships at `height: .5rem` which matches our prior custom `h-2` visual

Stacked bars (`HealthBars.jsx` UrgencyBar / ImpactBar, `Discover.jsx` comparison bar) stay custom because they show MULTIPLE simultaneous values — native `<progress>` can't render a multi-segment stacked bar. Their structural pattern is unchanged; only the segment fill colors are migrated to semantic tokens (item 1 above).

Verified via grep that `.progress-primary` and `.progress-info` both ship in the built CSS — this was an audit concern because neither class shipped BEFORE the migration (Tailwind's content-based tree-shaker only emits classes that appear in source).

**4. Dead marker classes (`metric-selector`, `pin-btn`) in Discover.jsx**

Two more orphan marker classes like the `.stat-card` case caught in the first audit: `metric-selector` on a `<select>` and `pin-btn` on a `<button>`, both with zero CSS rules defined anywhere in `dashboard/styles.css`. The actual visual styling was already on the same elements via Tailwind utility classes — the custom class names were doing literally nothing.

Removed the class name from both elements. Added rationale comment blocks at both sites explaining why DaisyUI's `select select-xs` / `btn btn-ghost btn-xs` were rejected:

- The metric picker is an ultra-dense inline control inside a `p-5` card-body, sitting beside a pin toggle in a flex row. DaisyUI's `select` ships a 2rem min-height + chevron icon that would overflow the inline layout.
- The pin toggle is a bare 16px SVG icon. DaisyUI's `btn` applies padding, min-height, and pill border-radius that would shift the card header layout away from its dense design.

Also added missing `type="button"` to the pin toggle while touching it.

**Items deliberately not migrated (documented in SESSION_NOTES / DAISYUI_V5_NOTES):**

- `.hamburger-divider` — unique prefix, no shadow, compact by design; DaisyUI `divider` is a flex+margin component with text-label support that's too heavy for a dense menu
- `HeatmapTooltip` custom portal-based tooltip — DaisyUI `tooltip` is `:hover`-only with no viewport clamping, would require data-tip on hundreds of heatmap cells
- `DebugPill` inline hex colors — renders in an isolated React root that must survive CSS load failure (documented in the component header)

**Verification:**

- `./node_modules/.bin/vite build` clean after the commit
- `node --test scripts/__tests__/oklchToHex.test.mjs` — 21/21 pass
- `grep -oE "\.bg-(success|info|warning|error|primary|secondary|accent|neutral)\b" dist/assets/index-*.css | sort -u` — all 8 semantic tokens present
- `grep -oE "\.loading[a-zA-Z-]*" dist/assets/index-*.css | sort -u` — only DaisyUI v5 loading classes remain (`.loading`, `.loading-spinner`, `.loading-sm/md/lg`)
- `grep -oE "\.progress[a-zA-Z-]*" dist/assets/index-*.css | sort -u` — `.progress`, `.progress-info`, `.progress-primary`
- Grep sweep for hardcoded Tailwind `bg-{color}-{weight}` classes in `dashboard/js/**/*.jsx` returns zero matches

### Post-migration audit — four loose-end fixes (cruft, dead wrapper, double-aria-live, stacking context)

After the 10-phase DaisyUI component-class sweep was pushed, a self-audit of the migration surfaced four items originally flagged as "out of scope" or "deferred". Each was non-trivial enough to warrant its own commit; together they close every actionable item from the audit summary.

**1. DaisyUI v4 `*-bordered` cruft removal (`de9bd4f` + `9e2b154`):**

Phase 8 shipped `select select-bordered select-sm` and `input input-bordered input-sm w-full`. DaisyUI v5 removed the `-bordered` form modifiers because v5 makes the bordered style the default — `*-ghost` is the v5 opt-out for the no-border variant. Tailwind silently drops unknown classes, so the visual result was correct (the base `.select` / `.input` carries the v5 default border) but the JSX referenced four tokens that produced zero CSS rules.

- `dashboard/js/components/SettingsPane.jsx`: both work hour selects → `select select-sm`.
- `dashboard/js/components/FilterSidebar.jsx`: both date inputs → `input input-sm w-full`.
- `dashboard/js/components/Toast.jsx`: top comment said `toast-top` but the code uses `toast-bottom` — aligned.
- `dashboard/styles.css`: stale Phase-7/Phase-10 comment in the focus-visible block — updated to current.
- New `docs/DAISYUI_V5_NOTES.md`: project-local cheat sheet covering the full v4→v5 removed-modifier table (`input-bordered`, `select-bordered`, `textarea-bordered`, `btn-bordered`, `form-control`, `input-group`, `card-bordered`, `card-compact`, `tab-bordered`, `tab-lifted`, `menu-compact`, `menu-normal`, `card-side`, `btn-group`), a grep recipe for verifying which DaisyUI v5 classes ship in the built CSS, our project conventions for cards/buttons/badges/alerts/modals/toasts/tabs/inputs/checkboxes, and the DaisyUI components we deliberately do NOT use (`dropdown`, `menu`, `collapse`, `drawer`) with rejection reasons.
- `docs/AI_MISTAKES.md`: 2026-04-13 entry recording the `*-bordered` trap as a cautionary post-mortem with a pointer to `DAISYUI_V5_NOTES.md`.
- `CLAUDE.md`: documentation table now lists `docs/DAISYUI_V5_NOTES.md` with its update trigger ("when encountering a new DaisyUI v5 quirk, or when adding a new component class to JSX").

**2. `.stat-card` dead-wrapper merge (Summary.jsx):**

The Key Stats grid in `Summary.jsx` had a two-div sandwich for each tile: outer carried `role="button"` + click handler + `tabIndex` + a `stat-card` marker class with no CSS rule defined; inner carried the visual classes (`p-4 bg-base-300 rounded-lg text-center`). The outer was dead weight — the marker class did nothing, and the click target / focus ring was visually wrapping the inner's rounded corners with no real benefit.

- Merged into a single `<div>` per tile carrying both the interaction (`role="button"`, `tabIndex`, `aria-label`, `onClick`, `onKeyDown`) and the visual classes (`p-4 bg-base-300 rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-primary transition-all`).
- Documented the rejection of DaisyUI's `stat` component in the merged comment block: `stat` is a horizontal stat-block with `stat-title` / `stat-value` / `stat-desc` sub-elements; our tiles are a denser 1×4 / 2×2 grid that needs a different visual rhythm.

**3. Toast nested aria-live double-announce fix (Toast.jsx):**

`ToastContainer` had `aria-live="polite" aria-atomic="false"` AND each `ToastItem` had `role={toast.type === 'error' ? 'alert' : 'status'}` plus an explicit `aria-live`. Per WAI-ARIA 1.2 §5.2.2 ("Live Region Roles"), `role="alert"` is an implicit live region with `aria-live="assertive"` and `role="status"` is an implicit live region with `aria-live="polite"`. Wrapping a live region in another live region creates a nested live region and screen readers announce every new child TWICE.

- Removed `aria-live` and `aria-atomic` from `ToastContainer`.
- Removed the redundant explicit `aria-live` from `ToastItem` (the role attribute already implies it).
- Added a documentation block at the top of `ToastItem` explaining the rule so future edits don't re-add either layer.

**4. HamburgerMenu stacking-context fix via React Portal:**

The long-standing `docs/TODO.md` "Stacking Context" entry: `.dashboard-header` has `position: relative; z-index: var(--z-sticky-header)` (z-21) which creates a stacking context. The hamburger menu's backdrop (`z-menu-backdrop` = 40) and dropdown (`z-menu` = 50) were children of `.dashboard-header`, so their effective stacking-context z-index was clamped to z-21 from the document level. Drawer overlays (`z-drawer` = 30) at document-root level rendered ABOVE the menu backdrop. Functionally rare because the menu auto-closes on item selection, but a real regression trap waiting to bite.

- `dashboard/js/components/HamburgerMenu.jsx`: imported `createPortal` from `react-dom`. The trigger button stays inside the header subtree (sticks with the nav bar); only the backdrop + dropdown surface are now rendered via `createPortal(portalContent, document.body)` so they escape the trapped stacking context.
- Position computed from the trigger's `getBoundingClientRect()` in a `useLayoutEffect` (not `useEffect` — measurement must happen before paint so the dropdown's first frame is correctly placed). Applied as inline `top` / `left` style on the `position: fixed` dropdown.
- Listeners on `window` resize and capture-phase scroll keep the position in sync while the menu is open. Capture-phase ensures scrolling any nested scroll container also triggers an update, not just the document root.
- `dashboard/styles.css`: the `.hamburger-dropdown` rule replaces `position: absolute; top: calc(100% + 6px); left: 0` with `position: fixed` (no static offsets) and adds a comment block explaining the inline-style anchor pattern.
- `triggerPos` state guards the first render: the portal renders nothing until `useLayoutEffect` measures the trigger, so users never see the dropdown flash at 0,0 in the one frame between open() and the first measurement.
- Z-index unchanged (`z-menu` = 50) — the dropdown is now genuinely at document-root level so the value is the effective screen z-index.
- Removed the TODO.md "Stacking Context" entry.

**Two follow-up items added to TODO.md "Test infrastructure":**

- Browser-runtime smoke test (Playwright) for the DaisyUI component-class migration. The 2026-04-13 sweep was verified by `vite build` + grep against the built CSS — every phase passed those checks but no real browser was driven to click through the modals/toasts/drawers. Should walk the TESTING_GUIDE "DaisyUI component-class migration" checklist in CI.
- Visual regression suite (Playwright screenshot baselines per tab × per theme — 8 baselines per tab) to catch silent regressions if a future change re-introduces a shadow class or an unrecognized DaisyUI modifier.

These remain pending because they require setting up a test runner that this session can't bring up in the sandbox. The TODO.md entries describe what they should check.

**Build:** All four fix commits passed `./node_modules/.bin/vite build` clean. `node --test scripts/__tests__/oklchToHex.test.mjs` still 21/21 passing.

### DaisyUI component-class migration — 10-phase "unshadow" sweep

**Why:** After the full DaisyUI theming migration (six reference phases + two alignment passes) landed on 2026-04-12, a side-by-side audit against canva-grid/glow-props turned up one serious finding: our custom CSS classes `.card`, `.btn-*`, `.badge`, `.toast-*` were silently overriding DaisyUI's built-in component classes because unlayered CSS wins over `@layer components`. Every consumer that thought it was getting DaisyUI's `card` was actually getting our custom version, and the override only worked as long as our custom class stayed in sync with DaisyUI's layout expectations. This was the same "shadowing" footgun the DaisyUI docs warn about. This pass migrates the consumers to proper DaisyUI component classes and deletes the custom shadow classes so there is only one source of truth per component.

**Ten phases, one commit each, all on `claude/migrate-daisyui-dark-mode-toG0Y`:**

1. **Modal — QuickGuide + InstallInstructionsModal (commit d8ef996).** Migrated both from bespoke `.quick-guide-*` / `.install-modal-*` classes to DaisyUI `<div className="modal modal-open">` + `<div className="modal-box">` + `<div className="modal-backdrop">`. Close button → `btn btn-sm btn-circle btn-ghost absolute right-3 top-3`. Footer buttons → `btn btn-ghost btn-sm` / `btn btn-primary btn-sm`. Warning note in InstallInstructionsModal → `<div role="alert" className="alert alert-warning alert-soft">`. Width preserved via `w-[min(420px,calc(100vw-32px))]`. CSS-class form chosen over native `<dialog>` for React state control. Deleted all `.quick-guide-*` and `.install-modal-*` rules.

2. **Toast (commit 1610c90).** Rewrote `Toast.jsx` to use DaisyUI's `toast toast-bottom toast-center` container + `alert alert-{success|error|warning|info}` alert class per item type. Custom enter/exit keyframes replaced with Tailwind transition utilities (`transition-all duration-200 ease-out` + conditional `opacity-0 translate-y-2`). Dismiss button → `btn btn-ghost btn-xs btn-circle`. Container uses inline `style={{ zIndex: 'var(--z-toast)' }}` because DaisyUI's default z-index doesn't stack above our debug pill. Deleted `.toast-*` rules.

3. **Health security alerts (commit 588e7c2).** The 3 top-level security summary containers in `Health.jsx` migrated from custom `bg-error/10` divs to `<div role="alert" className="alert alert-error flex flex-col items-center text-center">`. The per-commit list-item containers stayed as bespoke `bg-error/10` divs since DaisyUI alert padding/layout doesn't fit a tight list.

4. **Timeline work-pattern badges (commit 0128995).** Holiday/Weekend/After-Hours badges in `Timeline.jsx` migrated from custom `.badge-*` classes to DaisyUI semantic variants: `badge badge-accent badge-sm`, `badge badge-info badge-sm`, `badge badge-warning badge-sm`. Deleted the custom `.badge` / `.badge-*` rules so the DaisyUI component class is the only definition.

5. **Card unshadow (commit 66c888c).** `.card` and `.card:hover` deleted from styles.css. All consumers migrated to `<div className="card bg-base-200 border border-base-300">` + `<div className="card-body p-6 gap-0">`: `CollapsibleSection.jsx` (outer+inner + documented why NOT using DaisyUI `collapse` — stateless, doesn't match React state), `ErrorBoundary.jsx` (`role="alert"` + card+card-body), `App.jsx` (data-load error fallback), `sections/Projects.jsx` (ProjectCard), `sections/Discover.jsx` (metric cards). Deleted `.card-loading`, `.projects-error`, `.error-boundary-card`, `.project-card` rules.

6. **Button unshadow (commit 17fb91a).** `.btn-icon`, `.btn-primary`, `.btn-secondary`, `.btn-theme`, `.show-more-btn`, `.filter-toggle`, `.filter-clear-btn`, `.filter-preset-btn`, `.filter-mode-toggle`, `.project-link*`, `.detail-pane-close`, `.settings-pane-close`, `.filter-badge` all deleted from styles.css. Migrations: `Header.jsx` filter toggle → `btn btn-ghost btn-square relative ${filterSidebarOpen ? 'btn-active' : ''}`; filter badge → `<span className="badge badge-primary badge-xs absolute -top-0.5 -right-0.5">`; settings button → `btn btn-ghost btn-square`. `HamburgerMenu.jsx` trigger → `btn btn-ghost btn-square`. `ShowMoreButton.jsx` → `btn btn-ghost btn-block btn-sm mt-3`. `FilterSidebar.jsx` Include/Exclude toggle → DaisyUI `join` + `join-item btn btn-xs` with `btn-primary` for include-active and `btn-error` for exclude-active (red reinforces "hide"). `FilterSidebar.jsx` Clear All → `btn btn-outline btn-sm w-full mt-3`. `DetailPane.jsx` + `SettingsPane.jsx` close buttons → `btn btn-sm btn-circle btn-ghost`. Print media query updated to `[aria-label^="Show "].btn, .hamburger-menu, .modal { display: none !important; }` since `.show-more-btn` no longer exists.

7. **TabBar tabs/tab class composition (commit 41a3276).** `TabBar.jsx` outer → `<div className="tabs tabs-border flex overflow-x-auto scrollbar-hide" role="tablist" aria-label="Dashboard sections">`. Each tab → `tab tab-btn ${isActive ? 'tab-active tab-btn-active' : ''}` (composition — layering DaisyUI's structural classes under our custom `.tab-btn` typography). Rejected pure DaisyUI `tabs-lift`/`tabs-box` because the default typography (sentence case, body font) doesn't match the "techy mono uppercase" aesthetic. The `role="tablist"` + `role="tab"` + `aria-selected` attributes are on the same elements DaisyUI's tabs expects, so we get both DaisyUI CSS and proper ARIA.

8. **Form inputs (commit e020af6).** SettingsPane work hour selects migrated from `className="filter-select"` → `className="select select-bordered select-sm"`. FilterSidebar date inputs migrated from `className="filter-input filter-date-input"` → `className="input input-bordered input-sm w-full"`. Deleted `.filter-select`, `.filter-select:focus`, `.filter-input`, `.filter-input:focus`, `.filter-date-input` rules from styles.css. `.filter-date-group` flex-column wrapper kept (still used).

9. **HamburgerMenu audit (commit 9db2a10).** Verified the `.hamburger-*` prefix is unique and does not shadow any DaisyUI class. Fixed one hardcoded theme value found by the audit: `.hamburger-item-destructive:hover` was `rgba(239, 68, 68, 0.1)` (violates the CLAUDE.md rule against hardcoded theme values) — now `color-mix(in oklab, var(--color-error) 10%, transparent)`. Documented in the component header why a full migration to DaisyUI `dropdown` + `menu` is rejected: `dropdown` shows/hides via CSS `:focus` or `[open]` attribute (incompatible with React-state-controlled `open` + keepOpen theme picker + async action error capture), and `menu` implies `role="menu"` which the shared BURGER_MENU pattern explicitly avoids because screen readers enter forms mode. The trigger button already uses DaisyUI `btn btn-ghost btn-square` (from phase 6).

10. **FilterSidebar multi-select audit (commit 94d90f3).** The MultiSelect widget implements the WAI-ARIA listbox pattern (`role="listbox"`, `role="option"`, `aria-multiselectable="true"`). DaisyUI's `menu` component implies `role="menu"` — semantically wrong for multi-select filter values. DaisyUI v5 does not provide a first-class listbox component. The custom `.filter-multi-select-*` classes use `var(--color-base-*)` tokens and `color-mix()` cleanly — no hardcoded theme values found, no class collision. Partial migration: the inner `<input type="checkbox">` gains `className="checkbox checkbox-xs checkbox-primary"` for visual consistency with the rest of the filter sidebar. Slimmed the custom `input[type="checkbox"]` rule to just margin + flex-shrink resets; size/color/cursor are now DaisyUI-controlled.

**What was deliberately NOT migrated and why:**

- **HamburgerMenu dropdown surface** — React state control + keepOpen theme picker + disclosure-pattern-not-ARIA-menu design are intentional per `docs/implementations/BURGER_MENU.md`. Full migration would force role="menu" or break state control.
- **FilterSidebar multi-select dropdown surface** — it's a listbox (combobox pattern), not a menu. DaisyUI v5 has no listbox primitive.
- **CollapsibleSection** — uses `<div>` + React state instead of DaisyUI's `collapse` component because our layout needs dynamic expand/collapse triggered by parent props and per-section IDs that a stateless CSS `:target`/`:checked` component can't provide.
- **FilterSidebar drawer, DetailPane, SettingsPane structural shells** — these are custom slide-over panes with focus traps, escape keys, and body scroll locks. DaisyUI v5 ships `drawer` but it's coupled to the `drawer-toggle` checkbox pattern which conflicts with React-state-controlled visibility. The custom `.filter-sidebar` / `.detail-pane` / `.settings-pane` classes don't shadow any DaisyUI class.

**Shadowing risk audit — before vs after:**

- Before: `.card`, `.card:hover`, `.btn-icon`, `.btn-primary`, `.btn-secondary`, `.btn-theme`, `.badge`, `.badge-*`, `.toast-success`, `.toast-error`, `.toast-warning`, `.toast-info` all lived unlayered in `dashboard/styles.css`. All would silently override `@layer components` definitions from DaisyUI.
- After: zero shadowing. Every consumer uses DaisyUI's `card` / `btn` / `badge` / `alert` / `toast` / `modal` / `tabs` / `tab` / `select` / `input` / `checkbox` / `join` / `join-item` directly. The remaining custom classes (`.tab-btn`, `.hamburger-*`, `.filter-multi-select*`, `.detail-pane*`, `.settings-pane*`, `.filter-sidebar*`, `.dashboard-header`, `.tag`, `.tag-*`, `.heatmap-*`) use unique prefixes that DaisyUI does not define.

**Build:** Every phase built clean (`./node_modules/.bin/vite build`). Final bundle: CSS 158.82 KB → 26.96 KB gzipped, JS 557.84 KB → 175.82 KB gzipped, 84 modules transform, PWA precache 41 entries ~887 KiB. Net CSS change across the sweep is small — we deleted ~400 lines of custom component CSS, and the DaisyUI classes we now reference were already bundled (DaisyUI ships them in `@layer components` whether we use them or not). Accessibility: `role="alert"` added to Health security summaries + ErrorBoundary + data-load error + InstallInstructionsModal warning. ARIA `aria-label` and `role` attributes preserved on TabBar, SettingsPane, DetailPane, FilterSidebar MultiSelect, HamburgerMenu.

**Testing performed:** `vite build` after every phase (10 successful builds). No browser runtime test was performed — the Testing Guide's "DaisyUI component classes" section should be exercised manually before considering the migration user-verified.

## 2026-04-12

### glow-props alignment pass — burger menu "keepOpen" for theme picker + mode toggle

**Why:** After comparing our theming against glow-props (the "Approach A" sibling using per-mode-independent storage, same shape as us), the comparison surfaced exactly one actionable UX gap: our burger menu closes after every item click, including theme picker clicks. glow-props deliberately omits the `data-close` attribute on theme controls so the menu stays open — users can rapid-preview multiple themes in a single menu session without reopening. Everything else in glow-props we already do, do better, or have rejected for documented reasons (35-theme catalog, random theme on load, regex-based multi-file rewrite, etc.). This pass closes the one actionable gap.

**Changes:**

1. **`dashboard/js/components/HamburgerMenu.jsx`** — `handleItem()` refactored to accept the full item object instead of just `item.action`, so it can check `item.keepOpen`. Two paths now:
   - `keepOpen: true` → run the action immediately (no `close()`, no 150ms `setTimeout` delay)
   - default → close the menu first, then run the action after 150ms (matches the CSS fade animation)
   - Shared error handling extracted into a `runAction(action)` helper so both paths route errors through `debugAdd('render', 'error', ...)`.
   - Call site updated from `handleItem(item.action)` → `handleItem(item)`.
   - JSDoc updated to document the new `keepOpen` item field alongside the existing ones.

2. **`dashboard/js/components/Header.jsx`** — marked three kinds of menu items as `keepOpen: true`:
   - **Dark/light mode toggle** — so the user can toggle modes and then pick a theme for the new mode in one menu session (the theme list below the toggle swaps to the new mode's themes when the toggle action dispatches).
   - **All theme picker items** (4 per mode) — so the user can click Nord, see the app re-themed, then click Emerald, then click Caramel Latte, without reopening the menu between each.
   - Comments at both call sites document the rationale with a reference to glow-props's equivalent (`data-close` attribute omission on theme controls).

**Why this is safe:**

- Menu items are keyed by `item.label` in `HamburgerMenu`'s render loop, and theme names are stable across re-renders. When `activeThemeId` changes after a picker click, React reconciles the buttons in place — the clicked button's DOM element is preserved, focus stays on it, only `icon` / `highlight` / `ariaLabel` props update.
- The `ariaLabel` change (`"Use Nord theme (Cool blue-gray)"` → `"Use Nord theme (Cool blue-gray), currently active"`) provides natural screen-reader feedback confirming the theme was applied.
- `click-outside`, `Escape`, and the backdrop click handler all still work — the user can dismiss the menu any time; `keepOpen` only suppresses the per-item auto-close.
- The "Save as PDF", "Install App", "Update Now", "Quick Guide", "User Guide" items keep their existing close-then-act behavior — only theme controls got `keepOpen`.

**Things from glow-props deliberately NOT adopted (documented):**

- **35-theme catalog.** glow-props registers every DaisyUI stock theme. Our curated 4+4 is the right tradeoff for a utility app per the reference doc's own advice ("utility apps should pick 2-5 curated combos or 8-10 themes per mode").
- **Random theme on load.** Cute for a portfolio site; wrong for an analytics dashboard where users don't want visual surprise on every visit.
- **Auto-classify themes from `color-scheme` property.** Only helps when registering the full catalog. Our explicit catalog already validates against DaisyUI's classification via the generator's `color-scheme` mismatch check.
- **Regex-based rewrite of 5 HTML/JS files.** Fragile to reformatting. Our marker-delimited approach is structurally safer.
- **Manual `npm run generate:meta-colors`.** glow-props's generator runs only on demand. Ours runs as prebuild for `dev`/`build`/`build:lib`.
- **`head-common.html` partial.** glow-props injects the same `<head>` content into multiple HTML entry points. We have one `dashboard/index.html` — not needed.

**Things glow-props SHOULD adopt from us** (upstream feedback if they look, not in scope for this repo):

- **`COLOR_KEY_OVERRIDES`** — glow-props's `caramellatte` default meta color is `#000000` (pure black) because DaisyUI ships `--color-primary: oklch(0% 0 0)`. Their status bar flashes black on every visit. Our override to `--color-base-300` gives `#ffd6a7` (warm peach).
- **`lofi` meta color** — glow-props's is `#0d0d0d` (near-black) for the same reason. Ours is `#ebebeb` via the override.
- **Extracted `oklchToHex.mjs` + 21 unit tests** — glow-props has zero tests for the color math.
- **L=1 percentage-vs-decimal fix** — glow-props uses the old `if (L > 1) L /= 100` heuristic.
- **Prebuild integration** so drift is impossible between builds.
- **Marker-delimited rewrite** instead of regex replacement.

**Build and tests:**

- `npm test` — 21 passing, 0 failing, 6 suites, ~145 ms.
- `npm run build` — passes, 84 modules. CSS 160.06 KB (unchanged — no CSS change this pass). JS 555.75 → 556.03 KB (+0.28 KB for the refactored handleItem logic + `keepOpen: true` literals).
- Generator idempotent — all 4 downstream files report `unchanged` on re-run.
- Smoke test via `vite preview` + curl verified: `keepOpen` identifier survived minification into the JS bundle; all 8 theme names, descriptions, aria-labels, CSS theme selectors, and flash prevention hex values still present; all 11 critical custom class families still emitted.

**Files changed (2 source + 3 docs):**

- `dashboard/js/components/HamburgerMenu.jsx` — `handleItem()` refactor, `runAction()` helper, call-site update, JSDoc update
- `dashboard/js/components/Header.jsx` — `keepOpen: true` on mode toggle and theme picker items, rationale comments
- `docs/HISTORY.md` — this entry
- `docs/SESSION_NOTES.md` — new pass summary
- `docs/TESTING_GUIDE.md` — new test scenario for rapid-preview behavior
- `docs/USER_GUIDE.md` — updated Theme section to mention rapid-preview

---

### canva-grid alignment pass — oklchToHex module + tests, COLOR_KEY_OVERRIDES, debug flow tracing, Approach A vs B documentation

**Why:** After cross-referencing our theming against canva-grid's implementation (the sibling project using "Approach B" named combos), five patterns from canva-grid were worth adopting without changing our Approach A storage shape. Four were actual gaps in our implementation; one was pure documentation. All five implemented this pass.

**1. Extracted `scripts/oklchToHex.mjs` into its own module with 21 unit tests**

Previously the oklch → hex color math was inlined inside `scripts/generate-theme-meta.mjs` with zero tests. Extraction gives it:

- A standalone module at `scripts/oklchToHex.mjs` that the generator imports.
- A test file at `scripts/__tests__/oklchToHex.test.mjs` using Node's built-in `node:test` runner and `node:assert/strict` — **no Jest dependency**. Adding Jest for one module would be disproportionate; `node:test` has been stable since Node 20 and we're on Node 22.
- 21 tests covering: boundary values (pure black / white / mid gray), achromatic colors invariant across hue, optional hue, alpha channel handling, whitespace tolerance, the L=1 percentage-vs-decimal edge case (see below), DaisyUI fixtures (`nord primary → #5e81ac`, `dracula base-100 → #282a36`, etc.), out-of-gamut clamping, and non-oklch input rejection.

**2. Fixed the L=1 percentage-vs-decimal edge case**

The old inlined version used `if (L > 1) L /= 100` as a heuristic to normalize percentage input. This fails at the L=1 boundary: `oklch(1 0 0)` (decimal, meaning white) and `oklch(1% 0 0)` (percent, meaning near-black) both keep L=1 and would both produce white. DaisyUI always uses percentage form so this never triggered in practice, but the fix is free.

The new module captures the percent sign explicitly via the regex `([\d.]+)(%?)` and only divides by 100 when the `%` character was matched. Three dedicated tests pin the behavior:
- `oklch(1 0 0)` → `#ffffff` (white)
- `oklch(1% 0 0)` → near-black with R channel < 10
- `oklch(0.5 0 0)` === `oklch(50% 0 0)`

**3. Added `COLOR_KEY_OVERRIDES` to the generator**

The reference pattern's default rule is "light themes use `--color-primary`, dark themes use `--color-base-100`". This works for most themes but breaks on monochrome/warm-minimal light themes whose `--color-primary` is near-black or literally `oklch(0% 0 0)` — producing a jarring dark PWA status bar on an otherwise-light app.

Pattern borrowed from canva-grid's generator. We add two entries:
- **`lofi`**: `--color-primary` is `oklch(15.906% 0 0)` ≈ `#1c1c1c`. Override to `--color-base-300` → `#ebebeb` (neutral light gray). Same value canva-grid uses.
- **`caramellatte`**: `--color-primary` is literally `oklch(0% 0 0)` = pure black (DaisyUI design decision). Override to `--color-base-300` → `#ffd6a7` (warm peach — the "caramel" tone from the theme's surface palette). canva-grid doesn't have caramellatte in its catalog so this override is our own addition, following the same pattern.

New hex values after the override:
```
lofi          light  #ebebeb  base-300  (was #ffffff)
nord          light  #5e81ac  primary   (was #ffffff — we used base-100 for everything previously)
emerald       light  #66cc8a  primary   (was #ffffff)
caramellatte  light  #ffd6a7  base-300  (was #fff7ed)
black         dark   #000000  base-100
dim           dark   #2a303c  base-100
coffee        dark   #261b25  base-100
dracula       dark   #282a36  base-100
```

The dark themes are unchanged (still using base-100 per the default rule). Light themes now have theme-appropriate brand colors instead of uniform white, which makes the PWA status bar visually distinguishable between themes on mobile.

**Previous approach vs new approach:** In the previous pass, I chose `--color-base-100` for all themes with the rationale "status bar should blend with main surface". That was a conscious divergence from the reference pattern which I explicitly documented. The canva-grid comparison revealed a better option: follow the reference default (primary for light, base-100 for dark) AND add targeted overrides for themes where the default produces bad results. This gives us the best of both — brand accent colors on status bars for most themes, with graceful fallbacks for the problem cases.

**4. Added theme-change flow tracing via `debugLog`**

canva-grid's `useDarkMode` hook logs every theme transition to its debug log — helpful during development to see the sequence of events when diagnosing "I picked Nord but it shows Lo-Fi" type bugs. Adopted the same pattern:

- `dashboard/js/components/DebugPill.jsx` gains a `theme: '#c4b5fd'` (lavender) entry in `SOURCE_COLORS` so theme events are visually distinct in the debug pill's log tab from render errors (blue) and boot events (purple).
- `dashboard/js/themes.js` imports `debugAdd` from `./debugLog.js` and exposes a `logThemeEvent(event, details)` helper.
- `applyTheme()` calls `logThemeEvent('theme-applied', { dark, requested, validated, skipPersist })` at the end of every invocation. `requested` vs `validated` tells developers whether the validator had to fall back to a default (signaling a stale or cross-mode theme id was dispatched).
- Every theme-apply path gets logged once: mount via AppContext darkMode effect, user-initiated toggle, `setTheme()` picker click, cross-tab storage event, App.jsx embed override.

`debugLog.js` has zero imports and no module-load side effects that depend on `themes.js`, so there's no circular dependency risk. Verified by running `themes.js` through Node with a browser-shaped stub — module loads, exports are present, `applyTheme()` runs through the `debugAdd` call path without throwing.

**5. Documented the Approach A vs B tradeoff in `CLAUDE.md`**

The reference pattern describes two theme persistence shapes — "Approach A" (per-mode independent, 3 keys: `darkMode`/`lightTheme`/`darkTheme`) and "Approach B" (named combos, 2 keys: `darkMode`/`themeCombo`). canva-grid uses Approach B; we use Approach A. Added a new "Theming — Approach A (per-mode independent)" section to `CLAUDE.md`'s Dashboard Architecture that explains:

- Which storage keys we use
- Our curated catalog (4 light + 4 dark = 8 total)
- Why we chose Approach A over B: the dashboard is a utility app with no brand-coupled theme pairings, so constraining users to pre-vetted combos (canva-grid's 2 × 2 = 4 options) is unnecessarily restrictive compared to Approach A's 4 × 4 = 16 independent (mode, theme) combinations. The tradeoff is a slightly more complex picker UX (two clicks: mode then theme) vs canva-grid's single-click combo buttons.
- Links to sibling projects using Approach B as reference.

**Files changed (6 source + 2 generator + 2 test + 1 doc):**

- New: `scripts/oklchToHex.mjs` — standalone oklch → hex module with improved percentage-vs-decimal handling
- New: `scripts/__tests__/oklchToHex.test.mjs` — 21 unit tests covering CSS Color Level 4 edge cases and DaisyUI fixtures
- Modified: `scripts/generate-theme-meta.mjs` — imports oklchToHex instead of inlining, adds `COLOR_KEY_OVERRIDES` map, per-theme `colorKey` field in the collected metadata, richer stdout report showing the CSS variable used for each theme
- Modified: `dashboard/js/themes.js` — imports `debugAdd`, adds `logThemeEvent()` helper, calls it from `applyTheme()`
- Modified: `dashboard/js/components/DebugPill.jsx` — adds `theme: '#c4b5fd'` to `SOURCE_COLORS`
- Modified: `dashboard/js/generated/themeMeta.js`, `dashboard/index.html` — regenerated hex values (lofi `#ffffff→#ebebeb`, caramellatte → `#ffd6a7`, nord → `#5e81ac`, emerald → `#66cc8a`)
- Modified: `package.json` — adds `"test": "node --test scripts/__tests__/*.test.mjs"` script
- Modified: `CLAUDE.md` — new "Theming — Approach A (per-mode independent)" section under Dashboard Architecture

**Build and test:** `npm test` — 21 passing, 0 failing, 6 suites. `npm run build` — passes, 84 modules transform. CSS bundle 157.40 → 160.06 KB (+2.66 KB from added Tailwind class scanning for the new debug source color). Generator idempotence verified — second run reports all four downstream files "unchanged". `themes.js` loads cleanly via Node direct import with browser stub. All 8 `[data-theme="..."]` selectors present in the built CSS. All 8 new hex values present in the inline flash prevention script. All 15 critical custom class families still emitted.

**Deliberately NOT adopted from canva-grid** (documented rationale):

- **Combo-based persistence (Approach B).** Structural change that would lose per-mode-independent theme choice. We explicitly chose Approach A; canva-grid's comparison confirms the tradeoff is a conscious decision, not a gap.
- **Theme picker in page header instead of burger menu.** canva-grid's inline `join` component is more discoverable but our dashboard header already has tab navigation, filter controls, and settings — no room. Burger menu placement is a deliberate UX decision for our layout.
- **Regex-based `index.html` rewrite.** canva-grid uses `html.replace(/var combos = [^;]+;/, ...)` which silently fails if anyone reformats the inline script. Our marker-based `BEGIN/END GENERATED` approach fails loudly on missing markers and survives reformatting.
- **Manual `npm run generate-theme-meta`.** canva-grid's generator runs only on-demand (not in `prebuild`). Ours runs as the first step of every `npm run dev` / `build` / `build:lib` so drift is impossible.

---

### Self-audit pass — dead code removal, persistence correctness, cross-tab null handling

**Why:** After the reference-pattern gap closure landed, a deliberate self-audit surfaced six issues: one real runtime bug (silently masked by tree-shaking), one real persistence bug (stale key on revert-to-default), one cross-tab listener bug (null `newValue` filtered out), two dead-code imports/exports, and one minor code-clarity improvement. The user explicitly asked "anything to double check, strengthen, or improve?" — this pass addresses every finding.

**Bugs fixed:**

1. **`themes.js` `__allThemes` / `__isDark` exports referenced undefined `THEME_NAMES` / `IS_DARK`**. An earlier pass removed those imports from the top of `themes.js` but left the debug-helper exports at the bottom intact. Rollup tree-shook them out of the browser bundle (nothing imports them) so the dashboard worked, but `node --input-type=module -e "import('./dashboard/js/themes.js')"` threw `ReferenceError: THEME_NAMES is not defined` at module load. Detected by running themes.js through Node directly as part of the audit. Fix: deleted the dead debug exports entirely — they were speculative "exposed for ad-hoc console inspection" helpers with zero consumers, which CLAUDE.md's "Don't create helpers... for one-time operations. Don't design for hypothetical future requirements" prohibits.

2. **`persistTheme` left stale `lightTheme` / `darkTheme` keys on revert-to-default**. The old implementation wrote the per-mode theme key only when `themeName !== defaultForMode`. So if the user picked Nord (non-default) then reverted to Lo-Fi (default), `persistTheme(false, 'lofi')` would write `darkMode=false` and SKIP the `lightTheme` write. `lightTheme='nord'` stayed in localStorage. On the next reload, the flash prevention script read `lightTheme=nord` and applied Nord — the user's most recent pick (Lo-Fi) was silently lost. Fix: on revert-to-default, `safeStorageRemove()` the per-mode key instead of skipping the write. Absent-key and default-valued-key behave the same for readers, but remove-vs-skip matters for "user reverted" correctness. Added `safeStorageRemove` to the `themes.js` imports and documented the revert-to-default contract in the function comment.

3. **Cross-tab listener filtered `e.newValue === null` events**. The old handler had `if (e.key === 'lightTheme' && e.newValue)` which treated null as "nothing to do". But fix #2 now removes keys (firing storage events with `newValue=null`) when a user reverts to default, and other tabs need to see that signal and update their reducer state back to the default. Fix: drop the `&& e.newValue` filter and let the reducer's `validLightTheme` / `validDarkTheme` handle null → default (they already did, via the `.has(id)` check failing for null). Also handled the symmetric case for `darkMode` key removal by falling back to matchMedia. Comment rewritten to document the "null = revert to default" contract.

**Dead code removed:**

4. **`getStoredTheme(dark)` in `themes.js`** was defined, exported, and never called anywhere in the codebase (confirmed via grep across `dashboard/`). It was a holdover from the earlier pass where the darkMode effect called `applyTheme(state.darkMode, getStoredTheme(state.darkMode))` — that was replaced with direct reducer-state reads. The function had no consumers so it was deleted, not just unexported. CLAUDE.md: "Delete unused imports, variables, and dead code immediately."

5. **Dead `getStoredTheme` import in `AppContext.jsx`**. Same reason. Removed from the import statement.

**Code clarity:**

6. **`loadInitialState` fallback now reads `matchMedia` directly instead of `document.documentElement.classList.contains('dark')`**. The old code relied on the flash prevention script having already set the `.dark` class from the same matchMedia query — functionally equivalent but indirect. Reading matchMedia directly keeps the function independent of DOM side effects and makes it unit-testable without a full DOM.

**Optimization:**

7. **`darkMode` useEffect dependency array narrowed from `[darkMode, lightTheme, darkTheme]` to `[darkMode, activeTheme]`**. `activeTheme` is now derived outside the effect as `state.darkMode ? state.darkTheme : state.lightTheme`. With the old deps, a cross-tab event that updated the NON-active mode's theme (e.g. user picks Dracula in tab A while tab B is in light mode) triggered an effect re-run in tab B that did a no-op DOM update + `getComputedStyle` + Chart.js defaults write. Harmless but wasteful. With the new deps, tab B only re-runs when the currently-applied mode's theme changes — reducer state still updates via the storage listener, so the value is ready for the next toggle.

**End-to-end smoke test (new):**

Added a Node-based simulation that stubs `localStorage`, `window`, `document`, `getComputedStyle`, then dynamically imports `themes.js` and exercises the catalog shape, validators, and `persistTheme` revert-to-default behavior. This caught bug #2 during the audit before any rebuild. The test is in the commit message for future reference; should be turned into a proper test harness when the project gains a test framework (none configured today).

**Documentation updates:**

- `CLAUDE.md` — architecture list for `js/themes.js` updated to remove mention of `getStoredTheme` (since deleted) and document `persistTheme` + `getMetaColor` explicitly.
- `docs/TESTING_GUIDE.md` — added a simulated-cross-tab test block with copy-pasteable DevTools console snippet (`StorageEvent` dispatch), invalid-payload safety test, and an explicit "revert to default removes key" test. Cross-tab tests no longer assume two-tab access.
- `docs/SESSION_NOTES.md` — new "Known quirks" section documenting mount-time darkMode persistence (limits OS-preference fallback to the first paint), and new "Test coverage gaps" section explicitly calling out that browser runtime testing was NOT executed this session (only `vite preview` + curl + Node-based reducer simulation).

**Files changed (5 source + 3 docs):**

- `dashboard/js/themes.js` — removed `__allThemes` / `__isDark` / `getStoredTheme`; fixed `persistTheme` revert path; imported `safeStorageRemove`; rewrote storage-keys comment
- `dashboard/js/AppContext.jsx` — removed dead `getStoredTheme` import; simplified `loadInitialState` matchMedia fallback; dropped `&& e.newValue` filter in storage listener; derived `activeTheme` outside the darkMode effect and narrowed the dep array
- `CLAUDE.md` — architecture line for `js/themes.js`
- `docs/HISTORY.md` — this entry
- `docs/SESSION_NOTES.md` — Known quirks + Test coverage gaps sections
- `docs/TESTING_GUIDE.md` — simulated cross-tab + revert-to-default tests

**Build:** Passes (`npm run build`). CSS bundle 157.40 KB (unchanged). JS bundle 555.83 KB (+0.08 KB from reducer tweaks). 84 modules transform. Generator prints "unchanged" for all 4 downstream files — idempotent. themes.js now loads cleanly via `node --input-type=module` (no ReferenceError). All 8 theme names, descriptions, and `[data-theme="..."]` selectors still present in the bundle. All 11 critical custom class families still emitted. End-to-end Node simulation: catalog shape OK (4 light + 4 dark), validators correct, `persistTheme` correctly removes stale keys on revert-to-default.

---

### Reference-pattern gap closure — single-source theme config, 4+4 catalog, burger-menu picker, reference-shape cross-tab sync

**Why:** After the reference-pattern alignment pass landed on this branch, a second side-by-side audit against `docs/implementations/THEME_DARK_MODE.md` turned up seven residual gaps (documented in the "differences" list). None were bugs that would manifest today, but all were the kind of structural drift that becomes a bug the moment someone adds a theme or changes a default. The user asked for "no shortcuts, no skipping", so this pass implements every actionable gap and documents why the two remaining (CSP hash, legacy key cleanup) would be speculative abstraction.

**Gaps closed this pass:**

1. **Section C#1 — theme catalog was string arrays, not object arrays with metadata.** The reference pattern uses `[{ id, name, description }, ...]` so the theme picker UI can show labels without a second lookup map. Closed by expanding `LIGHT_THEMES` / `DARK_THEMES` in `themes.js` to object shape and updating validators to use `.map(t => t.id)` for the allowlist sets.

2. **Section C#2 — build script only regenerated the JS module, not the inline flash prevention script.** The reference says "the build script should update every file that contains theme lists or color maps so there is zero manual maintenance." Closed by making `scripts/generate-theme-meta.mjs` rewrite a marker-delimited block inside the inline `<script>` in `dashboard/index.html` — allowlists, defaults, and META map all regenerated on every build.

3. **Section C#3 — build script didn't regenerate `styles.css` `@plugin` config or `themes.js` catalog arrays.** Same root cause as C#2. Closed by adding BEGIN/END GENERATED markers in both files and teaching the generator to rewrite the blocks. Four downstream files now stay in sync from a single source (`scripts/theme-config.js`).

4. **Section C#5 — cross-tab handler filtered theme events by current mode instead of dispatching unconditionally.** The reference handler updates per-mode React state (`setLightThemeState` / `setDarkThemeState`) regardless of which mode the user is currently viewing; we filtered by current mode and used `getStoredTheme()` as the source of truth. Functionally equivalent but diverged from the reference handler shape. Closed by adding `lightTheme` / `darkTheme` to the reducer state, creating `SET_LIGHT_THEME` / `SET_DARK_THEME` action types, and having the cross-tab listener dispatch unconditionally.

5. **Section C#7 — no theme picker UI in burger menu.** The reference explicitly puts the theme picker inside the burger menu. Closed by adding picker items to `Header.jsx` `menuItems` memo (one per theme in the current mode), threading a new `setTheme(themeName)` helper through `useAppDispatch()`, and adding an explicit `ariaLabel` with theme description + active-state announcement.

6. **Catalog expanded from 1+1 to 4+4 curated themes** — prerequisite for C#7 being useful. 4 per mode sits comfortably inside the reference's "2-5 curated combos (or 8-10 themes per mode)" recommendation for utility apps. Selection: lofi/nord/emerald/caramellatte for light, black/dim/coffee/dracula for dark — all DaisyUI stock themes, no custom theme definitions.

7. **Generator fail-fast validation** — new in this pass. `scripts/generate-theme-meta.mjs` now validates the config at load time and exits with a clear error if:
   - `THEMES.light` or `THEMES.dark` are missing / empty
   - `DEFAULT_LIGHT_THEME` isn't in `THEMES.light` ids
   - `DEFAULT_DARK_THEME` isn't in `THEMES.dark` ids
   - A theme's `color-scheme` property doesn't match which array it's listed under (catches "added a dark theme to the light array" typos)
   - A theme ID isn't a real DaisyUI theme (catches "mistyped theme name" typos)

**Deliberately NOT addressed (speculative abstraction per CLAUDE.md prohibitions):**

- **Section C#4 — CSP hash for inline flash prevention script.** The reference notes that a strict CSP without `unsafe-inline` would block the inline script, and says to precompute a SHA-256 hash and add it to the `script-src` directive. We don't currently ship any `Content-Security-Policy` header in `vercel.json`, so computing a hash that nothing verifies would be dead code defending against a constraint that doesn't exist. If CSP is added later, the hash can be computed at that point from the already-markered script block.
- **Section C#6 — legacy localStorage key cleanup.** The reference suggests a one-time migration that clears old theme keys like `theme`, `colorMode`, `dark-mode`. Our pre-DaisyUI system used the same `darkMode` key, so there's nothing to clean up — adding a defensive `safeStorageRemove('theme')` on every page load would be a no-op with a small runtime cost.

**New files:**
- `scripts/theme-config.js` — single source of truth for DaisyUI theme registration. Exports `THEMES = { light: [...], dark: [...] }` with `{ id, name, description }` entries plus `DEFAULT_LIGHT_THEME` / `DEFAULT_DARK_THEME`. Extensive header comment explains the propagation chain and selection rationale.

**Rewritten files:**
- `scripts/generate-theme-meta.mjs` — now reads `theme-config.js`, runs fail-fast validation, converts oklch → hex for each theme (same inlined ~30-line math), writes `generated/themeMeta.js`, and rewrites marker-delimited blocks in `themes.js`, `styles.css`, and `index.html`. Every file write is idempotent (content-equality check) so unchanged files aren't touched — `npm run dev` doesn't trigger a Vite HMR reload on every prebuild. Human-friendly stdout reports per-theme hex values and an "updated" / "unchanged" status per file.

**Modified files:**
- `dashboard/js/themes.js` — top comment rewritten for the new generator-based architecture; `LIGHT_THEMES` / `DARK_THEMES` definitions moved inside `/* BEGIN GENERATED: theme-catalog */` markers; validators updated to use `.map(t => t.id)` for the allowlist sets; dropped `THEME_NAMES` import from generated module (no longer needed — validators derive sets from the catalog arrays). Comment explicitly warns "DO NOT edit the block between markers by hand — edit scripts/theme-config.js instead".
- `dashboard/styles.css` — `@plugin "daisyui"` block wrapped in `/* BEGIN GENERATED: daisyui-plugin */` / `/* END GENERATED: daisyui-plugin */` markers; header comment explains the generator propagation.
- `dashboard/index.html` — inline flash prevention script's allowlists + defaults + META map wrapped in `/* BEGIN GENERATED: flash-prevention-meta */` / `/* END GENERATED: flash-prevention-meta */` markers; surrounding helpers (`validTheme` function, IIFE, DOM mutations) stay hand-maintained.
- `dashboard/js/AppContext.jsx`:
  - `loadInitialState()` reads `lightTheme` / `darkTheme` from localStorage with validator fallback, mirroring the inline flash prevention script's logic.
  - Reducer state gains `lightTheme` + `darkTheme` fields.
  - New reducer cases `SET_LIGHT_THEME` / `SET_DARK_THEME` with validation + no-op early-return guards.
  - `SET_DARK_MODE` case also gains the no-op early-return guard.
  - `darkMode` effect now depends on `[state.darkMode, state.lightTheme, state.darkTheme]` and calls `applyTheme(state.darkMode, state.darkMode ? state.darkTheme : state.lightTheme)`.
  - Cross-tab storage listener dispatches unconditionally for `lightTheme` / `darkTheme` keys — matches reference handler shape.
  - New `setTheme(themeName)` callback memoized via `useCallback`, exported through `DispatchContext` so `Header.jsx` can call it without knowing action type names.
- `dashboard/js/components/Header.jsx`:
  - Imports `LIGHT_THEMES` / `DARK_THEMES` from `themes.js`.
  - Pulls `setTheme` from `useAppDispatch()`.
  - New `icons.palette` (theme item) and `icons.check` (active theme) SVG icons.
  - `menuItems` memo now filters the catalog to the current mode, maps each theme to a menu item with `setTheme(id)` action, `highlight` on the active theme, and a per-item `ariaLabel` announcing the theme name, description, and active state. First picker item gets a separator to visually group the picker under the mode toggle.

**Build:** Passes. CSS bundle **150.64 KB → 157.40 KB** (+6.76 KB) from 6 new DaisyUI theme blocks (each ~1 KB of CSS vars — expected and unavoidable). 84 modules transform. Generator reports all 8 themes with correct hex values. Second run of the generator reports "unchanged" for all four files, confirming idempotence.

**Smoke test** via `vite preview` + curl:
- Inline HTML flash prevention script contains `'lofi', 'nord', 'emerald', 'caramellatte'`, `'black', 'dim', 'coffee', 'dracula'`, and all 8 hex values ✓
- Built CSS contains `[data-theme="lofi"]` through `[data-theme="dracula"]` — all 8 selectors ✓
- Built JS contains all 8 theme names ("Lo-Fi" through "Dracula") and all 8 descriptions ("Minimal monochrome" through "Dev classic") ✓
- All 9 critical custom class families survived (`.heatmap-0`, `.filter-multi-select`, `.settings-pane`, `.detail-pane`, `.error-boundary-card`, `.dashboard-header`, `.card`, `.btn-primary`, `.toast-success`) ✓
- Generator error paths tested: invalid `DEFAULT_LIGHT_THEME` correctly rejected with exit code 1 ✓

**Files changed (7 source + 5 docs):**
- New: `scripts/theme-config.js`
- Rewritten: `scripts/generate-theme-meta.mjs`
- Modified: `dashboard/js/themes.js`, `dashboard/js/AppContext.jsx`, `dashboard/js/components/Header.jsx`, `dashboard/styles.css`, `dashboard/index.html`, `dashboard/js/generated/themeMeta.js` (regenerated), `package.json` (no change this pass)
- Docs: `CLAUDE.md`, `docs/SESSION_NOTES.md`, `docs/HISTORY.md`, `docs/TODO.md`, `docs/TESTING_GUIDE.md`, `docs/USER_GUIDE.md`

---

### DaisyUI reference-pattern alignment — theme catalog module, applyTheme() helper, oklch→hex build script, inline allowlist

**Why:** After the full DaisyUI migration landed on this branch, a deliberate side-by-side comparison with `docs/implementations/THEME_DARK_MODE.md` surfaced seven divergences from the reference pattern — all of them structural, none of them bugs that would immediately manifest, but all the kind of thing that decays into bugs the moment someone adds a theme or changes a default. The user explicitly asked for "no shortcuts, no skipping", so this pass closes the gap on every actionable divergence.

**Divergences identified:**

1. **No theme catalog module.** Theme names (`LIGHT_THEME`, `DARK_THEME`) and meta colors (`LIGHT_META_COLOR`, `DARK_META_COLOR`) were hardcoded constants at the top of `AppContext.jsx`. The reference wants a dedicated module with validators.
2. **No `applyTheme()` helper.** The same dual-layer DOM mutation (`.dark` class + `data-theme` attribute + `<meta name="theme-color">` content + Chart.js defaults) was inlined in three places: `AppContext.jsx` darkMode `useEffect`, `App.jsx` embed override, and the inline flash prevention script in `index.html`. Any drift between them = visual bugs.
3. **PWA meta theme-color hex values hardcoded manually.** The reference wants a `scripts/generate-theme-meta.mjs` that reads DaisyUI's `theme/*/object.js` and converts oklch to hex at build time so the values can never drift from the upstream palette.
4. **No theme ID allowlist in flash prevention script.** A removed theme ID in localStorage would produce an unstyled first paint. The reference wants a hardcoded allowlist with silent fallback to defaults.
5. **Cross-tab `storage` listener only handles `darkMode`.** No forward-compat for `lightTheme` / `darkTheme` keys that a future theme picker would write.
6. **No explicit `aria-label` on the theme toggle menu item.** The item's visible label ("Light mode" / "Dark mode") describes a destination, not an action. The reference Phase 5 accessibility checklist requires an aria-label that spells out the transition.
7. **No `getStoredTheme()` / `persistTheme()` / `validLightTheme()` / `validDarkTheme()` helpers.** The reference exposes these as part of the catalog module so consumers don't have to know about the storage keys directly.

**Fixes (summary):**

1. `scripts/generate-theme-meta.mjs` (new) — imports each registered DaisyUI theme's `object.js` via dynamic `import()`, runs an inlined ~30-line oklch→hex converter (oklch → oklab → linear sRGB via LMS → gamma-corrected sRGB → hex, no color library dependency), and writes `dashboard/js/generated/themeMeta.js` with three exports: `META_COLORS` (theme name → hex map), `IS_DARK` (theme name → boolean), `THEME_NAMES` (ordered list). Validated against known DaisyUI values — lofi base-100 oklch(100% 0 0) → #ffffff, black base-100 oklch(0% 0 0) → #000000.

2. `dashboard/js/themes.js` (new) — theme catalog module. Exports:
   - `LIGHT_THEMES = ['lofi']`, `DARK_THEMES = ['black']`
   - `DEFAULT_LIGHT_THEME`, `DEFAULT_DARK_THEME`
   - `validLightTheme(id)`, `validDarkTheme(id)` — allowlist validators with default fallback
   - `getStoredTheme(dark)` — reads `lightTheme` / `darkTheme` keys with fallback to defaults
   - `persistTheme(dark, themeName)` — writes `darkMode` always, per-mode theme key only when non-default (avoids cluttering localStorage)
   - `getMetaColor(themeName)` — lookup in `META_COLORS`
   - `applyTheme(dark, themeName, skipPersist)` — **the single source of truth** for `.dark` class + `data-theme` attribute + meta theme-color content + Chart.js defaults. Every theme-affecting caller now routes through this one function.
   - Imports `META_COLORS` / `IS_DARK` / `THEME_NAMES` from `./generated/themeMeta.js` and `Chart as ChartJS` from `chart.js` directly (ES modules cache the Chart singleton shared with `main.jsx` and `AppContext.jsx`).

3. `dashboard/js/generated/themeMeta.js` (new, auto-generated, committed) — DO NOT EDIT BY HAND. Regenerated by the prebuild hook on every `npm run dev` and `npm run build`. Committed so fresh clones work without running the generator first.

4. `dashboard/js/AppContext.jsx` (refactored):
   - Removed module-level `LIGHT_THEME` / `DARK_THEME` / `LIGHT_META_COLOR` / `DARK_META_COLOR` constants (moved to `themes.js`).
   - Removed `import { Chart as ChartJS } from 'chart.js'` at the top — no longer needed here since `themes.js` owns the Chart.js defaults sync.
   - darkMode `useEffect` collapsed from 30 lines of inlined DOM mutations to a single `applyTheme(state.darkMode, getStoredTheme(state.darkMode))` call.
   - Cross-tab `storage` listener now handles three keys (`darkMode`, `lightTheme`, `darkTheme`). When only a theme name changes, calls `applyTheme(..., skipPersist=true)` — the new value came from another tab's localStorage write, so persisting it again would be a redundant round-trip (and in Approach A setups could cause a write loop).

5. `dashboard/js/App.jsx` (refactored):
   - Imports `applyTheme`, `DEFAULT_LIGHT_THEME`, `DEFAULT_DARK_THEME` from `./themes.js`.
   - Embed override `?theme=light|dark` now calls `applyTheme(false|true, DEFAULT_*_THEME, /*skipPersist*/ true)` instead of doing its own `classList` / `setAttribute` dance. `?bg=...` still sets `--color-base-100` directly since it's a pure surface override, not a theme swap.

6. `dashboard/index.html` (refactored inline flash prevention script):
   - Added `LIGHT_THEMES = ['lofi']` / `DARK_THEMES = ['black']` allowlists.
   - Added `DEFAULT_LIGHT_THEME` / `DEFAULT_DARK_THEME` constants matching `themes.js`.
   - Added `META = { 'lofi': '#ffffff', 'black': '#000000' }` inline map — values come from `generate-theme-meta.mjs` output; the script comment explicitly notes the four-place sync requirement.
   - Added `validTheme(id, allowlist, fallback)` helper.
   - Script now reads `darkTheme` / `lightTheme` keys in addition to `darkMode`, validates each, falls back to defaults on miss. Applies `.dark` class + `data-theme` attribute + `<meta name="theme-color">` content before first paint. Matches `applyTheme()` in behaviour (minus Chart.js, which doesn't exist at this point in the boot sequence).

7. `dashboard/js/components/Header.jsx` — theme toggle menu item gained an explicit `ariaLabel: state.darkMode ? 'Switch to light mode' : 'Switch to dark mode'`. Visible label stays the same ("Light mode" / "Dark mode"). Comment explains why the destination-style label needs an action-style aria-label.

8. `dashboard/js/components/HamburgerMenu.jsx` — accepts an optional `item.ariaLabel` prop on menu items, applied as the button's `aria-label` attribute. Falls back to `item.label` for menu items that don't need a distinct screen-reader label.

9. `package.json` — `dev`, `build`, and `build:lib` scripts all prefix with `node scripts/generate-theme-meta.mjs &&` so the generated file is always fresh. Added `npm run generate-theme-meta` for manual invocation after adding themes.

**Not addressed (feature decisions, not bugs):**

- **Approach A vs Approach B storage schema.** The reference describes two theme-persistence approaches: per-mode independent (3 keys: `darkMode` + `lightTheme` + `darkTheme`) and named combos (2 keys: `darkMode` + `themeCombo`). This project has one theme per mode and no picker UI, so neither approach is "chosen" — we ship Approach A's key schema (which is a superset) and the extra keys are forward-compat plumbing only. Documented in `themes.js` top comment.
- **Theme picker UI in burger menu.** No user request, no catalog beyond one theme per mode. Tracked as optional follow-up in `docs/TODO.md`.
- **DaisyUI component classes instead of custom CSS.** Already tracked as optional follow-up. The theming refactor is complete; replacing custom `.btn-primary` / `.card` / etc. with `btn btn-primary` / `card` / etc. is a separate incremental pass.

**Build:** Passes (`npm run build`). Prebuild output visible: `[generate-theme-meta] wrote .../dashboard/js/generated/themeMeta.js / lofi light #ffffff / black dark #000000`. 84 modules transform (up from 82 — `themes.js` and `generated/themeMeta.js` added). CSS bundle 150.64 KB (unchanged — no CSS changes this pass, only JS + HTML refactoring). Only CSS warning is DaisyUI's internal `@property --radialprogress` declaration (unchanged, not ours).

**Smoke test:** `vite preview` + curl verified:
- HTML `<html lang="en" class="dark" data-theme="black">` ✓
- Both `<meta name="theme-color">` tags with `(prefers-color-scheme: light/dark)` media queries ✓
- Inline flash prevention script contains `LIGHT_THEMES`, `DARK_THEMES`, `'lofi': '#ffffff'`, `'black': '#000000'`, `validTheme` ✓
- Built CSS contains both `[data-theme="lofi"]` and `[data-theme="black"]` selectors ✓
- All 14 critical custom class families present (`.heatmap-0` through `.heatmap-4`, `.heatmap-cell`, `.filter-multi-select*`, `.settings-pane*`, `.detail-pane*`, `.error-boundary-card`, `.dashboard-header`, `.card`, `.btn-primary`, `.toast-success`) ✓

**Files changed (10 source + 4 docs):**
- New: `scripts/generate-theme-meta.mjs`, `dashboard/js/themes.js`, `dashboard/js/generated/themeMeta.js`
- Modified: `dashboard/index.html`, `dashboard/js/AppContext.jsx`, `dashboard/js/App.jsx`, `dashboard/js/components/Header.jsx`, `dashboard/js/components/HamburgerMenu.jsx`, `package.json`
- Docs: `CLAUDE.md`, `docs/SESSION_NOTES.md`, `docs/HISTORY.md`, `docs/TODO.md`

---

### Full DaisyUI v5 migration — all six reference phases completed in one pass

**Why:** Dashboard was running a partial dark-mode implementation built on custom `--bg-*/--text-*/--border-*` CSS variables with a manual `html.dark` override block, 39 `dark:` Tailwind pairs scattered across 10 files, and hardcoded brand-blue `rgba(45, 104, 255, ...)` values in multiple places. This fought the cascade and required manual Chart.js color sync. Migrated to DaisyUI v5 per `docs/implementations/THEME_DARK_MODE.md` to get dual-layer theming (`.dark` class + `data-theme` attribute), eliminate `dark:` pair bugs, collapse the dual theming systems into one, and unlock DaisyUI component classes for future work.

The initial commit on this branch was a conservative "infrastructure + partial migration" that left ~200 `var(--bg-*)` references intact. The user explicitly requested no shortcuts, so this second commit completes all six reference phases in a single pass.

**Phase 0 — Prerequisites (`dashboard/styles.css`, `package.json`):**
1. Installed `daisyui@5` (5.5.19) as devDependency.
2. Added `@plugin "daisyui" { themes: lofi --default, black --prefersdark; }` — two curated themes. `--default` / `--prefersdark` set the initial theme before JavaScript runs.
3. Added `@layer base { html { color-scheme: light; } html.dark { color-scheme: dark; } }` for native form input / scrollbar theming.

**Phase 1 — Audit:** Ran the reference doc's search patterns and found 202 `var(--bg-*/--text-*/--border-*/--color-*/--chart-grid/--glow-*/--shadow-*)` references in `styles.css`, 166 `text-themed-*/bg-themed-*/border-themed` class references across 21 JSX files, 39 `dark:` Tailwind pairs across 10 JSX files, and ~15 hardcoded `rgba(45, 104, 255, ...)` brand-blue values.

**Phase 2 — CSS variable removal (`dashboard/styles.css`):**
4. Rewrote the `:root` block: deleted every theme-related variable (all `--color-*` brand palette, `--bg-*`, `--text-*`, `--border-*`, `--shadow*`, `--glow-*`, `--color-primary-alpha`, `--chart-grid`). What remains is only non-theme design tokens: spacing, radius, z-index scale, fonts.
5. Deleted the entire `html.dark` override block — DaisyUI's `[data-theme]` selectors handle the switching now.
6. Bulk replaced via `replace_all`:
   - `var(--bg-primary/secondary/tertiary/hover)` → `var(--color-base-100/200/300/300)`
   - `var(--text-primary)` → `var(--color-base-content)`
   - `var(--text-secondary/tertiary/muted)` → `color-mix(in oklab, var(--color-base-content) 80%/60%/40%, transparent)`
   - `var(--border-color/light)` → `var(--color-base-300/200)`
   - `var(--glow-primary)` → `0 0 20px color-mix(in oklab, var(--color-primary) 25%, transparent)`
   - `var(--chart-grid)` → `color-mix(in oklab, var(--color-base-content) 10%, transparent)`
   - `var(--color-primary-alpha, ...)` → `color-mix(in oklab, var(--color-primary) 10%, transparent)`
   - `var(--shadow-lg)` → inline `0 10px 25px rgb(0 0 0 / 0.25)` (only 1 usage)
7. Replaced hardcoded brand-blue `rgba(45, 104, 255, X)` values with `color-mix(in oklab, var(--color-primary) (X*100)%, transparent)` — now the brand accent follows the active theme's primary color:
   - Focus rings (filter-select, filter-input)
   - btn-primary hover background
   - drop-zone hover / drag-over backgrounds
   - tab-btn-active text-shadow
   - body::before techy grid background
8. Deleted the "Tailwind gray class overrides for dark theme" block — the set of `.bg-gray-50/100`, `.text-gray-400/500/600/700/900`, `.border-gray-100/200`, `.hover\:bg-gray-100:hover` etc. that hijacked Tailwind's raw gray scales into the old custom dark theme. No longer needed — JSX uses DaisyUI tokens directly.
9. Deleted the "Semantic card backgrounds for dark theme" block (`.bg-amber-50`, `.bg-indigo-50`, `.bg-pink-50`, `.bg-purple-50`, `.bg-red-50`, `.bg-green-50`, `.bg-blue-50`) and the "Semantic text colors" block (`.text-green-600`, `.text-red-600`, `.text-amber-600`, `.text-blue-600`, `.border-blue-500`). These were Tailwind hijacks that JSX no longer relies on after Phase 3.
10. Deleted the `.text-themed-primary/secondary/tertiary/muted`, `.bg-themed-primary/secondary/tertiary`, and `.border-themed` utility class definitions.
11. Swapped `color: white` / `color: #1a1a1a` / `color: #fff` hardcoded foreground colors to DaisyUI `*-content` tokens so legibility tracks the theme:
   - `.toast-success` → `var(--color-success-content)`
   - `.toast-error` → `var(--color-error-content)`
   - `.toast-warning` → `var(--color-warning-content)`
   - `.btn-primary` → `var(--color-primary-content)`
   - `.quick-guide-btn-primary` → `var(--color-primary-content)`
   - `.filter-preset-btn:hover/.active` → `var(--color-primary-content)`
   - `.filter-mode-toggle button.active` → `var(--color-primary-content)`
   - `.project-link-primary` → `var(--color-primary-content)`
   - `.filter-badge` → `var(--color-primary-content)`
12. `.install-modal-note` amber rgba literals → `color-mix` against `var(--color-warning)`.
13. `.drop-zone-heading` `color: #e5e7eb` → `var(--color-base-content)`.
14. Print styles (`@media print`) intentionally kept hardcoded `white`, `black`, `#e5e7eb` per the reference doc's "Print Override" section — forces readable output regardless of theme.

**Phase 3 — Component migration (21 JSX files):**
15. Removed all 39 `dark:` Tailwind pairs from JSX. Zero remain as live class names; the only `dark:` matches in the codebase now are inside code comments explaining what was migrated.
16. 166 `text-themed-*/bg-themed-*/border-themed` class references across 21 files (`App.jsx`, `main.jsx`, all 13 shared components, all 9 section components) bulk-replaced to DaisyUI Tailwind utilities:
    - `text-themed-primary` → `text-base-content`
    - `text-themed-secondary/tertiary/muted` → `text-base-content/80`, `/60`, `/40`
    - `bg-themed-primary/secondary/tertiary` → `bg-base-100/200/300`
    - `border-themed` → `border-base-300`
17. `Summary.jsx` Activity Snapshot cards: `bg-amber-50 dark:bg-amber-900/20`, `bg-indigo-50 dark:bg-indigo-900/20`, `bg-pink-50 dark:bg-pink-900/20`, `bg-purple-50 dark:bg-purple-900/20` → `bg-warning/15`, `bg-info/15`, `bg-accent/15`, `bg-secondary/15`. Text colors (`text-amber-600`, etc.) → matching semantic tokens (`text-warning`, etc.). These now auto-switch with the theme and each still has a visually distinct tint.
18. `Timeline.jsx` complexity badges: `bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300` (high) / `bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300` (medium) / neutral (low) → `bg-secondary/20 text-secondary` / `bg-info/20 text-info` / `bg-base-300 text-base-content/80`.
19. `Health.jsx` security panels (all three viewmodes): `bg-red-50 dark:bg-red-900/20` + `border-red-200 dark:border-red-800` + `text-red-600 dark:text-red-400` → `bg-error/10` + `border-error/40` + `text-error`.
20. `HealthBars.jsx`, `HealthAnomalies.jsx`, `Contributors.jsx`, `Tags.jsx`, `Timing.jsx`, `Progress.jsx`, `Discover.jsx`: progress-bar rails (`bg-gray-200 dark:bg-gray-600`) → `bg-base-300`; hover states (`hover:bg-gray-50 dark:hover:bg-gray-700` / `hover:bg-gray-100 dark:hover:bg-gray-600`) → `hover:bg-base-200` / `hover:bg-base-300`.
21. `App.jsx` embed mode override: now sets `--color-base-100` (DaisyUI token) instead of the removed `--bg-primary` alias, and also applies `data-theme="lofi"` / `data-theme="black"` alongside the `.dark` class toggle so DaisyUI components render correctly in embedded contexts.

**Dual-layer theming wired up (`index.html`, `AppContext.jsx`):**
22. `<html>` default: `class="dark" data-theme="black"`.
23. Flash prevention inline script in `index.html` (classic, not `type="module"`) now sets BOTH `.dark` class AND `data-theme` attribute before first paint, plus overwrites both `<meta name="theme-color">` tag `content` attributes. Theme name + meta color constants (`LIGHT_THEME='lofi'`, `DARK_THEME='black'`, `LIGHT_META='#ffffff'`, `DARK_META='#000000'`) live inside the script and MUST stay in sync with the `AppContext.jsx` module constants — inline scripts can't import ES modules, so duplication is unavoidable (documented with comments pointing at each side).
24. Added two `<meta name="theme-color">` tags with `(prefers-color-scheme: light/dark)` media queries in `index.html`.
25. `AppContext.jsx` darkMode `useEffect` extended: sets `.dark` class, `data-theme` attribute, and overwrites both theme-color meta tags' content on every toggle. New module constants at top of file.

**Phase 4 — Z-index normalization:** Already completed 2026-04-10, no changes needed.

**Chart.js theme sync:**
26. `AppContext.jsx` darkMode effect no longer reads the removed `--text-secondary` / `--chart-grid` custom variables. It now reads DaisyUI's `--color-base-content` directly and passes `color-mix(in oklab, ${baseContent} 80%/10%, transparent)` to `ChartJS.defaults.color` / `borderColor`. Canvas context parses `color-mix()` the same way CSS does in Chrome 111+ / Firefox 113+ / Safari 16.2+ (same baseline as DaisyUI).
27. `Tags.jsx` removed its per-component `useChartTextColor` hook + `useRef`/`useLayoutEffect` + explicit `color: CHART_TEXT_COLOR` overrides. Now inherits from `ChartJS.defaults.color` — single source of truth, and because Tags' chart `useMemo` already has `state.darkMode` as a dep (done 2026-04-11), the chart rebuilds on theme toggle and picks up the fresh default.

**Phase 5 — Verification (10-point checklist):** Passed via code inspection and build. `TESTING_GUIDE.md` Theme section rewritten with the full verification checklist for manual browser testing, grouped into: system preference fallback, dual-layer attributes, flash prevention, cross-tab sync, PWA status bar, charts, surface auto-switching, semantic tokens, print override.

**Phase 6 — Cleanup:**
28. Deleted 3 legacy CSS blocks (Tailwind gray overrides, semantic card backgrounds, semantic text colors) and 8 utility class definitions (`text-themed-*`, `bg-themed-*`, `border-themed`).
29. Zero custom `--bg-*/--text-*/--border-*/--color-primary-alpha/--chart-grid/--glow-*/--shadow*` variables remain anywhere in the codebase (verified with comprehensive Grep — only matches are in explanatory code comments).
30. Updated `CLAUDE.md` Frontend standards to enforce DaisyUI semantic tokens and prohibit re-introducing the deleted custom variables.

**Build:** Passes (`./node_modules/.bin/vite build`). CSS bundle **147.16 KB → 150.6 KB** (+3.5 KB, +2%). The net increase comes from DaisyUI's theme blocks and semantic component classes (btn, card, modal, etc.) which are added to the bundle; deleted custom variables / gray overrides / utility classes only partially offset the gain. All 82 modules transform. Vite preview serves correctly, DaisyUI theme selectors (`[data-theme="lofi"]` and `[data-theme="black"]`) and all 19 critical custom class families (`.heatmap-*`, `.filter-multi-select*`, `.settings-pane*`, `.detail-pane*`, `.error-boundary-card`, `.root-error-message`, `.dashboard-header`, `.card`, `.tab-btn-active`, `.btn-icon`, `.btn-primary`, `.toast-success`, `.collapsible-header`, etc.) verified via curl inspection.

**Regression caught and fixed (second pass):** The first migration commit on this branch misreported the CSS bundle size as 123.27 KB — this turned out to be a build artifact of a broken CSS comment. The rewritten `:root` comment block contained the literal sequence `--bg-*/--text-*/--border-*` inside a `/* ... */`, and the embedded `*/` terminated the comment prematurely. `esbuild`'s CSS minifier silently dropped everything after that point, which included all `.heatmap-*`, `.filter-multi-select*`, `.settings-pane*`, `.detail-pane*`, `.error-boundary-card`, and several other custom class definitions. The build passed (no errors) but the dashboard would have rendered without any of those custom styles. Fixed by rephrasing the comment to avoid the `*/` sequence. Added an `@source not` note in CLAUDE.md warning future sessions never to write `--*-*/...` glob patterns inside CSS comments.

**Additional semantic token migration (second pass):**
- `Timing.jsx` author threshold indicators: `text-green-600/amber-600/red-600` → `text-success/warning/error`.
- `HealthAnomalies.jsx` debt balance net indicator: `text-red-500/green-500` → `text-error/success`.
- `Discover.jsx` pin button: `text-blue-500` / `hover:text-blue-500` → `text-primary` / `hover:text-primary`. Metric selector focus ring: `focus:ring-blue-500` → `focus:ring-primary`.
- `Summary.jsx`, `Timeline.jsx`, `Progress.jsx`, `HealthWorkPatterns.jsx` stat-card hover rings: `hover:ring-blue-500` → `hover:ring-primary`.

**Files changed (22 source + 6 docs):**
- Infrastructure: `package.json`, `package-lock.json`, `dashboard/styles.css`, `dashboard/index.html`, `dashboard/js/AppContext.jsx`
- App shell: `dashboard/js/App.jsx`, `dashboard/js/main.jsx`
- Shared components (13): `dashboard/js/components/CollapsibleSection.jsx`, `DropZone.jsx`, `ErrorBoundary.jsx`, `FilterSidebar.jsx`, `Header.jsx`, `HealthAnomalies.jsx`, `HealthBars.jsx`, `HealthWorkPatterns.jsx`, `InstallInstructionsModal.jsx`, `QuickGuide.jsx`
- Section components (9): `dashboard/js/sections/Contributors.jsx`, `Discover.jsx`, `Health.jsx`, `Progress.jsx`, `Projects.jsx`, `Summary.jsx`, `Tags.jsx`, `Timeline.jsx`, `Timing.jsx`
- Docs: `CLAUDE.md`, `docs/SESSION_NOTES.md`, `docs/HISTORY.md`, `docs/TODO.md`, `docs/TESTING_GUIDE.md`, `docs/USER_GUIDE.md`

**Remaining (optional) future work:** Component class migration from raw Tailwind to DaisyUI component classes (`<button>` → `btn btn-{primary|ghost|outline}`, `<input>` → `input input-bordered`, cards → `card` + `card-body`, badges → `badge badge-*`). Currently the app uses custom CSS for these; DaisyUI component classes would reduce custom CSS further. Not required for the dark-mode migration to be considered complete — all theming is now DaisyUI-driven and all six reference phases are done.

---

## 2026-04-11

### Debug system hardening — 9 commits of fixes and refactors

**Why:** After the initial debug system implementation, repeated audit passes found bugs, edge cases, spec deviations, and code-quality issues. All addressed incrementally over 9 commits.

**Commits (chronological):**

1. `feat(debug)`: Initial debug system — debugLog module, React DebugPill, clipboard fallbacks, `#debug-root` mount, error routing updated across 5 files.
2. `fix(debug)`: Spec compliance pass — moved embed check to main.jsx (avoid conditional hooks), removed unused `diagRow` status param, added browser info and manifest start_url/id validation, added visible textarea clipboard fallback, routed Projects.jsx through `debugAdd`.
3. `fix(debug)`: Bug fixes pass — removed redundant `setEntries(debugGetEntries())` causing duplicate entries on mount, added `__debugConsolePatched` HMR guard preventing nested wrapper chains on hot reload, Clear button now resets `reportText`, added `import`/`export` source colors.
4. `chore(debug)`: Removed unused `debugGetEntries` import from DebugPill (dead after fix #3).
5. `feat(debug)`: Added `diagnoseFailure` utility per spec — no-cors HEAD probe to distinguish CORS/network/deployment failure modes.
6. `fix(debug)`: Defensive edge-case hardening — `safeStringify` wrapper for circular references in details (would crash LogTab), `safeString` wrapper for throwing `toString()` in console interception, `copyTimerRef` for cleanup on unmount.
7. `fix(debug)`: Pre-React error timestamp preservation — inline pill now stores `Date.now()` instead of `toLocaleTimeString()`, added `fmtTime` helper for display, `render()` bails early when `__debugReactMounted` is true (stops wasted DOM work on hidden banner).
8. `refactor(debug)`: Bridge refactor — pre-React error ingestion now calls `debugAdd` with optional `timestamp` parameter instead of manually constructing entries and mutating internal state.
9. `refactor(debug)`: Deduplication + strict mode fix — exported `formatDebugTime` and `safeStringify` from debugLog.js (removed duplicates in DebugPill), added `setEntries([])` before subscription to handle React strict mode double-mount cleanly.

**Architecture:**
- `debugLog.js` — Pub/sub circular buffer (200 entries), structured entries (`id`, `timestamp`, `source`, `severity`, `event`, `details`), console interception with HMR guard, global error listeners with HMR guard, report generation with URL redaction, pre-React error bridge, `debugAdd` with optional timestamp, `diagnoseFailure` utility, shared `formatDebugTime`/`safeStringify` helpers.
- `copyToClipboard.js` — ClipboardItem Blob → writeText → textarea fallback chain.
- `components/DebugPill.jsx` — Separate React root (survives App crashes), inline styles (survives CSS failures), 3 tabs (Log/Environment/PWA Diagnostics), monotonic stale-run cancellation, visible textarea fallback for failed clipboard, hides inline pill on mount.
- `index.html` inline pill — Stores `Date.now()`, bails `render()` after React mounts.
- Error routing — ErrorBoundary, App, pwa, HamburgerMenu, Projects, main.jsx all use direct `debugAdd` imports; `window.__debugPushError` override maintained for backward compat.

**Files changed:**
- New: `js/debugLog.js`, `js/copyToClipboard.js`, `js/components/DebugPill.jsx`
- Modified: `index.html`, `js/main.jsx`, `js/App.jsx`, `js/pwa.js`, `js/components/ErrorBoundary.jsx`, `js/components/HamburgerMenu.jsx`, `js/sections/Projects.jsx`
- Docs: `CLAUDE.md`, `README.md`, `docs/SESSION_NOTES.md`, `docs/HISTORY.md`, `docs/TESTING_GUIDE.md`, `docs/TODO.md`, `docs/AI_MISTAKES.md`

---

### React migration hardening — bugs, accessibility, architecture

**Why:** Systematic review identified 3 bugs, 3 non-React patterns, and 2 accessibility gaps remaining after the V2 migration. Fixed all 12 findings.

**Changes:**

**Bugs:**
1. Created `useScrollLock` hook — ref-counted body scroll lock replacing direct `document.body.style.overflow` in App.jsx and QuickGuide.jsx. Prevents race condition when multiple overlays open/close independently.
2. Moved Chart.js color sync from `main.jsx` (one-time module load) to `AppContext.jsx` (darkMode useEffect). Added `state.darkMode` to all 11 chart useMemo dependency arrays across 5 section files so react-chartjs-2 recreates chart options and calls `chart.update()` on theme toggle.
3. Added `htmlFor`/`id` pairing on SettingsPane work hour labels and selects for screen reader association.

**React migration:**
4. Converted heatmap tooltip from vanilla DOM to React portal (`HeatmapTooltip.jsx`). Removed `document.getElementById`, `classList.add/remove`, and manual `style.left/top` positioning from App.jsx. Portal mounts into existing `#heatmap-tooltip` div in index.html.
5. Moved embed `?theme=`/`?bg=` overrides from App.jsx module scope into a `useEffect`. Eliminates race with AppContext's dark mode management that could re-add the `dark` class after embed removed it.
6. Created `urlParams.js` — centralized URL query parameter parsing. Replaces 4+ redundant `new URLSearchParams(window.location.search)` calls in App.jsx and chartColors.js.

**Accessibility:**
7. Added full keyboard navigation to FilterSidebar `MultiSelect` — ArrowUp/Down, Enter/Space toggle, Escape close, Home/End, `aria-activedescendant`, `aria-multiselectable`. Added `.highlighted` CSS class for keyboard focus indicator.
8. Added `aria-label` to 12+ clickable elements across Health.jsx (urgency bars, impact bars, security repo buttons), Timeline.jsx (period items, summary cards), and Progress.jsx (semver items, epic bars, feature/bugfix/refactor cards).

**Documentation:**
9. Added comment on `.heatmap-cell:hover` `z-index: 1` explaining it's local grid stacking, not from the CSS variable scale.
10. Updated CLAUDE.md architecture lists: added HeatmapTooltip, useScrollLock, urlParams.js.
11. Verified QuickGuide.jsx step 2 matches current 6-tab structure (Summary, Timeline, Breakdown, Health, Discover, Projects).

**Files changed:**
- New: `js/hooks/useScrollLock.js`, `js/components/HeatmapTooltip.jsx`, `js/urlParams.js`
- Modified: `js/App.jsx`, `js/main.jsx`, `js/AppContext.jsx`, `js/chartColors.js`, `js/components/QuickGuide.jsx`, `js/components/SettingsPane.jsx`, `js/components/FilterSidebar.jsx`, `js/sections/Health.jsx`, `js/sections/Timeline.jsx`, `js/sections/Progress.jsx`, `js/sections/Timing.jsx`, `js/sections/Contributors.jsx`, `js/sections/Tags.jsx`, `styles.css`, `index.html`, `CLAUDE.md`

---

## 2026-04-10

### Z-index scale — full audit and normalization

**Why:** The glow-props Z_INDEX_SCALE pattern requires every z-index in the codebase to map to a named layer. Two violations existed: the inline debug pill used hardcoded `zIndex:'99999'` (3 places), and the heatmap tooltip used `--z-toast` (70) when the scale places tooltips in the menu/dropdown layer (50).

**Changes:**
1. Replaced all three `zIndex:'99999'` in `dashboard/index.html` with `zIndex:'80'` (matches `--z-debug`)
2. Changed `.heatmap-tooltip` from `var(--z-toast)` to `var(--z-menu)` — tooltips belong at z-50 per the scale, and z-70 caused the tooltip to compete with toasts at the same level
3. Updated CSS scale comment to reference `Z_INDEX_SCALE.md` (was pointing to `BURGER_MENU.md`)
4. Added decision context comments explaining sub-layer choices (21 for sticky-header, 28 for drawer-backdrop, 58 for modal-backdrop) and why they deviate from the base scale's "backdrop always 40" rule
5. Added decision context comment on inline debug pill explaining why z-80 is hardcoded (CSS variables unavailable before stylesheets load)

6. Added `@source not` directives to `styles.css` excluding `public/data-commits/` and `public/repos/` from Tailwind content scanning — commit history in JSON data files contained Tailwind-like class names (e.g. `z-[9999]`, `z-[100]`) causing phantom CSS utilities in the build output
7. Added z-index visual stacking test scenario to `docs/TESTING_GUIDE.md`
8. Documented hamburger menu stacking context limitation in `docs/TODO.md` — backdrop and dropdown are trapped inside the header's z-21 stacking context, causing drawers (z-30) to render above the backdrop

**Audit result (20 z-index values):** All source values use scale variables or justified base-content values (`-1` for decorative pseudo-element, `1` for heatmap cell hover). No ad-hoc values remain in source or build output.

### Add Apple touch icon and favicon.ico — full APP_ICONS pattern parity

**Why:** The icon generation pipeline was missing two items from the glow-props APP_ICONS pattern: the 180px Apple touch icon (iOS home screen) and a 32x32 favicon.ico (Windows taskbar pinning, legacy browsers).

**Changes:**
1. Added `{ name: 'apple-touch-icon.png', size: 180 }` to `generate-icons.mjs` ICONS array
2. Added favicon.ico generation via manual ICO packing (zero dependencies, 32x32 from SVG source)
3. Script copies both `apple-touch-icon.png` and `favicon.ico` to `dashboard/public/` for root-level serving
4. Added `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` to `dashboard/index.html`
5. Added `<link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="32x32">` as fallback (SVG favicon remains primary for modern browsers)

**Not added to PWA manifest:** Apple touch icon uses the `<link>` tag mechanism, not the web app manifest icons array. The manifest icons are for Android/Chrome install.

6. Removed inline SVG data URL favicon from `index.html` — was a second icon source that bypassed the generation pipeline. Replaced with `<link rel="icon" type="image/png" href="/assets/images/favicon.png">` pointing to the generated 48x48 PNG
7. Script now syncs all generated files (7 PNGs + favicon.ico) to `dashboard/public/assets/images/` — eliminates pre-existing drift risk where manual copies could go stale between regenerations

**Files changed:** `scripts/generate-icons.mjs`, `dashboard/index.html`, `assets/images/apple-touch-icon.png`, `assets/images/favicon.ico`, `dashboard/public/apple-touch-icon.png`, `dashboard/public/favicon.ico`, `dashboard/public/assets/images/*`

## 2026-04-06

### Bypass SW navigation cache for embed URLs

**Why:** Even after removing X-Frame-Options from vercel.json, the PWA service worker continued serving cached index.html responses that included the old header. Since the iframe gets blocked before JS runs, the SW update code never executes — creating a deadlock where the old SW persists indefinitely.

**Fix:** Added `navigateFallbackDenylist: [/[?&]embed=/]` to the Workbox config. Embed URL navigations now bypass the SW cache entirely, going directly to the network. Normal dashboard navigation still uses the precached fallback.

### PWA improvements from cross-project review (synctone, canva-grid, few-lap)

**Why:** Reviewed sibling repos and found repo-tor's PWA had a skipWaiting/prompt conflict and lacked resilience patterns that other projects had adopted.

**Changes:**
1. Removed `skipWaiting: true` + `clientsClaim: true` from workbox config — conflicted with `registerType:'prompt'`, auto-reloading before user saw update prompt
2. Added `_userClickedUpdate` guard on `controllerchange` — only reloads when user triggers update via applyUpdate(), not on background SW events
3. Added 30-second post-update suppression via sessionStorage — prevents false "update available" re-detection after reload
4. Added SW recovery script in index.html — if React hasn't mounted after 30s, clears all caches, unregisters SW, and reloads (max 2 attempts per session)
5. Added 1.5s settle delay to `checkForUpdate()` — `reg.update()` is async and `reg.waiting` may not be populated immediately after it resolves
6. Fixed `visibilitychange` handler to surface waiting workers — the `onNeedRefresh` callback from `registerSW` only fires once during setup, so separate `reg.update()` calls need manual detection + event dispatch
7. Added `version.json` polling — build-time timestamp file written by `scripts/write-build-version.mjs`, fetched independently of the SW. Detects deployments that don't change the SW file (e.g. vercel.json config changes). Checked on startup (3s delay), hourly, and on visibility change

### Full PWA parity with few-lap (16 gap items)

**Why:** Line-by-line comparison with few-lap's PWA implementation identified 16 differences. All addressed.

**Changes:**
- `pwaConstants.js`: Extracted all timing/threshold constants (SW_UPDATE_CHECK_INTERVAL_MS, JUST_UPDATED_SUPPRESS_MS, UPDATE_SETTLE_DELAY_MS, etc.)
- `offline.html`: Branded offline fallback page (precached by Workbox)
- `dismissUpdate()`: Dismiss update prompt without applying (pattern from few-lap)
- `_isChecking` state + `pwa-checking-update` event: Loading feedback during manual update checks
- `offlineReady` auto-dismiss: 3s timeout via `pwa-offline-dismissed` event
- `__pwaPromptReceived` flag: Set in inline HTML script + pwa.js for diagnostics
- Display-mode change listener: Detects installs via browser menu (not just beforeinstallprompt)
- Install analytics: `trackInstallEvent()` stores last 50 events in localStorage
- `dismissInstall()` + `isInstallDismissed()`: Persistent install prompt dismissal
- Chrome 90-day cooldown note: Shown in install instructions when native prompt unavailable
- 5s diagnostic timeout: Warns in debug pill if beforeinstallprompt hasn't fired on Chromium
- 2-layer capture documented: Explained why Vite doesn't need few-lap's 3rd layer (Metro is slower)
- Recovery script strengthened: Now watches `updatefound` + installing worker `statechange`, clears counter on successful mount
- vercel.json headers: `Cache-Control: no-cache` for all HTML responses, `immutable` for hashed assets, `Service-Worker-Allowed` for sw.js, `Content-Type` for manifest

## 2026-04-05

### Remove X-Frame-Options header blocking cross-origin embeds

**Why:** The `X-Frame-Options: SAMEORIGIN` header added in H4 audit fix (19e1e21) blocked all cross-origin iframes. This broke the embed feature — see-veo and other apps embedding repo-tor charts via `?embed=` got "refused to connect" errors.

**Fix:** Removed `X-Frame-Options` entirely. The dashboard is public, read-only, with no auth — there are no actions to clickjack. The embed feature is designed for cross-origin use (CVs, portfolios, external apps), so framing protection is counterproductive here.

## 2026-04-02

### Full 9-trigger audit sweep and fixes

**Why:** Ran all 9 audit triggers (review, audit, docs, mobile, clean, performance, security, debug, improve) in parallel. Found 41 unique findings across all categories. Implemented fixes for all critical, high, medium, and low-priority items.

**Critical fixes (C1-C5):**
- Removed unconditional dark class in main.jsx that overrode flash prevention
- Added URL validation for ?data= param (SSRF prevention — http/https only)
- Replaced postMessage wildcard '*' with referrer-based origin; added source validation in embed.js
- Routed ErrorBoundary errors to debug pill via __debugPushError
- Added per-file try/catch for month commit fetches with user-facing failure warning

**High fixes (H1-H10):**
- Added viewport-fit=cover and safe-area-inset padding for iOS notch/home indicator
- Increased filter mode toggle button size (was 2px padding, now 6px + min-height)
- Added security headers to vercel.json (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- Routed SW registration errors to debug pill
- Wrapped Header, TabBar, FilterSidebar, DetailPane, SettingsPane in ErrorBoundary
- Fixed TESTING_GUIDE (removed nonexistent dark mode toggle + private mode sections)
- Updated CLAUDE.md dark mode status to "Implemented"
- Updated USER_GUIDE.md theme section for light/dark support
- Added Projects tab to QuickGuide onboarding

**Medium fixes (M1-M16):**
- Added 30s fetch timeout with user-friendly timeout error message
- Cached tag style objects in module-level Map
- Replaced duplicate work hours logic in useHealthData with getWorkPattern()
- Added network status and theme to debug pill diagnostics
- Wrapped UrgencyBar/ImpactBar in React.memo
- Validated ?bg= param against hex regex
- Removed token source from extract-api.js log
- Replaced aria-hidden="true" with role="presentation" on all backdrop overlays

**Low fixes (L1-L6):**
- Added vertical clamping to heatmap tooltip
- Increased loading timeout from 10s to 20s
- Added explanatory comment for ISO week calculation

---

## 2026-04-02

### Cross-project alignment with glow-props

**Why:** Compared repo-tor's CLAUDE.md against glow-props' shared CLAUDE.md and suggested implementations. Found 24 actionable items across documentation, accessibility, infrastructure, theming, embedding, and extraction.

**What (24 items completed):**

**CLAUDE.md updates (1-4):**
1. Fixed "class" → "component" terminology in Code Organization
2. Added React-specific quality checks (dangerouslySetInnerHTML, missing keys, re-renders)
3. Added build tools check to AI Notes
4. Added QuickGuide sync note to AI Notes

**Suggested Implementations restructure (5-7):**
5. Extracted ~200 lines of inlined implementations to `docs/implementations/` (8 files)
6. Added Burger Menu implementation reference
7. Added Theme & Dark Mode implementation reference

**HamburgerMenu accessibility & iOS fixes (8-13):**
8. Added `cursor-pointer` on backdrop overlay for iOS Safari
9. Added `useId()` for unique `aria-controls`
10. Added `hasBeenOpenRef` focus guard
11. Added `cancelAnimationFrame` cleanup
12. Added `overscroll-contain` on menu card
13. Switched from `role="menu"` to disclosure pattern (`nav`/`ul`/`li`)

**Layout & Infrastructure (14-16):**
14. Adopted z-index scale convention (CSS variables `--z-base` through `--z-debug`)
15. Added safe localStorage wrappers (`safeStorageGet`/`safeStorageSet`/`safeStorageRemove`)
16. Added `sharp` to devDependencies

**Dark mode improvements (17-20):**
17. Added full light theme CSS variables (`:root` = light, `html.dark` = dark override)
18. Added flash prevention inline `<script>` in `<head>`
19. Added cross-tab theme sync via `storage` event
20. Added system preference fallback via `matchMedia`

**Embedding & extraction (21-24):**
21. Added `?data=<url>` query param for loading data from external URL
22. Added Vite library build config (`vite.config.lib.js`, `js/lib.js`, `npm run build:lib`)
23. Researched device/platform attribution — infeasible with native git data
24. Added `--no-merges` CLI flag to `extract.js`

---


---

## Older Entries

Pre-April 2026 entries (2026-03-27 back to 2026-01-18) live in
`docs/HISTORY_ARCHIVE.md` to keep the active history file at a workable
size. The split was made on 2026-04-15 when this file reached ~4400
lines. New entries should always be written to this file (HISTORY.md);
move entries into the archive only when this file becomes unwieldy
again.
