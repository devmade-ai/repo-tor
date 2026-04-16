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
2. [ ] Live browser verification of the 2026-04-15 first audit-cleanup pass — specifically the SettingsPane `<fieldset>` + native radio refactor (View Level rows: bullet on the right, label takes full row, keyboard arrow keys move focus between options), the `Progress.jsx` semver doughnut `h-45 sm:h-50` utility (should match the previous `180px / 200px` inline height across the sm breakpoint), and the `Header.jsx handleOpenFilters` → `OPEN_FILTER_SIDEBAR` action (clicking the "Filtered" link in the header should open the sidebar regardless of current state, no toggle behaviour).
3. [ ] Live browser verification of the file-extraction refactors — `TimingHeatmap.jsx` (split from `Timing.jsx`), `DebugTabs.jsx` + `debugStyles.js` (split from `DebugPill.jsx`), `discoverData.js` (split from `Discover.jsx`), and `useTimelineCharts.js` (split from `Timeline.jsx`). Each split is a pure code-organization refactor with no behavioural change intended; spot-check that all four sections still render correctly and that chart memos rebuild on theme switch.
4. [ ] Live browser verification of the 2026-04-15 second audit-cleanup pass. Four items to spot-check:
    - **`chartHeight` → utility classes**: Timeline/Progress use `h-55 sm:h-75` (220px / 300px, exact match). Timing uses `h-50 sm:h-62` (200px / 248px — 2px under the previous 250px). Tags uses `h-62 sm:h-87` (248px / 348px — 2px under the previous 250/350). Visual delta should be imperceptible; confirm across all 8 themes that the chart containers render at the expected size and no content clips.
    - **Body bg/color redundancy removal** (`dashboard/styles.css`): the `body { background-color / color }` pair was removed because DaisyUI v5's base layer sets `background: var(--page-scroll-bg, var(--root-bg))` on `:root, [data-theme]` (verified in `node_modules/daisyui/base/rootcolor.css`). Open the dashboard and verify the viewport background matches each theme's `--color-base-100` value (lofi = white, black = black, nord = light blue-grey, coffee = dark warm brown, etc.). If any theme now shows the wrong bg, the DaisyUI behaviour differs from our assumption — restore the body rule.
    - **AppContext / appReducer split**: no visible change expected. Verify filters still apply, dark mode still toggles, cross-tab sync still works (open two tabs, toggle theme in one, confirm the other updates). The reducer logic was moved wholesale, not rewritten.
    - **Timeline `handleCardClick` micro-fix**: clicking the "Contributors" summary card at the bottom of the Timeline tab should open the detail pane with the correct author count in the subtitle. Compare against a known count from the raw data.

### File-size monitoring

1. [ ] **`dashboard/js/pwa.js`** is 578 lines — **already over the 500-line soft-limit**, missed by the three audit passes because they focused on section components and never ran a file-size sweep over the top-level `dashboard/js/*.js` modules. Not a strong-limit violation (800) yet but should be split before it grows. The file has multiple responsibilities that could be separated:
    - **Install flow** — `installPWA()`, `dismissInstall()`, `isInstallDismissed()`, the `beforeinstallprompt` capture logic, and the manual-install detection for Safari/Firefox.
    - **Update flow** — `applyUpdate()`, `checkForUpdate()`, `stopUpdatePolling()`, and the `workbox-window` wiring + update-available event emission.
    - **Install-instructions content** — `getInstallInstructions()` returns per-browser step text; a pure data module candidate.
    - **Event-based pub/sub** — the `window.addEventListener` / `dispatchEvent` layer that bridges the vanilla PWA API with React (AppContext listens for `pwa-install-ready` / `pwa-update-available` etc.).
   Suggested split: `pwa.js` (install flow) + `pwaUpdate.js` (update flow) + `pwaInstructions.js` (per-browser instructions data). The event-bridge can stay with the install flow since the install-ready event is its primary emitter.

2. [ ] **`scripts/aggregate-processed.js`** is 1042 lines — **over the 800-line strong-refactor threshold** from CLAUDE.md "Code Organization". Not touched by the audit pass (`scripts/` was out of scope). Active data pipeline for the dashboard — it reads `processed/` and writes `dashboard/public/data/`. Should be split before it grows further. Without reading the whole file in detail, likely split points include:
    - Commit-reading loop (reads `processed/<repo>/commits/*.json`, validates, collects)
    - Per-repo summary builder (code stats, tag breakdowns, urgency/complexity distributions, hourly heatmap)
    - Aggregated-summary builder (combines per-repo summaries into cross-repo totals)
    - Time-windowed output writer (per-month commit files, daily/weekly/monthly pre-aggregations)
    - Author normalization (author-map.json lookup + canonical id assignment)
   Suggested directory: `scripts/aggregate/` with `read-commits.js`, `summary.js`, `time-windows.js`, `authors.js`, and a thin top-level `aggregate-processed.js` that orchestrates them.

