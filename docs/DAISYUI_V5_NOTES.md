# DaisyUI v5 Notes

Project-local reference for DaisyUI v5 quirks, v4→v5 renames, and conventions we use in this dashboard. This document is NOT an implementation pattern — it's a framework cheat sheet so future sessions don't re-learn the same traps.

**Installed version:** `daisyui@5` (specifically `5.5.19` at time of writing — see `package.json`).

**Why this file exists:** A post-migration audit found that Phase 8 of the DaisyUI component-class sweep shipped `select select-bordered select-sm` and `input input-bordered input-sm w-full`, which compiled without error but the `-bordered` tokens didn't exist — they were v4 modifiers that v5 removed. Tailwind silently drops unknown classes, so the visual result looked correct (because v5 makes bordered the default) but the code lied about its intent. See `docs/AI_MISTAKES.md` 2026-04-13 entry for the full post-mortem.

---

## v4 → v5 removed modifiers

These existed in v4 and are **gone** in v5. Using them produces no CSS rule; Tailwind doesn't warn.

| v4 class | v5 replacement | Notes |
|----------|----------------|-------|
| `input-bordered` | (none — bordered is default) | Use `input-ghost` to REMOVE the border |
| `select-bordered` | (none — bordered is default) | Use `select-ghost` to REMOVE the border |
| `textarea-bordered` | (none — bordered is default) | Use `textarea-ghost` to REMOVE the border |
| `btn-bordered` | (none — equivalent to `btn-outline`) | v5 unified on `btn-outline` |
| `form-control` | Stack `label` + `input` with flex utilities | v5 removed the wrapper; use `<fieldset>` + `<label>` or plain Tailwind flex |
| `input-group` | `join` + `join-item` | v5 generalized input groups to the `join` component |
| `menu-compact` | `menu-xs` / `menu-sm` | v5 replaced the single "compact" modifier with a size scale |
| `menu-normal` | (default) | Drop the class |
| `card-bordered` | (none — add `border border-base-300` manually) | v5 removed the shorthand |
| `card-compact` | `card-sm` | v5 uses size scale |
| `card-normal` | (default) | Drop the class |
| `card-side` | `card-side` (renamed in path, same name) | Still exists but check theme file |
| `btn-group` | `join` + `join-item btn` | Migrated to `join` |
| `tab-bordered` | `tabs-border` (on parent) | Moved from tab to container |
| `tab-lifted` | `tabs-lift` (on parent) | Moved from tab to container |
| `mask-*` | (moved to Tailwind util) | Masks now use Tailwind's `mask-*` plugin |

## Verification recipe

Before pushing any commit that introduces a new DaisyUI component modifier, run:

```bash
./node_modules/.bin/vite build 2>&1 | tail -5
# confirm build clean, then:
grep -oE "\\.(input|select|textarea|btn|card|alert|badge|toast|tab|modal|menu|dropdown|checkbox|radio|toggle|range|join)-[a-z-]*" dist/assets/index-*.css | sort -u
```

The output is the authoritative list of what v5 ships. If a token you typed isn't in that list, the JSX is wrong or the class doesn't exist.

You can narrow to a specific base:

```bash
grep -oE "\\.select[a-zA-Z-]*" dist/assets/index-*.css | sort -u
# Expected today:
# .select
# .select-sm
# .select-lg
# .select-xs
# .select-ghost
# .select-primary
# ... etc.
```

## Project conventions we use

These are the DaisyUI v5 patterns we standardized on across the 10-phase migration (2026-04-13). Keep them consistent when adding new components.

**Cards:**
```jsx
<div className="card bg-base-200 border border-base-300">
  <div className="card-body p-6 gap-0">...</div>
</div>
```
- Always wrap children in `card-body` (v5 card expects it for correct padding behavior).
- Our dense layouts override card-body defaults with `p-6 gap-0` or `p-4 gap-0` — the default `p-8 gap-2` is too spacious for our grid.
- For clickable cards, add `hover:border-primary/40 transition-colors`.

**Buttons:**
- Primary action: `btn btn-primary` (+ `btn-sm` / `btn-xs` / `btn-block` as needed)
- Secondary/default: `btn btn-outline btn-sm`
- Icon-only: `btn btn-ghost btn-square` or `btn btn-ghost btn-circle`
- Close button: `btn btn-sm btn-circle btn-ghost`
- Segmented (Include/Exclude etc.): `join` + `join-item btn btn-xs` with `btn-active` + color modifier

**Badges:** `badge badge-{primary|secondary|accent|info|success|warning|error} badge-{xs|sm}`
**Alerts:** `alert alert-{info|success|warning|error}` — add `alert-soft` for muted inline variant, always set `role="alert"` on the container.
**Modals:** `<div className="modal modal-open">` + `<div className="modal-box">` + `<div className="modal-backdrop">`. CSS-class form (not native `<dialog>`) for React state control.
**Toast:** `toast toast-bottom toast-center` wrapper + individual items with `alert alert-{variant}`. Pin `zIndex: 'var(--z-toast)'` inline so toasts stack above the debug pill.
**Tabs:** `tabs tabs-border` on the parent with `role="tablist" aria-label="..."`, each tab gets `tab` + our custom `tab-btn` typography, active state adds `tab-active tab-btn-active`.
**Form inputs:** `input input-sm` / `select select-sm` / `textarea textarea-sm` — bordered is the default in v5, do not add `*-bordered`.
**Checkboxes:** `checkbox checkbox-xs checkbox-primary` (v5 supports `-primary/-secondary/-accent` etc. color modifiers).

## Deliberately NOT used

- **DaisyUI `dropdown` component** — uses CSS `:focus` or `[open]` attribute for visibility. Conflicts with React-state-controlled menus. We use custom disclosure pattern in `HamburgerMenu.jsx`.
- **DaisyUI `menu` component** — implies `role="menu"` which screen readers treat as ARIA menu (forces forms mode). We use custom listbox (`role="listbox"`) or plain buttons with disclosure pattern.
- **DaisyUI `collapse` component** — stateless CSS checkbox approach. Doesn't match React reducer state; doesn't support our chevron rotation / max-height transition. We use `CollapsibleSection.jsx` with React state.
- **DaisyUI `drawer` component** — coupled to a `drawer-toggle` checkbox. Conflicts with React-state-controlled drawer visibility. We use custom `.filter-sidebar` / `.detail-pane` / `.settings-pane` slide-over panes.

## Theme registration

Themes are registered via a BEGIN/END GENERATED block in `dashboard/styles.css`, propagated from `scripts/theme-config.js` via `scripts/generate-theme-meta.mjs`. Never edit the `@plugin "daisyui"` directive by hand — edit `theme-config.js` and run the generator (or `npm run build` which runs it as prebuild).

See `CLAUDE.md` "Dashboard Architecture" section for the full four-file propagation flow (theme-config.js → themes.js + styles.css + index.html + generated/themeMeta.js).

## Related docs

- `docs/AI_MISTAKES.md` — 2026-04-13 entry: the `*-bordered` trap post-mortem
- `docs/HISTORY.md` — 2026-04-13 entry: full 10-phase component-class migration log
- `docs/implementations/THEME_DARK_MODE.md` — glow-props upstream reference for dual-layer theming (fetch from glow-props, not local)
- `docs/implementations/BURGER_MENU.md` — glow-props upstream reference for the disclosure-pattern menu (fetch from glow-props, not local)
