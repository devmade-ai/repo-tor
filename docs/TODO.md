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

## Backlog

### React + Tailwind Migration (Implemented 2026-02-10)

**Status:** Complete. Dashboard migrated from vanilla JS to React + Tailwind. Build passes, all tabs functional.

**What was done:**
- Added React 19, ReactDOM, react-chartjs-2, @vitejs/plugin-react
- Created AppContext.jsx with useReducer state management (replaces global mutable state)
- Converted 880-line index.html → simplified root div + 20 React components
- All 9 tab modules rewritten as React components with useMemo-based computation
- Charts migrated to react-chartjs-2 declarative components
- Delegated event handlers eliminated — replaced by React onClick props
- Filter sidebar converted to controlled React components
- Detail pane, settings pane, collapsible sections all React components
- utils.js and styles.css preserved unchanged (global state sync via useEffect for compat)
- Vite config updated with React plugin; PWA configuration unchanged

#### Scope Breakdown

| Area | Effort | Lines Affected | Notes |
|------|--------|---------------|-------|
| Tailwind classes | Minimal | 0 (no rewrite) | `class` → `className` in JSX, otherwise identical |
| HTML → JSX components | Moderate | ~880 lines decomposed into ~20 components | Mechanical: `class`→`className`, `onclick`→`onClick`, self-closing tags |
| State management | Moderate | ~188 lines (state.js) | Global `state` → React Context + `useReducer`. Shape maps directly. |
| Tab rendering | Moderate | ~1,810 lines (9 tab modules) | Each `renderXxx()` becomes a React component. Logic stays, DOM writes become JSX returns. |
| Chart.js lifecycle | Moderate | ~480 lines (charts.js) | Replace manual destroy/recreate with `react-chartjs-2` or `useEffect` + refs. ~8 chart instances. |
| Delegated handlers | Low | ~264 lines (eliminated) | React synthetic events replace entirely. Routing logic moves to component `onClick` props. |
| Filters | Moderate-High | ~593 lines (most complex module) | Multi-select dropdowns, include/exclude toggles, date pickers → controlled components. |
| UI (detail pane, settings, sidebar) | Moderate | ~365 lines | Slide-out panels become components with open/closed state. CSS transitions stay. |
| PWA | Low | ~308 lines (barely changes) | `vite-plugin-pwa` works identically with React. |
| Export / URL state | Low-Moderate | ~378 lines | URL param logic moves to React Router or stays as-is with `useEffect`. |
| Utils | None | ~612 lines (unchanged) | Pure functions — no DOM, no state. Works as-is. |

**Totals:**
- ~3,500 lines need rewriting (DOM-touching code)
- ~1,000 lines transfer unchanged (utils, data loading, PWA)
- ~20-25 new React components to create

#### What You Gain
- Declarative rendering (no manual DOM sync bugs)
- Component isolation and testability
- Better developer ergonomics for future features
- React ecosystem access (routing, forms, testing libraries)

#### What You Don't Gain
- Performance — vanilla JS is already fast for this dashboard size; React adds virtual DOM overhead
- Simpler code — total line count stays similar or increases (component boilerplate, hooks, context providers)
- Better Tailwind — already using Tailwind effectively

#### Risk Areas
1. **Chart.js lifecycle** — destroy/recreate pattern is error-prone in React. Needs careful `useEffect` cleanup or wrapper library.
2. **Filter complexity** — `filters.js` has the most intertwined state logic. Converting to controlled components while preserving include/exclude, multi-select, and localStorage sync requires care.
3. **Regression risk** — No automated tests exist. Every tab's output must be verified visually.

#### Recommended Approach (If Proceeding)
- **Incremental migration** — Mount React into specific containers while the rest stays vanilla, one tab at a time.
- **Framework choice** — Consider Preact (3KB, React API) or Svelte (compiles away) over full React, given the project's simplicity goals.
- **Vite foundation stays** — Vite + Tailwind v4 config requires minimal changes.

### Research
1. [ ] Device/platform attribution (mobile vs desktop commits)
2. [ ] Merge commit filtering options

---

*Last updated: 2026-02-10 - Codebase refactoring: template helpers, complete event delegation, tabs.js split into 10 modules.*
