# Git Analytics Reporting System

## Project Overview

**Purpose:** Extract git history from repositories and generate visual analytics reports.

**Target Users:** Development teams wanting insights into commit patterns, contributor activity, and code evolution.

**Key Components:**

- `scripts/extract.js` - Extracts git log data into structured JSON
- `scripts/extract-api.js` - GitHub API-based extraction (untested, see TODO.md)
- `scripts/aggregate-processed.js` - Aggregates processed/ data into dashboard JSON
- `dashboard/` - Modular dashboard (Vite + Tailwind v4 + Chart.js)
  - `index.html` - HTML structure
  - `styles.css` - Extracted CSS
  - `js/main.js` - Entry point
  - `js/tabs.js` - Re-export barrel for backward compatibility
  - `js/tabs/` - Tab render modules (timeline, progress, contributors, security, health, tags, timing, summary, discover, delegated-handlers)
  - `js/state.js`, `utils.js`, `filters.js`, `ui.js`, `charts.js`, `data.js`, `export.js`, `pwa.js`
- `vite.config.js` - Vite build + Tailwind v4 + PWA plugin config
- `hooks/commit-msg` - Validates conventional commit format
- `docs/COMMIT_CONVENTION.md` - Team guide for commit messages

**Live Dashboard:** https://devmade-ai.github.io/repo-tor/

**Development:**
- `npm run dev` — Local dev server with hot reload (http://localhost:5173)
- `npm run build` — Production build to `dist/`

**Current State:** Dashboard V2 complete with role-based views. See `docs/SESSION_NOTES.md` for recent changes.

**Remaining Work:** See `docs/TODO.md` for backlog items.

## Dashboard Architecture

**Tabs** — 4 user-facing tabs mapped to internal content containers:

| Tab | Container IDs |
|-----|---------------|
| Overview | `tab-overview` |
| Activity | `tab-activity`, `tab-timing` |
| Work | `tab-progress`, `tab-tags`, `tab-contributors` |
| Health | `tab-security` |

Tab mapping lives in `js/state.js` as `TAB_MAPPING`.

**Role-Based View Levels** — Three audiences with different detail levels:

| View | Contributors | Heatmap | Drilldowns |
|------|-------------|---------|------------|
| Executive | Aggregated totals | Weekly blocks | Stats only |
| Management | Per-repo groupings | Day-of-week bars | Stats + repo split |
| Developer (default) | Individual names | 24x7 hourly grid | Full commit list |

Executive and Management views show interpretation guidance hints; Developer view shows raw data. Selection persists in localStorage.

---

# My Preferences

## Process

1. **Read these preferences first**
2. **Gather context from documentation** (CLAUDE.md, relevant docs/)
3. **Then proceed with the task**

## Principles

1. **User-first design** - Align with how real people will use the tool (top priority)
2. **Simplicity** - Simple flow, clear guidance, non-overwhelming visuals, accurate interpretation
3. **Document WHY** - Explain decisions and how they align with tool goals
4. **Keep docs updated immediately** - Update relevant docs right after each change, before moving to the next task (sessions can end abruptly)
5. **Testability** - Ensure correctness and alignment with usage goals can be verified
6. **Know the purpose** - Always be aware of what the tool is for
7. **Preserve session context** - Update docs/SESSION_NOTES.md after each significant task (not at the end - sessions can end abruptly)
8. **Follow conventions** - Best practices and consistent patterns
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
- [ ] Update docs/USER_TESTING.md if new test scenarios needed
- [ ] Update other relevant docs (COMMIT_CONVENTION.md, etc.)
- [ ] Add entry to docs/HISTORY.md if code/docs changed
- [ ] Commit changes (code + docs together)

### Before Each Commit

- [ ] Relevant docs updated for changes in this commit
- [ ] docs/HISTORY.md entry added (if significant change)
- [ ] docs/SESSION_NOTES.md reflects current state
- [ ] Commit message is clear and descriptive

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

- Running the extraction playbook
- Processing git data from repositories
- Generating and analyzing reports
- Data quality and aggregation tasks

**Commands within @data:**
- **"hatch the chicken"** - Full reset: delete everything, AI analyzes ALL commits from scratch
- **"feed the chicken"** - Incremental: AI analyzes only NEW commits not yet processed

See `docs/EXTRACTION_PLAYBOOK.md` for details.

## AI Notes

<!-- Reminders and learnings for AI assistants - add to this as needed -->

- Always read a file before attempting to edit it
- Check for existing patterns in the codebase before creating new ones
- Clean up completed or obsolete docs/files and remove references to them
- **Test features before documenting them as working** - if you can't test, say so explicitly
- **Document your mistakes** in docs/AI_LESSONS.md so future sessions learn from them
- **Verify before assuming** - Read the actual code before claiming what it does. Don't describe behavior based on file names, comments, or assumptions — check the implementation. If the user describes how something works, compare it against the actual code rather than agreeing without verification.
- **Ask clarifying questions** - When a task is ambiguous, has multiple valid approaches, or you're unsure about the user's intent, ask before proceeding. Don't guess at requirements or make assumptions about what the user wants. A quick question upfront avoids wasted work and wrong implementations.

---
