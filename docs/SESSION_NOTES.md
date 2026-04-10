# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard V2:** Implementation complete with role-based view levels, light/dark theme, and PWA support.

**Recent Updates (2026-04-10):**

### Apple touch icon added
- Added 180px `apple-touch-icon.png` to `generate-icons.mjs` icon pipeline
- Script now generates to `assets/images/` and copies to `dashboard/public/` (served at `/apple-touch-icon.png`)
- `<link rel="apple-touch-icon">` added to `dashboard/index.html`
- Build verified — icon present in `dist/`, precached by Workbox via `globPatterns`
- Known issue: `dashboard/public/assets/images/` contains manual copies of other icons not synced by the generate script (pre-existing, tracked in TODO.md)

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

**Remaining work:** See `docs/TODO.md` — 3 backlog items (library build testing, icon sync automation, device attribution research).
