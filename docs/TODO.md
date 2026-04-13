# TODO

Remaining tasks for Git Analytics Reporting System.

**Design:** See [DASHBOARD_V2_DESIGN.md](DASHBOARD_V2_DESIGN.md) for full specification.

---

## Backlog

### Embedding

1. [ ] Optional: Vite library build — entry point and config exist (`js/lib.js`, `vite.config.lib.js`, `npm run build:lib`) but needs testing with a consumer project, documentation, and npm publish setup

### Research

1. [ ] Device/platform attribution — investigated 2026-04-02, git does not store device info natively. Proxy indicators (email domain, timezone, commit message patterns) are weak signals. Would require a separate heuristic analysis module. Low priority unless a strong use case emerges.

### Test infrastructure (post-migration follow-up)

1. [ ] Browser-runtime smoke test for the DaisyUI component-class migration. The 2026-04-13 sweep was verified by `vite build` + grep against the built CSS — every migration phase passed those checks but no real browser was driven to click through the modals, toasts, and drawers. Add a Playwright (or similar) test that loads the built dashboard with `dashboard/public/data.json`, walks the TESTING_GUIDE "DaisyUI component-class migration" checklist (Phase 1 modal → Phase 10 listbox checkbox), and asserts each migrated surface renders with the expected DaisyUI class on the expected element. Should run in CI once configured.
2. [ ] Visual regression suite. Once the browser-runtime test exists, add a screenshot baseline (per theme — 4 light + 4 dark = 8 baselines) for each of the 6 dashboard tabs. Re-run on PRs to catch silent regressions if a future change re-introduces a shadow class or an unrecognized DaisyUI modifier (the same trap that the `select-bordered` v4 cruft fell into — visually correct but token unused).

### Chart.js theme-tracking (post-DaisyUI-migration follow-up)

1. [ ] Chart.js `accentColor` / `mutedColor` fallback is hardcoded in `dashboard/js/chartColors.js` — `DEFAULT_ACCENT = '#2D68FF'` (brand blue), `DEFAULT_ACCENT_MUTED = '#94a3b8'`. In non-default themes (e.g. `emerald` light, `dracula` dark) the single-accent charts (hour-of-day heatmap, weekday breakdown bar, some Timing charts) render in brand blue while the rest of the dashboard follows the active theme — a minor theme inconsistency. The `?accent=hex` URL param is the designed embedder-override escape hatch but doesn't fire for in-dashboard use. Fix would be to resolve `var(--color-primary)` via `getComputedStyle(document.documentElement).getPropertyValue('--color-primary')` in `themes.js applyTheme()` (already has the Chart.js defaults sync pattern for axis color + grid), store in a module-level mutable `dashboardAccent` export, and have `chartColors.js` fall through to it when no URL override is set. Chart instances would need to listen for theme changes and call `chart.update()` to re-paint — probably via a React context that exposes the resolved accent, so charts rebuild their `data` memo when it changes. Medium complexity, 20+ call sites across `sections/Timeline.jsx`, `sections/Timing.jsx`, `sections/Progress.jsx`, `sections/Contributors.jsx`. Deferred from the 2026-04-13 audit pass as scope-too-large — not a correctness bug, just off-brand single-accent charts in non-default themes.
2. [ ] Chart.js `seriesColors` 20-color palette in `dashboard/js/chartColors.js` is intentionally hardcoded and embedder-customizable via `?colors=hex1,hex2,...` / `?palette=name`. Data-viz perceptual distinctness requires more colors than DaisyUI's 8 semantic tokens can provide, so there's no clean "migrate to tokens" path for multi-dataset charts. Documented here so a future audit doesn't re-open this as a gap — it's deliberate.

---

*Last updated: 2026-04-13 — DaisyUI v5 component-class migration complete. All 10 phases shipped (modal, toast + alert, Health security alerts, Timeline work-pattern badges, card unshadow, btn unshadow, TabBar tabs/tab composition, form inputs select + input, HamburgerMenu audit, FilterSidebar listbox checkbox) plus eight follow-up fixes from two post-migration audit passes: (a) `select-bordered`/`input-bordered` v4 cruft removed (DaisyUI v5 makes border default — see `docs/DAISYUI_V5_NOTES.md`), (b) Summary.jsx `.stat-card` dead wrapper merged into the styled div, (c) Toast nested aria-live double-announce fixed by removing the container's redundant aria-live (per-item role="alert"/role="status" already implies a live region), (d) HamburgerMenu backdrop + dropdown portaled to document.body via createPortal so they escape the `.dashboard-header` stacking context, (e) hardcoded Tailwind color classes (`bg-green-500`, `bg-red-500`, etc.) replaced with DaisyUI semantic tokens (`bg-success`, `bg-error`, `bg-warning`, `bg-info`, `bg-primary`, `bg-secondary`, `bg-accent`, `bg-neutral`) across all data-viz categories so colors track the active theme, (f) `.loading-spinner` custom class shadow removed and all consumers migrated to DaisyUI `loading loading-spinner loading-{size}`, (g) single-value progress bars migrated from two-div wrapper+fill pattern to native `<progress className="progress progress-{primary|info}">` with free screen-reader announcements, (h) dead `metric-selector` / `pin-btn` marker classes removed from Discover.jsx (same dead-marker trap as the earlier `stat-card` fix). Combined with the prior full theming migration (8 registered themes, applyTheme() helper, single-source theme-config propagator), the dashboard now routes every user-visible surface through DaisyUI component classes with no custom classes shadowing DaisyUI's `@layer components` rules, zero hardcoded Tailwind color shades in JSX, and zero dead marker classes. See HISTORY.md for the full phase-by-phase changelog.*
