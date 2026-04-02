# TODO

Remaining tasks for Git Analytics Reporting System.

**Design:** See [DASHBOARD_V2_DESIGN.md](DASHBOARD_V2_DESIGN.md) for full specification.

---

## Cross-Project Alignment (glow-props)

Changes identified by comparing repo-tor's CLAUDE.md against glow-props' shared CLAUDE.md and suggested implementations.

### CLAUDE.md Updates

1. [ ] Fix Code Organization terminology: "400 lines (class)" → "400 lines (component)", "600 lines (class)" → "600 lines (component)" — this is a React project, not class-based
2. [ ] Quality Checks: replace generic "Security concerns" and "Performance issues" with React-specific versions from glow-props (XSS via dangerouslySetInnerHTML, missing keys, unnecessary re-renders)
3. [ ] AI Notes: add build tools check — "Run `npm install` or verify `node_modules/.bin/vite` exists before attempting `npm run build`"
4. [ ] AI Notes: add QuickGuide sync note — "CRITICAL: Keep `QuickGuide.jsx` up to date — this is user-facing help content. When tabs, sections, or features change, update the guide to match."
5. [ ] Extract inlined Suggested Implementations (~200 lines) to `docs/implementations/` files, replace with summary table linking to them
6. [ ] Add Burger Menu suggested implementation reference (glow-props pattern with a11y, iOS Safari, focus management)
7. [ ] Add Theme & Dark Mode suggested implementation reference (adapted for non-DaisyUI: flash prevention, cross-tab sync, safe localStorage, system preference fallback)

### HamburgerMenu Accessibility & iOS Fixes

8. [ ] Add `cursor-pointer` on backdrop overlay — iOS Safari silently fails to close menu without it
9. [ ] Add `useId()` for `aria-controls` — prevents ID collisions if component is reused
10. [ ] Add `hasBeenOpenRef` focus guard — prevents stealing focus on initial mount
11. [ ] Add `cancelAnimationFrame` cleanup — prevents callback on unmounted component
12. [ ] Add `overscroll-contain` on menu card — prevents scroll chaining without body overflow hacks
13. [ ] Audit disclosure pattern — ensure no `role="menu"` / `aria-haspopup` (wrong ARIA semantics for nav)

### Layout & Infrastructure

14. [ ] Adopt z-index scale convention from glow-props (0–80 scale) as CSS variables in styles.css; audit existing z-index usage across components for consistency
15. [ ] Add safe localStorage wrappers (`safeStorageGet`/`safeStorageSet` in utils.js) — prevents crashes in sandboxed iframes and enterprise environments; replace raw localStorage calls throughout
16. [ ] Add `sharp` to devDependencies — generate-icons.mjs requires it but it's not in package.json

### Dark Mode Improvements

17. [ ] Light theme CSS variables — currently only dark theme is fully defined (moved from Embedding backlog)
18. [ ] Flash prevention — add inline `<script>` in `<head>` to apply dark/light theme before first paint, preventing white flash on load
19. [ ] Cross-tab theme sync — add `storage` event listener so toggling dark/light mode in one tab syncs to other open tabs
20. [ ] System preference fallback — respect `prefers-color-scheme: dark` on first visit; persist after manual toggle

---

## Backlog

### Embedding

1. [ ] Optional: Accept data URL via `?data=` query param
2. [ ] Optional: Vite library build for direct React component import

### Research

1. [ ] Device/platform attribution (mobile vs desktop commits)
2. [ ] Merge commit filtering options

---

*Last updated: 2026-04-02 — Added cross-project alignment items from glow-props CLAUDE.md comparison. Removed postMessage data push TODO (explicitly rejected in chartColors.js in favor of URL params; resize messages already implemented).*
