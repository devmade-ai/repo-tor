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

### UI/UX Improvements (from 2026-02-07 review)
1. [ ] Tab name mismatch: buttons say "Breakdown"/"Risk" but docs/code say "Work"/"Health"
2. [ ] "Inc"/"Exc" filter toggle labels are cryptic - consider "Include"/"Exclude"
3. [ ] Changes list capped at 100 with no "Load more" or pagination
4. [ ] File Activity always shows humorous names even with privacy mode off - add toggle for real paths
5. [ ] `applyFilters()` re-renders ALL tabs - only render the active tab, lazy-render on switch
6. [ ] Event listeners re-attached on every render without cleanup (renderHealth, renderTags, etc.)
7. [ ] Heatmap uses native `title` tooltips - custom tooltip would work on touch and respond faster
8. [ ] Tailwind loaded via CDN (dev-only) - consider build-time Tailwind for production
9. [ ] Custom filter dropdowns not keyboard navigable (divs with click handlers)
10. [ ] Color-only information in urgency/impact bars - no pattern/text within segments

### Research
1. [ ] Device/platform attribution (mobile vs desktop commits)
2. [ ] Merge commit filtering options

---

*Last updated: 2026-02-07 - Added UI/UX backlog items from review.*
