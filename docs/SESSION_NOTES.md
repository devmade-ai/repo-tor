# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard V2:** Implementation complete with role-based view levels, DaisyUI v5 dual-layer light/dark theming following the full `docs/implementations/THEME_DARK_MODE.md` reference (theme catalog module with 4+4 curated themes using per-theme PWA color-key overrides, `applyTheme()` helper with debug flow tracing, single-source-of-truth build-time catalog propagator, burger-menu theme picker with rapid-preview keep-open behavior, reference-shape cross-tab sync with per-mode React state, inline flash-prevention allowlist, unit-tested oklch→hex converter), and PWA support.

**Recent Updates (2026-04-12 — sixth pass, glow-props alignment):**

- Burger menu now stays open during theme picker interactions. Users can click Nord, then Emerald, then Caramel Latte in rapid succession to preview themes without reopening the menu between each click. The dark/light mode toggle is also `keepOpen: true` so a user can toggle to dark mode and then pick a dark theme in the same menu session — the theme list below the toggle swaps to the new mode's themes when the toggle dispatches.
- Pattern borrowed from glow-props where theme controls deliberately omit the `data-close` attribute that other menu items carry. Every other menu item (Quick Guide, User Guide, Save as PDF, Install App, Update Now) keeps its existing close-then-act behavior.
- `HamburgerMenu.handleItem()` refactored to accept the full item object, check `item.keepOpen`, and either run the action immediately (keepOpen path, no close, no delay) or close-then-act after 150 ms (default path, matches CSS fade animation). Shared error handling extracted into a `runAction(action)` helper.
- Menu items are keyed by `item.label` — stable across re-renders, so React reconciles the buttons in place after a theme click. Focus stays on the clicked button, which is now the active theme with a checkmark and highlight class. Screen readers re-announce the button with the updated aria-label (`"Use Nord theme (Cool blue-gray), currently active"`) as natural confirmation feedback.

---

**Previous Updates (2026-04-12 — fifth pass, canva-grid alignment):**

- Extracted `scripts/oklchToHex.mjs` as a standalone module with 21 unit tests via `node:test` (no Jest dependency). Fixes an L=1 percentage-vs-decimal edge case the old inlined version had via a heuristic that couldn't distinguish `oklch(1 0 0)` (white) from `oklch(1% 0 0)` (near-black). `npm test` runs the suite in ~150 ms.
- Added `COLOR_KEY_OVERRIDES` to `scripts/generate-theme-meta.mjs`. Default rule now matches the reference (`--color-primary` for light themes, `--color-base-100` for dark themes) with targeted overrides for monochrome/warm-minimal light themes whose primary is near-black: `lofi → --color-base-300` (→ `#ebebeb`, borrowed from canva-grid), `caramellatte → --color-base-300` (→ `#ffd6a7`, our addition — DaisyUI ships caramellatte with `primary = oklch(0% 0 0)` literal black). Light-theme PWA status bars now use each theme's actual brand accent: `nord → #5e81ac`, `emerald → #66cc8a`.
- Added theme-change flow tracing via `debugLog`. New `theme` source color (lavender `#c4b5fd`) in `DebugPill.jsx` `SOURCE_COLORS`. Every `applyTheme()` call emits a `theme-applied` event with `{dark, requested, validated, skipPersist}` — `requested !== validated` signals a stale or cross-mode theme id dispatch. Pattern borrowed from canva-grid's `useDarkMode` hook.
- Documented the Approach A (per-mode independent, 3 storage keys) vs Approach B (named combos, 2 storage keys) tradeoff in `CLAUDE.md`'s Dashboard Architecture section, with reference to canva-grid as the Approach B sibling project and rationale for why we chose A.

---

**Previous Updates (2026-04-12 — earlier passes):**

**Recent Updates (2026-04-12 — fourth pass):**

### Reference-pattern gap closure — single-source config, 4+4 theme catalog, burger-menu theme picker, reference-shape cross-tab handler

After the reference-pattern alignment pass, a second audit against `docs/implementations/THEME_DARK_MODE.md` turned up seven residual gaps — all non-critical but all structural (would decay into bugs the moment someone added a theme). This pass closes every actionable gap.

**Single source of truth for theme registration:**
- New file `scripts/theme-config.js` — exports `THEMES = { light: [...], dark: [...] }` with each entry being `{ id, name, description }`, plus `DEFAULT_LIGHT_THEME` / `DEFAULT_DARK_THEME`. This is the ONLY file humans edit when adding, removing, or renaming themes.
- `scripts/generate-theme-meta.mjs` was rewritten to read `theme-config.js` and propagate the catalog to four downstream files via marker-based rewrite:
  - `dashboard/js/generated/themeMeta.js` (full rewrite)
  - `dashboard/js/themes.js` block between `/* BEGIN GENERATED: theme-catalog */` / `/* END GENERATED: theme-catalog */` — `LIGHT_THEMES`, `DARK_THEMES`, `DEFAULT_LIGHT_THEME`, `DEFAULT_DARK_THEME`
  - `dashboard/styles.css` block between `/* BEGIN GENERATED: daisyui-plugin */` / `/* END GENERATED: daisyui-plugin */` — the `@plugin "daisyui" { themes: ... }` directive with `--default` / `--prefersdark` markers on the defaults
  - `dashboard/index.html` block between `/* BEGIN GENERATED: flash-prevention-meta */` / `/* END GENERATED: flash-prevention-meta */` — `LIGHT_THEMES` / `DARK_THEMES` / `DEFAULT_*_THEME` / `META` constants inside the inline flash prevention script
