# Dashboard V2 Design

**Date:** 2026-01-20
**Status:** Design Complete, Ready for Implementation

---

## Background

### Discovery Recap

The original [Discovery Session](DISCOVERY_SESSION.md) identified two distinct user types:

| User | Frequency | What They Care About |
|------|-----------|---------------------|
| **Executive** | Weekly to monthly | High-level, quick scan, progress, productivity |
| **Dev Manager (presenting)** | Ad-hoc meetings | Answering exec questions on the spot |
| **Dev Manager (analyzing)** | Daily to monthly | Team patterns, preferences, productivity |

**Key insight:** "This tool is for **reporting and understanding** what's actually happening."

### What's Changed

The processed data now includes richer dimensions:

| Dimension | Values | Purpose |
|-----------|--------|---------|
| `tags[]` | 55+ options | What type of work (multiple per commit) |
| `complexity` | 1-5 | How big/difficult the change |
| `urgency` | 1-5 | Reactive vs planned work (NEW) |
| `impact` | internal, user-facing, infrastructure, api | Who is affected (NEW) |

These new dimensions enable insights not possible before:
- **Urgency** reveals operational health (firefighting vs executing plans)
- **Impact** shows where effort goes (building for users vs internal maintenance)

---

## Design Decision

### Options Considered

1. **Enhance Existing Tabs** - Add urgency/impact to current 7-tab structure
2. **Two Separate Dashboards** - Executive vs Dev Manager dashboards
3. **Mode Toggle** - Single dashboard with Executive/Detailed switch
4. **Logical Groupings** - Group 7 tabs into 4 categories
5. **Dashboard + Detail Pane** - Fewer tabs with slide-out drill-down

### Chosen Approach: Hybrid

**Logical Groupings + Contextual Detail Pane**

Combines the clarity of grouped tabs with the power of in-context drill-down:

- **4 top-level tabs** (down from 7) - clear mental model
- **Each tab has main content** - summary cards, charts
- **Click anything to drill down** - detail pane slides out
- **Context preserved** - main view stays visible while exploring detail

This aligns with discovery findings:
- Executives land on Overview, see summary, done in 10 seconds
- Dev Managers navigate categories, drill into detail without losing context

---

## Information Architecture

### Tab Structure

```
┌─────────────────────────────────────────────────────────────────┐
│  OVERVIEW        ACTIVITY         WORK            HEALTH        │
│  (Executive)     (When)           (What)          (Operations)  │
└─────────────────────────────────────────────────────────────────┘
```

| Tab | Purpose | Primary User |
|-----|---------|--------------|
| **Overview** | Executive summary, quick stats, highlights | Executive |
| **Activity** | Timeline, heatmap, when work happens | Dev Manager |
| **Work** | Progress, tags, impact, what's being built | Dev Manager |
| **Health** | Security, urgency, operational indicators | Both |

### Layout Pattern

```
┌────────────────────────────────────────────────────────────────────┐
│  [Overview]   [Activity]   [Work]   [Health]      [Filters] [...]  │
├────────────────────────────────────────────────────────────────────┤
│                                           │                        │
│   MAIN CONTENT (70%)                      │   DETAIL PANE (30%)    │
│                                           │                        │
│   Summary cards, charts                   │   Slides out when      │
│   organized by category                   │   user clicks an       │
│                                           │   element              │
│   Everything is clickable →               │                        │
│                                           │   Shows drill-down     │
│                                           │   without navigation   │
│                                           │                        │
└────────────────────────────────────────────────────────────────────┘
```

### Mobile Layout

On small screens, detail pane becomes a bottom sheet:

```
┌─────────────────────┐
│ [Overview] [Act...] │
├─────────────────────┤
│                     │
│   Main content      │
│   (full width)      │
│                     │
├─────────────────────┤
│ ═══════════════════ │  ← drag handle
│   Detail Sheet      │
│   (slides up)       │
└─────────────────────┘
```

---

## Tab Specifications

### Overview Tab (Executive Landing)

**Purpose:** Quick scan for executives - see status in 10 seconds

