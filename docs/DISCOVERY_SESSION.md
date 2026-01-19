# Discovery Session: Git Analytics Reporting System

**Purpose:** Apply the Discovery Framework to validate our solution
**Date:** 2026-01-19

---

## Session 1: Quick Discovery

### Part A: The People

*"Let's talk about everyone who would touch this, even briefly."*

| Person Type | Action | Frequency | What They Care About |
|-------------|--------|-----------|---------------------|
| Executive | Reviews/views dashboards | Ad-hoc (weekly to monthly) | Project status, progress, productivity overviews |
| Dev Manager (presenting) | Shows data, answers questions | Ad-hoc (when exec meetings happen) | Being able to show execs what they want, answering their questions on the spot |
| Dev Manager (analyzing) | Analyzes team patterns | Ad-hoc (daily to monthly) | Understanding team: preferences, when they work, what they like working on, productivity |

**Who's missing from this list?**

*Additional people identified:*

| Person Type | Action | Frequency | What They Care About |
|-------------|--------|-----------|---------------------|
| Developer (optional) | Views own patterns | Occasional (if curious) | Self-insight - not a primary user |
| Dev Manager (admin) | Sets up and maintains tool | Initial setup + occasional maintenance | Could delegate to a dev |

**Key insight:** This tool is for **reporting and understanding** what's actually happening - not (yet) for driving decisions.

---

### Part B: The Flow

*"Walk me through what happens from start to finish."*

**Trigger:** Two scenarios:

- Dev manager proactively wants to see developer or project insights
- Executive asks for an update (could come via email, in person, WhatsApp, etc.)

**Steps:**

1. Request/desire for insights arrives (any channel)
2. Data needs to be extracted/processed and updated
3. View the data in a dynamic report

**Handoffs:**

- Exec → Dev Manager (request for update)
- Dev Manager → Tool (runs extraction)
- Tool → Dev Manager (views report)
- Dev Manager → Exec (presents findings or shares report)

**End point:**

- Insights visible in a dynamic report view
- Future: could be extracted and sent in a specific format (PDF, email summary, etc.)

**Breakdowns:**

- This is a **new capability** - no current tool exists for this
- Today there's no easy way to get these insights

---

### Part C: The Data

*"Let's trace where information comes from and goes."*

**Source Data:**

- Git commit history from different projects and branches
- Single source of truth per project (git is authoritative)
- Caveat: Same person could appear as multiple contributors (email/name variations)

**Raw Data Extracted (per commit):**

- When (timestamp)
- Which project
- Who (author)
- What time of day
- Types of changes made
- Complexity of changes

**Derived Insights - Dev Manager View:**

- Time of day work is done
- Days of the week distribution
- After hours vs working hours (8-5)
- Weekends / public holidays / leave vs normal working days
- Types of work per developer / per project
- Complexity of work per developer / per project

**Derived Insights - Executive View:**

- Higher level, quick to scan
- Productivity indicators
- Progress / growth over time
- Types of work (summary level)

**Flags:**

- [ ] External sources (outside the organisation) - **No, git is internal**
- [x] Manual capture points - **Commit messages are manually written**
- [x] Aggregation points - **Multiple repos combined into single view**
- [ ] Handwritten or paper steps - **No**
- [ ] Spreadsheets or email as storage - **No**

**Single source of truth?** Yes - git history is authoritative. But author identity mapping is needed (same person = multiple emails/names).

---

### Part D: Contact Mapping

*(Less relevant for this validation exercise - we are the team)*

---

### Part E: Why Now

*"Quick context questions"*

**What's driving this now?**

- New company - shareholders/execs have no visibility into what's happening
- Staff are also new - no prior knowledge of how they like to work
- Need to establish baseline understanding

**What happens if nothing changes?**

- This is a **must-have** - cannot operate on a pure trust-based system at this stage
- No way to answer basic questions about progress, productivity, patterns

**Deadlines tied to external events?**

- No external deadlines

**Who's sponsoring this?**

- Dev manager (proactively building this)
- Shareholders don't know they want it yet - but they will

---

## Analysis: Does Our Solution Align?

### People Alignment

