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

**Vanilla-only policy** (2026-04-14): only DaisyUI component classes,
DaisyUI semantic tokens, and stock Tailwind v4 utilities. Zero custom
CSS classes, zero `@theme` extensions, zero `@utility` directives, zero
arbitrary bracket values, zero brand hex literals in JSX or JS data.
The daisy theme IS the brand colour.

The `LEGITIMATE_CUSTOM_CLASSES` allowlist in `daisyui-surfaces.test.mjs`
is an **empty Set** — any new `.classname {` primary rule in
`dashboard/styles.css` fails the test. Migration path for new patterns:
1. Stock Tailwind v4 utility (spacing, typography, border, shadow scale)
2. DaisyUI semantic token (`text-primary`, `bg-base-200`, `badge-success`)
3. DaisyUI component class (`card`, `collapse`, `drawer`, `modal`, `toast`)
4. Runtime resolution via `getComputedStyle` (Chart.js dataset colours)

If none of those fits, the feature is out of scope for the dashboard.

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
**Toast:** `toast toast-bottom toast-center z-[var(--z-toast)]` wrapper + individual items with `alert alert-{variant}`. `z-[var(--z-toast)]` is the only permitted arbitrary-bracket value — it references a design-token CSS variable that can't be expressed as a stock utility (the `--z-toast` scale lives in `:root`).
**Tabs:** `tabs tabs-border` on the parent with `role="tablist" aria-label="..."`, each tab gets `tab` + inline mono-uppercase typography utilities, active state adds `tab-active` + `text-primary font-semibold`.
**Drawer (slide-over panes):** `<div className="drawer drawer-end">` (or `drawer lg:drawer-open` for filter sidebar inline-on-desktop) + `<input type="checkbox" className="drawer-toggle" checked={state} onChange={...} />` + `<div className="drawer-content">{main}</div>` + `<div className="drawer-side"><label htmlFor="..." className="drawer-overlay" />{pane}</div>`. Multiple drawers nest — each drawer's `drawer-content` contains the next drawer wrapper. See `App.jsx` for the three-drawer composition (filter → detail → settings).
**Collapse (sections):** `<div className="collapse collapse-arrow bg-base-200 border border-base-300">` + `<input type="checkbox" checked={expanded} onChange={...} />` + `<div className="collapse-title">` + `<div className="collapse-content">`. The `collapse-open` / `collapse-close` modifier classes force the open state to match React-controlled `expanded`.
**Form inputs:** `input input-sm` / `select select-sm` / `textarea textarea-sm` — bordered is the default in v5, do not add `*-bordered`.
**Checkboxes:** `checkbox checkbox-xs checkbox-primary` (v5 supports `-primary/-secondary/-accent` etc. color modifiers).
**Toggles (switches):** `<input type="checkbox" className="toggle toggle-primary" checked={state} onChange={handler} aria-label="..." />` wrapped in a `<label className="row-layout">...<input .../></label>` so the label's native `for` association makes the entire row clickable without custom `onClick` handlers. Do NOT hand-roll a toggle with `after:` pseudo-element + hardcoded `after:bg-white` — that reimplements the pill switch AND breaks light themes. Do NOT use `<div role="switch">` with a presentational `readOnly` checkbox inside — `readOnly` is a no-op on HTML checkboxes (only React accepts it to silence controlled-without-onChange warnings), and the parent click handler races with the checkbox's native toggle. The native `<label>` + `<input>` pattern handles keyboard (Space/Enter toggle built in), screen readers (announces as switch), and larger tap target, without any duplicated ARIA. Matches the 2026-04-14 audit refactor.
**Loading spinners:** `<span className="loading loading-spinner loading-{xs|sm|md|lg} text-primary" aria-label="Loading" />`. The base `.loading` provides display + aspect-ratio + mask-image mechanics; the variant (`loading-spinner` / `loading-dots` / `loading-ring` / `loading-ball` / `loading-bars`) picks the animation SVG; the size adjusts width via `calc(var(--size-selector,.25rem)*N)`; `text-primary` (or any `text-*` utility) threads the active theme's color through DaisyUI's `currentColor` fill. Do NOT use `loading-spinner` alone — it's a variant, not a base, and without `loading` it has no geometry.
**Progress bars:** `<progress className="progress progress-{primary|info|success|warning|error|secondary|accent} w-full" value={pct} max="100" aria-label="..." />`. Native `<progress>` element — screen readers announce "X percent of 100" automatically. Use for SINGLE-VALUE progress bars. For multi-segment stacked bars, keep the custom `<div className="bg-base-300 rounded-full"><div className="bg-{token}" style={{ width }} /></div>` pattern with DaisyUI semantic tokens for each segment — native `<progress>` can't render multiple simultaneous values.