- The generator is idempotent: each rewrite compares new content to existing and skips the write when unchanged, so `npm run dev` doesn't bump mtimes on every prebuild and trigger Vite HMR reloads. Second run reports "unchanged" for all four files.
- Fail-fast validation: generator exits with error if `DEFAULT_LIGHT_THEME` / `DEFAULT_DARK_THEME` aren't in their arrays, if a theme's `color-scheme` property doesn't match which array it's in (dark theme listed under light or vice versa), or if a theme ID isn't a real DaisyUI theme.

**Theme catalog expanded from 1+1 to 4+4 curated themes:**
- Light: lofi (minimal monochrome), nord (cool blue-gray), emerald (fresh green), caramellatte (warm neutral)
- Dark: black (true OLED), dim (soft dark gray), coffee (dark roast), dracula (dev classic)
- All 8 are DaisyUI stock themes — no custom theme definitions needed.
- `LIGHT_THEMES` / `DARK_THEMES` in `themes.js` are now arrays of `{ id, name, description }` objects (was string arrays). The object shape matches the reference pattern and gives the theme picker UI real labels to show without a second lookup map.
- Validator sets (`lightSet`, `darkSet`) rebuilt via `.map(t => t.id)` so the `validLightTheme` / `validDarkTheme` API stays the same.

**Theme picker UI in burger menu:**
- New menu items in `Header.jsx` `menuItems` memo: one picker item per theme in the current mode, filtered by `state.darkMode`. Active theme gets the `highlight` class + a checkmark icon; inactive themes get the palette icon.
- `setTheme(themeName)` helper exported via `useAppDispatch()` — takes one arg, infers which mode the theme belongs to via `validLightTheme` / `validDarkTheme`, dispatches `SET_LIGHT_THEME` or `SET_DARK_THEME`. Unknown theme names are silently ignored (reducer guards).
- Each picker item has an explicit `ariaLabel` like "Use Nord theme (Cool blue-gray), currently active" so screen readers announce the full name, description, and active state.
- New SVG icons: `icons.palette` (theme item) and `icons.check` (active theme).
- Menu order: Quick Guide → User Guide → **Dark/Light mode toggle** → **4 theme items for current mode** → Save as PDF → Install App → Update Now.

**Cross-tab sync refactored to reference handler shape:**
- Previously our listener filtered theme name events by current mode — if tab A wrote `lightTheme=nord` while tab B was in dark mode, tab B's listener ignored the event (the new name would still be picked up via `getStoredTheme()` on the next toggle). Functionally equivalent but structurally diverged from the reference handler which updates per-mode state unconditionally.
- `AppContext.jsx` reducer now holds `lightTheme` and `darkTheme` as state alongside `darkMode`, matching the reference's implicit Approach A state shape.
- New reducer action types: `SET_LIGHT_THEME`, `SET_DARK_THEME`. All three theme-related actions (`SET_DARK_MODE`, `SET_LIGHT_THEME`, `SET_DARK_THEME`) have early-return guards to skip no-op dispatches so cross-tab events that replay the current value don't re-render.
- Cross-tab storage listener dispatches unconditionally for `darkMode`, `lightTheme`, and `darkTheme` — matches `setIsDark()` / `setLightThemeState()` / `setDarkThemeState()` in the reference.
- The single `darkMode` effect now subscribes to `[state.darkMode, state.lightTheme, state.darkTheme]` and calls `applyTheme(dark, dark ? darkTheme : lightTheme)`. The effect only re-runs when the currently-active mode's theme changes (React compares primitives by value, so updating `lightTheme` while in dark mode is a no-op DOM-wise but the value is stored correctly for next toggle).

**Initial state hydration:**
- `loadInitialState()` now reads `lightTheme` / `darkTheme` from localStorage via `validLightTheme` / `validDarkTheme` with the catalog defaults as fallback, matching the inline flash prevention script's allowlist validation.

**Documentation:**
- New `scripts/theme-config.js` with extensive header comment and selection rationale
- `scripts/generate-theme-meta.mjs` header rewritten to describe the four-file propagation
- `themes.js` top comment updated — removed the "currently one theme per mode / latent feature" caveat that's now obsolete
- BEGIN/END GENERATED comments in themes.js, styles.css, index.html explicitly warn "DO NOT edit by hand — will be overwritten on the next build; edit scripts/theme-config.js instead"
- `CLAUDE.md` architecture list adds `scripts/theme-config.js` and expands the generator description
- `docs/HISTORY.md`, `docs/TODO.md`, `docs/TESTING_GUIDE.md`, `docs/USER_GUIDE.md` all updated

