# DaisyUI v5 Notes

Project-local reference for DaisyUI v5 quirks, v4→v5 renames, and conventions we use in this dashboard. This document is NOT an implementation pattern — it's a framework cheat sheet so future sessions don't re-learn the same traps.

**Installed version:** `daisyui@5` (specifically `5.5.19` at time of writing — see `package.json`).

**Why this file exists:** A post-migration audit found that Phase 8 of the DaisyUI component-class sweep shipped `select select-bordered select-sm` and `input input-bordered input-sm w-full`, which compiled without error but the `-bordered` tokens didn't exist — they were v4 modifiers that v5 removed. Tailwind silently drops unknown classes, so the visual result looked correct (because v5 makes bordered the default) but the code lied about its intent. See `docs/AI_MISTAKES.md` 2026-04-13 entry for the full post-mortem.

A second audit pass (same date, commit `de2e6ad`) caught three more gaps that had gotten in: hardcoded Tailwind color classes (`bg-green-500` etc.) in data-viz categories that should have been DaisyUI semantic tokens, the custom `.loading-spinner` class shadowing DaisyUI v5's own loading variant, and two-div wrapper+fill progress bar patterns that should have been native `<progress>` elements. Each of those is covered in the sections below.

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
**Loading spinners:** `<span className="loading loading-spinner loading-{xs|sm|md|lg} text-primary" aria-label="Loading" />`. The base `.loading` provides display + aspect-ratio + mask-image mechanics; the variant (`loading-spinner` / `loading-dots` / `loading-ring` / `loading-ball` / `loading-bars`) picks the animation SVG; the size adjusts width via `calc(var(--size-selector,.25rem)*N)`; `text-primary` (or any `text-*` utility) threads the active theme's color through DaisyUI's `currentColor` fill. Do NOT use `loading-spinner` alone — it's a variant, not a base, and without `loading` it has no geometry.
**Progress bars:** `<progress className="progress progress-{primary|info|success|warning|error|secondary|accent} w-full" value={pct} max="100" aria-label="..." />`. Native `<progress>` element — screen readers announce "X percent of 100" automatically. Use for SINGLE-VALUE progress bars. For multi-segment stacked bars, keep the custom `<div className="bg-base-300 rounded-full"><div className="bg-{token}" style={{ width }} /></div>` pattern with DaisyUI semantic tokens for each segment — native `<progress>` can't render multiple simultaneous values.

**Chart.js dataset colors (theme-tracked):** Chart components must read accent / muted from `state.themeAccent` / `state.themeMuted` via `useApp()`, NOT from the static `accentColor` / `mutedColor` exports in `chartColors.js`. The static exports are frozen at module load and only serve as bootstrap fallbacks for pre-React code. The runtime values come from `chartColors.resolveRuntimeAccent()` / `resolveRuntimeMuted()` which read `var(--color-primary)` / `var(--color-base-content)` from `getComputedStyle` — DaisyUI exposes these as oklch() values, and modern browser canvas parses oklch() + color-mix() directly so Chart.js can use them without any JS-side conversion. `AppContext`'s `darkMode` effect dispatches `SET_THEME_COLORS` after every `applyTheme()` call, which re-populates `state.themeAccent` / `state.themeMuted`. Chart `useMemo` deps must include `state.themeAccent` / `state.themeMuted` so the data object rebuilds on theme change and react-chartjs-2 calls `chart.update()` with the new colors. URL override precedence (`?accent=hex`, `?palette=name`) is preserved via `hasUrlAccentOverride` / `hasUrlMutedOverride` flags — an embedder who supplied a branded accent wants it sticky across theme picker clicks.

**Heatmap CSS (theme-tracked with embed override):** use `color-mix(in oklab, var(--chart-accent-override, var(--color-primary)) X%, transparent)`. Nested `var()` fallback — the default path tracks `--color-primary` per theme via DaisyUI's theme plugin, and `main.jsx` only sets `--chart-accent-override` when the embedder supplied a URL `?accent=` override. High-intensity cells use `var(--color-primary-content)` for readable text contrast (NOT hardcoded `white`, which is invisible on light themes where the primary is a pale color).

## Data-viz color tokens

For charts / bars / legend dots where categories encode meaning, ALWAYS use DaisyUI semantic tokens — never hardcoded Tailwind shades like `bg-green-500` or `bg-red-600`. Hardcoded shades don't track the active theme: on dark themes (`black`, `dim`, `coffee`) mid-saturation shades can blend with the base; on warm themes (`caramellatte`) they clash.

Canonical mappings we use across the dashboard:

| Semantic meaning | DaisyUI token | Typical use |
|---|---|---|
| "Good" / success / safe / planned | `bg-success` / `text-success` | Planned work, low risk, debt paid, minor semver, work-hours legend |
| "Neutral info" / normal / ongoing | `bg-info` / `text-info` | Routine work, user-facing impact, patch semver, file-change progress |
| "Caution" / medium risk / reactive | `bg-warning` / `text-warning` | Reactive work, medium risk, right-side comparison, mixed-hours legend |
| "Bad" / error / high risk / broken | `bg-error` / `text-error` | High risk, debt added, major semver, outside-work-hours legend |
| "Background" / internal / inactive | `bg-neutral` / `text-neutral` | Internal impact, neutral debt, "no change" states |
| "Generic primary accent" | `bg-primary` / `text-primary` | Epic progress bars, tile hover rings, generic single-value progress |
| "Secondary accent" | `bg-secondary` | Infrastructure impact (distinct from internal/neutral) |
| "Tertiary accent" | `bg-accent` | API impact (distinct from success so a 4-category impact chart renders with 4 visibly-different colors) |

When you have a 3-category gradient (good/mixed/bad), use `success` / `warning` / `error` in that order. When you have a 4-category independent palette, use `info` / `neutral` / `secondary` / `accent` so all four are visibly distinct across every registered theme.

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
