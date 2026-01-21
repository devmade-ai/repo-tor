# History

Log of significant changes to code and documentation.

## 2026-01-21

### Fix: Charts Not Rendering in Hidden Tabs

Fixed charts in Activity and Work tabs appearing empty on mobile.

**Problem:** Chart.js cannot properly render charts inside hidden containers (display: none or visibility: hidden). When the dashboard loads, only the Overview tab is visible. Charts rendered to the Activity tab (heatmap, hour chart, day chart) and Work tab (tags chart) would fail silently because their parent containers had zero width/height.

**Changes to `dashboard/index.html`:**
- Added re-render logic to tab click handler
- When switching to 'activity' tab: calls `renderTiming()` to re-render all timing charts
- When switching to 'work' tab: calls `renderTags()` to re-render tag charts

**Result:** Charts now render correctly when users switch to Activity or Work tabs.

---

### Fix: Author Identity Mapping in Aggregation

Fixed author identity mapping not being applied during data aggregation.

**Problem:** The `config/author-map.json` existed to merge multiple email addresses (e.g., `jacotheron87@gmail.com` and `34473836+jacotheron87@users.noreply.github.com`) into a single identity, but the aggregation script wasn't using it.

**Changes to `scripts/aggregate-processed.js`:**
- Added `loadAuthorMap()` to read `config/author-map.json` at startup
- Added `resolveAuthorId()` to map raw emails to canonical IDs
- Updated `generateAggregation()` to normalize `author_id` in all commits
- Updated `calcContributorAggregations()` to merge commits by canonical ID
- Added `metadata.authors` to generated data for dashboard resolution
- Contributors now include `name`, `email`, and `emails` (if merged)

**Result:**
- Before: 5 contributors (same person counted twice)
- After: 4 contributors (emails properly merged)
- Dashboard filter dropdown now shows one entry per person

---

### Feature: Global Filters Across All Tabs

Made dashboard filters apply globally to all tabs instead of just the Activity tab.

**Problems Fixed:**
1. Filter bar was only visible on Activity tab
2. Filters only affected the commit list, not other tabs (Work, Health, etc.)
3. Filter state was lost when switching between repos

**Changes:**
- Moved filter bar above tabs (always visible)
- Added filter indicator showing "X of Y" when filters are active
- Updated all render functions to use `getFilteredCommits()`:
  - `updateSummaryStats()`, `renderProgress()`, `renderContributors()`
  - `renderTags()`, `renderHealth()`, `renderSecurity()`
  - `renderTiming()`, `renderHeatmap()`, `renderDeveloperPatterns()`
  - `renderSummary()`, all click handlers
- Filter state now persists across repo switches (validates options exist)

**Files changed:**
- `dashboard/index.html` - Global filter implementation

---

### Fix: Dashboard Data Format Inconsistencies

Fixed multiple data format inconsistencies causing incorrect stats and missing data in dashboard.

**Problem:** Different commits had different field formats due to varied extraction sources:

| Field | Format 1 | Format 2 | Missing |
|-------|----------|----------|---------|
| Files changed | `stats.filesChanged` (267) | `files_changed` (44) | 265 |
| Commit text | `subject` (532) | `message` (44) | 0 |
| Additions | `stats.additions` (267) | `lines_added` (44) | 265 |
| Deletions | `stats.deletions` (267) | `lines_deleted` (44) | 265 |

**Solution:** Added helper functions to normalize across all formats:
```javascript
function getFilesChanged(commit) {
    return commit.stats?.filesChanged || commit.filesChanged || commit.files_changed || 0;
}
function getCommitSubject(commit) {
    return commit.subject || commit.message || '';
}
function getAdditions(commit) {
    return commit.stats?.additions || commit.lines_added || 0;
}
function getDeletions(commit) {
    return commit.stats?.deletions || commit.lines_deleted || 0;
}
```

**Result:**
- Files changed: now shows 1,689 (was 0)
- All 576 commits now display subject/message correctly
- Additions/deletions now aggregated from all sources: 277,817 / 275,506

