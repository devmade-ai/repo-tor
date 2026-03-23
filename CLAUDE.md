# Git Analytics Reporting System

## HARD RULES

These rules are non-negotiable. Stop and ask before proceeding if any rule would be violated.

### Before Making Changes

- [ ] Read relevant existing code and documentation first
- [ ] Ask clarifying questions if scope, approach, or intent is unclear
- [ ] Confirm understanding before implementing non-trivial changes
- [ ] Never assume — when in doubt, ask

### Best Practices

- [ ] Follow established patterns and conventions in the codebase
- [ ] Use industry-standard solutions over custom implementations when available
- [ ] Apply SOLID principles, DRY, and separation of concerns
- [ ] Prefer well-maintained, widely-adopted libraries over obscure alternatives
- [ ] Follow security best practices (input validation, sanitization, principle of least privilege)
- [ ] Handle errors gracefully with meaningful messages
- [ ] Write self-documenting code with clear naming

### Code Organization

- [ ] Prefer smaller, focused files and functions
- [ ] Pause and consider extraction at: 500 lines (file), 100 lines (function), 400 lines (class)
- [ ] Strongly consider refactoring at: 800+ lines (file), 150+ lines (function), 600+ lines (class)
- [ ] Extract reusable logic into separate modules/files immediately
- [ ] Group related functionality into logical directories
- [ ] Split large classes into smaller, focused classes when responsibilities diverge

### Decision Documentation in Code

Non-trivial code changes must include comments explaining:
- **What** was the requirement or instruction
- **Why** this approach was chosen
- **What alternatives** were considered and why they were rejected

Example:
```javascript
// Requirement: Show loading state before React mounts
// Approach: HTML-level spinner inside #root div, replaced by createRoot()
// Alternatives:
//   - React Suspense only: Rejected - no fallback if JS fails to load
//   - Blank screen + ErrorBoundary: Rejected - no feedback during load
```

### User Experience (CRITICAL)

Assume all dashboard users are non-technical. This is non-negotiable.

- [ ] UI must be intuitive without instructions
- [ ] Use plain language — no jargon, technical terms, or developer-speak
- [ ] Error messages must tell users what went wrong AND what to do next, in simple terms
- [ ] Labels, buttons, and instructions should be clear to someone unfamiliar with git analytics
- [ ] Prioritize clarity over brevity in user-facing text
- [ ] Confirm destructive actions with clear consequences explained
- [ ] Provide feedback for all user actions (loading states, success confirmations, etc.)
- [ ] Design for the least technical person who will use this

Bad: "Error 500: Internal server exception"
Good: "Something went wrong loading the dashboard. Please try again, or check your data file."

Bad: "Invalid JSON schema"
Good: "This file doesn't look like a dashboard data file. Try exporting from the extraction script first."

### Frontend: Styles and Scripts

- [ ] All custom styles in `dashboard/styles.css` — Tailwind utility classes in JSX are fine (framework convention)
- [ ] No inline `style={}` objects in JSX unless values are dynamic/computed
- [ ] Use CSS variables for theming (colors, spacing, typography) — never hardcode theme values
- [ ] No `<script>` tags — all JS through ES module imports (exceptions: debug pill and PWA early capture in index.html, which must run before modules load)
- [ ] Maintain light/dark mode support through CSS variables

### Documentation

- [ ] Update relevant documentation with every code change
- [ ] All documentation lives in `/docs` directory
- [ ] README must reflect current project state at all times
- [ ] Follow the After Each Significant Task checklist (see AI Checklists below)

### Cleanup

- [ ] Remove all temporary files after implementation is complete
- [ ] Delete unused imports, variables, and dead code immediately
- [ ] Remove commented-out code unless explicitly marked `// KEEP:` with reason
- [ ] Clean up console.log/print statements before marking work complete

### Quality Checks

During every change, actively scan for:
- [ ] Error handling gaps
- [ ] Edge cases not covered
- [ ] Inconsistent naming
- [ ] Code duplication that should be extracted
- [ ] Missing validation
- [ ] Security concerns
- [ ] Performance issues

Report findings even if not directly related to current task.

---

## Cross-Project References

### glow-props CLAUDE.md

**URL:** `https://raw.githubusercontent.com/devmade-ai/glow-props/main/CLAUDE.md`

Shared coding standards, patterns, and suggested implementations across devmade-ai projects.
Check periodically for new patterns to adopt. Last reviewed: 2026-03-13.

