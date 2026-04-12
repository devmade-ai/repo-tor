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

All six reference phases (Phase 0 Prerequisites → Phase 1 Audit → Phase 2 Variable Removal → Phase 3 Component Migration → Phase 4 Z-Index → Phase 5 Verification → Phase 6 Cleanup) shipped 2026-04-12, followed by a reference-pattern alignment pass that added the theme catalog module, `applyTheme()` helper, oklch→hex build script, inline allowlist, forward-compat cross-tab sync, and theme-toggle aria-label. The remaining items below are all **optional** — they would reduce custom CSS further or add user-facing features, but the theming migration is complete.

1. [ ] **Component class migration to DaisyUI component classes** — replace raw Tailwind / custom-class elements with DaisyUI component classes: `<button>` → `btn btn-{primary|ghost|outline}`, `<input>` → `input input-bordered`, `<select>` → `select select-bordered`, cards → `card` + `card-body`, colored small labels → `badge badge-{variant}`, alert blocks → `alert alert-{variant}`. Current status: custom CSS classes (`.btn-primary`, `.card`, `.filter-select`, etc.) use DaisyUI tokens internally, which is functionally correct. Swapping to DaisyUI component classes would let us delete more custom CSS but requires careful visual review of padding, border-radius, and interactive states.
2. [ ] **Theme picker UI in burger menu** — the theme catalog module (`dashboard/js/themes.js`) already supports multiple themes per mode via `LIGHT_THEMES` / `DARK_THEMES` arrays and the `lightTheme` / `darkTheme` localStorage keys; adding a picker would mean (a) registering more themes in `styles.css @plugin "daisyui"` + `themes.js` catalog + `scripts/generate-theme-meta.mjs REGISTERED_THEMES` + the inline flash prevention allowlist in `index.html`, (b) building a menu-item UI inside `HamburgerMenu` that writes the per-mode key via `persistTheme()`, and (c) wiring it into the cross-tab `storage` listener which already handles `lightTheme` / `darkTheme` events. All the plumbing is in place.

---

*Last updated: 2026-04-12 — Full DaisyUI v5 migration complete. All six reference phases shipped plus a reference-pattern alignment pass (theme catalog module, applyTheme() helper, oklch→hex build script, inline allowlist, forward-compat cross-tab sync, theme-toggle aria-label). CSS bundle 147.16 KB → 150.64 KB (+2% from DaisyUI theme blocks and component classes). 39 `dark:` pairs, 166 `text-themed-*` references, and all `--bg-*/--text-*/--border-*` custom variables eliminated.*