**Files changed:**
- `dashboard/index.html` - Added 4 helper functions, updated all field references

---

## 2026-01-20

### Storage Migration: Batches to Individual Commit Files

Migrated from storing commits in batch files to individual commit files.

**Old structure:** `processed/<repo>/batches/batch-NNN.json` (15 commits per file)
**New structure:** `processed/<repo>/commits/<sha>.json` (1 file per commit)

**Benefits:**
- Simpler deduplication (file existence = processed, no manifest sync issues)
- Atomic edits (fix one commit without touching others)
- Lower corruption risk (lose one file = lose one commit, not 15)
- Cleaner git diffs (individual commit changes are isolated)

**Files changed:**
- `scripts/save-commit.js` - New script replacing save-batch.js
- `scripts/aggregate-processed.js` - Updated to read from commits/
- `scripts/extract.js` - Updated to write individual commit files
- `scripts/migrate-batches-to-commits.js` - One-time migration script
- `docs/EXTRACTION_PLAYBOOK.md` - Updated workflow documentation

**Migration stats:**
- 4 repositories migrated
- 57 batch files converted
- 576 individual commit files created

---

### Fast Batch Saving Script

Added `scripts/save-batch.js` to speed up batch processing workflow.

**Problem:** Writing approved batches via IDE tools (Write/Edit) required approval dialogs for each file, which slowed down significantly as sessions got longer.

**Solution:** Script-based saving that writes both batch file and manifest in one fast bash command with no IDE dialogs.

**Usage:**
```bash
cat <<'EOF' | node scripts/save-batch.js <repo>
{"commits": [...analyzed commits...]}
EOF
```

**Files updated:**
- `scripts/save-batch.js` - New script for fast batch saving
- `docs/EXTRACTION_PLAYBOOK.md` - Updated workflow to use script

---

### Dashboard V2 Complete - Detail Pane and Visualizations

Completed the remaining Dashboard V2 features:

**Detail Pane Component:**
- Slide-out panel from right (30% width on desktop)
- Bottom sheet variant for mobile (85% viewport height)
- Click-outside or Escape key to dismiss
- Smooth CSS transition animations
- Shows filtered commits with message, author, date, tags, urgency/impact labels

**Click Interactions:**
- Overview cards → filtered commits (features, fixes, urgency, planned)
- Health cards → filtered commits (security, reactive, weekend, after-hours)
- Urgency distribution bars → commits by urgency level
- Impact distribution bars → commits by impact category
- Tag breakdown bars → commits with that tag
- Contributor cards → contributor's commits
- Urgency/Impact by contributor → contributor's commits

**New Visualizations Added:**
- Urgency Trend chart (line chart by month, lower is better)
- Impact Over Time chart (stacked bar chart by month)
- Urgency by Contributor (stacked bars showing planned/normal/reactive)
- Impact by Contributor (stacked bars showing user-facing/internal/infra/api)

**Dark Mode Support:**
- Added renderHealth() to dark mode re-render list
- New charts and detail pane respect dark mode

**Files updated:**
- `dashboard/index.html` - Detail pane, trend charts, contributor visualizations
- `docs/SESSION_NOTES.md` - Updated with completion status
- `docs/TODO.md` - Marked priorities 2 and 3 as complete

---

### Dashboard V2 Implementation Progress

Implemented core Dashboard V2 features:

**Aggregation Script:**
- Created `scripts/aggregate-processed.js` to read from processed/ data
- Outputs `dashboard/data.json` (overall) and `dashboard/repos/*.json` (per-repo)
- Includes urgency and impact breakdowns in aggregations
- Same schema for both overall and per-repo views

**Dashboard Structure:**
- Reorganized from 7 tabs to 4 tabs (Overview, Activity, Work, Health)
- Implemented TAB_MAPPING to show multiple content containers per tab
- No breaking changes - existing render functions continue to work