**Deliberately NOT addressed (speculative abstraction per CLAUDE.md prohibitions):**
- CSP hash for inline flash prevention script — no CSP deployed today, computing hashes that nothing verifies is wasted work
- Legacy localStorage key cleanup (`theme`, `colorMode`, `dark-mode`) — we never wrote those keys, so the cleanup would be a no-op defending against a problem that can't exist

**Known quirks (pre-existing, not fixed this pass):**
- **Mount-time `darkMode` persistence limits OS preference fallback.** The reference handler comment says "Once the user toggles manually, their choice persists and OS changes are ignored" — but our darkMode `useEffect` calls `applyTheme()` on every mount, which calls `persistTheme()`, which writes `darkMode` unconditionally. On a fresh visit, mount stores whatever `matchMedia('(prefers-color-scheme: dark)').matches` returned (via `loadInitialState` fallback), and from that point forward the matchMedia listener's guard `safeStorageGet('darkMode') === null` is always false so OS changes are ignored. In practice this means the OS-follow behavior only spans the few milliseconds between page load and React mount. Pre-existing behavior that matches the reference pattern's unconditional `persistTheme`, but worth noting. Fix would require splitting "apply to DOM" from "persist to storage" so mount-time applyTheme skips persistence.

**Test coverage gaps (for future sessions):**
- **Browser runtime testing was NOT executed.** All smoke tests this session used `vite preview` + curl to fetch the built HTML/CSS/JS and `grep` for expected strings. The actual theme picker click flow, cross-tab sync via a real storage event fired between two browser tabs, Chart.js axis color sync on theme toggle, and the reducer's no-op-guard behavior under rapid dispatches were NOT exercised in a browser. The `node --input-type=module` smoke test (see commit `<hash>` end-to-end reducer/persistence test) exercised `persistTheme`, `validLightTheme`, `validDarkTheme`, and the catalog shape — but not the React tree. Next session should run the built dashboard in a real browser (ideally with the TESTING_GUIDE Theme section as a checklist) before considering the migration "verified".

**Build:** Passes (`npm run build`). Generator output visible in prebuild: all 8 themes with their hex values, all four downstream files "unchanged" on second run (idempotent). CSS bundle 150.64 KB → **157.40 KB** (+6.76 KB, +4.5%) from 6 additional DaisyUI theme blocks (each ~1 KB of CSS vars). 84 modules transform (unchanged — no new modules). All 8 `[data-theme="..."]` selectors present in built CSS. All 8 theme names ("Lo-Fi", "Nord", ..., "Dracula") and descriptions ("Minimal monochrome", ..., "Dev classic") present in built JS.

---

**Previous Updates (2026-04-12 — third pass):**

### Reference-pattern alignment — theme catalog module, applyTheme() helper, build-time meta generator, inline allowlist

After the full DaisyUI migration + regression fix landed, a side-by-side comparison against `docs/implementations/THEME_DARK_MODE.md` surfaced several divergences — theme name constants hardcoded in AppContext instead of a shared catalog, dual-layer DOM logic duplicated across three callsites instead of routed through a single `applyTheme()` helper, PWA meta colors hardcoded manually instead of being generated from DaisyUI's own oklch definitions, no theme ID validation, no forward-compat `lightTheme`/`darkTheme` storage keys, and no explicit `aria-label` on the theme toggle menu item. This pass addresses all of them:

**New files:**
- `scripts/generate-theme-meta.mjs` — reads each registered DaisyUI theme's `theme/*/object.js` via dynamic import, converts `--color-base-100` from oklch() to hex with an inlined ~30-line converter (no color library dependency), and writes `dashboard/js/generated/themeMeta.js` with `META_COLORS` / `IS_DARK` / `THEME_NAMES`. Runs as the first step of both `npm run dev` and `npm run build` so the generated file never drifts from DaisyUI.
- `dashboard/js/themes.js` — the theme catalog module. Exports `LIGHT_THEMES`, `DARK_THEMES`, `DEFAULT_LIGHT_THEME`, `DEFAULT_DARK_THEME`, `validLightTheme()`, `validDarkTheme()`, `getStoredTheme()`, `persistTheme()`, `getMetaColor()`, and — most importantly — `applyTheme(dark, themeName, skipPersist)`: the single place that mutates `.dark` class, `data-theme` attribute, `<meta name="theme-color">` content, and Chart.js defaults. Every theme-affecting caller now routes through this function.
- `dashboard/js/generated/themeMeta.js` — auto-generated, committed so dev works on a fresh clone. Header comment says DO NOT EDIT BY HAND. Regenerated by the prebuild hook on every build.

