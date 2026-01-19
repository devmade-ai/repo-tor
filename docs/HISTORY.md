# History

Log of significant changes to code and documentation.

## 2026-01-18

### Timeline Horizontal Bar Chart
- Changed timeline chart from vertical columns to horizontal bars
- Dates on Y-axis (newest at top), commit counts on X-axis
- Better mobile experience - more room for date labels, natural vertical scroll

### Mobile Timeline Improvements
- Improved filter bar layout with responsive grid (2-col mobile, 3-col tablet, flex desktop)
- Stacked filter labels above inputs for better touch targets
- Reduced chart height on mobile (`h-48` vs `h-64`)
- Redesigned commit list items with responsive layout:
  - Commit message wraps on mobile, truncates on desktop
  - Metadata flows with dot separators on mobile, full text on desktop
  - Line counts (+/-) show inline on desktop, below metadata on mobile

### Mobile Tab Fix
- Fixed dashboard tabs overflowing on mobile screens
- Added `overflow-x-auto` for horizontal scrolling
- Added `whitespace-nowrap` to all tab buttons
- Used negative margin (`-mx-4 px-4`) for edge-to-edge scroll area on mobile
- Added CSS class `.scrollbar-hide` to hide scrollbar while maintaining scroll functionality
- Touch scrolling enabled via `-webkit-overflow-scrolling: touch`

## 2026-01-19

### Work Pattern Styling

Added visual indicators for after-hours, weekend, and holiday commits:

- **Commit list badges** - Each commit shows applicable work pattern indicators:
  - "After Hours" (amber) - commits before 8:00 or after 17:00
  - "Weekend" (indigo) - commits on Saturday or Sunday
  - "Holiday" (pink) - commits on South African public holidays
