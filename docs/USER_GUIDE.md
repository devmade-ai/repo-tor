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

**Tip:** Use the server-side aggregation script (`scripts/aggregate.js`) for better author identity mapping when the same person uses different emails across repositories.

## Dashboard Overview

When you load a data file, the dashboard displays analytics for that repository. The header shows the repository name, total commits, contributor count, and date range covered.

### Summary Cards

Four cards at the top provide quick metrics:

| Card | What It Shows | What It Means |
|------|--------------|---------------|
| **Commits** | Total number of commits | Overall activity level |
| **Contributors** | Unique contributors | Team size / involvement |
| **Lines Added** | Total lines added across all commits | Code growth |
| **Lines Removed** | Total lines removed across all commits | Code churn / cleanup |

**Interpreting the numbers:**
- High additions with low deletions = growing codebase
- Roughly equal additions/deletions = refactoring or maintenance phase
- Lines removed > added = cleanup, simplification, or debt reduction

## Dashboard Tabs

### Timeline Tab

Shows **when** commits happened and **what** was recently committed.

**Filters**

The filter bar allows you to narrow down commits:

| Filter | Description |
|--------|-------------|
| **Tag** | Show only commits with a specific tag (feature, bugfix, etc.) |
| **Author** | Show only commits from a specific contributor |
| **Repo** | Show only commits from a specific repository (aggregated data only) |
| **From/To** | Show commits within a date range |

- Filters apply to both the chart and commit list
- The "Showing X of Y commits" counter updates as you filter
- Click "Clear Filters" to reset all filters

**Commit Timeline Chart**
- Bar chart showing commits per day
- Taller bars = more activity that day
- Gaps indicate periods of inactivity
- Chart updates when filters are applied

**What to look for:**
- Consistent activity vs sporadic bursts
- Unusual spikes (release pushes, deadline crunches)
- Quiet periods (holidays, blocked work)
- Filter by author to see individual contribution patterns

**Recent Commits List**
- Shows up to 50 commits matching current filters
- Each commit displays:
  - **Tag badges** (color-coded, up to 3 shown with +N overflow)
  - **Subject** - The commit message summary
  - **Metadata** - SHA, author, date, repo (if aggregated)
  - **Line changes** - Green (+) additions, red (-) deletions

### Progress Tab

Shows **how** the project is evolving over time.

**Monthly Commit Volume**
- Bar chart of commits per month
- Shows overall development pace
- Useful for identifying trends (ramping up, slowing down)

**What to look for:**
- Upward trend = increasing activity
- Downward trend = maintenance mode or reduced resources
- Seasonal patterns = release cycles, budget years

**Cumulative Growth (Lines of Code)**
- Line chart showing net lines over time (additions minus deletions)
- Represents codebase size evolution

**What to look for:**
- Steady upward slope = consistent growth
- Steep increases = major feature additions
- Flat or declining = refactoring, removing code, or low activity
- Sudden drops = large deletions (removed modules, cleanup)

**Feature vs Bug Fix Trend**
- Two overlapping line charts:
  - **Green** = Features (`feature` tag)
  - **Red** = Bug fixes (`bugfix` tag)
- Shows monthly counts of each tag

**What to look for:**
- Features > fixes = growth phase, adding capabilities
- Fixes > features = stabilization phase, quality focus
- Parallel lines = balanced development
- Fix spikes after feature spikes = common pattern (new code has bugs)
- Sustained high fixes = potential quality issues

### Contributors Tab

Shows **who** is contributing and **how much**.

**Commits by Contributor**
- Horizontal bar chart of commit counts
- Shows top 10 contributors
- Indicates activity distribution

**Lines Changed by Contributor**
- Horizontal bar chart of total lines touched (additions + deletions)
- Different perspective than commit count

**Why both matter:**
- High commits + low lines = many small changes (docs, config, small fixes)
- Low commits + high lines = large feature work, major refactors
- Balanced = typical development work

**Contributor Details**
- Full list of all contributors
- Shows name, email, commit count, and line changes

**What to look for:**
- Bus factor: Is work concentrated in one person?
- Engagement: Are all team members contributing?
- Specialists: Who works on what (by examining their commits)?

### Security Tab

Shows commits related to **security**.

**Security Count**
- Total number of security-related commits
- Includes commits with:
  - Type `security`
  - Tag `security`
  - Security-related keywords in the message

**Security Commits List**
- Detailed view of each security commit
- Shows full subject, body excerpt, author, and date

**What to look for:**
- Zero security commits isn't necessarily good (are you looking?)
- Clustered security commits = audit or vulnerability response
- Regular security commits = proactive security culture
- Review the commit bodies for severity context

