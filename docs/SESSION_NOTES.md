# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard V2:** Implementation complete. Detail pane, trend charts, and contributor visualizations all working.

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
- [x] **Detail pane** - Slide-out panel (desktop) / bottom sheet (mobile)
- [x] **Urgency trend chart** - Line chart showing average urgency by month
- [x] **Impact over time chart** - Stacked bar chart by month
- [x] **Urgency by contributor** - Per-person breakdown with stacked bars
- [x] **Impact by contributor** - Per-person breakdown with stacked bars
- [x] **Click interactions** - Cards, charts, and bars all trigger detail pane

### Detail Pane Features

- Slide-out panel from right (30% width on desktop)
- Bottom sheet on mobile (85% viewport height)
- Click-outside or Escape key to close
- Smooth transition animations
- Shows filtered commits with:
  - Message, author, date, repo
  - Tags, urgency label, impact label

### Click Interactions

The following elements open the detail pane:

**Overview Tab:**
- Features Built card → shows feature commits
- Bugs Fixed card → shows bugfix commits
- Avg Urgency card → shows reactive commits
- % Planned card → shows planned commits

**Health Tab:**
- Security/Reactive/Weekend/After Hours cards → filtered commits
- Urgency distribution bars → commits by urgency level
- Impact distribution bars → commits by impact category
- Urgency by contributor → contributor's commits
- Impact by contributor → contributor's commits

**Work Tab:**
- Tag breakdown bars → commits with that tag
- Contributor cards → contributor's commits

---

## Tab Mapping

```javascript
const TAB_MAPPING = {
    'overview': ['tab-overview'],
    'activity': ['tab-activity', 'tab-timing'],
    'work': ['tab-progress', 'tab-tags', 'tab-contributors'],
    'health': ['tab-security']
};
```

---

## Key Files

| File | Purpose |
|------|---------|
| `dashboard/index.html` | Main dashboard (V2 complete) |
| `scripts/aggregate-processed.js` | Aggregation from processed/ data |
| `scripts/save-batch.js` | Fast batch saving (no IDE dialogs) |
| `scripts/pending.js` | Generate pending batches from manifest |
| `dashboard/data.json` | Overall aggregated data |
| `dashboard/repos/*.json` | Per-repo aggregated data |
| `docs/DASHBOARD_V2_DESIGN.md` | Full design spec |
| `docs/EXTRACTION_PLAYBOOK.md` | Extraction workflow |

---

## Remaining Work

### Polish (Optional)
- [ ] Loading states for detail pane content
- [ ] PDF export updates for new layout
- [ ] Shareable links for detail pane state

### Extraction Progress

| Repo | Status | Processed |
|------|--------|-----------|
| chatty-chart | Complete | 42/42 |
| repo-tor | Complete | 171/171 |
| social-ad-creator | Complete | 158/158 |
| model-pear | In progress | 70/309 (24 batches remaining) |

**Total:** 441/680 commits processed (65%)

Continue with `@data feed the chicken`

---

*Last updated: 2026-01-20 - added save-batch.js for faster batch processing*