**Refactored:**
- `AppContext.jsx` darkMode `useEffect` is now a single-line `applyTheme(state.darkMode, getStoredTheme(state.darkMode))` call. The old 30-line inline DOM-mutation block — which had duplicated the same logic that the `index.html` flash prevention script and `App.jsx` embed override also duplicated — is gone. Removed the `LIGHT_THEME` / `DARK_THEME` / `LIGHT_META_COLOR` / `DARK_META_COLOR` module constants (moved to `themes.js`).
- `AppContext.jsx` cross-tab `storage` listener now handles three keys instead of one: `darkMode` (dispatches to reducer, which triggers the effect), `lightTheme` (calls `applyTheme(false, validLightTheme(newValue), true)` if the user is currently in light mode), `darkTheme` (same for dark mode). Forward-compat — today there's no UI for writing the per-mode keys, but when a theme picker is added the listener just works without a second pass.
- `App.jsx` embed override: `?theme=light|dark` now calls `applyTheme(..., true)` with `skipPersist=true` instead of doing its own `classList` + `setAttribute` + `setProperty` dance. `?bg=...` still sets `--color-base-100` directly since it's a pure override, not a theme swap.
- `index.html` inline flash prevention script gained a hardcoded allowlist (`LIGHT_THEMES = ['lofi']`, `DARK_THEMES = ['black']`) and a `validTheme(id, allowlist, fallback)` helper. Reads `lightTheme` / `darkTheme` from localStorage in addition to `darkMode`, validates each, falls back to defaults if the stored theme was removed. Uses the `META` map inline for meta theme-color content. Comment explicitly documents the four-place sync requirement (this script + `themes.js` + `styles.css` `@plugin` config + `generate-theme-meta.mjs REGISTERED_THEMES`).
- `Header.jsx` theme toggle menu item gained an explicit `ariaLabel: 'Switch to light mode' / 'Switch to dark mode'` that updates with state. Threaded through `HamburgerMenu.jsx` via a new `item.ariaLabel` prop (falls back to `item.label` for menu items that don't need a distinct screen-reader label).
- `package.json` `dev` / `build` / `build:lib` scripts all prefix with `node scripts/generate-theme-meta.mjs &&` so the generated theme meta is always fresh. Also exposes `npm run generate-theme-meta` for manual invocation after adding themes.

**Build:** Passes. CSS bundle is still **150.64 KB** (same as post-regression-fix — no CSS change in this pass). 84 modules transform (up from 82; two new modules: `themes.js` and `generated/themeMeta.js`). Smoke-tested via `vite preview` + curl: HTML contains `<html lang="en" class="dark" data-theme="black">`, both `<meta name="theme-color">` tags with media queries, inline script with allowlist + `validTheme` + META map. CSS contains both `[data-theme="lofi"]` and `[data-theme="black"]` selectors and all 14 critical custom class families (`.heatmap-0..4`, `.heatmap-cell`, `.filter-multi-select*`, `.settings-pane*`, `.detail-pane*`, `.error-boundary-card`, `.dashboard-header`, `.card`, `.btn-primary`, `.toast-success`).

---

**Previous Updates (2026-04-12 — second pass, regression fix):**

### Full DaisyUI v5 migration — infrastructure + CSS variable removal + 21-file component migration

Migrated the dashboard from partial custom-CSS-variable theming to fully DaisyUI-powered theming per `docs/implementations/THEME_DARK_MODE.md`. The migration went through all six reference phases (Phase 0 Prerequisites → Phase 1 Audit → Phase 2 Variable Removal → Phase 3 Component Migration → Phase 4 Z-Index (already normalized) → Phase 5 Verification → Phase 6 Cleanup) in a single pass.

**Phase 0 — Prerequisites:**
- Installed `daisyui@5` (5.5.19) as devDependency.
- Registered two curated themes: `lofi --default, black --prefersdark` via `@plugin "daisyui"` in `dashboard/styles.css`.
- Added `@layer base { html { color-scheme: light; } html.dark { color-scheme: dark; } }` for native form input / scrollbar theming.
- `<html>` element default is `class="dark" data-theme="black"`.

**Dual-layer theming wired up end-to-end:**
- `index.html` flash prevention inline script applies BOTH `.dark` class AND `data-theme` attribute before first paint, plus overwrites both `<meta name="theme-color">` tags so the PWA status bar color matches from the first frame.
- Two `<meta name="theme-color">` tags with `(prefers-color-scheme: light/dark)` media queries, defaults `#ffffff` (lofi base-100) and `#000000` (black base-100).
- `AppContext.jsx` darkMode `useEffect` calls `root.setAttribute('data-theme', ...)` and overwrites both meta tags' `content` on every toggle. Constants `LIGHT_THEME`, `DARK_THEME`, `LIGHT_META_COLOR`, `DARK_META_COLOR` live at module top and MUST stay in sync with the inline flash prevention script (inline scripts can't import ES modules — duplication unavoidable).
- Cross-tab `storage` event listener re-dispatches through the same effect, so other tabs pick up `.dark`, `data-theme`, AND meta theme-color in one place.

