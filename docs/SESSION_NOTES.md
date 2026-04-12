# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard V2:** Implementation complete with role-based view levels, light/dark theme (now DaisyUI-based with dual-layer theming), and PWA support.

**Recent Updates (2026-04-12):**

### DaisyUI dark mode migration — Phase 0 + infrastructure + partial component migration

Migrated from partial custom-CSS-variable theming to DaisyUI v5 per `docs/implementations/THEME_DARK_MODE.md`. Existing custom variables coexist with DaisyUI during the transition — no big-bang rewrite of `styles.css`.

**Infrastructure (done):**
- Installed `daisyui@5` (5.5.19) as devDependency.
- Registered two themes: `lofi --default, black --prefersdark` via `@plugin "daisyui"` in `dashboard/styles.css`.
- Added `@layer base { html { color-scheme: light; } html.dark { color-scheme: dark; } }` for native form input theming.
- `<html>` element now has both `class="dark"` and `data-theme="black"` defaults.
- Flash prevention inline script (`index.html`) updated to set **both** `.dark` class and `data-theme` attribute before first paint, plus overwrites `<meta name="theme-color">` tags so the PWA status bar color matches the active theme from the first frame.
- Two `<meta name="theme-color">` tags added with `(prefers-color-scheme: light/dark)` media queries (defaults `#ffffff` for lofi, `#000000` for black).
- `AppContext.jsx` `darkMode` effect extended to set `data-theme` and update meta theme-color tags on every toggle. Theme name + meta color constants defined at module top (must stay in sync with inline script — duplication unavoidable).
- Cross-tab sync via `storage` event listener already existed; verified it still applies `.dark`, `data-theme`, and meta theme-color correctly via the shared effect.

**Component migration (~30 of 39 `dark:` pairs collapsed):**
- `HealthBars.jsx`, `HealthAnomalies.jsx`, `Contributors.jsx`, `Tags.jsx`, `Timing.jsx`, `Progress.jsx`, `Discover.jsx`, `Timeline.jsx`, `Health.jsx` — neutral gray progress-bar rails and hover states migrated to `bg-base-300` / `hover:bg-base-200` / `hover:bg-base-300`.
- `Health.jsx` security indicators migrated to DaisyUI `error` semantic token (`bg-error/10`, `border-error/40`, `text-error`).
- **NOT migrated** (data viz category colors per the reference doc's "What NOT to migrate" list): `Summary.jsx` stat cards (amber/indigo/pink/purple for distinct categories) and `Timeline.jsx` complexity badges (purple=high, blue=medium).

**Remaining migration work** (deferred, tracked in `docs/TODO.md`):
- 202 `var(--color-*)` / `var(--bg-*)` references in `styles.css` — these still work; removal requires rewriting each CSS rule with DaisyUI semantic classes.
- Component class migration — `<button>` → `btn`, `<input>` → `input input-bordered`, custom cards → `card`, custom badges → `badge`, etc. None migrated yet.

**Build:** Passes (`./node_modules/.bin/vite build`). CSS bundle 147.16 KB → 146.06 KB.

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
