# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard V2:** Implementation complete with role-based view levels, consistent section layouts, and PWA support.

**Recent Updates (2026-04-02 — Cross-project alignment with glow-props):**

Compared repo-tor CLAUDE.md against glow-props shared CLAUDE.md and all suggested implementations. Implemented all 24 identified items:

- **CLAUDE.md:** Fixed terminology (class → component), added React-specific quality checks, build tools check, QuickGuide sync note
- **Implementations restructured:** Extracted ~200 lines from CLAUDE.md to 8 files in `docs/implementations/`, added Burger Menu and Theme & Dark Mode references
- **HamburgerMenu:** Rewrote with disclosure pattern (not ARIA menu), iOS Safari backdrop fix, `useId()`, `hasBeenOpenRef`, `cancelAnimationFrame`, `overscroll-contain`
- **Z-index scale:** CSS variables `--z-base` through `--z-debug` (10-80 scale), all hardcoded values replaced
- **Safe localStorage:** `safeStorageGet`/`safeStorageSet`/`safeStorageRemove` in utils.js, all raw localStorage calls replaced across AppContext, Discover, pwa.js, QuickGuide, index.html
- **sharp:** Added to devDependencies for generate-icons.mjs
- **Dark mode:** Full light theme CSS variables (`:root` = light, `html.dark` = dark), flash prevention `<script>` in `<head>`, cross-tab sync via `storage` event, system preference fallback via `matchMedia`, `SET_DARK_MODE` reducer action in AppContext
- **Embedding:** `?data=<url>` query param support in App.jsx, Vite library build config (`vite.config.lib.js`, `js/lib.js`, `npm run build:lib`)
- **Extraction:** `--no-merges` CLI flag in extract.js
- **Research:** Device/platform attribution infeasible with native git data

**New files:**
- `docs/implementations/` — 8 implementation reference files (PWA, Debug, Icons, PDF, Timer, Proxy, Burger, Theme)
- `dashboard/js/lib.js` — Library entry point
- `vite.config.lib.js` — Library build config

**Modified files:** CLAUDE.md, styles.css, HamburgerMenu.jsx, utils.js, AppContext.jsx, App.jsx, pwa.js, QuickGuide.jsx, Discover.jsx, index.html, package.json, extract.js, TODO.md, HISTORY.md

**Build:** Passes (`npm run build`). All changes tested.

**Remaining work:** See `docs/TODO.md` — only 2 items remain (library build consumer testing, device attribution research).