- **SA public holidays** - Complete holiday data for 2020-2030:
  - 10 fixed holidays (New Year's, Freedom Day, Christmas, etc.)
  - Easter-based moveable feasts (Good Friday, Family Day)
  - Sunday→Monday observance rule applied
- **Legend/key** - Added to Timeline tab filter card explaining badge meanings
- **Helper functions** - `getWorkPattern()`, `getWorkPatternBadges()` for reuse

### Timestamp Views (Timing Tab)

Added new "Timing" tab to dashboard for visualizing when work happens:

- **Commits by Hour chart** - Bar chart showing distribution across 24 hours (0-23)
  - Work hours (8:00-17:00) displayed in blue
  - After-hours displayed in gray
  - Tooltip shows "Work hours" or "After hours" context
- **Commits by Day of Week chart** - Bar chart showing Mon-Sun distribution
  - Weekdays (Mon-Fri) displayed in blue
  - Weekends (Sat-Sun) displayed in gray
  - Days ordered Monday-first for business context
- **Timezone toggle** - Switch between Local and UTC time display
  - Charts dynamically update when timezone changes
  - Default is local browser timezone

Implementation details:
- Added `useUTC` global state variable
- Added `getCommitDateTime()` helper for consistent date handling
- Added `renderTiming()` function to render both charts
- Added `setupTimezoneToggle()` event listener

### Discovery Framework Validation

Applied the Discovery Framework to validate our solution against user needs:

- Conducted systematic discovery session documenting people, flow, data, and context
- **Key finding:** Two distinct audiences with different needs (Executive vs Dev Manager)
- **Gaps identified:**
  - Timestamp views (when work happens) - data stored but not visualized
  - Work pattern distinction (after hours, weekends, holidays)
  - Executive summary view (high-level, quick-to-scan)
  - PDF export for sharing
- **Verdict:** Core infrastructure solid, minimal over-engineering, main miss is time dimension
- Created `docs/DISCOVERY_SESSION.md` documenting full session
- Reorganized `docs/TODO.md` around discovered priorities

### Feature Roadmap Planning

Added high-priority TODO items for next phase of development:
- **Timestamp Views & Developer Insights** - Commits by hour (0-23), commits by day of week (Mon-Sun), heatmaps, developer activity patterns, commit type trends
- **Work Pattern Visual Distinction** - Work hours (8-5) vs after-hours, weekends, SA public holidays - all visually different across ALL tabs/views
- **Filter Persistence & Cross-Tab Behavior** - Global filter state across all tabs, URL params for shareable links, localStorage for session persistence
- **Visual Design & Dark Mode** - Full dark theme with system preference detection, color palette refinement, typography improvements
- **Private Repository Security** - Sanitization mode, anonymization options, content filtering, local-only mode documentation
- **Repository Management** - Repo rename handling, alias support, migration tools, archive detection

New Research/Investigation section:
- **Device/Platform Attribution** - Split contributions by committer name (mobile vs desktop)
- **AI-Powered Commit Categorization** - Use Claude to read messages + diffs and intelligently tag
- **Multi-Tag Commit Model** - Rethink single-type assumption; one commit can have multiple tags
- **Tag-Centric Reporting** - Shift from commit counts to accomplishment-based metrics

### Direction Shift: Tag-Based Analytics

Refocused tool around three core metrics:

- **When** - Timestamp analytics (hour, day, work hours, weekends, holidays)
- **What** - AI-analyzed tags from commit messages (multiple per commit)
- **Complexity** - Score based on files changed + tag count (scale 1-5)

Created:

- `docs/EXTRACTION_PLAYBOOK.md` - AI-driven extraction process, triggered by "feed the chicken"
- Updated CLAUDE.md with trigger phrase section
- Reorganized TODO.md around new direction (removed completed items, added Foundation section)

Key decisions:

- AI analyzes each commit message (replaces regex parsing)
- Schema: `type` → `tags[]`, add `complexity` field
- User triggers, AI executes, user commits/pushes

### Dashboard Multi-Tag Support (Phase 2)

Implemented multi-tag support in the dashboard (no backward compatibility needed - data regenerates):

- Added `getCommitTags()`, `getAllTags()`, `getTagColor()`, `getTagClass()` helpers
- Added TAG_COLORS constant with new tag vocabulary
- Filter renamed from "Type" to "Tag" - matches commits with any matching tag
- Commit list shows all tags (up to 3 with "+N" overflow indicator)
- "By Type" tab renamed to "By Tag" - counts each tag occurrence
- Progress tab Feature vs Bug Fix now tag-based
- `combineDataFiles()` builds tagBreakdown
- Removed backward compat code (TYPE_COLORS, TYPE_TO_TAG, legacy CSS)

### Extraction Script Tag Support (Phase 1)

Updated `scripts/extract.js` for new tag-based model:

- Added `CONVENTIONAL_TO_TAG` mapping (feat → feature, fix → bugfix, etc.)
- `parseCommitMessage()` returns `tags[]` array instead of single `type`
- Added `calculateComplexity()` function (1-5 scale based on files changed + tag count)
- Summary outputs `tagBreakdown` and `complexityBreakdown`
- Contributors track `tagCounts` instead of `types`
- Files track `tagCounts` instead of `commitTypes`

### Aggregation Script Tag Support (Phase 4)

Updated `scripts/aggregate.js` for tag-aware aggregation:

- Contributors aggregation uses `tagCounts` instead of `types`
- File aggregation uses `tagCounts` instead of `commitTypes`
- Summary outputs `tagBreakdown` and `complexityBreakdown`
- Monthly aggregation tracks tags per month instead of types
- Security detection uses `tags.includes('security')`

### Added chatty-chart Repository

- Added `illuminAI-select/chatty-chart` to tracked repositories
- Repository stats: 42 commits, 4 contributors, 9 files tracked
- Total dashboard now shows 543 commits across 4 repositories
- Updated `config/repos.json` and re-aggregated all data

### Duplicate Contributor Fix

- Created `config/author-map.json` to merge duplicate contributor entries
- Issue: jacotheron87 appeared twice due to different email addresses:
  - `jacotheron87@gmail.com` (51 commits)
  - `34473836+jacotheron87@users.noreply.github.com` (1 commit via GitHub web)
- Solution: Added author mapping to merge both emails under single identity
- Re-aggregated data with `--author-map` flag
- Contributors reduced from 4 to 3 (correct count)

### Multi-Repo Admin Setup

- Created `config/repos.json` - Central config file tracking repository URLs
  - Stores name, URL, and date added for each repo
  - Enables reproducible extraction without re-providing URLs
- Created `scripts/update-all.sh` - Automated update script
  - Reads repos from `config/repos.json`
  - Clones new repos to `.repo-cache/` (gitignored)
  - Pulls updates for existing repos
  - Runs extraction on each repo
  - Aggregates all data into `dashboard/data.json`
  - Supports `--fresh` flag to re-clone everything
- Added repos: social-ad-creator (156 commits), model-pear (302 commits)
- Updated `docs/ADMIN_GUIDE.md` with managed repos workflow
- Simplified `.gitignore`: track all `reports/`, ignore `.repo-cache/`

### GitHub Pages Deployment Fix

- Fixed `data.json` not loading on live GitHub Pages site
- Issue: `deploy.yml` copied `dashboard/index.html` but not `dashboard/data.json`
- Fix: Added step to copy `dashboard/data.json` to `_site/data.json`
- Now `fetch('data.json')` resolves correctly on the deployed site

## 2026-01-18

### Dashboard Auto-Load Fix
- Copied `data.json` to `dashboard/` folder for GitHub Pages auto-load
- Previously, relative path `../reports/repo-tor/data.json` didn't resolve on GitHub Pages
- Now dashboard auto-loads sample data immediately without file picker
- Added live dashboard URL to `docs/USER_GUIDE.md` and `docs/ADMIN_GUIDE.md`
- Live dashboard: https://devmade-ai.github.io/repo-tor/

### Schema Alignment
- Updated `scripts/extract.js` with new schema:
  - Added `author_id` field to commits (references metadata.authors)
  - Changed `parseMethod` to `is_conventional` boolean
  - Added `authors` map to metadata.json for author lookup
  - Added `security_events` array to summary.json with commit details
  - Wrapped commits.json in `{ "commits": [...] }` object
- Updated `scripts/aggregate.js` to match new schema
- Updated `dashboard/index.html`:
  - Added author resolution from metadata.authors
  - Uses security_events from summary when available

### Dashboard - Multiple Data Files
- Added multi-file support to `dashboard/index.html`:
  - File picker accepts multiple files (HTML5 `multiple` attribute)
  - Client-side `combineDataFiles()` function merges data
  - Combines commits, contributors, files from multiple repos
  - Merges authors from metadata of all files
  - Shows repo filter when multiple repos loaded
- Updated `docs/USER_GUIDE.md` with multiple file instructions

### Data Extraction
- Ran extraction on this repository using `scripts/extract.js`
- Captured 21 commits from 3 contributors across all branches
- Committed extracted data to `reports/repo-tor/`
- Updated `.gitignore` to keep repo-tor data while ignoring other extractions

### GitHub Pages Deployment
- Created `.github/workflows/deploy.yml` - Automated deployment workflow
  - Triggers on push to main/master branches
  - Supports manual trigger via workflow_dispatch
  - Deploys dashboard to GitHub Pages
  - Copies reports folder if present
- Updated `docs/ADMIN_GUIDE.md` with GitHub Pages setup instructions

### Dashboard Filters
- Added filter bar to Timeline tab in `dashboard/index.html`:
  - Type dropdown - filter commits by type (feat, fix, etc.)
  - Author dropdown - filter commits by contributor
  - Repo dropdown - filter by repository (auto-hides for single-repo data)
  - Date range picker - filter by from/to dates
  - Clear Filters button to reset all filters
- Filters apply to both timeline chart and commit list
- Added commit counter showing "Showing X of Y commits"
- Updated `docs/USER_GUIDE.md` with filter documentation
- Updated `docs/TODO.md` to mark filters as complete

### D3 - Aggregation Script
- Created `scripts/aggregate.js` - Multi-repository aggregation
  - Combines data from multiple repository extractions
  - Adds `repo_id` to track commit source
  - Supports optional author identity mapping
  - Generates cross-repo contributor statistics
  - Produces aggregated summary with per-repo breakdown
- Created `config/author-map.example.json` - Example configuration
  - Maps multiple email addresses to canonical author identity
  - Enables consistent contributor tracking across repos
- Created `config/author-map.schema.json` - JSON schema for validation
- Updated `scripts/extract.js` to include `repo_id`:
  - Added `repo_id` (kebab-case) to metadata
  - Added `repo_id` to each commit for aggregation support
- Updated `docs/ADMIN_GUIDE.md` with aggregation documentation
- Updated `docs/USER_GUIDE.md` with multi-repository view section
- Updated `docs/TODO.md` to mark D3 as complete

### Documentation Reorganization
- Split documentation into separate user and admin guides:
  - `docs/USER_GUIDE.md` - Refocused on dashboard UI and interpretation
    - Dashboard overview and summary cards
    - Each tab explained with "what to look for" guidance
    - Commit type color coding and meanings
    - Overall health interpretation patterns
    - Tips for effective use
  - `docs/ADMIN_GUIDE.md` - New guide for setup and operations
    - Prerequisites and installation
    - Data extraction commands and output structure
    - Commit type detection explanation
    - Hook setup instructions
    - Hosting options (local, server, GitHub Pages)
    - Troubleshooting section
- Updated README.md with links to both guides

### Commit Convention Guide (D2)
- Created `docs/COMMIT_CONVENTION.md` - Full guide for conventional commits
  - Commit message format specification
  - Type definitions with analytics impact
  - Special tags (security, breaking, dependency)
  - Examples for each commit type
  - Quick reference and checklist
- Created `.gitmessage` - Commit message template
  - Use with `git config commit.template .gitmessage`
- Created `hooks/commit-msg` - Validation hook
  - Validates conventional commit format
  - Checks subject length (max 72 chars)
  - Warns about non-imperative mood
- Created `hooks/setup.sh` - Hook installation script

### Git Analytics Reporting System
- Created `scripts/extract.js` - Node.js extraction script
  - Parses git log with commit metadata and stats
  - Supports conventional commits and keyword-based type detection
  - Extracts tags, references, file changes
  - Outputs structured JSON (commits, contributors, files, summary)
- Created `scripts/extract.sh` - Shell wrapper for easier usage
- Created `dashboard/index.html` - Static analytics dashboard
  - Timeline view with daily commit chart and commit list
  - Progress view with monthly volume, cumulative growth, feature vs fix trends
  - Contributors view with commit and lines breakdown
  - Security view highlighting security-related commits
  - Type breakdown with pie chart and percentage bars
  - Uses Chart.js for visualizations, Tailwind CSS for styling
  - Auto-loads data.json or accepts file upload
- Updated USER_GUIDE.md with full usage documentation

### Initial Setup
- Created repository structure
- Added CLAUDE.md with AI assistant preferences and checklists
- Added .gitignore entry for Claude Code local settings
- Created docs/ folder with: SESSION_NOTES.md, TODO.md, HISTORY.md, USER_ACTIONS.md
- Added USER_TESTING.md and USER_GUIDE.md
- Added USER_GUIDE.md and USER_TESTING.md to CLAUDE.md checklists

---