### Timing Tab

Shows **when** work happens - time of day and day of week patterns.

**Header Controls**
- **Timezone selector** - Switch between Local (browser) and UTC time display
- Charts update dynamically when you change the timezone

**Commits by Hour of Day**
- Bar chart showing commit distribution across 24 hours (0-23)
- **Blue bars** = Work hours (8:00-17:00)
- **Gray bars** = After hours (before 8:00 or after 17:00)
- Hover for "Work hours" or "After hours" tooltip

**What to look for:**
- Peak activity hours: When is the team most productive?
- After-hours work: Is there significant work outside business hours?
- Time zone spread: For distributed teams, are commits spread across hours?
- Concentrated vs distributed: Focused sprints vs steady work?

**Commits by Day of Week**
- Bar chart showing commit distribution across Mon-Sun
- **Blue bars** = Weekdays (Monday-Friday)
- **Gray bars** = Weekends (Saturday-Sunday)
- Days ordered Monday-first for business context

**What to look for:**
- Weekend work: Are people working on weekends regularly?
- Mid-week peaks: Tuesday-Thursday often have highest activity
- Monday/Friday patterns: Slow starts or wrap-up days?
- Work-life balance signals: High weekend activity may indicate deadline pressure

**Interpreting patterns:**
| Pattern | What It May Indicate |
|---------|---------------------|
| Most commits 9-17 | Typical office hours team |
| Evening spike (18-22) | Remote/flexible workers or side projects |
| Uniform distribution | Globally distributed team |
| Weekend heavy | Deadline crunch or startup culture |
| Friday low | Team winds down for the week |

### By Tag Tab

Shows the **composition** of work done.

**Commits by Tag (Doughnut Chart)**
- Visual breakdown of commit tags
- A commit can have multiple tags (e.g., feature + test)
- Larger slices = more commits with that tag

**Tag Breakdown**
- Percentage bar for each tag
- Sorted by count (highest first)
- Note: Total may exceed commit count due to multi-tag commits

**Tag Vocabulary:**

| Tag | Color | Meaning |
|-----|-------|---------|
| `feature` | Green | New features or capabilities |
| `bugfix` | Red | Bug fixes |
| `security` | Dark Red | Security patches or hardening |
| `docs` | Blue | Documentation changes |
| `refactor` | Purple | Code restructuring (no behavior change) |
| `test` | Orange | Test additions or updates |
| `cleanup` | Gray | Maintenance, removing dead code |
| `performance` | Cyan | Performance improvements |
| `style` | Pink | Formatting, whitespace |
| `config` | Slate | Build, CI/CD, configuration changes |
| `dependency` | Lime | Dependency updates |
| `other` | Light Gray | Unclassified |

**What to look for:**
- Healthy mix: feature + bugfix + test + docs
- Heavy `bugfix` ratio: May indicate quality issues
- No `test` commits: Testing might be lacking
- Lots of `cleanup`: Technical debt being addressed
- High `other`: Commit messages may need better formatting

## Interpreting Overall Health

Use these patterns to assess repository health:

| Signal | Good | Concerning |
|--------|------|-----------|
| Activity | Consistent commits | Long gaps or sporadic bursts |
| Growth | Steady cumulative growth | Stagnant or declining |
| Balance | Mix of feat/fix/test | Dominated by one type |
| Distribution | Multiple active contributors | Single contributor dominance |
| Security | Present and reviewed | None or clustered incidents |

## Tips for Using the Dashboard

1. **Compare over time** - Load data from different dates to see trends
2. **Focus on ratios** - Absolute numbers matter less than proportions
3. **Consider context** - A "fix" spike after launch is normal
4. **Look for patterns** - Repeated issues suggest systemic problems
5. **Use with other data** - Combine with issue trackers, reviews, etc.

## Loading Data

- **File picker**: Click "Choose File" to select a `data.json` file
- **Auto-load**: Place `data.json` in the same folder as the dashboard
- The dashboard accepts files generated by the extraction or aggregation scripts

## Multi-Repository View

When loading aggregated data (from multiple repositories), the dashboard shows combined metrics:

- **Header** displays "Aggregated (N repos)" instead of a single repo name
- **Commits** show a `repo_id` indicating which repository each came from
- **Contributors** may show the same person across multiple repos (if author mapping was used)
- **Summary** includes per-repository breakdown

**Interpreting aggregated data:**
- Compare activity levels across repositories
- Identify contributors who work across multiple repos
- Spot repos that may need more attention (low activity, high fix ratio)
- See organization-wide commit patterns and trends

---

*For setup and data extraction instructions, see [ADMIN_GUIDE.md](./ADMIN_GUIDE.md).*
