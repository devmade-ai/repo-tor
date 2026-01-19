# Session Notes

Current state and context for AI assistants to pick up where the last session left off.

## Current State

- Git Analytics Reporting System complete (D1, D2, D3, D4)
- Dashboard filters complete (type, author, date range, repo)
- GitHub Pages deployment workflow configured
- Schema alignment complete (author_id, is_conventional, security_events)
- Multiple data file loading complete
- Multi-repo management via `config/repos.json` and `scripts/update-all.sh`
- Live dashboard: https://devmade-ai.github.io/repo-tor/
- Documentation split into User Guide (UI/interpretation) and Admin Guide (setup/extraction)

### Tracked Repos (config/repos.json)
- social-ad-creator (156 commits, 3 contributors)
- model-pear (302 commits, 4 contributors)
- repo-tor (32 commits, 3 contributors)

## Last Completed

### Duplicate Contributor Fix (2026-01-19)

- Created `config/author-map.json` to merge jacotheron87's two email addresses
- Re-aggregated data with `--author-map=config/author-map.json`
- Contributors chart now shows 3 contributors (not 4)

### Multi-Repo Admin Setup (2026-01-19)

- Created `config/repos.json` to track repository URLs
- Created `scripts/update-all.sh` to automate extraction and aggregation
- Added social-ad-creator and model-pear repos
- Aggregated all 3 repos into dashboard/data.json (490 total commits)
- Updated ADMIN_GUIDE.md with managed repos workflow
- Simplified .gitignore: track all reports/, ignore .repo-cache/

### Timeline Horizontal Bar Chart (2026-01-18)

- Changed timeline from vertical columns to horizontal bar chart
- Newest dates at top, oldest at bottom
- Better for mobile - date labels have more room, vertical scroll is natural

### Mobile Timeline Fix (2026-01-18)

- Improved filter bar layout: 2-column grid on mobile, 3-column on tablet, flex on desktop
- Changed filter labels to above inputs (stacked) for better mobile UX
- Reduced chart height on mobile (`h-48` vs `h-64` on desktop)
- Redesigned commit list items: message wraps on mobile, metadata flows naturally
- Line counts (+/-) show inline on desktop, below metadata on mobile

### Mobile Tab Fix (2026-01-18)

- Fixed dashboard tabs overflowing on mobile screens
- Added horizontal scroll with hidden scrollbar for clean appearance
- Applied `whitespace-nowrap` to prevent tab text wrapping
- Used negative margin trick (`-mx-4 px-4`) for edge-to-edge scrolling on mobile

### GitHub Pages Deployment Fix (2026-01-19)

- Fixed `data.json` not loading on live site
- Issue: `deploy.yml` copied index.html but not data.json
- Fix: Added copy step for `dashboard/data.json` to deployment workflow

### Dashboard Auto-Load Fix
- Copied data.json to dashboard/ folder for GitHub Pages auto-load
- Previously, relative path `../reports/repo-tor/data.json` didn't work on GitHub Pages
- Now `fetch('data.json')` succeeds immediately
- Added live dashboard URL to USER_GUIDE.md and ADMIN_GUIDE.md

### Previous Completions
- Schema alignment (author_id, is_conventional, security_events)
- Dashboard multiple data file loading
- Dashboard filters (type, author, repo, date range)
- GitHub Pages deployment workflow
- D3 - Aggregation Script with author identity mapping
- D2 - Commit Convention Guide
- D1 - Extraction Script
- D4 - Static Report Page

## In Progress

None

## Next Steps

Remaining items (low priority):
- Export to PDF
- Pre-commit hook for conventional commits
- GitHub Action for automated extraction
- Dark mode
- PWA offline support

## Notes

- Extraction uses `git log --all` to capture all branches
- Filters only apply to Timeline tab (chart + list)
- Repo filter auto-hides for single-repo data
- Dashboard auto-resolves author names from metadata.authors using author_id
- commits.json is wrapped in object for consistency with other JSON files
- Sample data in `dashboard/data.json` for GitHub Pages auto-load
- Full extraction also stored in `reports/repo-tor/` for reference