**Adopted patterns:**
- PWA install prompt race condition fix (inline `beforeinstallprompt` capture in HTML)
- Timer/listener cleanup patterns for `useEffect` (nested timeout tracking, mounted ref guard)
- SVG → PNG icon generation pipeline via Sharp
- Commit metadata footers (complexity, urgency, impact, risk, debt, epic, semver)
- Debug system (in-memory event store, floating pill — adapted to HTML-level for crash resilience)
- Download as PDF via `window.print()` (`no-print` class, print-friendly CSS overrides)
- Trigger system (10 single-word analysis commands with `start`/`go` sweep)
- `// KEEP:` convention for preserved commented-out code
- Bug report clarification rule (ask before fixing)
- Prohibition: no interactive prompts, no feature removal during cleanup without checking docs

---

## Project Overview

**Purpose:** Extract git history from repositories and generate visual analytics reports.

**Target Users:** Development teams wanting insights into commit patterns, contributor activity, and code evolution.

**Key Components:**

- `scripts/extract.js` - Extracts git log data into structured JSON
- `scripts/extract-api.js` - GitHub API-based extraction (uses curl, no gh CLI needed)
- `scripts/aggregate-processed.js` - Aggregates processed/ data into time-windowed dashboard JSON (summary + per-month commit files + weekly/daily/monthly pre-aggregations)
- `dashboard/` - React dashboard (Vite + React + Tailwind v4 + Chart.js via react-chartjs-2)
  - `index.html` - Minimal HTML (root div, debug pill, PWA early capture)
  - `styles.css` - Tailwind v4 + custom CSS
  - `js/main.jsx` - React entry point with Chart.js registration
  - `js/AppContext.jsx` - React Context + useReducer state management
  - `js/App.jsx` - Main app component (data loading, tab routing, layout)
  - `js/components/` - Shared components (Header, TabBar, DropZone, FilterSidebar, DetailPane, SettingsPane, CollapsibleSection, ErrorBoundary, EmbedRenderer, HealthAnomalies, HealthBars, HealthWorkPatterns)
  - `js/sections/` - Section components (Summary, Timeline, Timing, Progress, Contributors, Tags, Health, Discover, Projects)
  - `js/hooks/` - Custom hooks (useFocusTrap, useHealthData)
  - `js/state.js` - Constants (TAB_SECTIONS, VIEW_LEVELS, THRESHOLDS) + global state compat shim
  - `js/utils.js` - Pure utility functions
  - `js/charts.js` - Chart aggregation helpers
  - `js/chartColors.js` - Centralized chart color system (embed overrides)
  - `js/pwa.js` - PWA install/update logic
- `vite.config.js` - Vite build + React + Tailwind v4 + PWA plugin config
- `hooks/commit-msg` - Validates conventional commit format
- `docs/COMMIT_CONVENTION.md` - Team guide for commit messages

**Live Dashboard:** https://repo-tor.vercel.app/

