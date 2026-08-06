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

1. [ ] **`dashboard/js/pwa.js`** is 593 lines — over the 500-line soft-limit. History: flagged at 578 by the 2026-04 file-size sweep; the `pwaInstructions.js` extraction (2026-04-15) brought it down to 469; the 2026-07-21 auto-on-launch update-policy additions (launch-apply, version.json launch reload, auto-update preference) pushed it back to 593. Not a strong-limit violation (800) yet. Remaining split candidates:
    - **Install flow** — `installPWA()`, `dismissInstall()`, `isInstallDismissed()`, the `beforeinstallprompt` capture logic, and the manual-install detection for Safari/Firefox.
    - **Update flow** — `applyUpdate()`, `checkForUpdate()`, `checkVersionJson()`, the auto-update preference, `stopUpdatePolling()`, and the `virtual:pwa-register` wiring + update-available event emission.
   Suggested split: `pwa.js` (install flow + event bridge) + `pwaUpdate.js` (update flow). Deferred during the update-policy work because the two flows share module state (`_updateAvailable`, `_userClickedUpdate`, `wasJustUpdated()`, the HMR AbortController) — splitting requires a small shared-state module or accessor layer, a structural change beyond that task's contract.

2. [ ] **`scripts/extract-api.js`** is 699 lines — over the 500-line soft-limit but under the 800-line strong-refactor threshold. Out of scope for the audit pass. Monitor for growth; split candidates are the GitHub API pagination helpers, the rate-limit handling, and the commit-shape normaliser that maps the API response into the same structure `extract.js` uses for local git logs.

   *(The earlier "split aggregate-processed.js" entry was removed 2026-04-29: the file is 597 lines after the lib/aggregateCalcs.js + lib/aggregateTimeWindows.js extraction landed before this branch, well under the 800-line threshold. The TODO entry predated the extraction.)*

3. [ ] **`dashboard/js/hooks/useTimelineCharts.js`** is 416 lines after the 2026-04-15 extraction. It sits under the 500-line soft-limit with ~84 lines of headroom. Not actionable today — but if any new Timeline chart is added (or one of the existing five grows), consider splitting the five useMemo blocks into two hooks:
    - `useTimelineBars` — the 60-day stacked bar charts (`activityChartData`, `codeChangesChartData`) that share data-shape logic
    - `useTimelineTrends` — the monthly trend charts (`urgencyTrendData`, `debtTrendData`, `impactTrendData`) that share the `excludeIncompleteLastMonth` helper and the cross-chart `sortedMonths` x-axis alignment
   The split would cleanly follow existing semantic groupings (bars vs trends) and leave each hook at roughly 200 lines.

4. [ ] **`dashboard/js/AppContext.jsx`** is 338 lines after the 2026-04-15 `appReducer.js` extraction, well under the soft-limit. Monitor for growth — if a future feature adds more effects/useMemo blocks to the provider, consider extracting one of: the persistence-effects cluster (4 small useEffect blocks that mirror reducer state to localStorage), the theme cross-tab sync cluster (darkMode effect + storage listener + matchMedia fallback), or the `filterOptions` computation. Each is self-contained and could become its own custom hook.

### Browser test coverage (future)

1. [ ] Re-introduce automated browser test coverage. Playwright was tried in April 2026 (`af0f02d test(daisyui): add three-layer automated regression coverage`) but never produced any baseline screenshots — the session that added it had no Chromium binary in its sandbox, and the spec files sat unrun until everything Playwright-related was deleted on 2026-04-15. When re-introducing browser tests:
    - **Decide the scope first.** The previous attempt set up two layers (functional smoke + visual regression with 48 baselines = 6 tabs × 8 themes). Visual regression has high maintenance cost (every legitimate UI change requires re-capturing baselines and visual review). Functional smoke tests are higher value-per-byte. Start with smoke only; add visual regression later if drift becomes a problem.
    - **Verify the runner can actually execute** in the target environment before writing specs. `npx playwright install --with-deps chromium` needs a CDN-reachable session and ~170 MB of disk space. CI (GitHub Actions) handles this via `microsoft/playwright-github-action` or the `mcr.microsoft.com/playwright` Docker image. Local dev requires a one-time install per developer.
    - **Existing source-level tripwire** (`scripts/__tests__/daisyui-surfaces.test.mjs`) catches DaisyUI class-name regressions, dead marker classes, hardcoded Tailwind color shades, v4 cruft, and built-CSS shipping checks via `node:test`. It runs in ~250ms with no browser. New browser tests should complement this layer, not replace it — anything that can be checked at the source level should stay at the source level.
    - **Reference for the previous attempt:** commit `af0f02d` includes `playwright.config.js`, `dashboard/e2e/daisyui-surfaces.spec.js` (14 functional tests), `dashboard/e2e/visual/theme-baselines.spec.js` (48 visual tests), and `dashboard/e2e/README.md` (setup recipe). All deleted on 2026-04-15. Resurrect from git history if useful as a starting point, but treat as a draft — most of the assertions reference DaisyUI v5 phase-by-phase migration markers that may have shifted with subsequent refactors.

