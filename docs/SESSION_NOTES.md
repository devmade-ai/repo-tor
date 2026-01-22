# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard V2:** Implementation complete. Fixed bug where malformed commits (missing timestamps) caused JavaScript errors that halted execution.

**Extraction System:** AI analysis complete. 763 commits processed across 4 repositories. All previously malformed commits have been fixed.

**Feed Optimization:** Added `merge-analysis.js` for ~10x token reduction during "feed the chicken" workflow. AI now outputs only analysis fields (sha, tags, complexity, urgency, impact) instead of full commit objects.

**Live Dashboard:** https://devmade-ai.github.io/repo-tor/

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
| `scripts/merge-analysis.js` | Merge AI analysis with raw git data (optimized feed) |
| `scripts/save-commit.js` | Save individual commit files (legacy, full objects) |
| `scripts/pending.js` | Generate pending batches from manifest |
| `scripts/fix-malformed.js` | Fix commits missing git metadata |
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

| Repo | Status | Commits |
|------|--------|---------|
| chatty-chart | Complete | 42 |
| repo-tor | Complete | 220 |
| social-ad-creator | Complete | 183 |
| model-pear | Complete | 318 |

**Total:** 763 commits (65 previously malformed commits fixed via `fix-malformed.js`)

### Storage Migration

Migrated from batch files to individual commit files:

**Old:** `processed/<repo>/batches/batch-NNN.json` (15 commits each)
**New:** `processed/<repo>/commits/<sha>.json` (1 commit per file)

Benefits:
- Simpler deduplication (file existence = processed)
- Atomic edits (fix one commit without touching others)
- Cleaner git diffs

---

*Last updated: 2026-01-22 - Added merge-analysis.js for optimized feed workflow (~10x token reduction)*
