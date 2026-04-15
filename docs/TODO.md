# TODO

Remaining tasks for Git Analytics Reporting System.

**Design:** See [DASHBOARD_V2_DESIGN.md](DASHBOARD_V2_DESIGN.md) for full specification.

---

## Backlog

### Embedding

1. [ ] Optional: Vite library build — entry point and config exist (`js/lib.js`, `vite.config.lib.js`, `npm run build:lib`) but needs testing with a consumer project, documentation, and npm publish setup

### Research

1. [ ] Device/platform attribution — investigated 2026-04-02, git does not store device info natively. Proxy indicators (email domain, timezone, commit message patterns) are weak signals. Would require a separate heuristic analysis module. Low priority unless a strong use case emerges.

### Post-sweep verification (2026-04-14)

1. [ ] Re-capture Playwright visual regression baselines — the full vanilla-DaisyUI sweep shifted pixels in every screenshot (tag colours, chart palette, heatmap intensity, drawer layout, header border, hamburger dropdown, etc.). Run `npx playwright test --update-snapshots` after a live verification.
2. [ ] Live browser verification — none of the drawers (filter/detail/settings), the DaisyUI collapse in CollapsibleSection, or the heatmap layout changes have been tested in an actual browser. Nested DaisyUI drawers are an unusual pattern; verify click-outside, overlay stacking, and keyboard focus traps all behave correctly.

---

*Last updated: 2026-04-14 — Vanilla-DaisyUI sweep complete. `dashboard/styles.css` contains zero custom class definitions (down from 24). Every dashboard surface tracks the active DaisyUI theme via component classes + semantic tokens. The `LEGITIMATE_CUSTOM_CLASSES` allowlist test is empty. URL chart-override params (`?palette=`, `?accent=`, `?muted=`, `?colors=`) deleted — embedders get whatever DaisyUI theme they pick via `?theme=`. Tag chips use `badge badge-sm ${variant}` where the variant maps 34 tag names to 7 DaisyUI semantic tokens. Chart.js dataset colours resolve at runtime via `getComputedStyle` of 8 DaisyUI semantic CSS variables. See HISTORY.md for the phase-by-phase changelog.*
