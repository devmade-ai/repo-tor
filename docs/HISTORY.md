# History

Log of significant changes to code and documentation.

## 2026-01-18

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
