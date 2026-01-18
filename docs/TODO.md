# TODO

Items to be addressed, ordered by priority.

## Completed

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

### Dashboard Enhancements
- [ ] Add type filter to timeline view
- [ ] Add author filter to timeline view
- [ ] Add date range picker
- [ ] Support loading multiple repo data files
- [ ] Add repo selector for aggregated view

## Low Priority / Ideas

### Could Have (from spec)
- [ ] Export to PDF functionality
- [ ] Pre-commit hook for conventional commits (prepare-commit-msg)
- [ ] GitHub Action for automated extraction on push

### Future Enhancements
- [ ] Merge commit filtering option (exclude from stats)
- [ ] Virtualized rendering for large commit lists (500+)
- [ ] Dark mode for dashboard
- [ ] PWA offline support

---

*Last updated: Session 3 - After D3 aggregation script implementation*
