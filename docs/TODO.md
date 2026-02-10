# TODO

Remaining tasks for Git Analytics Reporting System.

**Design:** See [DASHBOARD_V2_DESIGN.md](DASHBOARD_V2_DESIGN.md) for full specification.

---

## ⚠️ Untested / Known Issues

**IMPORTANT FOR AI:** These features were built but NOT tested. Test before using or recommending.

### API Extraction (`extract-api.js`) - SETUP AVAILABLE
- Built to extract via GitHub API instead of cloning
- **Requires:** `gh` CLI installed AND authenticated
- **Setup:** Run `./scripts/setup-gh.sh` (installs + authenticates)
- **Status:** Setup script created, awaiting user to run and test
- **Fallback:** Use `--clone` flag for clone-based extraction

### To test API extraction:
1. Run setup: `./scripts/setup-gh.sh`
2. Test with: `node scripts/extract-api.js devmade-ai/repo-tor --output=reports/`
3. If it works, remove this warning section
4. If it fails, use `./scripts/update-all.sh --clone` instead

---

## React Migration -- Post-Migration Issues (2026-02-10)

Review of the React migration found the following issues, organized by severity.

### Critical

1. [ ] **Dead vanilla JS files still in codebase** — 17 pre-React files remain: `main.js`, `filters.js`, `ui.js`, `export.js`, `data.js`, `tabs.js`, and all `tabs/*.js` files. They inflate the repo and cause confusion. Should be deleted.
2. [ ] **`pwa.js` imports from dead `ui.js`, pulling vanilla JS into the bundle** — `pwa.js:11` imports `showToast` from `./ui.js`, which chains to `filters.js` → `tabs.js` → every vanilla tab module. This explains the 472KB bundle and 70 modules transformed. Either rewrite PWA as a React hook or remove the `ui.js` dependency.
3. [ ] **`pwa.js` targets DOM IDs that don't exist in React** — Calls `document.getElementById('btn-pwa-install')`, `'btn-pwa-update'`, etc. These existed in old vanilla HTML but the React components render different elements. PWA install/update UI is likely non-functional.
4. [ ] **`charts.js` imports `getFilteredCommits` from dead `filters.js`** — Top-level import at `charts.js:3` pulls `filters.js` and its dependencies into the bundle even though the two functions React uses (`aggregateByWeekPeriod`, `aggregateByDayPeriod`) don't need it.
5. [ ] **No error boundaries** — A single bad commit record or unexpected null in any tab will crash the entire dashboard to a white screen. Wrap tab content areas in an error boundary component.

### Functional

6. [ ] **`isDragOver` state in `App.jsx:63` is unused** — Declared but never read or set. DropZone handles its own drag state internally.
7. [ ] **`isMobile` never triggers re-render on resize** — `AppContext.jsx:246` defines `isMobile` as `useCallback(() => window.innerWidth < 640, [])`. Chart useMemo hooks list `isMobile` as a dependency, but since the function reference is stable, charts never recompute mobile-specific options when the viewport changes.
8. [ ] **`escapeHtml()` is unnecessary in React** — `utils.js:7-11` creates `document.createElement('div')` to escape text. React auto-escapes JSX. `DetailPane.jsx` calls it during render (lines 74, 77), creating throwaway DOM elements. Five other `.jsx` files import it but never use it.
9. [ ] **`getTagStyle()` returns CSS strings — vanilla JS pattern** — `utils.js:234-242` returns raw CSS strings. Four React components each duplicate a `parseInlineStyle()` helper to convert to React style objects. Should return a React-compatible object directly.
10. [ ] **`parseInlineStyle()` duplicated in 4 files** — Identical in `DetailPane.jsx:14`, `TimelineTab.jsx:12`, `ContributorsTab.jsx:10`, `TagsTab.jsx:7`. Extract to shared utility or eliminate by fixing `getTagStyle()`.

### Accessibility

11. [ ] **TabBar missing ARIA tab pattern** — No `role="tablist"`, `role="tab"`, `aria-selected`, or arrow-key navigation.
12. [ ] **Overlays/panels lack dialog semantics** — `DetailPane.jsx`, `SettingsPane.jsx`, `FilterSidebar.jsx` have no `role="dialog"`, `aria-modal`, focus trap, or Escape key handler.
13. [ ] **Clickable `<div>` elements without keyboard support** — Stat cards, bars, contributor cards, tag rows across all tabs use `<div onClick>` without `role="button"`, `tabIndex={0}`, or keyboard handlers.
14. [ ] **Filter dropdowns have no ARIA attributes** — No `aria-expanded`, `aria-haspopup`, arrow-key navigation, or Enter/Space selection in `FilterSidebar.jsx`.
15. [ ] **Settings toggles are non-interactive divs** — View-level and UTC toggles in `SettingsPane.jsx` act as radio buttons/toggle switches but have no role, tabIndex, or keyboard support.
16. [ ] **Close buttons lack `aria-label`** — SVG-only close buttons in `DetailPane.jsx:56` and `SettingsPane.jsx:61`.

### Code Quality

17. [ ] **Leftover `data-*` attributes from vanilla JS** — `data-tab` in `TabBar.jsx`, `data-summary-card` in `SummaryTab.jsx`, `data-work-card` in `ProgressTab.jsx`, `data-section` in `CollapsibleSection.jsx`/`TimingTab.jsx`. No longer serve any purpose.
18. [ ] **Index-based React keys on dynamic lists** — `DiscoverTab.jsx:469` (shuffleable metric cards), `TimingTab.jsx:385` (developer patterns), `SummaryTab.jsx:182` (highlights), `DiscoverTab.jsx:534` (comparisons).
19. [ ] **Body overflow conflict between overlays** — Both `DetailPane.jsx` and `SettingsPane.jsx` independently set `document.body.style.overflow`. If both are open and one closes, overflow is restored prematurely.
20. [ ] **Bidirectional state sync is fragile** — `AppContext.jsx:206-214` syncs React state to `globalState` (from `state.js`) via `useEffect` for `utils.js` compatibility. Global object lags behind React state by one render cycle.
21. [ ] **Module-level mutable cache in DiscoverTab** — `DiscoverTab.jsx:18` has `const fileNameCache = {}` that grows unboundedly and persists across data set changes.
22. [ ] **Docs reference old file structure** — `SESSION_NOTES.md` Key Files table still lists `js/main.js`, `js/state.js`, `js/tabs.js`. CLAUDE.md doesn't fully reflect the React component structure.

---

## Backlog

### Research
1. [ ] Device/platform attribution (mobile vs desktop commits)
2. [ ] Merge commit filtering options

---

*Last updated: 2026-02-10 - Post-React-migration review: 22 issues documented across critical, functional, accessibility, and code quality categories.*