**New Visualizations:**
- Health tab: Security count, Reactive %, Weekend %, After Hours % cards
- Health tab: Urgency Distribution (Planned/Normal/Reactive bars)
- Health tab: Impact Distribution (user-facing/internal/infra/api bars)
- Overview tab: Avg Urgency card with trend indicator
- Overview tab: % Planned card (urgency 1-2 ratio)

**Files created:**
- `scripts/aggregate-processed.js` - New aggregation script
- `dashboard/repos/*.json` - Per-repo aggregated data

**Files updated:**
- `dashboard/index.html` - V2 tab structure and visualizations
- `dashboard/data.json` - Regenerated with urgency/impact data
- `docs/SESSION_NOTES.md` - Current progress
- `docs/TODO.md` - Updated completion status

**Remaining:**
- Detail pane component
- Click interactions for drill-down
- More visualizations (urgency trend, impact by contributor)

---

### Dashboard V2 Design Complete

Conducted reporting discovery session and designed new dashboard architecture.

**Process followed:**
1. Reviewed processed data to understand new dimensions (urgency, impact)
2. Referenced original [Discovery Session](DISCOVERY_SESSION.md) for user flows
3. Evaluated 5 design options for dashboard organization
4. Selected hybrid approach: Logical Groupings + Contextual Detail Pane

**Design decisions:**

| Decision | Rationale |
|----------|-----------|
| 4 tabs (down from 7) | Clearer mental model, less cognitive load |
| Detail pane (not navigation) | Preserves context while drilling down |
| Same schema for overall + per-repo | Enables consistent views at both levels |
| Urgency in Health tab | Operational health is a "health" concern |
| Impact in Work + Overview | Shows where effort goes |

**New dashboard structure:**
- **Overview** - Executive landing (quick scan in 10 seconds)
- **Activity** - When work happens (timeline + timing combined)
- **Work** - What's being done (progress + tags + contributors)
- **Health** - Operational concerns (security + urgency)

**New visualizations planned:**
- Urgency Distribution (planned vs reactive)
- Urgency Trend (operational health over time)
- Urgency by Contributor (who handles emergencies)
- Impact Allocation (where effort goes)
- Impact Over Time (shifting priorities)
- Impact by Contributor (who works on what)

**Key requirement identified:**
Aggregation must read from `processed/` (AI-tagged data) not `reports/` (raw data).
Output same schema for overall and per-repo views.

**Files created:**
- `docs/DASHBOARD_V2_DESIGN.md` - Full design specification

**Files updated:**
- `docs/SESSION_NOTES.md` - Current state and next actions
- `docs/TODO.md` - Reorganized for V2 implementation

---

### Manifest-Based Incremental Processing

Implemented SHA-based tracking for reliable incremental processing ("feed the chicken"):

**Problem:** Batch file numbers shift when new commits are added, making it impossible to safely resume processing after a merge/extraction cycle.

**Solution:** Track processed commits by SHA, not batch number:
- `processed/<repo>/manifest.json` - Source of truth for which commits have been processed
- `scripts/pending.js` - Compares manifest SHAs against fresh extraction, generates pending batches
- `scripts/manifest-update.js` - Updates manifest after each batch approval

**How it works:**
1. `pending.js` reads manifest to get list of processed SHAs
2. Compares against `reports/<repo>/commits.json` to find unprocessed commits
3. Generates `pending/<repo>/batches/` with only unprocessed commits
4. After approval, `manifest-update.js` adds new SHAs to manifest
5. Safe to add new commits between sessions - they'll appear in next pending batch

**Files added:**
- `scripts/pending.js` - Pending batch generator
- `scripts/manifest-update.js` - Manifest updater
- `processed/*/manifest.json` - Per-repo manifests (4 files)

**Files updated:**
- `docs/EXTRACTION_PLAYBOOK.md` - Updated "Feed the Chicken" workflow
- `.gitignore` - Added `pending/` directory
- `docs/SESSION_NOTES.md` - Updated progress and key files

### Schema Update: Urgency and Impact Dimensions

Added two new dimensions for commit analysis beyond tags and complexity:

