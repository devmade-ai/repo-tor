# History

Log of significant changes to code and documentation.

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
