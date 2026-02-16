# User Guide

Understanding and interpreting the Git Analytics Dashboard.

**Live dashboard:** https://devmade-ai.github.io/repo-tor/

## Loading Data

### Single Repository
Click the file picker and select a single `data.json` file to load analytics for one repository.

### Multiple Repositories
To view combined analytics across multiple repositories:

1. Click the file picker
2. Hold Ctrl (Windows/Linux) or Cmd (Mac) and select multiple `data.json` files
3. The dashboard will automatically combine the data

When multiple files are loaded:
- Header shows "Combined (N repos)"
- Commits from all repos are merged and sorted by date
- Contributors are aggregated (same email = same person)
- The Repo filter appears to filter by specific repository
- Summary cards show totals across all repositories

**Tip:** Use the server-side aggregation script (`scripts/aggregate-processed.js`) for better author identity mapping when the same person uses different emails across repositories.

## Settings Panel

Click the **gear icon** in the header to open the Settings panel. This slide-out panel contains all configuration options:

**View Settings:**
- **View Level** - Controls data granularity (Executive/Management/Developer)
- **Privacy Mode** - Toggle to hide names and commit messages for sensitive data

**Time Settings:**
- **Timezone** - Switch between Local and UTC time display
- **Work Hours Start/End** - Define what counts as "work hours" for timing analysis (affects after-hours calculations)

**Install App (PWA):**
- **Install Dashboard** - Install as a standalone app for offline access
- Manual install instructions for different browsers

Settings are saved to your browser and persist across sessions.

---

## Filters

Click the **filter icon** in the header to open the filter sidebar. Filters use multi-select checkboxes with per-filter modes:

**Available Filters:**
- **Tag** - Filter by commit tags (feature, bugfix, refactor, etc.)
- **Author** - Filter by contributor
- **Repo** - Filter by repository (only shown when viewing multiple repos)
- **Urgency** - Filter by urgency level (Planned, Normal, Reactive)
- **Impact** - Filter by impact type (User-facing, Internal, Infrastructure, API)
- **Date Range** - Filter by date with quick presets (30 days, 90 days, This year, Last year)

**Per-Filter Modes:**
Each filter has its own **Inc/Exc** (Include/Exclude) toggle:
- **Inc (Include)** - Show commits matching ANY selected values
- **Exc (Exclude)** - Hide commits matching ANY selected values

This allows complex filtering like "show feature commits but exclude bot authors".

**Shareable Links:**
- Click the **Share** button to copy a link with your current filters
- Links preserve tab, filters (with modes), and detail pane state
- Multi-select values are comma-separated in the URL
- Exclude mode is prefixed with `!` (e.g., `?tag=!test,docs`)

---

## Installing as an App (PWA)

The dashboard can be installed as a Progressive Web App for offline access and a native app experience.

**Automatic Install:**
1. Open Settings (gear icon)
2. Scroll to "Install App" section
3. Click "Install Dashboard" if available

**Manual Install:**
- **Chrome/Edge:** Click the install icon in the address bar, or Menu → "Install app"
- **Safari (iOS):** Tap Share → "Add to Home Screen"
- **Firefox:** Menu → "Install" (if available)

Once installed, the app works offline using cached data from your last visit.

**Updating the App:**
The app updates automatically in the background when a new version is deployed. To apply a pending update, close and reopen the app. You can also manually check in Settings → Updates → "Check for Updates".

---

## View Levels

The dashboard supports three view levels for different audiences. Select your view level from Settings (gear icon):

| View Level | Best For | What Changes |
|------------|----------|--------------|
| **Executive** | High-level summaries | Aggregated totals, weekly heatmap, stats-only drilldowns |
| **Management** | Project-level views | Per-repo groupings, daily heatmap, stats drilldowns |
| **Developer** | Detailed analysis (default) | Individual contributors, hourly heatmap, full commit lists |

**What stays the same across all views:**
- All tabs and charts remain visible
- Filters (date range, repo, tag, author) apply to all views
- Layout and structure are consistent

**What changes per view level:**