**Phase 2 — Custom variable removal (styles.css rewrite):**
- Deleted the old `:root` theme-token block and the entire `html.dark` override block. The new `:root` block holds ONLY non-theme design tokens: spacing (`--spacing-base`, `--section-gap`, etc.), radius (`--radius-sm/md/lg/full`), z-index scale (`--z-base` through `--z-debug`), and fonts (`--font-sans`, `--font-mono`).
- Every `var(--bg-primary)` → `var(--color-base-100)`, `var(--bg-secondary)` → `var(--color-base-200)`, `var(--bg-tertiary)` → `var(--color-base-300)`, `var(--bg-hover)` → `var(--color-base-300)`.
- Every `var(--text-primary)` → `var(--color-base-content)`, `var(--text-secondary/tertiary/muted)` → `color-mix(in oklab, var(--color-base-content) 80%/60%/40%, transparent)`.
- Every `var(--border-color)` → `var(--color-base-300)`, `var(--border-light)` → `var(--color-base-200)`.
- Deleted custom `--color-primary-alpha` / `--glow-primary/success/warning` / `--shadow` / `--shadow-lg` / `--chart-grid` variables — replaced each usage with `color-mix(in oklab, var(--color-primary) X%, transparent)` or an inline fixed value.
- Deleted the hardcoded `rgba(45, 104, 255, X)` brand-blue values (focus rings, hover backgrounds, drop-zone states, text-shadow, grid background) — all replaced with `color-mix` expressions against `var(--color-primary)` so the brand accent now follows the active DaisyUI theme.
- Deleted the whole Tailwind gray-override block (`.bg-gray-50`, `.text-gray-900`, `.hover\:bg-gray-100:hover`, etc.) and the "Semantic card backgrounds" / "Semantic text colors" Tailwind hijacks. JSX now uses DaisyUI tokens directly, so those hacks are obsolete.
- `.text-themed-primary/secondary/tertiary/muted` and `.bg-themed-primary/secondary/tertiary` and `.border-themed` utility classes deleted. All 166 consumers across 21 JSX files were migrated to DaisyUI Tailwind classes (`text-base-content`, `text-base-content/80`, `bg-base-200`, `border-base-300`, etc.).
- Toast, btn-primary, filter-preset-btn, filter-mode-toggle, project-link-primary, filter-badge, quick-guide-btn-primary all switched from `color: white` / `color: #1a1a1a` / `color: #fff` to DaisyUI `*-content` foreground tokens (`var(--color-primary-content)`, `var(--color-warning-content)`, etc.) so legibility tracks the theme.

**Phase 3 — Component migration (all 21 JSX files):**
- All 39 `dark:` Tailwind pairs removed from JSX. None remain as live class names (only in code comments explaining what was migrated).
- `Summary.jsx` Activity Snapshot cards: `bg-amber-50 dark:bg-amber-900/20` etc. → `bg-warning/15` + `text-warning`, `bg-info/15` + `text-info`, `bg-accent/15` + `text-accent`, `bg-secondary/15` + `text-secondary`. Each metric now gets a distinct DaisyUI token that auto-switches with the theme.
- `Timeline.jsx` complexity badges: purple/blue/gray tier colors → `bg-secondary/20 text-secondary` (high) / `bg-info/20 text-info` (medium) / `bg-base-300 text-base-content/80` (low).
- `Health.jsx` security panels: all `bg-red-50 dark:bg-red-900/20` + `border-red-200 dark:border-red-800` + `text-red-600 dark:text-red-400` → `bg-error/10` + `border-error/40` + `text-error`.
- `HealthBars.jsx` / `HealthAnomalies.jsx` / `Contributors.jsx` / `Tags.jsx` / `Timing.jsx` / `Progress.jsx` / `Discover.jsx` — progress-bar rails, hover states, and other neutral surfaces → `bg-base-300` / `hover:bg-base-200` / `hover:bg-base-300`.
- `App.jsx` embed override: now sets `--color-base-100` (DaisyUI token) instead of the removed `--bg-primary` alias, and also toggles `data-theme` attribute alongside the `.dark` class.
- `Tags.jsx` removed its per-component `useChartTextColor` hook and explicit `color: CHART_TEXT_COLOR` overrides — now relies on `ChartJS.defaults.color` being kept fresh by AppContext's darkMode effect. Single source of truth.

**Chart.js theme sync:**
- `AppContext.jsx` darkMode effect reads DaisyUI's `--color-base-content` oklch token and feeds it to `ChartJS.defaults.color` / `borderColor` via `color-mix(in oklab, ${baseContent} 80%/10%, transparent)`. Canvas parses color-mix() since Chrome 111 / Firefox 113 / Safari 16.2 — same baseline as DaisyUI.
- Each chart component already has `state.darkMode` as a `useMemo` dep (done in the 2026-04-11 session), so charts rebuild when the theme toggles and pick up the new `ChartJS.defaults.color`.

