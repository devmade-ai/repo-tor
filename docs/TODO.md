# TODO

Remaining tasks for Git Analytics Reporting System.

**Design:** See [DASHBOARD_V2_DESIGN.md](DASHBOARD_V2_DESIGN.md) for full specification.

---

## Polish

1. [x] Loading states for detail pane content
2. [x] PDF export updates for new layout
3. [x] Shareable links for detail pane state (URL hash params for tab, filters, detail view)

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

### Filters
4. [x] Add urgency filter dropdown
5. [x] Add impact filter dropdown
6. [x] Quick select filter presets (e.g., "Last 30 days", "This quarter", "Since v2.0")
7. [x] Per-filter mode toggles (Include/Exclude) with multi-select checkboxes

### Visual Enhancements
8. [x] Make theme more "techy" (consider monospace fonts, terminal-inspired styling, glowing accents)

### Research
9. [ ] Device/platform attribution (mobile vs desktop commits)
10. [ ] Merge commit filtering options
11. [x] PWA offline support (service worker + manifest + install prompt + SVG icon)
12. [x] PWA install help in Settings panel with status and manual instructions

---

*Last updated: 2026-02-04 - Added per-filter modes and PWA help.*