| Element | Executive | Management | Developer |
|---------|-----------|------------|-----------|
| Contributor cards | "All Contributors (45)" | "repo-api (12 people)" | "Alice Chen" |
| Heatmap | Weekly activity blocks | Day-of-week distribution | 24×7 hourly grid |
| Click drilldowns | Summary stats | Stats + repo breakdown | Full commit list |
| Interpretation guidance | Shown | Shown | Hidden |

**Role-Specific Guidance:** Executive and Management views show contextual interpretation hints on key sections (e.g., "high weekend % may signal burnout risk"). Developers see raw data without hints.

Your view level selection is saved in your browser and will persist across sessions.

---

## Dashboard Overview

When you load a data file, the dashboard displays analytics for that repository. The header shows the repository name, total commits, contributor count, and date range covered.

### Summary Cards

Two cards at the top provide meaningful metrics about the work being done:

| Card | What It Shows | What It Means |
|------|--------------|---------------|
| **Files Changed** | Total unique files modified | Scope of changes across codebase |
| **Contributors** | Unique contributors | Team size / involvement |

## Dashboard Tabs (V2)

The dashboard uses **5 tabs** organized by logical groupings:

| Tab | Purpose | Primary User |
|-----|---------|--------------|
| **Summary** | Executive summary, quick stats, highlights | Executive |
| **Timeline** | Timeline, heatmap, when work happens | Dev Manager |
| **Breakdown** | Progress, tags, contributors, what's being built | Dev Manager |
| **Health** | Security, urgency, operational indicators | Both |
| **Discover** | Explore metrics, randomized insights, file activity | All |

---

### Summary Tab (Executive Landing)

The **default tab** designed for executives who need quick, high-level insights.

**Quick Stats Cards**

| Card | What It Shows | Click Action |
|------|--------------|--------------|
| **Features Built** | Total features in filtered commits | Opens detail pane with feature commits |
| **Bugs Fixed** | Total bug fixes in filtered commits | Opens detail pane with bugfix commits |
| **Avg Urgency** | Average urgency of changes | Opens detail pane with reactive commits |
| **% Planned** | Ratio of planned work (urgency 1-2) | Opens detail pane with planned commits |

**Key Highlights**
- **Complex Changes** - High complexity vs simple changes
- **Most Active Repo** - (For aggregated data) Which project saw most activity
- **Off-Hours Work** - Percentage of commits outside work hours
- **Quality Work** - Refactors and tests count
- **Risky Changes** - High and medium risk commit counts *(shown when risk data exists)*
- **Tech Debt** - Net debt balance and added/paid counts *(shown when debt data exists)*

**Activity Snapshot**
- After-hours, weekend, and holiday commit counts

---

### Timeline Tab (When Things Happen)

Shows **when** commits happened and **what** was recently committed.

**Summary Cards** (top of tab)

| Card | What It Shows |
|------|--------------|
| **Total Commits** | Count of commits in current filter |
| **Active Days** | Unique days with commits |
| **Contributors** | Unique contributors in period |
| **Avg / Day** | Commits per active day |

**Filters**

| Filter | Description |
|--------|-------------|
| **Tag** | Show only commits with a specific tag |
| **Author** | Show only commits from a specific contributor |
| **Repo** | Show only commits from a specific repository |
| **From/To** | Show commits within a date range |

**Activity Timeline**
- Daily commit bar chart showing when commits happened

**Changes List**
- Shows up to 100 changes matching current filters
- Each change displays: tags, subject, complexity, author, date, work pattern badges

**Activity Heatmap** (scroll down)
- 24×7 grid showing commits by hour and day of week
- Color intensity indicates commit density

**Commits by Hour/Day Charts**
- Distribution across 24 hours and days of week
- Blue = work hours, Gray = after hours/weekend

**Developer Activity Patterns**
- Per-contributor timing breakdown showing peak hours and weekend %

---

### Breakdown Tab (What's Being Done)

Shows **how** work is evolving and **who does what**.

**Summary Cards** (top of tab)

| Card | What It Shows |
|------|--------------|
| **Features** | Count of feature commits |
| **Bug Fixes** | Count of bugfix/fix commits |
| **Refactors** | Count of refactor commits |
| **Avg Complexity** | Average complexity score (1-5) |

**Work Type Trend**
- Features vs bug fixes by month (overlapping line charts)