**Chart.js dataset colors (theme-tracked, vanilla-only):** Chart components read colours from DaisyUI semantic CSS variables at runtime via `chartColors.js` helpers. Two colour cycles exist:

1. **General series** — `getSeriesColor(i)` cycles through the full 8-slot semantic cycle `[primary, secondary, accent, info, success, warning, error, neutral]`. Used for trend charts (urgency, debt, impact), complexity gradients, and semver breakdowns.
2. **Repo-specific** — `buildRepoColorMap(repos)` assigns active repos via `resolveActiveRepoColor(i)`, which filters a 7-token candidate list (neutral excluded — reserved for internal/discontinued) by oklch chroma at runtime (threshold 0.03). Monochrome themes (lofi, black) define primary/secondary/accent as achromatic, so the filter reduces to 4 status tokens (info/success/warning/error). Colorful themes (nord, emerald, dim, dracula, etc.) pass all 7 tokens. Internal repos get `dimNeutral(0.6)`, discontinued repos get `dimNeutral(0.3)`.

All helpers read `getComputedStyle(document.documentElement).getPropertyValue('--color-*')` at call time — modern browser canvas parses oklch() + color-mix() natively so Chart.js accepts the values directly. `state.themeAccent` / `state.themeMuted` live in AppContext and are dispatched via `SET_THEME_COLORS` after every `applyTheme()` call; chart `useMemo` deps must include `state.themeAccent` / `state.themeMuted` so datasets rebuild on theme change. There are **no URL overrides** (`?palette=`, `?accent=`, `?muted=`, `?colors=` were all deleted in the 2026-04-14 vanilla sweep) — embedders pick a DaisyUI theme via `?theme=light|dark` and the dashboard respects it.

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

## Tag chips (theme-tracked via DaisyUI semantic badges)

Tag chips use DaisyUI's `badge` component with a semantic variant that
tracks the active theme. The vanilla-DaisyUI sweep (2026-04-14) deleted
the 34-hex brand palette (`TAG_COLORS`, `TAG_TEXT_OVERRIDES`,
`DYNAMIC_TAG_PALETTE`, `getTagColor`, `getTagStyleObject`) and replaced
it with `TAG_SEMANTIC` — a map of 34 tag names to 7 DaisyUI badge
variants:

- `feature/enhancement/seed/init` → `badge-success`
- `bugfix/fix/security/hotfix` → `badge-error`
- `removal/revert/deprecate` → `badge-warning`
- `refactor/naming/cleanup` → `badge-secondary`
- `docs/config` → `badge-info`
- `test/test-unit/test-e2e/build/ci/deploy` → `badge-accent`
- everything else → `badge-neutral`

JSX usage: `<span className={\`badge badge-sm ${getTagBadgeClass(tag)}\`}>{tag}</span>`.

For Chart.js datasets that need a literal colour value (Chart.js can't
consume CSS classes), `resolveTagSemanticColor(tag)` in `utils.js`
reads the corresponding `--color-<semantic>` CSS variable from computed
style at call time.

Tradeoff: 34 distinct tag colours collapse to 7 semantic variants.
Tags within a category look identical. Accepted per vanilla directive
— "the daisy theme is the brand colour".

## Custom CSS policy: zero