3. [ ] **`scripts/extract-api.js`** is 699 lines — over the 500-line soft-limit but under the 800-line strong-refactor threshold. Out of scope for the audit pass. Monitor for growth; split candidates are the GitHub API pagination helpers, the rate-limit handling, and the commit-shape normaliser that maps the API response into the same structure `extract.js` uses for local git logs.

4. [ ] **`dashboard/js/hooks/useTimelineCharts.js`** is 416 lines after the 2026-04-15 extraction. It sits under the 500-line soft-limit with ~84 lines of headroom. Not actionable today — but if any new Timeline chart is added (or one of the existing five grows), consider splitting the five useMemo blocks into two hooks:
    - `useTimelineBars` — the 60-day stacked bar charts (`activityChartData`, `codeChangesChartData`) that share data-shape logic
    - `useTimelineTrends` — the monthly trend charts (`urgencyTrendData`, `debtTrendData`, `impactTrendData`) that share the `excludeIncompleteLastMonth` helper and the cross-chart `sortedMonths` x-axis alignment
   The split would cleanly follow existing semantic groupings (bars vs trends) and leave each hook at roughly 200 lines.

5. [ ] **`dashboard/js/AppContext.jsx`** is 338 lines after the 2026-04-15 `appReducer.js` extraction, well under the soft-limit. Monitor for growth — if a future feature adds more effects/useMemo blocks to the provider, consider extracting one of: the persistence-effects cluster (4 small useEffect blocks that mirror reducer state to localStorage), the theme cross-tab sync cluster (darkMode effect + storage listener + matchMedia fallback), or the `filterOptions` computation. Each is self-contained and could become its own custom hook.

### Browser test coverage (future)

1. [ ] Re-introduce automated browser test coverage. Playwright was tried in April 2026 (`af0f02d test(daisyui): add three-layer automated regression coverage`) but never produced any baseline screenshots — the session that added it had no Chromium binary in its sandbox, and the spec files sat unrun until everything Playwright-related was deleted on 2026-04-15. When re-introducing browser tests:
    - **Decide the scope first.** The previous attempt set up two layers (functional smoke + visual regression with 48 baselines = 6 tabs × 8 themes). Visual regression has high maintenance cost (every legitimate UI change requires re-capturing baselines and visual review). Functional smoke tests are higher value-per-byte. Start with smoke only; add visual regression later if drift becomes a problem.
    - **Verify the runner can actually execute** in the target environment before writing specs. `npx playwright install --with-deps chromium` needs a CDN-reachable session and ~170 MB of disk space. CI (GitHub Actions) handles this via `microsoft/playwright-github-action` or the `mcr.microsoft.com/playwright` Docker image. Local dev requires a one-time install per developer.
    - **Existing source-level tripwire** (`scripts/__tests__/daisyui-surfaces.test.mjs`) catches DaisyUI class-name regressions, dead marker classes, hardcoded Tailwind color shades, v4 cruft, and built-CSS shipping checks via `node:test`. It runs in ~250ms with no browser. New browser tests should complement this layer, not replace it — anything that can be checked at the source level should stay at the source level.
    - **Reference for the previous attempt:** commit `af0f02d` includes `playwright.config.js`, `dashboard/e2e/daisyui-surfaces.spec.js` (14 functional tests), `dashboard/e2e/visual/theme-baselines.spec.js` (48 visual tests), and `dashboard/e2e/README.md` (setup recipe). All deleted on 2026-04-15. Resurrect from git history if useful as a starting point, but treat as a draft — most of the assertions reference DaisyUI v5 phase-by-phase migration markers that may have shifted with subsequent refactors.

---

*Last updated: 2026-04-15 — three audit-cleanup passes complete on the `claude/migrate-daisyui-dark-mode-toG0Y` branch. First pass (13 commits, 4a8bd00–fd0985b): 18 findings, four section-component extractions, HISTORY/SESSION_NOTES rewrites, styles.css trim. Second pass (8 commits, 09ca333–5ecfad7): 20 fresh-eyes findings — exception list expansion, 9 more dead exports, chartHeight → utilities, body bg/color removal, AppContext split. Third pass (6 commits, 12cd65d–`<consolidation>`): exception strengthening — the Tier-4 "arguably removable" exceptions were actually removed. Element-selector exceptions in styles.css trimmed from 3 to 1; hex literal exceptions trimmed from 3 to 2; static inline-style exceptions trimmed from 2 to 1; aggregate.js investigation resolved (script kept, 5 stale dashboard/ JSON artefacts deleted). Final state: 8 documented exceptions in CLAUDE.md, every one with a stated capability-gap or resilience rationale — no pure design-preference exceptions remain. Zero custom CSS classes (down from 24 during migration), zero known dead exports, every section + shared component under the 500-line soft-limit, source-level `node:test` tripwire running 60 tests in ~250ms. See HISTORY.md for the phase-by-phase changelog.*
