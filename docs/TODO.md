# TODO

Remaining tasks for Git Analytics Reporting System.

**Design:** See [DASHBOARD_V2_DESIGN.md](DASHBOARD_V2_DESIGN.md) for full specification.

---

## Backlog

### Embedding

1. [ ] Optional: Vite library build — entry point and config exist (`js/lib.js`, `vite.config.lib.js`, `npm run build:lib`) but needs testing with a consumer project, documentation, and npm publish setup

### Research

1. [ ] Device/platform attribution — investigated 2026-04-02, git does not store device info natively. Proxy indicators (email domain, timezone, commit message patterns) are weak signals. Would require a separate heuristic analysis module. Low priority unless a strong use case emerges.

### Post-sweep verification

1. [ ] Live browser verification — none of the vanilla-DaisyUI sweep changes have been tested in an actual browser. Specifically: the `grid-cols-[auto_repeat(7,1fr)]` Timing heatmap row alignment, the DaisyUI `collapse collapse-arrow` CollapsibleSection animation, the simplified drawer architecture (1 DaisyUI drawer for filter + 2 fixed-positioned slide-over panes for detail/settings), and the per-section `data-embed-wrapper` traversal in EmbedRenderer. Open in a browser, switch through all 8 themes, exercise each pane open/close, verify charts re-colour on theme switch.
2. [ ] Live browser verification of the 2026-04-15 audit-cleanup pass — specifically the SettingsPane `<fieldset>` + native radio refactor (View Level rows: bullet on the right, label takes full row, keyboard arrow keys move focus between options), the `Progress.jsx` semver doughnut `h-45 sm:h-50` utility (should match the previous `180px / 200px` inline height across the sm breakpoint), and the `Header.jsx handleOpenFilters` → `OPEN_FILTER_SIDEBAR` action (clicking the "Filtered" link in the header should open the sidebar regardless of current state, no toggle behaviour).
3. [ ] Live browser verification of the file-extraction refactors — `TimingHeatmap.jsx` (split from `Timing.jsx`), `DebugTabs.jsx` + `debugStyles.js` (split from `DebugPill.jsx`), `discoverData.js` (split from `Discover.jsx`), and `useTimelineCharts.js` (split from `Timeline.jsx`). Each split is a pure code-organization refactor with no behavioural change intended; spot-check that all four sections still render correctly and that chart memos rebuild on theme switch.

### Investigations

1. [ ] **`scripts/aggregate.js` data flow** — this script writes `dashboard/{commits,files,contributors,metadata,summary}.json` (lines 411-415) but no JS module under `dashboard/js/` imports from those JSON files. The active aggregator is `scripts/aggregate-processed.js` which writes to `dashboard/public/data/`. Either:
    - **(a) `aggregate.js` is dead** — the legacy pre-aggregator was supposed to be replaced by `aggregate-processed.js` and the leftover JSON files in `dashboard/` are stale artefacts. If so, delete the script + the 5 JSON files + any references in package.json scripts and HISTORY.md.
    - **(b) `aggregate.js` is still used out-of-tree** — by an external CI workflow or a manual data extraction recipe documented in `docs/DATA_OPERATIONS.md`. If so, document the consumer in the script's header block and add a comment explaining why the JSON outputs aren't imported by the dashboard.
   Investigation steps: grep `aggregate.js` references across the repo (npm scripts, GitHub Actions, docs/), check `git log -- scripts/aggregate.js` for the most recent change, and ask the user if they recall when the script was last run.

### Browser test coverage (future)

1. [ ] Re-introduce automated browser test coverage. Playwright was tried in April 2026 (`af0f02d test(daisyui): add three-layer automated regression coverage`) but never produced any baseline screenshots — the session that added it had no Chromium binary in its sandbox, and the spec files sat unrun until everything Playwright-related was deleted on 2026-04-15. When re-introducing browser tests:
    - **Decide the scope first.** The previous attempt set up two layers (functional smoke + visual regression with 48 baselines = 6 tabs × 8 themes). Visual regression has high maintenance cost (every legitimate UI change requires re-capturing baselines and visual review). Functional smoke tests are higher value-per-byte. Start with smoke only; add visual regression later if drift becomes a problem.
    - **Verify the runner can actually execute** in the target environment before writing specs. `npx playwright install --with-deps chromium` needs a CDN-reachable session and ~170 MB of disk space. CI (GitHub Actions) handles this via `microsoft/playwright-github-action` or the `mcr.microsoft.com/playwright` Docker image. Local dev requires a one-time install per developer.
    - **Existing source-level tripwire** (`scripts/__tests__/daisyui-surfaces.test.mjs`) catches DaisyUI class-name regressions, dead marker classes, hardcoded Tailwind color shades, v4 cruft, and built-CSS shipping checks via `node:test`. It runs in ~250ms with no browser. New browser tests should complement this layer, not replace it — anything that can be checked at the source level should stay at the source level.
    - **Reference for the previous attempt:** commit `af0f02d` includes `playwright.config.js`, `dashboard/e2e/daisyui-surfaces.spec.js` (14 functional tests), `dashboard/e2e/visual/theme-baselines.spec.js` (48 visual tests), and `dashboard/e2e/README.md` (setup recipe). All deleted on 2026-04-15. Resurrect from git history if useful as a starting point, but treat as a draft — most of the assertions reference DaisyUI v5 phase-by-phase migration markers that may have shifted with subsequent refactors.

---

*Last updated: 2026-04-15 — completed the full audit-cleanup pass on the `claude/migrate-daisyui-dark-mode-toG0Y` branch (13 commits). All 18 audit findings addressed, including the previously-deferred file refactors: `Timing.jsx` (573→436), `DebugPill.jsx` (527→200), `Discover.jsx` (711→430), `Timeline.jsx` (735→390) — every section component is now under the 500-line soft-limit. `HISTORY.md` split into active (April 2026) + archive (pre-April), `SESSION_NOTES.md` rewritten as a 77-line compact snapshot, `styles.css` trimmed 521→164 lines. Zero custom CSS classes, zero dead exports, every documented exception in CLAUDE.md has a per-entry rationale. Source-level `node:test` tripwire is the only automated layer (60 tests). See HISTORY.md for the phase-by-phase changelog.*
