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

### Browser test coverage (future)

1. [ ] Re-introduce automated browser test coverage. Playwright was tried in April 2026 (`af0f02d test(daisyui): add three-layer automated regression coverage`) but never produced any baseline screenshots — the session that added it had no Chromium binary in its sandbox, and the spec files sat unrun until everything Playwright-related was deleted on 2026-04-15. When re-introducing browser tests:
    - **Decide the scope first.** The previous attempt set up two layers (functional smoke + visual regression with 48 baselines = 6 tabs × 8 themes). Visual regression has high maintenance cost (every legitimate UI change requires re-capturing baselines and visual review). Functional smoke tests are higher value-per-byte. Start with smoke only; add visual regression later if drift becomes a problem.
    - **Verify the runner can actually execute** in the target environment before writing specs. `npx playwright install --with-deps chromium` needs a CDN-reachable session and ~170 MB of disk space. CI (GitHub Actions) handles this via `microsoft/playwright-github-action` or the `mcr.microsoft.com/playwright` Docker image. Local dev requires a one-time install per developer.
    - **Existing source-level tripwire** (`scripts/__tests__/daisyui-surfaces.test.mjs`) catches DaisyUI class-name regressions, dead marker classes, hardcoded Tailwind color shades, v4 cruft, and built-CSS shipping checks via `node:test`. It runs in ~250ms with no browser. New browser tests should complement this layer, not replace it — anything that can be checked at the source level should stay at the source level.
    - **Reference for the previous attempt:** commit `af0f02d` includes `playwright.config.js`, `dashboard/e2e/daisyui-surfaces.spec.js` (14 functional tests), `dashboard/e2e/visual/theme-baselines.spec.js` (48 visual tests), and `dashboard/e2e/README.md` (setup recipe). All deleted on 2026-04-15. Resurrect from git history if useful as a starting point, but treat as a draft — most of the assertions reference DaisyUI v5 phase-by-phase migration markers that may have shifted with subsequent refactors.

---

*Last updated: 2026-04-15 — Playwright + e2e dir + visual baselines all removed. Source-level `node:test` tripwire is the only automated layer (60 tests). Full vanilla-DaisyUI sweep + post-sweep audit complete. `dashboard/styles.css` contains zero custom class definitions (down from 24); only documented element-selector exceptions (`*` font reset, `h1/h2/h3` mono headings, `body::before` decorative grid) remain. Tag chips use DaisyUI badge variants, Chart.js datasets resolve DaisyUI semantic CSS variables at runtime. Drawer architecture: 1 DaisyUI `drawer lg:drawer-open` for the filter sidebar + 2 stock-Tailwind fixed-positioned slide-over panes for detail/settings. See HISTORY.md for the phase-by-phase changelog.*
