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

### DaisyUI migration — remaining work

Phase 0 + infrastructure + incremental component `dark:` pair cleanup shipped on 2026-04-12. Full migration still pending:

1. [ ] **Remove custom CSS variables from `styles.css`** — currently 202 `var(--color-*)` / `var(--bg-*)` / `var(--text-*)` / `var(--border-*)` / `var(--shadow-*)` references. These still work via coexistence with DaisyUI. Full removal requires rewriting each CSS rule to use DaisyUI semantic classes (`bg-base-100/200/300`, `text-base-content`, `border-base-300`, etc.). Work incrementally — see `docs/implementations/THEME_DARK_MODE.md` Phase 2 mapping table.
2. [ ] **Component class migration** — replace raw Tailwind / custom-class elements with DaisyUI component classes: `<button>` → `btn btn-{primary|ghost|outline}`, `<input>` → `input input-bordered`, `<select>` → `select select-bordered`, cards → `card` + `card-body`, colored small labels → `badge badge-{variant}`, alert blocks → `alert alert-{variant}`.
3. [ ] **Delete `text-themed-*` / `bg-themed-*` utility classes** from `styles.css` once their consumers are migrated — these currently wrap custom variables for use in JSX.
4. [ ] **Consider a PWA meta theme-color build script** (`scripts/generate-theme-meta.mjs` per reference doc) if/when more than two themes are registered. Currently hardcoded for lofi/black only.
5. [ ] **Audit post-migration** using the 10-point verification checklist in `THEME_DARK_MODE.md` Phase 5 once the remaining work above is done.

---

*Last updated: 2026-04-12 — DaisyUI dark mode migration Phase 0 + dual-layer theming + incremental component `dark:` pair cleanup shipped.*