**Urgency (1-5)** - How critical was the change? Reactive vs planned work:
- 1 = Planned (scheduled work, no time pressure)
- 2 = Normal (regular development pace)
- 3 = Elevated (needs attention soon)
- 4 = Urgent (high priority, blocking work)
- 5 = Critical (production down, security vulnerability)

**Impact** - Who/what is affected by the change:
- `internal` - Only affects developers (tests, refactoring, docs)
- `user-facing` - Directly affects end users (UI, features, bug fixes)
- `infrastructure` - Affects deployment/operations (CI/CD, Docker, monitoring)
- `api` - Affects external integrations (endpoints, breaking changes)

**Value for users:**
- Dev Managers: See ratio of planned vs reactive work over time
- Executives: Operational health metric — high urgency % = problems
- Both: Understand where effort goes (internal vs user-facing vs infrastructure)

**Files updated:**
- `docs/EXTRACTION_PLAYBOOK.md` - Added urgency/impact guidelines, examples, schema
- `docs/SESSION_NOTES.md` - Updated workflow description
- `docs/COMMIT_CONVENTION.md` - Added urgency/impact to format, examples, checklist

### New Extraction Architecture

Redesigned the extraction system for efficiency and persistence:

**Two triggers:**
- **"hatch the chicken"** - Full reset: delete everything, AI analyzes ALL commits from scratch
- **"feed the chicken"** - Incremental: AI analyzes only NEW commits not yet processed

**New file structure:**
- `processed/<repo>/commits.json` - Source of truth (AI-analyzed commits, committed to git)
- `reports/` folder removed (was ephemeral)
- Dashboard data generated from `processed/`

**Changes:**
- Deleted `scripts/tag-commits.js` (AI analyzes commits directly instead of script)
- Rewrote `docs/EXTRACTION_PLAYBOOK.md` with new architecture
- Updated `CLAUDE.md` with both trigger commands

**Key benefit:** Don't redo all commits each time. Process incrementally - only analyze new commits.

### AI Persona Triggers

Added two personas to CLAUDE.md for focused interactions:

- **@coder** - Trigger with `@coder` at message start. Focus: development work (writing code, bug fixes, features, refactoring, architecture)
- **@data** - Trigger with `@data` at message start. Focus: data extraction and processing (playbooks, reports, aggregation)

The existing "feed the chicken" command is now part of the @data persona.

### Activity Timeline Chart

Added visual timeline to the Timeline tab:

- **Bar chart** showing commits by date across all projects
- **Multi-repo support** - Stacked bars color-coded by repository
- **Filter-responsive** - Updates when applying tag/author/repo/date filters
- **Date range** - Shows last 60 dates with activity
- **Adaptive labels** - Shows date labels intelligently based on data density

### Rolling Period Comparison

Changed period comparison from calendar-based to rolling:

- **Last 7 Days** - Rolling 7-day window (replaces "This Week")
- **Last 30 Days** - Rolling 30-day window (replaces "This Month")
- **More intuitive** - Users checking recent activity get predictable ranges
- **Consistent trends** - Comparison periods are always equal length

### Mobile Layout Fixes

Improved responsive layout for small screens:

- **Executive Summary header** - Stacks title and dropdown on mobile
- **Timing tab header** - Stacks title and timezone selector on mobile
- **Work Hours Settings** - Stacks title and time selectors on mobile
- **Shorter dropdown labels** - "Last 7 Days" instead of verbose text

### Developer Activity Patterns

Added per-contributor timing analysis to the Timing tab:

- **Per-author breakdown** - Shows timing patterns for top 6 contributors
- **Key metrics per person:**
  - Peak Hour - most common commit time
  - Peak Day - most common commit day
  - Work Hours % - percentage during configured work hours
  - Weekends % - percentage on Saturday/Sunday
- **Color-coded indicators** - Green (healthy), amber (moderate), red (concern)
- **Responds to configurable work hours**

### Configurable Work Hours

Added ability to customize what counts as "work hours":

