# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard V2:** Implementation complete with role-based view levels, light/dark theme, and PWA support.

**Recent Updates (2026-04-05):**

### X-Frame-Options fix for embeds
- Removed `X-Frame-Options: SAMEORIGIN` from vercel.json — it blocked cross-origin iframe embeds
- Root cause: H4 audit fix applied the header globally; dashboard is public/read-only with no auth, so clickjacking protection is unnecessary
- No changes needed in see-veo or other embedding apps — existing `?embed=` URLs work as before

### SW navigation fallback bypass for embeds (2026-04-06)
- Added `navigateFallbackDenylist: [/[?&]embed=/]` to Workbox config in vite.config.js
- Root cause: The PWA service worker precaches index.html with response headers. If the SW was installed when X-Frame-Options was still present, it served stale cached responses with the old header — blocking cross-origin iframes even after the header was removed from vercel.json. The iframe blocks before JS runs, so the SW never updates — a deadlock.
- Fix: Embed URL navigations now bypass the SW entirely and go directly to the network (Vercel), always getting current headers

### PWA improvements from cross-project review (2026-04-06)
Reviewed synctone, canva-grid, and few-lap PWA implementations. Applied 4 improvements:
1. **Removed `skipWaiting`/`clientsClaim`** from workbox config — conflicted with `registerType:'prompt'`, causing auto-reloads before user could see update prompt
2. **User-initiated reload guard** on `controllerchange` — only reloads when user clicks "Update", not on background SW lifecycle events (pattern from synctone/few-lap)
3. **Post-update suppression** — 30-second sessionStorage window after update prevents false re-detection of the update prompt (pattern from synctone/few-lap)
4. **Recovery script** in index.html — if React hasn't mounted after 30s, clears caches, unregisters SW, and reloads. Limited to 2 attempts via sessionStorage to prevent infinite loops (pattern from synctone/few-lap)
5. **version.json polling** — `scripts/write-build-version.mjs` writes build timestamp to `dashboard/public/version.json` at build time. pwa.js fetches it on startup (3s delay), hourly, and compares with localStorage. Detects deployments that don't change the SW file (e.g. vercel.json-only changes). `version.json` is gitignored, not precached, and served with `Cache-Control: no-cache` via vercel.json
6. **Settle delay** (1.5s) added to `checkForUpdate()` and `visibilitychange` handler — `reg.update()` is async and `reg.waiting` may not be populated immediately

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
