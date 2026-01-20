# TODO

Implementation tasks for Git Analytics Reporting System.

**Design:** See [DASHBOARD_V2_DESIGN.md](DASHBOARD_V2_DESIGN.md) for full specification.

---

## Priority 1: Aggregation Script

*Read from processed/ data, output dashboard-ready JSON*

- [ ] Create `scripts/aggregate-processed.js`
  - [ ] Read all `processed/<repo>/batches/*.json` files
  - [ ] Combine commits from all repos
  - [ ] Calculate summary aggregations:
    - [ ] `tagBreakdown` - count per tag
    - [ ] `complexityBreakdown` - count per level (1-5)
    - [ ] `urgencyBreakdown` - count per level (1-5) **NEW**
    - [ ] `impactBreakdown` - count per category **NEW**
  - [ ] Calculate monthly aggregations:
    - [ ] `monthly.*.commits` - count per month
    - [ ] `monthly.*.avgComplexity` - average per month
    - [ ] `monthly.*.avgUrgency` - average per month **NEW**
    - [ ] `monthly.*.tags` - tag counts per month
    - [ ] `monthly.*.impact` - impact counts per month **NEW**
  - [ ] Calculate contributor aggregations:
    - [ ] `contributors.*.tagBreakdown` - per person
    - [ ] `contributors.*.avgComplexity` - per person
    - [ ] `contributors.*.avgUrgency` - per person **NEW**
    - [ ] `contributors.*.impactBreakdown` - per person **NEW**
  - [ ] Output files:
    - [ ] `dashboard/data.json` - overall (all repos)
    - [ ] `dashboard/repos/<repo>.json` - per-repo (same schema)

---

## Priority 2: Dashboard Structure

*Reorganize from 7 tabs to 4 grouped tabs with detail pane*

- [ ] Create new tab structure:
  - [ ] **Overview** - Executive summary (migrated from Summary)
  - [ ] **Activity** - Timeline + Timing combined
  - [ ] **Work** - Progress + Tags + Contributors combined
  - [ ] **Health** - Security + Urgency (new)

- [ ] Implement detail pane component:
  - [ ] Slide-out panel (30% width on desktop)
  - [ ] Bottom sheet variant for mobile
  - [ ] Close button / click-outside to dismiss
  - [ ] Smooth transition animations

- [ ] Wire up click interactions:
  - [ ] Cards → show related commits
  - [ ] Chart segments → show filtered commits
  - [ ] Contributors → show person's commits
  - [ ] Commits → show full commit detail

---

## Priority 3: New Visualizations

*Urgency and Impact charts for new data dimensions*

### Urgency (Health Tab)
- [ ] Urgency Distribution - horizontal bars (Planned/Normal/Reactive)
- [ ] Urgency Trend - line chart by month (lower is better)
- [ ] Urgency by Contributor - horizontal bars per person

### Impact (Work Tab + Overview)
- [ ] Impact Allocation - horizontal bars (user-facing/internal/infra/api)
- [ ] Impact Over Time - stacked area chart by month
- [ ] Impact by Contributor - breakdown per person

### Overview Cards
- [ ] Avg Urgency card with trend indicator
- [ ] % Planned card (urgency 1-2 ratio)
- [ ] Impact Allocation mini-bars

---

## Priority 4: Polish

- [ ] Dark mode for new components
- [ ] Loading states for detail pane
- [ ] Responsive refinements
- [ ] PDF export updates for new layout
- [ ] Shareable links for new tab structure

---

## Extraction (Ongoing)

Continue processing commits with `@data feed the chicken`:

| Repo | Status | Remaining |
|------|--------|-----------|
| chatty-chart | ✅ Complete | 0 |
| repo-tor | ✅ Complete | 0 |
| social-ad-creator | 🔄 In progress | ~7 batches |
| model-pear | ⏳ Not started | 31 batches |

---

## Future / Backlog

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

*Last updated: 2026-01-20 - Reorganized for Dashboard V2 implementation*