---

*Last updated: 2026-04-15 — four audit-cleanup passes complete on the `claude/migrate-daisyui-dark-mode-toG0Y` branch. First pass (13 commits): four section-component extractions, HISTORY/SESSION_NOTES rewrites, styles.css trim. Second pass (8 commits): 20 fresh-eyes findings — exception list expansion, 9 more dead exports, chartHeight → utilities, body bg/color removal, AppContext split. Third pass (6 commits): exception strengthening — element-selector exceptions 3→1, hex exceptions 3→2, inline-style exceptions 2→1, aggregate.js investigation resolved. Fourth pass (4 commits): retrospective findings — tripwire strengthened with 3 new regression guards (bracket-value allowlist, hex-literal scope, JSX heading font-mono requirement; test count 60→63), file-size sweep caught 3 oversized files the audit missed (`pwa.js` 578, `aggregate-processed.js` 1042, `extract-api.js` 699 — all flagged in file-size monitoring), CLAUDE.md scope note added for `dashboard/index.html` pre-React inline styles. Final state: 8 documented exceptions in CLAUDE.md each with capability-gap or resilience rationale, zero custom CSS classes, zero known dead exports in `dashboard/js/`, 63 tripwire tests running in ~260ms, branch delta of 45 commits across 4 passes. See `git log` for the phase-by-phase changelog.*

## PWA pattern audit — 2026-08-03

Repo-side findings from a fleet-wide audit of every devmade-ai PWA against the
gp-props implementation patterns. The pattern-side learnings are already folded
back into those docs, so **fetch the current pattern before starting any item**:

```bash
curl -sf "https://gp-props.vercel.app/patterns/PWA_SYSTEM.md"
curl -sf "https://gp-props.vercel.app/patterns/PWA_ICON_CACHE_BUST.md"
```

Line references were accurate at audit time. Severity-ordered.

**The service-worker fault found by this audit is already fixed** (PR #120): the
precache manifest carried two entries per icon with different revisions, so
`addToCacheList` threw and the worker ran live but completely inert — zero caches,
and every route after the throwing line (including all `runtimeCaching`) never
registered. Verified in Chromium: 0 cache entries before, 17 after. The items below
are what remains.

1. [ ] **Dead code documenting a feature that does not exist.**
   `vite.config.js:232-239` states that "for embed URLs (denylist skips
   navigateFallback), a runtimeCaching rule catches failed navigation with a
   NetworkOnly handler + offline fallback" — **there is no such rule** in
   `runtimeCaching`. `public/offline.html` is precached by `**/*.html` and can never
   be served. Either implement the rule or delete the comment and the file.
2. [ ] **Fix the runtime-cache expiration on the dashboard data.**
   `vite.config.js:249-252,262-267` sets `maxAgeSeconds: 7 days` on two NetworkFirst
   caches whose *only* purpose is offline fallback. Workbox's expiration plugin
   returns `null` for an expired entry, so after seven days offline the dashboard has
   **no data at all** — the cache that exists to survive network loss deletes itself
   exactly when it is the only copy. NetworkFirst already guarantees freshness; use
   `maxEntries` for quota and drop `maxAgeSeconds`.