**Build:** Passes (`./node_modules/.bin/vite build`). CSS bundle **147.16 KB → 150.6 KB** (+3.5 KB, +2%) — the +2% comes from DaisyUI's theme selector blocks and semantic component classes (btn, card, modal, etc.) being added to the bundle. Deleted custom variables / gray overrides / utility classes partially offset the gain.

> **Regression caught and fixed 2026-04-12 (second pass):** the first migration commit on this branch reported a misleading 123 KB bundle size. The reduction turned out to be an artifact of a broken CSS comment — the rewritten `:root` block contained the literal sequence `--bg-*/--text-*/--border-*` inside a `/* ... */` block, and the embedded `*/` terminated the comment prematurely. `esbuild`'s CSS minifier silently dropped everything after that point, which included all heatmap, filter-multi-select, settings-pane, detail-pane, error-boundary, and several other custom class definitions. The build didn't fail but the dashboard would have rendered without any of those custom styles. Fixed by rephrasing the comment to avoid the `*/` sequence. Full smoke test added via `vite preview` + curl to verify all critical custom classes are present in the built CSS.

**Verification (Phase 5 10-point checklist):** Passed via code inspection — dual-layer attribute correctness, flash prevention, cross-tab sync, meta theme-color, Chart.js sync, system preference fallback, focus rings, print override, scroll lock, semantic tokens. Manual browser verification recommended before shipping (see `docs/TESTING_GUIDE.md` Theme section).

**Files changed (22):**
- `package.json`, `package-lock.json` (daisyui@5 devDep)
- `dashboard/styles.css` (rewrote top 200 lines, deleted legacy blocks, replaced 200+ var() references)
- `dashboard/index.html` (data-theme default, dual-layer flash prevention, meta theme-color tags)
- `dashboard/js/AppContext.jsx` (theme constants, dual-layer effect, Chart.js sync from --color-base-content)
- `dashboard/js/App.jsx` (embed override uses --color-base-100 + data-theme)
- `dashboard/js/main.jsx`, `dashboard/js/components/*.jsx` (13 files), `dashboard/js/sections/*.jsx` (9 files) — migrated text-themed-*/bg-themed-*/dark: classes to DaisyUI tokens
- `CLAUDE.md`, `docs/SESSION_NOTES.md`, `docs/HISTORY.md`, `docs/TODO.md`, `docs/TESTING_GUIDE.md`, `docs/USER_GUIDE.md`

---

**Previous Updates (2026-04-11):**

### React debug system — structured logging, DebugPill, clipboard fallbacks (9 commits)

Replaced the simple `{time, message, stack}` error array with a complete structured debug system per glow-props `DEBUG_SYSTEM.md` spec. Nine commits of incremental fixes and refactors — see `docs/HISTORY.md` for full commit chronology.

**New files:**
1. `js/debugLog.js` — Pub/sub circular buffer (200 entries) with typed entries (`id`, `timestamp`, `source`, `severity`, `event`, `details`). Console interception (`console.error`/`console.warn` patched with `__debugConsolePatched` HMR guard). Global `window.error`/`unhandledrejection` listeners (HMR guarded). `debugGenerateReport()` with URL query param redaction. Pre-React error bridge using `debugAdd` with optional timestamp parameter. Exported helpers: `formatDebugTime`, `safeStringify`. `diagnoseFailure` utility for API failure mode detection.
2. `js/copyToClipboard.js` — Three-tier clipboard fallback: ClipboardItem Blob → writeText → textarea. DebugPill adds a visible textarea with auto-select when all three fail.
3. `js/components/DebugPill.jsx` — React debug pill in separate root (`#debug-root`). Survives App crashes. Inline styles (survives CSS failures). Collapsed pill with entry count and error/warn badges. Expanded panel with 3 tabs: Log (color-coded, auto-scroll), Environment (runtime info, URL redacted), PWA Diagnostics (live probes: protocol, network, SW state, manifest with icon sizes/start_url/id, standalone, install prompt, browser info). Monotonic stale-run cancellation for diagnostics. Copy/Clear/Close actions. Embed skip at mount point (not conditional hooks). `setEntries([])` before subscribe for strict-mode safety. Timer ref cleanup on unmount.

**Modified files:**
4. `index.html` — Added `<div id="debug-root">`. Inline pill now stores `Date.now()` (was `toLocaleTimeString()`), added `fmtTime` helper, `render()` bails early when `window.__debugReactMounted` is true.
5. `main.jsx` — Mounts DebugPill in `#debug-root` (skipped in embed mode). RootErrorBoundary uses `debugAdd`. Boot events logged.
6. `ErrorBoundary.jsx`, `App.jsx`, `pwa.js`, `HamburgerMenu.jsx`, `Projects.jsx` — All error routing uses direct `debugAdd` imports instead of `window.__debugPushError` guards.

