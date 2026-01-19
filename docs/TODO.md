# TODO

Items to be addressed, ordered by priority.

## Completed

### Data Extraction (Done)
- [x] Extracted this repository's git data (20 commits, 3 contributors)
- [x] Committed to `reports/repo-tor/` for dashboard

### GitHub Pages Deployment (Done)
- [x] GitHub Actions workflow for automated deployment

### Dashboard Filters (Done)
- [x] Add type filter to timeline view
- [x] Add author filter to timeline view
- [x] Add date range picker
- [x] Add repo selector for aggregated view

### D3 - Aggregation Script (Done)
Multi-repo combining with author identity mapping:
- [x] Create `scripts/aggregate.js` to combine multiple repo outputs
- [x] Implement `config/author-map.json` for identity normalization
- [x] Generate `aggregated/summary.json` with cross-repo metrics
- [x] Add `repo_id` field to commits for aggregation support

### Schema Alignment (Done)
Align with technical spec schema:
- [x] Add `repo_id` (kebab-case) to metadata
- [x] Change `author` object to `author_id` referencing metadata
- [x] Add `is_conventional` boolean (replaces `parseMethod`)
- [x] Add `security_events` array to summary.json
- [x] Wrap commits array in `{ "commits": [...] }` object

### Dashboard - Multiple Data Files (Done)
- [x] Support loading multiple repo data files simultaneously
- [x] File picker for multiple selection
- [x] Client-side combining of data from multiple repos

## High Priority

### Timestamp Views & Developer Insights
New analytics views focused on when developers commit and patterns in their work:
- [ ] **Commits by Hour** - Bar chart showing commit distribution across 24 hours (0-23)
- [ ] **Commits by Day of Week** - Bar chart showing Mon-Sun commit distribution
- [ ] **Commit Time Heatmap** - Hour-of-day vs day-of-week grid showing commit density
- [ ] **Developer Activity Patterns** - Per-author breakdown of when they commit (morning/afternoon/evening/night)
- [ ] **Commit Type by Time** - Do certain commit types (fix vs feat) happen at certain times?
- [ ] **Weekly/Monthly Trends** - Commit volume over time, broken down by type
- [ ] **Developer Commit Type Distribution** - Which authors do more fixes vs features?
- [ ] **Time Zone Awareness** - Display times in user's local timezone with optional UTC toggle

### Work Pattern Visual Distinction
Apply consistent visual styling across ALL tabs and views to distinguish work patterns:

**Time of Day:**
- [ ] **Work Hours Highlighting** - Visually differentiate commits during work hours (8:00-17:00) vs after-hours
- [ ] **After-Hours Styling** - Different color/indicator for commits outside 8-5 window
- [ ] **Hour Charts Integration** - Work hours band highlighted in commits-by-hour view

**Days:**
- [ ] **Weekend Highlighting** - Visually differentiate Saturday/Sunday in all date-based views
- [ ] **South African Public Holidays** - Load and display ZA holidays with distinct styling
- [ ] **Holiday Data Source** - Config file or API for SA public holidays (updateable yearly)

**Cross-Cutting:**
- [ ] **Legend/Key** - Clear indicator explaining work hours, after-hours, weekend, holiday colors
- [ ] **Timeline Integration** - Apply to existing Timeline tab (chart bars, commit list dates)
- [ ] **Heatmap Integration** - Work hours rows + weekend columns styled differently
- [ ] **Commit List Badges** - Show "After Hours", "Weekend", or "Holiday" badge on relevant commits
- [ ] **Configurable Hours** - Allow customizing work hours (default 8-17)

### Filter Persistence & Cross-Tab Behavior
Make filters consistent and persistent across all views:
- [ ] **Global Filter State** - Filters apply across all tabs (not just Timeline)
- [ ] **URL State Persistence** - Save filter state in URL params (shareable links)
- [ ] **Session Persistence** - Remember filters on page reload (localStorage)
- [ ] **Filter Sync UI** - Clear indicator showing which filters are active globally

### Visual Design & Dark Mode
Improve dashboard aesthetics:
- [ ] **Dark Mode** - Full dark theme with toggle (respect system preference)
- [ ] **Color Palette Refinement** - Consistent, accessible color scheme for charts
- [ ] **Typography & Spacing** - Better visual hierarchy, breathing room
- [ ] **Chart Styling** - Polished chart appearance (gridlines, legends, tooltips)
- [ ] **Loading States** - Skeleton loaders, smooth transitions
- [ ] **Responsive Polish** - Ensure all new views work well on mobile

### Private Repository Security
Support private repos without exposing sensitive information:
- [ ] **Sanitization Mode** - Option to strip sensitive data (file paths, commit messages)
- [ ] **Anonymization** - Replace author names/emails with pseudonyms
- [ ] **Content Filtering** - Exclude commits matching patterns (e.g., containing secrets)
- [ ] **Local-Only Mode** - Ensure extracted data never leaves local machine unless explicitly shared
- [ ] **Documentation** - Clear guidance on what data is extracted and privacy implications

### Repository Management
Handle repository lifecycle changes gracefully:
- [ ] **Repo Rename Handling** - Config mapping old repo names to new names (preserve history continuity)
- [ ] **Repo Alias Support** - Allow multiple names/aliases for same repo in aggregation
- [ ] **Migration Tool** - Script to update existing data when repo is renamed
- [ ] **Repo Archive Detection** - Handle archived/deleted repos gracefully in update-all.sh
- [ ] **Repo URL Redirect** - Detect GitHub redirects when repo is renamed and update config

## Low Priority / Ideas

### Could Have (from spec)
- [ ] Export to PDF functionality
- [ ] Pre-commit hook for conventional commits (prepare-commit-msg)
- [ ] GitHub Action for automated extraction on push (separate from deployment)

### Future Enhancements
- [ ] Merge commit filtering option (exclude from stats)
- [ ] Virtualized rendering for large commit lists (500+)
- [ ] PWA offline support

---

*Last updated: 2026-01-19 - Added hour/day views, work pattern distinction (work hours, weekends, holidays), filters, design, privacy, repo management*