3. [ ] **Add `networkTimeoutSeconds` (3–5s) to both NetworkFirst routes.** Without
   it they only degrade on *hard* offline — on a captive portal or one-bar cell
   `navigator.onLine` is `true`, the fetch hangs, and the cache is never reached. The
   only backstop today is the app-level 30s abort, so a user with a perfectly good
   cached dashboard watches a spinner for 30 seconds and then gets an error.
4. [ ] **Guard the data routes against a cached app shell.** Workbox's default
   `cacheWillUpdate` accepts any status-200 response, so a rewrite that answers a
   missing `/data-commits/2024-01.json` with `index.html` stores HTML under the JSON
   URL for the whole TTL. `App.jsx:184` content-type-checks `data.json` but **not**
   the month shards. Add `cacheableResponse: { statuses: [200] }` plus a
   content-type check.
5. [ ] **The `?data=<url>` parameter has no runtime rule** unless the remote file
   happens to be named `data.json`. Installed + offline + `?data=` is an empty
   dashboard. Use a `urlPattern` *function* when the origin is not fixed.
6. [ ] **Add a staleness affordance.** For a dashboard whose entire content is
   remote, "Showing saved data from Tuesday" is the difference between "this app is
   broken" and "you're offline". There is no such surface today.
7. [ ] **`registration.update()` is uncaught** at `pwa.js:518` (hourly) and `:570`
   (visibility) — it rejects routinely when offline. `dashboard/index.html:373` gets
   this right, so the discipline exists in the repo. The visibility check is also
   unthrottled.
8. [ ] **`applyUpdate()` has no plain-reload fallback** (`pwa.js:395-402`) — and
   `checkVersionJson` can report `'update-available'` from `version.json` alone with
   no SW change at all, so the "Update Now" menu item silently does nothing.
9. [ ] **`_isChecking` is set but never read** (`pwa.js:439-467`) — two menu taps run
   two concurrent checks, and the first `finally` clears the flag while the second is
   still running. Share one in-flight promise.
10. [ ] **Smaller:** `onNeedRefresh` returns before recording the update;
    `setAutoUpdateEnabled` does not read back yet the toast unconditionally claims the
    new state; `installPWA()` does not await `prompt()` and the throw propagates into
    an uncaught `await` in `Header.jsx:120`; the inline capture in
    `dashboard/index.html:420-427` has no attach guard; `vercel.json` is missing the
    `/workbox-(.*)` immutable rule; `assets/images/{adaptive-icon,splash-icon}.png`
    and a duplicate `apple-touch-icon.png` are Expo-era leftovers precached for every
    client.

**Promoted into the fleet pattern from this repo:** the pre-module service-worker
self-heal ladder (now the recommended answer to every fatal-and-silent SW failure,
including the attempt cap, fail-closed storage access and clear-on-success), the
default-deny formulation for Vercel cache headers, the SPA rewrite regex that
excludes any path with a file extension, `Service-Worker-Allowed`, and reading
`registration.installing` in the update verdict.

## Follow-ups from the 2026-08-03 SEO audit

1. [ ] **Decide whether private-repo commit bodies should be published at all.**
   `dashboard/public/data-commits/*.json` (6.1 MB) contains commit `subject` and
   `body` for repositories `config/repos.json` annotates as *"Private
   repository"*. The audit fix added `X-Robots-Tag: noindex` so they stay out of
   search results — **that is not access control.** Anyone with the URL can still
   fetch them. Either that content is fine to publish (say so explicitly in
   `CLAUDE.md`), or the aggregator should redact bodies for repos marked private.
2. [ ] **No Open Graph, no Twitter tags, no card asset.** Pasted dashboard links
   render as a bare URL. Needs a 1200×630 card (`sharp` is already a dependency)
   plus the full tag set — see DISCOVERABILITY.md Step 4.
3. [ ] **`?embed=` variants are indexable duplicates.** `dashboard/js/urlParams.js`
   renders chrome-less charts at the same URL with a query parameter. Vercel
   header `source:` cannot match query strings, so this needs a canonical back to
   `/` (or a `noindex`) emitted from inside the app.
4. [ ] **No canonical and no sitemap.** The apex, the `*.vercel.app` alias and
   every preview alias currently serve byte-identical pages with nothing electing
   a winner.
5. [ ] **No SEO tripwire.** Every item above is invisible to the current gate.
