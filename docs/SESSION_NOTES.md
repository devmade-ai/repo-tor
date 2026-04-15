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

**Second pass — follow-on cleanup commits (fresh-eyes audit caught gaps
in the first pass):**

- **`09ca333`** — CLAUDE.md exceptions expanded again: debug subsystem
  covers new subdirectory, TimingHeatmap path fix, root ErrorBoundary
  inline-style exception, ADMIN_GUIDE.md added to docs table.
- **`3520a6f`** — Dead-code sweep round 2: deleted `debugGetEntries`,
  `diagnoseFailure`, `formatNumber`, `aggregateForDrilldown`, `DAY_NAMES`,
  and `useClickOutside.js`; unexported `SA_HOLIDAYS`, `aggregateByTag`,
  `getRepoColor`, `SOURCE_COLORS`, `SEVERITY_COLORS`. Six files touched.
- Subsequent commits in the second pass (doc drift, chartHeight
  utilities, Timeline handleCardClick, body-rule investigation,
  AppContext split, TODO monitoring) — see `git log` on the branch for
  the full list.

Build + tests pass after every commit.

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
