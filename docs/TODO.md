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

## React Migration -- Remaining Issues

Issues identified during post-migration review that are not yet fixed.

### Accessibility (remaining)

1. [ ] **Clickable `<div>` elements without keyboard support in tab components** — Stat cards, bars, contributor cards, tag rows across all tabs use `<div onClick>` without `role="button"`, `tabIndex={0}`, or keyboard handlers. (Fixed in SettingsPane and CollapsibleSection; remaining in tab JSX.)
2. [ ] **Filter dropdowns have no ARIA attributes** — No `aria-expanded`, `aria-haspopup`, arrow-key navigation in `FilterSidebar.jsx`.
3. [ ] **Focus trap missing in DetailPane and SettingsPane** — Escape key and dialog roles added, but Tab key can still escape the pane.

### Code Quality (remaining)

4. [ ] **Body overflow conflict between overlays** — Both `DetailPane.jsx` and `SettingsPane.jsx` independently set `document.body.style.overflow`. If both are open and one closes, overflow is restored prematurely.
5. [ ] **Bidirectional state sync is fragile** — `AppContext.jsx` syncs React state to `globalState` (from `state.js`) via `useEffect` for `utils.js` compatibility. Global object lags behind React state by one render cycle.
6. [ ] **Module-level mutable cache in DiscoverTab** — `DiscoverTab.jsx:18` has `const fileNameCache = {}` that grows unboundedly and persists across data set changes.
7. [ ] **`escapeHtml()` still exported from `utils.js`** — No longer called anywhere; can be removed from `utils.js` entirely.

---

## Backlog

### Research
1. [ ] Device/platform attribution (mobile vs desktop commits)
2. [ ] Merge commit filtering options

---

*Last updated: 2026-02-10 - Fixed 15 of 22 post-migration issues. 7 remaining (accessibility depth, overflow conflict, state sync, cache, dead export).*