**Complexity Over Time**
- Average complexity by month (rising = architectural changes)

**Work by Initiative (Epics)** *(shown when commits have epic labels)*
- Groups commits by initiative/feature (e.g., "dashboard-redesign", "auth-v2")
- Shows commit count and percentage for each epic
- **Click any epic bar** → Opens detail pane with all commits for that initiative
- **What to look for:** Which initiatives received the most effort

**Change Types (Semver)** *(shown when commits have semver data)*
- Doughnut chart showing patch/minor/major distribution
- Patches = bug fixes, Minor = new features, Major = breaking changes
- **Click any type** → Opens detail pane with matching commits
- **What to look for:** Healthy projects have mostly minor + patch; lots of major = instability

**Who Does What**
- Work type breakdown per contributor
- **Click any contributor card** → Opens detail pane with their commits

**Tag Breakdown**
- Percentage bar for each tag
- **Click any tag bar** → Opens detail pane with commits having that tag

**Complexity by Contributor**
- Horizontal bar chart showing average complexity per person

---

### Health Tab (Operational Concerns)

Shows operational health - security, urgency, risk, tech debt, and work patterns.

**Health Cards** (all clickable)

| Card | What It Shows | Click Action |
|------|--------------|--------------|
| **Security** | Count of security-related commits | Opens detail pane with security commits |
| **Reactive** | % of urgency 4-5 commits | Opens detail pane with reactive commits |
| **Weekend** | % of Saturday/Sunday commits | Opens detail pane with weekend commits |
| **After Hours** | % outside work hours | Opens detail pane with after-hours commits |

**Urgency Distribution**
- Horizontal bars: Planned (1-2), Normal (3), Reactive (4-5)
- **Click any bar** → Opens detail pane with commits at that urgency level

**Impact Distribution**
- Horizontal bars: user-facing, internal, infrastructure, api
- **Click any bar** → Opens detail pane with commits at that impact level

**Risk Assessment** *(shown when commits have risk data)*
- Horizontal bars: High, Medium, Low risk
- Risk is separate from complexity — a 1-line auth change is low complexity but high risk
- **Click any bar** → Opens detail pane with commits at that risk level
- **What to look for:** High % of high-risk changes = more review and testing needed

**Tech Debt Balance** *(shown when commits have debt data)*
- Horizontal bars: Debt Added, Debt Paid Down, No Change
- Net debt indicator shows whether debt is accumulating or shrinking
- **Click any bar** → Opens detail pane with matching commits
- **What to look for:** Net positive = debt accumulating; net negative = debt shrinking

**Debt Trend** *(shown when commits have debt data)*
- Line chart showing debt added vs debt paid down by month
- When the red line (added) is above green (paid), debt is growing

**Urgency Trend**
- Line chart showing average urgency by month (lower is better)

**Impact Over Time**
- Stacked bar chart showing distribution of impact categories by month

**Urgency by Contributor**
- Stacked bars showing planned/normal/reactive per person
- **Click any contributor** → Opens detail pane with their commits

**Impact by Contributor**
- Stacked bars showing user-facing/internal/infra/api per person
- **Click any contributor** → Opens detail pane with their commits

**Security Commits List**
- Detailed view of each security-related commit

---

### Discover Tab (Exploration Mode)

An exploration space for discovering different metrics and patterns in your data.

**Metric Cards**

Four randomizable metric cards that show different data points on each shuffle:

| Metric | What It Shows |
|--------|---------------|
| Net Code Growth | Total lines added minus deleted |
| Avg Commit Size | Average lines changed per commit |
| Deletion Ratio | Percentage of changes that are deletions |
| Feature:Bug Ratio | Ratio of features to bug fixes |
| Test Investment | Percentage of commits with test tag |
| Docs Investment | Percentage of commits with docs tag |
| Untagged Commits | Commits without any tags |
| Breaking Changes | Commits with breaking changes |
| Peak Hour | Most active hour of day |
| Peak Day | Most active day of week |
| Top Contributor | Percentage of commits by top author |
| Avg Files/Commit | Average files changed per commit |
| Single-File Commits | Percentage of 1-file commits |
| Large Commits | Commits over 500 lines |
| Refactor Work | Percentage of refactor commits |
| Weekend/Night Owl/Early Bird | Work pattern metrics |

