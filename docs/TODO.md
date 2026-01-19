# TODO

Items ordered by priority based on [Discovery Session](DISCOVERY_SESSION.md) (2026-01-19).

**Two audiences identified:**

- **Dev Manager** - Analyzes team patterns, presents to executives
- **Executive** - Needs high-level, quick-to-scan summaries

---

## Foundation - COMPLETE

- [x] Schema Migration (`type` → `tags[]`, add `complexity`)
- [x] Extract Script Update
- [x] Dashboard Tag Support
- [x] Aggregation Update
- [x] **Re-extract All Repos** - Run `scripts/update-all.sh` to regenerate all repo data

---

## Priority 1: Timestamp Views (When) - COMPLETE

*Core discovered need: "What time of day is work being done, which days of the week"*

- [x] **Commits by Hour** - Bar chart showing distribution across 24 hours (0-23)
- [x] **Commits by Day of Week** - Bar chart showing Mon-Sun distribution
- [x] **Time Zone Awareness** - Display in user's local timezone with optional UTC toggle

**Stretch:**

- [x] Commit Time Heatmap - Hour vs day-of-week grid
- [ ] Developer Activity Patterns - Per-author time breakdowns

---

## Priority 2: Work Pattern Styling - COMPLETE

*Core discovered need: "After hours vs working hours, weekends/public holidays vs normal working days"*

**Visual distinction across ALL views:**

- [x] **Work Hours Highlighting** - Differentiate 8:00-17:00 vs after-hours
- [x] **Weekend Highlighting** - Saturday/Sunday styled differently
- [x] **South African Public Holidays** - Load ZA holidays with distinct styling
- [x] **Commit List Badges** - "After Hours", "Weekend", "Holiday" indicators
- [x] **Legend/Key** - Explain the color coding

**Integration:**

- [x] Apply to Timeline tab (commit list badges)
- [x] Apply to Timing tab (hour/day charts with color distinction)
- [ ] Configurable work hours (default 8-17) - stretch goal

---

## Priority 3: Executive Summary View - COMPLETE

*Discovered need: "Higher level, quick to scan, productivity, progress/growth"*

- [x] **Summary Tab** - New tab designed for executive audience
  - Total commits (period)
  - Active contributors
  - Progress trend (up/down vs previous period)
  - Work type breakdown (features vs fixes vs other)
  - Key highlights (most active project, busiest day, etc.)

- [x] **Quick Stats Cards** - At-a-glance metrics at top of summary
- [x] **Period Comparison** - This week vs last week, this month vs last month, this quarter vs last quarter

---

## Priority 4: Export / Share - COMPLETE

*Discovered need: "Could be extracted and sent in a specific format"*

- [x] **PDF Export** - Generate shareable PDF report
- [x] **Shareable Links** - URL with filter state encoded

---

## Lower Priority

### Tag & Complexity Views - DONE

- [x] Developer Tag Distribution - Who does fixes vs features (Contributors tab: "Who Does What")
- [x] Complexity by Author - Who handles complex changes (Contributors tab: Complexity chart)
- [x] Complexity by Time - When are complex commits made (Progress tab: Complexity Over Time)

### Visual Polish

- [x] Dark Mode
- [ ] Color palette refinement
- [ ] Loading states

### Infrastructure

- [x] Global filter state across tabs
- [x] Filter persistence (localStorage)
- [ ] Private repo sanitization mode

### Research / Future

- [ ] Device/platform attribution (mobile vs desktop commits)
- [ ] Merge commit filtering
- [ ] PWA offline support

---

*Last updated: 2026-01-19 - Added heatmap, dark mode, filter persistence*
