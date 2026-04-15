# Session Notes

Compact context snapshot for AI continuity. Rewritten 2026-04-15 at the
end of the `claude/migrate-daisyui-dark-mode-toG0Y` audit-cleanup pass.
Detailed history lives in `docs/HISTORY.md` and the git log.

## Current State

**Branch:** `claude/migrate-daisyui-dark-mode-toG0Y` (ahead of `main`).

**Dashboard V2:** Stable. Role-based view levels (Executive / Management /
Developer), DaisyUI v5 dual-layer theming following
`docs/implementations/THEME_DARK_MODE.md` Approach A (per-mode independent
themes, 4 light + 4 dark in the curated catalog), PWA support, embed
mode via `?embed=chart-id`, single `node:test` source-level tripwire
(60 tests, ~250 ms, no browser).

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

**Current file-size posture (all under 500-line soft-limit):**
- Largest section: `Progress.jsx` 479
- Largest component: `App.jsx` 490
- Largest shared module: `useTimelineCharts.js` 416 (TODO item
  monitors for growth)
- Largest state file: `AppContext.jsx` 338 + `appReducer.js` 285 (was
  single 579-line file)
- `styles.css` 167 (after the third-pass trim of two element-selector
  rules)

## Open Items For Next Session

- **`scripts/aggregate.js`** — investigate whether this pre-aggregator is
  still part of the live workflow. It writes
  `dashboard/{commits,files,contributors,metadata,summary}.json` which
  no JS module imports. Either the data flow has been quietly replaced by
  `aggregate-processed.js` (in which case both the script and the JSON
  files can be deleted) or there's an out-of-tree consumer that needs
  documenting.
- **Live browser verification** of the SettingsPane radio + UTC toggle
  refactor. Structurally correct and unit-tested but not opened in
  `npm run dev`. Quick check: open Settings pane, click each ViewLevel
  row, toggle UTC, confirm radio bullet renders on the right and the
  toggle pill animates in all 8 themes.
- **`docs/TODO.md`** carries everything else flagged during the audit.

## Pointers

- Architecture, paths, conventions, theming approach: `CLAUDE.md`
- Detailed change history: `docs/HISTORY.md`
- AI mistakes to avoid: `docs/AI_MISTAKES.md`
- DaisyUI v5 conventions: `docs/DAISYUI_V5_NOTES.md`
- Theme system reference: `docs/implementations/THEME_DARK_MODE.md`
- Source-of-truth theme catalog: `scripts/theme-config.js`
