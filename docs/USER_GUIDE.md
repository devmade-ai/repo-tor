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

## Dashboard Overview

When you load a data file, the dashboard displays analytics for that repository. The header shows the repository name, total commits, contributor count, and date range covered.

### Summary Cards

Four cards at the top provide meaningful metrics about the work being done:

| Card | What It Shows | What It Means |
|------|--------------|---------------|
| **Files Changed** | Total unique files modified | Scope of changes across codebase |
| **Avg Complexity** | Average complexity score (1-5) | How involved the changes are |
| **Top Work Type** | Most common tag/type of work | Primary focus of development |
| **Contributors** | Unique contributors | Team size / involvement |

## Dashboard Tabs (V2)

The dashboard uses **4 tabs** organized by logical groupings:

| Tab | Purpose | Primary User |
|-----|---------|--------------|
| **Overview** | Executive summary, quick stats, highlights | Executive |
| **Activity** | Timeline, heatmap, when work happens | Dev Manager |
| **Work** | Progress, tags, contributors, what's being built | Dev Manager |
| **Health** | Security, urgency, operational indicators | Both |

---

### Overview Tab (Executive Landing)

The **default tab** designed for executives who need quick, high-level insights.

**Period Comparison**
- Use the dropdown to compare: This Week vs Last Week, This Month vs Last Month, This Quarter vs Last Quarter
- All metrics update dynamically when you change the period

**Quick Stats Cards**

| Card | What It Shows | Click Action |
|------|--------------|--------------|
| **Features Built** | New features added with trend | Opens detail pane with feature commits |
| **Bugs Fixed** | Bug fixes completed with trend | Opens detail pane with bugfix commits |
| **Avg Urgency** | Average urgency of changes | Opens detail pane with reactive commits |
| **% Planned** | Ratio of planned work (urgency 1-2) | Opens detail pane with planned commits |

Trend indicators:
- **↑ Green** = Increase vs previous period
- **↓ Red** = Decrease vs previous period

**Work Breakdown**
- Doughnut chart showing top 5 tag categories for the period
- Quick visual of where effort is being spent

**Key Highlights**
- **Top Contributor** - Most active person in the period
- **Busiest Day** - Day with most commits
- **Most Active Repo** - (For aggregated data) Which project saw most activity
- **After-Hours Work** - Percentage of commits outside 8am-5pm

**Activity Snapshot**
- After-hours, weekend, holiday, and complex commit counts

---

### Activity Tab (When Things Happen)

Shows **when** commits happened and **what** was recently committed.

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

### Work Tab (What's Being Done)

Shows **how** work is evolving and **who does what**.

**Work Type Trend**
- Features vs bug fixes by month (overlapping line charts)

**Complexity Over Time**
- Average complexity by month (rising = architectural changes)

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

Shows operational health - security, urgency, work patterns.

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

---

## Export and Sharing

### Share Link
Click the **Share** button to copy a shareable URL with your current view state.

### PDF Export
Click the **Export PDF** button to download a PDF report of the current view.

## Dark Mode

Click the **moon/sun icon** to toggle between light and dark themes.

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