**Development:**
- `npm run dev` — Local dev server with hot reload (http://localhost:5173)
- `npm run build` — Production build to `dist/`

**Current State:** Dashboard V2 complete with role-based views. See `docs/SESSION_NOTES.md` for recent changes.

**Remaining Work:** See `docs/TODO.md` for backlog items.

## Dashboard Architecture

**Tabs** — 6 tabs defined in `TabBar.jsx`, routed in `App.jsx`:

| Tab | Internal ID | Sections Rendered |
|-----|-------------|-------------------|
| Summary | `overview` | Summary |
| Timeline | `activity` | Timeline, Timing |
| Breakdown | `work` | Progress, Contributors, Tags |
| Health | `health` | Health (includes Security) |
| Discover | `discover` | Discover |
| Projects | `projects` | Projects |

Tab-to-section mapping in `js/state.js` as `TAB_SECTIONS`. Tab routing in `js/App.jsx`.

**Role-Based View Levels** — Three audiences with different detail levels:

| View | Contributors | Heatmap | Drilldowns |
|------|-------------|---------|------------|
| Executive | Aggregated totals | Weekly blocks | Stats only |
| Management | Per-repo groupings | Day-of-week bars | Stats + repo split |
| Developer (default) | Individual names | 24x7 hourly grid | Full commit list |

Executive and Management views show interpretation guidance hints; Developer view shows raw data. Selection persists in localStorage.

---

## Project-Specific Configuration

### Paths
```
DOCS_PATH=/docs
COMPONENTS_PATH=dashboard/js/components
SECTIONS_PATH=dashboard/js/sections
STYLES_PATH=dashboard/styles.css
SCRIPTS_PATH=scripts
```

### Stack
```
LANGUAGE=JavaScript (ES modules)
FRAMEWORK=React 19 + Vite + Tailwind v4
CHARTS=Chart.js via react-chartjs-2
PACKAGE_MANAGER=npm
BUILD=npm run build (output: dist/)
DEV=npm run dev (http://localhost:5173)
```

### Conventions
```
NAMING_CONVENTION=camelCase (variables/functions), PascalCase (components)
FILE_NAMING=PascalCase.jsx (components), camelCase.js (utilities)
COMPONENT_STRUCTURE=feature-based (js/sections/, js/components/)
COMMIT_FORMAT=conventional commits (see docs/COMMIT_CONVENTION.md)
```

### Commit Message Metadata Footers

All commits must include metadata footers (see `docs/COMMIT_CONVENTION.md` for full guide):

```
type(scope): subject

Body explaining why.

Tags: tag1, tag2, tag3
Complexity: 1-5
Urgency: 1-5
Impact: internal|user-facing|infrastructure|api
Risk: low|medium|high
Debt: added|paid|neutral
Epic: feature-name
Semver: patch|minor|major
```

**Tags:** Relevant tags for the change (e.g., documentation, pwa, debug, ui, refactor, testing)
**Complexity:** 1=trivial, 2=small, 3=medium, 4=large, 5=major rewrite
**Urgency:** 1=planned, 2=normal, 3=elevated, 4=urgent, 5=critical
**Impact:** internal, user-facing, infrastructure, or api
**Risk:** low=safe change, medium=could break things, high=touches critical paths
**Debt:** added=introduced shortcuts, paid=cleaned up debt, neutral=neither
**Epic:** groups related commits under one feature/initiative name
**Semver:** patch=bugfix, minor=new feature, major=breaking change

---

# My Preferences

## Process

1. **Read these preferences first**
2. **Gather context from documentation** (CLAUDE.md, relevant docs/)
3. **Then proceed with the task**

## Principles

1. **User-first design** — see Hard Rules > User Experience for specifics (top priority)
2. **Simplicity** - Simple flow, clear guidance, non-overwhelming visuals, accurate interpretation
3. **Document WHY** — see Hard Rules > Decision Documentation for format
4. **Keep docs updated immediately** - Update relevant docs right after each change, before moving to the next task (sessions can end abruptly)
5. **Testability** - Ensure correctness and alignment with usage goals can be verified
6. **Know the purpose** - Always be aware of what the tool is for
7. **Preserve session context** - Update docs/SESSION_NOTES.md after each significant task (not at the end - sessions can end abruptly)
8. **Follow conventions** — see Hard Rules > Best Practices
9. **Capture ideas** - Add lower priority items and improvements to docs/TODO.md so they persist between sessions
10. **Repeatable process** - Follow consistent steps to ensure all the above
11. **Document user actions** - When manual user action is required (external dashboards, credentials, etc.), add detailed instructions to docs/USER_ACTIONS.md

## AI Checklists

### At Session Start

- [ ] Read CLAUDE.md (this file)
- [ ] Read docs/SESSION_NOTES.md for current state and context
- [ ] Check docs/TODO.md for pending items and known issues
- [ ] Check docs/AI_LESSONS.md for past mistakes to avoid
- [ ] Understand what was last done before starting new work

### After Each Significant Task

- [ ] Remove completed items from docs/TODO.md (tracked in HISTORY.md)
- [ ] Update docs/SESSION_NOTES.md with current state
- [ ] Update docs/USER_GUIDE.md if dashboard UI or interpretation changed
- [ ] Update docs/ADMIN_GUIDE.md if setup, extraction, or configuration changed
- [ ] Update docs/USER_TESTING.md if new test scenarios needed (use structured format: step-by-step actions, where to click/look, expected results, regression checklist)
- [ ] Update other relevant docs (COMMIT_CONVENTION.md, etc.)
- [ ] Add entry to docs/HISTORY.md if code/docs changed
- [ ] Commit changes (code + docs together)

### Before Each Commit

- [ ] Relevant docs updated for changes in this commit
- [ ] docs/HISTORY.md entry added (if significant change)
- [ ] docs/SESSION_NOTES.md reflects current state
- [ ] Commit message is clear and descriptive
- [ ] No unused imports, dead code, or console.log statements (see Hard Rules > Cleanup)

### Before Each Push

- [ ] All commits include their related doc updates
- [ ] docs/SESSION_NOTES.md is current (in case session ends)
- [ ] No work-in-progress that would be lost

### Before Compact

- [ ] docs/SESSION_NOTES.md updated with full context needed to continue after summary:
  - What's being worked on?
  - Current state of the work?
  - What's left to do?
  - Any decisions or blockers?
  - Key details that shouldn't be lost in the summary

## Personas

Default mode is development. Use `@data` to switch when needed.

### @coder (default)

**Focus:** Development work — no trigger needed, this is the default

- Writing/modifying code (scripts, dashboard, hooks)
- Bug fixes and feature implementation
- Code review and refactoring
- Technical decisions and architecture

### @data

**Trigger:** Start message with `@data`

**Focus:** Data extraction and processing

- Running data operations (see docs/DATA_OPERATIONS.md)
- Processing git data from repositories
- Generating and analyzing reports
- Data quality and aggregation tasks

**Commands within @data:**
- **"hatch the chicken"** - Full reset: delete everything, AI analyzes ALL commits from scratch
- **"feed the chicken"** - Incremental: AI analyzes only NEW commits not yet processed

See `docs/DATA_OPERATIONS.md` for details.

---

## Triggers

Single-word commands that invoke focused analysis passes. Each trigger has a short alias. Type the word or alias to activate.

| # | Trigger | Alias | What it does |
|---|---------|-------|--------------|
| 1 | `review` | `rev` | Code review — bugs, UI, UX, simplification |
| 2 | `audit` | `aud` | Code quality — hacks, anti-patterns, latent bugs, race conditions |
| 3 | `docs` | `doc` | Documentation accuracy vs actual code |
| 4 | `mobile` | `tap` | Mobile UX — touch targets, viewport, safe areas |
| 5 | `clean` | `cln` | Hygiene — duplication, refactor candidates, dead code |
| 6 | `performance` | `perf` | Re-renders, expensive ops, bundle size, DB/API, memory |
| 7 | `security` | `sec` | Injection, auth gaps, data exposure, insecure defaults, CVEs |
| 8 | `debug` | `dbg` | Debug pill coverage — missing logs, noise |
| 9 | `improve` | `imp` | Open-ended — architecture, DX, anything else |
| 10 | `start` | `go` | Sequential sweep of all 9 above, one at a time |

### Trigger behavior

- Each trigger runs a single focused pass and reports findings.
- Findings are listed as numbered text — never interactive prompts or selection UIs.
- One trigger per response. Never combine multiple triggers in a single response.

### `start` / `go` behavior

Runs all 9 triggers in priority sequence, one at a time:

`rev` → `aud` → `doc` → `tap` → `cln` → `perf` → `sec` → `dbg` → `imp`

After each trigger completes and findings are presented, the user responds with one of:
1. `fix` — apply the suggested fixes, then move to the next trigger
2. `skip` — skip this trigger's findings and move to the next trigger
3. `stop` — end the sweep entirely

Rules:
- Always pause after each trigger — never auto-advance to the next one.
- Never run multiple triggers in one response.
- Wait for the user's explicit `fix`, `skip`, or `stop` before proceeding.

---

## Communication Style

- Direct, concise responses
- No filler phrases or conversational padding
- State facts and actions, not opinions
- Ask specific questions with concrete options when clarification needed
- Never proceed with assumptions on ambiguous requests

---

## Testing

- Write tests for critical paths and core business logic
- Test error handling and edge cases for critical functions
- Tests are not required for trivial getters/setters or UI-only code
- Run existing tests before and after changes
- **Note:** No test framework currently configured. If tests are added, update this section with the runner and conventions.

---

## Prohibitions

Never:
- Start implementation without understanding full scope
- Create files outside established project structure
- Leave TODO comments without tracking them in docs/TODO.md
- Ignore errors or warnings in output
- Make "while I'm here" changes without asking
- Use placeholder data that looks like real data
- Skip error handling "for now"
- Write code without decision context comments for non-trivial changes
- Add workarounds for architectural issues — fix root causes (see AI Lessons)
- Use silent `.catch(() => {})` — always handle specific errors (see AI Lessons)
- Hardcode values that should come from CSS variables or config (see AI Lessons)
- Document or recommend features that haven't been tested (see AI Lessons)
- Improvise extraction/analysis workflows — follow `docs/DATA_OPERATIONS.md` exactly, step by step, using the exact formats documented (see AI Lessons)
- Use interactive input prompts or selection UIs — list options as numbered text instead
- Remove features during "cleanup" without checking if they're documented as intentional (see AI Lessons)

---

## AI Notes

<!-- Reminders and learnings for AI assistants - add to this as needed -->

- **Document your mistakes** in docs/AI_LESSONS.md so future sessions learn from them
- **Verify before assuming** - Read the actual code before claiming what it does. Don't describe behavior based on file names, comments, or assumptions — check the implementation. If the user describes how something works, compare it against the actual code rather than agreeing without verification.
- **Fix root causes, not symptoms** - When something isn't working, find out WHY before writing code. Don't add workarounds (globals, duplicate listeners, flag variables) to patch over an architectural issue. If the fix requires touching 3+ files to coordinate shared state, that's a smell — look for a simpler structural change. Example: if a module loads too late, make it load earlier — don't add a global cache to bridge the gap.
- **ASK before assuming on bug reports** - When a user reports a bug, ask clarifying questions (which mode? what did you type? what do you see?) BEFORE writing code. Don't guess the cause and build a fix on an assumption — one clarifying question saves multiple wrong commits.

---
