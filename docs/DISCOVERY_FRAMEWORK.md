
Jaco Theron, [2026/01/19 10:54]

## Revised: Discovery Framework

### Core Principle

User flows are the spine. Everything attaches to them:

- People connect because they're part of a flow
- Data connects because it moves through a flow
- Questions arise from gaps in understanding the flow
- Contacts are identified by who owns which part of the flow

---

### Session 1: Quick Discovery (15-20 min with decision maker)

Goal: Map the landscape, identify who to talk to next, understand data complexity.

#### Part A: The People (5 min)

*"Let's talk about everyone who would touch this, even briefly."*

- List every person type involved (don't rank them)
- For each: what do they do with it (action verb, not role)
- How often does each interact
- What does each care about most

Capture as a simple list:
[Person type] → [Action] → [Frequency] → [What they care about]
*"Who's missing from this list? Anyone who provides information, approves things, or gets affected by the outcome?"*

---

#### Part B: The Flow (5 min)

*"Walk me through what happens from start to finish. Don't worry about systems, just people and actions."*

- What triggers the flow (event, time, request)
- What happens first, then what, then what
- Where does it end
- What are the handoffs between people

Draw as simple boxes and arrows while they talk. Use their words.

*"Where does this flow break down or slow down today?"*

---

#### Part C: The Data (5 min)

*"Let's trace where information comes from and goes."*

For each step in the flow:

- What information is needed to do this step
- Where does that information come from
- What information is created or changed
- Where does it go next
- Where does it live permanently

Flag:

- External sources (outside the organisation)
- Manual capture points (someone typing/entering)
- Aggregation points (data combined from multiple places)
- Handwritten or paper steps
- Spreadsheets or email as storage

*"Is there a single source of truth, or does the same information live in multiple places?"*

---

#### Part D: Contact Mapping (3 min)

*"I'll need to understand some of this in more detail. Help me figure out who to talk to."*

For each person type identified:

- Who specifically can I speak to (name or role)
- How do I reach them (introduced by you, direct email, scheduled through someone)
- What's the right way to approach them (formal meeting, quick call, shadow them working)
- What level of priority will this get from them (part of their job, favour, needs your push)

For data sources:

- Who owns or manages each data source
- Who understands the data quality issues

Create a contact sheet:
[Topic/Flow area] → [Person] → [Reach via] → [Approach] → [Priority level]
---

#### Part E: Why Now (2 min)

*"Quick context questions"*

- What's driving this now
- What happens if nothing changes
- Are there deadlines attached to external events
- Who's sponsoring this (paying, pushing, approving)

---

### Output from Session 1

One page with:

1. People list - everyone involved, what they do, frequency
2. Flow sketch - rough sequence, handoff points, known problem areas
3. Data map - sources, capture points, aggregation, storage
4. Contact plan - who to talk to about what, how to reach them
5. Context - why now, sponsor, deadline

---

### Follow-up Sessions: Structure

Each follow-up focuses on one flow or one part of a flow. Questions adapt based on who you're speaking to.

#### With someone who does the work

- Walk me through exactly what you do (observe if possible)
- What information do you need before you start
- Where do you get it
- What do you create or change
- What slows you down
- What mistakes happen and why
- What do you wish you could see or do

#### With someone who manages/approves

- What decisions do you make in this flow
- What information do you need to make them
- What's the cost of a wrong decision
- What exceptions require your attention
- What would you want to know that you don't today

#### With someone who owns data

Jaco Theron, [2026/01/19 10:54]

- Where does this data come from originally
- How does it get into the system (manual, automated, import)
- How often does it change
- What are the known quality issues
- Who else uses this data
- What would break if this data was wrong

---

### Language Guide for Non-Technical Audiences

| Instead of | Say |
|------------|-----|
| Integration | "Will it need to talk to other systems?" |
| API | "Is there a way to automatically pull/push information?" |
| Database | "Where is this information stored?" |
| Real-time | "Does this need to update immediately or is daily/hourly okay?" |
| Authentication | "How do people prove who they are to get in?" |
| Permissions | "Who can see what? Who can change what?" |
| Migration | "There's existing information - does it need to move over?" |
| Scalability | "If this grows 10x, does anything change?" |

---

### Data Complexity Signals

These help the decision maker understand scope:

Simpler:

- Single source of truth exists
- Data captured digitally at source
- Clear ownership of data
- Structured formats

More complex:

- Same information in multiple places
- Manual capture or paper involved
- External data sources
- No clear owner ("it's always been like this")
- Spreadsheets as core systems
- Email as a workflow step
- Data quality is "known to be bad"
- Historical data needed but format changed over time

---
