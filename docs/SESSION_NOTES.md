# Session Notes

Compact context snapshot for AI continuity. Updated 2026-04-16 after
the PWA icon cache-bust fix + strengthening pass (assertions, missing-
icon warning, OS-cache user note, 9-test tripwire, corrected narrative).
Detailed history lives in `docs/HISTORY.md` and the git log.

## Current State

**Branch:** `claude/fix-pwa-icon-cache-p2JOQ`.

**Last change:** PWA icon cache-bust strengthening pass (5 changes):

1. `iconCacheBustHtml` Vite plugin now `throw`s on missing literal
   hrefs instead of silently no-op'ing — prevents shipping a manifest
   with versioned icons but a `<head>` with un-versioned ones if anyone
   reformats `dashboard/index.html`.
2. `iconVersion` `console.warn`s when an icon file is missing instead
   of silently returning `'0'` — surfaces accidental icon deletion.
3. Corrected the `cleanupOutdatedCaches` rationale comment: it sweeps
   cross-major-version Workbox precache stores, not per-build stale
   entries (those are handled by Workbox's normal install flow). Option
   is still kept; comment now describes what it actually does.
4. New tripwire test `scripts/__tests__/icon-cache-bust.test.mjs`
   (9 tests, total 65 → 74). Source assertions always run; built-output
   assertions skip with logged warning when `dist/` is absent.
5. User-facing OS-cache note added to `InstallInstructionsModal.jsx`
   as a collapsed `<details>` ("Already installed and the icon looks
   outdated?") — explains in plain language that the OS caches icons
   separately from the browser.

**Original cache-bust fix** (still in place, just strengthened):
`vite.config.js` SHA-256s each icon in `dashboard/public/` at
config-load time and appends `?v=<8-char-hash>` to the manifest icon
URLs (192/512/1024) and the static link tags in `index.html`
(favicon.png, favicon.ico, apple-touch-icon.png) via the
`transformIndexHtml` plugin. `workbox.ignoreURLParametersMatching`
includes `/^v$/` so the versioned URLs still hit precache.

A glow-props pattern proposal (`PWA_ICON_CACHE.md`) is drafted but
not yet contributed upstream.

**Dashboard V2:** Stable. Role-based view levels (Executive / Management /
Developer), DaisyUI v5 dual-layer theming following
`docs/implementations/THEME_DARK_MODE.md` Approach A (per-mode independent
themes, 4 light + 4 dark in the curated catalog), PWA support, embed
mode via `?embed=chart-id`, single `node:test` source-level tripwire
(65 tests, ~470 ms, no browser).

**Vanilla-DaisyUI policy:** Locked in. `dashboard/styles.css` contains
zero custom CSS classes (allowlist test enforces). All theming flows
through DaisyUI semantic tokens. Element-selector exceptions are
documented in CLAUDE.md "Frontend: Styles and Scripts" and in the
styles.css block itself: `*` font reset, `h1,h2,h3` mono headings,
`body::before` decorative grid background. Documented arbitrary-bracket
exceptions: `z-[var(--z-sticky-header)]`, `z-[var(--z-toast)]`,
`grid-cols-[auto_repeat(7,1fr)]`, `max-w-[calc(100vw-2rem)]`. Documented
hex literal exceptions: `DebugPill.jsx`, `themes.js #808080`,
`generated/themeMeta.js`.

**Testing:** Playwright was removed entirely on 2026-04-15 — the
`af0f02d` commit that introduced it never produced baselines because the
sandbox lacked a Chromium binary. Future re-introduction is tracked in
`docs/TODO.md` "Browser test coverage (future)" with an explicit
"obtain a Chromium binary first" note. The single automated layer is
the source-level tripwire under `scripts/__tests__/`.

## Recent Audit-Cleanup Work

The branch has had two fresh-eyes audit passes. The first (2026-04-15)
produced 13 commits covering the original findings set; the second
(same day) caught gaps introduced by the first and produced a
follow-on cleanup commit series. All commits listed below are on the
`claude/migrate-daisyui-dark-mode-toG0Y` branch.

**First pass — 13 commits:**

1. **`4a8bd00`** — z-index symmetry, font-sans override, Date filter perf
2. **`7d92b77`** — SettingsPane View Level → native `<fieldset>` + radio
3. **`d104b37`** — CLAUDE.md exception lists expanded with rationale
4. **`4e4f672`** — 5 dead exports removed, Header filter callback simplified
5. **`8ca34f8`** — Progress inline → utility, QuickGuide mobile copy, z-index doc
6. **`64e2c6c`** — styles.css trimmed 521 → 164 lines (tombstone removal)
7. **`51d16d2`** — SESSION_NOTES.md rewritten as compact 77-line snapshot
8. **`2036661`** — HISTORY.md split, pre-April 2026 entries archived
9. **`4f38b72`** — Timing.jsx 573 → 436 (extract components/TimingHeatmap.jsx)
10. **`feb7129`** — DebugPill.jsx 527 → 200 (extract debug/DebugTabs.jsx + debug/debugStyles.js)
11. **`f0bd185`** — Discover.jsx 711 → 430 (extract sections/discover/discoverData.js)
12. **`2f815d1`** — Timeline.jsx 735 → 390 (extract hooks/useTimelineCharts.js)
13. **`fd0985b`** — TODO.md verification entries + aggregate.js investigation

**Second pass — 8 follow-on cleanup commits (fresh-eyes audit caught
gaps in the first pass):**

1. **`09ca333`** — CLAUDE.md exceptions expanded: hex-literal exception
   now covers the entire `components/debug/` subtree (was
   `DebugPill.jsx` only); `grid-cols-[auto_repeat(7,1fr)]` path
   updated to `TimingHeatmap.jsx`; new inline-style exception for the
   root `main.jsx` ErrorBoundary; ADMIN_GUIDE.md added to docs table;
   Key Components list refreshed with new files.
2. **`3520a6f`** — Dead-code sweep round 2: deleted `debugGetEntries`,
   `diagnoseFailure`, `formatNumber`, `aggregateForDrilldown`,
   `DAY_NAMES`, and `hooks/useClickOutside.js`; unexported
   `SA_HOLIDAYS`, `aggregateByTag`, `getRepoColor`, `SOURCE_COLORS`,
   `SEVERITY_COLORS`.
3. **`44b6393`** — Hygiene batch: SESSION_NOTES sha backfill,
   HamburgerMenu `z-[40]` stale-comment rewrite, Header `setGuideOpen`
   dropped from dep array.
4. **`7a5a5c9`** — `chartHeight` inline-style → utility classes at 11
   call sites across Timeline / Progress / Timing / Tags. Heights:
   `h-55 sm:h-75` (220/300), `h-50 sm:h-62` (200/248), `h-62 sm:h-87`
   (248/348). Contributors runtime-computed height preserved.
5. **`dfc7245`** — Timeline `handleCardClick('contributors')` replaces
   full map+sort with `new Set(...).size` — O(n) Set inserts only.
6. **`39cd3cf`** — `body { background-color / color }` removed from
   `styles.css` after verifying DaisyUI v5 base layer emits
   `:root, [data-theme] { background: var(--root-bg); color:
   var(--color-base-content); }` in
   `node_modules/daisyui/base/rootcolor.css`.
7. **`5ecfad7`** — `AppContext.jsx` split: 579 → 338 lines by
   extracting reducer + initial-state + filter predicate + DEFAULT_FILTERS
   into new pure-data `dashboard/js/appReducer.js` (285 lines, zero
   React imports).
8. **`<this commit>`** — TODO.md post-sweep-verification item #4
   covering the second-pass changes, File-size Monitoring section for
   `useTimelineCharts.js` + `AppContext.jsx`, footer rewrite describing
   both audit passes, HISTORY.md 2026-04-15 entry for the whole batch.

Build + tests pass after every commit.

**Third pass — 6 more follow-on cleanup commits (strengthened the
exception list by actually removing 4 of the documented exceptions):**

1. **`12cd65d`** — `* { font-family: var(--font-sans) }` removed from
   styles.css; `<body class="font-sans">` in index.html achieves the
   same inheritance via Tailwind's `.font-sans` utility reading from
   the `:root --font-sans` variable.
2. **`aea7c43`** — Root ErrorBoundary in `main.jsx` converted from
   static inline `style={{}}` block to Tailwind utility classes
   (`min-h-screen flex flex-col items-center justify-center gap-4
   p-6 text-center`). Removes the "static inline style" exception
   category outside the debug subsystem.
3. **`5bcc2c2`** — `h1, h2, h3 { font-family: var(--font-mono) }`
   removed from styles.css; added explicit `font-mono` to each of
   the 4 JSX headings in the entire tree (Header / QuickGuide /
   InstallInstructionsModal / DropZone — the last already had it).
4. **`0cc5d6e`** — `themes.js` `#808080` fallback removed; the
   `getMetaColor()` fallback path now reads
   `META_COLORS[DEFAULT_LIGHT_THEME]` and logs a `debug` warn event
   so the unreachable-in-practice branch surfaces via the debug pill
   if it ever fires.
5. **`1e19858`** — `scripts/aggregate.js` investigation resolved:
   script is NOT dead (admin/maintainer workflow tool documented in
   ADMIN_GUIDE.md / DATA_OPERATIONS.md / DISCOVERY_SESSION.md /
   CODE_REVIEW.md), but the 5 stale `dashboard/{commits,files,
   contributors,metadata,summary}.json` artefacts at dashboard/ root
   were deleted — they had zero consumers and were leftover from a
   deprecated data-flow that's been superseded by
   `aggregate-processed.js` writing to `dashboard/public/`.
6. **`<this commit>`** — CLAUDE.md exception lists consolidated to
   reflect the 4 removed exceptions. Post-sweep-verification items
   3+4 updated. HISTORY.md third-pass entry added.

**After the third pass, the exception list is:**

- **Element-selector exceptions in styles.css: 1**
  (was 3) — only `body::before` decorative grid remains.
- **Arbitrary bracket value exceptions: 4** (unchanged)
  — z-21, z-70, grid-cols-[auto_repeat(7,1fr)], max-w-[calc(100vw-2rem)].
  All four are genuine capability gaps (design-token z-scale above
  stock, functional grid row alignment, viewport calc max-width).
- **Hex literal exceptions: 2** (was 3) — DebugPill subsystem
  (`components/DebugPill.jsx` + `components/debug/*`) and
  `generated/themeMeta.js` (auto-generated PWA meta tags). `themes.js`
  `#808080` gone.
- **Static inline style exceptions: 1** (was 2) — DebugPill
  subsystem only. Root ErrorBoundary gone.

**Fourth pass — retrospective + tripwire strengthening (4 commits):**

After the third pass closed, a "trust but verify" retrospective
caught five issues the three audit passes missed. Most of them
weren't bugs — they were missing regression guards and
under-documented scope edges.

1. **`a7a9126`** — Added 3 tripwire regression guards that enforce
   the CLAUDE.md exception lists at source level: bracket-value
   allowlist (4 permitted values), hex literal scope (DebugPill
   subsystem + themeMeta.js only), JSX heading font-mono requirement.
   Test count 60 → 63. Without these, a future contributor could
   drift past the rules the audits enforced.
2. **`460e161`** — File-size sweep over the whole repo (not just
   `dashboard/js/sections/`) caught `dashboard/js/pwa.js` at 578
   lines (OVER soft-limit), `scripts/aggregate-processed.js` at
   1042 lines (OVER strong-refactor 800), and `scripts/extract-api.js`
   at 699 lines. None touched by the three audit passes because
   they focused on section components. All three flagged in
   docs/TODO.md with concrete split suggestions.
3. **`57e2423`** — CLAUDE.md scope note: `dashboard/index.html`
   contains intentional inline `style="..."` + hex literals
   (pre-React loading spinner, noscript fallback, PWA early-capture
   warnings) because those render before React/CSS load. A future
   reviewer might flag them as policy violations without the
   explicit documented scope exclusion.
4. **`<this commit>`** — records the retrospective in HISTORY +
   SESSION_NOTES, updates the file-size posture with the newly-found
   oversized files.

**Retrospective also verified prior assumptions:**

- Verified Tailwind v4 preflight sets `html { font-family:
  var(--default-font-family) }` which resolves to the `:root
  --font-sans` Figtree stack via unlayered-CSS precedence. The
  `<body class="font-sans">` from commit 12cd65d is strictly
  redundant but harmless and explicit. **Also discovered the OLD
  `* { font-family }` rule was a latent bug**: it overrode Tailwind
  preflight's `code, kbd, samp, pre { font-family: monospace }`,
  forcing `<code>` elements to render in Figtree. The 2026-04-15
  removal fixed a bug nobody had noticed.
- Verified DaisyUI v5 `:root, [data-theme]` base rule still ships
  in `node_modules/daisyui/base/rootcolor.css`, so the
  `body { background-color / color }` removal from commit 39cd3cf
  still holds across DaisyUI upgrades.
- Repo-wide greps confirmed no inline-style / bracket-value / hex
  literal regressions.

**Current file-size posture (every file under the STRONG 800-line
refactor limit; dashboard/js/ files mostly under the 500 soft-limit
except pwa.js):**

- Largest section: `Progress.jsx` 483
- Largest component: `App.jsx` 490
- Largest shared module: `useTimelineCharts.js` 416 (TODO monitor)
- Largest state file: `AppContext.jsx` 338 + `appReducer.js` 285
- **`dashboard/js/pwa.js` 578 — OVER soft-limit** (TODO split)
- `styles.css` 175
- **`scripts/aggregate-processed.js` 1042 — OVER strong-limit**
  (TODO split)
- **`scripts/extract-api.js` 699 — OVER soft-limit** (TODO monitor)
- Tripwire test file: `daisyui-surfaces.test.mjs` 1023 lines
  (test files are exempt from the soft-limit per convention — they
  accumulate assertions monotonically)

## Open Items For Next Session

- **Browser verification** remains the only item I can't do myself.
  Covers the second-pass chartHeight utility rounding (2px deltas
  on Timing/Tags), the body bg/color removal across all 8 themes,
  the AppContext split, the Timeline `handleCardClick` micro-fix,
  the fourth-pass `<body class="font-sans">` effective-font check,
  and the `getMetaColor` fallback path.
- **File-size splits** — `pwa.js`, `aggregate-processed.js`, and
  `extract-api.js` are flagged in TODO.md with concrete suggestions
  but not executed (they need design calls and weren't in the audit
  scope). `useTimelineCharts.js` (416) and `AppContext.jsx` (338)
  are still under the limit but being monitored.
- **`docs/TODO.md`** carries everything else flagged during the four
  audit passes — post-sweep verification checklists, file-size
  monitoring, the future browser-test-coverage plan, and the
  legacy `scripts/aggregate.js` reference.

## 2026-04-16 — Focus trap + keyboard nav wiring

Completed BURGER_MENU partial-to-complete checklist items 1-5:

1. **`useDisclosureFocus.js`** — new hook extracted from HamburgerMenu's
   inlined focus-on-open / return-to-trigger-on-close logic.
2. **`useFocusTrap.js`** — added optional `externalRef` second parameter.
   HamburgerMenu passes `menuRef`; 4 existing callers (SettingsPane,
   QuickGuide, DetailPane, InstallInstructionsModal) unchanged.
3. **Home/End keys** — `handleMenuKeyDown` now handles 4 keys (was 2).
4. **`disabled` items** — `opacity-40 cursor-not-allowed`, skipped by
   keyboard nav, guarded in `handleItem`.
5. **Theme UI** — already present (toggle + per-mode picker, keepOpen).

Build passes, 64 tests pass.

**Browser verification needed:** Open menu, Tab wraps at boundaries
(last item → first), Home/End jump to first/last, disabled items
can't be clicked or focused via keyboard.

## 2026-04-16 — Repo color consistency fix + default dark theme

**Repo color fix:** `chartColors.js` active repo colors now filter out
achromatic tokens at runtime via `resolveActiveRepoColor()`. Monochrome
themes (lofi, black) had primary/secondary/accent as gray — identical to
the neutral used for internal/discontinued repos. The fix uses oklch
chroma detection (threshold 0.03) so only colorful tokens are assigned.
Status tokens (info/success/warning/error) are always colorful; identity
tokens (primary/secondary/accent) are included only when the active theme
gives them chroma. Neutral is excluded entirely from active-repo candidates.

**Strengthening pass:**
- Added `console.warn` in `resolveActiveRepoColor` fallback path (no
  stock theme triggers it, but surfaces broken custom themes)
- Added tripwire test (test 43/65) verifying expected colorful-token
  counts per theme — locks the threshold behavior against DaisyUI upgrades
- Updated stale docs (EMBED_IMPLEMENTATION.md, DAISYUI_V5_NOTES.md,
  CLAUDE.md) that referenced the old "8-slot" cycle

**Discovery — caramellatte neutral is warm brown, not gray:** Its
`--color-neutral` has oklch chroma 0.195 (hue 38, warm brown). At 60%
opacity, internal repos appear as semi-transparent warm brown, not gray.
This is by design — DaisyUI's neutral for caramellatte matches its warm
palette. The visual hierarchy (active > internal > discontinued) is still
maintained through opacity graduation. All other themes have gray or
near-gray neutrals (chroma < 0.04). Not a bug — noted for awareness.

**Default dark theme:** Changed from `black` to `dracula` in
`scripts/theme-config.js`. Generator propagated to index.html, themes.js,
styles.css.

## Pointers

- Architecture, paths, conventions, theming approach: `CLAUDE.md`
- Detailed change history: `docs/HISTORY.md`
- AI mistakes to avoid: `docs/AI_MISTAKES.md`
- DaisyUI v5 conventions: `docs/DAISYUI_V5_NOTES.md`
- Theme system reference: `docs/implementations/THEME_DARK_MODE.md`
- Source-of-truth theme catalog: `scripts/theme-config.js`
