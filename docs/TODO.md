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

---

*Last updated: 2026-04-11 — React migration hardening complete, no new backlog items.*