- **Start/end time selectors** - Added to Timing tab
- **Range:** 6:00-10:00 start, 16:00-20:00 end
- **Default:** 8:00-17:00
- **Updates dynamically:**
  - Hour chart coloring
  - Work pattern badges
  - Developer activity patterns
  - Summary statistics
- **Persists to localStorage**

### Loading States

Added loading feedback during data fetch:

- **Loading spinner** - Animated spinner during auto-load
- **Status message** - "Loading dashboard data..."
- **Graceful fallback** - Shows file picker if no data found
- **CSS animations** - Skeleton loading and spin animations

### Private Repo Sanitization Mode

Added privacy mode for sensitive repositories:

- **Eye toggle button** - In header, next to theme toggle
- **Author anonymization** - Names become "Developer A", "Developer B", etc.
- **Message hiding** - Commit subjects sanitized to "[message hidden]"
- **Conventional commits** - Preserves type prefix (e.g., "feat: [message hidden]")
- **Security tab** - Hides commit body details
- **Persistence** - Saved to localStorage
- **Toast notification** - Confirms mode toggle

### Activity Heatmap

Added commit time heatmap to the Timing tab:

- **24×7 grid visualization** - Hours (0-23) on Y-axis, days (Mon-Sun) on X-axis
- **Color intensity** - 5 levels from gray (0) to dark blue (most commits)
- **Interactive cells** - Hover shows exact commit count for each hour/day slot
- **Timezone aware** - Updates when Local/UTC toggle changes
- **Monday-first ordering** - Business-friendly day sequence
- **Responsive** - Scrollable on mobile, full-width on desktop
- **Legend** - Visual scale explaining color intensity

### Dark Mode

Implemented full dark mode support:

- **Theme toggle** - Moon/sun button in header
- **System preference** - Auto-detects `prefers-color-scheme: dark` on first visit
- **Persistence** - Saves preference to localStorage
- **CSS variables** - Clean theming with `--bg-primary`, `--text-primary`, etc.
- **Chart.js integration** - Charts re-render with appropriate colors
- **Comprehensive coverage** - All cards, badges, inputs, heatmap cells styled
- **Instant switch** - No page reload needed, applied via class toggle on `<html>`

### Filter Persistence

Added localStorage persistence for dashboard state:

- **What's saved:**
  - Filter values (tag, author, repo, date range)
  - Active tab
  - Summary period (week/month/quarter)
  - Timezone (local/utc)
- **Load behavior:**
  - Restores on page load if no URL params present
  - URL params take priority (for shareable links)
- **Save triggers:**
  - Any filter change
  - Tab switch
  - Period or timezone change
- **Implementation:** Single `dashboardState` key in localStorage

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

### Cache-Busting for Data Files

Added automatic cache-busting to prevent browsers from serving stale data.json:

- Modified deploy.yml to append git commit hash as query parameter
- Transforms `fetch('data.json')` to `fetch('data.json?v=abc123')` during deployment
- Ensures users always get the latest data after each deployment

### Executive Summary View

Added new "Summary" tab as the default view for executive quick scanning:

- **Period comparison** - Select week/month/quarter to compare against previous period
- **Quick stats cards** with trend indicators:
  - Commits with ↑/↓ percentage vs previous period
  - Active contributors count
  - Features count
  - Bug fixes count
- **Work breakdown chart** - Doughnut chart showing top 5 tag categories
- **Key highlights** - Auto-generated insights:
  - Top contributor for the period
  - Busiest day
  - Most active repo (for aggregated data)
  - After-hours work percentage
- **Activity snapshot** - At-a-glance metrics:
  - Average commits per day
  - After-hours commit count
  - Weekend commit count
  - Holiday commit count

Implementation:
- Summary tab positioned first for quick executive access
- Dynamic period calculations for week/month/quarter
- Trend indicators show green (↑) for increases, red (↓) for decreases
- Integrates with work pattern helpers for after-hours/weekend/holiday stats

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

### Dashboard Cleanup - Remove Vanity Elements