**Card Controls**
- **Shuffle button** - Randomize non-pinned cards
- **Dropdown** - Select specific metric or "Random"
- **Pin button** - Keep a metric fixed during shuffle

**File Activity**
- Top 10 most-changed files with anonymized names
- Uses humorous names (e.g., "Grumpy Dragon") for privacy
- Shows relative activity with progress bars

**Comparisons**
- Visual comparisons between opposing metrics:
  - Weekend vs Weekday
  - Features vs Bug Fixes
  - Additions vs Deletions
  - Planned vs Reactive
  - Simple vs Complex

---

## Detail Pane

Clicking interactive elements opens a **detail pane** that slides in from the right (or bottom on mobile).

**Features:**
- Shows filtered commits matching your selection
- Each commit displays: message, author, date, tags, urgency, impact
- Close by clicking the X, clicking outside, or pressing Escape
- Main dashboard view remains visible for context

**What triggers the detail pane:**
- Overview cards (features, fixes, urgency, planned)
- Health cards (security, reactive, weekend, after-hours)
- Urgency/Impact distribution bars
- Tag breakdown bars
- Contributor cards and urgency/impact breakdowns

---

## Interpreting New Metrics

### Urgency (1-5 scale)

| Level | Label | Meaning |
|-------|-------|---------|
| 1-2 | Planned | Scheduled, proactive work |
| 3 | Normal | Regular development |
| 4-5 | Reactive | Urgent fixes, firefighting |

**What to look for:**
- High % Planned = healthy, executing roadmap
- High % Reactive = firefighting, tech debt issues
- Urgency trending up = increasing operational pressure

### Impact Categories

| Category | Meaning |
|----------|---------|
| user-facing | Changes visible to end users |
| internal | Internal tooling, admin features |
| infrastructure | DevOps, CI/CD, deployment |
| api | API changes, integrations |

**What to look for:**
- user-facing dominant = product development focus
- infrastructure heavy = platform investment
- Balanced mix = healthy full-stack work

### Risk (low / medium / high)

| Level | Meaning |
|-------|---------|
| Low | Minimal chance of breakage (docs, formatting, config) |
| Medium | Could cause issues if incorrect (features, refactors) |
| High | Touches critical paths (auth, data, security) |

**What to look for:**
- High % of high-risk changes = needs more review and testing
- Most commits should be low-medium risk
- Sudden spike in high-risk work may indicate infrastructure changes

### Tech Debt (added / paid / neutral)

| Status | Meaning |
|--------|---------|
| Added | Shortcuts, TODOs, workarounds introduced |
| Paid | Cleaned up existing tech debt |
| Neutral | Standard work, no debt impact |

**What to look for:**
- Net debt growing (added > paid) = debt accumulating, may need cleanup sprint
- Net debt shrinking (paid > added) = healthy debt management
- Sustained "added" without "paid" = increasing maintenance burden

### Epics (Initiative Grouping)

Shows how much effort went into multi-commit initiatives like feature builds or migrations.

**What to look for:**
- Large epic = significant investment in one area
- Many small epics = diverse, distributed work
- Unassigned commits = standalone work not tied to larger efforts

---

## Export and Sharing

### Share Link
Click the **Share** button to copy a shareable URL with your current view state.

### PDF Export
Click the **PDF** button (document icon) to download a PDF report of the current tab's content, including charts rendered as images.

## Theme

The dashboard uses a dark theme optimized for readability and reduced eye strain.

## Private Mode (Sanitization)

Click the **eye icon** to toggle private mode:
- Author names become anonymous
- Commit messages are hidden

---

## Tips for Using the Dashboard

1. **Start with Overview** - Get quick status in 10 seconds
2. **Click to drill down** - Any card, bar, or chart segment opens detail pane
3. **Use Health tab for ops reviews** - Urgency and work pattern insights
4. **Compare periods** - Change the period dropdown in Overview
5. **Export for meetings** - Generate PDFs for stakeholders

---

*For setup and data extraction instructions, see [ADMIN_GUIDE.md](./ADMIN_GUIDE.md).*
