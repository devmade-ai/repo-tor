# User Guide

Understanding and interpreting the Git Analytics Dashboard.

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

**Commit Timeline Chart**
- Bar chart showing commits per day
- Taller bars = more activity that day
- Gaps indicate periods of inactivity

**What to look for:**
- Consistent activity vs sporadic bursts
- Unusual spikes (release pushes, deadline crunches)
- Quiet periods (holidays, blocked work)

**Recent Commits List**
- Shows the 50 most recent commits
- Each commit displays:
  - **Type badge** (color-coded)
  - **Subject** - The commit message summary
  - **Metadata** - SHA, author, date
  - **Tags** - Security, breaking, etc. (if present)
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
  - **Green** = Features (`feat` commits)
  - **Red** = Bug fixes (`fix` commits)
- Shows monthly counts of each type

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

### By Type Tab

Shows the **composition** of work done.

**Commits by Type (Doughnut Chart)**
- Visual breakdown of commit types
- Larger slices = more commits of that type

**Type Breakdown**
- Percentage bar for each type
- Sorted by count (highest first)

**Commit Types Explained:**

| Type | Color | Meaning |
|------|-------|---------|
| `feat` | Green | New features or capabilities |
| `fix` | Red | Bug fixes |
| `security` | Dark Red | Security patches or hardening |
| `docs` | Blue | Documentation changes |
| `refactor` | Purple | Code restructuring (no behavior change) |
| `test` | Orange | Test additions or updates |
| `chore` | Gray | Maintenance, dependencies |
| `perf` | Cyan | Performance improvements |
| `style` | Pink | Formatting, whitespace |
| `build` | Brown | Build system changes |
| `ci` | Slate | CI/CD configuration |
| `revert` | Orange | Reverted commits |
| `other` | Light Gray | Unclassified |

**What to look for:**
- Healthy mix: feat + fix + test + docs
- Heavy `fix` ratio: May indicate quality issues
- No `test` commits: Testing might be lacking
- Lots of `chore`: Dependency maintenance overhead
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
- The dashboard accepts files generated by the extraction script

---

*For setup and data extraction instructions, see [ADMIN_GUIDE.md](./ADMIN_GUIDE.md).*