Removed all vanity metrics and charts from the dashboard:

**Progress Tab:**
- Removed: Monthly Commit Volume chart
- Removed: Cumulative Growth (Lines of Code) chart
- Added: Complexity Over Time chart (avg complexity by month)
- Kept: Feature vs Bug Fix Trend

**Contributors Tab - Complete Rework:**
- Removed: Commits by Contributor chart
- Removed: Lines Changed by Contributor chart
- Removed: Contributor Details list (showed commits + lines)
- Added: "Who Does What" - work type breakdown per contributor
- Added: Complexity by Contributor chart

**Timeline Tab:**
- Removed: Commit Timeline chart (just showed daily counts)
- Removed: +/- lines display from commit list
- Added: Complexity badge (1-5) on each commit
- Increased visible commits from 50 to 100

**Summary Tab Highlights:**
- Removed: "Top Contributor" (vanity)
- Removed: "Busiest Day" (vanity)
- Added: "Complex Changes" (high vs simple count)
- Added: "Quality Work" (refactors + tests count)
- Kept: "Most Active Repo" (for aggregated data)
- Kept: "Off-Hours Work" (burnout indicator)

**Summary Tab Activity Snapshot:**
- Removed: "Avg commits/day" (vanity)
- Added: "Complex" count
- Kept: After-hours, Weekend, Holiday (burnout indicators)

### Metrics Overhaul - Focus on What Matters

Replaced vanity metrics (commits, lines of code) with meaningful work metrics:

**Main Summary Cards (top of dashboard):**
- ~~Lines Added~~ → **Files Changed** (scope of work)
- ~~Lines Removed~~ → **Avg Complexity** (1-5 scale)
- ~~Commits~~ → **Top Work Type** (primary focus)
- Contributors (kept)

**Executive Summary Tab:**
- ~~Commits count~~ → **Features Built** (what was delivered)
- ~~Active Contributors~~ → **Bugs Fixed** (quality work)
- Added **Avg Complexity** with trend
- Added **Files Touched** with trend

**PDF Export:**
- Updated to show new metrics instead of lines added/removed

**Rationale:** Lines of code and commit counts are vanity metrics that don't reflect actual work value. The new metrics focus on:
- What kind of work (tags/types)
- How complex the changes are
- How much of the codebase was affected

### Export and Share Features (Priority 4)

Added PDF export and shareable links to the dashboard:

**PDF Export:**
- Button in header to generate PDF report
- Exports current tab with all charts and statistics
- Includes header with repo name, date range, timestamp
- Shows "Filtered view" indicator when filters active
- Uses html2pdf.js library for client-side generation
- Landscape A4 format for optimal chart display
- Loading spinner during generation

**Shareable Links:**
- Button to copy current view URL to clipboard
- Encodes in URL parameters:
  - Current tab (summary, timeline, timing, etc.)
  - Filter state (tag, author, repo, date range)
  - Summary period (week/month/quarter)
  - Timezone setting (local/utc)
- Auto-applies URL state on page load
- Toast notification confirms copy success

**UI additions:**
- Share and Export PDF buttons in dashboard header
- Buttons hide until data loads
- Responsive layout (icons-only on mobile)
- Toast notification system for feedback
- Print styles for clean output

### Summary Tab and Tag Display Fixes

Fixed two bugs in the dashboard:

1. **Summary tab showing zeros** - Date range comparison was excluding current day's commits
   - Issue: `currentEnd` was set to midnight (00:00:00) causing commits made after midnight to be excluded
   - Fix: Added `endOfDay()` helper that sets time to 23:59:59.999
   - Affects: Summary tab quick stats, work breakdown chart, key highlights, activity snapshot

2. **Tag display order inconsistency** - Pie chart and breakdown list showed tags in different order
   - Issue: Pie chart showed tags in encounter order, list showed them sorted by count
   - Fix: Sort tags by count before rendering the chart so both views are consistent
   - Highest count tag now appears first in both the pie chart legend and the breakdown list

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
