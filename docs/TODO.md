# TODO

Implementation tasks for Git Analytics Reporting System.

**Design:** See [DASHBOARD_V2_DESIGN.md](DASHBOARD_V2_DESIGN.md) for full specification.

---

## Priority 1: Aggregation Script - COMPLETE

*Read from processed/ data, output dashboard-ready JSON*

- [x] Create `scripts/aggregate-processed.js`
  - [x] Read all `processed/<repo>/batches/*.json` files
  - [x] Combine commits from all repos
  - [x] Calculate summary aggregations:
    - [x] `tagBreakdown` - count per tag
    - [x] `complexityBreakdown` - count per level (1-5)
    - [x] `urgencyBreakdown` - count per level (1-5)
    - [x] `impactBreakdown` - count per category
  - [x] Calculate monthly aggregations:
    - [x] `monthly.*.commits` - count per month
    - [x] `monthly.*.avgComplexity` - average per month
    - [x] `monthly.*.avgUrgency` - average per month
    - [x] `monthly.*.tags` - tag counts per month
    - [x] `monthly.*.impact` - impact counts per month
  - [x] Calculate contributor aggregations:
    - [x] `contributors.*.tagBreakdown` - per person
    - [x] `contributors.*.avgComplexity` - per person
    - [x] `contributors.*.avgUrgency` - per person
    - [x] `contributors.*.impactBreakdown` - per person
  - [x] Output files:
    - [x] `dashboard/data.json` - overall (all repos)
    - [x] `dashboard/repos/<repo>.json` - per-repo (same schema)

---

## Priority 2: Dashboard Structure - COMPLETE

*Reorganize from 7 tabs to 4 grouped tabs with detail pane*

- [x] Create new tab structure:
  - [x] **Overview** - Executive summary (migrated from Summary)
  - [x] **Activity** - Timeline + Timing combined
  - [x] **Work** - Progress + Tags + Contributors combined
  - [x] **Health** - Security + Urgency (new)

- [x] Implement detail pane component:
  - [x] Slide-out panel (30% width on desktop)
  - [x] Bottom sheet variant for mobile
  - [x] Close button / click-outside to dismiss
  - [x] Smooth transition animations

- [x] Wire up click interactions:
  - [x] Cards → show related commits
  - [x] Chart segments → show filtered commits
  - [x] Contributors → show person's commits
  - [x] Tags → show tagged commits

---

## Priority 3: New Visualizations - COMPLETE

*Urgency and Impact charts for new data dimensions*

### Urgency (Health Tab)
- [x] Urgency Distribution - horizontal bars (Planned/Normal/Reactive)
- [x] Urgency Trend - line chart by month (lower is better)
- [x] Urgency by Contributor - stacked bars per person

### Impact (Health Tab)
- [x] Impact Distribution - horizontal bars (user-facing/internal/infra/api)
- [x] Impact Over Time - stacked bar chart by month
- [x] Impact by Contributor - stacked bars per person

### Overview Cards
- [x] Avg Urgency card with trend indicator
- [x] % Planned card (urgency 1-2 ratio)

### Health Tab Cards
- [x] Security count card
- [x] Reactive % card (urgency 4-5)
- [x] Weekend % card
- [x] After Hours % card

---

## Priority 4: Polish (Optional)

- [x] Dark mode for new components (charts re-render on toggle)
- [ ] Loading states for detail pane content
- [ ] PDF export updates for new layout
- [ ] Shareable links for detail pane state

---

## Extraction - COMPLETE

All repositories processed with `@data feed the chicken`:

| Repo | Status | Commits |
|------|--------|---------|
| chatty-chart | ✅ Complete | 42 |
| repo-tor | ✅ Complete | 250 |
| social-ad-creator | ✅ Complete | 184 |
| model-pear | ✅ Complete | 318 |
| coin-zapp | ✅ Complete | 81 |
| synctone | ✅ Complete | 288 |

**Total:** 1163 commits analyzed

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

## Future / Backlog

### Role-Based View Levels - COMPLETE
*Different data granularity for different audiences - same layout, same charts, different detail levels*

- [x] Role configuration & state
  - [x] VIEW_LEVELS config (executive/management/developer)
  - [x] currentViewLevel state variable
  - [x] localStorage persistence
- [x] Aggregation layer functions
  - [x] `aggregateContributors()` - total/repo/individual
  - [x] `renderWeeklyHeatmap()` / `renderDailyHeatmap()` - different time views
  - [x] `aggregateForDrilldown()` - summary stats vs commit list
  - [x] `aggregateByTag()` helper
- [x] Modify render functions for view levels
  - [x] `renderContributors()` - different groupings
  - [x] `renderTiming()` / heatmap - different granularity
  - [x] `openDetailPane()` - summary vs commits
  - [x] `renderDrilldownSummary()` - new summary view
- [x] UI role selector (in filter area)

| View | Contributors | Timing | Drilldown |
|------|-------------|--------|-----------|
| Executive | "All (45)" | Weekly | Stats only |
| Management | "repo-api (12)" | Daily | Stats + repo split |
| Developer | "Alice Chen" | Hourly | Full commit list |

### Global Filters
- [ ] Filter bar visible on all tabs
- [ ] Repo selector (when viewing overall)
- [ ] Date range picker
- [ ] Author filter
- [ ] Tag / Urgency / Impact filters
- [ ] Active filter indicator in header

### Research
- [ ] Device/platform attribution (mobile vs desktop commits)
- [ ] Merge commit filtering options
- [ ] PWA offline support

---

*Last updated: 2026-01-24 - Role-based view levels implemented (Executive/Management/Developer).*
