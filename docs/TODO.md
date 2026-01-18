# TODO

Items to be addressed, ordered by priority.

## Completed

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

## Medium Priority

### Schema Alignment
Align with technical spec schema:
- [x] Add `repo_id` (kebab-case) to metadata
- [ ] Change `author` object to `author_id` referencing metadata
- [ ] Add `is_conventional` boolean (currently `parseMethod`)
- [ ] Add `security_events` array to summary.json
- [ ] Wrap commits array in `{ "commits": [...] }` object

### Dashboard - Multiple Data Files
- [ ] Support loading multiple repo data files simultaneously
- [ ] File picker for multiple selection

## Low Priority / Ideas

### Could Have (from spec)
- [ ] Export to PDF functionality
- [ ] Pre-commit hook for conventional commits (prepare-commit-msg)
- [ ] GitHub Action for automated extraction on push (separate from deployment)

### Future Enhancements
- [ ] Merge commit filtering option (exclude from stats)
- [ ] Virtualized rendering for large commit lists (500+)
- [ ] Dark mode for dashboard
- [ ] PWA offline support

---

*Last updated: Session 3 - After dashboard filters implementation*
