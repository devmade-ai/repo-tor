# History

Log of significant changes to code and documentation.

## 2026-04-14

### Post-migration audit — follow-up commit (deferred/skipped items cleanup)

After the first audit commit shipped, the user asked for a no-shortcuts review of the audit's own output to catch anything deferred or skipped. This follow-up addresses everything the first pass left on the table.

**SettingsPane UTC toggle — proper native architecture.** The first audit fix replaced the hand-rolled `after:` pseudo + hardcoded `after:bg-white` with DaisyUI's `.toggle toggle-primary` class, but kept the parent `<div role="switch">` + `onClick` + `onKeyDown` + `readOnly` + `aria-hidden` presentational pattern. Two issues: (1) `readOnly` is a no-op on HTML checkboxes per spec — React only accepts it to silence the controlled-without-onChange warning, but the attribute has no runtime effect, so direct clicks on the checkbox would fire a native toggle that React reconciled back on the next render; (2) `role="switch"` on the div duplicated semantics the native input already provides. The follow-up refactored to a native `<label>` wrapping `<input type="checkbox" className="toggle toggle-primary" onChange={...}>`. HTML's native label-for association makes the entire row clickable via bubbling, `onChange` receives the new value via `e.target.checked` (no stale-closure reliance), and the input natively handles focus / Space / Enter / screen reader semantics. Zero ARIA duplication.

**TOGGLE_BASE_CLASSES no-op hover.** Renamed to `TOGGLE_ROW_CLASSES` and replaced `hover:bg-base-300` with `hover:bg-base-content/5`. The old CSS `.settings-toggle { background: var(--bg-tertiary) /* #333 */ }` + `.settings-toggle:hover { background: var(--bg-hover) /* #222 */ }` used two different colours; the migration mapped both to `bg-base-300` by accident, making the hover a silent visual no-op. The `base-content/5` overlay replacement is theme-aware: on dark themes base-content is near-white so the hover reads as a slight lift; on light themes base-content is near-black so it reads as a slight press. Affects both the UTC row and the ViewLevel radio rows that share the constant.

**FilterSidebar MultiSelect highlighted+selected state.** The first audit fix only addressed the mouse-hover branch of the 2×2 `isSelected × isHighlighted` state grid, leaving keyboard-highlighted selected rows still flattened to `bg-base-300` (losing the primary tint). The follow-up enumerates all four combinations explicitly:

```js
const bgClass = isHighlighted && isSelected
    ? 'bg-primary/30'              // strongest tint, preserves "selected" during nav
    : isHighlighted
    ? 'bg-base-300'                // neutral lift matching mouse hover
    : isSelected
    ? 'bg-primary/10 hover:bg-primary/20'  // mouse hover deepens selection
    : 'hover:bg-base-300';         // default discoverable hover
```

**Dead code removed.** `FOCUS_RING_CLASSES` export in `dashboard/js/utils.js` had zero consumers (`grep -r 'import.*FOCUS_RING_CLASSES' dashboard/js` → no hits). It was declared during round-3 as a shared helper but every JSX consumer ended up inlining the raw string instead. Deleted the export + its ~20-line rationale block per CLAUDE.md's dead-code rule.

**Stale docs.**

- `dashboard/styles.css` lines 645-651 — comment block in the "removed classes" section still described the UTC switch as `pure Tailwind with after: pseudo variant`, which was wrong after the first audit fix. Rewritten to reference DaisyUI's `.toggle` component and the `TOGGLE_ROW_CLASSES` constant.
- `docs/DAISYUI_V5_NOTES.md` — added a new "Toggles (switches)" bullet under project conventions. Documents the `<label>` + `<input type="checkbox" class="toggle toggle-primary">` pattern with explicit warnings against the two wrong approaches (hand-rolled `after:` + `readOnly` presentational checkbox).
- `docs/AI_MISTAKES.md` — added a 2026-04-14 entry titled "Migrating state-dependent classes without tracing cascade priority between variants". Covers all five regressions the audit caught (SettingsPane toggle hardcoded colour, FilterSidebar selected-hover inversion, FilterSidebar highlighted+selected flattening, SettingsPane no-op hover, DropZone outline-none removing the global-rule focus ring) and documents five prevention rules: (1) write down the 2^N state truth table before migrating, (2) check source order when `:hover` + state class set the same property, (3) grep for attribute-selector rules when removing classes, (4) diff pre/post migration in both mouse AND keyboard interaction modes, (5) prefer native DaisyUI form controls over hand-rolled ones.

**Outstanding (intentionally deferred):**

- **Playwright visual regression baselines will drift.** The toggle pixel layout changed (from hand-rolled divs to DaisyUI pill), the hover backgrounds shifted, the FilterSidebar highlighted-selected state now uses `primary/30`, and the DropZone focus state has a visible outline ring. Baselines in `dashboard/e2e/visual/theme-baselines.spec.js` should be re-captured with `--update-snapshots` after a live visual check.
- **SettingsPane ViewLevel radiogroup a11y** — still `<div role="radio">` + `tabIndex={0}` on every item with only Enter/Space handling. A compliant WAI-ARIA radiogroup would have one `tabIndex=0` at a time (the focused one) and arrow-key navigation moving between items. Converting to native `<input type="radio">` + `<label>` is a larger refactor outside the audit scope; flagged in SESSION_NOTES.

**Verified:**

- `./node_modules/.bin/vite build` clean (2.75s)
- `npm test` — 61/61 pass
- `hover:bg-base-content/5`, `bg-primary/30`, `toggle`, `toggle-primary` all verified present in built CSS
- No `FOCUS_RING_CLASSES` or `TOGGLE_BASE_CLASSES` references remain in `dashboard/js`
- No `focus-visible:outline focus-visible:outline-2` pairings remain (confirmed by follow-up grep)

## 2026-04-13

### Post-migration audit fixes (8 issues across 12 files)

Fresh-eyes audit of the `claude/migrate-daisyui-dark-mode-toG0Y` branch caught 2 CLAUDE.md violations, 2 user-visible UX regressions, 1 a11y regression, and 3 hygiene items introduced during the round-3 custom-CSS sweep. All fixed without architectural changes.

**Fix 1+2 — SettingsPane toggle (SettingsPane.jsx):** The UTC toggle was hand-rolled as `<div className="relative w-11 h-6 ... after:content-[''] after:bg-white ...">`, reimplementing DaisyUI's native `.toggle` component AND violating the "never hardcode theme values" CLAUDE.md rule via `after:bg-white` (which left the thumb pure white on every light theme). Replaced with `<input type="checkbox" className="toggle toggle-primary shrink-0" checked={state.useUTC} readOnly tabIndex={-1} aria-hidden="true" />`. The parent row still owns `role="switch"` + keyboard handling; the input is purely presentational. `readOnly` silences React's controlled-without-onChange warning.

**Fix 3 — FilterSidebar selected-row hover inversion (FilterSidebar.jsx:159):** My Tailwind migration of the MultiSelect option cascade wrote `'bg-primary/10 hover:bg-base-300'` for the selected branch — meaning hovering a selected row *replaced* the selection tint with the default hover tint, visually deselecting it. The old CSS kept the `.selected` background through `:hover` via cascade order. Fixed to `'bg-primary/10 hover:bg-primary/20'` so hovering a selected row *deepens* the tint.

**Fix 4 — DetailPane hardcoded hover color (DetailPane.jsx:79):** Commit row used `hover:bg-white/5` which is invisible on the 4 light themes (lofi, nord, emerald, caramellatte) AND violates "never hardcode theme values". Replaced with `hover:bg-base-content/5` — 5% of the inverted text color, so it shows as a subtle dark tint on light themes and a subtle light tint on dark themes.

**Fix 5 — DropZone focus outline a11y regression (DropZone.jsx):** The migration added `focus-visible:outline-none` that wasn't in the old CSS, leaving keyboard users with only a subtle border/bg tint on focus. Replaced with explicit `focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2` — matches TabBar's focus pattern for consistency.

**Fix 6+7 — FilterSidebar stale references (FilterSidebar.jsx):** The MultiSelect rationale comment still described the deleted `.filter-multi-select-*` custom classes and their theme-tracking via `var(--color-base-*)` — rewrote to describe the current inline-Tailwind approach. The `mb-0` override on the FilterGroup `<label>` was a no-op carried over from the deleted `.filter-sidebar-inner label` descendant selector — removed.

**Fix 8 — Redundant `focus-visible:outline` + `outline-2` (9 files):** In Tailwind v4, `.outline-2` already sets `outline-style:var(--tw-outline-style);outline-width:2px` and `--tw-outline-style` defaults to `solid`, so the bare `focus-visible:outline` alongside `focus-visible:outline-2` is redundant (and sets outline-width:1px which cascade overrides with 2px). Removed the bare class from: `utils.js FOCUS_RING_CLASSES`, `TabBar.jsx`, `CollapsibleSection.jsx`, `FilterSidebar.jsx` (MultiSelect trigger), `DropZone.jsx`, `Progress.jsx` (×2), `Health.jsx` (×3), `Timeline.jsx`, `HealthAnomalies.jsx` (×2), `HealthBars.jsx` (×2). Visually identical — verified by rebuilding and confirming `.focus-visible\:outline-2:focus-visible{outline-style:var(--tw-outline-style);outline-width:2px}` still ships.

**Verified:**
- `./node_modules/.bin/vite build` clean (3.37s)
- `npm test` — 61/61 pass
- DaisyUI `.toggle` + `.toggle-primary` both ship in built CSS (`.toggle-primary:checked,.toggle-primary[aria-checked=true]{--input-color:var(--color-primary)}`)
- `hover:bg-base-content/5`, `hover:bg-primary/20`, `focus-visible:outline-2` all present in built CSS
- No `focus-visible:outline focus-visible:outline-2` pairings remain in dashboard/js

### Custom-CSS cleanup — round 3 (full sweep to the strict minimum)

User flagged that round 2 was still too conservative after asking "why does it look like there are still a shit ton of unnecessary custom stuff?". Honest audit showed ~80 of the ~96 custom classes were just named aliases for Tailwind utility groupings with no Tailwind-incompatible features — I'd been drawing the "needs custom" line at "has any CSS feature worth naming" instead of "has a Tailwind-incompatible feature". Round 3 is the full sweep to the strict minimum.

**Scope:** 72 custom classes deleted, 24 remain (all with documented Tailwind-incompatible features). ~100 JSX className edits across 15 files. `dashboard/styles.css` 1531 → 1008 lines (−34%).

**Group A — Trivial one-liners:** `.hamburger-menu`, `.hamburger-list`, `.hamburger-divider`, `.hamburger-version`, `.dashboard-layout`, `.tabs-bar`, `.tab-content-area`, `.settings-section`. Each was 1-5 CSS declarations that map 1:1 to Tailwind utilities.