`dashboard/styles.css` contains only the DaisyUI `@plugin` registration,
the Tailwind `@import`, the `:root` block of non-theme design tokens
(z-index scale, radius, fonts — no colours), body safe-area padding,
the reduced-motion `@media` query, and print overrides for element
selectors. **Zero `.classname { }` primary rules.**

The `LEGITIMATE_CUSTOM_CLASSES` allowlist in the surface test is an
**empty Set**. Any new primary rule in styles.css fails the test. If
you find yourself wanting to add a class, the answer is one of:

1. Use a stock Tailwind utility.
2. Use a DaisyUI semantic token or component class.
3. Drop the feature.

Deleted classes from the 2026-04-14 sweep (all migrated to stock
DaisyUI / Tailwind or removed):

- `.dashboard-header` + `::after` gradient — replaced by `border-b border-base-300`
- `.hamburger-dropdown` + `@keyframes hamburger-fade-in` — inline Tailwind + no animation
- `.hamburger-update-dot` + `@keyframes hamburger-pulse` — `animate-pulse` stock utility
- `.scrollbar-hide` — accept visible mobile scrollbars
- `.header-filter-hint` — DaisyUI `btn btn-link`
- `.root-error-message/detail/hint` — inline Tailwind in main.jsx
- `.dashboard-enter` + `@keyframes dashboard-enter` — no entry animation
- `.collapsible-content` — DaisyUI `collapse` component
- `.detail-pane` + `.detail-pane-overlay` + `.detail-pane-header` — DaisyUI `drawer drawer-end`
- `.settings-pane` + `.settings-pane-overlay` + `.settings-pane-header` — DaisyUI `drawer drawer-end`
- `.filter-sidebar` + `.filter-sidebar-overlay` + mobile media block — DaisyUI `drawer lg:drawer-open`
- `.embed-mode` + 7 descendant selectors — `isEmbedMode` conditional render
- `.heatmap-0..4` — `HEATMAP_LEVEL_CLASSES` JS constant with stock `bg-primary/N` utilities

## Previously "deliberately NOT used" — now used

The vanilla sweep overrides the previous "these components conflict with
our React state model" rejections. We now use these DaisyUI components:

- **`drawer`** — three nested drawer wrappers in App.jsx (filter, detail,
  settings). React state syncs to native `<input type="checkbox" checked
  onChange>` on each drawer-toggle. Works fine with controlled state; the
  previous objection was overblown.
- **`collapse`** — CollapsibleSection.jsx uses the native component with
  a React-controlled checkbox. The previous max-height:none custom
  transition is replaced by DaisyUI's default animation.

Still deliberately NOT used:
- **`dropdown`** — HamburgerMenu.jsx keeps its React-state disclosure
  pattern (portal + inline-position computed from trigger bbox). The
  menu needs to be openable/closeable from outside the trigger for
  theme picker cascade + async action error capture, which DaisyUI's
  `:focus`/`[open]` CSS-driven dropdown can't support.
- **`menu`** — would impose `role="menu"` on secondary-action lists,
  which screen readers treat as an ARIA menu (forms mode). We use
  plain buttons with disclosure semantics.

## Theme registration

Themes are registered via a BEGIN/END GENERATED block in `dashboard/styles.css`, propagated from `scripts/theme-config.js` via `scripts/generate-theme-meta.mjs`. Never edit the `@plugin "daisyui"` directive by hand — edit `theme-config.js` and run the generator (or `npm run build` which runs it as prebuild).

See `CLAUDE.md` "Dashboard Architecture" section for the full four-file propagation flow (theme-config.js → themes.js + styles.css + index.html + generated/themeMeta.js).

## Related docs

- `docs/AI_MISTAKES.md` — 2026-04-13 entry: the `*-bordered` trap post-mortem
- `git log --grep='daisyui'` — 2026-04-13 commits: full 10-phase component-class migration
- `docs/implementations/THEME_DARK_MODE.md` — glow-props upstream reference for dual-layer theming (fetch from glow-props, not local)
- `docs/implementations/BURGER_MENU.md` — glow-props upstream reference for the disclosure-pattern menu (fetch from glow-props, not local)
