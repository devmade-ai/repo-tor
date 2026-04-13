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

---

*Last updated: 2026-04-13 — DaisyUI v5 component-class migration complete. All 10 phases shipped (modal, toast + alert, Health security alerts, Timeline work-pattern badges, card unshadow, btn unshadow, TabBar tabs/tab composition, form inputs select + input, HamburgerMenu audit, FilterSidebar listbox checkbox) plus three follow-up fixes from the post-migration audit: (a) `select-bordered`/`input-bordered` v4 cruft removed (DaisyUI v5 makes border default — see `docs/DAISYUI_V5_NOTES.md`), (b) Summary.jsx `.stat-card` dead wrapper merged into the styled div, (c) Toast nested aria-live double-announce fixed by removing the container's redundant aria-live (per-item role="alert"/role="status" already implies a live region), (d) HamburgerMenu backdrop + dropdown portaled to document.body via createPortal so they escape the `.dashboard-header` stacking context (closes the long-standing "Stacking Context" TODO entry). Combined with the prior full theming migration (8 registered themes, applyTheme() helper, single-source theme-config propagator), the dashboard now routes every user-visible surface through DaisyUI component classes with no custom classes shadowing DaisyUI's `@layer components` rules. See HISTORY.md for the full phase-by-phase changelog.*
