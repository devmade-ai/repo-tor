# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard V2:** Implementation in progress. 4-tab structure complete, urgency/impact visualizations added.

**Extraction System:** AI analysis in progress. Manifest-based incremental tracking implemented.

**Live Dashboard:** https://devmade-ai.github.io/repo-tor/ (being updated to V2)

---

## Dashboard V2 Progress

### Completed

- [x] **Aggregation script** - `scripts/aggregate-processed.js` reads from processed/ data
- [x] **4-tab structure** - Overview, Activity, Work, Health
- [x] **Tab mapping** - JavaScript maps new tabs to show multiple content containers
- [x] **Urgency/Impact in Health tab** - Distribution bars, operational health cards
- [x] **Urgency/Planned in Overview** - Executive summary cards

### Remaining

- [ ] **Detail pane** - Slide-out panel for drill-down
- [ ] **Urgency trend chart** - Line chart over time
- [ ] **Impact by contributor** - Per-person breakdown
- [ ] **Click interactions** - Cards/charts trigger detail pane

### Design Decision

Hybrid approach: **Logical Groupings + Contextual Detail Pane**

- **4 tabs** (down from 7): Overview, Activity, Work, Health
- **Detail pane** slides out when clicking any element (TODO)
- **Mobile:** Bottom sheet instead of side pane (TODO)

### Tab Mapping

The JavaScript TAB_MAPPING connects new tabs to existing content:

```javascript
const TAB_MAPPING = {
    'overview': ['tab-overview'],
    'activity': ['tab-activity', 'tab-timing'],
    'work': ['tab-progress', 'tab-tags', 'tab-contributors'],
    'health': ['tab-security']
};
```

---

## New Data Dimensions

| Dimension | Values | Purpose |
|-----------|--------|---------|
| `urgency` | 1-5 | Reactive vs planned work |
| `impact` | internal, user-facing, infrastructure, api | Who is affected |

These enable new insights:
- **Urgency Distribution** - operational health indicator
- **Impact Allocation** - where effort goes

---

## Extraction Progress

| Repo | Commits | Processed | Status |
|------|---------|-----------|--------|
| chatty-chart | 42 | 42 | ✅ Complete |
| repo-tor | 108 | 108 | ✅ Complete |
| social-ad-creator | 156 | 90 | 🔄 In progress |
| model-pear | 302 | 0 | ⏳ Not started |
| **Total** | **608** | **240** | **39.5%** |

Run `@data feed the chicken` to continue processing.

---

## Key Files

| File | Purpose |
|------|---------|
| `dashboard/index.html` | Main dashboard (V2 structure) |
| `scripts/aggregate-processed.js` | Aggregation from processed/ data |
| `dashboard/data.json` | Overall aggregated data |
| `dashboard/repos/*.json` | Per-repo aggregated data |
| `docs/DASHBOARD_V2_DESIGN.md` | Full design spec |
| `docs/EXTRACTION_PLAYBOOK.md` | Extraction workflow |

---

## Next Actions

1. **Detail pane** - Implement slide-out panel for drill-down
2. **More visualizations** - Urgency trend, impact by contributor
3. **Continue extraction** - Process remaining commits

See [TODO.md](TODO.md) for detailed implementation tasks.

---

*Last updated: 2026-01-20 - Dashboard V2 4-tab structure and basic urgency/impact complete*