**Layout:**
```
┌─────────────────────────────────────────────┬──────────────────────┐
│                                             │                      │
│  Period: [This Week ▼] vs Last Week         │   DETAIL PANE        │
│                                             │   (hidden default)   │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐ │                      │
│  │   12   │ │    5   │ │  2.1   │ │  82%  │ │                      │
│  │Features│ │ Fixes  │ │Urgency │ │Planned│ │                      │
│  │  ↑ 20% │ │  ↓ 10% │ │  ↓ 0.3 │ │       │ │                      │
│  └────────┘ └────────┘ └────────┘ └───────┘ │                      │
│                                             │                      │
│  ┌─────────────────┐ ┌────────────────────┐ │                      │
│  │ Work Breakdown  │ │  Impact Allocation │ │                      │
│  │    [donut]      │ │  user-facing ████░ │ │                      │
│  │                 │ │  internal    ██░░░ │ │                      │
│  │                 │ │  infra       █░░░░ │ │                      │
│  └─────────────────┘ └────────────────────┘ │                      │
│                                             │                      │
│  Key Highlights                             │                      │
│  • Top contributor: Alice (23 commits)      │                      │
│  • Busiest day: Tuesday                     │                      │
│  • After-hours: 12%                         │                      │
│                                             │                      │
└─────────────────────────────────────────────┴──────────────────────┘
```

**Components:**
| Component | Data Source | Click Action |
|-----------|-------------|--------------|
| Features Built card | `tags.includes('feature')` | Show feature commits list |
| Bugs Fixed card | `tags.includes('bugfix')` | Show bugfix commits list |
| Avg Urgency card | `mean(urgency)` | Show urgency breakdown |
| % Planned card | `urgency <= 2 / total` | Show planned vs reactive |
| Work Breakdown donut | `tagBreakdown` (top 5) | Show commits with that tag |
| Impact Allocation bars | `impactBreakdown` | Show commits with that impact |
| Key Highlights | Computed | Navigate to relevant view |

**New metrics (from urgency/impact):**
- **Avg Urgency** - operational health indicator (lower is better)
- **% Planned** - ratio of urgency 1-2 work (higher is better)
- **Impact Allocation** - where effort goes

---

### Activity Tab (When Things Happen)

**Purpose:** Understand timing patterns - when does work happen?

**Layout:**
```
┌─────────────────────────────────────────────┬──────────────────────┐
│                                             │                      │
│  Filters: [Tag ▼] [Author ▼] [From] [To]    │                      │
│                                             │  ┌────────────────┐  │
│  ┌─────────────────────────────────────────┐│  │ Commit Detail  │  │
│  │  Activity Heatmap (hour × day)          ││  │                │  │
│  │  ░░▓▓██░░  Mon                          ││  │ feat: add auth │  │
│  │  ░░▓███░░  Tue                          ││  │ Alice · 2h ago │  │
│  │  ...                                    ││  │                │  │
│  └─────────────────────────────────────────┘│  │ Complexity: 4  │  │
│                                             │  │ Urgency: 2     │  │
│  Recent Commits (25 shown)                  │  │ Impact: user   │  │
│  ┌─────────────────────────────────────────┐│  │                │  │
│  │ ● feat: add auth     Alice    2h ago   ││  │ Files:         │  │
│  │ ● fix: null check    Bob      5h ago   ││  │ • src/auth.js  │  │
│  │ ● docs: readme       Carol    1d ago   ││  │ +142 / -23     │  │
│  └─────────────────────────────────────────┘│  └────────────────┘  │
│                                             │                      │
└─────────────────────────────────────────────┴──────────────────────┘
```

**Components:**
| Component | Data Source | Click Action |
|-----------|-------------|--------------|
| Activity Heatmap | Commits by hour × day | Show commits at that time |
| Commits by Hour chart | `timestamp` hour | Show commits in that hour |
| Commits by Day chart | `timestamp` day | Show commits on that day |
| Recent Commits list | All commits | Show full commit detail |
| Work pattern badges | Computed | Filter by pattern |

**Migrated from current dashboard:**
- Timeline tab content
- Timing tab content (heatmap, hour/day charts)

---

### Work Tab (What's Being Done)

**Purpose:** Understand what type of work is happening and where effort goes

