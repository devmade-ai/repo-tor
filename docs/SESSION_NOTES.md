# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard V2:** Implementation complete with role-based view levels, consistent tab layouts, and PWA support.

**Recent Updates (2026-02-04):**
- **Fixed PWA installation** - Changed manifest scope and start_url from absolute (`/`) to relative (`./`) paths for GitHub Pages compatibility
- Added loading states for detail pane (skeleton placeholders + fade-in)
- Updated PDF export for new 4-tab layout
- Added shareable links for detail pane state (URL params)
- Added urgency and impact filter dropdowns
- Added quick select filter presets (30 days, 90 days, This year, Last year)
- Added techy theme (JetBrains Mono font, grid background, glow effects)
- Added PWA offline support (service worker, manifest, install prompt)
- Created SVG + PNG icons for PWA
- **Replaced global filter mode with per-filter Include/Exclude toggles**
- **Converted filters to multi-select checkboxes**
- **Added PWA install section to Settings panel with status and manual instructions**

**Previous Updates (2026-01-28):**
- Fixed bug count inconsistency: Overview and Breakdown tabs now both count 'bugfix' OR 'fix' tags
- Fixed chart legend text color using Chart.defaults.color for proper theme support
- Shortened chart axis labels to use abbreviated format (50k instead of 50,000)

**Role-Based View Levels:** Different audiences see appropriate detail levels:
- **Executive**: Aggregated totals, weekly heatmap, summary drilldowns + interpretation guidance
- **Management**: Per-repo groupings, daily heatmap, summary drilldowns + interpretation guidance
- **Developer**: Individual contributors, hourly heatmap, full commit lists (no hints needed)

**Extraction System:** AI analysis complete. 1163 commits processed across 6 repositories. All previously malformed commits have been fixed.

**Feed Optimization:**
- Added `extract-api.js` for API-based extraction (no cloning required, faster)
- Added `merge-analysis.js` for ~10x token reduction during "feed the chicken" workflow

**GitHub CLI Setup:** Authentication for API extraction with multiple options:
- `.env` file support - Store `GH_TOKEN` for AI sessions (gitignored)
- `scripts/setup-gh.sh` - Cross-platform installation and auth
- Auto-loading - Scripts read from `.env` automatically
- See docs/USER_ACTIONS.md for detailed setup instructions

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
- **View-level aware drilldowns:**
  - Developer: Full commit list with message, author, date, repo, tags
  - Executive/Management: Summary stats (commit counts, contributor counts, tag breakdown, date range)

### Role-Based View Levels

| View | Contributors | Heatmap | Drilldown |
|------|-------------|---------|-----------|
| Executive | "All (45 contributors)" | Weekly blocks | Stats only |
| Management | "repo-api (12 contributors)" | Day-of-week bars | Stats + repo split |
| Developer | Individual names | 24×7 hourly grid | Full commit list |

**Full coverage across all tabs:**
- **Health tab**: Urgency/Impact by contributor → aggregated by total/repo/individual
- **Security tab**: Executive sees count only, Management sees per-repo breakdown
- **Timeline**: Executive sees weekly summaries, Management sees daily summaries
- **Tags/Progress**: Drilldowns automatically use view-level-aware detail pane

Access via the "View Level" selector in the filter sidebar. Selection persists in localStorage.

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
| `scripts/setup-gh.sh` | GitHub CLI installation and authentication |
| `scripts/extract-api.js` | GitHub API-based extraction (no cloning) |
| `scripts/aggregate-processed.js` | Aggregation from processed/ data |
| `scripts/merge-analysis.js` | Merge AI analysis with raw git data (optimized feed) |
| `scripts/save-commit.js` | Save individual commit files (legacy, full objects) |
| `scripts/pending.js` | Generate pending batches from manifest |
| `dashboard/data.json` | Overall aggregated data |
| `dashboard/repos/*.json` | Per-repo aggregated data |
| `docs/EXTRACTION_PLAYBOOK.md` | Extraction workflow |

---

## Remaining Work

### Research (Optional)
- [ ] Device/platform attribution (mobile vs desktop commits)
- [ ] Merge commit filtering options

### Extraction Progress

| Repo | Status | Commits |
|------|--------|---------|
| chatty-chart | Complete | 42 |
| repo-tor | Complete | 250 |
| social-ad-creator | Complete | 184 |
| model-pear | Complete | 318 |
| coin-zapp | Complete | 81 |
| synctone | Complete | 288 |

**Total Processed:** 1163 commits
**Remaining:** 0 - All repos complete!

### Storage Migration

Migrated from batch files to individual commit files:

**Old:** `processed/<repo>/batches/batch-NNN.json` (15 commits each)
**New:** `processed/<repo>/commits/<sha>.json` (1 commit per file)

Benefits:
- Simpler deduplication (file existence = processed)
- Atomic edits (fix one commit without touching others)
- Cleaner git diffs

---

*Last updated: 2026-02-04 - Completed polish items, added filters, techy theme, and PWA support.*
