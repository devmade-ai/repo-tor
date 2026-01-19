# TODO

Items to be addressed, ordered by priority and dependencies.

## Foundation (Do First)

Data model and extraction changes required before building new views:

- [ ] **Schema Migration** - Update data model: `type` → `tags[]`, add `complexity` field
- [ ] **Extract Script Update** - Modify `extract.js` to support AI-driven tagging workflow
- [ ] **Dashboard Tag Support** - Update dashboard to handle `tags[]` instead of single `type`
- [ ] **Aggregation Update** - Update `aggregate.js` to handle new schema
- [ ] **Re-extract Repos** - Run extraction with new model on all tracked repositories

## Timestamp Views (When)

Analytics focused on when developers commit:

- [ ] **Time Zone Awareness** - Display times in user's local timezone with optional UTC toggle (do early - affects all time displays)
- [ ] **Commits by Hour** - Bar chart showing commit distribution across 24 hours (0-23)
- [ ] **Commits by Day of Week** - Bar chart showing Mon-Sun commit distribution
- [ ] **Commit Time Heatmap** - Hour-of-day vs day-of-week grid showing commit density (depends on hour + day views)
- [ ] **Developer Activity Patterns** - Per-author breakdown of when they commit (morning/afternoon/evening/night)
- [ ] **Weekly/Monthly Trends** - Commit volume over time, broken down by tags

## Tag Views (What)

Analytics focused on what was done (using new tags model):

- [ ] **Tags Distribution** - Chart showing commit counts per tag (handle multi-tag counting)
- [ ] **Tags by Time** - Do certain tags (bugfix vs feature) happen at certain times?
- [ ] **Developer Tag Distribution** - Which authors do more fixes vs features?
- [ ] **Tag Combinations** - Common tag pairings (e.g., feature+test often together)

## Complexity Views (How Complex)

Analytics focused on change complexity:

- [ ] **Complexity Distribution** - Chart showing commits by complexity score (1-5)
- [ ] **Complexity by Author** - Which developers handle more complex changes?
- [ ] **Complexity by Time** - Are complex commits made at certain times/days?
- [ ] **Complexity vs Tags** - Do certain tags correlate with higher complexity?

## Work Pattern Visual Distinction

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

## Filter Persistence & Cross-Tab Behavior

Make filters consistent and persistent across all views:

- [ ] **Global Filter State** - Filters apply across all tabs (not just Timeline)
- [ ] **URL State Persistence** - Save filter state in URL params (shareable links)
- [ ] **Session Persistence** - Remember filters on page reload (localStorage)
- [ ] **Filter Sync UI** - Clear indicator showing which filters are active globally

## Visual Design & Dark Mode

Improve dashboard aesthetics:

- [ ] **Dark Mode** - Full dark theme with toggle (respect system preference)
- [ ] **Color Palette Refinement** - Consistent, accessible color scheme for charts
- [ ] **Typography & Spacing** - Better visual hierarchy, breathing room
- [ ] **Chart Styling** - Polished chart appearance (gridlines, legends, tooltips)
- [ ] **Loading States** - Skeleton loaders, smooth transitions
- [ ] **Responsive Polish** - Ensure all new views work well on mobile

## Private Repository Security

Support private repos without exposing sensitive information:

- [ ] **Sanitization Mode** - Option to strip sensitive data (file paths, commit messages)
- [ ] **Anonymization** - Replace author names/emails with pseudonyms
- [ ] **Content Filtering** - Exclude commits matching patterns (e.g., containing secrets)
- [ ] **Local-Only Mode** - Ensure extracted data never leaves local machine unless explicitly shared
- [ ] **Documentation** - Clear guidance on what data is extracted and privacy implications

## Repository Management

Handle repository lifecycle changes gracefully:

- [ ] **Repo Rename Handling** - Config mapping old repo names to new names (preserve history continuity)
- [ ] **Repo Alias Support** - Allow multiple names/aliases for same repo in aggregation
- [ ] **Migration Tool** - Script to update existing data when repo is renamed
- [ ] **Repo Archive Detection** - Handle archived/deleted repos gracefully in update-all.sh
- [ ] **Repo URL Redirect** - Detect GitHub redirects when repo is renamed and update config

## Research / Investigation

### Device/Platform Attribution

Investigate splitting contributions by committer name patterns to distinguish work contexts:

- [ ] **Mobile vs Desktop Detection** - Identify commits from mobile devices (e.g., "Author (mobile)" vs "Author")
- [ ] **Committer Name Mapping** - Config to map name variations to same author with device tag
- [ ] **Combined/Split Views** - Option to view contributions merged or separated by device
- [ ] **Use Cases** - Document when this is useful (e.g., tracking mobile hotfixes vs planned desktop work)

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

*Last updated: 2026-01-19 - Reorganized for tag-based analytics direction (see SESSION_NOTES.md)*
