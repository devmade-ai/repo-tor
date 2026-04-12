# TODO

Remaining tasks for Git Analytics Reporting System.

**Design:** See [DASHBOARD_V2_DESIGN.md](DASHBOARD_V2_DESIGN.md) for full specification.

---

## Backlog

### Embedding

1. [ ] Optional: Vite library build — entry point and config exist (`js/lib.js`, `vite.config.lib.js`, `npm run build:lib`) but needs testing with a consumer project, documentation, and npm publish setup

### Stacking Context

1. [ ] Hamburger menu backdrop trapped in header stacking context — `.dashboard-header` (z-21) creates a stacking context, trapping the backdrop (z-40) and dropdown (z-50) at effective z-21 from the document level. Drawers (z-30) render above the backdrop. Fix: portal the backdrop/dropdown outside the header, or use a document-level click handler. Low priority — the menu auto-closes on item selection, so overlap with drawers is rare in practice.

### Research

1. [ ] Device/platform attribution — investigated 2026-04-02, git does not store device info natively. Proxy indicators (email domain, timezone, commit message patterns) are weak signals. Would require a separate heuristic analysis module. Low priority unless a strong use case emerges.

### DaisyUI migration — optional follow-up

All six reference phases (Phase 0 Prerequisites → Phase 1 Audit → Phase 2 Variable Removal → Phase 3 Component Migration → Phase 4 Z-Index → Phase 5 Verification → Phase 6 Cleanup) shipped 2026-04-12. The remaining item below is **optional** — it would reduce custom CSS further but the theming migration is already complete.

1. [ ] **Component class migration to DaisyUI component classes** — replace raw Tailwind / custom-class elements with DaisyUI component classes: `<button>` → `btn btn-{primary|ghost|outline}`, `<input>` → `input input-bordered`, `<select>` → `select select-bordered`, cards → `card` + `card-body`, colored small labels → `badge badge-{variant}`, alert blocks → `alert alert-{variant}`. Current status: custom CSS classes (`.btn-primary`, `.card`, `.filter-select`, etc.) use DaisyUI tokens internally, which is functionally correct. Swapping to DaisyUI component classes would let us delete more custom CSS but requires careful visual review of padding, border-radius, and interactive states.
2. [ ] **PWA meta theme-color build script** — `scripts/generate-theme-meta.mjs` (see reference doc `docs/implementations/THEME_DARK_MODE.md` for template) — only needed if we register more than 2 themes. With just lofi/black, the hardcoded `#ffffff`/`#000000` values in `index.html` and `AppContext.jsx` are manageable. If we ever add a third theme, use the build script to generate hex values from DaisyUI's oklch definitions automatically.

---

*Last updated: 2026-04-12 — Full DaisyUI v5 migration complete. All six reference phases shipped. CSS bundle 147.16 KB → 123.27 KB (−16%). 39 `dark:` pairs and 166 `text-themed-*` references eliminated across 21 JSX files.*
