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
**Toggles (switches):** `<input type="checkbox" className="toggle toggle-primary" checked={state} onChange={handler} aria-label="..." />` wrapped in a `<label className="row-layout">...<input .../></label>` so the label's native `for` association makes the entire row clickable without custom `onClick` handlers. Do NOT hand-roll a toggle with `after:` pseudo-element + hardcoded `after:bg-white` — that reimplements the pill switch AND breaks light themes. Do NOT use `<div role="switch">` with a presentational `readOnly` checkbox inside — `readOnly` is a no-op on HTML checkboxes (only React accepts it to silence controlled-without-onChange warnings), and the parent click handler races with the checkbox's native toggle. The native `<label>` + `<input>` pattern handles keyboard (Space/Enter toggle built in), screen readers (announces as switch), and larger tap target, without any duplicated ARIA. Matches the 2026-04-14 audit refactor.
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

## Tag chips (brand-fixed, not theme-tracked)

Tags have brand/semantic colors (feature=green, fix=red, docs=blue etc.) that must NOT track theme — users need consistent semantic meaning regardless of which DaisyUI theme is active. The single source of truth lives in `dashboard/js/utils.js`:

- `TAG_COLORS` — map of `tag-name → brand hex`. Used by `getTagColor(tag)` for Chart.js dataset backgrounds (solid fill) and anywhere a call site needs a plain color string.
- `TAG_TEXT_OVERRIDES` — map of `tag-name → lighter-variant hex` for the 8 tags where the chip text needs a lifted tone for readability on the 30%-opaque background (`security`, `refactor`, `cleanup`, `config`, `style`, `performance`, `dependency`, `other`).
- `getTagStyleObject(tag)` — returns `{ backgroundColor, color, border }` for chip display. Static tags use 0.3/0.5 alphas; dynamic tags use 0.2/0.3 alphas. Cached in a `Map` so React re-renders of long tag lists stay cheap.

JSX usage: `<span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium" style={getTagStyleObject(tag)}>`. The chip layout is pure Tailwind utilities — there is no `.tag` CSS class anymore. Everything color-related comes from the inline style object.

Previously the same 34 colors were duplicated as 40+ `.tag-{name}` rules in styles.css; that duplication was collapsed 2026-04-13. The `.tag` base class that carried the shared layout utilities was also deleted in a follow-up pass the same day (replaced by explicit Tailwind classes on each consumer — see commit log). Don't re-add either the per-tag rules or the base class — edit `TAG_COLORS` / `TAG_TEXT_OVERRIDES` in `dashboard/js/utils.js` instead.

## The 24 legitimate custom CSS classes

After the 2026-04-13 custom-CSS cleanup sweep, `dashboard/styles.css` contains exactly 24 custom class definitions — every other styling decision goes through DaisyUI component classes or Tailwind utilities inline at the JSX consumer. Adding a new primary rule head requires extending the `LEGITIMATE_CUSTOM_CLASSES` allowlist in `scripts/__tests__/daisyui-surfaces.test.mjs` AND documenting a Tailwind-incompatible rationale in a rule header comment.

**Pseudo-elements** (`::after` / `::before` can't be expressed as Tailwind utilities):
- `dashboard-header` — `::after` gradient accent line
- `detail-pane-header`, `settings-pane-header` — zero-style marker classes for mobile `::before` drag-handle pills

**@keyframes animations**:
- `dashboard-enter` — page-load fade-in
- `hamburger-dropdown` — dropdown surface fade-in + complex box-shadow
- `hamburger-update-dot` — PWA update indicator pulse

**Non-Tailwind CSS transition values**:
- `collapsible-content` — `max-height: 0 → max-height: none` transition. Tailwind's `max-h-*` utilities don't include `none`, and clamping to `max-h-[9999px]` would clip long sections.

**Transform-based slide-over drawer shells**:
- `filter-sidebar` + `filter-sidebar-overlay` — filter drawer
- `detail-pane` + `detail-pane-overlay` — drill-down pane
- `settings-pane` + `settings-pane-overlay` — settings pane
- All three use `transform: translateX(100%)` ↔ `translateX(0)` transitions driven by a `.open` state class applied from React. The descendant-selector state-class pattern and the coordinated overlay + pane transitions are not cleanly expressible as inline conditional Tailwind without re-implementing the whole drawer pattern.

**Not shipped by Tailwind**:
- `scrollbar-hide` — `::-webkit-scrollbar { display: none }` pseudo-element + iOS scroll behavior. Not in default Tailwind; adding a plugin for one consumer is over-engineering.
- `header-filter-hint` — `font: inherit` shorthand has no clean Tailwind equivalent (you'd need to re-specify family + size + weight + line-height + etc.)

**Data-viz intensity gradient** (dynamic JSX references):
- `heatmap-0`, `heatmap-1`, `heatmap-2`, `heatmap-3`, `heatmap-4` — referenced via `heatmap-${level}` template literals in Timing.jsx. Inlining the `color-mix(in oklab, var(--chart-accent-override, var(--color-primary)) N%, transparent)` gradient at every cell would duplicate the expression 168 times (24×7 full heatmap) plus 10-20 times per weekly variant. Keeping 5 class definitions is cleaner.

**Isolated rendering that survives CSS load failure**:
- `root-error-message`, `root-error-detail`, `root-error-hint` — the root error boundary renders in an isolated React root that must render correctly even when styles.css fails to load. Uses only typography classes with safe fallbacks; layout stays inline (flex centering).

**Root state marker read by descendant selectors**:
- `embed-mode` — applied to the root element in embed-iframe mode. Multiple descendant selectors in styles.css (`.embed-mode .card`, `.embed-mode .collapsible-header`, `.embed-mode .collapsible-content .pt-2`, etc.) strip dashboard chrome to leave just the embedded chart.

Everything else — `.hamburger-item`, `.settings-toggle`, `.detail-pane-content`, `.filter-multi-select-option`, `.collapsible-header`, `.tab-btn`, etc. — was migrated to inline Tailwind utilities. If a future PR adds a new custom class wrapper, it fails the allowlist test and needs either a Tailwind migration or a documented rationale.

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
