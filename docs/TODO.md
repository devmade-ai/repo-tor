# TODO

Remaining tasks for Git Analytics Reporting System.

**Design:** See [DASHBOARD_V2_DESIGN.md](DASHBOARD_V2_DESIGN.md) for full specification.

---

## Backlog

### Embedding

1. [ ] Optional: Vite library build — entry point and config exist (`js/lib.js`, `vite.config.lib.js`, `npm run build:lib`) but needs testing with a consumer project, documentation, and npm publish setup

### Research

1. [ ] Device/platform attribution — investigated 2026-04-02, git does not store device info natively. Proxy indicators (email domain, timezone, commit message patterns) are weak signals. Would require a separate heuristic analysis module. Low priority unless a strong use case emerges.

### Data-viz palette (out of scope by design)

1. [ ] Chart.js `seriesColors` 20-color palette in `dashboard/js/chartColors.js` is intentionally hardcoded and embedder-customizable via `?colors=hex1,hex2,...` / `?palette=name`. Data-viz perceptual distinctness requires more colors than DaisyUI's 8 semantic tokens can provide, so there's no clean "migrate to tokens" path for multi-dataset charts. Documented here so a future audit doesn't re-open this as a gap — it's deliberate.

---

*Last updated: 2026-04-13 (round 3) — DaisyUI v5 component-class migration complete + custom-CSS sweep complete. `dashboard/styles.css` shrunk from 1531 → 1008 lines (-34%). Exactly 24 custom classes remain in styles.css, all with documented Tailwind-incompatible features (pseudo-elements, @keyframes, transform slide-overs, non-Tailwind transition values, data-viz gradient levels, CSS-load-failure survival, unshipped utilities). Every other styling decision is either a DaisyUI component class or a Tailwind utility inline at the JSX consumer. A strict allowlist test in `scripts/__tests__/daisyui-surfaces.test.mjs` fails if any new primary rule head appears in styles.css that isn't in the 24-class list.

*Previously: DaisyUI v5 component-class migration complete + all post-migration follow-ups shipped. 10 phases (modal, toast + alert, Health security alerts, Timeline work-pattern badges, card unshadow, btn unshadow, TabBar tabs/tab composition, form inputs select + input, HamburgerMenu audit, FilterSidebar listbox checkbox) + eight correctness/hygiene fixes from two audit passes: `select-bordered`/`input-bordered` v4 cruft removed, `stat-card` dead wrapper merged, Toast nested aria-live double-announce fixed, HamburgerMenu backdrop portaled to document.body, hardcoded Tailwind color shades replaced with DaisyUI semantic tokens, `.loading-spinner` shadow class removed, single-value progress bars migrated to native `<progress>`, dead marker classes `metric-selector` / `pin-btn` removed. Chart.js runtime theme-tracking: accent + muted resolve from `var(--color-primary)` / `var(--color-base-content)` via `chartColors.resolveRuntimeAccent()`, stored in `state.themeAccent` / `state.themeMuted`, consumed by chart components via `useApp()` so datasets re-memo and Chart.js re-renders on every theme change. Heatmap CSS migrated from `rgba(--chart-accent-rgb)` to `color-mix(in oklab, var(--chart-accent-override, var(--color-primary)) X%, transparent)` so cells track the active theme's primary color by default, with `--chart-accent-override` as the embedder pin. Test infrastructure: `scripts/__tests__/daisyui-surfaces.test.mjs` source-level tripwire (30 assertions, runs in every `npm test`), `dashboard/e2e/daisyui-surfaces.spec.js` Playwright runtime smoke (14 tests walking the TESTING_GUIDE checklist), `dashboard/e2e/visual/theme-baselines.spec.js` Playwright visual regression (48 screenshots = 6 tabs × 8 themes). `playwright.config.js` + `dashboard/e2e/README.md` document the full setup including sandboxed/system-Chromium fallback via `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH`. Combined with the prior full theming migration (8 registered themes, applyTheme() helper, single-source theme-config propagator), the dashboard now routes every user-visible surface through DaisyUI component classes with no custom classes shadowing DaisyUI's `@layer components` rules, zero hardcoded Tailwind color shades in JSX, zero dead marker classes, chart datasets that track the active theme at runtime, and three layers of automated regression coverage. See HISTORY.md for the full phase-by-phase changelog.*