**Layout:**
```
┌─────────────────────────────────────────────┬──────────────────────┐
│                                             │                      │
│  ┌─────────────────────────────────────────┐│                      │
│  │  Features vs Fixes (by month)           ││                      │
│  │  [line chart with two series]           ││                      │
│  └─────────────────────────────────────────┘│                      │
│                                             │                      │
│  ┌──────────────────┐ ┌────────────────────┐│                      │
│  │ Tag Breakdown    │ │ Impact Over Time   ││                      │
│  │ feature ████████ │ │ [stacked area]     ││                      │
│  │ bugfix  █████    │ │                    ││                      │
│  │ docs    ███      │ │ user ▓▓▓▓         ││                      │
│  │ refactor ██      │ │ internal ░░░      ││                      │
│  └──────────────────┘ └────────────────────┘│                      │
│                                             │                      │
│  ┌─────────────────────────────────────────┐│                      │
│  │  Contributors: Who Does What            ││                      │
│  │  Alice  [feat███|fix█|docs░]           ││                      │
│  │  Bob    [feat██|fix███|ref█]           ││                      │
│  └─────────────────────────────────────────┘│                      │
│                                             │                      │
└─────────────────────────────────────────────┴──────────────────────┘
```

**Components:**
| Component | Data Source | Click Action |
|-----------|-------------|--------------|
| Features vs Fixes chart | Monthly tag counts | Show commits that month |
| Tag Breakdown | `tagBreakdown` | Show commits with that tag |
| Impact Over Time | Monthly impact counts | Show commits with that impact |
| Complexity Trend | Monthly avg complexity | Show high-complexity commits |
| Who Does What | Per-contributor tags | Show that person's commits |
| Complexity by Contributor | Per-contributor avg | Show person's complex work |

**New components (from impact):**
- **Impact Over Time** - stacked area showing shift in effort allocation
- **Impact by Contributor** - who works on what areas

**Migrated from current dashboard:**
- Progress tab content
- By Tag tab content
- Contributors tab content

---

### Health Tab (Operational Concerns)

**Purpose:** Understand operational health - security, urgency, work patterns

**Layout:**
```
┌─────────────────────────────────────────────┬──────────────────────┐
│                                             │                      │
│  ┌────────┐ ┌────────┐ ┌────────┐ ┌───────┐ │                      │
│  │   3    │ │  18%   │ │  12%   │ │   2   │ │                      │
│  │Security│ │Reactive│ │Weekend │ │Holiday│ │                      │
│  └────────┘ └────────┘ └────────┘ └───────┘ │                      │
│                                             │                      │
│  ┌─────────────────────────────────────────┐│                      │
│  │  Urgency Distribution                   ││                      │
│  │  Planned (1-2)    ████████████ 68%     ││                      │
│  │  Normal (3)       ████ 14%              ││                      │
│  │  Reactive (4-5)   █████ 18%             ││                      │
│  └─────────────────────────────────────────┘│                      │
│                                             │                      │
│  ┌─────────────────────────────────────────┐│                      │
│  │  Urgency Trend (by month)               ││                      │
│  │  [line chart - lower is better]         ││                      │
│  └─────────────────────────────────────────┘│                      │
│                                             │                      │
│  ┌─────────────────────────────────────────┐│                      │
│  │  Urgency by Contributor                 ││                      │
│  │  Alice   avg: 2.1  ░░░░░░░░██          ││                      │
│  │  Bob     avg: 3.4  ░░░░░████            ││                      │
│  └─────────────────────────────────────────┘│                      │
│                                             │                      │
│  Security Commits                           │                      │
│  • fix: XSS vulnerability    Alice  3d ago │                      │
│                                             │                      │
└─────────────────────────────────────────────┴──────────────────────┘
```

**Components:**
| Component | Data Source | Click Action |
|-----------|-------------|--------------|
| Security count | `tags.includes('security')` | Show security commits |
| Reactive % | `urgency >= 4 / total` | Show urgent commits |
| Weekend % | Computed from timestamp | Show weekend commits |
| Holiday count | SA holidays | Show holiday commits |
| Urgency Distribution | `urgencyBreakdown` | Show commits at level |
| Urgency Trend | Monthly avg urgency | Show month's commits |
| Urgency by Contributor | Per-person avg | Show person's urgent work |
| Security Commits list | Security-tagged | Show full detail |

**New components (from urgency):**
- **Urgency Distribution** - planned vs reactive work
- **Urgency Trend** - operational health over time (lower is better)
- **Urgency by Contributor** - who handles emergencies

**Migrated from current dashboard:**
- Security tab content
- Work pattern indicators from Timing tab

---

## Data Requirements

### Aggregation Output Schema

Both overall and per-repo use identical structure:

```json
{
  "metadata": {
    "generatedAt": "2026-01-20T...",
    "scope": "overall",
    "repoCount": 4,
    "commitCount": 604
  },

  "commits": [
    {
      "sha": "abc123",
      "author_id": "alice@example.com",
      "timestamp": "2026-01-20T10:30:00Z",
      "subject": "feat: add user authentication",
      "body": "...",
      "tags": ["feature", "auth"],
      "complexity": 4,
      "urgency": 2,
      "impact": "user-facing",
      "repo_id": "repo-tor"
    }
  ],

  "contributors": [
    {
      "author_id": "alice@example.com",
      "name": "Alice",
      "commits": 142,
      "tagBreakdown": { "feature": 45, "bugfix": 23 },
      "avgComplexity": 2.3,
      "avgUrgency": 1.8,
      "impactBreakdown": { "user-facing": 60, "internal": 82 }
    }
  ],

  "summary": {
    "tagBreakdown": { "feature": 120, "bugfix": 89 },
    "complexityBreakdown": { "1": 45, "2": 120, "3": 89, "4": 32, "5": 12 },
    "urgencyBreakdown": { "1": 200, "2": 180, "3": 120, "4": 80, "5": 24 },
    "impactBreakdown": {
      "internal": 300,
      "user-facing": 200,
      "infrastructure": 80,
      "api": 24
    },

    "monthly": {
      "2026-01": {
        "commits": 45,
        "avgComplexity": 2.1,
        "avgUrgency": 1.9,
        "tags": { "feature": 12, "bugfix": 8 },
        "impact": { "user-facing": 20, "internal": 25 }
      }
    },

    "dateRange": {
      "earliest": "2025-06-01T...",
      "latest": "2026-01-20T..."
    }
  }
}
```

### Aggregation Script Changes

Create `scripts/aggregate-processed.js`:

1. **Read from processed/** (not reports/)
   - Load `processed/<repo>/batches/*.json`
   - Combine all commits

2. **Output per-repo + overall:**
   ```
   dashboard/
   ├── data.json              ← Overall
   └── repos/
       ├── repo-tor.json      ← Same schema
       └── ...
   ```

3. **New aggregations:**
   - `urgencyBreakdown` - count per level
   - `impactBreakdown` - count per category
   - `monthly.*.avgUrgency` - trend data
   - `monthly.*.impact` - monthly impact distribution
   - `contributors.*.avgUrgency` - per-person
   - `contributors.*.impactBreakdown` - per-person

---

## Global Filters (Future)

**Deferred for later implementation.**

Filters persist and display across all tabs:
- Selected repo (when viewing overall)
- Date range
- Author
- Tag / Urgency / Impact

Visual indicator shows active filters in header.

---

## Implementation Phases

### Phase 1: Aggregation
- [ ] Create `scripts/aggregate-processed.js`
- [ ] Read from processed/ batches
- [ ] Output per-repo + overall data files
- [ ] Include urgency/impact aggregations

### Phase 2: Dashboard Structure
- [ ] Restructure to 4 tabs
- [ ] Implement detail pane component
- [ ] Mobile bottom sheet variant
- [ ] Migrate existing content to new tabs

### Phase 3: New Visualizations
- [ ] Urgency distribution chart
- [ ] Urgency trend line
- [ ] Urgency by contributor
- [ ] Impact allocation bars
- [ ] Impact over time (stacked)
- [ ] Impact by contributor

### Phase 4: Polish
- [ ] Click interactions for drill-down
- [ ] Detail pane content for each click type
- [ ] Responsive refinements
- [ ] Dark mode for new components

---

## Migration from Current Dashboard

| Current Tab | Moves To | Notes |
|-------------|----------|-------|
| Summary | Overview | Enhanced with urgency/impact cards |
| Timeline | Activity | Combined with Timing |
| Timing | Activity | Heatmap, hour/day charts |
| Progress | Work | Features vs fixes, trends |
| By Tag | Work | Tag breakdown |
| Contributors | Work | Who does what |
| Security | Health | Security commits |
| (new) | Health | Urgency analysis |

---

## Success Criteria

1. **Executive can assess status in 10 seconds** - Overview tab delivers quick scan
2. **Dev Manager can drill into detail without losing context** - Detail pane preserves main view
3. **New dimensions are visible** - Urgency and impact integrated throughout
4. **Same view per repo and overall** - Consistent schema enables both views
5. **Mobile works** - Bottom sheet provides usable drill-down

---

*Design approved: 2026-01-20*