| Person Type (Discovered) | Our Solution Supports | Gap? |
|--------------------------|----------------------|------|
| Executive (high-level view) | Partial - dashboard exists but same view as dev manager | **Yes** - needs exec-specific summary view |
| Dev Manager (presenting) | Yes - can filter, navigate tabs during meeting | Minor - could be faster to find answers |
| Dev Manager (analyzing) | Partial - has timeline, contributors, tags | **Yes** - missing time-of-day, day-of-week analysis |
| Developer (optional) | Yes - can filter by author to see own patterns | OK |
| Dev Manager (admin) | Yes - extract.js, aggregate.js, update-all.sh | OK |

### Flow Alignment

| Flow Step (Discovered) | Our Solution Supports | Gap? |
|-----------------------|----------------------|------|
| 1. Request arrives | N/A - external trigger | N/A |
| 2. Extract/process data | Yes - scripts exist | Could be easier/faster |
| 3. View in dynamic report | Yes - dashboard with filters, tabs | OK |
| 4. Present to exec | Partial - same view, no export | **Yes** - needs exec view, PDF export |

### Data Alignment

**Raw Data Extracted:**

| Data Point | Our Solution | Gap? |
|------------|--------------|------|
| Timestamp | Yes | OK |
| Project | Yes | OK |
| Author | Yes | OK |
| Time of day | Stored but not visualized | **Yes** - needs hour/day charts |
| Types of changes | Yes - tags[] | OK |
| Complexity | Yes - complexity score | OK |

**Dev Manager Insights:**

| Insight Needed | Our Solution | Gap? |
|----------------|--------------|------|
| Time of day work is done | Not visualized | **Yes** - commits by hour chart |
| Days of the week | Not visualized | **Yes** - commits by day chart |
| After hours vs working hours | Not distinguished | **Yes** - needs visual styling |
| Weekends/holidays vs normal | Not distinguished | **Yes** - needs visual styling + holiday data |
| Types per developer/project | Partial - can filter | Could be clearer |
| Complexity per developer/project | Not visualized separately | **Yes** - needs complexity breakdown view |

**Executive Insights:**

| Insight Needed | Our Solution | Gap? |
|----------------|--------------|------|
| High level, quick to scan | No - same detailed view | **Yes** - needs summary/exec view |
| Productivity indicators | Partial - commit counts | Could be clearer |
| Progress/growth over time | Yes - Progress tab | OK |
| Types summary | Yes - By Tag tab | OK |

---

## Conclusions

### Framework Effectiveness

**Yes, the framework worked well.** It forced systematic thinking about:

- **People** - Identified two distinct user types (exec vs dev manager) with different needs
- **Flow** - Clarified this is reporting/understanding (not decision-driving yet)
- **Data** - Distinguished between raw data, dev manager insights, and exec insights
- **Why Now** - Established this is a must-have for a new company with new staff

The framework revealed that **executives and dev managers need different views** - something we hadn't explicitly designed for.

### Solution Alignment

**Core infrastructure is solid:**
- Extraction works (git → JSON)
- Aggregation works (multi-repo)
- Dashboard exists with filters and tabs
- Author identity mapping exists

**Partial alignment:**
- We have timestamp data but don't visualize it meaningfully
- We have tags and complexity but limited breakdown views

### Identified Gaps

**High Priority (discovered needs we don't address):**

1. **Time-based analysis** - Commits by hour, day of week (explicitly requested)
2. **Work pattern distinction** - After hours vs 8-5, weekends vs weekdays, holidays
3. **Executive summary view** - High-level, quick to scan, productivity focus
4. **PDF/export** - For sharing outside the dashboard

**Medium Priority:**

5. **Complexity breakdown** - Per author, per project views
6. **Types per developer** - Clearer visualization of who does what

### Over-Engineering

**Minimal over-engineering detected:**

- Files tab - Not explicitly mentioned but useful for dev manager context
- Conventional commit validation - Useful but not a discovered need
- Tag-based system - Aligns well with "types of work" need

**Verdict:** We built mostly what was needed. The main miss is the **time dimension** (when work happens) and **audience-specific views** (exec vs dev manager).

---

## Prioritized Next Steps (from Discovery)

Based on this session, recommended priority:

1. **Timestamp Views** - Commits by hour, commits by day (core discovered need)
2. **Work Pattern Styling** - After hours, weekends, holidays visual distinction
3. **Executive Summary Tab** - High-level view for quick scanning
4. **PDF Export** - For presenting outside the tool

---