**Architecture:** Inline pill handles pre-React errors with its own local buffer and DOM banner. debugLog.js captures everything from module load onwards (console interception + global listeners + pre-React error bridge). React DebugPill subscribes to debugLog and takes over visual display when React mounts (inline banner hidden, inline `render()` bails early). The `window.__debugPushError` override in debugLog.js maintains backward compat for any remaining callers. No duplicate entries — explicit `debugAdd` callers don't also call `console.error`/`console.warn`, and console interception has an HMR guard.

**Process mistakes made this session:** Force-pushed an amended commit to fix a mixed-concerns useEffect instead of creating a new commit. Documented in `docs/AI_MISTAKES.md` (2026-04-11 entry).

### React migration hardening — 12 fixes across bugs, accessibility, and architecture

Systematic review and fix of all remaining non-React patterns, race conditions, and accessibility gaps.

**Bugs fixed:**
1. `body.style.overflow` race condition — App.jsx and QuickGuide.jsx independently set/cleared scroll lock, causing conflicts when multiple overlays were open. Created ref-counted `useScrollLock` hook.
2. Chart.js theme colors stale after dark/light toggle — CSS variables were read once at module load. Moved Chart.js color sync into AppContext's `darkMode` effect so charts update on theme toggle. Added `state.darkMode` to all 11 chart useMemo dependency arrays so react-chartjs-2 recreates options and calls `chart.update()` on theme change.
3. SettingsPane labels not linked to selects — `<label>` elements for work hour selects had no `htmlFor`/`id` association. Added proper label-select pairing.

**React migration:**
4. Heatmap tooltip converted from vanilla DOM to React portal — replaced `document.getElementById` + `classList` + manual positioning with `HeatmapTooltip.jsx` portal component.
5. Embed overrides moved from module scope into React lifecycle — `?theme=` and `?bg=` CSS overrides now run in `useEffect` instead of racing with AppContext's dark mode management.
6. URL parameter parsing consolidated — created `urlParams.js` module to parse `window.location.search` once instead of 4+ times across App.jsx and chartColors.js.

**Accessibility:**
7. FilterSidebar MultiSelect keyboard navigation — added ArrowUp/Down, Enter/Space, Escape, Home/End key handling with `aria-activedescendant` and `aria-multiselectable`.
8. Added `aria-label` to 12+ clickable elements in Health, Timeline, and Progress sections (summary cards, urgency/impact bars, epic bars, semver items, security repo buttons).

**Post-implementation review (second pass):**
9. Chart.js theme sync completed — added `state.darkMode` to all 11 chart useMemo deps across 5 section files so react-chartjs-2 recreates options on theme toggle.
10. HeatmapTooltip: added `role="tooltip"` + `aria-hidden`, fixed positioning useEffect missing dependency array (ran on every render).
11. Extracted inline spinner `style={{}}` to CSS classes (`.loading-spinner-sm/md/lg`) — 4 files cleaned.
12. Extracted heatmap cell inline size to CSS class (`.heatmap-cell-sm`).

**Documentation/cleanup:**
13. Documented heatmap-cell `z-index: 1` — comment explaining it's local grid stacking, not from the CSS variable scale.
14. Updated CLAUDE.md: architecture lists (HeatmapTooltip, useScrollLock, urlParams.js), fixed index.html description from "Minimal HTML" to accurate listing.
15. Verified QuickGuide.jsx matches current 6-tab structure (confirmed correct).
16. Updated USER_GUIDE.md with filter dropdown keyboard navigation instructions.
17. Fixed SESSION_NOTES backlog count and TODO.md timestamp.

**Build:** Passes (`npm run build`).

**Remaining work:** See `docs/TODO.md` — 3 backlog items (library build testing, stacking context, device attribution research).

**Previous Updates (2026-04-10):**

### Z-index scale — full audit and normalization
- Fixed 3 hardcoded `zIndex:'99999'` in `dashboard/index.html` → `zIndex:'80'` (matches `--z-debug: 80`)
- Fixed `.heatmap-tooltip` z-index: `var(--z-toast)` (70) → `var(--z-menu)` (50) — tooltips belong in menu/dropdown layer per Z_INDEX_SCALE pattern
- Updated CSS scale comment to reference `Z_INDEX_SCALE.md` (was `BURGER_MENU.md`)
- Added decision context comments: sub-layer rationale (21, 28, 58), inline debug pill z-80 explanation
- Added `@source not` directives excluding `public/data-commits/` and `public/repos/` from Tailwind scanning — commit history in JSON data files produced phantom z-index utilities (`z-[9999]`, `z-[100]`) in the build output
- Added z-index visual stacking test scenario to TESTING_GUIDE.md
- Documented hamburger backdrop stacking context limitation in TODO.md (backdrop trapped inside header z-21; drawers at z-30 render above it)
- Full audit of all 20 source z-index values — no ad-hoc values in source or build output
- Pattern reference: glow-props `docs/implementations/Z_INDEX_SCALE.md`