**Group B — Dashboard header base:** The `::after` gradient pseudo-element stays (pseudo-elements can't be Tailwind utilities). The base rule (`position: relative; z-index: var(--z-sticky-header)`) migrated to inline `relative z-[21]` in Header.jsx.

**Group C — Collapsible section internals:** `.collapsible-header`, `.collapsible-title`, `.collapsible-subtitle`, `.collapsible-chevron` all migrated. The chevron rotation is now driven by React state via conditional `rotate-180` instead of the previous `[aria-expanded="true"]` descendant selector (React already has the expanded state — no reason to round-trip through an attribute). `.collapsible-content` STAYS — the `max-height: 0 → none` transition has no Tailwind primitive (Tailwind's `max-h-*` utilities don't include `none`, and clamping to `max-h-[9999px]` would clip long sections). `.collapsible-header` kept as zero-style marker class ONLY so `.embed-mode .collapsible-header { display: none }` can still target it in embed iframes.

**Group D — Hamburger menu items:** `.hamburger-item`, `.hamburger-item-icon`, `.hamburger-item-label`, `.hamburger-item-external`, `.hamburger-item-highlight`, `.hamburger-item-destructive`, `.hamburger-backdrop` all migrated. Destructive and highlight state variants are now conditional className builders driven by `item.destructive` / `item.highlight` props. The CSS descendant selectors for icon color (`.hamburger-item-destructive .hamburger-item-icon { color: error }`) are replaced with explicit conditional `text-*` classes on the icon span.

**Group E — Filter multi-select listbox:** `.filter-multi-select`, `.filter-multi-select-trigger`, `.filter-multi-select-dropdown`, `.filter-multi-select-option` (+ `.selected-text` and `.arrow` descendants), `.filter-group` all migrated. Open/closed dropdown state, selected-row highlight, and keyboard-highlighted row now driven by conditional className builders in JSX (React state is the source of truth — no more state-class + descendant selector round trip). Focus-visible ring inlined on the trigger button.

**Group F — Detail pane internals:** `.detail-pane-header`, `.detail-pane-title`, `.detail-pane-subtitle`, `.detail-pane-content`, `.detail-pane-empty`, `.detail-pane-loading`, `.detail-commit`, `.detail-commit-message`, `.detail-commit-meta`, `.detail-commit-tags` all migrated. Mobile padding overrides use `max-md:` Tailwind variants. `.detail-pane` + `.detail-pane-overlay` STAY (transform-based slide-over transitions). `.detail-pane-header` kept as zero-style marker for mobile `::before` drag-handle.

**Group G — Settings pane internals:** `.settings-pane-title`, `.settings-pane-content`, `.settings-section-title`, `.settings-group`, `.settings-toggle` (+ all variants), `.settings-toggle-switch` with `::after` thumb, `.settings-toggle.active` state, `.settings-row`, `.settings-view-level-group`, `.settings-work-hours-hint`, `.settings-hint` all migrated. The toggle switch's `::after` thumb pseudo-element is now expressed via Tailwind's `after:` variant with `after:content-['']` + `after:absolute after:top-0.5 after:left-0.5 after:w-5 after:h-5 after:bg-white after:rounded-full after:transition-transform`. Active state conditional: `bg-primary after:translate-x-5` vs default `bg-base-300`. Shared Tailwind class strings extracted as JS constants (`SECTION_TITLE_CLASSES`, `TOGGLE_BASE_CLASSES`, `TOGGLE_LABEL_CLASSES`, `TOGGLE_HINT_CLASSES`) inside SettingsPane.jsx.

**Group H — Drop zone:** `.drop-zone`, `.drop-zone-container`, `.drop-zone-heading`, `.drop-zone-icon` all migrated. Drag-over state driven by React `isDragOver` state via conditional className builder (`dropZoneBase` + optional `dropZoneActive`). Icon color flip (`text-base-content/60` → `text-primary` during drag-over) also inline conditional. Focus-visible state via Tailwind `focus-visible:*` variants.

**Group I — Filter sidebar inner:** `.filter-sidebar-inner` base + mobile drawer overrides migrated. Desktop `w-[280px] p-4 bg-base-200 rounded-lg border border-base-300 space-y-4` inline; mobile `max-md:w-full max-md:h-full max-md:rounded-none max-md:border-0 max-md:overflow-y-auto max-md:pt-6` via Tailwind's `max-md:` variants. `.filter-sidebar-inner label { display: block; font-size: 12px; ... }` global descendant selector replaced with explicit `block text-xs text-base-content/60 mb-1` on each `<label>` in JSX — makes the label typography visible at each call site instead of hidden in a cross-cutting CSS rule.

**Group J — Heatmap:** `.heatmap-grid`, `.heatmap-header`, `.heatmap-label`, `.heatmap-cell`, `.heatmap-cell-sm`, `.heatmap-tooltip-inner` all migrated. The grid template columns use Tailwind arbitrary values (`grid-cols-[36px_repeat(7,1fr)]` desktop, `grid-cols-[50px_repeat(7,1fr)]` via `sm:` variant). The tooltip's `.visible` state class replaced with conditional `opacity-0`/`opacity-100`. The 5 intensity-level classes (`.heatmap-0` .. `.heatmap-4`) STAY — they're semantic data-viz tokens referenced dynamically in JSX via `heatmap-${level}` template strings, and the color-mix() gradient expressions are too long to inline at every cell (which would duplicate 168 times in the 24×7 full heatmap).

**Group K — Embed + misc:** `.embed-error` + its `code` / `a` descendants migrated. `.project-lang-badge` migrated with `text-[10px]` arbitrary value.

**Group L — TabBar:** `.tab-btn` and `.tab-btn-active` both migrated. Shared class strings extracted as `TAB_BASE_CLASSES` and `TAB_ACTIVE_CLASSES` JS constants inside TabBar.jsx. Active-state text-shadow glow uses Tailwind's `[text-shadow:...]` arbitrary property syntax because Tailwind v4 doesn't ship a text-shadow utility out of the box.

**Global a11y rule removed:** `[role="button"]:focus-visible, [role="tab"]:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 2px }` was the last non-class custom CSS rule. Replaced by inlining `focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2` (or the `focus-visible:ring-*` equivalent when the element already has a matching `hover:ring-*` pattern) on every `role="button"` consumer: Summary tiles (×4), Timeline stat tiles + period card (×4), Progress tiles + rows (×5), Health tiles + repo card (×3), HealthAnomalies risk/debt rows, HealthBars urgency/impact wrappers, HealthWorkPatterns tile, CollapsibleSection header, DropZone container. `FOCUS_RING_CLASSES` constant exported from utils.js for consumers that want the long string as a variable instead of inline.

**Final regression guard — styles.css allowlist:**

`scripts/__tests__/daisyui-surfaces.test.mjs` gained a strict `styles.css allowlist` test that enumerates the 24 legitimate custom classes and fails if ANY new primary rule head appears in styles.css that isn't in the list. The allowlist body includes inline guidance: add a class only if it has a Tailwind-incompatible feature documented in a rationale block (pseudo-element, @keyframes, non-Tailwind transition value, transform-based slide-over, CSS-load-failure survival, or unshipped utility). Otherwise migrate to inline Tailwind at the JSX consumer. Test also verifies every allowlisted class still has a rule in styles.css — stale allowlist entries are as bad as unauthorized new rules.

**Final allowlist (24 classes):**

```
Pseudo-element / ::after / ::before:
  dashboard-header, detail-pane-header, settings-pane-header

@keyframes animations:
  dashboard-enter, hamburger-dropdown, hamburger-update-dot

Non-Tailwind CSS transition (max-height: 0 → none):
  collapsible-content

Transform-based slide-over drawer shells:
  filter-sidebar, filter-sidebar-overlay,
  detail-pane, detail-pane-overlay,
  settings-pane, settings-pane-overlay

Not shipped by Tailwind:
  scrollbar-hide (::webkit-scrollbar), header-filter-hint (font: inherit)

Data-viz intensity levels (dynamic JSX reference):
  heatmap-0, heatmap-1, heatmap-2, heatmap-3, heatmap-4

Isolated rendering (survives CSS load failure):
  root-error-message, root-error-detail, root-error-hint

Root state marker (read by descendant selectors):
  embed-mode
```

**Verified:**

- `./node_modules/.bin/vite build` clean after every group (12 intermediate builds).
- `npm test` 61/61 pass (21 existing oklchToHex + 36 DaisyUI surface assertions + 1 new strict allowlist guard + earlier additions).
- `playwright test --list` still enumerates all 62 e2e tests.
- `dashboard/styles.css` 1531 → 1008 lines (−523, −34%).
- No `.stat-card` / `.metric-selector` / `.pin-btn` / `.tag-{name}` / `.skeleton` / `.loading-spinner` / `.detail-commit` / `.hamburger-item` / `.settings-toggle` / `.collapsible-header` / `.tab-btn` / etc. anywhere in JSX or CSS.
- FilterSidebar label `mb-0` override no longer needed — the descendant `.filter-sidebar-inner label` rule that caused it is gone.
- Every `role="button"` consumer in dashboard/js carries its own focus-visible ring inline; the global attribute selector rule is gone.

### Custom-CSS cleanup pass — round 2 (base classes + print variant + filter helpers + caught regressions)

Immediate follow-up to the first custom-CSS cleanup round earlier today. Post-cleanup self-audit flagged a handful of additional Tailwind-replaceable custom classes AND three consumers I missed in the tag cleanup sweep.

**Additional Tailwind-utility migrations:**

1. **`.tag` base class → inline Tailwind utilities.** The earlier round deleted the 40+ `.tag-{name}` per-tag color rules and `.tag-dynamic` variable bridge but kept `.tag` as a base layout class (padding, border-radius, font-size, font-weight). All five declarations are available as Tailwind utilities: `inline-block px-2 py-0.5 rounded-full text-xs font-medium`. Deleted the `.tag` rule; all 5 JSX consumers now carry the full 5-utility class string inline. There is no `.tag` CSS class anywhere — tag chip layout AND colors are both inline.

2. **`.no-print` custom class → Tailwind `print:hidden` variant.** The custom class was a 1-rule `@media print { display: none !important }` block. Tailwind v4 ships a `print:` variant that generates an equivalent rule automatically when `print:hidden` appears in source. Migrated 7 consumers (App.jsx ×4, Toast.jsx, Header.jsx) and deleted the custom rule. Verified `.print\:hidden` ships in the built CSS after the migration.

3. **`.filter-group-header` → `flex items-center mb-1`.** Plus the associated `.filter-group-header label { margin-bottom: 0 }` override — replaced with an explicit `mb-0` class on the label in JSX (needed because the global `.filter-sidebar-inner label { margin-bottom: 4px }` rule would otherwise apply to labels inside the flex wrapper).

4. **`.filter-date-group` → `flex flex-col gap-1.5`.** 1 consumer in FilterSidebar.jsx, 3 declarations all Tailwind-replaceable.

5. **`.filter-empty-option` → `text-base-content/40 cursor-default`.** 1 consumer, 2 declarations all Tailwind-replaceable.

**Regression caught during the audit:**

A sweep for stale `className="tag"` patterns surfaced three consumers I missed in the earlier tag-color cleanup sweep:
- `Health.jsx:199` — hardcoded `<span className="tag tag-security">security</span>` label inside the security event alert
- `Health.jsx:270` — same, in a different security panel
- `Timeline.jsx:507` — `<span className="tag tag-other shrink-0">+{tags.length - 3}</span>` "+N more" badge for tags beyond the first 3 displayed

These used the old `.tag` + `.tag-{name}` CSS class combo, which was deleted in the earlier round. Since the CSS rules no longer exist, these three spans were rendering as UNSTYLED text (no background, no padding, no border-radius). Probably not noticeable on a local dev preview but would have been a visible regression on any deployed build. Fixed by migrating all three to the same `inline-block px-2 py-0.5 rounded-full text-xs font-medium` + `style={getTagStyleObject(...)}` pattern the other tag chip consumers use. Health.jsx also gained a `getTagStyleObject` import (previously didn't need it).

**Strengthened regression guard:**

The source-level `.tag base class stays deleted` test was previously weak — it only verified that the 4 originally-known tag consumer files contained the Tailwind class string at least once, and that `.tag { ... }` wasn't in styles.css. The strengthened version sweeps every `.jsx` file in `dashboard/js/` and fails if any `className` attribute contains:

- `tag` as a bare space-delimited token (catches `className="tag"` / `className="tag shrink-0"` / `className="tag tag-security"`), OR
- Any `tag-{name}` per-tag class from the 34+ legacy names (`tag-feature`, `tag-bugfix`, `tag-docs`, etc.)

Comment-stripped so rationale blocks that mention the removed classes don't false-trigger. Added Health.jsx to the consumer-list assertion so future tag chips in that file are covered too. This is the test that WOULD have caught the three missed consumers if it had existed during the earlier round.

**Documentation sync:**

- `docs/DAISYUI_V5_NOTES.md` "Tag chips" section: updated the JSX usage example from `className="tag"` to the full Tailwind utility string, noted the `.tag` base class was deleted in the follow-up pass.
- `dashboard/js/utils.js` `getTagClass` removal comment: updated to mention the base-class deletion too.
- `dashboard/styles.css` `.tag-{name}` removal rationale block: updated to reflect that the `.tag` base class is also gone.
- `dashboard/js/components/Toast.jsx`: inline comment about `no-print` updated to mention the `print:hidden` migration.

**Build impact:**

- styles.css: 1456 → 1455 lines (-1 from delete/comment swap balance).
- No change to bundled CSS size (the deleted rules were small; the migration shifted to inline utility classes that Tailwind tree-shakes per-file usage).
- `npm test` 57 → 60 (3 new assertions: tag sweep, `.no-print` custom class absence, print:hidden variant presence in built CSS).
- `vite build` clean; `playwright test --list` still enumerates 62 e2e tests.

**Verified invariants after the round:**

- Zero `.tag { }` base class, zero `.tag-{name}` per-tag rules, zero `.tag-dynamic` CSS-variable bridge.
- Zero `className="tag"` or `className="tag-..."` in any JSX file (the sweep test catches both).
- Zero `.no-print` custom class, zero `className="...no-print..."` consumers.
- Zero `.filter-group-header`, `.filter-date-group`, `.filter-empty-option` custom rules.
- All 5 Tailwind chip utilities (`inline-block`, `px-2`, `py-0.5`, `rounded-full`, `text-xs`, `font-medium`) plus `print:hidden`, `flex`, `items-center`, `mb-0`, `mb-1`, `flex-col`, `gap-1.5`, `text-base-content/40`, `cursor-default` all present in the built CSS.

### Custom-CSS cleanup pass — utility-hijack removal, dead rule deletion, tag-color deduplication

Driven by a fresh audit of the codebase against "no custom Tailwind / CSS unless absolutely necessary — only with explicit approval". Six cleanup groups shipped as a single pass after user approval.

**Group 1 — Dead CSS removal** (zero behavior change):

- Deleted `.skeleton` + `.skeleton-commit` + `.skeleton-line[-short|-medium]` + `@keyframes skeleton-loading`. Zero JSX consumers. Also shadowed DaisyUI v5's own `.skeleton` component, so removing our custom rule lets a future consumer use `<div className="skeleton h-4 w-full" />` directly.
- Deleted `.timeline-dot`, `.stat-label`, `.stat-value`, `.detail-pane-content-loaded`, `@keyframes fadeIn`. All had zero consumers.
- Net: ~35 lines removed from styles.css.

**Group 2 — Custom Tailwind utility hijacks removed**:

Three rules in the pre-existing styles.css hijacked Tailwind utilities by targeting `.text-3xl` / `.text-2xl` / `.card .text-3xl` / `.space-y-6` etc. in selector lists. This violated the "no custom CSS hijacking utilities" rule — JSX consumers couldn't tell by reading the code what typography/sizing they'd get without also knowing the CSS.

1. `styles.css` global rule `.font-mono, h1, h2, h3, .stat-value, .text-3xl, .text-2xl { font-family: var(--font-mono); }` → narrowed to `h1, h2, h3 { font-family: var(--font-mono); }`. Semantic-HTML element targeting is legitimate CSS (not utility hijacking). Explicit `font-mono tracking-tight` classes added to the 22 JSX elements across Summary/Timeline/Progress/Health/HealthWorkPatterns/Discover that need mono numeric displays.
2. `styles.css` card descendant rule `.card .text-3xl, .card .text-2xl { font-family: var(--font-mono); letter-spacing: -0.02em; }` → deleted. The mono part duplicated the global rule; the tracking-tight part is now an explicit `tracking-tight` class in JSX.
3. `styles.css` mobile media query cleanup — four rules deleted:
   - `.card { padding: 16px }` was dead (DaisyUI's `.card` has no padding; `.card-body` does — our rule added padding to the wrapper element, which is structurally wrong)
   - `.card .text-3xl { font-size: 1.5rem }` was redundant (the only consumer — Discover's metric card — already used the responsive Tailwind form `text-2xl sm:text-3xl`)
   - `.card .text-lg { font-size: 0.9375rem }` migrated: `CollapsibleSection` h3 title now `text-base sm:text-lg`
   - `.space-y-6 > * + * { margin-top: 16px }` → migrated to `space-y-4 sm:space-y-6` at all 10 consumer call sites (App.jsx ×2, Contributors, Discover, Health, Progress, Projects, Summary, Timeline, Timing)

**Group 3a — safeStorage helper deduplication**:

`dashboard/js/pwa.js` previously defined private `safeStorageGet/Set/Remove` copies alongside `utils.js`'s identical exports. The old "avoid utils chain" comment was premature optimization — utils.js only imports from state.js (a constants-only module with no side-effects). `pwa.js` now imports the three helpers from utils.js. The two `safeSessionGet/Set` wrappers stay local because sessionStorage isn't wrapped in utils.js and they're the only consumers; rationale comment added.

**Group 3b — Tag color duplication collapsed**:

Before: the 34 tag colors were defined TWICE — once as hex strings in `TAG_COLORS` (utils.js, used for Chart.js dataset colors), and once as rgba rules in 40+ `.tag-{name}` CSS classes (styles.css, used for chip display styling). Adding, renaming, or recoloring a tag required editing both files in sync.

After:
- Extended utils.js with `TAG_TEXT_OVERRIDES` — the 8 tags where the chip text uses a lighter brand variant for readability on the 30%-opaque background (`security`, `refactor`, `cleanup`, `config`, `style`, `performance`, `dependency`, `other`). These mismatches were previously encoded only in the CSS.
- Generalized `getTagStyleObject(tag)` in utils.js to return a direct `{ backgroundColor, color, border }` object for all tags. Static tags: `0.3`/`0.5` alphas (higher presence for known categories). Dynamic tags: `0.2`/`0.3` alphas (muted for ad-hoc labels). Text color: `TAG_COLORS[tag]` by default, `TAG_TEXT_OVERRIDES[tag]` when present.
- Removed `getTagClass` export from utils.js.
- Deleted all 40+ `.tag-{name}` CSS rules, the `.tag-dynamic` CSS-variable bridge, and the dead `.tag-breaking` rule from styles.css.
- Updated 5 JSX consumers — `sections/Tags.jsx`, `sections/Timeline.jsx` ×2, `sections/Contributors.jsx`, `components/DetailPane.jsx` — to drop the `getTagClass` import + call and use `className="tag"` with the inline style.

Result: 34 tag colors + 8 text overrides defined in exactly one place (utils.js). The `.tag` base class in styles.css remains — it provides the common layout (padding, border-radius, font-size, font-weight) shared across all tags.

**Group 4 — `TAB_SECTIONS` dead export removed**:

`dashboard/js/state.js` exported a `TAB_SECTIONS` map documenting the tab→section mapping. Zero JSX consumers — the comment even said "Actual routing is in App.jsx — this documents the structure". That documentation exists in the CLAUDE.md "Dashboard Architecture" table already. Deleted the export; updated CLAUDE.md to explicitly note routing is in App.jsx's switch statement and that the doc table is the single source of truth. `state.js` rationale comment added.

**New regression-guard assertions**:

`scripts/__tests__/daisyui-surfaces.test.mjs` gained 6 new tests so the cleanup invariants are protected by the source-level tripwire:

1. Dead classes stay deleted (skeleton, timeline-dot, stat-label, stat-value, detail-pane-content-loaded, @keyframes skeleton-loading) — CSS-comment-stripped so rationale blocks mentioning the removed names don't false-trigger.
2. Tailwind utility hijack rules stay deleted — `.text-3xl`/`.text-2xl`/`.font-mono`/`.stat-value` in `font-family` selectors, `.card .text-3xl`/`.card .text-2xl` descendant selectors, `.space-y-6 > *` descendant selector.
3. Per-tag CSS rule re-introduction — any `.tag-{name} { ... }` block pattern (the `.tag` base class is allowed).
4. `getTagClass` export re-introduction in utils.js.
5. `TAB_SECTIONS` export re-introduction in state.js.
6. Local `safeStorageGet` definition re-introduction in pwa.js + verifies the import from utils.js is present.

Total surface assertions: 30 → 36. `npm test` total: 51 → 57 (21 oklchToHex + 36 surfaces).

**Build impact**:

- `dashboard/styles.css`: 1531 → 1456 lines (-75, -5%).
- `dist/assets/index-*.css`: ~158 KB → ~156 KB (-2 KB, includes DaisyUI's baseline).
- `dist/assets/index-*.js`: unchanged ±100 bytes.
- `vite build` clean after every group.
- `npm test` 57/57 pass.
- `playwright test --list` 62 tests (14 smoke + 48 visual) — config still parses, specs still discoverable.

**Verified invariants after the pass**:

- Zero custom CSS rules shadowing DaisyUI component classes (`.card`, `.btn-*`, `.badge`, `.toast-*`, `.skeleton`, `.loading-spinner` all gone).
- Zero Tailwind utility hijacks (`.text-3xl`/`.text-2xl`/`.space-y-6`/`.card .text-lg` all deleted).
- Zero hardcoded Tailwind color shades in dashboard/js/**/*.jsx.
- Zero dead marker classes in JSX className attributes.
- Zero v4 DaisyUI cruft (`select-bordered` / `input-bordered` / `btn-bordered` etc.) in built CSS.
- Zero per-tag `.tag-{name}` CSS rules — tag colors sourced from TAG_COLORS + TAG_TEXT_OVERRIDES in utils.js.
- Tag chip CSS now: 1 base `.tag` class (shared layout) + inline styles from `getTagStyleObject(tag)`.
- safeStorage helpers defined once (utils.js), imported by AppContext/themes/pwa/QuickGuide/Discover.

### Chart.js runtime theme-tracking + Playwright test infrastructure — deferred follow-ups landed

After two audit passes closed the immediate DaisyUI v5 gaps, the three items that had been documented in `docs/TODO.md` as deferred ("too big for the audit pass") are now shipped. This pass addresses them in one go.

**1. Chart.js single-accent runtime theme-tracking**

Previously, `dashboard/js/chartColors.js` exported static `accentColor` / `mutedColor` values that were frozen at module load from URL params or the hardcoded default `#2D68FF` brand blue. Chart components imported them directly, so non-default themes (`emerald`, `dracula`, `caramellatte` etc.) rendered single-accent charts (hour-of-day heatmap, weekday bars, commit volume bar, contributor complexity bar) in brand blue while the rest of the dashboard followed the user's theme.

The fix:

- `chartColors.js`:
  - New exports `resolveRuntimeAccent()` and `resolveRuntimeMuted()` that return the URL override (sticky for branded embeds) or read `--color-primary` / `--color-base-content` from `getComputedStyle(document.documentElement)` at call time.
  - New booleans `hasUrlAccentOverride` / `hasUrlMutedOverride` exposed from the URL parser so the resolvers can distinguish "embedder set `?accent=` to the default value" from "no URL override".
  - `parseColorOverrides()` now tracks explicit override state alongside the resolved color.
  - The muted resolver uses `color-mix(in oklab, var(--color-base-content) 40%, transparent)` — matches the dashboard's existing `text-base-content/40` tertiary text tint. Chart.js canvas parses color-mix() directly in modern browsers (same capability the existing `themes.js applyTheme()` uses for `ChartJS.defaults.color`).

- `AppContext.jsx`:
  - Reducer state gains `themeAccent` / `themeMuted`, seeded from `chartColors` bootstrap values.
  - New `SET_THEME_COLORS` action type with a no-op guard that skips re-renders when the resolved values haven't changed (e.g. dark/light toggle between two themes with identical `--color-primary`).
  - `darkMode` effect now dispatches `SET_THEME_COLORS` with `resolveRuntimeAccent()` / `resolveRuntimeMuted()` return values AFTER `applyTheme()` has mutated `data-theme`. Two-render sequence: first render uses the previous theme's accent (harmless — DOM hasn't painted yet), second render after the dispatch uses the new theme's accent and charts re-memo with the new values.

- Chart section consumers migrated:
  - `sections/Timing.jsx`: hour-of-day + weekday bar backgroundColor — now `state.themeAccent` / `state.themeMuted`. Removed the direct `accentColor` / `mutedColor` import.
  - `sections/Timeline.jsx`: commit-volume bar + net-lines bar backgroundColor — now `state.themeAccent`. Impact chart's 'internal' segment now `state.themeMuted`. Removed `accentColor` / `mutedColor` from the imports.
  - `sections/Contributors.jsx`: low-complexity segment color — now `state.themeMuted`. Removed `mutedColor` import.
  - All affected `useMemo` deps updated to include `state.themeAccent` / `state.themeMuted` so chart configs rebuild when the theme changes.

- `main.jsx` bootstrap updated: the `--chart-accent-override` CSS variable is now set ONLY when `hasUrlAccentOverride === true`. Previously the bootstrap always set `--chart-accent-rgb` from the resolved accent, which shadowed the theme's `--color-primary` even when no embedder was involved.

Rationale blocks added at every touched site explaining the pattern with pointers to the chartColors.js comment for the URL-override precedence rules. Bootstrap-path `accentColor` / `mutedColor` exports are kept as documented "bootstrap fallbacks" for pre-React code + SSR paths.

**2. Heatmap CSS theme-tracking + embed override redesign**

The old heatmap CSS used `rgba(var(--chart-accent-rgb, 45, 104, 255), X%)` with a comma-separated RGB triple stored in a CSS variable. That pattern only worked because main.jsx parsed `accentColor` at bootstrap and wrote `--chart-accent-rgb: R, G, B`. It could never track theme changes (one-shot bootstrap) and couldn't handle DaisyUI's oklch() color values (wrong format).

Replaced with the nested-var + color-mix approach:

```css
.heatmap-1 { background-color: color-mix(in oklab, var(--chart-accent-override, var(--color-primary)) 15%, transparent); }
.heatmap-4 {
    background-color: var(--chart-accent-override, var(--color-primary));
    color: var(--color-primary-content);
}
```

- Default path: `var(--color-primary)` resolves per-theme via DaisyUI's theme plugin, so the heatmap cells pick up `nord` blue / `emerald` green / `coffee` brown automatically.
- Embed override: when the embedder sets `--chart-accent-override` (via `main.jsx` bootstrap from the URL `?accent=` param), that takes precedence across all themes.
- Text contrast: high-intensity cells (`.heatmap-3`, `.heatmap-4`) now use `var(--color-primary-content)` instead of hardcoded `white`. On light themes where the primary is a pale color, white text was invisible; `--color-primary-content` is DaisyUI's semantic "contrasting foreground for content on primary" token.
- Deleted the old `--chart-accent-rgb` variable + its RGB-parse bootstrap block in `main.jsx`.

**3. Test infrastructure — three layers**

Added three complementary layers of automated regression coverage for the DaisyUI migration.

**Layer 1: Source-level tripwire** — `scripts/__tests__/daisyui-surfaces.test.mjs`

- 30 assertions across every migration phase (1–10) + follow-up fixes (color tokens, loading spinner shadow, progress bars, dead marker classes, Chart.js theme-tracking, heatmap CSS).
- Runs via `node:test` on every `npm test` — no browser, no transpilation, ~230ms total runtime.
- Strategy: read source files, assert that expected DaisyUI class names are present at expected call sites AND that removed custom classes are NOT re-introduced.
- Comment-stripping helper so rationale blocks that intentionally reference removed class names don't false-trigger the regression checks.
- Also verifies the BUILT CSS ships the DaisyUI classes we reference (`dist/assets/index-*.css` greps for `.modal-open`, `.loading-spinner`, `.progress-info`, etc.) — skips gracefully when `dist/` is missing for fresh-clone test runs.
- Includes a sweep-style test that walks every `.jsx` file under `dashboard/js/` and asserts zero hardcoded Tailwind color shades (`bg-red-500`, `bg-green-500`, etc.) remain outside comment blocks.
- Includes a dead-marker-class sweep for `stat-card` / `metric-selector` / `pin-btn` re-introductions.
- Pass rate after this commit: 51/51 total tests (30 new surface assertions + 21 existing oklchToHex tests).

**Layer 2: Runtime smoke** — `dashboard/e2e/daisyui-surfaces.spec.js` (Playwright)

- 14 Playwright tests walking the TESTING_GUIDE "DaisyUI component-class migration" checklist in a real Chromium instance.
- Each test asserts a specific migrated surface renders with the expected DaisyUI classes on real DOM nodes AFTER React has rendered and CSS has resolved.
- Interaction coverage: opens QuickGuide modal via hamburger → asserts `.modal.modal-open` / `.modal-box` / `.modal-backdrop` / `.modal-action` all present → presses Escape → asserts hidden.
- Portal / stacking-context assertion for the HamburgerMenu Phase 9 fix — walks the DOM parent chain via `page.evaluate` to verify the dropdown is NOT a descendant of `.dashboard-header`, and reads `getComputedStyle(nav).position` to assert `"fixed"` (confirming `createPortal` worked).
- Chart.js theme tracking: picks a non-active theme via the burger menu, waits for the chart re-memo, asserts the dataset's resolved `backgroundColor` has changed.
- v4 cruft regression guard: `select-bordered`, `input-bordered` explicitly asserted absent via `toHaveClass(/... /).not.` — catches re-introductions that look visually correct.
- Beforeach helper waits for the `"Loading dashboard…"` splash to go away before running assertions.

**Layer 3: Visual regression** — `dashboard/e2e/visual/theme-baselines.spec.js` (Playwright)

- 48 screenshot baselines = 6 tabs × (4 light + 4 dark) themes. Generated via `npm run test:visual:update`, committed to `dashboard/e2e/visual/__screenshots__/`.
- Applies each theme by writing `darkMode` + `lightTheme` / `darkTheme` to `localStorage` and reloading — goes through the same flash-prevention + AppContext bootstrap path that users hit on fresh load. Sanity-checks `html[data-theme]` before capturing.
- `maxDiffPixelRatio: 0.002` (0.2% pixel difference threshold) tolerates font-rendering variance across Linux headless Chromium versions without letting real regressions slip through.
- Full-page screenshots (`fullPage: true`) so long scrolling sections (Breakdown, Projects) are in the baseline too.
- Purpose: catch silent visual regressions that the source-level and runtime smoke tests can't see — the exact class of bug the `-bordered` v4 cruft fell into (looked correct in the default theme, never exercised in non-default themes).

**Playwright configuration** — `playwright.config.js`

- Two projects: `smoke` (DOM assertions) and `visual` (screenshot baselines). Smoke runs fast for every commit; visual runs explicitly via `npm run test:visual`.
- `webServer` launches `npm run build && npm run preview --strictPort` automatically so tests always run against the production build (matches what ships).
- `launchOptions` block honors `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` env variable so sandboxed / firewalled environments can use a system-installed Chromium as a drop-in replacement for Playwright's managed binary. Documented in `dashboard/e2e/README.md`.
- CI-aware: `forbidOnly` rejects `test.only()` on CI, `retries: 2` on CI vs 0 locally, dot reporter on CI vs HTML locally.

**Package scripts**

- `npm test` — unit + source-level tests (existing, now includes the 30 new surface assertions).
- `npm run test:e2e:install` — installs Chromium + system deps (~170MB, run once per machine/CI runner).
- `npm run test:e2e` — runs the smoke project.
- `npm run test:e2e:ui` — Playwright's interactive UI for debugging.
- `npm run test:visual` — runs the visual regression project.
- `npm run test:visual:update` — regenerates screenshot baselines after intentional visual changes.

**Documentation**

- `dashboard/e2e/README.md`: full rationale, maintenance guide, CI setup recipe, troubleshooting (including "Host not allowed" errors on sandboxed networks), cross-reference to `docs/TESTING_GUIDE.md`.
- `.gitignore`: added entries for Playwright transient output (`test-results/`, `playwright-report/`, `playwright/.cache/`, screenshot diff PNGs) while keeping committed baselines tracked.

**Verified**

- `./node_modules/.bin/vite build` clean.
- `npm test` → 51/51 pass (21 oklchToHex + 30 new DaisyUI surface assertions).
- `playwright test --list` enumerates 14 smoke tests + 48 visual tests across both projects — confirms config parses and specs are discoverable. The tests themselves can't run in the current sandbox (no Chromium binary available, CDN blocked) but are ready for CI and any machine with `npm run test:e2e:install` or `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` set.

### Second audit pass — DaisyUI v5 gap sweep (hardcoded colors, loading spinner shadow, progress bars, dead marker classes)

A fresh run of the 10-step DaisyUI v5 compliance audit against the post-first-audit codebase turned up four additional gaps that hadn't been caught. All four are fixed in commit `de2e6ad`.

**1. Hardcoded Tailwind color classes → DaisyUI semantic tokens**

The data-viz categories across Health, Progress, Discover, Timing, HealthBars, and HealthAnomalies were using fixed `bg-green-500` / `bg-red-500` / `bg-amber-500` / `bg-blue-500` / `bg-purple-500` / `bg-gray-500` / `bg-indigo-500` shades that don't track the active theme. This violates the CLAUDE.md rule against hardcoding theme values, and on dark themes (`black`, `dim`, `coffee`) or warm themes (`caramellatte`) the mid-saturation tones can blend with or clash against the page base. Mapped to DaisyUI semantic tokens:

- `bg-green-500` → `bg-success` (planned work, low risk, debt paid, minor semver, left-side comparison, "work hours" legend dot)
- `bg-red-500` / `bg-red-600` → `bg-error` (high risk, debt added, major semver, "outside work hours" legend dot)
- `bg-amber-500` / `bg-amber-600` → `bg-warning` (reactive work, medium risk, right-side comparison, "mixed hours" legend dot)
- `bg-blue-500` → `bg-info` (routine work, user-facing impact, patch semver)
- `bg-gray-400` / `bg-gray-500` → `bg-neutral` (internal impact, neutral debt)
- `bg-purple-500` → `bg-secondary` (infrastructure impact)
- `bg-indigo-500` → `bg-primary` (generic epic progress bar)
- `bg-green-500` (api impact) → `bg-accent` — distinct from `bg-success` (planned work) so that within any given theme, the 4-category impact chart renders with 4 visibly distinct colors instead of repeating

Rationale comment blocks added next to the color arrays in `Health.jsx` and `HealthBars.jsx` explaining why the 4-token impact palette uses `info` / `neutral` / `secondary` / `accent`.

**2. `.loading-spinner` custom class shadow removal**

The custom `.loading-spinner` rule in `dashboard/styles.css` was shadowing DaisyUI v5's own `.loading-spinner` animation variant — exactly the same trap as the `.card` / `.btn` / `.badge` / `.toast` shadow cases caught in the 10-phase sweep. Our custom class provided full styling (display, size, border-radius, border-top-color, animation keyframes) so consumers using `className="loading-spinner loading-spinner-sm"` hit our custom code instead of DaisyUI's `@layer components` definition.

Migrated all four consumers (`App.jsx`, `sections/Timeline.jsx`, `sections/Projects.jsx`, `sections/Discover.jsx`) to the proper DaisyUI pattern:

```jsx
// Before:
<div className="loading-spinner loading-spinner-sm" />
// After:
<span className="loading loading-spinner loading-sm text-primary" aria-label="Loading" />
```

Every migrated consumer is now a `<span>` (inline element) matching DaisyUI's `display: inline-block` + `mask-image` base, with `aria-label="Loading"` for screen readers. The `text-primary` override threads the active theme's primary color through DaisyUI's `currentColor` fill so the spinner matches the theme's accent.

CSS cleanup: deleted `.loading-spinner`, `.loading-spinner-sm/md/lg`, dead `.loading-overlay` (no JSX consumer anywhere), and unused `@keyframes spin`. Simplified the `prefers-reduced-motion` rule — dropped the stale `.loading-spinner` target since the universal selector already catches every animated element.

**3. Single-value progress bars → native `<progress>`**

Two places (`Progress.jsx` epic breakdown bar, `Discover.jsx` file-change bar) rolled their own two-div wrapper+fill progress pattern. Both migrated to the native HTML `<progress>` element with DaisyUI's `progress` class + theme-aware `progress-{variant}` color:

```jsx
// Before:
<div className="w-full bg-base-300 rounded-full h-2">
  <div className="bg-primary h-2 rounded-full" style={{ width: `${pct}%` }} />
</div>

// After:
<progress
  className="progress progress-primary w-full"
  value={pct} max="100"
  aria-label={`${epic} progress: ${pct} percent`}
/>
```

Wins:
- One semantic element per bar (was two divs)
- Free screen-reader announcement "X percent of 100" via the native element
- Fill color tracks theme via `progress-{primary|info}` — theme swap updates every bar in place
- DaisyUI's `.progress` ships at `height: .5rem` which matches our prior custom `h-2` visual

Stacked bars (`HealthBars.jsx` UrgencyBar / ImpactBar, `Discover.jsx` comparison bar) stay custom because they show MULTIPLE simultaneous values — native `<progress>` can't render a multi-segment stacked bar. Their structural pattern is unchanged; only the segment fill colors are migrated to semantic tokens (item 1 above).

Verified via grep that `.progress-primary` and `.progress-info` both ship in the built CSS — this was an audit concern because neither class shipped BEFORE the migration (Tailwind's content-based tree-shaker only emits classes that appear in source).

**4. Dead marker classes (`metric-selector`, `pin-btn`) in Discover.jsx**

Two more orphan marker classes like the `.stat-card` case caught in the first audit: `metric-selector` on a `<select>` and `pin-btn` on a `<button>`, both with zero CSS rules defined anywhere in `dashboard/styles.css`. The actual visual styling was already on the same elements via Tailwind utility classes — the custom class names were doing literally nothing.

Removed the class name from both elements. Added rationale comment blocks at both sites explaining why DaisyUI's `select select-xs` / `btn btn-ghost btn-xs` were rejected:

- The metric picker is an ultra-dense inline control inside a `p-5` card-body, sitting beside a pin toggle in a flex row. DaisyUI's `select` ships a 2rem min-height + chevron icon that would overflow the inline layout.
- The pin toggle is a bare 16px SVG icon. DaisyUI's `btn` applies padding, min-height, and pill border-radius that would shift the card header layout away from its dense design.

Also added missing `type="button"` to the pin toggle while touching it.

**Items deliberately not migrated (documented in SESSION_NOTES / DAISYUI_V5_NOTES):**

- `.hamburger-divider` — unique prefix, no shadow, compact by design; DaisyUI `divider` is a flex+margin component with text-label support that's too heavy for a dense menu
- `HeatmapTooltip` custom portal-based tooltip — DaisyUI `tooltip` is `:hover`-only with no viewport clamping, would require data-tip on hundreds of heatmap cells
- `DebugPill` inline hex colors — renders in an isolated React root that must survive CSS load failure (documented in the component header)

**Verification:**

- `./node_modules/.bin/vite build` clean after the commit
- `node --test scripts/__tests__/oklchToHex.test.mjs` — 21/21 pass
- `grep -oE "\.bg-(success|info|warning|error|primary|secondary|accent|neutral)\b" dist/assets/index-*.css | sort -u` — all 8 semantic tokens present
- `grep -oE "\.loading[a-zA-Z-]*" dist/assets/index-*.css | sort -u` — only DaisyUI v5 loading classes remain (`.loading`, `.loading-spinner`, `.loading-sm/md/lg`)
- `grep -oE "\.progress[a-zA-Z-]*" dist/assets/index-*.css | sort -u` — `.progress`, `.progress-info`, `.progress-primary`
- Grep sweep for hardcoded Tailwind `bg-{color}-{weight}` classes in `dashboard/js/**/*.jsx` returns zero matches

### Post-migration audit — four loose-end fixes (cruft, dead wrapper, double-aria-live, stacking context)

After the 10-phase DaisyUI component-class sweep was pushed, a self-audit of the migration surfaced four items originally flagged as "out of scope" or "deferred". Each was non-trivial enough to warrant its own commit; together they close every actionable item from the audit summary.

**1. DaisyUI v4 `*-bordered` cruft removal (`de9bd4f` + `9e2b154`):**

Phase 8 shipped `select select-bordered select-sm` and `input input-bordered input-sm w-full`. DaisyUI v5 removed the `-bordered` form modifiers because v5 makes the bordered style the default — `*-ghost` is the v5 opt-out for the no-border variant. Tailwind silently drops unknown classes, so the visual result was correct (the base `.select` / `.input` carries the v5 default border) but the JSX referenced four tokens that produced zero CSS rules.

- `dashboard/js/components/SettingsPane.jsx`: both work hour selects → `select select-sm`.
- `dashboard/js/components/FilterSidebar.jsx`: both date inputs → `input input-sm w-full`.
- `dashboard/js/components/Toast.jsx`: top comment said `toast-top` but the code uses `toast-bottom` — aligned.
- `dashboard/styles.css`: stale Phase-7/Phase-10 comment in the focus-visible block — updated to current.
- New `docs/DAISYUI_V5_NOTES.md`: project-local cheat sheet covering the full v4→v5 removed-modifier table (`input-bordered`, `select-bordered`, `textarea-bordered`, `btn-bordered`, `form-control`, `input-group`, `card-bordered`, `card-compact`, `tab-bordered`, `tab-lifted`, `menu-compact`, `menu-normal`, `card-side`, `btn-group`), a grep recipe for verifying which DaisyUI v5 classes ship in the built CSS, our project conventions for cards/buttons/badges/alerts/modals/toasts/tabs/inputs/checkboxes, and the DaisyUI components we deliberately do NOT use (`dropdown`, `menu`, `collapse`, `drawer`) with rejection reasons.
- `docs/AI_MISTAKES.md`: 2026-04-13 entry recording the `*-bordered` trap as a cautionary post-mortem with a pointer to `DAISYUI_V5_NOTES.md`.
- `CLAUDE.md`: documentation table now lists `docs/DAISYUI_V5_NOTES.md` with its update trigger ("when encountering a new DaisyUI v5 quirk, or when adding a new component class to JSX").

**2. `.stat-card` dead-wrapper merge (Summary.jsx):**

The Key Stats grid in `Summary.jsx` had a two-div sandwich for each tile: outer carried `role="button"` + click handler + `tabIndex` + a `stat-card` marker class with no CSS rule defined; inner carried the visual classes (`p-4 bg-base-300 rounded-lg text-center`). The outer was dead weight — the marker class did nothing, and the click target / focus ring was visually wrapping the inner's rounded corners with no real benefit.

- Merged into a single `<div>` per tile carrying both the interaction (`role="button"`, `tabIndex`, `aria-label`, `onClick`, `onKeyDown`) and the visual classes (`p-4 bg-base-300 rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-primary transition-all`).
- Documented the rejection of DaisyUI's `stat` component in the merged comment block: `stat` is a horizontal stat-block with `stat-title` / `stat-value` / `stat-desc` sub-elements; our tiles are a denser 1×4 / 2×2 grid that needs a different visual rhythm.

**3. Toast nested aria-live double-announce fix (Toast.jsx):**

`ToastContainer` had `aria-live="polite" aria-atomic="false"` AND each `ToastItem` had `role={toast.type === 'error' ? 'alert' : 'status'}` plus an explicit `aria-live`. Per WAI-ARIA 1.2 §5.2.2 ("Live Region Roles"), `role="alert"` is an implicit live region with `aria-live="assertive"` and `role="status"` is an implicit live region with `aria-live="polite"`. Wrapping a live region in another live region creates a nested live region and screen readers announce every new child TWICE.

- Removed `aria-live` and `aria-atomic` from `ToastContainer`.
- Removed the redundant explicit `aria-live` from `ToastItem` (the role attribute already implies it).
- Added a documentation block at the top of `ToastItem` explaining the rule so future edits don't re-add either layer.

**4. HamburgerMenu stacking-context fix via React Portal:**

The long-standing `docs/TODO.md` "Stacking Context" entry: `.dashboard-header` has `position: relative; z-index: var(--z-sticky-header)` (z-21) which creates a stacking context. The hamburger menu's backdrop (`z-menu-backdrop` = 40) and dropdown (`z-menu` = 50) were children of `.dashboard-header`, so their effective stacking-context z-index was clamped to z-21 from the document level. Drawer overlays (`z-drawer` = 30) at document-root level rendered ABOVE the menu backdrop. Functionally rare because the menu auto-closes on item selection, but a real regression trap waiting to bite.

- `dashboard/js/components/HamburgerMenu.jsx`: imported `createPortal` from `react-dom`. The trigger button stays inside the header subtree (sticks with the nav bar); only the backdrop + dropdown surface are now rendered via `createPortal(portalContent, document.body)` so they escape the trapped stacking context.
- Position computed from the trigger's `getBoundingClientRect()` in a `useLayoutEffect` (not `useEffect` — measurement must happen before paint so the dropdown's first frame is correctly placed). Applied as inline `top` / `left` style on the `position: fixed` dropdown.
- Listeners on `window` resize and capture-phase scroll keep the position in sync while the menu is open. Capture-phase ensures scrolling any nested scroll container also triggers an update, not just the document root.
- `dashboard/styles.css`: the `.hamburger-dropdown` rule replaces `position: absolute; top: calc(100% + 6px); left: 0` with `position: fixed` (no static offsets) and adds a comment block explaining the inline-style anchor pattern.
- `triggerPos` state guards the first render: the portal renders nothing until `useLayoutEffect` measures the trigger, so users never see the dropdown flash at 0,0 in the one frame between open() and the first measurement.
- Z-index unchanged (`z-menu` = 50) — the dropdown is now genuinely at document-root level so the value is the effective screen z-index.
- Removed the TODO.md "Stacking Context" entry.

**Two follow-up items added to TODO.md "Test infrastructure":**

- Browser-runtime smoke test (Playwright) for the DaisyUI component-class migration. The 2026-04-13 sweep was verified by `vite build` + grep against the built CSS — every phase passed those checks but no real browser was driven to click through the modals/toasts/drawers. Should walk the TESTING_GUIDE "DaisyUI component-class migration" checklist in CI.
- Visual regression suite (Playwright screenshot baselines per tab × per theme — 8 baselines per tab) to catch silent regressions if a future change re-introduces a shadow class or an unrecognized DaisyUI modifier.

These remain pending because they require setting up a test runner that this session can't bring up in the sandbox. The TODO.md entries describe what they should check.

**Build:** All four fix commits passed `./node_modules/.bin/vite build` clean. `node --test scripts/__tests__/oklchToHex.test.mjs` still 21/21 passing.

### DaisyUI component-class migration — 10-phase "unshadow" sweep

**Why:** After the full DaisyUI theming migration (six reference phases + two alignment passes) landed on 2026-04-12, a side-by-side audit against canva-grid/glow-props turned up one serious finding: our custom CSS classes `.card`, `.btn-*`, `.badge`, `.toast-*` were silently overriding DaisyUI's built-in component classes because unlayered CSS wins over `@layer components`. Every consumer that thought it was getting DaisyUI's `card` was actually getting our custom version, and the override only worked as long as our custom class stayed in sync with DaisyUI's layout expectations. This was the same "shadowing" footgun the DaisyUI docs warn about. This pass migrates the consumers to proper DaisyUI component classes and deletes the custom shadow classes so there is only one source of truth per component.

**Ten phases, one commit each, all on `claude/migrate-daisyui-dark-mode-toG0Y`:**

1. **Modal — QuickGuide + InstallInstructionsModal (commit d8ef996).** Migrated both from bespoke `.quick-guide-*` / `.install-modal-*` classes to DaisyUI `<div className="modal modal-open">` + `<div className="modal-box">` + `<div className="modal-backdrop">`. Close button → `btn btn-sm btn-circle btn-ghost absolute right-3 top-3`. Footer buttons → `btn btn-ghost btn-sm` / `btn btn-primary btn-sm`. Warning note in InstallInstructionsModal → `<div role="alert" className="alert alert-warning alert-soft">`. Width preserved via `w-[min(420px,calc(100vw-32px))]`. CSS-class form chosen over native `<dialog>` for React state control. Deleted all `.quick-guide-*` and `.install-modal-*` rules.

2. **Toast (commit 1610c90).** Rewrote `Toast.jsx` to use DaisyUI's `toast toast-bottom toast-center` container + `alert alert-{success|error|warning|info}` alert class per item type. Custom enter/exit keyframes replaced with Tailwind transition utilities (`transition-all duration-200 ease-out` + conditional `opacity-0 translate-y-2`). Dismiss button → `btn btn-ghost btn-xs btn-circle`. Container uses inline `style={{ zIndex: 'var(--z-toast)' }}` because DaisyUI's default z-index doesn't stack above our debug pill. Deleted `.toast-*` rules.

3. **Health security alerts (commit 588e7c2).** The 3 top-level security summary containers in `Health.jsx` migrated from custom `bg-error/10` divs to `<div role="alert" className="alert alert-error flex flex-col items-center text-center">`. The per-commit list-item containers stayed as bespoke `bg-error/10` divs since DaisyUI alert padding/layout doesn't fit a tight list.

4. **Timeline work-pattern badges (commit 0128995).** Holiday/Weekend/After-Hours badges in `Timeline.jsx` migrated from custom `.badge-*` classes to DaisyUI semantic variants: `badge badge-accent badge-sm`, `badge badge-info badge-sm`, `badge badge-warning badge-sm`. Deleted the custom `.badge` / `.badge-*` rules so the DaisyUI component class is the only definition.

5. **Card unshadow (commit 66c888c).** `.card` and `.card:hover` deleted from styles.css. All consumers migrated to `<div className="card bg-base-200 border border-base-300">` + `<div className="card-body p-6 gap-0">`: `CollapsibleSection.jsx` (outer+inner + documented why NOT using DaisyUI `collapse` — stateless, doesn't match React state), `ErrorBoundary.jsx` (`role="alert"` + card+card-body), `App.jsx` (data-load error fallback), `sections/Projects.jsx` (ProjectCard), `sections/Discover.jsx` (metric cards). Deleted `.card-loading`, `.projects-error`, `.error-boundary-card`, `.project-card` rules.

6. **Button unshadow (commit 17fb91a).** `.btn-icon`, `.btn-primary`, `.btn-secondary`, `.btn-theme`, `.show-more-btn`, `.filter-toggle`, `.filter-clear-btn`, `.filter-preset-btn`, `.filter-mode-toggle`, `.project-link*`, `.detail-pane-close`, `.settings-pane-close`, `.filter-badge` all deleted from styles.css. Migrations: `Header.jsx` filter toggle → `btn btn-ghost btn-square relative ${filterSidebarOpen ? 'btn-active' : ''}`; filter badge → `<span className="badge badge-primary badge-xs absolute -top-0.5 -right-0.5">`; settings button → `btn btn-ghost btn-square`. `HamburgerMenu.jsx` trigger → `btn btn-ghost btn-square`. `ShowMoreButton.jsx` → `btn btn-ghost btn-block btn-sm mt-3`. `FilterSidebar.jsx` Include/Exclude toggle → DaisyUI `join` + `join-item btn btn-xs` with `btn-primary` for include-active and `btn-error` for exclude-active (red reinforces "hide"). `FilterSidebar.jsx` Clear All → `btn btn-outline btn-sm w-full mt-3`. `DetailPane.jsx` + `SettingsPane.jsx` close buttons → `btn btn-sm btn-circle btn-ghost`. Print media query updated to `[aria-label^="Show "].btn, .hamburger-menu, .modal { display: none !important; }` since `.show-more-btn` no longer exists.

7. **TabBar tabs/tab class composition (commit 41a3276).** `TabBar.jsx` outer → `<div className="tabs tabs-border flex overflow-x-auto scrollbar-hide" role="tablist" aria-label="Dashboard sections">`. Each tab → `tab tab-btn ${isActive ? 'tab-active tab-btn-active' : ''}` (composition — layering DaisyUI's structural classes under our custom `.tab-btn` typography). Rejected pure DaisyUI `tabs-lift`/`tabs-box` because the default typography (sentence case, body font) doesn't match the "techy mono uppercase" aesthetic. The `role="tablist"` + `role="tab"` + `aria-selected` attributes are on the same elements DaisyUI's tabs expects, so we get both DaisyUI CSS and proper ARIA.

8. **Form inputs (commit e020af6).** SettingsPane work hour selects migrated from `className="filter-select"` → `className="select select-bordered select-sm"`. FilterSidebar date inputs migrated from `className="filter-input filter-date-input"` → `className="input input-bordered input-sm w-full"`. Deleted `.filter-select`, `.filter-select:focus`, `.filter-input`, `.filter-input:focus`, `.filter-date-input` rules from styles.css. `.filter-date-group` flex-column wrapper kept (still used).

9. **HamburgerMenu audit (commit 9db2a10).** Verified the `.hamburger-*` prefix is unique and does not shadow any DaisyUI class. Fixed one hardcoded theme value found by the audit: `.hamburger-item-destructive:hover` was `rgba(239, 68, 68, 0.1)` (violates the CLAUDE.md rule against hardcoded theme values) — now `color-mix(in oklab, var(--color-error) 10%, transparent)`. Documented in the component header why a full migration to DaisyUI `dropdown` + `menu` is rejected: `dropdown` shows/hides via CSS `:focus` or `[open]` attribute (incompatible with React-state-controlled `open` + keepOpen theme picker + async action error capture), and `menu` implies `role="menu"` which the shared BURGER_MENU pattern explicitly avoids because screen readers enter forms mode. The trigger button already uses DaisyUI `btn btn-ghost btn-square` (from phase 6).

10. **FilterSidebar multi-select audit (commit 94d90f3).** The MultiSelect widget implements the WAI-ARIA listbox pattern (`role="listbox"`, `role="option"`, `aria-multiselectable="true"`). DaisyUI's `menu` component implies `role="menu"` — semantically wrong for multi-select filter values. DaisyUI v5 does not provide a first-class listbox component. The custom `.filter-multi-select-*` classes use `var(--color-base-*)` tokens and `color-mix()` cleanly — no hardcoded theme values found, no class collision. Partial migration: the inner `<input type="checkbox">` gains `className="checkbox checkbox-xs checkbox-primary"` for visual consistency with the rest of the filter sidebar. Slimmed the custom `input[type="checkbox"]` rule to just margin + flex-shrink resets; size/color/cursor are now DaisyUI-controlled.

**What was deliberately NOT migrated and why:**

- **HamburgerMenu dropdown surface** — React state control + keepOpen theme picker + disclosure-pattern-not-ARIA-menu design are intentional per `docs/implementations/BURGER_MENU.md`. Full migration would force role="menu" or break state control.
- **FilterSidebar multi-select dropdown surface** — it's a listbox (combobox pattern), not a menu. DaisyUI v5 has no listbox primitive.
- **CollapsibleSection** — uses `<div>` + React state instead of DaisyUI's `collapse` component because our layout needs dynamic expand/collapse triggered by parent props and per-section IDs that a stateless CSS `:target`/`:checked` component can't provide.
- **FilterSidebar drawer, DetailPane, SettingsPane structural shells** — these are custom slide-over panes with focus traps, escape keys, and body scroll locks. DaisyUI v5 ships `drawer` but it's coupled to the `drawer-toggle` checkbox pattern which conflicts with React-state-controlled visibility. The custom `.filter-sidebar` / `.detail-pane` / `.settings-pane` classes don't shadow any DaisyUI class.

**Shadowing risk audit — before vs after:**

- Before: `.card`, `.card:hover`, `.btn-icon`, `.btn-primary`, `.btn-secondary`, `.btn-theme`, `.badge`, `.badge-*`, `.toast-success`, `.toast-error`, `.toast-warning`, `.toast-info` all lived unlayered in `dashboard/styles.css`. All would silently override `@layer components` definitions from DaisyUI.
- After: zero shadowing. Every consumer uses DaisyUI's `card` / `btn` / `badge` / `alert` / `toast` / `modal` / `tabs` / `tab` / `select` / `input` / `checkbox` / `join` / `join-item` directly. The remaining custom classes (`.tab-btn`, `.hamburger-*`, `.filter-multi-select*`, `.detail-pane*`, `.settings-pane*`, `.filter-sidebar*`, `.dashboard-header`, `.tag`, `.tag-*`, `.heatmap-*`) use unique prefixes that DaisyUI does not define.

**Build:** Every phase built clean (`./node_modules/.bin/vite build`). Final bundle: CSS 158.82 KB → 26.96 KB gzipped, JS 557.84 KB → 175.82 KB gzipped, 84 modules transform, PWA precache 41 entries ~887 KiB. Net CSS change across the sweep is small — we deleted ~400 lines of custom component CSS, and the DaisyUI classes we now reference were already bundled (DaisyUI ships them in `@layer components` whether we use them or not). Accessibility: `role="alert"` added to Health security summaries + ErrorBoundary + data-load error + InstallInstructionsModal warning. ARIA `aria-label` and `role` attributes preserved on TabBar, SettingsPane, DetailPane, FilterSidebar MultiSelect, HamburgerMenu.

**Testing performed:** `vite build` after every phase (10 successful builds). No browser runtime test was performed — the Testing Guide's "DaisyUI component classes" section should be exercised manually before considering the migration user-verified.

## 2026-04-12

### glow-props alignment pass — burger menu "keepOpen" for theme picker + mode toggle

**Why:** After comparing our theming against glow-props (the "Approach A" sibling using per-mode-independent storage, same shape as us), the comparison surfaced exactly one actionable UX gap: our burger menu closes after every item click, including theme picker clicks. glow-props deliberately omits the `data-close` attribute on theme controls so the menu stays open — users can rapid-preview multiple themes in a single menu session without reopening. Everything else in glow-props we already do, do better, or have rejected for documented reasons (35-theme catalog, random theme on load, regex-based multi-file rewrite, etc.). This pass closes the one actionable gap.

**Changes:**

1. **`dashboard/js/components/HamburgerMenu.jsx`** — `handleItem()` refactored to accept the full item object instead of just `item.action`, so it can check `item.keepOpen`. Two paths now:
   - `keepOpen: true` → run the action immediately (no `close()`, no 150ms `setTimeout` delay)
   - default → close the menu first, then run the action after 150ms (matches the CSS fade animation)
   - Shared error handling extracted into a `runAction(action)` helper so both paths route errors through `debugAdd('render', 'error', ...)`.
   - Call site updated from `handleItem(item.action)` → `handleItem(item)`.
   - JSDoc updated to document the new `keepOpen` item field alongside the existing ones.

2. **`dashboard/js/components/Header.jsx`** — marked three kinds of menu items as `keepOpen: true`:
   - **Dark/light mode toggle** — so the user can toggle modes and then pick a theme for the new mode in one menu session (the theme list below the toggle swaps to the new mode's themes when the toggle action dispatches).
   - **All theme picker items** (4 per mode) — so the user can click Nord, see the app re-themed, then click Emerald, then click Caramel Latte, without reopening the menu between each.
   - Comments at both call sites document the rationale with a reference to glow-props's equivalent (`data-close` attribute omission on theme controls).

**Why this is safe:**

- Menu items are keyed by `item.label` in `HamburgerMenu`'s render loop, and theme names are stable across re-renders. When `activeThemeId` changes after a picker click, React reconciles the buttons in place — the clicked button's DOM element is preserved, focus stays on it, only `icon` / `highlight` / `ariaLabel` props update.
- The `ariaLabel` change (`"Use Nord theme (Cool blue-gray)"` → `"Use Nord theme (Cool blue-gray), currently active"`) provides natural screen-reader feedback confirming the theme was applied.
- `click-outside`, `Escape`, and the backdrop click handler all still work — the user can dismiss the menu any time; `keepOpen` only suppresses the per-item auto-close.
- The "Save as PDF", "Install App", "Update Now", "Quick Guide", "User Guide" items keep their existing close-then-act behavior — only theme controls got `keepOpen`.

**Things from glow-props deliberately NOT adopted (documented):**

- **35-theme catalog.** glow-props registers every DaisyUI stock theme. Our curated 4+4 is the right tradeoff for a utility app per the reference doc's own advice ("utility apps should pick 2-5 curated combos or 8-10 themes per mode").
- **Random theme on load.** Cute for a portfolio site; wrong for an analytics dashboard where users don't want visual surprise on every visit.
- **Auto-classify themes from `color-scheme` property.** Only helps when registering the full catalog. Our explicit catalog already validates against DaisyUI's classification via the generator's `color-scheme` mismatch check.
- **Regex-based rewrite of 5 HTML/JS files.** Fragile to reformatting. Our marker-delimited approach is structurally safer.
- **Manual `npm run generate:meta-colors`.** glow-props's generator runs only on demand. Ours runs as prebuild for `dev`/`build`/`build:lib`.
- **`head-common.html` partial.** glow-props injects the same `<head>` content into multiple HTML entry points. We have one `dashboard/index.html` — not needed.

**Things glow-props SHOULD adopt from us** (upstream feedback if they look, not in scope for this repo):

- **`COLOR_KEY_OVERRIDES`** — glow-props's `caramellatte` default meta color is `#000000` (pure black) because DaisyUI ships `--color-primary: oklch(0% 0 0)`. Their status bar flashes black on every visit. Our override to `--color-base-300` gives `#ffd6a7` (warm peach).
- **`lofi` meta color** — glow-props's is `#0d0d0d` (near-black) for the same reason. Ours is `#ebebeb` via the override.
- **Extracted `oklchToHex.mjs` + 21 unit tests** — glow-props has zero tests for the color math.
- **L=1 percentage-vs-decimal fix** — glow-props uses the old `if (L > 1) L /= 100` heuristic.
- **Prebuild integration** so drift is impossible between builds.
- **Marker-delimited rewrite** instead of regex replacement.

**Build and tests:**

- `npm test` — 21 passing, 0 failing, 6 suites, ~145 ms.
- `npm run build` — passes, 84 modules. CSS 160.06 KB (unchanged — no CSS change this pass). JS 555.75 → 556.03 KB (+0.28 KB for the refactored handleItem logic + `keepOpen: true` literals).
- Generator idempotent — all 4 downstream files report `unchanged` on re-run.
- Smoke test via `vite preview` + curl verified: `keepOpen` identifier survived minification into the JS bundle; all 8 theme names, descriptions, aria-labels, CSS theme selectors, and flash prevention hex values still present; all 11 critical custom class families still emitted.

**Files changed (2 source + 3 docs):**

- `dashboard/js/components/HamburgerMenu.jsx` — `handleItem()` refactor, `runAction()` helper, call-site update, JSDoc update
- `dashboard/js/components/Header.jsx` — `keepOpen: true` on mode toggle and theme picker items, rationale comments
- `docs/HISTORY.md` — this entry
- `docs/SESSION_NOTES.md` — new pass summary
- `docs/TESTING_GUIDE.md` — new test scenario for rapid-preview behavior
- `docs/USER_GUIDE.md` — updated Theme section to mention rapid-preview

---

### canva-grid alignment pass — oklchToHex module + tests, COLOR_KEY_OVERRIDES, debug flow tracing, Approach A vs B documentation

**Why:** After cross-referencing our theming against canva-grid's implementation (the sibling project using "Approach B" named combos), five patterns from canva-grid were worth adopting without changing our Approach A storage shape. Four were actual gaps in our implementation; one was pure documentation. All five implemented this pass.

**1. Extracted `scripts/oklchToHex.mjs` into its own module with 21 unit tests**

Previously the oklch → hex color math was inlined inside `scripts/generate-theme-meta.mjs` with zero tests. Extraction gives it:

- A standalone module at `scripts/oklchToHex.mjs` that the generator imports.
- A test file at `scripts/__tests__/oklchToHex.test.mjs` using Node's built-in `node:test` runner and `node:assert/strict` — **no Jest dependency**. Adding Jest for one module would be disproportionate; `node:test` has been stable since Node 20 and we're on Node 22.
- 21 tests covering: boundary values (pure black / white / mid gray), achromatic colors invariant across hue, optional hue, alpha channel handling, whitespace tolerance, the L=1 percentage-vs-decimal edge case (see below), DaisyUI fixtures (`nord primary → #5e81ac`, `dracula base-100 → #282a36`, etc.), out-of-gamut clamping, and non-oklch input rejection.

**2. Fixed the L=1 percentage-vs-decimal edge case**

The old inlined version used `if (L > 1) L /= 100` as a heuristic to normalize percentage input. This fails at the L=1 boundary: `oklch(1 0 0)` (decimal, meaning white) and `oklch(1% 0 0)` (percent, meaning near-black) both keep L=1 and would both produce white. DaisyUI always uses percentage form so this never triggered in practice, but the fix is free.

The new module captures the percent sign explicitly via the regex `([\d.]+)(%?)` and only divides by 100 when the `%` character was matched. Three dedicated tests pin the behavior:
- `oklch(1 0 0)` → `#ffffff` (white)
- `oklch(1% 0 0)` → near-black with R channel < 10
- `oklch(0.5 0 0)` === `oklch(50% 0 0)`

**3. Added `COLOR_KEY_OVERRIDES` to the generator**

The reference pattern's default rule is "light themes use `--color-primary`, dark themes use `--color-base-100`". This works for most themes but breaks on monochrome/warm-minimal light themes whose `--color-primary` is near-black or literally `oklch(0% 0 0)` — producing a jarring dark PWA status bar on an otherwise-light app.

Pattern borrowed from canva-grid's generator. We add two entries:
- **`lofi`**: `--color-primary` is `oklch(15.906% 0 0)` ≈ `#1c1c1c`. Override to `--color-base-300` → `#ebebeb` (neutral light gray). Same value canva-grid uses.
- **`caramellatte`**: `--color-primary` is literally `oklch(0% 0 0)` = pure black (DaisyUI design decision). Override to `--color-base-300` → `#ffd6a7` (warm peach — the "caramel" tone from the theme's surface palette). canva-grid doesn't have caramellatte in its catalog so this override is our own addition, following the same pattern.

New hex values after the override:
```
lofi          light  #ebebeb  base-300  (was #ffffff)
nord          light  #5e81ac  primary   (was #ffffff — we used base-100 for everything previously)
emerald       light  #66cc8a  primary   (was #ffffff)
caramellatte  light  #ffd6a7  base-300  (was #fff7ed)
black         dark   #000000  base-100
dim           dark   #2a303c  base-100
coffee        dark   #261b25  base-100
dracula       dark   #282a36  base-100
```

The dark themes are unchanged (still using base-100 per the default rule). Light themes now have theme-appropriate brand colors instead of uniform white, which makes the PWA status bar visually distinguishable between themes on mobile.

**Previous approach vs new approach:** In the previous pass, I chose `--color-base-100` for all themes with the rationale "status bar should blend with main surface". That was a conscious divergence from the reference pattern which I explicitly documented. The canva-grid comparison revealed a better option: follow the reference default (primary for light, base-100 for dark) AND add targeted overrides for themes where the default produces bad results. This gives us the best of both — brand accent colors on status bars for most themes, with graceful fallbacks for the problem cases.

**4. Added theme-change flow tracing via `debugLog`**

canva-grid's `useDarkMode` hook logs every theme transition to its debug log — helpful during development to see the sequence of events when diagnosing "I picked Nord but it shows Lo-Fi" type bugs. Adopted the same pattern:

- `dashboard/js/components/DebugPill.jsx` gains a `theme: '#c4b5fd'` (lavender) entry in `SOURCE_COLORS` so theme events are visually distinct in the debug pill's log tab from render errors (blue) and boot events (purple).
- `dashboard/js/themes.js` imports `debugAdd` from `./debugLog.js` and exposes a `logThemeEvent(event, details)` helper.
- `applyTheme()` calls `logThemeEvent('theme-applied', { dark, requested, validated, skipPersist })` at the end of every invocation. `requested` vs `validated` tells developers whether the validator had to fall back to a default (signaling a stale or cross-mode theme id was dispatched).
- Every theme-apply path gets logged once: mount via AppContext darkMode effect, user-initiated toggle, `setTheme()` picker click, cross-tab storage event, App.jsx embed override.

`debugLog.js` has zero imports and no module-load side effects that depend on `themes.js`, so there's no circular dependency risk. Verified by running `themes.js` through Node with a browser-shaped stub — module loads, exports are present, `applyTheme()` runs through the `debugAdd` call path without throwing.

**5. Documented the Approach A vs B tradeoff in `CLAUDE.md`**

The reference pattern describes two theme persistence shapes — "Approach A" (per-mode independent, 3 keys: `darkMode`/`lightTheme`/`darkTheme`) and "Approach B" (named combos, 2 keys: `darkMode`/`themeCombo`). canva-grid uses Approach B; we use Approach A. Added a new "Theming — Approach A (per-mode independent)" section to `CLAUDE.md`'s Dashboard Architecture that explains:

- Which storage keys we use
- Our curated catalog (4 light + 4 dark = 8 total)
- Why we chose Approach A over B: the dashboard is a utility app with no brand-coupled theme pairings, so constraining users to pre-vetted combos (canva-grid's 2 × 2 = 4 options) is unnecessarily restrictive compared to Approach A's 4 × 4 = 16 independent (mode, theme) combinations. The tradeoff is a slightly more complex picker UX (two clicks: mode then theme) vs canva-grid's single-click combo buttons.
- Links to sibling projects using Approach B as reference.

**Files changed (6 source + 2 generator + 2 test + 1 doc):**

- New: `scripts/oklchToHex.mjs` — standalone oklch → hex module with improved percentage-vs-decimal handling
- New: `scripts/__tests__/oklchToHex.test.mjs` — 21 unit tests covering CSS Color Level 4 edge cases and DaisyUI fixtures
- Modified: `scripts/generate-theme-meta.mjs` — imports oklchToHex instead of inlining, adds `COLOR_KEY_OVERRIDES` map, per-theme `colorKey` field in the collected metadata, richer stdout report showing the CSS variable used for each theme
- Modified: `dashboard/js/themes.js` — imports `debugAdd`, adds `logThemeEvent()` helper, calls it from `applyTheme()`
- Modified: `dashboard/js/components/DebugPill.jsx` — adds `theme: '#c4b5fd'` to `SOURCE_COLORS`
- Modified: `dashboard/js/generated/themeMeta.js`, `dashboard/index.html` — regenerated hex values (lofi `#ffffff→#ebebeb`, caramellatte → `#ffd6a7`, nord → `#5e81ac`, emerald → `#66cc8a`)
- Modified: `package.json` — adds `"test": "node --test scripts/__tests__/*.test.mjs"` script
- Modified: `CLAUDE.md` — new "Theming — Approach A (per-mode independent)" section under Dashboard Architecture

**Build and test:** `npm test` — 21 passing, 0 failing, 6 suites. `npm run build` — passes, 84 modules transform. CSS bundle 157.40 → 160.06 KB (+2.66 KB from added Tailwind class scanning for the new debug source color). Generator idempotence verified — second run reports all four downstream files "unchanged". `themes.js` loads cleanly via Node direct import with browser stub. All 8 `[data-theme="..."]` selectors present in the built CSS. All 8 new hex values present in the inline flash prevention script. All 15 critical custom class families still emitted.

**Deliberately NOT adopted from canva-grid** (documented rationale):

- **Combo-based persistence (Approach B).** Structural change that would lose per-mode-independent theme choice. We explicitly chose Approach A; canva-grid's comparison confirms the tradeoff is a conscious decision, not a gap.
- **Theme picker in page header instead of burger menu.** canva-grid's inline `join` component is more discoverable but our dashboard header already has tab navigation, filter controls, and settings — no room. Burger menu placement is a deliberate UX decision for our layout.
- **Regex-based `index.html` rewrite.** canva-grid uses `html.replace(/var combos = [^;]+;/, ...)` which silently fails if anyone reformats the inline script. Our marker-based `BEGIN/END GENERATED` approach fails loudly on missing markers and survives reformatting.
- **Manual `npm run generate-theme-meta`.** canva-grid's generator runs only on-demand (not in `prebuild`). Ours runs as the first step of every `npm run dev` / `build` / `build:lib` so drift is impossible.

---

### Self-audit pass — dead code removal, persistence correctness, cross-tab null handling

**Why:** After the reference-pattern gap closure landed, a deliberate self-audit surfaced six issues: one real runtime bug (silently masked by tree-shaking), one real persistence bug (stale key on revert-to-default), one cross-tab listener bug (null `newValue` filtered out), two dead-code imports/exports, and one minor code-clarity improvement. The user explicitly asked "anything to double check, strengthen, or improve?" — this pass addresses every finding.

**Bugs fixed:**

1. **`themes.js` `__allThemes` / `__isDark` exports referenced undefined `THEME_NAMES` / `IS_DARK`**. An earlier pass removed those imports from the top of `themes.js` but left the debug-helper exports at the bottom intact. Rollup tree-shook them out of the browser bundle (nothing imports them) so the dashboard worked, but `node --input-type=module -e "import('./dashboard/js/themes.js')"` threw `ReferenceError: THEME_NAMES is not defined` at module load. Detected by running themes.js through Node directly as part of the audit. Fix: deleted the dead debug exports entirely — they were speculative "exposed for ad-hoc console inspection" helpers with zero consumers, which CLAUDE.md's "Don't create helpers... for one-time operations. Don't design for hypothetical future requirements" prohibits.

2. **`persistTheme` left stale `lightTheme` / `darkTheme` keys on revert-to-default**. The old implementation wrote the per-mode theme key only when `themeName !== defaultForMode`. So if the user picked Nord (non-default) then reverted to Lo-Fi (default), `persistTheme(false, 'lofi')` would write `darkMode=false` and SKIP the `lightTheme` write. `lightTheme='nord'` stayed in localStorage. On the next reload, the flash prevention script read `lightTheme=nord` and applied Nord — the user's most recent pick (Lo-Fi) was silently lost. Fix: on revert-to-default, `safeStorageRemove()` the per-mode key instead of skipping the write. Absent-key and default-valued-key behave the same for readers, but remove-vs-skip matters for "user reverted" correctness. Added `safeStorageRemove` to the `themes.js` imports and documented the revert-to-default contract in the function comment.

3. **Cross-tab listener filtered `e.newValue === null` events**. The old handler had `if (e.key === 'lightTheme' && e.newValue)` which treated null as "nothing to do". But fix #2 now removes keys (firing storage events with `newValue=null`) when a user reverts to default, and other tabs need to see that signal and update their reducer state back to the default. Fix: drop the `&& e.newValue` filter and let the reducer's `validLightTheme` / `validDarkTheme` handle null → default (they already did, via the `.has(id)` check failing for null). Also handled the symmetric case for `darkMode` key removal by falling back to matchMedia. Comment rewritten to document the "null = revert to default" contract.

**Dead code removed:**

4. **`getStoredTheme(dark)` in `themes.js`** was defined, exported, and never called anywhere in the codebase (confirmed via grep across `dashboard/`). It was a holdover from the earlier pass where the darkMode effect called `applyTheme(state.darkMode, getStoredTheme(state.darkMode))` — that was replaced with direct reducer-state reads. The function had no consumers so it was deleted, not just unexported. CLAUDE.md: "Delete unused imports, variables, and dead code immediately."

5. **Dead `getStoredTheme` import in `AppContext.jsx`**. Same reason. Removed from the import statement.

**Code clarity:**

6. **`loadInitialState` fallback now reads `matchMedia` directly instead of `document.documentElement.classList.contains('dark')`**. The old code relied on the flash prevention script having already set the `.dark` class from the same matchMedia query — functionally equivalent but indirect. Reading matchMedia directly keeps the function independent of DOM side effects and makes it unit-testable without a full DOM.

**Optimization:**

7. **`darkMode` useEffect dependency array narrowed from `[darkMode, lightTheme, darkTheme]` to `[darkMode, activeTheme]`**. `activeTheme` is now derived outside the effect as `state.darkMode ? state.darkTheme : state.lightTheme`. With the old deps, a cross-tab event that updated the NON-active mode's theme (e.g. user picks Dracula in tab A while tab B is in light mode) triggered an effect re-run in tab B that did a no-op DOM update + `getComputedStyle` + Chart.js defaults write. Harmless but wasteful. With the new deps, tab B only re-runs when the currently-applied mode's theme changes — reducer state still updates via the storage listener, so the value is ready for the next toggle.

**End-to-end smoke test (new):**

Added a Node-based simulation that stubs `localStorage`, `window`, `document`, `getComputedStyle`, then dynamically imports `themes.js` and exercises the catalog shape, validators, and `persistTheme` revert-to-default behavior. This caught bug #2 during the audit before any rebuild. The test is in the commit message for future reference; should be turned into a proper test harness when the project gains a test framework (none configured today).

**Documentation updates:**

- `CLAUDE.md` — architecture list for `js/themes.js` updated to remove mention of `getStoredTheme` (since deleted) and document `persistTheme` + `getMetaColor` explicitly.
- `docs/TESTING_GUIDE.md` — added a simulated-cross-tab test block with copy-pasteable DevTools console snippet (`StorageEvent` dispatch), invalid-payload safety test, and an explicit "revert to default removes key" test. Cross-tab tests no longer assume two-tab access.
- `docs/SESSION_NOTES.md` — new "Known quirks" section documenting mount-time darkMode persistence (limits OS-preference fallback to the first paint), and new "Test coverage gaps" section explicitly calling out that browser runtime testing was NOT executed this session (only `vite preview` + curl + Node-based reducer simulation).

**Files changed (5 source + 3 docs):**

- `dashboard/js/themes.js` — removed `__allThemes` / `__isDark` / `getStoredTheme`; fixed `persistTheme` revert path; imported `safeStorageRemove`; rewrote storage-keys comment
- `dashboard/js/AppContext.jsx` — removed dead `getStoredTheme` import; simplified `loadInitialState` matchMedia fallback; dropped `&& e.newValue` filter in storage listener; derived `activeTheme` outside the darkMode effect and narrowed the dep array
- `CLAUDE.md` — architecture line for `js/themes.js`
- `docs/HISTORY.md` — this entry
- `docs/SESSION_NOTES.md` — Known quirks + Test coverage gaps sections
- `docs/TESTING_GUIDE.md` — simulated cross-tab + revert-to-default tests

**Build:** Passes (`npm run build`). CSS bundle 157.40 KB (unchanged). JS bundle 555.83 KB (+0.08 KB from reducer tweaks). 84 modules transform. Generator prints "unchanged" for all 4 downstream files — idempotent. themes.js now loads cleanly via `node --input-type=module` (no ReferenceError). All 8 theme names, descriptions, and `[data-theme="..."]` selectors still present in the bundle. All 11 critical custom class families still emitted. End-to-end Node simulation: catalog shape OK (4 light + 4 dark), validators correct, `persistTheme` correctly removes stale keys on revert-to-default.

---

### Reference-pattern gap closure — single-source theme config, 4+4 catalog, burger-menu picker, reference-shape cross-tab sync

**Why:** After the reference-pattern alignment pass landed on this branch, a second side-by-side audit against `docs/implementations/THEME_DARK_MODE.md` turned up seven residual gaps (documented in the "differences" list). None were bugs that would manifest today, but all were the kind of structural drift that becomes a bug the moment someone adds a theme or changes a default. The user asked for "no shortcuts, no skipping", so this pass implements every actionable gap and documents why the two remaining (CSP hash, legacy key cleanup) would be speculative abstraction.

**Gaps closed this pass:**

1. **Section C#1 — theme catalog was string arrays, not object arrays with metadata.** The reference pattern uses `[{ id, name, description }, ...]` so the theme picker UI can show labels without a second lookup map. Closed by expanding `LIGHT_THEMES` / `DARK_THEMES` in `themes.js` to object shape and updating validators to use `.map(t => t.id)` for the allowlist sets.

2. **Section C#2 — build script only regenerated the JS module, not the inline flash prevention script.** The reference says "the build script should update every file that contains theme lists or color maps so there is zero manual maintenance." Closed by making `scripts/generate-theme-meta.mjs` rewrite a marker-delimited block inside the inline `<script>` in `dashboard/index.html` — allowlists, defaults, and META map all regenerated on every build.

3. **Section C#3 — build script didn't regenerate `styles.css` `@plugin` config or `themes.js` catalog arrays.** Same root cause as C#2. Closed by adding BEGIN/END GENERATED markers in both files and teaching the generator to rewrite the blocks. Four downstream files now stay in sync from a single source (`scripts/theme-config.js`).

4. **Section C#5 — cross-tab handler filtered theme events by current mode instead of dispatching unconditionally.** The reference handler updates per-mode React state (`setLightThemeState` / `setDarkThemeState`) regardless of which mode the user is currently viewing; we filtered by current mode and used `getStoredTheme()` as the source of truth. Functionally equivalent but diverged from the reference handler shape. Closed by adding `lightTheme` / `darkTheme` to the reducer state, creating `SET_LIGHT_THEME` / `SET_DARK_THEME` action types, and having the cross-tab listener dispatch unconditionally.

5. **Section C#7 — no theme picker UI in burger menu.** The reference explicitly puts the theme picker inside the burger menu. Closed by adding picker items to `Header.jsx` `menuItems` memo (one per theme in the current mode), threading a new `setTheme(themeName)` helper through `useAppDispatch()`, and adding an explicit `ariaLabel` with theme description + active-state announcement.

6. **Catalog expanded from 1+1 to 4+4 curated themes** — prerequisite for C#7 being useful. 4 per mode sits comfortably inside the reference's "2-5 curated combos (or 8-10 themes per mode)" recommendation for utility apps. Selection: lofi/nord/emerald/caramellatte for light, black/dim/coffee/dracula for dark — all DaisyUI stock themes, no custom theme definitions.

7. **Generator fail-fast validation** — new in this pass. `scripts/generate-theme-meta.mjs` now validates the config at load time and exits with a clear error if:
   - `THEMES.light` or `THEMES.dark` are missing / empty
   - `DEFAULT_LIGHT_THEME` isn't in `THEMES.light` ids
   - `DEFAULT_DARK_THEME` isn't in `THEMES.dark` ids
   - A theme's `color-scheme` property doesn't match which array it's listed under (catches "added a dark theme to the light array" typos)
   - A theme ID isn't a real DaisyUI theme (catches "mistyped theme name" typos)

**Deliberately NOT addressed (speculative abstraction per CLAUDE.md prohibitions):**

- **Section C#4 — CSP hash for inline flash prevention script.** The reference notes that a strict CSP without `unsafe-inline` would block the inline script, and says to precompute a SHA-256 hash and add it to the `script-src` directive. We don't currently ship any `Content-Security-Policy` header in `vercel.json`, so computing a hash that nothing verifies would be dead code defending against a constraint that doesn't exist. If CSP is added later, the hash can be computed at that point from the already-markered script block.
- **Section C#6 — legacy localStorage key cleanup.** The reference suggests a one-time migration that clears old theme keys like `theme`, `colorMode`, `dark-mode`. Our pre-DaisyUI system used the same `darkMode` key, so there's nothing to clean up — adding a defensive `safeStorageRemove('theme')` on every page load would be a no-op with a small runtime cost.

**New files:**
- `scripts/theme-config.js` — single source of truth for DaisyUI theme registration. Exports `THEMES = { light: [...], dark: [...] }` with `{ id, name, description }` entries plus `DEFAULT_LIGHT_THEME` / `DEFAULT_DARK_THEME`. Extensive header comment explains the propagation chain and selection rationale.

**Rewritten files:**
- `scripts/generate-theme-meta.mjs` — now reads `theme-config.js`, runs fail-fast validation, converts oklch → hex for each theme (same inlined ~30-line math), writes `generated/themeMeta.js`, and rewrites marker-delimited blocks in `themes.js`, `styles.css`, and `index.html`. Every file write is idempotent (content-equality check) so unchanged files aren't touched — `npm run dev` doesn't trigger a Vite HMR reload on every prebuild. Human-friendly stdout reports per-theme hex values and an "updated" / "unchanged" status per file.

**Modified files:**
- `dashboard/js/themes.js` — top comment rewritten for the new generator-based architecture; `LIGHT_THEMES` / `DARK_THEMES` definitions moved inside `/* BEGIN GENERATED: theme-catalog */` markers; validators updated to use `.map(t => t.id)` for the allowlist sets; dropped `THEME_NAMES` import from generated module (no longer needed — validators derive sets from the catalog arrays). Comment explicitly warns "DO NOT edit the block between markers by hand — edit scripts/theme-config.js instead".
- `dashboard/styles.css` — `@plugin "daisyui"` block wrapped in `/* BEGIN GENERATED: daisyui-plugin */` / `/* END GENERATED: daisyui-plugin */` markers; header comment explains the generator propagation.
- `dashboard/index.html` — inline flash prevention script's allowlists + defaults + META map wrapped in `/* BEGIN GENERATED: flash-prevention-meta */` / `/* END GENERATED: flash-prevention-meta */` markers; surrounding helpers (`validTheme` function, IIFE, DOM mutations) stay hand-maintained.
- `dashboard/js/AppContext.jsx`:
  - `loadInitialState()` reads `lightTheme` / `darkTheme` from localStorage with validator fallback, mirroring the inline flash prevention script's logic.
  - Reducer state gains `lightTheme` + `darkTheme` fields.
  - New reducer cases `SET_LIGHT_THEME` / `SET_DARK_THEME` with validation + no-op early-return guards.
  - `SET_DARK_MODE` case also gains the no-op early-return guard.
  - `darkMode` effect now depends on `[state.darkMode, state.lightTheme, state.darkTheme]` and calls `applyTheme(state.darkMode, state.darkMode ? state.darkTheme : state.lightTheme)`.
  - Cross-tab storage listener dispatches unconditionally for `lightTheme` / `darkTheme` keys — matches reference handler shape.
  - New `setTheme(themeName)` callback memoized via `useCallback`, exported through `DispatchContext` so `Header.jsx` can call it without knowing action type names.
- `dashboard/js/components/Header.jsx`:
  - Imports `LIGHT_THEMES` / `DARK_THEMES` from `themes.js`.
  - Pulls `setTheme` from `useAppDispatch()`.
  - New `icons.palette` (theme item) and `icons.check` (active theme) SVG icons.
  - `menuItems` memo now filters the catalog to the current mode, maps each theme to a menu item with `setTheme(id)` action, `highlight` on the active theme, and a per-item `ariaLabel` announcing the theme name, description, and active state. First picker item gets a separator to visually group the picker under the mode toggle.

**Build:** Passes. CSS bundle **150.64 KB → 157.40 KB** (+6.76 KB) from 6 new DaisyUI theme blocks (each ~1 KB of CSS vars — expected and unavoidable). 84 modules transform. Generator reports all 8 themes with correct hex values. Second run of the generator reports "unchanged" for all four files, confirming idempotence.

**Smoke test** via `vite preview` + curl:
- Inline HTML flash prevention script contains `'lofi', 'nord', 'emerald', 'caramellatte'`, `'black', 'dim', 'coffee', 'dracula'`, and all 8 hex values ✓
- Built CSS contains `[data-theme="lofi"]` through `[data-theme="dracula"]` — all 8 selectors ✓
- Built JS contains all 8 theme names ("Lo-Fi" through "Dracula") and all 8 descriptions ("Minimal monochrome" through "Dev classic") ✓
- All 9 critical custom class families survived (`.heatmap-0`, `.filter-multi-select`, `.settings-pane`, `.detail-pane`, `.error-boundary-card`, `.dashboard-header`, `.card`, `.btn-primary`, `.toast-success`) ✓
- Generator error paths tested: invalid `DEFAULT_LIGHT_THEME` correctly rejected with exit code 1 ✓

**Files changed (7 source + 5 docs):**
- New: `scripts/theme-config.js`
- Rewritten: `scripts/generate-theme-meta.mjs`
- Modified: `dashboard/js/themes.js`, `dashboard/js/AppContext.jsx`, `dashboard/js/components/Header.jsx`, `dashboard/styles.css`, `dashboard/index.html`, `dashboard/js/generated/themeMeta.js` (regenerated), `package.json` (no change this pass)
- Docs: `CLAUDE.md`, `docs/SESSION_NOTES.md`, `docs/HISTORY.md`, `docs/TODO.md`, `docs/TESTING_GUIDE.md`, `docs/USER_GUIDE.md`

---

### DaisyUI reference-pattern alignment — theme catalog module, applyTheme() helper, oklch→hex build script, inline allowlist

**Why:** After the full DaisyUI migration landed on this branch, a deliberate side-by-side comparison with `docs/implementations/THEME_DARK_MODE.md` surfaced seven divergences from the reference pattern — all of them structural, none of them bugs that would immediately manifest, but all the kind of thing that decays into bugs the moment someone adds a theme or changes a default. The user explicitly asked for "no shortcuts, no skipping", so this pass closes the gap on every actionable divergence.

**Divergences identified:**

1. **No theme catalog module.** Theme names (`LIGHT_THEME`, `DARK_THEME`) and meta colors (`LIGHT_META_COLOR`, `DARK_META_COLOR`) were hardcoded constants at the top of `AppContext.jsx`. The reference wants a dedicated module with validators.
2. **No `applyTheme()` helper.** The same dual-layer DOM mutation (`.dark` class + `data-theme` attribute + `<meta name="theme-color">` content + Chart.js defaults) was inlined in three places: `AppContext.jsx` darkMode `useEffect`, `App.jsx` embed override, and the inline flash prevention script in `index.html`. Any drift between them = visual bugs.
3. **PWA meta theme-color hex values hardcoded manually.** The reference wants a `scripts/generate-theme-meta.mjs` that reads DaisyUI's `theme/*/object.js` and converts oklch to hex at build time so the values can never drift from the upstream palette.
4. **No theme ID allowlist in flash prevention script.** A removed theme ID in localStorage would produce an unstyled first paint. The reference wants a hardcoded allowlist with silent fallback to defaults.
5. **Cross-tab `storage` listener only handles `darkMode`.** No forward-compat for `lightTheme` / `darkTheme` keys that a future theme picker would write.
6. **No explicit `aria-label` on the theme toggle menu item.** The item's visible label ("Light mode" / "Dark mode") describes a destination, not an action. The reference Phase 5 accessibility checklist requires an aria-label that spells out the transition.
7. **No `getStoredTheme()` / `persistTheme()` / `validLightTheme()` / `validDarkTheme()` helpers.** The reference exposes these as part of the catalog module so consumers don't have to know about the storage keys directly.

**Fixes (summary):**

1. `scripts/generate-theme-meta.mjs` (new) — imports each registered DaisyUI theme's `object.js` via dynamic `import()`, runs an inlined ~30-line oklch→hex converter (oklch → oklab → linear sRGB via LMS → gamma-corrected sRGB → hex, no color library dependency), and writes `dashboard/js/generated/themeMeta.js` with three exports: `META_COLORS` (theme name → hex map), `IS_DARK` (theme name → boolean), `THEME_NAMES` (ordered list). Validated against known DaisyUI values — lofi base-100 oklch(100% 0 0) → #ffffff, black base-100 oklch(0% 0 0) → #000000.

2. `dashboard/js/themes.js` (new) — theme catalog module. Exports:
   - `LIGHT_THEMES = ['lofi']`, `DARK_THEMES = ['black']`
   - `DEFAULT_LIGHT_THEME`, `DEFAULT_DARK_THEME`
   - `validLightTheme(id)`, `validDarkTheme(id)` — allowlist validators with default fallback
   - `getStoredTheme(dark)` — reads `lightTheme` / `darkTheme` keys with fallback to defaults
   - `persistTheme(dark, themeName)` — writes `darkMode` always, per-mode theme key only when non-default (avoids cluttering localStorage)
   - `getMetaColor(themeName)` — lookup in `META_COLORS`
   - `applyTheme(dark, themeName, skipPersist)` — **the single source of truth** for `.dark` class + `data-theme` attribute + meta theme-color content + Chart.js defaults. Every theme-affecting caller now routes through this one function.
   - Imports `META_COLORS` / `IS_DARK` / `THEME_NAMES` from `./generated/themeMeta.js` and `Chart as ChartJS` from `chart.js` directly (ES modules cache the Chart singleton shared with `main.jsx` and `AppContext.jsx`).

3. `dashboard/js/generated/themeMeta.js` (new, auto-generated, committed) — DO NOT EDIT BY HAND. Regenerated by the prebuild hook on every `npm run dev` and `npm run build`. Committed so fresh clones work without running the generator first.

4. `dashboard/js/AppContext.jsx` (refactored):
   - Removed module-level `LIGHT_THEME` / `DARK_THEME` / `LIGHT_META_COLOR` / `DARK_META_COLOR` constants (moved to `themes.js`).
   - Removed `import { Chart as ChartJS } from 'chart.js'` at the top — no longer needed here since `themes.js` owns the Chart.js defaults sync.
   - darkMode `useEffect` collapsed from 30 lines of inlined DOM mutations to a single `applyTheme(state.darkMode, getStoredTheme(state.darkMode))` call.
   - Cross-tab `storage` listener now handles three keys (`darkMode`, `lightTheme`, `darkTheme`). When only a theme name changes, calls `applyTheme(..., skipPersist=true)` — the new value came from another tab's localStorage write, so persisting it again would be a redundant round-trip (and in Approach A setups could cause a write loop).

5. `dashboard/js/App.jsx` (refactored):
   - Imports `applyTheme`, `DEFAULT_LIGHT_THEME`, `DEFAULT_DARK_THEME` from `./themes.js`.
   - Embed override `?theme=light|dark` now calls `applyTheme(false|true, DEFAULT_*_THEME, /*skipPersist*/ true)` instead of doing its own `classList` / `setAttribute` dance. `?bg=...` still sets `--color-base-100` directly since it's a pure surface override, not a theme swap.

6. `dashboard/index.html` (refactored inline flash prevention script):
   - Added `LIGHT_THEMES = ['lofi']` / `DARK_THEMES = ['black']` allowlists.
   - Added `DEFAULT_LIGHT_THEME` / `DEFAULT_DARK_THEME` constants matching `themes.js`.
   - Added `META = { 'lofi': '#ffffff', 'black': '#000000' }` inline map — values come from `generate-theme-meta.mjs` output; the script comment explicitly notes the four-place sync requirement.
   - Added `validTheme(id, allowlist, fallback)` helper.
   - Script now reads `darkTheme` / `lightTheme` keys in addition to `darkMode`, validates each, falls back to defaults on miss. Applies `.dark` class + `data-theme` attribute + `<meta name="theme-color">` content before first paint. Matches `applyTheme()` in behaviour (minus Chart.js, which doesn't exist at this point in the boot sequence).

7. `dashboard/js/components/Header.jsx` — theme toggle menu item gained an explicit `ariaLabel: state.darkMode ? 'Switch to light mode' : 'Switch to dark mode'`. Visible label stays the same ("Light mode" / "Dark mode"). Comment explains why the destination-style label needs an action-style aria-label.

8. `dashboard/js/components/HamburgerMenu.jsx` — accepts an optional `item.ariaLabel` prop on menu items, applied as the button's `aria-label` attribute. Falls back to `item.label` for menu items that don't need a distinct screen-reader label.

9. `package.json` — `dev`, `build`, and `build:lib` scripts all prefix with `node scripts/generate-theme-meta.mjs &&` so the generated file is always fresh. Added `npm run generate-theme-meta` for manual invocation after adding themes.

**Not addressed (feature decisions, not bugs):**

- **Approach A vs Approach B storage schema.** The reference describes two theme-persistence approaches: per-mode independent (3 keys: `darkMode` + `lightTheme` + `darkTheme`) and named combos (2 keys: `darkMode` + `themeCombo`). This project has one theme per mode and no picker UI, so neither approach is "chosen" — we ship Approach A's key schema (which is a superset) and the extra keys are forward-compat plumbing only. Documented in `themes.js` top comment.
- **Theme picker UI in burger menu.** No user request, no catalog beyond one theme per mode. Tracked as optional follow-up in `docs/TODO.md`.
- **DaisyUI component classes instead of custom CSS.** Already tracked as optional follow-up. The theming refactor is complete; replacing custom `.btn-primary` / `.card` / etc. with `btn btn-primary` / `card` / etc. is a separate incremental pass.

**Build:** Passes (`npm run build`). Prebuild output visible: `[generate-theme-meta] wrote .../dashboard/js/generated/themeMeta.js / lofi light #ffffff / black dark #000000`. 84 modules transform (up from 82 — `themes.js` and `generated/themeMeta.js` added). CSS bundle 150.64 KB (unchanged — no CSS changes this pass, only JS + HTML refactoring). Only CSS warning is DaisyUI's internal `@property --radialprogress` declaration (unchanged, not ours).

**Smoke test:** `vite preview` + curl verified:
- HTML `<html lang="en" class="dark" data-theme="black">` ✓
- Both `<meta name="theme-color">` tags with `(prefers-color-scheme: light/dark)` media queries ✓
- Inline flash prevention script contains `LIGHT_THEMES`, `DARK_THEMES`, `'lofi': '#ffffff'`, `'black': '#000000'`, `validTheme` ✓
- Built CSS contains both `[data-theme="lofi"]` and `[data-theme="black"]` selectors ✓
- All 14 critical custom class families present (`.heatmap-0` through `.heatmap-4`, `.heatmap-cell`, `.filter-multi-select*`, `.settings-pane*`, `.detail-pane*`, `.error-boundary-card`, `.dashboard-header`, `.card`, `.btn-primary`, `.toast-success`) ✓

**Files changed (10 source + 4 docs):**
- New: `scripts/generate-theme-meta.mjs`, `dashboard/js/themes.js`, `dashboard/js/generated/themeMeta.js`
- Modified: `dashboard/index.html`, `dashboard/js/AppContext.jsx`, `dashboard/js/App.jsx`, `dashboard/js/components/Header.jsx`, `dashboard/js/components/HamburgerMenu.jsx`, `package.json`
- Docs: `CLAUDE.md`, `docs/SESSION_NOTES.md`, `docs/HISTORY.md`, `docs/TODO.md`

---

### Full DaisyUI v5 migration — all six reference phases completed in one pass

**Why:** Dashboard was running a partial dark-mode implementation built on custom `--bg-*/--text-*/--border-*` CSS variables with a manual `html.dark` override block, 39 `dark:` Tailwind pairs scattered across 10 files, and hardcoded brand-blue `rgba(45, 104, 255, ...)` values in multiple places. This fought the cascade and required manual Chart.js color sync. Migrated to DaisyUI v5 per `docs/implementations/THEME_DARK_MODE.md` to get dual-layer theming (`.dark` class + `data-theme` attribute), eliminate `dark:` pair bugs, collapse the dual theming systems into one, and unlock DaisyUI component classes for future work.

The initial commit on this branch was a conservative "infrastructure + partial migration" that left ~200 `var(--bg-*)` references intact. The user explicitly requested no shortcuts, so this second commit completes all six reference phases in a single pass.

**Phase 0 — Prerequisites (`dashboard/styles.css`, `package.json`):**
1. Installed `daisyui@5` (5.5.19) as devDependency.
2. Added `@plugin "daisyui" { themes: lofi --default, black --prefersdark; }` — two curated themes. `--default` / `--prefersdark` set the initial theme before JavaScript runs.
3. Added `@layer base { html { color-scheme: light; } html.dark { color-scheme: dark; } }` for native form input / scrollbar theming.

**Phase 1 — Audit:** Ran the reference doc's search patterns and found 202 `var(--bg-*/--text-*/--border-*/--color-*/--chart-grid/--glow-*/--shadow-*)` references in `styles.css`, 166 `text-themed-*/bg-themed-*/border-themed` class references across 21 JSX files, 39 `dark:` Tailwind pairs across 10 JSX files, and ~15 hardcoded `rgba(45, 104, 255, ...)` brand-blue values.

**Phase 2 — CSS variable removal (`dashboard/styles.css`):**
4. Rewrote the `:root` block: deleted every theme-related variable (all `--color-*` brand palette, `--bg-*`, `--text-*`, `--border-*`, `--shadow*`, `--glow-*`, `--color-primary-alpha`, `--chart-grid`). What remains is only non-theme design tokens: spacing, radius, z-index scale, fonts.
5. Deleted the entire `html.dark` override block — DaisyUI's `[data-theme]` selectors handle the switching now.
6. Bulk replaced via `replace_all`:
   - `var(--bg-primary/secondary/tertiary/hover)` → `var(--color-base-100/200/300/300)`
   - `var(--text-primary)` → `var(--color-base-content)`
   - `var(--text-secondary/tertiary/muted)` → `color-mix(in oklab, var(--color-base-content) 80%/60%/40%, transparent)`
   - `var(--border-color/light)` → `var(--color-base-300/200)`
   - `var(--glow-primary)` → `0 0 20px color-mix(in oklab, var(--color-primary) 25%, transparent)`
   - `var(--chart-grid)` → `color-mix(in oklab, var(--color-base-content) 10%, transparent)`
   - `var(--color-primary-alpha, ...)` → `color-mix(in oklab, var(--color-primary) 10%, transparent)`
   - `var(--shadow-lg)` → inline `0 10px 25px rgb(0 0 0 / 0.25)` (only 1 usage)
7. Replaced hardcoded brand-blue `rgba(45, 104, 255, X)` values with `color-mix(in oklab, var(--color-primary) (X*100)%, transparent)` — now the brand accent follows the active theme's primary color:
   - Focus rings (filter-select, filter-input)
   - btn-primary hover background
   - drop-zone hover / drag-over backgrounds
   - tab-btn-active text-shadow
   - body::before techy grid background
8. Deleted the "Tailwind gray class overrides for dark theme" block — the set of `.bg-gray-50/100`, `.text-gray-400/500/600/700/900`, `.border-gray-100/200`, `.hover\:bg-gray-100:hover` etc. that hijacked Tailwind's raw gray scales into the old custom dark theme. No longer needed — JSX uses DaisyUI tokens directly.
9. Deleted the "Semantic card backgrounds for dark theme" block (`.bg-amber-50`, `.bg-indigo-50`, `.bg-pink-50`, `.bg-purple-50`, `.bg-red-50`, `.bg-green-50`, `.bg-blue-50`) and the "Semantic text colors" block (`.text-green-600`, `.text-red-600`, `.text-amber-600`, `.text-blue-600`, `.border-blue-500`). These were Tailwind hijacks that JSX no longer relies on after Phase 3.
10. Deleted the `.text-themed-primary/secondary/tertiary/muted`, `.bg-themed-primary/secondary/tertiary`, and `.border-themed` utility class definitions.
11. Swapped `color: white` / `color: #1a1a1a` / `color: #fff` hardcoded foreground colors to DaisyUI `*-content` tokens so legibility tracks the theme:
   - `.toast-success` → `var(--color-success-content)`
   - `.toast-error` → `var(--color-error-content)`
   - `.toast-warning` → `var(--color-warning-content)`
   - `.btn-primary` → `var(--color-primary-content)`
   - `.quick-guide-btn-primary` → `var(--color-primary-content)`
   - `.filter-preset-btn:hover/.active` → `var(--color-primary-content)`
   - `.filter-mode-toggle button.active` → `var(--color-primary-content)`
   - `.project-link-primary` → `var(--color-primary-content)`
   - `.filter-badge` → `var(--color-primary-content)`
12. `.install-modal-note` amber rgba literals → `color-mix` against `var(--color-warning)`.
13. `.drop-zone-heading` `color: #e5e7eb` → `var(--color-base-content)`.
14. Print styles (`@media print`) intentionally kept hardcoded `white`, `black`, `#e5e7eb` per the reference doc's "Print Override" section — forces readable output regardless of theme.

**Phase 3 — Component migration (21 JSX files):**
15. Removed all 39 `dark:` Tailwind pairs from JSX. Zero remain as live class names; the only `dark:` matches in the codebase now are inside code comments explaining what was migrated.
16. 166 `text-themed-*/bg-themed-*/border-themed` class references across 21 files (`App.jsx`, `main.jsx`, all 13 shared components, all 9 section components) bulk-replaced to DaisyUI Tailwind utilities:
    - `text-themed-primary` → `text-base-content`
    - `text-themed-secondary/tertiary/muted` → `text-base-content/80`, `/60`, `/40`
    - `bg-themed-primary/secondary/tertiary` → `bg-base-100/200/300`
    - `border-themed` → `border-base-300`
17. `Summary.jsx` Activity Snapshot cards: `bg-amber-50 dark:bg-amber-900/20`, `bg-indigo-50 dark:bg-indigo-900/20`, `bg-pink-50 dark:bg-pink-900/20`, `bg-purple-50 dark:bg-purple-900/20` → `bg-warning/15`, `bg-info/15`, `bg-accent/15`, `bg-secondary/15`. Text colors (`text-amber-600`, etc.) → matching semantic tokens (`text-warning`, etc.). These now auto-switch with the theme and each still has a visually distinct tint.
18. `Timeline.jsx` complexity badges: `bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300` (high) / `bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300` (medium) / neutral (low) → `bg-secondary/20 text-secondary` / `bg-info/20 text-info` / `bg-base-300 text-base-content/80`.
19. `Health.jsx` security panels (all three viewmodes): `bg-red-50 dark:bg-red-900/20` + `border-red-200 dark:border-red-800` + `text-red-600 dark:text-red-400` → `bg-error/10` + `border-error/40` + `text-error`.
20. `HealthBars.jsx`, `HealthAnomalies.jsx`, `Contributors.jsx`, `Tags.jsx`, `Timing.jsx`, `Progress.jsx`, `Discover.jsx`: progress-bar rails (`bg-gray-200 dark:bg-gray-600`) → `bg-base-300`; hover states (`hover:bg-gray-50 dark:hover:bg-gray-700` / `hover:bg-gray-100 dark:hover:bg-gray-600`) → `hover:bg-base-200` / `hover:bg-base-300`.
21. `App.jsx` embed mode override: now sets `--color-base-100` (DaisyUI token) instead of the removed `--bg-primary` alias, and also applies `data-theme="lofi"` / `data-theme="black"` alongside the `.dark` class toggle so DaisyUI components render correctly in embedded contexts.

**Dual-layer theming wired up (`index.html`, `AppContext.jsx`):**
22. `<html>` default: `class="dark" data-theme="black"`.
23. Flash prevention inline script in `index.html` (classic, not `type="module"`) now sets BOTH `.dark` class AND `data-theme` attribute before first paint, plus overwrites both `<meta name="theme-color">` tag `content` attributes. Theme name + meta color constants (`LIGHT_THEME='lofi'`, `DARK_THEME='black'`, `LIGHT_META='#ffffff'`, `DARK_META='#000000'`) live inside the script and MUST stay in sync with the `AppContext.jsx` module constants — inline scripts can't import ES modules, so duplication is unavoidable (documented with comments pointing at each side).
24. Added two `<meta name="theme-color">` tags with `(prefers-color-scheme: light/dark)` media queries in `index.html`.
25. `AppContext.jsx` darkMode `useEffect` extended: sets `.dark` class, `data-theme` attribute, and overwrites both theme-color meta tags' content on every toggle. New module constants at top of file.

**Phase 4 — Z-index normalization:** Already completed 2026-04-10, no changes needed.

**Chart.js theme sync:**
26. `AppContext.jsx` darkMode effect no longer reads the removed `--text-secondary` / `--chart-grid` custom variables. It now reads DaisyUI's `--color-base-content` directly and passes `color-mix(in oklab, ${baseContent} 80%/10%, transparent)` to `ChartJS.defaults.color` / `borderColor`. Canvas context parses `color-mix()` the same way CSS does in Chrome 111+ / Firefox 113+ / Safari 16.2+ (same baseline as DaisyUI).
27. `Tags.jsx` removed its per-component `useChartTextColor` hook + `useRef`/`useLayoutEffect` + explicit `color: CHART_TEXT_COLOR` overrides. Now inherits from `ChartJS.defaults.color` — single source of truth, and because Tags' chart `useMemo` already has `state.darkMode` as a dep (done 2026-04-11), the chart rebuilds on theme toggle and picks up the fresh default.

**Phase 5 — Verification (10-point checklist):** Passed via code inspection and build. `TESTING_GUIDE.md` Theme section rewritten with the full verification checklist for manual browser testing, grouped into: system preference fallback, dual-layer attributes, flash prevention, cross-tab sync, PWA status bar, charts, surface auto-switching, semantic tokens, print override.

**Phase 6 — Cleanup:**
28. Deleted 3 legacy CSS blocks (Tailwind gray overrides, semantic card backgrounds, semantic text colors) and 8 utility class definitions (`text-themed-*`, `bg-themed-*`, `border-themed`).
29. Zero custom `--bg-*/--text-*/--border-*/--color-primary-alpha/--chart-grid/--glow-*/--shadow*` variables remain anywhere in the codebase (verified with comprehensive Grep — only matches are in explanatory code comments).
30. Updated `CLAUDE.md` Frontend standards to enforce DaisyUI semantic tokens and prohibit re-introducing the deleted custom variables.

**Build:** Passes (`./node_modules/.bin/vite build`). CSS bundle **147.16 KB → 150.6 KB** (+3.5 KB, +2%). The net increase comes from DaisyUI's theme blocks and semantic component classes (btn, card, modal, etc.) which are added to the bundle; deleted custom variables / gray overrides / utility classes only partially offset the gain. All 82 modules transform. Vite preview serves correctly, DaisyUI theme selectors (`[data-theme="lofi"]` and `[data-theme="black"]`) and all 19 critical custom class families (`.heatmap-*`, `.filter-multi-select*`, `.settings-pane*`, `.detail-pane*`, `.error-boundary-card`, `.root-error-message`, `.dashboard-header`, `.card`, `.tab-btn-active`, `.btn-icon`, `.btn-primary`, `.toast-success`, `.collapsible-header`, etc.) verified via curl inspection.

**Regression caught and fixed (second pass):** The first migration commit on this branch misreported the CSS bundle size as 123.27 KB — this turned out to be a build artifact of a broken CSS comment. The rewritten `:root` comment block contained the literal sequence `--bg-*/--text-*/--border-*` inside a `/* ... */`, and the embedded `*/` terminated the comment prematurely. `esbuild`'s CSS minifier silently dropped everything after that point, which included all `.heatmap-*`, `.filter-multi-select*`, `.settings-pane*`, `.detail-pane*`, `.error-boundary-card`, and several other custom class definitions. The build passed (no errors) but the dashboard would have rendered without any of those custom styles. Fixed by rephrasing the comment to avoid the `*/` sequence. Added an `@source not` note in CLAUDE.md warning future sessions never to write `--*-*/...` glob patterns inside CSS comments.

**Additional semantic token migration (second pass):**
- `Timing.jsx` author threshold indicators: `text-green-600/amber-600/red-600` → `text-success/warning/error`.
- `HealthAnomalies.jsx` debt balance net indicator: `text-red-500/green-500` → `text-error/success`.
- `Discover.jsx` pin button: `text-blue-500` / `hover:text-blue-500` → `text-primary` / `hover:text-primary`. Metric selector focus ring: `focus:ring-blue-500` → `focus:ring-primary`.
- `Summary.jsx`, `Timeline.jsx`, `Progress.jsx`, `HealthWorkPatterns.jsx` stat-card hover rings: `hover:ring-blue-500` → `hover:ring-primary`.

**Files changed (22 source + 6 docs):**
- Infrastructure: `package.json`, `package-lock.json`, `dashboard/styles.css`, `dashboard/index.html`, `dashboard/js/AppContext.jsx`
- App shell: `dashboard/js/App.jsx`, `dashboard/js/main.jsx`
- Shared components (13): `dashboard/js/components/CollapsibleSection.jsx`, `DropZone.jsx`, `ErrorBoundary.jsx`, `FilterSidebar.jsx`, `Header.jsx`, `HealthAnomalies.jsx`, `HealthBars.jsx`, `HealthWorkPatterns.jsx`, `InstallInstructionsModal.jsx`, `QuickGuide.jsx`
- Section components (9): `dashboard/js/sections/Contributors.jsx`, `Discover.jsx`, `Health.jsx`, `Progress.jsx`, `Projects.jsx`, `Summary.jsx`, `Tags.jsx`, `Timeline.jsx`, `Timing.jsx`
- Docs: `CLAUDE.md`, `docs/SESSION_NOTES.md`, `docs/HISTORY.md`, `docs/TODO.md`, `docs/TESTING_GUIDE.md`, `docs/USER_GUIDE.md`

**Remaining (optional) future work:** Component class migration from raw Tailwind to DaisyUI component classes (`<button>` → `btn btn-{primary|ghost|outline}`, `<input>` → `input input-bordered`, cards → `card` + `card-body`, badges → `badge badge-*`). Currently the app uses custom CSS for these; DaisyUI component classes would reduce custom CSS further. Not required for the dark-mode migration to be considered complete — all theming is now DaisyUI-driven and all six reference phases are done.

---

## 2026-04-11

### Debug system hardening — 9 commits of fixes and refactors

**Why:** After the initial debug system implementation, repeated audit passes found bugs, edge cases, spec deviations, and code-quality issues. All addressed incrementally over 9 commits.

**Commits (chronological):**

1. `feat(debug)`: Initial debug system — debugLog module, React DebugPill, clipboard fallbacks, `#debug-root` mount, error routing updated across 5 files.
2. `fix(debug)`: Spec compliance pass — moved embed check to main.jsx (avoid conditional hooks), removed unused `diagRow` status param, added browser info and manifest start_url/id validation, added visible textarea clipboard fallback, routed Projects.jsx through `debugAdd`.
3. `fix(debug)`: Bug fixes pass — removed redundant `setEntries(debugGetEntries())` causing duplicate entries on mount, added `__debugConsolePatched` HMR guard preventing nested wrapper chains on hot reload, Clear button now resets `reportText`, added `import`/`export` source colors.
4. `chore(debug)`: Removed unused `debugGetEntries` import from DebugPill (dead after fix #3).
5. `feat(debug)`: Added `diagnoseFailure` utility per spec — no-cors HEAD probe to distinguish CORS/network/deployment failure modes.
6. `fix(debug)`: Defensive edge-case hardening — `safeStringify` wrapper for circular references in details (would crash LogTab), `safeString` wrapper for throwing `toString()` in console interception, `copyTimerRef` for cleanup on unmount.
7. `fix(debug)`: Pre-React error timestamp preservation — inline pill now stores `Date.now()` instead of `toLocaleTimeString()`, added `fmtTime` helper for display, `render()` bails early when `__debugReactMounted` is true (stops wasted DOM work on hidden banner).
8. `refactor(debug)`: Bridge refactor — pre-React error ingestion now calls `debugAdd` with optional `timestamp` parameter instead of manually constructing entries and mutating internal state.
9. `refactor(debug)`: Deduplication + strict mode fix — exported `formatDebugTime` and `safeStringify` from debugLog.js (removed duplicates in DebugPill), added `setEntries([])` before subscription to handle React strict mode double-mount cleanly.

**Architecture:**
- `debugLog.js` — Pub/sub circular buffer (200 entries), structured entries (`id`, `timestamp`, `source`, `severity`, `event`, `details`), console interception with HMR guard, global error listeners with HMR guard, report generation with URL redaction, pre-React error bridge, `debugAdd` with optional timestamp, `diagnoseFailure` utility, shared `formatDebugTime`/`safeStringify` helpers.
- `copyToClipboard.js` — ClipboardItem Blob → writeText → textarea fallback chain.
- `components/DebugPill.jsx` — Separate React root (survives App crashes), inline styles (survives CSS failures), 3 tabs (Log/Environment/PWA Diagnostics), monotonic stale-run cancellation, visible textarea fallback for failed clipboard, hides inline pill on mount.
- `index.html` inline pill — Stores `Date.now()`, bails `render()` after React mounts.
- Error routing — ErrorBoundary, App, pwa, HamburgerMenu, Projects, main.jsx all use direct `debugAdd` imports; `window.__debugPushError` override maintained for backward compat.

**Files changed:**
- New: `js/debugLog.js`, `js/copyToClipboard.js`, `js/components/DebugPill.jsx`
- Modified: `index.html`, `js/main.jsx`, `js/App.jsx`, `js/pwa.js`, `js/components/ErrorBoundary.jsx`, `js/components/HamburgerMenu.jsx`, `js/sections/Projects.jsx`
- Docs: `CLAUDE.md`, `README.md`, `docs/SESSION_NOTES.md`, `docs/HISTORY.md`, `docs/TESTING_GUIDE.md`, `docs/TODO.md`, `docs/AI_MISTAKES.md`

---

### React migration hardening — bugs, accessibility, architecture

**Why:** Systematic review identified 3 bugs, 3 non-React patterns, and 2 accessibility gaps remaining after the V2 migration. Fixed all 12 findings.

**Changes:**

**Bugs:**
1. Created `useScrollLock` hook — ref-counted body scroll lock replacing direct `document.body.style.overflow` in App.jsx and QuickGuide.jsx. Prevents race condition when multiple overlays open/close independently.
2. Moved Chart.js color sync from `main.jsx` (one-time module load) to `AppContext.jsx` (darkMode useEffect). Added `state.darkMode` to all 11 chart useMemo dependency arrays across 5 section files so react-chartjs-2 recreates chart options and calls `chart.update()` on theme toggle.
3. Added `htmlFor`/`id` pairing on SettingsPane work hour labels and selects for screen reader association.

**React migration:**
4. Converted heatmap tooltip from vanilla DOM to React portal (`HeatmapTooltip.jsx`). Removed `document.getElementById`, `classList.add/remove`, and manual `style.left/top` positioning from App.jsx. Portal mounts into existing `#heatmap-tooltip` div in index.html.
5. Moved embed `?theme=`/`?bg=` overrides from App.jsx module scope into a `useEffect`. Eliminates race with AppContext's dark mode management that could re-add the `dark` class after embed removed it.
6. Created `urlParams.js` — centralized URL query parameter parsing. Replaces 4+ redundant `new URLSearchParams(window.location.search)` calls in App.jsx and chartColors.js.

**Accessibility:**
7. Added full keyboard navigation to FilterSidebar `MultiSelect` — ArrowUp/Down, Enter/Space toggle, Escape close, Home/End, `aria-activedescendant`, `aria-multiselectable`. Added `.highlighted` CSS class for keyboard focus indicator.
8. Added `aria-label` to 12+ clickable elements across Health.jsx (urgency bars, impact bars, security repo buttons), Timeline.jsx (period items, summary cards), and Progress.jsx (semver items, epic bars, feature/bugfix/refactor cards).

**Documentation:**
9. Added comment on `.heatmap-cell:hover` `z-index: 1` explaining it's local grid stacking, not from the CSS variable scale.
10. Updated CLAUDE.md architecture lists: added HeatmapTooltip, useScrollLock, urlParams.js.
11. Verified QuickGuide.jsx step 2 matches current 6-tab structure (Summary, Timeline, Breakdown, Health, Discover, Projects).

**Files changed:**
- New: `js/hooks/useScrollLock.js`, `js/components/HeatmapTooltip.jsx`, `js/urlParams.js`
- Modified: `js/App.jsx`, `js/main.jsx`, `js/AppContext.jsx`, `js/chartColors.js`, `js/components/QuickGuide.jsx`, `js/components/SettingsPane.jsx`, `js/components/FilterSidebar.jsx`, `js/sections/Health.jsx`, `js/sections/Timeline.jsx`, `js/sections/Progress.jsx`, `js/sections/Timing.jsx`, `js/sections/Contributors.jsx`, `js/sections/Tags.jsx`, `styles.css`, `index.html`, `CLAUDE.md`

---

## 2026-04-10

### Z-index scale — full audit and normalization

**Why:** The glow-props Z_INDEX_SCALE pattern requires every z-index in the codebase to map to a named layer. Two violations existed: the inline debug pill used hardcoded `zIndex:'99999'` (3 places), and the heatmap tooltip used `--z-toast` (70) when the scale places tooltips in the menu/dropdown layer (50).

**Changes:**
1. Replaced all three `zIndex:'99999'` in `dashboard/index.html` with `zIndex:'80'` (matches `--z-debug`)
2. Changed `.heatmap-tooltip` from `var(--z-toast)` to `var(--z-menu)` — tooltips belong at z-50 per the scale, and z-70 caused the tooltip to compete with toasts at the same level
3. Updated CSS scale comment to reference `Z_INDEX_SCALE.md` (was pointing to `BURGER_MENU.md`)
4. Added decision context comments explaining sub-layer choices (21 for sticky-header, 28 for drawer-backdrop, 58 for modal-backdrop) and why they deviate from the base scale's "backdrop always 40" rule
5. Added decision context comment on inline debug pill explaining why z-80 is hardcoded (CSS variables unavailable before stylesheets load)

6. Added `@source not` directives to `styles.css` excluding `public/data-commits/` and `public/repos/` from Tailwind content scanning — commit history in JSON data files contained Tailwind-like class names (e.g. `z-[9999]`, `z-[100]`) causing phantom CSS utilities in the build output
7. Added z-index visual stacking test scenario to `docs/TESTING_GUIDE.md`
8. Documented hamburger menu stacking context limitation in `docs/TODO.md` — backdrop and dropdown are trapped inside the header's z-21 stacking context, causing drawers (z-30) to render above the backdrop

**Audit result (20 z-index values):** All source values use scale variables or justified base-content values (`-1` for decorative pseudo-element, `1` for heatmap cell hover). No ad-hoc values remain in source or build output.

### Add Apple touch icon and favicon.ico — full APP_ICONS pattern parity

**Why:** The icon generation pipeline was missing two items from the glow-props APP_ICONS pattern: the 180px Apple touch icon (iOS home screen) and a 32x32 favicon.ico (Windows taskbar pinning, legacy browsers).

**Changes:**
1. Added `{ name: 'apple-touch-icon.png', size: 180 }` to `generate-icons.mjs` ICONS array
2. Added favicon.ico generation via manual ICO packing (zero dependencies, 32x32 from SVG source)
3. Script copies both `apple-touch-icon.png` and `favicon.ico` to `dashboard/public/` for root-level serving
4. Added `<link rel="apple-touch-icon" href="/apple-touch-icon.png">` to `dashboard/index.html`
5. Added `<link rel="icon" type="image/x-icon" href="/favicon.ico" sizes="32x32">` as fallback (SVG favicon remains primary for modern browsers)

**Not added to PWA manifest:** Apple touch icon uses the `<link>` tag mechanism, not the web app manifest icons array. The manifest icons are for Android/Chrome install.

6. Removed inline SVG data URL favicon from `index.html` — was a second icon source that bypassed the generation pipeline. Replaced with `<link rel="icon" type="image/png" href="/assets/images/favicon.png">` pointing to the generated 48x48 PNG
7. Script now syncs all generated files (7 PNGs + favicon.ico) to `dashboard/public/assets/images/` — eliminates pre-existing drift risk where manual copies could go stale between regenerations

**Files changed:** `scripts/generate-icons.mjs`, `dashboard/index.html`, `assets/images/apple-touch-icon.png`, `assets/images/favicon.ico`, `dashboard/public/apple-touch-icon.png`, `dashboard/public/favicon.ico`, `dashboard/public/assets/images/*`

## 2026-04-06

### Bypass SW navigation cache for embed URLs

**Why:** Even after removing X-Frame-Options from vercel.json, the PWA service worker continued serving cached index.html responses that included the old header. Since the iframe gets blocked before JS runs, the SW update code never executes — creating a deadlock where the old SW persists indefinitely.

**Fix:** Added `navigateFallbackDenylist: [/[?&]embed=/]` to the Workbox config. Embed URL navigations now bypass the SW cache entirely, going directly to the network. Normal dashboard navigation still uses the precached fallback.

### PWA improvements from cross-project review (synctone, canva-grid, few-lap)

**Why:** Reviewed sibling repos and found repo-tor's PWA had a skipWaiting/prompt conflict and lacked resilience patterns that other projects had adopted.

**Changes:**
1. Removed `skipWaiting: true` + `clientsClaim: true` from workbox config — conflicted with `registerType:'prompt'`, auto-reloading before user saw update prompt
2. Added `_userClickedUpdate` guard on `controllerchange` — only reloads when user triggers update via applyUpdate(), not on background SW events
3. Added 30-second post-update suppression via sessionStorage — prevents false "update available" re-detection after reload
4. Added SW recovery script in index.html — if React hasn't mounted after 30s, clears all caches, unregisters SW, and reloads (max 2 attempts per session)
5. Added 1.5s settle delay to `checkForUpdate()` — `reg.update()` is async and `reg.waiting` may not be populated immediately after it resolves
6. Fixed `visibilitychange` handler to surface waiting workers — the `onNeedRefresh` callback from `registerSW` only fires once during setup, so separate `reg.update()` calls need manual detection + event dispatch
7. Added `version.json` polling — build-time timestamp file written by `scripts/write-build-version.mjs`, fetched independently of the SW. Detects deployments that don't change the SW file (e.g. vercel.json config changes). Checked on startup (3s delay), hourly, and on visibility change

### Full PWA parity with few-lap (16 gap items)

**Why:** Line-by-line comparison with few-lap's PWA implementation identified 16 differences. All addressed.

**Changes:**
- `pwaConstants.js`: Extracted all timing/threshold constants (SW_UPDATE_CHECK_INTERVAL_MS, JUST_UPDATED_SUPPRESS_MS, UPDATE_SETTLE_DELAY_MS, etc.)
- `offline.html`: Branded offline fallback page (precached by Workbox)
- `dismissUpdate()`: Dismiss update prompt without applying (pattern from few-lap)
- `_isChecking` state + `pwa-checking-update` event: Loading feedback during manual update checks
- `offlineReady` auto-dismiss: 3s timeout via `pwa-offline-dismissed` event
- `__pwaPromptReceived` flag: Set in inline HTML script + pwa.js for diagnostics
- Display-mode change listener: Detects installs via browser menu (not just beforeinstallprompt)
- Install analytics: `trackInstallEvent()` stores last 50 events in localStorage
- `dismissInstall()` + `isInstallDismissed()`: Persistent install prompt dismissal
- Chrome 90-day cooldown note: Shown in install instructions when native prompt unavailable
- 5s diagnostic timeout: Warns in debug pill if beforeinstallprompt hasn't fired on Chromium
- 2-layer capture documented: Explained why Vite doesn't need few-lap's 3rd layer (Metro is slower)
- Recovery script strengthened: Now watches `updatefound` + installing worker `statechange`, clears counter on successful mount
- vercel.json headers: `Cache-Control: no-cache` for all HTML responses, `immutable` for hashed assets, `Service-Worker-Allowed` for sw.js, `Content-Type` for manifest

## 2026-04-05

### Remove X-Frame-Options header blocking cross-origin embeds

**Why:** The `X-Frame-Options: SAMEORIGIN` header added in H4 audit fix (19e1e21) blocked all cross-origin iframes. This broke the embed feature — see-veo and other apps embedding repo-tor charts via `?embed=` got "refused to connect" errors.

**Fix:** Removed `X-Frame-Options` entirely. The dashboard is public, read-only, with no auth — there are no actions to clickjack. The embed feature is designed for cross-origin use (CVs, portfolios, external apps), so framing protection is counterproductive here.

## 2026-04-02

### Full 9-trigger audit sweep and fixes

**Why:** Ran all 9 audit triggers (review, audit, docs, mobile, clean, performance, security, debug, improve) in parallel. Found 41 unique findings across all categories. Implemented fixes for all critical, high, medium, and low-priority items.

**Critical fixes (C1-C5):**
- Removed unconditional dark class in main.jsx that overrode flash prevention
- Added URL validation for ?data= param (SSRF prevention — http/https only)
- Replaced postMessage wildcard '*' with referrer-based origin; added source validation in embed.js
- Routed ErrorBoundary errors to debug pill via __debugPushError
- Added per-file try/catch for month commit fetches with user-facing failure warning

**High fixes (H1-H10):**
- Added viewport-fit=cover and safe-area-inset padding for iOS notch/home indicator
- Increased filter mode toggle button size (was 2px padding, now 6px + min-height)
- Added security headers to vercel.json (X-Content-Type-Options, X-Frame-Options, Referrer-Policy)
- Routed SW registration errors to debug pill
- Wrapped Header, TabBar, FilterSidebar, DetailPane, SettingsPane in ErrorBoundary
- Fixed TESTING_GUIDE (removed nonexistent dark mode toggle + private mode sections)
- Updated CLAUDE.md dark mode status to "Implemented"
- Updated USER_GUIDE.md theme section for light/dark support
- Added Projects tab to QuickGuide onboarding

**Medium fixes (M1-M16):**
- Added 30s fetch timeout with user-friendly timeout error message
- Cached tag style objects in module-level Map
- Replaced duplicate work hours logic in useHealthData with getWorkPattern()
- Added network status and theme to debug pill diagnostics
- Wrapped UrgencyBar/ImpactBar in React.memo
- Validated ?bg= param against hex regex
- Removed token source from extract-api.js log
- Replaced aria-hidden="true" with role="presentation" on all backdrop overlays

**Low fixes (L1-L6):**
- Added vertical clamping to heatmap tooltip
- Increased loading timeout from 10s to 20s
- Added explanatory comment for ISO week calculation

---

## 2026-04-02

### Cross-project alignment with glow-props

**Why:** Compared repo-tor's CLAUDE.md against glow-props' shared CLAUDE.md and suggested implementations. Found 24 actionable items across documentation, accessibility, infrastructure, theming, embedding, and extraction.

**What (24 items completed):**

**CLAUDE.md updates (1-4):**
1. Fixed "class" → "component" terminology in Code Organization
2. Added React-specific quality checks (dangerouslySetInnerHTML, missing keys, re-renders)
3. Added build tools check to AI Notes
4. Added QuickGuide sync note to AI Notes

**Suggested Implementations restructure (5-7):**
5. Extracted ~200 lines of inlined implementations to `docs/implementations/` (8 files)
6. Added Burger Menu implementation reference
7. Added Theme & Dark Mode implementation reference

**HamburgerMenu accessibility & iOS fixes (8-13):**
8. Added `cursor-pointer` on backdrop overlay for iOS Safari
9. Added `useId()` for unique `aria-controls`
10. Added `hasBeenOpenRef` focus guard
11. Added `cancelAnimationFrame` cleanup
12. Added `overscroll-contain` on menu card
13. Switched from `role="menu"` to disclosure pattern (`nav`/`ul`/`li`)

**Layout & Infrastructure (14-16):**
14. Adopted z-index scale convention (CSS variables `--z-base` through `--z-debug`)
15. Added safe localStorage wrappers (`safeStorageGet`/`safeStorageSet`/`safeStorageRemove`)
16. Added `sharp` to devDependencies

**Dark mode improvements (17-20):**
17. Added full light theme CSS variables (`:root` = light, `html.dark` = dark override)
18. Added flash prevention inline `<script>` in `<head>`
19. Added cross-tab theme sync via `storage` event
20. Added system preference fallback via `matchMedia`

**Embedding & extraction (21-24):**
21. Added `?data=<url>` query param for loading data from external URL
22. Added Vite library build config (`vite.config.lib.js`, `js/lib.js`, `npm run build:lib`)
23. Researched device/platform attribution — infeasible with native git data
24. Added `--no-merges` CLI flag to `extract.js`

---

## 2026-03-27

### Mobile UX improvements

**Why:** Header was too large on mobile, commit counts used jargon ("commits"), filter state wasn't clear, secondary actions cluttered the header, and long lists overwhelmed mobile scrolling.

**What:**
1. Reduced header vertical padding, title size, and button sizes on mobile (<640px)
2. Renamed "commits" to "changes" in header subtitle (plain language for non-technical users)
3. Header subtitle shows "Showing X of Y changes · Filtered" (clickable) when filters are active
4. Added hamburger menu for secondary actions (Quick Guide, PDF, Install, Update, version info)
5. Added Quick Guide tutorial modal — 4-step walkthrough, auto-shows on first visit
6. Added responsive pagination via `useShowMore` hook across 7 sections with mobile-optimized limits
7. Extracted `ShowMoreButton`, `useEscapeKey`, `useClickOutside` to eliminate duplication
8. Cleaned redundant variable aliasing, type checks, and wrappers across section files
9. Moved DetailPane empty state inline style to CSS class (CLAUDE.md compliance)
10. Added arrow key navigation to hamburger menu dropdown (WAI-ARIA accessibility)
11. Added focus management to QuickGuide modal on open (keyboard accessibility)
12. Imported version dynamically from package.json instead of hardcoding
13. Centralized all pagination limits in `PAGE_LIMITS` constant in state.js
14. Unified ShowMoreButton spacing via CSS `margin-top: 12px` (removed per-instance overrides)

---

## 2026-03-26

### glow-props CLAUDE.md alignment

**Why:** Cross-project alignment to standardize CLAUDE.md structure across all devmade-ai repositories per glow-props shared standards.

**What:**
1. Added Suggested Implementations section (PWA, Debug, Icons, PDF, Timer fix, HTTPS Proxy) with full code examples
10. Fixed PWA manifest: added `id: '/'` (stable app identity) and `prefer_related_applications: false` (ensures install prompt fires)
11. Added PDF download button to Header (`window.print()` with `no-print` class so it hides during print)
12. Enhanced print CSS: body text color, link underlines, `break-inside: avoid` on sections, header border
13. Added `no-print` wrappers to TabBar, FilterSidebar, DetailPane, SettingsPane in App.jsx
2. Standardized Principles to glow-props 7 (moved extras like "Keep docs updated immediately", "Preserve session context", "Capture ideas", "Document user actions" to AI Notes)
3. Replaced Documentation subsection with standard 9-file managed set table
4. Moved `@coder`/`@data` personas from standalone section into AI Notes
5. Renamed `docs/AI_LESSONS.md` → `docs/AI_MISTAKES.md` (standard name across projects)
6. Renamed `docs/USER_TESTING.md` → `docs/TESTING_GUIDE.md` (standard name across projects)
7. Updated all active references in docs/CODE_REVIEW.md, docs/ANALYSIS_GUIDE.md, dashboard/js/main.jsx, README.md
8. Updated cross-project reference last reviewed date to 2026-03-26
9. Expanded AI Notes with: "Always read files before editing", "Commit and push before ending session", "Communication style", "Claude Code mobile/web sibling repo access"

---

## 2026-03-23

### Documentation audit fixes

**Why:** Cross-repo documentation audit found stale references from the March 4 `tabs/` → `sections/` rename that were missed during the prior codebase audit.

**What:**
1. Fixed README.md: `js/tabs/` directory reference → `js/sections/` with updated description
2. Fixed CLAUDE.md: `TABS_PATH=dashboard/js/tabs` → `SECTIONS_PATH=dashboard/js/sections`

---

## 2026-03-15

### few-lap added to Live Projects

**Why:** few-lap is deployed on Vercel but was missing its `liveUrl` in `projects.json`, so it appeared under "Other Repositories" instead of "Live Projects" in the dashboard.

**What:**
1. Added `liveUrl: "https://few-lap.vercel.app"` to few-lap's entry in `dashboard/public/projects.json`

---

## 2026-03-13

### Batch Preamble + Playbook Rename

**Why:** Analysis instructions were buried in the playbook doc, so each AI session had to find and re-read them. Embedding instructions directly in every batch file ensures they're always read with the data.

**What:**
1. **Created `config/batch-preamble.md`** — Standalone analysis instructions extracted from the playbook: tag vocabulary, scoring rubrics, review format, special cases, what's expected, what's not allowed, when unsure, and why the process exists
2. **Updated `scripts/pending.js`** — Reads preamble at startup and embeds it as a `preamble` field in every batch JSON file
3. **Renamed `docs/EXTRACTION_PLAYBOOK.md` → `docs/DATA_OPERATIONS.md`** — Trimmed duplicated content (tagging guidelines, scoring rubrics, review format) and replaced with references to the preamble
4. **All fields now required** — risk, debt, epic, semver are no longer optional. AI must best-guess from context rather than leaving blanks, because AI understands commit intent better than scripts
5. **Updated all references** — CLAUDE.md, SESSION_NOTES.md, AI_LESSONS.md, CODE_REVIEW.md, COMMIT_CONVENTION.md, ANALYSIS_GUIDE.md, extract.js, aggregate.js

**Alternatives considered:**
- Separate preamble file alongside batches: Rejected — easy to miss, not guaranteed to be read
- Inline instructions in pending.js: Rejected — hard to maintain, can't be reviewed independently
- Keep fields optional: Rejected — blanks break downstream processing; AI contextual understanding produces more accurate output than scripts

---

### glow-props CLAUDE.md Sync — 8 New Patterns Adopted

**Why:** Periodic review of the cross-project glow-props CLAUDE.md revealed patterns not yet adopted in repo-tor.

**What:**
1. **Trigger system** — 10 single-word analysis commands (`review`/`rev`, `audit`/`aud`, `docs`/`doc`, `mobile`/`tap`, `clean`/`cln`, `performance`/`perf`, `security`/`sec`, `debug`/`dbg`, `improve`/`imp`, `start`/`go`) with `fix`/`skip`/`stop` flow control
2. **Download as PDF** — `window.print()` pattern with `no-print` class and print-friendly CSS overrides
3. **Commit metadata footers** — Full format with field definitions added to CLAUDE.md (Tags, Complexity, Urgency, Impact, Risk, Debt, Epic, Semver)
4. **`// KEEP:` convention** — Commented-out code must use `// KEEP:` with reason to be preserved
5. **Prohibition: no interactive prompts** — List options as numbered text instead
6. **Prohibition: no feature removal during cleanup** — Must check if documented as intentional first
7. **Bug report ASK rule** — Ask clarifying questions before writing code for bug reports
8. **TESTING_GUIDE.md format** — Structured test scenarios (step-by-step actions, expected results, regression checklist)

**Alternatives considered:** N/A — these are cross-project standards to adopt.

---

## 2026-03-04

### Cross-Tab Audit — 6 Fixes

**Why:** Full audit of all 6 tabs and their sections revealed 2 bugs, 2 UX issues, and 2 minor correctness/robustness issues.

**What:**
- **Fix: Projects filter bug** — `Projects.jsx` used `state.data?.commits` (unfiltered) for commit counts in Phase 2 instead of `filteredCommits`. Counts now respond to user-applied filters.
- **Fix: Timeline UTC mismatch** — Urgency/debt/impact trend charts (moved from Health) used `.substring(0,7)` for month grouping instead of `getUTCMonthKey()`. Could mismatch pre-aggregated UTC keys near midnight.
- **UX: Bottom padding** — Added `pb-12` to the content wrapper so last section doesn't sit flush against viewport bottom.
- **UX: Section separators** — Added subtle `<hr>` dividers between stacked sections in Timeline and Breakdown tabs.
- **UX: Discover file insights loading** — Shows spinner during Phase 1 instead of "No file data available".
- **Fix: Health fallback robustness** — Changed `||` to `??` (nullish coalescing) for summary breakdown fallbacks.

**Alternatives considered:**
- Larger gap instead of `<hr>`: Rejected — gap alone doesn't clearly separate sections; a subtle line does.
- Pre-aggregate file insights: Rejected — file lists are large and not in summary data.

### Section Reorganization + Terminology Cleanup

**Why:** Dashboard used "Tab" naming for both the 6 navigation buttons and the content components they render, causing confusion. Health tab was overloaded with 11+ sections while Security tab was too thin. Discover had no Phase 1 support.

**What:**
- **Renamed `tabs/` → `sections/`** — All section component files moved, "Tab" suffix dropped from filenames and component names. "Tab" now exclusively means the 6 navigation buttons; content within is a "section".
- **Merged Security into Health** — Deleted `SecurityTab.jsx`. Security events now render as a CollapsibleSection within `Health.jsx`, view-level aware.
- **Moved trend charts to Timeline** — Urgency trend, impact over time, debt trend line charts moved from Health/useHealthData to Timeline section (inline useMemo).
- **Moved per-contributor urgency/impact to Contributors** — Per-contributor urgency and impact bars moved from Health to Contributors section.
- **Discover Phase 1** — Added `calcCodeStats()` to aggregate-processed.js. Discover derives 9 of 11 metrics from summary data during Phase 1 (remaining 2 show em dash until commits load).
- **useHealthData simplified** — Removed trends and per-contributor computations. Returns only breakdown data.
- **State/EmbedRenderer updates** — `TAB_MAPPING` → `TAB_SECTIONS`. Embed ID mappings updated (trend charts now map to Timeline).

**Alternatives considered:**
- Extract each chart into its own file: Rejected — too large a refactor, duplicates data/filter logic.
- Keep Security as separate section component: Rejected — too thin (single metric), better as part of Health.
- Keep "Tab" naming: Rejected — user explicitly requested terminology cleanup to avoid confusion.

### Phase 1 Pre-Aggregated Fallbacks for All Tabs

**Why:** During Phase 1 (summary loaded, commits still fetching), most tabs showed spinners or empty content. The summary JSON already contains enough pre-aggregated data to render meaningful charts and breakdowns instantly.

**What:**
- **TagsTab**: Uses `summary.tagBreakdown` for full doughnut chart + tag list during Phase 1.
- **HealthTab**: Uses `summary.urgencyBreakdown` (converted 1-5 scale → planned/normal/reactive), `impactBreakdown`, `riskBreakdown`, `debtBreakdown`. Shows all breakdown bars and risk/debt sections. Trend charts + per-contributor sections hidden until commits load. Fixed React hooks rule violation (useHealthData called after conditional return).
- **ContributorsTab**: Maps `summary.contributors[]` to aggregateContributors format — full "Who Does What" cards + complexity chart.
- **SecurityTab**: Shows `summary.security_events` count + simplified event list during Phase 1.
- **TimingTab**: Uses new `summary.hourlyHeatmap` (24×7 matrix, byHour, byDay arrays in UTC) for heatmap, hourly chart, daily chart. Developer patterns section deferred to Phase 2.
- **ProjectsTab**: Uses new `summary.repoCommitCounts` for instant commit counts on cards.
- **DiscoverTab**: Retains loading spinner (needs per-commit stats — no summary fallback possible).
- **New aggregations**: Added `calcRepoCommitCounts()` and `calcHourlyHeatmap()` to `aggregate-processed.js`.
- **Component updates**: HealthWorkPatterns, RiskAssessment, DebtBalance handle optional click handlers gracefully (non-clickable when commits not yet loaded).

**Alternatives considered:**
- Keep spinners for all tabs: Rejected — summary already has the data, just needed mapping.
- Conditional hook calls with early returns: Rejected — violates React hooks rules. Fixed by always calling hooks unconditionally and using summary data for rendering when commits not loaded.

## 2026-03-03

### Tab Data Usage Audit — Filter Fallback, UTC Consistency, Nullish Coalescing

**Why:** Full review of all 10 dashboard tabs found three correctness bugs in how tabs use pre-aggregated data vs filtered commits: (1) filter fallback showing unfiltered summary data when all commits excluded, (2) `||` treating `0` as falsy for stats fields, (3) date grouping using local time instead of UTC (mismatching pre-aggregated keys).

**What:**
- **Filter fallback fix** — Changed `commitsLoaded && filteredCommits.length > 0` to `commitsLoaded` in SummaryTab, TimelineTab, ProgressTab. Previously, when user filters excluded all commits, the condition fell through to the pre-aggregated summary which is unfiltered — showing stale wrong numbers.
- **`||` → `??` in utils.js** — `getAdditions()`, `getDeletions()`, `getFilesChanged()` now use nullish coalescing (`??`) so that `0` values are not treated as falsy.
- **`||` → `??` in DiscoverTab** — 9 instances of `c.stats?.additions || 0` / `c.stats?.deletions || 0` changed to `??`.
- **UTC date helpers in dashboard** — Added `getUTCDateKey(timestamp)` and `getUTCMonthKey(timestamp)` to `dashboard/js/utils.js`. Applied in TimelineTab (daily chart, code changes chart, summary stats) and ProgressTab (feature/bugfix trend, complexity trend) to match UTC keys from `aggregate-processed.js`.

**Alternatives considered:**
- Add pre-aggregated fallbacks to all 6 tabs missing them: Deferred — requires timezone/work-hour config at build time for TimingTab, per-contributor aggregation for ContributorsTab. Documented for future work.
- Fix `substring(0, 10)` everywhere including useHealthData.js: Deferred — useHealthData has no pre-aggregated fallback, so no mismatch possible. Lower priority.

### Pipeline Audit — save-commit.js Validation + accumulateBucket Fix

**Why:** Full audit of extraction/processing/aggregation pipeline found that `save-commit.js` only checked for field presence (not value validity). This allowed invalid values like `impact: "infra"` or `complexity: 99` to be saved to processed data uncaught. Also found `accumulateBucket` used `||` operator for `stats.additions` fallback, which would incorrectly treat `0` as falsy.

**What:**
- **save-commit.js validation** — Added value validation for analysis fields: tags must be an array, complexity/urgency must be integer 1-5, impact must be one of `['internal', 'user-facing', 'infrastructure', 'api']`. Now matches the validation in `merge-analysis.js`.
- **accumulateBucket `??` operator** — Changed `commit.stats?.additions || commit.additions || 0` to `commit.stats?.additions ?? commit.additions ?? 0`. Prevents a commit with `stats.additions: 0` from incorrectly falling through to a top-level `additions` field.

**Alternatives considered:**
- Only fix in aggregation (map bad values): Rejected — fix should be at the input gate to prevent bad data from accumulating
- Require stats field in save-commit.js: Rejected — 431 existing commits lack stats (from legacy batch path). Would block legitimate data.

### Time-Windowed Data + Weekly/Daily Pre-Aggregation

**Why:** `data.json` was 2.9 MB (all 2,097 commits inline), causing slow initial dashboard load and exceeding PWA precache limits. Dashboard tabs iterated the full commits array on every render to compute chart data. Non-technical users experienced 3-5 second load times.

**What:**
- **Aggregation script redesign** — `scripts/aggregate-processed.js` now outputs:
  - Summary file (`data.json`, ~126 KB): metadata, pre-aggregated weekly/daily/monthly buckets, contributors, filter options, security events. No raw commits.
  - Per-month commit files (`data-commits/YYYY-MM.json`): raw commits grouped by month for lazy loading.
- **Shared bucket helpers** — Refactored monthly aggregation to use `createEmptyBucket()`/`accumulateBucket()`/`finalizeBucket()`. New weekly and daily functions share the same helpers (DRY).
- **Two-phase dashboard loading** — `App.jsx` loads summary first (fast paint), then lazy-loads all month files in background. Summary renders charts immediately via pre-aggregated data; commit files enable drilldowns/filters.
- **Pre-computed filter options** — `filterOptions` object in summary replaces per-commit iteration for FilterSidebar. Falls back to legacy computation for uploaded files.
- **Tab pre-aggregated rendering** — SummaryTab, TimelineTab, ProgressTab derive metrics from summary breakdowns before commits load. HealthTab/others render after commits arrive.
- **PWA caching** — Added `data-commits/*.json` runtime cache rule (NetworkFirst, 36 max entries)

**Alternatives considered:**
- Keep all commits in data.json: Rejected — 2.9 MB payload, slow initial load
- Split by repo instead of month: Rejected — month-based matches time-windowed UI pattern
- Aggregate only in dashboard: Rejected — moves computation to client, delays rendering
- Pre-compute filtered aggregations (excluding merges): Rejected — doubles data, complex to maintain

### Data Accuracy Fixes — UTC Consistency + Impact Alias

**Why:** Comprehensive verification of generated data files revealed two accuracy issues:
1. Daily/monthly aggregation used `substring(0, 10)` on timestamp strings (local time), while weekly used `new Date().getUTC*()` (UTC). This caused 62 commits with non-zero timezone offsets (e.g., `+02:00`) to land in different daily/monthly buckets than their weekly bucket. A commit at `2026-01-01T00:12+02:00` appeared in the "Jan 1" daily bucket but the "Dec 31" weekly bucket.
2. Two commits had `impact: "infra"` which was silently dropped by `calcImpactBreakdown` (only recognized the canonical `infrastructure` value), causing the impact sum to be 2095 instead of 2097.

**What:**
- **UTC date helpers** — Added `getUTCDateKey(timestamp)` and `getUTCMonthKey(timestamp)` that parse timestamps with `new Date()` and extract UTC components. Daily, monthly, and per-month file grouping all use these instead of `substring()`.
- **Impact alias mapping** — Added `infra → infrastructure` normalization in `calcImpactBreakdown`, `accumulateBucket`, contributor impact aggregation, and `calcFilterOptions`. Impact sum now correctly equals 2097.
- **Verification results** — 18/18 checks pass: all breakdown sums equal 2097, all aggregation levels (weekly/daily/monthly) match raw commit counts, per-month files align with monthly buckets, filterOptions are complete, per-repo totals consistent.

**Alternatives considered:**
- Use local time (substring) for all aggregation levels: Rejected — requires parsing timezone offsets manually for weekly ISO week calculation, complex and error-prone
- Leave the 62-commit discrepancy: Rejected — users could see inconsistent numbers between chart views

### Fix Partial Month Cliff on Trend Charts

**Why:** Monthly trend charts showed a misleading 95% drop for the current month (March 2026) because only 2 days of data (39 commits) were displayed at equal visual weight as full months (800+ commits). Non-technical users would interpret this as something going wrong.

**What:**
- **Added `excludeIncompleteLastMonth()` utility** to `dashboard/js/utils.js` — checks if the latest commit day in the last month is before the 15th; if so, excludes that month from trend chart data
- **Applied to `ProgressTab.jsx`** — Features vs Bug Fixes Over Time and Complexity Over Time charts
- **Applied to `useHealthData.js`** — Urgency Trend (which cascades to Impact Over Time via shared `sortedMonths`) and Debt Trend charts

**Alternatives considered:**
- Normalize to daily rate (commits per day) — Rejected: changes y-axis meaning, harder for non-technical users to interpret
- Show partial month with dashed line/annotation — Rejected: adds visual complexity, still misleading at first glance
- Use calendar "today" date to detect current month — Rejected: data.json is static, detection should be data-driven based on actual commit dates

### Documentation Review & Corrections

**Why:** Full codebase audit found documentation had drifted significantly from actual code — wrong tab counts, removed features still documented, incorrect data loading claims, and missing components/files.

**What:**
- **README.md** — Full rewrite: updated from 4 tabs to 6, added React/Vite/Tailwind stack info, replaced `open dashboard/index.html` with `npm run dev`, added complete project structure with all components/hooks/scripts
- **CLAUDE.md** — Updated tab count from 5→6 (added Projects), expanded components list (added ErrorBoundary, EmbedRenderer, HealthAnomalies, HealthBars, HealthWorkPatterns), added `js/hooks/` and `js/chartColors.js`, fixed extract-api.js description (uses curl, not untested), replaced legacy "container IDs" table with actual component routing
- **USER_GUIDE.md** — Removed Privacy Mode references (feature removed 2026-02-10), removed Share/PDF button references (never implemented in React), updated Summary Cards from "Files Changed/Contributors" to actual "Features Built/Bugs Fixed/Avg Urgency/% Planned", updated 18 Discover metric labels to match plain language names in code, added Projects tab section, fixed filter mode label "Inc/Exc"→"Include/Exclude", updated tips section
- **ADMIN_GUIDE.md** — Fixed auto-loading data (was claiming 3-step `../reports/*/data.json` → `./data.json` → upload; actual: `./data.json` only), replaced extensive GitHub CLI section with simpler token-based setup (extract-api.js uses curl since 2026-02-24), fixed static server section (was suggesting `python -m http.server` which won't work with ES modules)
- **SESSION_NOTES.md** — Corrected false claim about deleting `scripts/lib/manifest.js` (file is actively imported by 5 scripts), fixed "5-tab" → "6-tab", fixed "View Level in filter sidebar" → "in Settings"
- **AppContext.jsx** — Added full decision documentation comment (What/Why/Alternatives) to the split context pattern

**Alternatives considered:**
- Partial fixes only — Rejected: documentation drift compounds; better to fix all known issues in one pass
- Deleting stale sections without replacement — Rejected: users need accurate information, not gaps

## 2026-03-02

### Fix Dashboard JSON Loading Error on Vercel

**Why:** Dashboard on Vercel (including installed PWA) showed "Could not load dashboard data" with a JSON parse error. The Vercel SPA rewrite rule was catching `data.json` requests and returning `index.html` (HTML) instead. Additionally, `data.json` was not in `dashboard/public/` so Vite never included it in the build output, and was too large (2.68 MB) to precache via workbox.

**What:**
- **Fixed `vercel.json` rewrite rule** — Changed from `/((?!assets/).*)` to `/((?!assets/|.*\..+$).*)` so requests for files with extensions (`.json`, `.js`, `.css`, etc.) are not rewritten to `index.html`
- **Moved `data.json` to `dashboard/public/`** — Vite copies `public/` contents to `dist/` during build, so `data.json` is now included in the deployed output
- **Updated `aggregate-processed.js`** — Default output changed from `dashboard/` to `dashboard/public/` so future aggregation writes to the correct location
- **Improved error handling in `App.jsx`** — Added content-type check before JSON parsing (detects HTML-instead-of-JSON), and replaced raw error messages with user-friendly text per CLAUDE.md guidelines
- **Excluded `data.json` from PWA precache** — Removed from `globPatterns` (exceeded 2 MiB workbox limit), added `NetworkFirst` runtime caching rule instead
- **Updated documentation** — EXTRACTION_PLAYBOOK.md, ADMIN_GUIDE.md, SESSION_NOTES.md, update-all.sh path references

**Root cause:** The Vercel rewrite `/((?!assets/).*)` only excluded `assets/` paths. All other requests — including `data.json` — were rewritten to `/index.html`. The fetch received a 200 OK with HTML content, bypassing the 404 graceful fallback, and `.json()` threw a `SyntaxError`.

**Alternatives considered:**
- Only fix the rewrite rule (not move data.json) — Rejected: data.json still wouldn't be in the build output, so it would 404 even with a correct rewrite
- Add a Vite copy plugin — Rejected: unnecessary complexity when `public/` already handles static file copying
- Increase `maximumFileSizeToCacheInBytes` — Rejected: precaching 2.6MB+ of mutable data wastes bandwidth on every SW update

### Migrate Deployment from GitHub Pages to Vercel

**Why:** GitHub Pages has friction for SPAs: no native client-side routing support (requires `404.html` hack), no environment variable injection at build, and manual "source" setting in repo UI. Vercel handles SPA rewrites, env vars, and auto-deploy out of the box.

**What:**
- **Added `vercel.json`** — Build command, output directory, Vite framework hint, and SPA rewrite rule (all non-asset paths serve `index.html`)
- **Deleted `.github/workflows/deploy.yml`** — GitHub Actions deployment workflow no longer needed
- **Updated `vite.config.js`** — Changed `base` from `'./'` (relative, for GitHub Pages) to `'/'` (absolute, for Vercel root deployment)
- **Updated live URLs** — All references to `devmade-ai.github.io/repo-tor/` changed to `repo-tor.vercel.app/` across: CLAUDE.md, projects.json, embed.js, USER_GUIDE.md, ADMIN_GUIDE.md, EMBED_REFERENCE.md, EMBED_IMPLEMENTATION.md, SESSION_NOTES.md
- **Updated ADMIN_GUIDE.md** — Replaced GitHub Pages deployment section with Vercel setup instructions

**Alternatives considered:**
- Keep GitHub Pages with `404.html` hack — Rejected: fragile SPA routing, no env var support
- Netlify — Viable but Vercel has better Vite integration and is already used by other devmade-ai projects

**Files:** vercel.json (new), .github/workflows/deploy.yml (deleted), vite.config.js, dashboard/public/projects.json, dashboard/public/embed.js, CLAUDE.md, docs/SESSION_NOTES.md, docs/HISTORY.md, docs/ADMIN_GUIDE.md, docs/USER_GUIDE.md, docs/EMBED_REFERENCE.md, docs/EMBED_IMPLEMENTATION.md

---

## 2026-02-26

### Adopt Patterns from glow-props CLAUDE.md

**Why:** Cross-project review of glow-props CLAUDE.md identified reusable patterns for PWA robustness, timer leak prevention, icon generation, and commit metadata. Adopting these improves code quality and establishes a shared standard.

**What:**
- **CLAUDE.md** — Added Cross-Project References section with glow-props URL, adopted patterns list, and review date
- **PWA race condition fix** — Added inline `<script>` in index.html to capture `beforeinstallprompt` before module scripts load; pwa.js now consumes early-captured event on load (covers cached SW repeat visits)
- **Timer leak fixes** — App.jsx data fetch now uses AbortController (matches ProjectsTab.jsx pattern); toast timeout tracked in ref with cleanup on unmount
- **Commit-msg hook** — Now suggests all metadata footers (complexity, epic, semver) in addition to existing risk/debt hints; consolidated into single "Consider adding" tip
- **Icon generation pipeline** — Created `scripts/generate-icons.mjs` using Sharp to convert SVG source to all required PNG sizes; added `npm run generate-icons` script
- **Audit result** — Full React component audit found 12/14 patterns with proper cleanup; the 2 leaks are now fixed

**Files:** CLAUDE.md, dashboard/index.html, dashboard/js/pwa.js, dashboard/js/App.jsx, hooks/commit-msg, scripts/generate-icons.mjs, package.json, docs/

---

## 2026-02-25

### Feed the Chicken — 38 New Commits (Incremental)

**Why:** Incremental extraction to keep dashboard data current with latest repository activity.

**What:**
- Extracted 38 new commits via GitHub API across 3 repos: budgy-ting (+9), graphiki (+3), repo-tor (+26)
- AI-analyzed all commits in 4 batches, all human-approved
- Re-aggregated dashboard data: 14 repos, 1946 total commits (was 1908)

**Files:** processed/ commit files (38 new), dashboard/data.json, dashboard/repos/ (3 updated)

---

### Codebase Review Round 2 — UX, Accessibility, Code Quality (~17 Fixes)

**Why:** Second full codebase audit focused on user experience polish, accessibility compliance, code quality, and infrastructure improvements.

**UX improvements (7 items):**
- **FilterSidebar.jsx** — Changed cryptic "Inc"/"Exc" to "Include"/"Exclude" with descriptive title attributes
- **App.jsx** — Added upload success toast (commit count + repo count), improved error messages (SyntaxError vs generic)
- **HealthTab.jsx** — Replaced jargon urgency labels: "Planned (1-2)"→"Planned Work", "Normal (3)"→"Routine Work", "Reactive (4-5)"→"Urgent Fixes"
- **TimingTab.jsx** — Added color legend (green/amber/red dots) explaining work hours indicators
- **SecurityTab.jsx** — Added subtitle explaining security criteria for non-technical users
- **5 tabs** — Standardized empty state messages: "Nothing matches the current filters. Try adjusting your selections."

**Accessibility improvements (4 items):**
- **styles.css** — Added focus-visible outlines on all interactive elements (.tab-btn, .btn-icon, .collapsible-header, filter controls, role="button"/role="tab")
- **styles.css** — Added prefers-reduced-motion media query (suppresses animations)
- **styles.css** — Increased tag opacity from 0.2/0.3 to 0.3/0.5 for WCAG AA contrast
- **TabBar.jsx + styles.css** — Replaced hardcoded Tailwind border-blue-500/text-blue-600 with .tab-btn-active class using CSS variables

**Code quality improvements (3 items):**
- **main.jsx + ErrorBoundary.jsx + styles.css** — Moved inline styles to CSS classes (root-error-message, root-error-detail, root-error-hint, error-boundary-card)
- **state.js + TimingTab.jsx** — Extracted magic numbers into centralized THRESHOLDS constants
- **scripts/lib/manifest.js** — Deleted dead code (4 unused exports, no imports found anywhere)

**Infrastructure improvements (3 items):**
- **extract-api.js** — Fixed error handling: added error.code check alongside error.status for curl failures
- **vite.config.js** — Narrowed PWA glob patterns (excluded large data files from precache), disabled sourcemaps in production
- **Debug banner** — Investigated HTML sanitization, confirmed already safe (uses textContent throughout)

**Files:** 15 modified, 1 deleted

---

## 2026-02-24

### Comprehensive Codebase Review — 20 Issues Fixed

**Why:** Full codebase audit identified bugs, security issues, performance concerns, and code quality problems across dashboard components, scripts, and CSS.

**Dashboard fixes (12 files):**
- **TimelineTab.jsx** — Fixed render-time side effect: setState during render moved to useEffect (prevented potential infinite loop)
- **App.jsx** — Added 50MB file size validation on upload; fixed combineDatasets metadata merge (was overwriting, now deep-merges); replaced hardcoded inline styles with CSS classes
- **chartColors.js** — Added hex color validation for URL params; invalid values now silently ignored
- **TagsTab.jsx** — Moved module-level getComputedStyle into useLayoutEffect hook
- **AppContext.jsx** — Replaced silent catch with console.warn
- **DiscoverTab.jsx** — Fixed stale closure in handlePinToggle; replaced silent localStorage catches
- **ProjectsTab.jsx** — Added AbortController to fetch with cleanup on unmount
- **main.jsx** — Replaced hardcoded color inline styles in error boundary with CSS classes
- **utils.js** — Computed Easter algorithmically replacing hardcoded 2020-2030 table
- **state.js** — Extended anonymous names from 8 to 20
- **styles.css** — Removed 30+ `!important` overrides (Tailwind v4 layers make them unnecessary)
- **index.html** — Documented intentional duplicate @keyframes spin

**HealthTab decomposition (780 → 630 lines):**
- Extracted HealthBars.jsx (89 lines), HealthAnomalies.jsx (124 lines), HealthWorkPatterns.jsx (51 lines)

**Script fixes (6 files):**
- **update-all.sh** — Fixed command injection via sed → bash parameter substitution
- **extract-api.js** — Added API response validation and improved pagination handling
- **merge-analysis.js** — Added skip count tracking for invalid JSON lines
- **pending.js** — Added recovery logic for interrupted atomic renames
- **aggregate-processed.js** — Added unmapped author tracking with summary warning
- **extract.js** — Documented fallback code path; added warning for empty numstat

**Files:** 19 modified, 3 new components created

### Discover Metric Labels Clarified for Non-Technical Users

**Why:** Discover tab metric cards used developer jargon ("commit", "ratio", "refactor", "untagged") that violates the CLAUDE.md hard rule: "no jargon, technical terms, or developer-speak" for non-technical users.

**Changes:**
- Labels: "Avg Commit Size"→"Avg Change Size", "Deletion Ratio"→"Code Removed", "Feature:Bug Ratio"→"Features per Bug Fix", "Test Investment"→"Testing Effort", "Docs Investment"→"Documentation Effort", "Untagged Commits"→"Uncategorized Changes", "Breaking Changes"→"Major Updates", "Avg Files/Commit"→"Files per Change", "Single-File Commits"→"Focused Changes", "Refactor Work"→"Code Cleanup"
- Sub-text: Replaced all "commits" with "changes" (e.g., "5 test commits"→"5 test changes", "of commits"→"of all changes")
- Added descriptive sub-text where missing (e.g., "commits"→"changes that may affect users" for Major Updates)

**Files:** `dashboard/js/tabs/DiscoverTab.jsx`

### Section Reordering by Interest Level

**Why:** Sections within each tab were ordered structurally (stats first, then charts, then details) rather than by what a user would find most engaging. Stats/numbers are reference data — useful but not interesting. Charts, insights, and actionable breakdowns are what draw users in.

**Changes:**
- **SummaryTab**: Key Highlights → Activity Snapshot → Key Stats (insights/patterns first, raw counts last)
- **TimelineTab**: Commit Activity chart → Recent Changes → Lines Changed → Activity Summary (visual hook first, reference stats last)
- **TimingTab**: Commits by Hour → When Work Happens → Developer Patterns → Commits by Day (peak hours most interesting, "busiest day" least surprising)
- **ProgressTab**: Features vs Bug Fixes → Change Types → Work by Initiative → Complexity Over Time → Summary (main story first, niche detail and reference numbers last)
- **TagsTab**: Fixed CSS order bug — parent `div` used `order-*` classes without being a flex container. Changed `space-y-6` to `flex flex-col gap-6`. Chart shows first on desktop (visually engaging), list shows first on mobile (more scannable)
- **HealthTab**: Health Overview (anchor) → Risk Assessment → Tech Debt Balance → Prioritization → Impact → trend charts → per-person detail. Moved "red flag" sections (risk, debt) right after overview; trend charts and per-contributor breakdowns pushed to the end
- **DiscoverTab**: Swapped last two sections — Head to Head (visually engaging comparisons) now before Most Changed Files (niche file list)
- **ContributorsTab/SecurityTab**: No change needed

**Files:** `dashboard/js/tabs/SummaryTab.jsx`, `TimelineTab.jsx`, `TimingTab.jsx`, `ProgressTab.jsx`, `TagsTab.jsx`, `HealthTab.jsx`, `DiscoverTab.jsx`

### Mobile Tab Layout Improvements

**Why:** Dashboard tabs were too long and content-heavy on mobile. Charts at fixed 300px height took up too much vertical space, all sections expanded by default created excessive scrolling (especially HealthTab with 10 sections), and some section titles were unclear for non-technical users.

**Changes:**
- **All tabs**: Added descriptive subtitles to CollapsibleSection headers (hidden on mobile via CSS to save space, visible on desktop for context)
- **HealthTab**: Collapsed 7 of 10 sections on mobile (trends, risk, debt, per-contributor); improved titles ("How Work Gets Prioritized", "Where Changes Land"); reduced chart heights 300px→220px
- **TimelineTab**: Collapsed commit list and code changes chart on mobile; renamed sections ("Commit Activity", "Lines Changed", "Recent Changes"); reduced chart heights
- **TimingTab**: Collapsed Developer Patterns on mobile; renamed sections ("When Work Happens", "Commits by Hour/Day"); reduced chart heights 250px→200px
- **TagsTab**: Reordered — list shown first on mobile (more scannable), chart collapsed by default; reduced doughnut 350px→250px
- **ProgressTab**: Collapsed Complexity Over Time on mobile; reduced chart heights; added subtitles
- **ContributorsTab**: Collapsed complexity chart on mobile; added subtitles
- **DiscoverTab**: Improved metric card layout for narrow screens (truncating selector, responsive value size text-2xl vs text-3xl); tighter comparison labels (w-16 on mobile); renamed "File Insights"→"Most Changed Files", "Comparisons"→"Head to Head"
- **CSS**: Tighter section spacing on mobile (24px→16px gap), reduced header padding, subtitles hidden on mobile
- **Chart fonts**: All tabs bumped from 9px→10px minimum for mobile readability

**Files:** `dashboard/js/tabs/HealthTab.jsx`, `TimelineTab.jsx`, `TimingTab.jsx`, `TagsTab.jsx`, `ProgressTab.jsx`, `ContributorsTab.jsx`, `DiscoverTab.jsx`, `SummaryTab.jsx`, `dashboard/styles.css`

### Fix Projects Tab Loading Error in Production

**Why:** ProjectsTab fetched `./projects.json` at runtime, but the file was never copied to the `dist/` build output. It worked in dev mode (Vite serves from the root directory) but failed on GitHub Pages with "Could not load project list. The file may not be deployed yet."

**Root cause:** When the Projects tab was added, `projects.json` was placed in `dashboard/` alongside other data files, but was not added to the deploy workflow's copy step (`deploy.yml` lines 43-50). Unlike `data.json` and other data files which were listed there, `projects.json` was missed.

**Changes:**
- Moved `dashboard/projects.json` → `dashboard/public/projects.json` so Vite automatically includes it in build output (same pattern as `embed.js` and icons)
- Added explicit copy of `projects.json` in `.github/workflows/deploy.yml` as a safety net

**Files:** `dashboard/public/projects.json` (moved from `dashboard/`), `.github/workflows/deploy.yml`

### Fix TagsTab Initialization Crash (ReferenceError: Cannot access 'vf' before initialization)

**Why:** Production build crashed immediately on load. The minified error `Cannot access 'vf' before initialization` traced back to `TagsTab.jsx` line 13: `const CHART_TEXT_COLOR = CHART_TEXT_COLOR;` — a self-referential assignment that reads the variable during its own initialization (temporal dead zone). The intent was to read the `--text-secondary` CSS variable once at module load.

**Changes:**
- `TagsTab.jsx` — Replaced self-referential `const CHART_TEXT_COLOR = CHART_TEXT_COLOR` with `getComputedStyle(document.documentElement).getPropertyValue('--text-secondary').trim() || '#e5e7eb'`. Matches the same pattern used in `main.jsx` for Chart.js defaults.

**Files:** `dashboard/js/tabs/TagsTab.jsx`

### Move Debug Pill to HTML Level (Fix: Pill Not Showing During Loading Issues)

**Why:** Debug pill was created inside the JS bundle (`main.jsx`). If the bundle failed to load, parse, or execute (stale service worker cache, network error, JS runtime error), the debug pill never appeared — defeating its purpose. Users saw an infinite loading spinner with no way to diagnose the problem.

**Changes:**
- `index.html` — Added inline `<script>` that creates the debug pill and error capture at the HTML level, independent of the JS bundle. Features:
  - Circular buffer event store (200-entry max) for error logging
  - `window.onerror` and `unhandledrejection` listeners (work before bundle loads)
  - Clickable pill: "0 errors" (green) or "N errors" (red), expandable to diagnostics/error log
  - Copy and close actions via event delegation (`data-action` attributes)
  - 10-second loading timeout: warns user if React hasn't mounted yet
  - Exposes `window.__debugPushError()`, `window.__debugErrors`, `window.__debugClearLoadTimer()` for the bundle to enhance
  - Skipped in embed mode (`?embed=`)
- `main.jsx` — Removed ~170 lines of duplicate debug banner code. Now bridges to the HTML pill via `window.__debugPushError()` for React-specific errors (component stacks from `RootErrorBoundary`). Signals mount via `window.__debugClearLoadTimer()`.

**Files:** `dashboard/index.html`, `dashboard/js/main.jsx`

### Comprehensive Code Review & Bug Fixes (24 issues)

**Why:** Full project audit to identify and fix security vulnerabilities, performance bottlenecks, accessibility gaps, and code quality issues across all project files.

**Security fixes:**
- `main.jsx` — Replaced `innerHTML` with DOM API (`textContent`/`createElement`) to prevent XSS via error messages. Added event delegation on banner root instead of per-render `addEventListener` calls (eliminated listener leak).
- `extract-api.js` — Temp header file moved from predictable project-root path to `os.tmpdir()` with unique PID+timestamp suffix (prevents TOCTOU race condition).

**Performance fixes:**
- `extract.js` — Batched git stat extraction: single `git log --numstat` command replaces 2×N individual `git show` calls. For 1000 commits, this is ~2000× fewer process spawns.
- `extract-api.js` — Concurrent API fetching: 5-worker pool using async `execFile` + `pMap()` instead of sequential `execFileSync`. Reduces detail fetch time by ~5×.
- `TagsTab.jsx` — Moved `getComputedStyle()` call from inside `useMemo` (runs on every render) to module-level constant.

**Data integrity fixes:**
- `pending.js` — Atomic batch deletion: writes to temp dir, then renames. If interrupted mid-write, old data survives.
- `extract-api.js` — Fixed `filesChanged` calculation (was gated on `stats.total` which is additions+deletions sum, not file count). Added `repo_id` to security events. Added `branches`/`currentBranch` to metadata.

**Accessibility fixes:**
- `SummaryTab.jsx`, `ContributorsTab.jsx` — Added descriptive `aria-label` to all stat cards and contributor cards.
- `DropZone.jsx` — Added `aria-label` describing the upload action.
- `FilterSidebar.jsx` — Added `aria-label` to date filter inputs.
- `CollapsibleSection.jsx` — Added `aria-controls` linking header to content panel.
- Empty state messages standardized across all tabs to "No data matches the current filters".

**Code quality fixes:**
- `AppContext.jsx` — Silent `catch { /* ignore */ }` replaced with `console.warn` for localStorage quota errors.
- `pwa.js` — Silent `.catch(() => {})` replaced with `console.warn` logging.
- `SettingsPane.jsx` — Fixed stale closure: Escape handler now uses `dispatch` directly (stable ref) instead of capturing `handleClose`.
- `DropZone.jsx`, `FilterSidebar.jsx`, `SettingsPane.jsx` — Inline `style={{}}` objects moved to CSS classes per CLAUDE.md convention.
- `utils.js` — Easter dates extended from 2024-2027 to 2020-2030 to match `buildHolidaySet()` year range.
- `package.json` — Removed unused `sharp` devDependency.

**CSS/Config fixes:**
- `styles.css` — Defined missing `--shadow-lg` and `--color-primary-alpha` variables. Replaced `max-height: 2000px` cap on collapsible content with `max-height: none`.
- `vite.config.js` — Added `woff2` to PWA precache glob patterns.

**Files changed:** main.jsx, extract-api.js, extract.js, pending.js, TagsTab.jsx, AppContext.jsx, pwa.js, SettingsPane.jsx, CollapsibleSection.jsx, DropZone.jsx, FilterSidebar.jsx, SummaryTab.jsx, ContributorsTab.jsx, HealthTab.jsx, App.jsx, utils.js, state.js (via utils.js), styles.css, vite.config.js, package.json

---

### Show Commit Messages in Detail View

**Why:** Commit subjects were hidden behind `[message hidden]` text in all detail views. User wanted to see the actual commit messages.

**Changes:**
- Updated `sanitizeMessage()` in `utils.js` to return the full subject line instead of masking it
- Removed `[Details hidden]` text from SecurityTab commit list
- Applies to all view levels (Executive, Management, Developer)

**Files:**
- `dashboard/js/utils.js` — `sanitizeMessage()` now returns message as-is
- `dashboard/js/tabs/SecurityTab.jsx` — Removed `[Details hidden]` line

---

### Add New Repos and Projects Tab

**Why:** User requested adding all latest repos to the tracked list and creating a page to access all live projects from the dashboard.

**Changes:**
- Added `budgy-ting` (public) and `tool-till-tees` (private) to `config/repos.json` — discovered via GitHub API
- Created `dashboard/projects.json` with all 14 projects, live URLs (GitHub Pages/Vercel), repo URLs, and language info
- Created `dashboard/js/tabs/ProjectsTab.jsx` — fetches projects.json, enriches with commit counts from analytics data, splits into "Live Projects" and "Other Repositories" sections
- Added project card CSS to `dashboard/styles.css`
- Updated `dashboard/js/state.js` TAB_MAPPING, `dashboard/js/components/TabBar.jsx` TABS array, `dashboard/js/App.jsx` imports and render

**Files:**
- `config/repos.json`
- `dashboard/projects.json` (new)
- `dashboard/js/tabs/ProjectsTab.jsx` (new)
- `dashboard/styles.css`
- `dashboard/js/state.js`
- `dashboard/js/components/TabBar.jsx`
- `dashboard/js/App.jsx`

---

### Refactor extract-api.js — Remove gh CLI Dependency

**Why:** `extract-api.js` required `gh` CLI which is often not installed in CI/cloud environments. This caused AI sessions to fall back to cloning entire repos just to get git history, which is slow and wasteful. Also, the script only checked `GH_TOKEN` but the available env var was `GITHUB_ALL_REPO_TOKEN`.

**Changes:**
- Rewrote all GitHub API calls to use `curl` instead of `gh` CLI — curl is universally available and handles HTTP proxies correctly
- Added multi-token discovery: checks `GH_TOKEN`, `GITHUB_TOKEN`, `GITHUB_ALL_REPO_TOKEN` (in order)
- Updated `update-all.sh` to remove `gh` CLI check, replaced with token presence check
- Updated `docs/USER_ACTIONS.md` — removed gh CLI setup instructions (no longer needed)
- Updated `docs/ADMIN_GUIDE.md` — prerequisites now list token + curl instead of gh CLI
- Added AI lesson about cloning vs API and env var discovery

**Files:**
- `scripts/extract-api.js` — Rewritten HTTP layer
- `scripts/update-all.sh` — Removed gh CLI check
- `docs/USER_ACTIONS.md`
- `docs/ADMIN_GUIDE.md`
- `docs/AI_LESSONS.md`

---

### Feed the Chicken — 206 New Commits (7 repos)

**Why:** Incremental extraction to process new commits not yet analyzed across all tracked repositories.

**Changes:**
- Extracted git data from all 14 repos (clone-based, gh CLI unavailable)
- Generated 206 pending commits across 11 batches in 7 repos
- AI-analyzed all batches with human approval: glow-props (6), few-lap (16), budgy-ting (19), repo-tor (22), see-veo (41), tool-till-tees (39), graphiki (63)
- Merged via `scripts/merge-analysis.js`, re-aggregated via `scripts/aggregate-processed.js`
- Final totals: 14 repos, 1908 commits

**Files:**
- `processed/*/commits/*.json` — 206 new commit files across 7 repos
- `processed/*/manifest.json` — updated manifests for 7 repos
- `dashboard/data.json` — re-aggregated
- `dashboard/repos/*.json` — 16 files (14 repos + 2 new)

---

## 2026-02-19

### Embed Auto-Resize Helper Script

**Why:** The auto-height mechanism required embedders to write their own `postMessage` listener in JavaScript. This was documented but easy to miss — the iframe would load and show the chart, but the height wouldn't adjust because no listener was in place on the parent page.

**Changes:**
- Created `dashboard/public/embed.js` — standalone helper script (no dependencies, <1KB) that listens for `repo-tor:resize` messages and auto-sizes all repo-tor iframes on the page
- Updated `docs/EMBED_IMPLEMENTATION.md` — script-tag approach is now the primary method; manual listener moved to "Advanced" section; added `embed.js` to files table
- Updated `docs/EMBED_REFERENCE.md` — auto-height section now shows script-tag approach

**Files:**
- `dashboard/public/embed.js` (new)
- `docs/EMBED_IMPLEMENTATION.md`
- `docs/EMBED_REFERENCE.md`

---

### Fix Embed Resize Height Measurement

**Why:** The auto-height `postMessage` was using `document.documentElement.scrollHeight` to measure content height. This included elements outside the embed container (the `#heatmap-tooltip` div, `body` pseudo-elements), reporting incorrect heights to the parent iframe. Additionally, the initial height was posted immediately via `postHeight()` before Chart.js had finished its first `requestAnimationFrame`-based render, so the parent could receive a pre-chart height.

**Changes:**
- Changed height measurement from `document.documentElement.scrollHeight` to `container.scrollHeight` in `EmbedRenderer.jsx` — only measures the embed container itself
- Added `lastHeight` tracking to skip duplicate `postMessage` calls when height hasn't changed
- Replaced immediate `postHeight()` with `setTimeout(postHeight, 100)` to let Chart.js complete its initial render before measuring
- Added `clearTimeout` cleanup in the effect teardown

**Files:**
- `dashboard/js/components/EmbedRenderer.jsx`

---

### Custom Background Color for Embeds

**Why:** Embedded charts showed the dashboard's dark background (`#1B1B1B`) inside the iframe, clashing with light-themed or custom-themed embedding sites. Embedders had no way to change it.

**Changes:**
- Added `?bg=hex` URL parameter in `App.jsx` — overrides `--bg-primary` CSS variable (read by `body` and `.embed-mode` styles). Accepts hex values or `transparent`
- Added CSS rule to hide decorative `body::before` grid pattern in embed mode — prevents it from leaking through with `?bg=transparent`
- Updated `docs/EMBED_REFERENCE.md` with `bg` parameter in URL table and quick examples
- Updated `docs/EMBED_IMPLEMENTATION.md` with `bg` parameter, usage examples, How It Works step, and test cases

**Files:**
- `dashboard/js/App.jsx`
- `dashboard/styles.css`
- `docs/EMBED_REFERENCE.md`
- `docs/EMBED_IMPLEMENTATION.md`

---

### Auto-Height for Embed Mode

**Why:** Embedding apps had to guess an iframe `height` value. Charts vary in height depending on data, view level, and viewport width — a fixed height either clips content or wastes space.

**Changes:**
- Added `ResizeObserver` + `postMessage` to `EmbedRenderer.jsx` — posts `{ type: 'repo-tor:resize', height }` to parent window whenever content size changes
- Debounced via `requestAnimationFrame` to avoid flooding during chart animations
- Only activates when running inside an iframe (`window.parent !== window`)
- Updated `docs/EMBED_IMPLEMENTATION.md` with Auto-Height section (protocol, single/multi-iframe parent snippets, opt-out), security note, testing checklist items, and updated status/files
- Updated `docs/EMBED_REFERENCE.md` with Auto-Height quick-reference section

**Files:**
- `dashboard/js/components/EmbedRenderer.jsx`
- `docs/EMBED_IMPLEMENTATION.md`
- `docs/EMBED_REFERENCE.md`

---

## 2026-02-18

### Custom Graph Colors for Embeds

**Why:** Embedding apps need to match chart colors to their own brand. The dashboard's default blue palette doesn't suit every context. Hardcoded hex values were scattered across 6 tab files with no central control.

**Changes:**
- Created `dashboard/js/chartColors.js` — centralized color config with URL parameter parsing
- Added 4 new URL parameters: `palette`, `colors`, `accent`, `muted`
- Added 6 named palette presets (default, warm, cool, earth, vibrant, mono)
- Updated 5 tab components (TimelineTab, TimingTab, ProgressTab, ContributorsTab, HealthTab) to import from `chartColors.js`
- Updated heatmap CSS to use `--chart-accent-rgb` CSS variable (set from resolved accent color in main.jsx)
- Tag distribution doughnut colors remain semantic (green=feature, red=bugfix) — not overridden
- Updated `docs/EMBED_IMPLEMENTATION.md` with color architecture, parameters, palettes, testing checklist
- Updated `docs/EMBED_REFERENCE.md` with custom colors section, quick examples, and "what affects what" table

**Files:**
- `dashboard/js/chartColors.js` (new)
- `dashboard/js/main.jsx` (set --chart-accent-rgb CSS variable)
- `dashboard/styles.css` (heatmap classes use CSS variable)
- `dashboard/js/tabs/TimelineTab.jsx`, `TimingTab.jsx`, `ProgressTab.jsx`, `ContributorsTab.jsx`, `HealthTab.jsx`
- `docs/EMBED_IMPLEMENTATION.md`, `docs/EMBED_REFERENCE.md`

---

### Feed the Chicken — Incremental Extraction (156 new commits)

**Why:** New commits accumulated across 6 repos since last extraction. Incremental analysis keeps dashboard data current.

**Changes:**
- Extracted fresh git data from all 12 repos via `--clone` mode
- Generated pending batches: 156 new commits across 6 repos in 11 batches
- AI analyzed all batches with human review/approval
- Re-aggregated all 1,702 commits into dashboard JSON

**Repos updated:**
- canva-grid: +3 (332 total) — PWA fix, fill layout feature
- glow-props: +14 (15 total) — session-start hooks, CI, static hosting
- graphiki: +59 (65 total) — full product build (schema, query, import, analysis, PWA, conventions, UI refinement)
- repo-tor: +28 (393 total) — embed mode, PWA fix, metadata fields, extraction fixes, feed-the-chicken chores
- see-veo: +51 (68 total) — CV content/layout/skills, interest form, debug banner, email API, portfolio attribution
- synctone: +1 (359 total) — CLAUDE.md coding standards

---

### Implement Embed Mode

**Why:** With `data-embed-id` attributes in place (see below), the dashboard now needs to actually support rendering individual charts in isolation for iframe embedding. External apps should be able to use `?embed=activity-timeline` to get just that chart, with no dashboard chrome.

**Changes:**
- `dashboard/js/components/EmbedRenderer.jsx` — **New file** — Maps embed IDs to tab components, renders only needed tabs, uses `useLayoutEffect` to hide non-target CollapsibleSections via DOM traversal
- `dashboard/js/App.jsx` — Reads `?embed=` and `?theme=` query params; when embed mode active, renders `EmbedRenderer` instead of full dashboard; shows error state if data missing
- `dashboard/js/main.jsx` — Skips debug error banner creation in embed mode
- `dashboard/styles.css` — Added `.embed-mode` styles (transparent card backgrounds, hidden section headers, forced expanded content, error state styling, debug banner hiding)

**Design decisions:**
- DOM traversal (`closest('.card')`) to hide non-target sections rather than CSS `:has()` — more reliable across enterprise browser environments
- `useLayoutEffect` (not `useEffect`) to hide cards before paint — prevents flash of all charts before hiding
- Theme override via `?theme=light|dark` so embeds can match the consuming app's theme
- Multi-chart support via comma-separated IDs: `?embed=id1,id2` renders both in one iframe (single bundle load)
- Tab deduplication: if two requested charts are in the same tab, the tab renders only once
- Invalid IDs show a friendly error with link to EMBED_REFERENCE.md rather than blank iframe

---

### Enable Element Embedding (Groundwork)

**Why:** Need the ability to pull individual dashboard charts (e.g., activity timeline, tag distribution) into external apps like a CV site. This requires each chart to be individually addressable, plus documentation of what's available and how to implement the embed feature.

**Changes:**
- `dashboard/js/tabs/TimelineTab.jsx` — Added `data-embed-id` to `activity-timeline` and `code-changes-timeline` chart containers
- `dashboard/js/tabs/TimingTab.jsx` — Added `data-embed-id` to `activity-heatmap`, `hourly-distribution`, `daily-distribution`
- `dashboard/js/tabs/ProgressTab.jsx` — Added `data-embed-id` to `feature-vs-bugfix-trend`, `complexity-over-time`, `semver-distribution`
- `dashboard/js/tabs/ContributorsTab.jsx` — Added `data-embed-id` to `contributor-complexity`
- `dashboard/js/tabs/TagsTab.jsx` — Added `data-embed-id` to `tag-distribution`
- `dashboard/js/tabs/HealthTab.jsx` — Added `data-embed-id` to `urgency-trend`, `impact-over-time`, `debt-trend`
- `docs/EMBED_REFERENCE.md` — **New file** — Quick-reference catalog of all 13 embeddable elements
- `docs/EMBED_IMPLEMENTATION.md` — **New file** — Implementation plan for URL-based embed mode

**Design decisions:**
- Used `data-embed-id` (not `id`) to avoid collisions with any existing DOM IDs and to clearly signal these are for the embed system
- IDs use kebab-case matching the chart's purpose (e.g., `activity-timeline` not `timeline-bar-1`) for readability
- Chose iframe-based embed mode (Option 1) as simplest first step; Web Components documented as upgrade path
- No runtime changes yet — the `data-embed-id` attributes are passive (no JS reads them until embed mode is implemented)

---

## 2026-02-16

### Fix SW Update Interval Cleanup

**Why:** The hourly `setInterval` in `pwa.js` `onRegisteredSW` was created without storing its handle, making it impossible to clear. While the module-level execution means it only fires once (no React mount/unmount leak risk), storing the handle is defensive hygiene that enables cleanup if ever needed.

**Changes:**
- `dashboard/js/pwa.js` — Store `setInterval` return value in `updateInterval` variable; added `stopUpdatePolling()` export to clear the interval

**Design decisions:**
- Kept the fix in module-level JS rather than converting to a React hook — SW registration is a global singleton, not component-scoped
- `stopUpdatePolling()` exported but not currently called anywhere — available for future use (e.g., test teardown, manual pause)

---

## 2026-02-15

### Add Risk, Debt, Epic, Semver Fields (Full Pipeline)

**Why:** Commit metadata only tracked tags, complexity, urgency, and impact. Risk (how dangerous a change is), Debt (whether tech debt is accumulating), Epic (grouping commits to initiatives), and Semver (release type) provide richer reporting — enabling questions like "how much risky work happened this sprint" or "is tech debt growing."

**Changes:**
- `scripts/extract.js` + `scripts/extract-api.js` — Initialize `risk`, `debt`, `epic`, `semver` as `null` on raw commits
- `scripts/merge-analysis.js` — Validate optional fields (risk: low|medium|high, debt: added|paid|neutral, epic: string, semver: patch|minor|major); merge into commit objects when present
- `scripts/save-commit.js` — Validate optional fields when present (don't require them)
- `scripts/aggregate-processed.js` — Add `calcRiskBreakdown()`, `calcDebtBreakdown()`, `calcEpicBreakdown()`, `calcSemverBreakdown()`; include in summary, monthly, and contributor aggregations
- `dashboard/js/tabs/HealthTab.jsx` — Risk Assessment section (bars: high/medium/low), Debt Balance section (bars + net indicator), Debt Trend chart (monthly added vs paid)
- `dashboard/js/tabs/ProgressTab.jsx` — "Work by Initiative" (epic bars), "Change Types" (semver doughnut + detail)
- `dashboard/js/tabs/SummaryTab.jsx` — Risk and Debt highlights in Key Highlights (conditional)
- `hooks/commit-msg` — Added tips for risk/debt when tags footer is present
- `docs/COMMIT_CONVENTION.md` — Full documentation of all 4 new fields with examples
- `docs/EXTRACTION_PLAYBOOK.md` — Updated schema, review format, guidelines, validation, examples table

**Design decisions:**
- Fields are optional everywhere for backward compatibility (1163 existing commits have no data)
- Dashboard sections only render when data exists (conditional `hasRiskData`/`hasDebtData`/etc.)
- Epic is normalized to lowercase for consistent grouping

---

### Fix extract-api.js Missing Commits (Pagination Bug)

**Why:** GitHub API extraction was missing commits — 6 in canva-grid (all by `jacotheron87@gmail.com`) and 1 in model-pear (by `noreply@anthropic.com`). Root cause: `fetchCommitList()` used a manual `?page=N` loop calling `gh()` directly, bypassing the `ghApi()` helper that already supported `--paginate`. Manual pagination can miss commits when the API reorders results between page requests.

**Changes:**
- `scripts/extract-api.js` — Replaced manual pagination loop with single `ghApi(endpoint, { paginate: true })` call. The `gh` CLI's `--paginate` flag follows Link headers for reliable cursor-based traversal, eliminating page boundary gaps.

---

## 2026-02-13

### CLAUDE.md — Merge Development Standards

**Why:** The existing CLAUDE.md had strong project-specific documentation and AI session management but lacked explicit coding standards (best practices, code organization thresholds, cleanup rules, quality checks, UX guidelines, prohibitions). Merged a reference template of development standards to fill these gaps.

**Changes:**
- `CLAUDE.md` — Added 9 new sections from reference template:
  - **HARD RULES** at top: Before Making Changes, Best Practices (SOLID/DRY), Code Organization (line thresholds), Decision Documentation in Code (with project-specific example), User Experience (non-technical users, good/bad examples), Frontend: Styles and Scripts (adapted for React + Tailwind), Documentation, Cleanup, Quality Checks
  - **Project-Specific Configuration**: Paths, Stack, and Conventions filled in with actual project values
  - **Communication Style**: Direct, concise, no filler
  - **Testing**: Rules + note about no current test framework
  - **Prohibitions**: 12 "never" rules including 4 drawn from AI Lessons
  - Updated Principles #1, #3, #8 to cross-reference their expanded Hard Rules sections
  - Added cleanup check to Before Each Commit checklist
  - Trimmed AI Notes to 3 items (others now covered by Hard Rules/Prohibitions)

---

## 2026-02-11

### Fix Pie Chart Legend Text Color

**Why:** The tag distribution doughnut chart legend text was coloured to match each slice's background colour (e.g., green for "feature", red for "bugfix"), making labels hard to read against the dark background. Chart.js doughnut/pie defaults use segment colours for legend text when a custom `generateLabels` doesn't explicitly set `fontColor`.

**Changes:**
- `dashboard/js/tabs/TagsTab.jsx` — Added `color` to legend labels config and `fontColor` to each label returned by `generateLabels`, both reading `--text-secondary` CSS variable for theme consistency.

### Tab Renames & Discover UI Fixes

**Why:** Tab names didn't accurately describe their content. "Overview" was vague for a summary page. "Activity" could mean anything — the content is temporal (timeline charts, heatmaps, timing patterns). "Work" was too generic since every tab is about work — the content specifically decomposes data by type, person, and category. The Discover tab's first section had multiple UI issues: redundant title, accessibility violation (interactive button nested in interactive collapsible header), unlabeled pin buttons, and inconsistent select styling.

**Changes:**
- `dashboard/js/components/TabBar.jsx` — Tab labels renamed: Overview→Summary, Activity→Timeline, Work→Breakdown (internal IDs unchanged for backward compatibility)
- `dashboard/js/tabs/DiscoverTab.jsx` — Section title "Discover"→"Metrics". Shuffle button moved from CollapsibleSection subtitle to content area. Pin buttons given `aria-label`. Select dropdown restyled with `bg-themed-tertiary rounded` instead of `bg-transparent border-none`.
- `dashboard/js/tabs/ProgressTab.jsx` — "Work Summary" section renamed to "Summary" (avoid repeating tab name in section title)
- Updated docs: CLAUDE.md, USER_GUIDE.md, USER_TESTING.md, SESSION_NOTES.md

### Fix PWA Install Button Missing After Uninstall

**Why:** After uninstalling the PWA, the install button didn't reappear. The `appinstalled` event sets `localStorage.pwaInstalled = 'true'`, but nothing cleared it on uninstall. The `beforeinstallprompt` handler checked this stale flag and bailed out, suppressing the install prompt.

**Fix:** `beforeinstallprompt` is the browser's authoritative signal that the app is NOT installed. The handler now clears the stale `pwaInstalled` localStorage flag when this event fires, then proceeds normally to capture the prompt and show the install button. Also made `isInstalledPWA()` read live state instead of a one-time const.

**Changes:**
- `dashboard/js/pwa.js` — Removed `isPWAInstalled` const (was computed once at load, became stale). `beforeinstallprompt` handler now clears `localStorage.pwaInstalled` instead of checking it. `isInstalledPWA()` now reads `isStandalone` and localStorage live.

### Sticky Tabs & Filter Button Relocation

**Why:** The tab bar scrolled out of view on long pages, making tab navigation inconvenient. The filter toggle button was awkwardly placed inside the tab bar — filters are a global action that affects all tabs, not a tab navigation concern.

**Changes:**
- `dashboard/js/App.jsx` — Moved `<TabBar />` above the `max-w-7xl` container so it sits at the top level, allowing the sticky background to span full viewport width.
- `dashboard/js/components/TabBar.jsx` — Removed the filter toggle button. Added inner `max-w-7xl` container to align tab buttons with page content. Simplified to only tab navigation concerns.
- `dashboard/js/components/Header.jsx` — Added filter toggle button (with badge) next to the settings gear. Filters now live alongside other global controls (install, update, settings).
- `dashboard/styles.css` — Removed negative margin/padding hack from `.tabs-bar` (no longer needed since it's full-width at top level). Sticky positioning preserved.

### Eliminate PWA Event Race Condition

**Why:** Header's `useEffect` event listeners could miss `pwa-install-ready` or `pwa-update-available` events if they fired before React mounted. The static import fix made this unlikely but not impossible — the race still existed in theory between module-level code execution and React's first useEffect run.

**Fix:** `pwa.js` now tracks its own state with `_installReady` and `_updateAvailable` booleans, updated whenever events fire. A new `getPWAState()` export returns the current values. Header calls this on mount to seed its local state, with event listeners still handling subsequent changes. No globals, no hacks — just a getter function.

**Changes:**
- `dashboard/js/pwa.js` — Added `_installReady`/`_updateAvailable` state booleans, exported `getPWAState()`. State updated in `beforeinstallprompt`, `appinstalled`, `onNeedRefresh`, and `checkForUpdate`.
- `dashboard/js/components/Header.jsx` — Imported `getPWAState`, calls it at the start of the PWA useEffect to seed `installReady`/`updateAvailable` state.

### Fix Install Button Not Appearing

**Why:** `pwa.js` was dynamically imported in a `useEffect` — it loaded after React rendered, so `beforeinstallprompt` could fire before the listener existed. The prompt was lost and the install button never appeared.

**Fix:** Static `import './pwa.js'` in `main.jsx`. Module loads synchronously with everything else, listener is ready before the browser fires the event. No race condition.

**Changes:**
- `dashboard/js/main.jsx` — Static import of `pwa.js` (replaces early-capture hack)
- `dashboard/js/App.jsx` — Removed dynamic `import('./pwa.js')` useEffect
- `dashboard/js/components/Header.jsx` — Static import of `installPWA`/`applyUpdate` from pwa.js (replaces dynamic imports)
- `dashboard/js/pwa.js` — Reverted to clean state (no global variable sync)

### Interactive Debug Banner

**Why:** The "0 errors" debug pill was non-interactive — clicking it did nothing. A debug banner should always provide useful info.

**Changes:**
- `dashboard/js/main.jsx` — Clicking the "0 errors" pill now expands to a diagnostics panel showing: SW support, SW controller status, standalone mode, PWA install state, install prompt status, error count, and user agent. Has Copy and Close buttons.

### Fix Missing UI Elements (Post-Migration)

**Why:** Several UI elements were lost during the React migration: (1) the debug error banner was hidden by default (display:none until first error), so users couldn't see it existed; (2) the Install and Update PWA buttons were never ported from vanilla JS to the React Header component — only the Settings gear button remained; (3) multi-component tabs (Activity, Work, Health) had no spacing between their sub-components because React fragments don't add layout; (4) Chart.js legend text was invisible on dark background because Chart.defaults.color was never set (defaulted to #666 instead of reading --text-secondary).

**Changes:**
- `dashboard/js/main.jsx` — Debug banner now creates eagerly on page load and always shows: a small green "0 errors" pill in the bottom-right when clean, expanding to the full red error log when errors occur. Also added `Chart.defaults.color` and `Chart.defaults.borderColor` read from CSS variables for proper dark theme support.
- `dashboard/js/components/Header.jsx` — Restored Install and Update buttons. Listens for `pwa-install-ready`, `pwa-installed`, and `pwa-update-available` custom events from pwa.js. Install button triggers native prompt (Chromium) or falls back to opening Settings. Update button applies pending SW update. Buttons use existing `btn-icon` / `btn-primary` / `btn-secondary` CSS. Added `flex-wrap` for mobile.
- `dashboard/js/App.jsx` — Wrapped multi-component tab content in `<div className="space-y-6">` instead of bare fragments, so there's consistent 24px spacing between TimelineTab/TimingTab, ProgressTab/ContributorsTab/TagsTab, and HealthTab/SecurityTab.

### Debug Error Banner

**Why:** Diagnosing dashboard issues required users to open browser dev tools to see error messages. Added a visible error banner that captures all errors and lets users copy-paste them for bug reports.

**Changes:**
- `dashboard/js/main.jsx` — Added global error capture (`window.onerror`, `unhandledrejection`) and a fixed-position red banner at the bottom of the screen. Shows error messages with timestamps, has "Copy" and "Close" buttons. Works independently of React (vanilla DOM). `RootErrorBoundary.componentDidCatch` now feeds errors into the banner with component stack traces.

### Force Fresh JS/CSS on Pull-to-Refresh

**Why:** PWA served cached JS/CSS on pull-to-refresh even after a new build was deployed. Users had to manually click "Update" in settings or wait for the hourly check.

**Changes:**
- `vite.config.js` — Added `skipWaiting: true` + `clientsClaim: true` to workbox config so new service workers activate immediately instead of waiting.
- `dashboard/js/pwa.js` — Added `controllerchange` listener that reloads the page when a new SW takes control, ensuring the reload picks up fresh assets.

### Fix Dashboard Null Metadata Crash

**Why:** Dashboard crashed on load with "Cannot read properties of null (reading 'metadata')". The `RootErrorBoundary` caught it and showed "Something went wrong loading the dashboard." The root cause was a timing issue: in `AppContext.jsx`, the global state sync (`globalState.data = state.data`) ran after the `useMemo` hooks that depend on it. When `LOAD_DATA` triggered a re-render, `filterOptions` useMemo called `getAuthorEmail()`, which read `globalState.data.metadata` — but `globalState.data` was still `null` from the previous render.

**Changes:**
- `dashboard/js/AppContext.jsx` — Moved global state sync to run before all `useMemo` hooks so utility functions always see current data.
- `dashboard/js/utils.js` — Added defensive optional chaining (`state.data?.metadata`) in `getAuthorName` and `getAuthorEmail` as a safety net.

### Fix Loading Indicator Flash & Black Screen

**Why:** After the previous loading indicator fix, users saw the loading indicator flash briefly before the screen went black again. Root causes: (1) data loading errors were silently swallowed — `.catch(() => {})` hid real failures (network errors, JSON parse errors, CORS issues), leaving users with an invisible DropZone on a dark background; (2) no visual transition between loading and content states; (3) PWA import error not properly caught (try/catch on a promise); (4) DropZone was too subtle on dark background when shown as fallback.

**Changes:**
- `dashboard/js/App.jsx` — Proper error handling: only 404 is silently ignored (expected when no data file), all other errors show a visible error card with retry button. Added `dashboard-enter` fade-in class to both dashboard and no-data states. Fixed PWA import to properly handle promise rejection.
- `dashboard/styles.css` — Added `dashboard-enter` fade-in animation (0.3s ease-out) for smooth loading-to-content transition.
- `dashboard/js/components/DropZone.jsx` — Added title heading and vertical centering so the DropZone is clearly visible when no data is loaded.

### Fix Black Screen — Loading Feedback & Error Recovery

**Why:** Users could see a black screen with no feedback if: (1) React failed to mount or crashed during render, (2) the loading spinner was too subtle to notice (thin 2px border on dark background), or (3) JavaScript failed to load entirely.

**Changes:**
- `dashboard/index.html` — Added HTML-level loading indicator inside `#root` (spinner + "Loading dashboard..." text + noscript fallback). Visible immediately before JS loads; replaced when React mounts.
- `dashboard/js/main.jsx` — Added `RootErrorBoundary` wrapping the entire app. Catches any unhandled React error and shows an error message with reload button instead of a blank screen.
- `dashboard/js/App.jsx` — Improved React loading state: thicker spinner border (3px), added "Loading dashboard..." text below spinner.

## 2026-02-10

### Fix DropZone Flash on Pull-to-Refresh

**Why:** Pull-to-refresh briefly flashed the "Drop JSON here" DropZone before data loaded, because `state.data` starts as `null` and the `data.json` fetch runs in a `useEffect` (after first render).

**Changes:**
- `dashboard/js/App.jsx` — Added `initialLoading` state; shows centered spinner (reuses existing `.loading-spinner` CSS) until initial fetch completes, then shows dashboard or DropZone

### Fix PWA White Screen — Missing CSS Import

**Why:** React migration removed `<link rel="stylesheet" href="./styles.css">` from `index.html` but never added a JS import in `main.jsx`. The build produced no CSS file, causing white text on white background (dark theme colors undefined).

**Changes:**
- `dashboard/js/main.jsx` — Added `import '../styles.css'` so Vite includes CSS in the build
- Build: 59 modules, 475KB JS + 47KB CSS, 14 precache entries

### React Migration Fixes (Final 7)

**Why:** Completed all remaining post-migration issues (22/22 done).

**Changes:**
- `dashboard/js/components/FilterSidebar.jsx` — Added `aria-expanded`, `aria-haspopup="listbox"`, `role="listbox"`, `role="option"`, `aria-selected`, `aria-pressed` on mode toggles, Escape to close dropdown
- `dashboard/js/hooks/useFocusTrap.js` — New shared hook: traps Tab/Shift+Tab within a container, auto-focuses first element
- `dashboard/js/components/DetailPane.jsx` — Added focus trap ref, removed body overflow management (centralized)
- `dashboard/js/components/SettingsPane.jsx` — Added focus trap ref
- `dashboard/js/App.jsx` — Centralized body overflow: single useEffect watches both `detailPane.open` and `settingsPaneOpen`
- `dashboard/js/AppContext.jsx` — Replaced async `useEffect` global state sync with synchronous inline assignment (eliminates one-frame lag)
- `dashboard/js/tabs/DiscoverTab.jsx` — Moved `fileNameCache` from module-level to `useRef` (GC'd on unmount, no unbounded growth)
- Build: 58 modules, 475KB bundle

### React Migration Fixes (First 15)

**Why:** Fixed 15 of 22 issues identified during post-migration review.

**Changes:**
- Deleted 17 vanilla JS files: `main.js`, `filters.js`, `ui.js`, `export.js`, `data.js`, `tabs.js`, `tabs/*.js`
- `dashboard/js/pwa.js` — Rewrote: removed `ui.js` import, replaced DOM manipulation with custom events
- `dashboard/js/charts.js` — Removed `filters.js` import and vanilla render functions; only exports pure data functions
- `dashboard/js/components/ErrorBoundary.jsx` — New error boundary component
- `dashboard/js/App.jsx` — Wrapped tab content with ErrorBoundary, removed unused isDragOver state
- `dashboard/js/AppContext.jsx` — isMobile now tracks window resize via debounced state
- `dashboard/js/utils.js` — Added `getTagStyleObject()` returning React-compatible style objects
- `dashboard/js/components/DetailPane.jsx` — Removed escapeHtml/parseInlineStyle, added dialog role, Escape key, aria-label
- `dashboard/js/components/SettingsPane.jsx` — Added dialog role, Escape key, aria-label, role/tabIndex on toggles
- `dashboard/js/components/TabBar.jsx` — Added role="tablist"/role="tab"/aria-selected, removed data-tab
- `dashboard/js/components/CollapsibleSection.jsx` — Added role="button"/tabIndex/keyboard, removed data-section
- `dashboard/js/components/Header.jsx` — aria-label on settings button
- `dashboard/js/tabs/TimelineTab.jsx`, `ContributorsTab.jsx`, `TagsTab.jsx` — Removed escapeHtml import, parseInlineStyle, use getTagStyleObject
- `dashboard/js/tabs/TimingTab.jsx`, `SecurityTab.jsx`, `HealthTab.jsx` — Removed escapeHtml import
- `dashboard/js/tabs/SummaryTab.jsx` — Removed data-summary-card, fixed index keys
- `dashboard/js/tabs/ProgressTab.jsx` — Removed data-work-card
- `dashboard/js/tabs/DiscoverTab.jsx` — Fixed index keys on metric cards and comparisons
- Build: 70 → 57 modules transformed

### React Migration Review

**Why:** Post-migration review to catch issues missed during the React migration.

**Findings:** 22 issues identified across critical (5), functional (5), accessibility (6), and code quality (6) categories. All documented in TODO.md.

### React + Tailwind Migration

**Why:** Migrated dashboard from vanilla JS to React for declarative rendering, component isolation, and better developer ergonomics.

**Changes:**
- `vite.config.js` — Added @vitejs/plugin-react
- `package.json` — Added react, react-dom, react-chartjs-2, @vitejs/plugin-react
- `dashboard/index.html` — Simplified to root div + script tag (was 880 lines)
- `dashboard/js/main.jsx` — New React entry point with Chart.js registration
- `dashboard/js/AppContext.jsx` — React Context + useReducer state management
- `dashboard/js/App.jsx` — Main app component with data loading and tab routing
- `dashboard/js/components/` — 7 shared components (Header, TabBar, DropZone, FilterSidebar, DetailPane, SettingsPane, CollapsibleSection)
- `dashboard/js/tabs/*.jsx` — 9 tab components (Summary, Timeline, Timing, Progress, Contributors, Tags, Health, Security, Discover)

**Architecture:**
- State: AppContext with useReducer (replaces mutable global state object)
- Charts: react-chartjs-2 declarative components (replaces manual destroy/recreate)
- Events: React onClick props (replaces delegated-handlers.js)
- Filters: Controlled React components
- Compatibility: useEffect syncs React state → global state object so utils.js works unchanged

---

### Docs: React + Tailwind Migration Analysis

**Why:** Initial effort assessment before implementation.

---

### Fix: Default Filter Indicator on Load

**Why:** When default filters were applied on first visit (exclude merge, date from 2025-12-01), the filter indicator ("X of Y") and badge didn't show in the UI, giving no visual feedback that filters were active.

**Changes:**
- `dashboard/js/filters.js` — `updateFilterIndicator()` now shows the indicator whenever any filter is active, removing the `filtered.length !== total` gate that suppressed it when defaults didn't reduce the commit count.

---

### Remove: Privacy Mode Toggle (Always-On Sanitization)

**Why:** Filenames should never be revealed. The privacy toggle allowed users to disable sanitization, which conflicts with the tool's design goal. Sanitization (anonymized names and messages) should always be active.

**Changes:**
- `dashboard/index.html` — Removed `btn-sanitize` button (eye icon) from header and `settings-privacy-toggle` from Settings panel.
- `dashboard/js/utils.js` — `sanitizeName()` and `sanitizeMessage()` now always anonymize (removed `if (!state.isSanitized) return` guards).
- `dashboard/js/state.js` — Removed `isSanitized` property.
- `dashboard/js/ui.js` — Removed `initSanitizeMode()`, `applySanitizeMode()`, `toggleSanitizeMode()` functions and privacy toggle handler from `setupSettingsPanel()`. Cleaned up imports.
- `dashboard/js/main.js` — Removed `initSanitizeMode` import and call.
- `dashboard/js/export.js` — Removed `toggleSanitizeMode` import and `btn-sanitize` event listener.
- `dashboard/js/tabs/security.js` — Commit body details always show `[Details hidden]`.

**Impact:** Build reduced from ~112KB to ~111KB. Privacy is now enforced at the code level with no user override.

---

### Docs: Architecture Decision Record — Vanilla JS

**Why:** No documented rationale existed for choosing vanilla JS over a framework. Future contributors need to understand the reasoning and know when to reconsider.

**Changes:**
- `docs/ADR-001-vanilla-js.md` — **New.** Explains the decision, trade-offs accepted, mitigations (template helpers, event delegation, module split), and criteria for when to adopt a framework.

---

### Refactor: Template Helpers, Event Delegation, tabs.js Split

**Why:** The dashboard had three code organization pain points: (1) duplicated HTML template patterns for urgency/impact bars across 3 view levels each, (2) remaining `addEventListener` with init flags and `setTimeout` workarounds that weren't yet migrated to delegation, (3) a 2,100-line monolithic `tabs.js` file.

**Changes:**
- `dashboard/js/utils.js` — Added `renderUrgencyBar()`, `renderImpactBar()`, `renderStatCard()` template helpers. Each replaces 15-25 lines of duplicated HTML string building.
- `dashboard/js/tabs.js` — Now a thin re-export barrel from `./tabs/index.js`. All existing imports from `./tabs.js` continue to work unchanged.
- `dashboard/js/tabs/` — **New directory.** 10 focused modules + barrel:
  - `timeline.js`, `progress.js`, `contributors.js`, `security.js`, `health.js`, `tags.js`, `timing.js`, `summary.js`, `discover.js`, `delegated-handlers.js`, `index.js`
- `dashboard/js/tabs/delegated-handlers.js` — `setupDelegatedHandlers()` now handles ALL click delegation: activity cards, work cards, health cards, summary cards, period cards, security repo, load-more button, plus all previously-delegated urgency/impact/tag/contributor/repo handlers.
- `dashboard/js/state.js` — Removed 4 handler initialization flags (no longer needed).

**Impact:** Build output unchanged (112KB gzipped ~29KB). 27 modules transformed (up from 16). No functional changes — pure code organization.

---

### Refactor: PWA Rewrite — Dedicated Module with Prompt-Based Updates

**Why:** Previous PWA implementation (autoUpdate + injectRegister:'script' in export.js) was unreliable. Rewrote to match a proven working pattern from another project, adapted to vanilla JS.

**Changes:**
- `dashboard/js/pwa.js` — **New module.** Install flow with `beforeinstallprompt` for Chromium + `getInstallInstructions()` fallback modal for Safari/Firefox. Update flow uses `virtual:pwa-register` with `registerType:'prompt'` for explicit SW activation control. Hourly update polling via `setInterval`. Green "Update" button in header when update is available. `visibilitychange` listener for passive update checks.
- `dashboard/js/export.js` — Removed all PWA code (install prompt, update checks, SW listeners).
- `dashboard/js/main.js` — Imports `installPWA`, `checkForUpdate`, `applyUpdate` from pwa.js instead of export.js.
- `vite.config.js` — Changed `registerType` from `'autoUpdate'` to `'prompt'`, removed `injectRegister: 'script'`.
- `dashboard/index.html` — Added green "Update" button in header (hidden by default, shown when update detected). Updated Settings panel update text.

---

### Fix: PWA Install Button, Default Filters, Filter Alignment

**Why:** Three UI bugs: (1) PWA install button still visible after installing the app because installed state wasn't persisted across sessions, (2) default date filters were overwritten by `applyUrlState()` even when no URL params existed, (3) filter dropdown checkboxes and text were misaligned due to missing flex-shrink and sizing on checkboxes.

**Changes:**
- `dashboard/js/export.js` — Persist PWA installed state in localStorage (`pwaInstalled`). Check both localStorage and `display-mode: standalone` media query. Guard `beforeinstallprompt` against both. Fix `applyUrlState()` to only set date filters when URL params actually contain date values.
- `dashboard/styles.css` — Add `flex-shrink: 0`, explicit `width`/`height` (14px), and `line-height` to filter dropdown options for consistent checkbox/text alignment.

---

### Feature: Default Filters (Exclude Merges, Date from Dec 2025)

**Why:** First-time visitors saw all data including merge commits and old history. Sensible defaults provide a better out-of-box experience while still being overridable.

**Changes:**
- `dashboard/js/state.js` — Added `FILTER_DEFAULTS` config: tag exclude `merge`, dateFrom `2025-12-01`
- `dashboard/js/filters.js` — Added `applyDefaultFilters()` that sets state + updates UI (checkboxes, mode toggles, date inputs)
- `dashboard/js/data.js` — Calls `applyDefaultFilters()` when no localStorage and no URL params exist

**Behavior:** Defaults only apply on first visit. Once the user changes any filter, their choices are saved to localStorage and used on subsequent visits. URL params also override defaults.

---

## 2026-02-09

### Fix: PWA Install Button Visible in Standalone Mode + Mobile Button Wrapping

**Why:** The install button could appear when running as an installed PWA because the standalone detection only updated status text without hiding the button or guarding the `beforeinstallprompt` handler. Header buttons also overflowed on mobile due to missing `flex-wrap`.

**Changes:**
- `dashboard/js/export.js` — Added `isStandalone` flag checked at module load. `beforeinstallprompt` handler now returns early in standalone mode. Standalone detection now calls `hidePWAInstallButton()` and hides the entire PWA settings section.
- `dashboard/index.html` — Added `flex-wrap` to `#export-buttons` container so buttons wrap on narrow screens.

---

### Fix: PWA Pull-to-Refresh Not Updating to Latest Version

Pull-to-refresh and page reload now properly update the PWA to the latest version.

**Why:** With `registerType: 'autoUpdate'`, the service worker calls `skipWaiting()` on install and takes control automatically. But the page loaded from the old cache was never told to reload when the new SW took over. Users had to fully close and reopen the app to see updates — pull-to-refresh served stale cached content.

**Changes:**
- `dashboard/js/export.js` — Added `controllerchange` listener that auto-reloads the page when a new service worker takes control. This is the key fix: when the new SW activates (even mid-session), the page reloads to get fresh content from the new cache.
- `dashboard/js/export.js` — Added `visibilitychange` listener to trigger SW update checks when the user returns to the app (e.g., switching from another app). This ensures updates are detected sooner.
- `dashboard/js/export.js` — Updated `checkForUpdate()` to show "Reloading..." and auto-reload instead of telling users to "close and reopen."
- `dashboard/index.html` — Updated Settings panel update description to say "Pull to refresh or reload" instead of "Close and reopen."

---

### Improve: Mobile-Optimized Charts and Graphs

All charts, heatmaps, and graph containers optimized for mobile viewports.

**Why:** Fixed-height chart containers, large heatmap cells, and desktop-sized Chart.js fonts made graphs hard to read on mobile devices. Charts were either clipped, overflowed, or had overlapping labels on small screens.

**Chart containers (index.html):**
- 8 charts changed from fixed `h-64`/`h-80`/`h-48` to responsive heights: `h-48 md:h-64`, `h-56 md:h-80`, `h-40 md:h-48`

**Heatmap (styles.css):**
- Grid: `min-width` reduced from 400px to 280px on mobile, label column from 50px to 36px
- Cells: `min-width`/`min-height` reduced from 28px to 20px on mobile
- Labels and headers: font-size 9px on mobile, 11px on desktop

**Chart.js instances (charts.js, tabs.js):**
- All 10 charts now use `isMobile()` helper from `state.js` for responsive options
- Tick/axis font sizes: 9px on mobile, 12px on desktop
- Legend labels: smaller box widths (8px) and font sizes (9px) on mobile
- X-axis rotation: 60deg on mobile (vs 45deg) for tighter label fit
- Label skip frequency increased on mobile (show fewer labels to prevent overlap)
- Doughnut legend: tighter padding and smaller font on mobile

**Card layout (styles.css):**
- Card padding: 16px on mobile (vs 24px desktop)
- Stat numbers: 1.5rem on mobile (vs default 1.875rem)

---

### Improve: Complete UI/UX Backlog — 9 Items

Completed all remaining UI/UX improvements from the 2026-02-07 review.

**Why:** The initial review identified 21 issues and fixed 10. This batch addresses the remaining 9 actionable items (file anonymization kept as-is by design) covering usability, performance, accessibility, and build quality.

**Usability:**
- `index.html` — Tab buttons renamed from "Breakdown"/"Risk" to "Work"/"Health" to match TAB_MAPPING keys and docs
- `index.html` — Filter mode toggles now say "Include"/"Exclude" instead of cryptic "Inc"/"Exc"
- `tabs.js` — Changes list has "Load more" button (100 at a time) instead of hard 100 cap

**Performance:**
- `filters.js` — `applyFilters()` now only renders the active tab; others marked dirty and re-rendered on switch via `state.activeTab`/`state.dirtyTabs`
- `tabs.js` — Replaced per-render `addEventListener` calls with single delegated click handler on `#dashboard` (`setupDelegatedHandlers()`) — eliminates listener accumulation across re-renders

**Accessibility:**
- `charts.js`, `main.js`, `styles.css` — Replaced native `title` heatmap tooltips with custom floating tooltip (instant on mouse, works on touch with 2s display)
- `filters.js` — Multi-select dropdowns now keyboard navigable: Enter/Space opens, Arrow Up/Down navigates options, Escape closes
- `tabs.js` — Added percentage text labels below all stacked urgency/impact bars (mgmt + dev views) for color-blind accessibility

**Build:**
- `vite.config.js`, `package.json`, `styles.css`, `index.html` — Migrated from CDN Tailwind (`cdn.tailwindcss.com` script) to build-time Tailwind v4 via `@tailwindcss/vite` plugin. Removed CDN script tag and runtime caching rule. Added `@import "tailwindcss"` and `@custom-variant dark` for class-based dark mode.

---

## 2026-02-07

### Fix: UI/UX Review — Bugs, Usability, and Accessibility

Comprehensive UI/UX review identified 21 issues. Fixed the 10 most impactful.

**Why:** Several bugs caused incorrect visual state (filter badge always visible, PDF always showing "Filtered view"), toast notifications destroyed their own DOM element, and the detail pane had an unnecessary 150ms skeleton delay. The file upload was a bare `<input>`, collapsible sections weren't keyboard accessible, and icon buttons lacked screen reader labels.

**Bug Fixes:**
- `filters.js` — `updateFilterBadge()` checked `state.filters.tag` (always-truthy object) instead of `state.filters.tag.values.length > 0`
- `export.js` — `hasActiveFilters()` had the same truthy-object bug, making PDF export always say "Filtered view"
- `ui.js` — `showToast()` removed the static `#toast` element from DOM on first call; now reuses it
- `ui.js` — Removed duplicate `updateFilterBadge()` definition (canonical version is in `filters.js`)
- `ui.js` — Removed artificial 150ms `setTimeout` delay in `openDetailPane()` (data is already in memory)

**UX Improvements:**
- `index.html`, `styles.css`, `main.js` — Replaced bare file input with styled drag-and-drop drop zone
- `filters.js`, `styles.css` — Filter badge now shows active filter count (number) instead of 8px dot
- `filters.js`, `styles.css` — Quick-select date preset buttons show `.active` state when selected

**Accessibility:**
- `ui.js` — Collapsible headers now have `tabindex="0"`, `role="button"`, and keyboard handlers (Enter/Space)
- `index.html` — Added `aria-label` to 6 icon-only buttons (settings, privacy, share, install, export, filter toggle)

**Remaining items** added to `docs/TODO.md` backlog (10 items including tab naming, event listener cleanup, lazy rendering, keyboard-navigable filters).

---

## 2026-02-06

### Docs: Post-Modularization Cleanup

Updated documentation that was stale after the Vite migration and dashboard modularization.

**Why:** Several docs still referenced the pre-modularization single-file dashboard. Hosting instructions told users to open `dashboard/index.html` directly (won't work with ES modules). TODO.md had 10 completed items that should have been removed. HISTORY.md had incorrect file references for the PDF export fix.

**Changes:**
- **TODO.md** - Removed all completed `[x]` items (already tracked in HISTORY.md), kept only untested warnings and open research items
- **ADMIN_GUIDE.md** - Updated hosting section: replaced "open index.html" with dev server instructions, updated static host section to reference `dist/` build output
- **HISTORY.md** - Fixed PDF export entry to reference actual modular files (`export.js`, `ui.js`) instead of just `index.html`
- **CLAUDE.md** - Updated Key Components to reflect modular dashboard structure and Vite build

---

### Refactor: Dashboard Modularization

Split the monolithic 6,927-line `dashboard/index.html` into ES modules for maintainability.

**Why:** The single-file dashboard had grown to ~1,200 lines of CSS, ~870 lines of HTML, and ~4,840 lines of JavaScript all inlined. This made it difficult to navigate, edit, or review specific concerns. Splitting into focused modules makes each concern independently readable and editable.

**Changes:**
- Extracted CSS to `dashboard/styles.css` (1,200 lines)
- Split JS into 9 ES modules in `dashboard/js/`:
  - `state.js` - Shared state object, VIEW_LEVELS, SECTION_GUIDANCE
  - `utils.js` - Tag helpers, author resolution, formatting, holidays, sanitization
  - `filters.js` - Filter system, persistence, multi-select dropdowns
  - `ui.js` - Detail pane, settings panel, dark mode, collapsible sections
  - `charts.js` - Chart.js timeline and heatmap rendering
  - `tabs.js` - All tab-specific rendering (Overview, Activity, Work, Health, Discover)
  - `data.js` - Data loading and multi-file combining
  - `export.js` - PDF export, shareable URLs, PWA support
  - `main.js` - Entry point, tab navigation, initialization
- Slimmed `index.html` to 889 lines (HTML structure only)
- Vite bundles all modules into a single JS file for production

**Files added:** `dashboard/styles.css`, `dashboard/js/*.js` (9 files)
**Files modified:** `dashboard/index.html`

---

### Fix: PDF Export, Button Icons, and PWA Updates

Fixed three user-reported issues with the dashboard.

**Why:** The Install and PDF buttons had identical download-arrow icons with text hidden on mobile, making them indistinguishable. PDF export produced a blank white page due to two bugs: wrong tab ID lookup (using `tab-work` instead of the actual containers from TAB_MAPPING), and dark theme text becoming invisible on the white PDF background. Installed PWA users had no way to check for or trigger updates.

**Changes:**
- **Button icons:** Install now uses an app-install icon; PDF uses a document icon. Labels always visible (not just on sm+)
- **PDF export:** Uses TAB_MAPPING to find correct content containers for all tabs. Converts chart canvases to images before cloning. Overrides dark theme colors to ensure text/cards are readable on white background
- **PWA updates:** Added "Check for Updates" button in Settings with status feedback. Added explanation that the app auto-updates and users should close/reopen to apply

**Files updated:**
- `dashboard/index.html` - Button icons, PWA settings section
- `dashboard/js/export.js` - PDF export fix (TAB_MAPPING, canvas-to-image, dark theme overrides)
- `dashboard/js/ui.js` - PWA update check button

---

## 2026-02-05

### Feature: Vite + PWA Plugin Setup

Migrated from manual PWA setup to Vite with vite-plugin-pwa for proper PWA support.

**Why:** The manual service worker and manifest setup wasn't working reliably. vite-plugin-pwa handles all the complexity: service worker generation, manifest injection, workbox caching strategies, and auto-updates.

**Changes:**
- Added Vite as build tool (`npm run dev`, `npm run build`, `npm run preview`)
- Added vite-plugin-pwa with workbox for robust offline support
- Configured runtime caching for CDN assets (Tailwind, Chart.js, fonts)
- Updated GitHub Actions workflow to build with Vite before deploying
- Removed manual sw.js and manifest.json (now auto-generated)

**Files added:**
- `vite.config.js` - Vite configuration with PWA plugin
- `dashboard/public/icons/` - Static icons directory for Vite

**Files updated:**
- `package.json` - Added Vite dependencies and scripts
- `.github/workflows/deploy.yml` - Build with Vite before deploying
- `.gitignore` - Added `dist/` folder
- `dashboard/index.html` - Removed manual service worker registration

**Files removed:**
- `dashboard/sw.js` - Now generated by vite-plugin-pwa
- `dashboard/manifest.json` - Now generated by vite-plugin-pwa

**Development:**
```bash
npm install    # Install dependencies
npm run dev    # Start dev server with hot reload
npm run build  # Production build to dist/
npm run preview # Preview production build
```

---

## 2026-02-04

### Fix: PWA Installation Not Working on GitHub Pages

Fixed the PWA not being installable on GitHub Pages.

**Problem:** The manifest.json used absolute paths (`"scope": "/"`, `"start_url": "/"`) which point to the root of github.io, not the `/repo-tor/` subdirectory where the dashboard is actually served.

**Solution:** Changed to relative paths that work regardless of deployment location:
- `"scope": "./"` - Scope relative to manifest location
- `"start_url": "./index.html"` - Start URL relative to manifest location

Also updated service worker precache paths to use relative URLs and bumped cache version to force refresh.

**Files updated:**
- `dashboard/manifest.json` - Changed scope and start_url to relative paths
- `dashboard/sw.js` - Changed precache paths to relative, bumped version to v2

---

### Feature: Per-Filter Modes & PWA Help

Improved filter UX with per-filter modes and added PWA install guidance in Settings.

**Filters - Per-Filter Modes:**
- Removed global AND/OR/Exclude mode selector (didn't make logical sense globally)
- Added per-filter Include/Exclude toggle for each filter type
- Converted single-select dropdowns to multi-select checkboxes
- Filter modes are now: Tag (Inc/Exc), Author (Inc/Exc), Repo (Inc/Exc), Urgency (Inc/Exc), Impact (Inc/Exc)
- Updated URL shareable links to support multi-select (comma-separated, `!` prefix for exclude)
- Updated localStorage persistence for new filter structure

**PWA Install Help:**
- Added "Install App" section to Settings panel
- Shows install status (Ready/Installed/Unsupported)
- Includes "Install Dashboard" button
- Manual install instructions for Chrome, Safari, Firefox
- Auto-detects if already running as standalone app

**Files updated:**
- `dashboard/index.html` - Filter UI, filter logic, PWA section in settings
- `docs/USER_GUIDE.md` - Added Filters and PWA sections
- `docs/SESSION_NOTES.md` - Updated recent changes
- `docs/TODO.md` - Marked items complete

---

### Feature: Dashboard Polish & PWA Support

Completed all remaining polish items and added PWA offline support.

**Detail Pane:**
- Loading states with skeleton placeholders
- Fade-in animation when content loads
- Shareable URL state (tag, author, impact, urgency drilldowns)

**PDF Export:**
- Updated for new 4-tab layout
- Shows all 4 key metrics (Features, Bugs, Urgency, Planned)
- Fixed tab name references

**Filters:**
- Added urgency filter dropdown (Planned/Normal/Reactive)
- Added impact filter dropdown (User-facing/Internal/Infrastructure/API)
- Added quick select presets (30 days, 90 days, This year, Last year)

**Visual Theme:**
- Added JetBrains Mono font for headings, numbers, tabs, buttons
- Added subtle grid pattern background
- Added glow effects on card hover
- Added gradient accent line under header
- Updated tabs with uppercase monospace styling

**PWA Support:**
- Service worker with cache-first strategy
- Web app manifest with theme colors
- Install button (appears when browser supports it)
- Update prompt when new version available
- SVG + PNG icons for all platforms

**Files updated:**
- `dashboard/index.html` - All features above
- `dashboard/manifest.json` - PWA manifest
- `dashboard/sw.js` - Service worker
- `dashboard/icons/` - SVG and PNG icons
- `docs/TODO.md` - Marked items complete

---

## 2026-01-29

### Feature: Discover tab

Added a new Discover tab for exploring metrics in a randomized, interactive way.

**Metric Cards:**
- 4 randomizable cards showing 20+ different metrics
- Shuffle button to get new random metrics
- Dropdown to select specific metrics
- Pin button to keep a metric fixed during shuffle
- Preferences saved to localStorage

**Metrics available:**
- Net Code Growth, Avg Commit Size, Deletion Ratio
- Feature:Bug Ratio, Test/Docs Investment
- Untagged/Breaking Commits
- Peak Hour/Day, Top Contributor
- Avg Files/Commit, Single-File/Large Commits
- Refactor/Security Work, Weekend/Night/Early patterns

**File Activity:**
- Top 10 most-changed files with anonymized names
- Humorous name generator (e.g., "Grumpy Dragon", "Sleepy Unicorn")
- Names are consistent per file (hash-based) but hide actual paths

**Comparisons:**
- Visual side-by-side comparisons with progress bars
- Weekend vs Weekday, Features vs Bugs, Additions vs Deletions
- Planned vs Reactive, Simple vs Complex

**Files updated:**
- `dashboard/index.html` - Tab button, content, and all JavaScript
- `docs/USER_GUIDE.md` - Added Discover tab documentation

---

## 2026-01-28

### Refactor: Remove duplicated content from Overview tab

Removed elements from Overview tab that were duplicated in the Breakdown tab, keeping Overview focused as an executive summary.

**Removed from Overview:**
- Avg Complexity card (duplicated in Breakdown tab's work summary)
- Work Breakdown doughnut chart (Breakdown tab has both doughnut and trend over time)

**Overview now shows:**
- Quick Stats: Features Built, Bugs Fixed, Avg Urgency, % Planned
- Additional Stats: Files Changed, Contributors (reduced from 3 to 2 cards)
- Key Highlights (now full width)
- Activity Snapshot

**Files updated:**
- `dashboard/index.html` - Removed HTML, JavaScript, and export code
- `docs/USER_GUIDE.md` - Updated to reflect changes

---

### Fix: Bug count inconsistency between tabs

Fixed the mismatch where Overview tab only counted 'bugfix' tags while Breakdown tab counted both 'bugfix' and 'fix' tags.

**Changes:**
- Overview tab `renderSummary()` now counts both 'bugfix' and 'fix' tags
- Breakdown tab Work Type Trend chart now counts both tags (was only 'bugfix')
- Overview tab click handler for fixes card now filters both tags

**Files updated:**
- `dashboard/index.html` - 3 locations fixed for consistent bug counting

---

### Fix: Chart legend text color on dark background

Fixed Work Breakdown doughnut charts displaying dark text on dark background when using custom `generateLabels()` functions.

**Change:** Added `fontColor: Chart.defaults.color` to all custom legend label generators, ensuring they inherit the theme-aware text color.

**Files updated:**
- `dashboard/index.html` - 2 chart configurations updated

---

### Removed: Period comparison from Overview tab

Removed the "Compare" dropdown and period-based trend indicators from the Overview tab.

**What was removed:**
- Compare dropdown (Last 7 Days / Last 30 Days / This Quarter)
- Trend indicators (↑ 10% vs previous period) from stat cards
- Period-based filtering of Overview stats

**Why:** Simplifies the Overview tab - stats now show totals from all filtered commits rather than period-restricted values. Use date filters for time-based analysis.

**Files updated:**
- `dashboard/index.html` - Removed period comparison UI and logic
- `docs/USER_GUIDE.md` - Updated to remove period comparison documentation

---

### Feature: Settings panel

Consolidated all settings into a dedicated slide-out panel accessible via the gear icon in the header.

**Settings moved to panel:**
- View Level (Executive/Management/Developer) - moved from filter sidebar
- Privacy Mode toggle - moved from header icon to toggle switch in panel
- Timezone (Local/UTC) - moved from Activity tab header
- Work Hours Start/End - moved from Activity tab collapsible card

**Benefits:**
- Cleaner filter sidebar (now only contains data filters)
- Settings are logically grouped together
- Privacy mode has a proper toggle switch
- Activity tab is less cluttered

**Files updated:**
- `dashboard/index.html` - Added settings panel CSS, HTML, and JavaScript
- `docs/USER_GUIDE.md` - Updated to document settings panel

---

### Improvement: Shortened chart axis labels

Updated the Code Changes Over Time chart to display abbreviated numbers on the y-axis for better readability.

**Change:** Y-axis labels now show "50k" instead of "50,000", "1.5M" instead of "1,500,000".

**Files updated:**
- `dashboard/index.html` - Updated y-axis tick callback to format large numbers with k/M suffixes

---

## 2026-01-27

### Feature: Code Changes Over Time chart

Added a new chart to the Activity tab showing net lines changed (additions - deletions) over time by project.

**Problem:** The dashboard extracted and stored insertions/deletions data per commit and per project totals, but this data was never displayed to users.

**Solution:** Added "Code Changes Over Time" stacked bar chart in the Activity tab, similar to the existing "Activity Timeline" chart:
- Shows net lines changed (additions - deletions) by date
- Multi-repo view shows stacked bars by project with same color palette as commits chart
- Tooltips show "+N lines" or "-N lines" for clarity
- Y-axis shows positive/negative values with sign prefix

**Files updated:**
- `dashboard/index.html` - Added chart HTML, `renderCodeChangesTimeline()` function, integration with Activity tab render

---

## 2026-01-25

### Feature: Dashboard tab consistency and UX improvements

Fixed several inconsistencies in the dashboard layout and improved visibility.

**Problems addressed:**
- Chart text (labels, legends) not visible enough in dark mode
- Activity and Breakdown tabs lacked summary cards (inconsistent with Overview and Risk tabs)
- All sections collapsed by default, poor first-time user experience
- Non-developer roles lacked context for interpreting detailed data

**Solutions:**
1. **Chart text visibility**: Read CSS variables with `getComputedStyle()` instead of hardcoding color values
2. **Summary cards**: Added 4-card summary rows to Activity tab (Total Commits, Active Days, Contributors, Avg/Day) and Breakdown tab (Features, Bug Fixes, Refactors, Avg Complexity)
3. **Section defaults**: Removed section state persistence - consistent defaults on every page load (primary sections expanded)
4. **Role-specific guidance**: Added interpretation hints for Executive/Management views (e.g., "high weekend % may signal burnout risk"). Developers see raw data without hints.

**Files updated:**
- `dashboard/index.html` - Chart defaults, summary cards, section state logic, SECTION_GUIDANCE config
- `docs/TODO.md` - Added backlog items: techy theme, date exclusions, filter presets, match all/any

---

## 2026-01-24

### Feature: Role-based view levels for different audiences

Added view level selector (Executive/Management/Developer) that changes data granularity while keeping the same dashboard layout.

**Problem:** Different stakeholders need different levels of detail:
- Executives want high-level summaries, not individual contributor data
- Managers want project-level views, not hourly breakdowns
- Developers want full detail for debugging and self-analysis

**Solution:** Aggregation layer that transforms data based on selected view level:

| View | Contributors | Heatmap | Drilldown |
|------|-------------|---------|-----------|
| Executive | "All Contributors (45)" | Weekly activity | Stats summary |
| Management | "repo-api (12 people)" | Day-of-week bars | Stats + repo split |
| Developer | "Alice Chen" | 24×7 hourly grid | Full commit list |

**Key design decisions:**
- Same layout and charts for all views (no hidden tabs or sections)
- Filters still apply across all view levels
- Selection persists in localStorage

**Files updated:**
- `dashboard/index.html` - Added VIEW_LEVELS config, aggregation functions, modified render functions
- `docs/TODO.md` - Added role-based view levels to backlog with implementation checklist
- `docs/SESSION_NOTES.md` - Updated with new feature details

### Extension: Role-based view levels to all tabs

Extended view level support to remaining dashboard sections:

**Health tab:**
- Urgency by Contributor → Executive: single aggregated bar, Management: by repo, Developer: by person
- Impact by Contributor → Same pattern

**Security tab:**
- Executive: shows count and date range only
- Management: shows per-repo breakdown with click-to-drill
- Developer: full commit details (original)

**Timeline:**
- Executive: weekly period summaries with tag breakdown
- Management: daily period summaries with tag breakdown
- Developer: individual commit list (original)

---

## 2026-01-22

### Setup: GitHub CLI installation and authentication with .env support

Added `scripts/setup-gh.sh` and `.env` file support for API-based extraction authentication.

**Problem:** The API-based extraction (`extract-api.js`) requires GitHub authentication, but:
- Interactive `gh auth login` doesn't work in AI sessions (no browser)
- Environment variables don't persist between sessions
- No standardized way to configure authentication

**Solution:** Multi-layered authentication support:
1. **`.env` file** - Store `GH_TOKEN` in project root (gitignored)
2. **Environment variable** - `GH_TOKEN=xxx` for one-off runs
3. **Setup script** - Interactive or token-based authentication
4. **Auto-loading** - Scripts automatically read from `.env`

**Usage:**
```bash
# Option 1: Create .env file (recommended for AI sessions)
cp .env.example .env
# Edit .env and set GH_TOKEN=ghp_xxx

# Option 2: Interactive setup
./scripts/setup-gh.sh

# Option 3: Token + save to .env
./scripts/setup-gh.sh --token=ghp_xxx --save-env

# Option 4: One-off with env var
GH_TOKEN=ghp_xxx node scripts/extract-api.js owner/repo
```

**Files added:**
- `scripts/setup-gh.sh` - Cross-platform gh CLI setup script
- `.env.example` - Template for environment configuration

**Files updated:**
- `scripts/extract-api.js` - Added .env file loading and GH_TOKEN support
- `.gitignore` - Added `.env` to ignore list
- `docs/ADMIN_GUIDE.md` - Added GitHub CLI and .env setup sections
- `docs/USER_ACTIONS.md` - Added detailed setup instructions for all methods

---

### Optimization: API-based extraction (no cloning required)

Added `scripts/extract-api.js` to extract git data directly via GitHub API without cloning repos.

**Problem:** Clone-based extraction required downloading full repos (potentially large) just to read commit history.

**Solution:** Use GitHub API via `gh` CLI:
- Fetches commit list with pagination
- Gets stats and files per commit via API
- Outputs same format as clone-based extractor

**Benefits:**
- No disk space for clones
- Faster for initial setup
- Works without git installed (only needs `gh` CLI)
- Supports `--since` flag for incremental fetches

**Usage:**
```bash
scripts/update-all.sh           # API mode (default)
scripts/update-all.sh --clone   # Clone mode (if needed)
```

**Files added:**
- `scripts/extract-api.js` - GitHub API-based extractor

**Files updated:**
- `scripts/update-all.sh` - Default to API mode, `--clone` flag for old behavior

---

### Optimization: Merge-analysis script for faster feeding

Added `scripts/merge-analysis.js` to dramatically reduce AI output tokens during the "feed the chicken" workflow.

**Problem:** When processing pending batches, AI had to output full commit objects (500-800 tokens each) including all git metadata. This was slow and wasteful since the git data already exists in `reports/`.

**Solution:** New merge-based workflow:
1. AI outputs **only analysis fields**: `{sha, tags, complexity, urgency, impact}`
2. Script merges with raw git data from `reports/<repo>/commits/<sha>.json`
3. Saves complete commit to `processed/<repo>/commits/<sha>.json`

**Token savings:** ~10x reduction in AI output per commit (50-80 tokens vs 500-800)

**Files added:**
- `scripts/merge-analysis.js` - Merges analysis with raw git data

**Files updated:**
- `docs/EXTRACTION_PLAYBOOK.md` - Updated feed workflow to use merge-analysis.js

---

### Fix: Skip malformed commits and prevent incomplete saves

Dashboard was showing empty sections because malformed commits (missing timestamp, author)
were causing JavaScript errors that halted execution before event listeners were attached.

**Root Cause:**
- 65 processed commit files were missing required fields (timestamp, author_id, repo_id)
- When AI analyzed batches, it only output analysis fields (tags, complexity, urgency, impact)
  instead of the complete commit object (original metadata + analysis)
- `save-commit.js` had no validation, so incomplete commits were saved
- Dashboard JavaScript crashed trying to access undefined `.timestamp`

**Changes:**
- `save-commit.js`: Added validation for required fields (sha, timestamp, subject, author)
  and analysis fields (tags, complexity, urgency, impact) - rejects incomplete commits
- `aggregate-processed.js`: Added `validateCommit()` as safety net to skip malformed commits
- `dashboard/index.html`: Added null guard in `getWorkPattern()` for timestamps
- `dashboard/index.html`: Added `renderSummary()` on Overview tab switch

**Prevention:** `save-commit.js` now fails fast with clear error message if commit objects
are missing required fields, preventing incomplete commits from being saved in the future.

## 2026-01-21

### Fix: Remove orphaned stat-top-tag JavaScript causing dashboard to break

The dashboard was showing 0 for Contributors, Features Built, and Bugs Fixed because
JavaScript code was trying to set a `stat-top-tag` element that no longer existed in
the HTML. This caused a TypeError that stopped script execution, preventing subsequent
stats and render functions from completing.

**Root Cause:**
- HTML was updated to show only 3 stat cards (Files Changed, Avg Complexity, Contributors)
- JavaScript still tried to set `stat-top-tag` and `stat-top-tag-sub` elements
- `document.getElementById('stat-top-tag')` returned null
- Calling `.textContent` on null threw an error, halting execution

**Changes:**
- Removed orphaned `stat-top-tag` code from `updateSummaryStats()`
- Updated PDF export to match 3-card layout (was 4 columns, now 3)

### Enhancement: Dark Theme Implementation

Complete visual redesign of the dashboard with a dark-only theme.

**Color System (Dark-Only Theme):**
- Background: #1B1B1B (page), #2a2a2a (cards)
- Primary blue: #2D68FF (links, CTAs, focus states)
- Text: #FFFFFF (primary), #767676 (secondary)
- Borders: #333333
- Semantic: #16A34A (success), #EF4444 (error), #EAB308 (warning)

**Typography:**
- Font: Figtree (loaded from Google Fonts)
- Weights: 400 (regular), 500 (medium), 600 (semibold)

**Spacing:**
- Base unit: 8px
- Section gaps: 24px
- Card padding: 24px
- Component gaps: 8px, 16px

**Border Radius:**
- Small: 4px (buttons, icons)
- Medium: 8px (inputs, alerts)
- Large: 12px (cards, dialogs)
- Full: 9999px (badges, pills)

**Components Updated:**
- Cards: border instead of shadow, #2a2a2a background
- Buttons: primary (#2D68FF), secondary (transparent with border)
- Inputs: 40px height, 2px border, 8px radius
- Tags/badges: transparent backgrounds with colored text and borders
- Modal backdrop: rgba(0, 0, 0, 0.8)

**Dark Mode:**
- Removed light mode toggle (dark-only)
- Chart.js defaults set for dark theme
- Heatmap colors adjusted for dark backgrounds


---

### Enhancement: Redesigned Dashboard Layout with Sticky Tabs and Filter Sidebar

Major UI restructure for improved navigation and screen real estate.

**Changes:**

1. **Sticky Tabs Bar**
   - Tabs now stick to top of viewport when scrolling
   - Immediate access to tab navigation from anywhere on the page
   - Filter toggle button integrated into tabs bar

2. **Collapsible Filter Sidebar**
   - Filters moved from inline card to collapsible left sidebar
   - Default state: collapsed (more content visible)
   - Desktop: pushes content when expanded
   - Mobile: overlays as slide-out panel
   - Filter badge shows when filters are active

3. **Consolidated Overview Metrics**
   - Removed redundant global summary cards section
   - Merged Files Changed, Avg Complexity, Contributors into Overview tab
   - Removed Top Work Type (redundant with Work Breakdown chart)
   - Overview now shows 7 metrics: Features, Bugs Fixed, Urgency, % Planned, Files, Complexity, Contributors

**Result:** Cleaner layout with tabs always accessible, more vertical space for content, and filters available on demand.

---

### Fix: Consistent Section Spacing Across Tabs

Fixed inconsistent spacing between sections when multiple tab content containers are displayed together.

**Problem:**
- Tabs like Work and Activity display multiple tab-content containers together (e.g., Work shows tab-progress + tab-contributors + tab-tags)
- The last section in each container was missing `mb-6` spacing, creating visual gaps between containers

**Changes to `dashboard/index.html`:**
- Added `mb-6` to Changes section in tab-activity (spacing before tab-timing)
- Added `mb-6` to Complexity Over Time section in tab-progress (spacing before tab-contributors)
- Added `mb-6` to Complexity by Contributor section in tab-contributors (spacing before tab-tags)
- Added `mb-6` to tag grid in tab-tags

**Result:** Consistent 1.5rem spacing between all sections across all tabs.

---

### Fix: JavaScript Error in updateFilteredStats()

Removed orphaned `updateFilteredStats()` function that was causing console errors when making filter selections.

**Problem:**

- `updateFilteredStats()` tried to set `textContent` on element `stat-commits-filtered` which doesn't exist
- This threw an uncaught TypeError every time filters were changed
- The function was redundant since `updateFilterIndicator()` already handles showing filtered counts

**Changes to `dashboard/index.html`:**

- Removed the call to `updateFilteredStats()` from `applyFilters()`
- Removed the orphaned `updateFilteredStats()` function

**Result:** Filter selections no longer throw console errors.

---

### Fix: JavaScript Error Breaking Filter Updates

Fixed a JavaScript error in `renderSecurity()` that was preventing filters from updating the Overview tab.

**Problem:**
- `renderSecurity()` tried to set `textContent` on element `security-count` which doesn't exist
- This threw an uncaught TypeError that stopped `applyFilters()` execution
- Since `renderSummary()` is called after `renderSecurity()` in `applyFilters()`, the Overview tab never updated

**Changes to `dashboard/index.html`:**
- Removed the broken `document.getElementById('security-count')` line from `renderSecurity()`
- The security count is already correctly displayed by `renderHealth()` via `health-security-count`

**Result:** Filter changes now properly trigger all render functions including `renderSummary()`, fixing the Overview tab updates.

---

### Fix: Overview Tab Filters Not Updating

Fixed filters and Compare dropdown not affecting the Overview tab display and click handlers.

**Problem:**
1. Overview tab card click handlers (Features Built, Bugs Fixed, etc.) captured commit data from closure at render time, showing stale data when filters changed
2. Health tab card click handlers had the same stale closure issue
3. Event listeners were being added repeatedly on each re-render without cleanup

**Changes to `dashboard/index.html`:**
- Added `getCurrentPeriodCommits()` helper function to dynamically compute filtered commits based on current filters AND summary period
- Added `summaryCardHandlersInitialized` flag to prevent duplicate event listeners on Overview tab cards
- Changed Overview card click handlers to call `getCurrentPeriodCommits()` at click time instead of using closure-captured data
- Added `healthCardHandlersInitialized` flag for Health tab cards
- Changed Health card click handlers to call `getFilteredCommits()` at click time

**Result:** Overview and Health tab cards now correctly respond to filter changes and show current filtered data when clicked.

---

### Enhancement: UI Consistency Improvements

Improved UI consistency across all dashboard components.

**Changes to `dashboard/index.html`:**

1. **Collapsible Sections**
   - Added collapsible functionality to all card sections
   - Sections default to collapsed state on first load
   - State is persisted to localStorage per section
   - Click header to expand/collapse with chevron indicator
   - Smooth animation transitions

2. **Standardized Text Colors**
   - Replaced inconsistent `text-gray-*` Tailwind classes with themed CSS variables
   - Added `text-themed-primary`, `text-themed-secondary`, `text-themed-tertiary`, `text-themed-muted` utilities
   - Better dark mode support through CSS variable theming
   - Consistent color hierarchy across all tabs

3. **Standardized Spacing**
   - Consistent `mb-6` between sections
   - Consistent `gap-4` for small grids, `gap-6` for larger layouts
   - Added CSS variables for spacing (`--section-gap`, `--card-gap`, `--content-padding`)

4. **Tag Display Consistency**
   - All tag renders now use `getTagClass()` function
   - Consistent tag styling across commit lists, breakdowns, and contributors
   - Removed redundant size classes (tags use base `.tag` styling)

**Result:** Dashboard now has consistent visual hierarchy, better dark mode support, and less visual clutter with collapsible sections.

---

### Fix: Charts Not Rendering in Hidden Tabs

Fixed charts in Activity, Work, and Health tabs appearing empty on mobile.

**Problem:** Chart.js cannot properly render charts inside hidden containers (display: none or visibility: hidden). When the dashboard loads, only the Overview tab is visible. Charts rendered to hidden tabs would fail silently because their parent containers had zero width/height.

**Changes to `dashboard/index.html`:**
- Added re-render logic to tab click handler
- When switching to 'activity' tab: calls `renderTiming()` to re-render timing charts
- When switching to 'work' tab: calls `renderTags()` to re-render tag charts
- When switching to 'health' tab: calls `renderHealth()` to re-render health charts

**Result:** Charts now render correctly when users switch to Activity, Work, or Health tabs.

---

### Fix: Author Identity Mapping in Aggregation

Fixed author identity mapping not being applied during data aggregation.

**Problem:** The `config/author-map.json` existed to merge multiple email addresses (e.g., `jacotheron87@gmail.com` and `34473836+jacotheron87@users.noreply.github.com`) into a single identity, but the aggregation script wasn't using it.

**Changes to `scripts/aggregate-processed.js`:**
- Added `loadAuthorMap()` to read `config/author-map.json` at startup
- Added `resolveAuthorId()` to map raw emails to canonical IDs
- Updated `generateAggregation()` to normalize `author_id` in all commits
- Updated `calcContributorAggregations()` to merge commits by canonical ID
- Added `metadata.authors` to generated data for dashboard resolution
- Contributors now include `name`, `email`, and `emails` (if merged)

**Result:**
- Before: 5 contributors (same person counted twice)
- After: 4 contributors (emails properly merged)
- Dashboard filter dropdown now shows one entry per person

---

### Feature: Global Filters Across All Tabs

Made dashboard filters apply globally to all tabs instead of just the Activity tab.

**Problems Fixed:**
1. Filter bar was only visible on Activity tab
2. Filters only affected the commit list, not other tabs (Work, Health, etc.)
3. Filter state was lost when switching between repos

**Changes:**
- Moved filter bar above tabs (always visible)
- Added filter indicator showing "X of Y" when filters are active
- Updated all render functions to use `getFilteredCommits()`:
  - `updateSummaryStats()`, `renderProgress()`, `renderContributors()`
  - `renderTags()`, `renderHealth()`, `renderSecurity()`
  - `renderTiming()`, `renderHeatmap()`, `renderDeveloperPatterns()`
  - `renderSummary()`, all click handlers
- Filter state now persists across repo switches (validates options exist)

**Files changed:**
- `dashboard/index.html` - Global filter implementation

---

### Fix: Dashboard Data Format Inconsistencies

Fixed multiple data format inconsistencies causing incorrect stats and missing data in dashboard.

**Problem:** Different commits had different field formats due to varied extraction sources:

| Field | Format 1 | Format 2 | Missing |
|-------|----------|----------|---------|
| Files changed | `stats.filesChanged` (267) | `files_changed` (44) | 265 |
| Commit text | `subject` (532) | `message` (44) | 0 |
| Additions | `stats.additions` (267) | `lines_added` (44) | 265 |
| Deletions | `stats.deletions` (267) | `lines_deleted` (44) | 265 |

**Solution:** Added helper functions to normalize across all formats:
```javascript
function getFilesChanged(commit) {
    return commit.stats?.filesChanged || commit.filesChanged || commit.files_changed || 0;
}
function getCommitSubject(commit) {
    return commit.subject || commit.message || '';
}
function getAdditions(commit) {
    return commit.stats?.additions || commit.lines_added || 0;
}
function getDeletions(commit) {
    return commit.stats?.deletions || commit.lines_deleted || 0;
}
```

**Result:**
- Files changed: now shows 1,689 (was 0)
- All 576 commits now display subject/message correctly
- Additions/deletions now aggregated from all sources: 277,817 / 275,506

**Files changed:**
- `dashboard/index.html` - Added 4 helper functions, updated all field references

---

## 2026-01-20

### Storage Migration: Batches to Individual Commit Files

Migrated from storing commits in batch files to individual commit files.

**Old structure:** `processed/<repo>/batches/batch-NNN.json` (15 commits per file)
**New structure:** `processed/<repo>/commits/<sha>.json` (1 file per commit)

**Benefits:**
- Simpler deduplication (file existence = processed, no manifest sync issues)
- Atomic edits (fix one commit without touching others)
- Lower corruption risk (lose one file = lose one commit, not 15)
- Cleaner git diffs (individual commit changes are isolated)

**Files changed:**
- `scripts/save-commit.js` - New script replacing save-batch.js
- `scripts/aggregate-processed.js` - Updated to read from commits/
- `scripts/extract.js` - Updated to write individual commit files
- `scripts/migrate-batches-to-commits.js` - One-time migration script
- `docs/EXTRACTION_PLAYBOOK.md` - Updated workflow documentation

**Migration stats:**
- 4 repositories migrated
- 57 batch files converted
- 576 individual commit files created

---

### Fast Batch Saving Script

Added `scripts/save-batch.js` to speed up batch processing workflow.

**Problem:** Writing approved batches via IDE tools (Write/Edit) required approval dialogs for each file, which slowed down significantly as sessions got longer.

**Solution:** Script-based saving that writes both batch file and manifest in one fast bash command with no IDE dialogs.

**Usage:**
```bash
cat <<'EOF' | node scripts/save-batch.js <repo>
{"commits": [...analyzed commits...]}
EOF
```

**Files updated:**
- `scripts/save-batch.js` - New script for fast batch saving
- `docs/EXTRACTION_PLAYBOOK.md` - Updated workflow to use script

---

### Dashboard V2 Complete - Detail Pane and Visualizations

Completed the remaining Dashboard V2 features:

**Detail Pane Component:**
- Slide-out panel from right (30% width on desktop)
- Bottom sheet variant for mobile (85% viewport height)
- Click-outside or Escape key to dismiss
- Smooth CSS transition animations
- Shows filtered commits with message, author, date, tags, urgency/impact labels

**Click Interactions:**
- Overview cards → filtered commits (features, fixes, urgency, planned)
- Health cards → filtered commits (security, reactive, weekend, after-hours)
- Urgency distribution bars → commits by urgency level
- Impact distribution bars → commits by impact category
- Tag breakdown bars → commits with that tag
- Contributor cards → contributor's commits
- Urgency/Impact by contributor → contributor's commits

**New Visualizations Added:**
- Urgency Trend chart (line chart by month, lower is better)
- Impact Over Time chart (stacked bar chart by month)
- Urgency by Contributor (stacked bars showing planned/normal/reactive)
- Impact by Contributor (stacked bars showing user-facing/internal/infra/api)

**Dark Mode Support:**
- Added renderHealth() to dark mode re-render list
- New charts and detail pane respect dark mode

**Files updated:**
- `dashboard/index.html` - Detail pane, trend charts, contributor visualizations
- `docs/SESSION_NOTES.md` - Updated with completion status
- `docs/TODO.md` - Marked priorities 2 and 3 as complete

---

### Dashboard V2 Implementation Progress

Implemented core Dashboard V2 features:

**Aggregation Script:**
- Created `scripts/aggregate-processed.js` to read from processed/ data
- Outputs `dashboard/data.json` (overall) and `dashboard/repos/*.json` (per-repo)
- Includes urgency and impact breakdowns in aggregations
- Same schema for both overall and per-repo views

**Dashboard Structure:**
- Reorganized from 7 tabs to 4 tabs (Overview, Activity, Work, Health)
- Implemented TAB_MAPPING to show multiple content containers per tab
- No breaking changes - existing render functions continue to work

**New Visualizations:**
- Health tab: Security count, Reactive %, Weekend %, After Hours % cards
- Health tab: Urgency Distribution (Planned/Normal/Reactive bars)
- Health tab: Impact Distribution (user-facing/internal/infra/api bars)
- Overview tab: Avg Urgency card with trend indicator
- Overview tab: % Planned card (urgency 1-2 ratio)

**Files created:**
- `scripts/aggregate-processed.js` - New aggregation script
- `dashboard/repos/*.json` - Per-repo aggregated data

**Files updated:**
- `dashboard/index.html` - V2 tab structure and visualizations
- `dashboard/data.json` - Regenerated with urgency/impact data
- `docs/SESSION_NOTES.md` - Current progress
- `docs/TODO.md` - Updated completion status

**Remaining:**
- Detail pane component
- Click interactions for drill-down
- More visualizations (urgency trend, impact by contributor)

---

### Dashboard V2 Design Complete

Conducted reporting discovery session and designed new dashboard architecture.

**Process followed:**
1. Reviewed processed data to understand new dimensions (urgency, impact)
2. Referenced original [Discovery Session](DISCOVERY_SESSION.md) for user flows
3. Evaluated 5 design options for dashboard organization
4. Selected hybrid approach: Logical Groupings + Contextual Detail Pane

**Design decisions:**

| Decision | Rationale |
|----------|-----------|
| 4 tabs (down from 7) | Clearer mental model, less cognitive load |
| Detail pane (not navigation) | Preserves context while drilling down |
| Same schema for overall + per-repo | Enables consistent views at both levels |
| Urgency in Health tab | Operational health is a "health" concern |
| Impact in Work + Overview | Shows where effort goes |

**New dashboard structure:**
- **Overview** - Executive landing (quick scan in 10 seconds)
- **Activity** - When work happens (timeline + timing combined)
- **Work** - What's being done (progress + tags + contributors)
- **Health** - Operational concerns (security + urgency)

**New visualizations planned:**
- Urgency Distribution (planned vs reactive)
- Urgency Trend (operational health over time)
- Urgency by Contributor (who handles emergencies)
- Impact Allocation (where effort goes)
- Impact Over Time (shifting priorities)
- Impact by Contributor (who works on what)

**Key requirement identified:**
Aggregation must read from `processed/` (AI-tagged data) not `reports/` (raw data).
Output same schema for overall and per-repo views.

**Files created:**
- `docs/DASHBOARD_V2_DESIGN.md` - Full design specification

**Files updated:**
- `docs/SESSION_NOTES.md` - Current state and next actions
- `docs/TODO.md` - Reorganized for V2 implementation

---

### Manifest-Based Incremental Processing

Implemented SHA-based tracking for reliable incremental processing ("feed the chicken"):

**Problem:** Batch file numbers shift when new commits are added, making it impossible to safely resume processing after a merge/extraction cycle.

**Solution:** Track processed commits by SHA, not batch number:
- `processed/<repo>/manifest.json` - Source of truth for which commits have been processed
- `scripts/pending.js` - Compares manifest SHAs against fresh extraction, generates pending batches
- `scripts/manifest-update.js` - Updates manifest after each batch approval

**How it works:**
1. `pending.js` reads manifest to get list of processed SHAs
2. Compares against `reports/<repo>/commits.json` to find unprocessed commits
3. Generates `pending/<repo>/batches/` with only unprocessed commits
4. After approval, `manifest-update.js` adds new SHAs to manifest
5. Safe to add new commits between sessions - they'll appear in next pending batch

**Files added:**
- `scripts/pending.js` - Pending batch generator
- `scripts/manifest-update.js` - Manifest updater
- `processed/*/manifest.json` - Per-repo manifests (4 files)

**Files updated:**
- `docs/EXTRACTION_PLAYBOOK.md` - Updated "Feed the Chicken" workflow
- `.gitignore` - Added `pending/` directory
- `docs/SESSION_NOTES.md` - Updated progress and key files

### Schema Update: Urgency and Impact Dimensions

Added two new dimensions for commit analysis beyond tags and complexity:

**Urgency (1-5)** - How critical was the change? Reactive vs planned work:
- 1 = Planned (scheduled work, no time pressure)
- 2 = Normal (regular development pace)
- 3 = Elevated (needs attention soon)
- 4 = Urgent (high priority, blocking work)
- 5 = Critical (production down, security vulnerability)

**Impact** - Who/what is affected by the change:
- `internal` - Only affects developers (tests, refactoring, docs)
- `user-facing` - Directly affects end users (UI, features, bug fixes)
- `infrastructure` - Affects deployment/operations (CI/CD, Docker, monitoring)
- `api` - Affects external integrations (endpoints, breaking changes)

**Value for users:**
- Dev Managers: See ratio of planned vs reactive work over time
- Executives: Operational health metric — high urgency % = problems
- Both: Understand where effort goes (internal vs user-facing vs infrastructure)

**Files updated:**
- `docs/EXTRACTION_PLAYBOOK.md` - Added urgency/impact guidelines, examples, schema
- `docs/SESSION_NOTES.md` - Updated workflow description
- `docs/COMMIT_CONVENTION.md` - Added urgency/impact to format, examples, checklist

### New Extraction Architecture

Redesigned the extraction system for efficiency and persistence:

**Two triggers:**
- **"hatch the chicken"** - Full reset: delete everything, AI analyzes ALL commits from scratch
- **"feed the chicken"** - Incremental: AI analyzes only NEW commits not yet processed

**New file structure:**
- `processed/<repo>/commits.json` - Source of truth (AI-analyzed commits, committed to git)
- `reports/` folder removed (was ephemeral)
- Dashboard data generated from `processed/`

**Changes:**
- Deleted `scripts/tag-commits.js` (AI analyzes commits directly instead of script)
- Rewrote `docs/EXTRACTION_PLAYBOOK.md` with new architecture
- Updated `CLAUDE.md` with both trigger commands

**Key benefit:** Don't redo all commits each time. Process incrementally - only analyze new commits.

### AI Persona Triggers

Added two personas to CLAUDE.md for focused interactions:

- **@coder** - Trigger with `@coder` at message start. Focus: development work (writing code, bug fixes, features, refactoring, architecture)
- **@data** - Trigger with `@data` at message start. Focus: data extraction and processing (playbooks, reports, aggregation)

The existing "feed the chicken" command is now part of the @data persona.

### Activity Timeline Chart

Added visual timeline to the Timeline tab:

- **Bar chart** showing commits by date across all projects
- **Multi-repo support** - Stacked bars color-coded by repository
- **Filter-responsive** - Updates when applying tag/author/repo/date filters
- **Date range** - Shows last 60 dates with activity
- **Adaptive labels** - Shows date labels intelligently based on data density

### Rolling Period Comparison

Changed period comparison from calendar-based to rolling:

- **Last 7 Days** - Rolling 7-day window (replaces "This Week")
- **Last 30 Days** - Rolling 30-day window (replaces "This Month")
- **More intuitive** - Users checking recent activity get predictable ranges
- **Consistent trends** - Comparison periods are always equal length

### Mobile Layout Fixes

Improved responsive layout for small screens:

- **Executive Summary header** - Stacks title and dropdown on mobile
- **Timing tab header** - Stacks title and timezone selector on mobile
- **Work Hours Settings** - Stacks title and time selectors on mobile
- **Shorter dropdown labels** - "Last 7 Days" instead of verbose text

### Developer Activity Patterns

Added per-contributor timing analysis to the Timing tab:

- **Per-author breakdown** - Shows timing patterns for top 6 contributors
- **Key metrics per person:**
  - Peak Hour - most common commit time
  - Peak Day - most common commit day
  - Work Hours % - percentage during configured work hours
  - Weekends % - percentage on Saturday/Sunday
- **Color-coded indicators** - Green (healthy), amber (moderate), red (concern)
- **Responds to configurable work hours**

### Configurable Work Hours

Added ability to customize what counts as "work hours":

- **Start/end time selectors** - Added to Timing tab
- **Range:** 6:00-10:00 start, 16:00-20:00 end
- **Default:** 8:00-17:00
- **Updates dynamically:**
  - Hour chart coloring
  - Work pattern badges
  - Developer activity patterns
  - Summary statistics
- **Persists to localStorage**

### Loading States

Added loading feedback during data fetch:

- **Loading spinner** - Animated spinner during auto-load
- **Status message** - "Loading dashboard data..."
- **Graceful fallback** - Shows file picker if no data found
- **CSS animations** - Skeleton loading and spin animations

### Private Repo Sanitization Mode

Added privacy mode for sensitive repositories:

- **Eye toggle button** - In header, next to theme toggle
- **Author anonymization** - Names become "Developer A", "Developer B", etc.
- **Message hiding** - Commit subjects sanitized to "[message hidden]"
- **Conventional commits** - Preserves type prefix (e.g., "feat: [message hidden]")
- **Security tab** - Hides commit body details
- **Persistence** - Saved to localStorage
- **Toast notification** - Confirms mode toggle

### Activity Heatmap

Added commit time heatmap to the Timing tab:

- **24×7 grid visualization** - Hours (0-23) on Y-axis, days (Mon-Sun) on X-axis
- **Color intensity** - 5 levels from gray (0) to dark blue (most commits)
- **Interactive cells** - Hover shows exact commit count for each hour/day slot
- **Timezone aware** - Updates when Local/UTC toggle changes
- **Monday-first ordering** - Business-friendly day sequence
- **Responsive** - Scrollable on mobile, full-width on desktop
- **Legend** - Visual scale explaining color intensity

### Dark Mode

Implemented full dark mode support:

- **Theme toggle** - Moon/sun button in header
- **System preference** - Auto-detects `prefers-color-scheme: dark` on first visit
- **Persistence** - Saves preference to localStorage
- **CSS variables** - Clean theming with `--bg-primary`, `--text-primary`, etc.
- **Chart.js integration** - Charts re-render with appropriate colors
- **Comprehensive coverage** - All cards, badges, inputs, heatmap cells styled
- **Instant switch** - No page reload needed, applied via class toggle on `<html>`

### Filter Persistence

Added localStorage persistence for dashboard state:

- **What's saved:**
  - Filter values (tag, author, repo, date range)
  - Active tab
  - Summary period (week/month/quarter)
  - Timezone (local/utc)
- **Load behavior:**
  - Restores on page load if no URL params present
  - URL params take priority (for shareable links)
- **Save triggers:**
  - Any filter change
  - Tab switch
  - Period or timezone change
- **Implementation:** Single `dashboardState` key in localStorage

## 2026-01-18

### Timeline Horizontal Bar Chart
- Changed timeline chart from vertical columns to horizontal bars
- Dates on Y-axis (newest at top), commit counts on X-axis
- Better mobile experience - more room for date labels, natural vertical scroll

### Mobile Timeline Improvements
- Improved filter bar layout with responsive grid (2-col mobile, 3-col tablet, flex desktop)
- Stacked filter labels above inputs for better touch targets
- Reduced chart height on mobile (`h-48` vs `h-64`)
- Redesigned commit list items with responsive layout:
  - Commit message wraps on mobile, truncates on desktop
  - Metadata flows with dot separators on mobile, full text on desktop
  - Line counts (+/-) show inline on desktop, below metadata on mobile

### Mobile Tab Fix
- Fixed dashboard tabs overflowing on mobile screens
- Added `overflow-x-auto` for horizontal scrolling
- Added `whitespace-nowrap` to all tab buttons
- Used negative margin (`-mx-4 px-4`) for edge-to-edge scroll area on mobile
- Added CSS class `.scrollbar-hide` to hide scrollbar while maintaining scroll functionality
- Touch scrolling enabled via `-webkit-overflow-scrolling: touch`

## 2026-01-19

### Cache-Busting for Data Files

Added automatic cache-busting to prevent browsers from serving stale data.json:

- Modified deploy.yml to append git commit hash as query parameter
- Transforms `fetch('data.json')` to `fetch('data.json?v=abc123')` during deployment
- Ensures users always get the latest data after each deployment

### Executive Summary View

Added new "Summary" tab as the default view for executive quick scanning:

- **Period comparison** - Select week/month/quarter to compare against previous period
- **Quick stats cards** with trend indicators:
  - Commits with ↑/↓ percentage vs previous period
  - Active contributors count
  - Features count
  - Bug fixes count
- **Work breakdown chart** - Doughnut chart showing top 5 tag categories
- **Key highlights** - Auto-generated insights:
  - Top contributor for the period
  - Busiest day
  - Most active repo (for aggregated data)
  - After-hours work percentage
- **Activity snapshot** - At-a-glance metrics:
  - Average commits per day
  - After-hours commit count
  - Weekend commit count
  - Holiday commit count

Implementation:
- Summary tab positioned first for quick executive access
- Dynamic period calculations for week/month/quarter
- Trend indicators show green (↑) for increases, red (↓) for decreases
- Integrates with work pattern helpers for after-hours/weekend/holiday stats

### Work Pattern Styling

Added visual indicators for after-hours, weekend, and holiday commits:

- **Commit list badges** - Each commit shows applicable work pattern indicators:
  - "After Hours" (amber) - commits before 8:00 or after 17:00
  - "Weekend" (indigo) - commits on Saturday or Sunday
  - "Holiday" (pink) - commits on South African public holidays
- **SA public holidays** - Complete holiday data for 2020-2030:
  - 10 fixed holidays (New Year's, Freedom Day, Christmas, etc.)
  - Easter-based moveable feasts (Good Friday, Family Day)
  - Sunday→Monday observance rule applied
- **Legend/key** - Added to Timeline tab filter card explaining badge meanings
- **Helper functions** - `getWorkPattern()`, `getWorkPatternBadges()` for reuse

### Timestamp Views (Timing Tab)

Added new "Timing" tab to dashboard for visualizing when work happens:

- **Commits by Hour chart** - Bar chart showing distribution across 24 hours (0-23)
  - Work hours (8:00-17:00) displayed in blue
  - After-hours displayed in gray
  - Tooltip shows "Work hours" or "After hours" context
- **Commits by Day of Week chart** - Bar chart showing Mon-Sun distribution
  - Weekdays (Mon-Fri) displayed in blue
  - Weekends (Sat-Sun) displayed in gray
  - Days ordered Monday-first for business context
- **Timezone toggle** - Switch between Local and UTC time display
  - Charts dynamically update when timezone changes
  - Default is local browser timezone

Implementation details:
- Added `useUTC` global state variable
- Added `getCommitDateTime()` helper for consistent date handling
- Added `renderTiming()` function to render both charts
- Added `setupTimezoneToggle()` event listener

### Discovery Framework Validation

Applied the Discovery Framework to validate our solution against user needs:

- Conducted systematic discovery session documenting people, flow, data, and context
- **Key finding:** Two distinct audiences with different needs (Executive vs Dev Manager)
- **Gaps identified:**
  - Timestamp views (when work happens) - data stored but not visualized
  - Work pattern distinction (after hours, weekends, holidays)
  - Executive summary view (high-level, quick-to-scan)
  - PDF export for sharing
- **Verdict:** Core infrastructure solid, minimal over-engineering, main miss is time dimension
- Created `docs/DISCOVERY_SESSION.md` documenting full session
- Reorganized `docs/TODO.md` around discovered priorities

### Feature Roadmap Planning

Added high-priority TODO items for next phase of development:
- **Timestamp Views & Developer Insights** - Commits by hour (0-23), commits by day of week (Mon-Sun), heatmaps, developer activity patterns, commit type trends
- **Work Pattern Visual Distinction** - Work hours (8-5) vs after-hours, weekends, SA public holidays - all visually different across ALL tabs/views
- **Filter Persistence & Cross-Tab Behavior** - Global filter state across all tabs, URL params for shareable links, localStorage for session persistence
- **Visual Design & Dark Mode** - Full dark theme with system preference detection, color palette refinement, typography improvements
- **Private Repository Security** - Sanitization mode, anonymization options, content filtering, local-only mode documentation
- **Repository Management** - Repo rename handling, alias support, migration tools, archive detection

New Research/Investigation section:
- **Device/Platform Attribution** - Split contributions by committer name (mobile vs desktop)
- **AI-Powered Commit Categorization** - Use Claude to read messages + diffs and intelligently tag
- **Multi-Tag Commit Model** - Rethink single-type assumption; one commit can have multiple tags
- **Tag-Centric Reporting** - Shift from commit counts to accomplishment-based metrics

### Direction Shift: Tag-Based Analytics

Refocused tool around three core metrics:

- **When** - Timestamp analytics (hour, day, work hours, weekends, holidays)
- **What** - AI-analyzed tags from commit messages (multiple per commit)
- **Complexity** - Score based on files changed + tag count (scale 1-5)

Created:

- `docs/EXTRACTION_PLAYBOOK.md` - AI-driven extraction process, triggered by "feed the chicken"
- Updated CLAUDE.md with trigger phrase section
- Reorganized TODO.md around new direction (removed completed items, added Foundation section)

Key decisions:

- AI analyzes each commit message (replaces regex parsing)
- Schema: `type` → `tags[]`, add `complexity` field
- User triggers, AI executes, user commits/pushes

### Dashboard Multi-Tag Support (Phase 2)

Implemented multi-tag support in the dashboard (no backward compatibility needed - data regenerates):

- Added `getCommitTags()`, `getAllTags()`, `getTagColor()`, `getTagClass()` helpers
- Added TAG_COLORS constant with new tag vocabulary
- Filter renamed from "Type" to "Tag" - matches commits with any matching tag
- Commit list shows all tags (up to 3 with "+N" overflow indicator)
- "By Type" tab renamed to "By Tag" - counts each tag occurrence
- Progress tab Feature vs Bug Fix now tag-based
- `combineDataFiles()` builds tagBreakdown
- Removed backward compat code (TYPE_COLORS, TYPE_TO_TAG, legacy CSS)

### Extraction Script Tag Support (Phase 1)

Updated `scripts/extract.js` for new tag-based model:

- Added `CONVENTIONAL_TO_TAG` mapping (feat → feature, fix → bugfix, etc.)
- `parseCommitMessage()` returns `tags[]` array instead of single `type`
- Added `calculateComplexity()` function (1-5 scale based on files changed + tag count)
- Summary outputs `tagBreakdown` and `complexityBreakdown`
- Contributors track `tagCounts` instead of `types`
- Files track `tagCounts` instead of `commitTypes`

### Aggregation Script Tag Support (Phase 4)

Updated `scripts/aggregate.js` for tag-aware aggregation:

- Contributors aggregation uses `tagCounts` instead of `types`
- File aggregation uses `tagCounts` instead of `commitTypes`
- Summary outputs `tagBreakdown` and `complexityBreakdown`
- Monthly aggregation tracks tags per month instead of types
- Security detection uses `tags.includes('security')`

### Added chatty-chart Repository

- Added `illuminAI-select/chatty-chart` to tracked repositories
- Repository stats: 42 commits, 4 contributors, 9 files tracked
- Total dashboard now shows 543 commits across 4 repositories
- Updated `config/repos.json` and re-aggregated all data

### Duplicate Contributor Fix

- Created `config/author-map.json` to merge duplicate contributor entries
- Issue: jacotheron87 appeared twice due to different email addresses:
  - `jacotheron87@gmail.com` (51 commits)
  - `34473836+jacotheron87@users.noreply.github.com` (1 commit via GitHub web)
- Solution: Added author mapping to merge both emails under single identity
- Re-aggregated data with `--author-map` flag
- Contributors reduced from 4 to 3 (correct count)

### Multi-Repo Admin Setup

- Created `config/repos.json` - Central config file tracking repository URLs
  - Stores name, URL, and date added for each repo
  - Enables reproducible extraction without re-providing URLs
- Created `scripts/update-all.sh` - Automated update script
  - Reads repos from `config/repos.json`
  - Clones new repos to `.repo-cache/` (gitignored)
  - Pulls updates for existing repos
  - Runs extraction on each repo
  - Aggregates all data into `dashboard/data.json`
  - Supports `--fresh` flag to re-clone everything
- Added repos: social-ad-creator (156 commits), model-pear (302 commits)
- Updated `docs/ADMIN_GUIDE.md` with managed repos workflow
- Simplified `.gitignore`: track all `reports/`, ignore `.repo-cache/`

### GitHub Pages Deployment Fix

- Fixed `data.json` not loading on live GitHub Pages site
- Issue: `deploy.yml` copied `dashboard/index.html` but not `dashboard/data.json`
- Fix: Added step to copy `dashboard/data.json` to `_site/data.json`
- Now `fetch('data.json')` resolves correctly on the deployed site

### Dashboard Cleanup - Remove Vanity Elements

Removed all vanity metrics and charts from the dashboard:

**Progress Tab:**
- Removed: Monthly Commit Volume chart
- Removed: Cumulative Growth (Lines of Code) chart
- Added: Complexity Over Time chart (avg complexity by month)
- Kept: Feature vs Bug Fix Trend

**Contributors Tab - Complete Rework:**
- Removed: Commits by Contributor chart
- Removed: Lines Changed by Contributor chart
- Removed: Contributor Details list (showed commits + lines)
- Added: "Who Does What" - work type breakdown per contributor
- Added: Complexity by Contributor chart

**Timeline Tab:**
- Removed: Commit Timeline chart (just showed daily counts)
- Removed: +/- lines display from commit list
- Added: Complexity badge (1-5) on each commit
- Increased visible commits from 50 to 100

**Summary Tab Highlights:**
- Removed: "Top Contributor" (vanity)
- Removed: "Busiest Day" (vanity)
- Added: "Complex Changes" (high vs simple count)
- Added: "Quality Work" (refactors + tests count)
- Kept: "Most Active Repo" (for aggregated data)
- Kept: "Off-Hours Work" (burnout indicator)

**Summary Tab Activity Snapshot:**
- Removed: "Avg commits/day" (vanity)
- Added: "Complex" count
- Kept: After-hours, Weekend, Holiday (burnout indicators)

### Metrics Overhaul - Focus on What Matters

Replaced vanity metrics (commits, lines of code) with meaningful work metrics:

**Main Summary Cards (top of dashboard):**
- ~~Lines Added~~ → **Files Changed** (scope of work)
- ~~Lines Removed~~ → **Avg Complexity** (1-5 scale)
- ~~Commits~~ → **Top Work Type** (primary focus)
- Contributors (kept)

**Executive Summary Tab:**
- ~~Commits count~~ → **Features Built** (what was delivered)
- ~~Active Contributors~~ → **Bugs Fixed** (quality work)
- Added **Avg Complexity** with trend
- Added **Files Touched** with trend

**PDF Export:**
- Updated to show new metrics instead of lines added/removed

**Rationale:** Lines of code and commit counts are vanity metrics that don't reflect actual work value. The new metrics focus on:
- What kind of work (tags/types)
- How complex the changes are
- How much of the codebase was affected

### Export and Share Features (Priority 4)

Added PDF export and shareable links to the dashboard:

**PDF Export:**
- Button in header to generate PDF report
- Exports current tab with all charts and statistics
- Includes header with repo name, date range, timestamp
- Shows "Filtered view" indicator when filters active
- Uses html2pdf.js library for client-side generation
- Landscape A4 format for optimal chart display
- Loading spinner during generation

**Shareable Links:**
- Button to copy current view URL to clipboard
- Encodes in URL parameters:
  - Current tab (summary, timeline, timing, etc.)
  - Filter state (tag, author, repo, date range)
  - Summary period (week/month/quarter)
  - Timezone setting (local/utc)
- Auto-applies URL state on page load
- Toast notification confirms copy success

**UI additions:**
- Share and Export PDF buttons in dashboard header
- Buttons hide until data loads
- Responsive layout (icons-only on mobile)
- Toast notification system for feedback
- Print styles for clean output

### Summary Tab and Tag Display Fixes

Fixed two bugs in the dashboard:

1. **Summary tab showing zeros** - Date range comparison was excluding current day's commits
   - Issue: `currentEnd` was set to midnight (00:00:00) causing commits made after midnight to be excluded
   - Fix: Added `endOfDay()` helper that sets time to 23:59:59.999
   - Affects: Summary tab quick stats, work breakdown chart, key highlights, activity snapshot

2. **Tag display order inconsistency** - Pie chart and breakdown list showed tags in different order
   - Issue: Pie chart showed tags in encounter order, list showed them sorted by count
   - Fix: Sort tags by count before rendering the chart so both views are consistent
   - Highest count tag now appears first in both the pie chart legend and the breakdown list

## 2026-01-18

### Dashboard Auto-Load Fix
- Copied `data.json` to `dashboard/` folder for GitHub Pages auto-load
- Previously, relative path `../reports/repo-tor/data.json` didn't resolve on GitHub Pages
- Now dashboard auto-loads sample data immediately without file picker
- Added live dashboard URL to `docs/USER_GUIDE.md` and `docs/ADMIN_GUIDE.md`
- Live dashboard: https://devmade-ai.github.io/repo-tor/

### Schema Alignment
- Updated `scripts/extract.js` with new schema:
  - Added `author_id` field to commits (references metadata.authors)
  - Changed `parseMethod` to `is_conventional` boolean
  - Added `authors` map to metadata.json for author lookup
  - Added `security_events` array to summary.json with commit details
  - Wrapped commits.json in `{ "commits": [...] }` object
- Updated `scripts/aggregate.js` to match new schema
- Updated `dashboard/index.html`:
  - Added author resolution from metadata.authors
  - Uses security_events from summary when available

### Dashboard - Multiple Data Files
- Added multi-file support to `dashboard/index.html`:
  - File picker accepts multiple files (HTML5 `multiple` attribute)
  - Client-side `combineDataFiles()` function merges data
  - Combines commits, contributors, files from multiple repos
  - Merges authors from metadata of all files
  - Shows repo filter when multiple repos loaded
- Updated `docs/USER_GUIDE.md` with multiple file instructions

### Data Extraction
- Ran extraction on this repository using `scripts/extract.js`
- Captured 21 commits from 3 contributors across all branches
- Committed extracted data to `reports/repo-tor/`
- Updated `.gitignore` to keep repo-tor data while ignoring other extractions

### GitHub Pages Deployment
- Created `.github/workflows/deploy.yml` - Automated deployment workflow
  - Triggers on push to main/master branches
  - Supports manual trigger via workflow_dispatch
  - Deploys dashboard to GitHub Pages
  - Copies reports folder if present
- Updated `docs/ADMIN_GUIDE.md` with GitHub Pages setup instructions

### Dashboard Filters
- Added filter bar to Timeline tab in `dashboard/index.html`:
  - Type dropdown - filter commits by type (feat, fix, etc.)
  - Author dropdown - filter commits by contributor
  - Repo dropdown - filter by repository (auto-hides for single-repo data)
  - Date range picker - filter by from/to dates
  - Clear Filters button to reset all filters
- Filters apply to both timeline chart and commit list
- Added commit counter showing "Showing X of Y commits"
- Updated `docs/USER_GUIDE.md` with filter documentation
- Updated `docs/TODO.md` to mark filters as complete

### D3 - Aggregation Script
- Created `scripts/aggregate.js` - Multi-repository aggregation
  - Combines data from multiple repository extractions
  - Adds `repo_id` to track commit source
  - Supports optional author identity mapping
  - Generates cross-repo contributor statistics
  - Produces aggregated summary with per-repo breakdown
- Created `config/author-map.example.json` - Example configuration
  - Maps multiple email addresses to canonical author identity
  - Enables consistent contributor tracking across repos
- Created `config/author-map.schema.json` - JSON schema for validation
- Updated `scripts/extract.js` to include `repo_id`:
  - Added `repo_id` (kebab-case) to metadata
  - Added `repo_id` to each commit for aggregation support
- Updated `docs/ADMIN_GUIDE.md` with aggregation documentation
- Updated `docs/USER_GUIDE.md` with multi-repository view section
- Updated `docs/TODO.md` to mark D3 as complete

### Documentation Reorganization
- Split documentation into separate user and admin guides:
  - `docs/USER_GUIDE.md` - Refocused on dashboard UI and interpretation
    - Dashboard overview and summary cards
    - Each tab explained with "what to look for" guidance
    - Commit type color coding and meanings
    - Overall health interpretation patterns
    - Tips for effective use
  - `docs/ADMIN_GUIDE.md` - New guide for setup and operations
    - Prerequisites and installation
    - Data extraction commands and output structure
    - Commit type detection explanation
    - Hook setup instructions
    - Hosting options (local, server, GitHub Pages)
    - Troubleshooting section
- Updated README.md with links to both guides

### Commit Convention Guide (D2)
- Created `docs/COMMIT_CONVENTION.md` - Full guide for conventional commits
  - Commit message format specification
  - Type definitions with analytics impact
  - Special tags (security, breaking, dependency)
  - Examples for each commit type
  - Quick reference and checklist
- Created `.gitmessage` - Commit message template
  - Use with `git config commit.template .gitmessage`
- Created `hooks/commit-msg` - Validation hook
  - Validates conventional commit format
  - Checks subject length (max 72 chars)
  - Warns about non-imperative mood
- Created `hooks/setup.sh` - Hook installation script

### Git Analytics Reporting System
- Created `scripts/extract.js` - Node.js extraction script
  - Parses git log with commit metadata and stats
  - Supports conventional commits and keyword-based type detection
  - Extracts tags, references, file changes
  - Outputs structured JSON (commits, contributors, files, summary)
- Created `scripts/extract.sh` - Shell wrapper for easier usage
- Created `dashboard/index.html` - Static analytics dashboard
  - Timeline view with daily commit chart and commit list
  - Progress view with monthly volume, cumulative growth, feature vs fix trends
  - Contributors view with commit and lines breakdown
  - Security view highlighting security-related commits
  - Type breakdown with pie chart and percentage bars
  - Uses Chart.js for visualizations, Tailwind CSS for styling
  - Auto-loads data.json or accepts file upload
- Updated USER_GUIDE.md with full usage documentation

### Initial Setup
- Created repository structure
- Added CLAUDE.md with AI assistant preferences and checklists
- Added .gitignore entry for Claude Code local settings
- Created docs/ folder with: SESSION_NOTES.md, TODO.md, HISTORY.md, USER_ACTIONS.md
- Added USER_TESTING.md and USER_GUIDE.md
- Added USER_GUIDE.md and USER_TESTING.md to CLAUDE.md checklists

---