### Full APP_ICONS pattern parity with glow-props
- Added 180px `apple-touch-icon.png` to `generate-icons.mjs` icon pipeline
- Added 32x32 `favicon.ico` via manual ICO packing (zero extra dependencies)
- Script copies both to `dashboard/public/` for root-level serving
- `<link rel="apple-touch-icon">` and `<link rel="icon" type="image/x-icon">` added to `dashboard/index.html`
- Removed inline SVG data URL favicon — was a second icon source outside the pipeline. Now uses generated `favicon.png` (48px) as primary, `favicon.ico` (32px) as legacy fallback
- Build verified — both files in `dist/`, precached by Workbox (38 entries)
- Script now syncs all generated files to `dashboard/public/assets/images/` — no more manual copies or drift risk (resolved pre-existing TODO item)

**Previous Updates (2026-04-05):**

### X-Frame-Options fix for embeds
- Removed `X-Frame-Options: SAMEORIGIN` from vercel.json — it blocked cross-origin iframe embeds
- Root cause: H4 audit fix applied the header globally; dashboard is public/read-only with no auth, so clickjacking protection is unnecessary
- No changes needed in see-veo or other embedding apps — existing `?embed=` URLs work as before

### SW navigation fallback bypass for embeds (2026-04-06)
- Added `navigateFallbackDenylist: [/[?&]embed=/]` to Workbox config in vite.config.js
- Root cause: The PWA service worker precaches index.html with response headers. If the SW was installed when X-Frame-Options was still present, it served stale cached responses with the old header — blocking cross-origin iframes even after the header was removed from vercel.json. The iframe blocks before JS runs, so the SW never updates — a deadlock.
- Fix: Embed URL navigations now bypass the SW entirely and go directly to the network (Vercel), always getting current headers

### PWA improvements from cross-project review (2026-04-06)
Reviewed synctone, canva-grid, and few-lap PWA implementations. Full gap analysis identified 16 differences — all addressed:

**Update flow fixes:**
1. Removed `skipWaiting`/`clientsClaim` from workbox config — conflicted with `registerType:'prompt'`
2. User-initiated reload guard (`_userClickedUpdate`) on `controllerchange`
3. Post-update suppression (30s sessionStorage window)
4. `dismissUpdate()` — dismiss update prompt without applying
5. `_isChecking` state + `pwa-checking-update` event for UI loading feedback
6. Settle delay (1.5s) in `checkForUpdate()` and `visibilitychange`

**Version detection:**
7. `version.json` polling — catches deployments that don't change the SW file
8. Recovery script (30s) — clears caches, unregisters SW if app fails to mount. Watches `updatefound` for installing workers.

**Install improvements:**
9. `__pwaPromptReceived` diagnostic flag (inline HTML + pwa.js)
10. Display-mode change listener — detects browser-menu installs
11. Install analytics — `trackInstallEvent()` stores last 50 events in localStorage
12. `dismissInstall()` — persists to localStorage
13. Chrome 90-day cooldown note in install instructions
14. 5s diagnostic timeout if `beforeinstallprompt` hasn't fired on Chromium
15. 2-layer capture decision documented (vs few-lap's 3-layer — Vite loads modules faster than Metro)

**Infrastructure:**
16. `pwaConstants.js` — extracted all timing/threshold constants
17. `offline.html` — branded offline fallback page (precached)
18. `offlineReady` auto-dismiss after 3s
19. Vercel headers: `Cache-Control: no-cache` for HTML/sw.js/manifest, `immutable` for hashed assets, `Service-Worker-Allowed` for sw.js

**Previous Updates (2026-04-02):**

### Cross-project alignment with glow-props (24 items)
- CLAUDE.md text fixes, implementations extracted to `docs/implementations/` (8 files)
- HamburgerMenu rewritten with disclosure pattern, iOS Safari fixes, a11y
- Z-index scale convention (CSS variables `--z-base` through `--z-debug`)
- Safe localStorage wrappers in all modules
- Full light/dark theme with flash prevention, cross-tab sync, system preference
- `?data=` URL param, Vite library build, `--no-merges` flag in extract.js
- sharp added to devDependencies

### Full 9-trigger audit sweep (41 findings fixed)
- **Security:** URL validation for ?data= (SSRF), postMessage origin check, ?bg= hex validation, security headers in vercel.json, token source redacted from logs
- **Bugs:** Removed dark class override in main.jsx, per-file month error handling, 30s fetch timeout
- **Accessibility:** Backdrop overlays changed from aria-hidden to role="presentation", filter button touch targets increased, safe area insets for iOS
- **Debug:** ErrorBoundary routes to debug pill, SW errors to pill, network status in diagnostics, loading timeout increased to 20s
- **Performance:** Tag style cache, React.memo on HealthBars, work hours dedup in useHealthData
- **Docs:** TESTING_GUIDE updated (removed nonexistent features), USER_GUIDE theme section, CLAUDE.md dark mode status, QuickGuide Projects tab added
- **All components** (Header, TabBar, FilterSidebar, DetailPane, SettingsPane) wrapped in ErrorBoundary

**Build:** Passes (`npm run build`).

**Remaining work:** See `docs/TODO.md` — 2 backlog items (library build testing, device attribution research).
