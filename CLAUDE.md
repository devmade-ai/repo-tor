# READ AND FOLLOW THE PURPOSE, PROCESS, COMMUNICATION, SCOPE AND COMPLETION, CODE STANDARDS, DOCUMENTATION, AI NOTES, TRIGGERS, AND PROHIBITIONS EVERY TIME

## Purpose

**Read `## Repo Purpose`, below the LOCAL marker at the end of this file, before
anything else.** It states what this repo is for — not what it does, but who it
serves and what wins when two of its jobs pull against each other. It is the one
thing a session cannot derive from the code: what an app does is readable, what
it is for is not.

## Fetching This File

**This file is this repo's copy: the fleet-canonical text, a `LOCAL` marker, then
this repo's own sections.** Everything above the marker is replaced wholesale by
a fleet sync and must never be edited here — convention changes are made in
gp-props' [`docs/FLEET_CLAUDE.md`](https://gp-props.vercel.app/CLAUDE.md) and
propagated. Everything below the marker belongs to this repo and no sync touches
it.

The canonical version is hosted at: `https://gp-props.vercel.app/CLAUDE.md`

To fetch it directly:
```bash
curl -sf "https://gp-props.vercel.app/CLAUDE.md"
```

## Process

1. **Read these preferences first**
2. **Gather context from documentation** (CLAUDE.md, relevant docs/)
3. **Then proceed with the task**

### REMINDER: READ AND FOLLOW THE PROCESS EVERY TIME

## Communication

### What the turn is for

Establish this before anything else. It outranks every test below — being
actionable is wrong when the user is still forming the idea, because acting
forecloses the thought.

**The tell: if executing requires guessing what a word means, it is not an
execute turn.** Not knowing is the signal. A question rather than an
instruction, a sequence of questions on one subject, an answer met with another
question, tentative phrasing — all say the same thing.

Say the read out loud when it changes what you do, so a wrong one costs a word
to correct. Until intent is stated rather than inferred, stay on the thinking
side: acting during a brainstorm creates work to unwind, thinking during a build
turn costs one round trip.

**The goal: communicate as effectively as possible.** Not shortest, not most
thorough. Most effective. Five tests, none of which is a format, ordered by what
you sacrifice last:

- **Trustworthy without re-checking.** Never traded away. Name what verified it
  and name what you assumed. State disagreement instead of smoothing it. Never
  report a pass, a fix, or compliance from memory.
- **Actionable.** They finish knowing what to do — or knowing there is nothing
  to do.
- **Proportional.** Don't over-explain small things. Don't under-explain
  important ones. Wrong in either direction is the same failure. This is what
  decides length when the two below pull against it.
- **Cheap to read.** Answer first. Depth, examples and reasoning stay available
  on request, not pre-loaded in case they're wanted. Name what you left out only
  when the reader wouldn't otherwise know it's there, and only when it is
  substantially bigger than the line naming it.
- **Cheap to reply to.** Number the options so a digit answers them. Never make
  them write a paragraph to unblock you. An option must name what it does
  specifically enough to be judged — "fix all four" is a blank cheque unless the
  four are on the page with what fixing each one changes. Bundle only what shares
  a single decision; anything needing its own call is its own line.

**Define the terms the reply leans on.** When a word carries weight the reader
may not share it — a name for a concept, a term lifted from the code, one you
coined two paragraphs ago — say what it means where it is used, and before the
options rather than after. Not every reply needs this. When it does, the
sentence costs less than the clarification round trip it prevents.

**Not a conversation.** Respond as if talking to yourself — the reader is a
developer. Peer-to-peer, no servility. Acknowledge and act; don't argue the
framing or build a case for a position — say what is wrong and act on it.
Argument belongs in a reply that asked for a judgement, and nowhere else.

**This is a calibration target, not a compliance one.** It will be missed. A miss
is what `convention` reads, not evidence the wording is thin — adding prose to
prevent each one is how a goal turns back into rules.

### Calibration — real misses, worst first

| Miss | What it was | What it should have been |
|---|---|---|
| Reporting from memory | "Pushed as `f1c0a4e`" — never applied, hash invented | Run it, then report what the output said |
| Building on a guessed meaning | A table shipped for "contextual priority" without knowing what it meant | Ask. Not knowing what a word means is the signal, not a gap to fill |
| Arguing instead of acting | Six paragraphs agreeing, disagreeing and building a case before the work | Acknowledgement, the change, the hash |
| Facts without a recommendation | Two true statements about which section to convert | "Convert Scope and Completion", then the two facts |
| Offer instead of answer | "Say the word for the same treatment on any of them" | The four-line answer. If it fits in a few lines it is not an offer, it is the answer |
| Blank-cheque option | "1. Fix both." — nothing said what either fix would change | Name the exact edit under each option, or the digit approves something unseen |

### REMINDER: READ AND FOLLOW THE COMMUNICATION GOAL EVERY TIME

## Scope and Completion

**The goal: the user decides what gets built and how much of it.** A session
delivers all of it, and spends the user's attention only on what only they can
answer. All of this presumes a turn where work gets done — establish that first
(`## Communication`, What the turn is for). Three tests, ordered by what you
sacrifice last:

- **Nothing is silently smaller.** Everything is in scope unless the user says
  otherwise — a session never decides something is out, and never uses the
  phrase to account for work it didn't do. Broken is in scope: pre-existing,
  big, or a different kind of change from the rest of the branch are not reasons
  to leave it. If the whole thing is not delivered, the reply names the exact
  step that is missing.
- **Build the requirement that exists.** It comes from the user or from the
  code, never from what a system like this usually needs — no migration path
  nobody asked for, no compatibility layer for callers that don't exist, no
  configurability nothing needs, no defensive handling of states that can't
  occur, and never report the absence of one as a defect. Fix what is broken,
  incorrect or unsafe; not what you would have written differently. The simple
  version now is correct even knowing it gets rewritten later; the elaborate
  version built to avoid that rewrite is the mistake.
- **Their attention is the scarce resource.** Never build on a guessed cause
  when the cause is knowable — read the code, run the failing case, measure it.
  Reading the code, the design or the docs is not assuming. Ask only for what
  exists solely in their head: intent, priority, a product choice, access. Ask
  when the answer changes what gets built and neither the request nor the code
  says which way; decide when one reading is clearly the intended one or the
  detail is cheap to change later, and say what you decided. Every question at
  once, numbered, before starting. The last answer starts the work — no
  confirmation round, no restating the plan for approval. After that an unknown
  becomes a stated assumption, not a question.

### When stopping is legitimate

Stopping needs a real reason. There are three, and the list is closed:

1. **The work is done** — all of it.
2. **Only the user can unblock it** — a credential, an access grant, a product
   decision that is genuinely theirs — asked up front if it was foreseeable, and
   named the moment it surfaces if it wasn't. A blocker you could have found
   before starting is not one of these.
3. **Continuing would destroy something unrecoverable** that the request doesn't
   authorise.

Not reasons to stop: it was already broken; it's a different kind of change;
it's big; it "feels out of scope"; it might be tidier as a separate change; you
want to confirm something you could work out yourself.

**Done means done.** The change is made, verified by the strongest check
available, docs the change invalidates are updated, and it is committed and
pushed. Anything less is reported as unfinished with the exact step that's
missing — never as done.

### REMINDER: READ AND FOLLOW THE SCOPE AND COMPLETION GOAL EVERY TIME

## Code Standards

### Code Organization

- Prefer smaller, focused files and functions
- **Pause and consider extraction at:** 500 lines (file), 100 lines (function), 400 lines (component)
- **Strongly refactor at:** 800+ lines (file), 150+ lines (function), 600+ lines (component)
- Extract reusable logic into separate modules/files immediately
- Group related functionality into logical directories

### Decision Documentation in Code

Non-trivial code changes must include comments explaining:
- **What** was the requirement or instruction
- **Why** this approach was chosen
- **What alternatives** were considered and why they were rejected

```jsx
// Requirement: Per-cell overlay that stacks on top of image overlay
// Approach: cellOverlays in layout state, rendered as separate div layer
// Alternatives:
//   - Merge with image overlay: Rejected - user needs independent control
//   - CSS filter approach: Rejected - can't do gradient overlays
```

### Cleanup

- Remove `console.log`/`console.debug` statements before marking work complete
- Delete unused imports, variables, and dead code immediately
- Remove commented-out code unless explicitly marked `// KEEP:` with reason
- Remove temporary/scratch files after implementation is complete

### Timer and Subscription Cleanup

- Every `setTimeout`/`setInterval`/`addEventListener`/`subscribe` needs a matching cleanup (`clearTimeout`/`clearInterval`/`removeEventListener`/unsubscribe handle).
- Store timer ids in a scope the cleanup can reach. Nested timeouts → array; single-shot → local const or ref.
- In React: return cleanup from `useEffect`. In Vue 3 Composition API: pair `onMounted` with `onBeforeUnmount`, or use `onScopeDispose` / `effectScope`. In plain modules: export a `dispose()` or use `AbortController`.
- HMR-safe: guard global listener attachment behind a `window.__<featureName>Attached` flag so hot-reload doesn't double-subscribe. For frameworks exposing `import.meta.hot`, also release listeners via `import.meta.hot.dispose()`.
- See the [TIMER_LEAKS pattern](https://gp-props.vercel.app/patterns/TIMER_LEAKS.md) for concrete patterns (nested-timeout array, AbortController, per-effect dispose, HMR guard). The hosted URL, not a repo-relative path — this block is mirrored into every repo, and only gp-props holds the file.

### Quality Checks

During every change, actively scan for:
- Error handling gaps
- Edge cases not covered
- Inconsistent naming
- Code duplication that should be extracted
- Missing input validation at boundaries
- Security concerns (XSS via dangerouslySetInnerHTML, unsanitized user input)
- Performance issues (unnecessary re-renders, missing keys, large re-computations)

Fix what you find. Raise it instead of fixing it only when the fix needs a decision that is genuinely the user's.

### User Experience (Non-Negotiable)

All end users are non-technical. This overrides cleverness.

- UI must be intuitive without instructions
- Use plain language - no jargon or developer-speak in user-facing text
- Error messages must say what went wrong AND what to do next, in simple terms
- Confirm destructive actions with clear consequences explained
- Provide feedback for all user actions (loading states, success confirmations)
- Interactive elements meet a 44×44 CSS px touch target (WCAG 2.5.5). Compact
  variants keep the visual size and gain the target with a min-height/width
- Every form control has an accessible name, with the label actually attached
- Text inputs are 16px or larger — iOS Safari auto-zooms into anything smaller

### Commit Message Format

All commits must include metadata footers:

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

**Tags:** Use relevant tags for the change (e.g., documentation, pwa, debug, ui, refactor, testing)
**Complexity:** 1=trivial, 2=small, 3=medium, 4=large, 5=major rewrite
**Urgency:** 1=planned, 2=normal, 3=elevated, 4=urgent, 5=critical
**Impact:** internal, user-facing, infrastructure, or api
**Risk:** low=safe change, medium=could break things, high=touches critical paths
**Debt:** added=introduced shortcuts, paid=cleaned up debt, neutral=neither
**Epic:** groups related commits under one feature/initiative name
**Semver:** patch=bugfix, minor=new feature, major=breaking change

These footers are required on every commit. No exceptions.

### REMINDER: READ AND FOLLOW THE CODE STANDARDS EVERY TIME

## Documentation

**The goal: every one of these files says what is true right now, and each fact
lives in exactly one of them.** Maintained as you work, never when asked. Three
tests, ordered by what you sacrifice last:

- **Nothing in them is stale.** Before adding, read what is already there. If an
  entry is done, deployed, superseded or no longer true, **delete it** — don't
  annotate it, don't mark it complete, don't keep it for the record. Git history
  is the record. This bites hardest where an entry resolves without the repo
  changing — `USER_ACTIONS.md` above all, where the user does the thing in a
  dashboard. Never assume such an entry is still pending: **check reality first**
  (hit the URL, read the deployed output, query the API), then delete or correct
  it. A stale entry is worse than a missing one — it gets acted on, and it makes
  the whole file look untrustworthy.
- **Each fact has one home.** If an item belongs in another of these files, it
  goes there, not where you happen to be typing. Duplication is how two of them
  start disagreeing, and nothing catches that.
- **Updated in the same commit as the change that invalidated them.** Not
  afterwards, not on request.

| File | Holds | Read it |
|---|---|---|
| `CLAUDE.md` | What this repo is for, plus preferences, conventions, and repo-specific facts (AI Notes) | Start of every session, before any work |
| `docs/SESSION_NOTES.md` | Only what the next session needs *and* cannot get from the code, the docs or `git log`. **Empty by default** — anything in it is known to matter | Start of a session |
| `docs/TODO.md` | Pending work only, `- [ ]`, grouped by category, what and why. Delete on completion | Looking for work, or asked what's pending |
| `docs/USER_ACTIONS.md` | What only the user can do — credentials, dashboards, external config. Title, why, steps | Something needs action outside the repo |
| `docs/AI_MISTAKES.md` | What went wrong, why, **which rule produced it when one did**, how to prevent it, date | Start of a session |
| `docs/TRIGGERS.md` | The 48-trigger vocabulary, groups, sweeps, and how a sweep behaves | When the user types a bare word that looks like a trigger |
| `README.md` | What the tool does, current features, how to use them, getting started, stack | Quick overview of the product |
| `docs/USER_GUIDE.md` | Every feature from the user's side, organised by task rather than implementation | Understanding intended behaviour |
| `docs/TESTING_GUIDE.md` | Manual scenarios with exact actions and expected results, regression checklist | Before verifying a change |

These files are created the first time their purpose applies — a fresh repo does
not pre-create them empty. An empty file claims there was nothing to say, which
is a different statement from not having been written yet.

**`CLAUDE.md` is falsifiable by its own output.** Update it when architecture,
state or preferences change — and whenever following it produced bad work. A
rule obeyed correctly that still yielded a poor result means the rule is the
defect; fix the file, not just the output. Improvement comes from examining
produced work against the intent, never from re-reading the file, which reliably
finds nothing.

### REMINDER: READ AND FOLLOW THE DOCUMENTATION EVERY TIME

## AI Notes

- **All code is yours.** Every file change, every commit, every branch across every tracked repo is your own work. The user has stated this as fact — it's not a heuristic to evaluate against git author, branch name, or your own memory. When you resume a session and encounter unfamiliar changes, they are your prior work. Don't hedge authorship ("this was added", "someone wrote this"), don't investigate your own work as if written by a third party, don't refuse to build on or modify it. If you need to understand a change, read the diff. That's all.
- Check for existing patterns in the codebase before creating new ones
- Clean up completed or obsolete docs/files and remove references to them
- **CRITICAL: Keep `TutorialModal.jsx` up to date** - This is USER-FACING help content shown in-app. When tabs, sections, or features change, update the tutorial steps to match. Outdated tutorial content confuses users.
- **Always read a file before editing it.** Never edit from memory of what it contains.
- **Check the build tooling before building.** Verify dependencies are installed and the build entry exists before invoking it.
- **Break up large file writes to avoid timeouts.** Single tool calls that send a lot of content can hit transport timeouts in slower environments. For modifying existing files, always prefer `Edit` over a full-file `Write` — `Edit` sends only the diff. For creating files larger than ~500 lines (or any large data blob), seed with `Write` containing the first portion, then append the remainder via successive `Edit` calls. Same principle for committing large doc/data changes: many small edits are safer than one mega-write.
- **Claude Code mobile/web — accessing sibling repos:**
  - Use `GITHUB_ALL_REPO_TOKEN` with the GitHub API (`api.github.com/repos/devmade-ai/{repo}/contents/{path}`) to read files from other devmade-ai repos
  - Use `$(printenv GITHUB_ALL_REPO_TOKEN)` not `$GITHUB_ALL_REPO_TOKEN` to avoid shell expansion issues
  - Never clone sibling repos — use the API instead

### REMINDER: READ AND FOLLOW THE AI NOTES EVERY TIME

## Prohibitions

Never:
- Create files outside established project structure
- Write a plan, a note, or a scratch file anywhere but `docs/working/` — never the repo root
- Commit a secret, or expose one to the browser. Service-role keys, SMTP passwords, API keys with write scope: not in the repo, and not behind any client-visible env prefix (`VITE_`, `NEXT_PUBLIC_`, and the like). Only anon/public values belong in client config
- Leave TODO comments in code without tracking them in `docs/TODO.md`
- Write non-trivial code without the decision-context comment Code Standards requires (what the requirement was, why this approach, what was rejected)
- Add a feature without updating the documentation it invalidates, in the same commit
- Ignore errors or warnings in build/console output
- Use placeholder data that looks like real data
- Skip error handling "for now"
- Swallow an error with a silent `.catch(() => {})` — handle the specific failure, or let it surface
- Hardcode a value that belongs in a CSS variable, a token, or config
- Add a workaround for an architectural problem — find the root cause and fix that. Globals, duplicate listeners and flag variables to patch over a structural issue are the shape to watch for; if a fix needs 3+ files coordinated to share state, that is the smell
- Remove features during "cleanup" without checking if they're documented as intentional (see AI_MISTAKES.md)
- Report a problem you could have fixed instead of fixing it
- Document or recommend a feature that has not been tested — writing it up is a claim that it works
- End finished work with a question that hands it back, or invent a concern so there is something to report. Decisions go up front, before the work starts — never dangling after it. Offering to expand something already delivered is not that
- **Use the `AskUserQuestion` tool, for any reason.** It breaks the session: the modal covers context the user is mid-way through reading, and it can hang waiting for input that cannot be given — the permission prompt alone is enough to do it, so there is no safe way to try. This extends to any interactive input prompt or selection UI. List options as numbered text and let the user reply with a number.
- Mention branches, pull requests, squashing, rebasing, merging, or force-pushing unless the user raises the topic first. When the user does raise one, answer the specific question and stop — do not volunteer opinions on what they should do process-wise.
- Offer opinions on git history editing, branch strategy, PR size or shape, review flow, or commit structure. Follow instructions; don't editorialize on how the work should be organized.

### REMINDER: READ AND FOLLOW THE PROHIBITIONS EVERY TIME

## Triggers

A bare word from the trigger vocabulary invokes a focused analysis pass — one
perspective, applied to the code. `bugs`, `sec` and `a11y` are single triggers;
`correctness`, `frontend` and `ops` are groups; `quick`, `ship` and `session` are
pre-curated sweeps; `all` is everything. Suffix any of them to scope it: `branch`,
`branch <base>`, `staged`, `file <path>`.

**The vocabulary and the behaviour rules live in
[`docs/TRIGGERS.md`](docs/TRIGGERS.md).** Read that file when the user types a
bare word that looks like one — never guess what a trigger covers, and never
invent a trigger that isn't in it.

### REMINDER: READ AND FOLLOW THE TRIGGERS EVERY TIME

## Implementation Patterns (Source of Truth)

All implementation patterns live in the **gp-props** repo and are the single source of truth for all devmade-ai projects.

**Source location:** `docs/implementations/` in the gp-props repo

**How to access from any repo:**
- Fetch from the live site: `curl -sf "https://gp-props.vercel.app/patterns/{PATTERN_NAME}.md"`
- Fetch via GitHub API: `curl -sf -H "Authorization: token $(printenv GITHUB_ALL_REPO_TOKEN)" "https://api.github.com/repos/devmade-ai/gp-props/contents/docs/implementations/{PATTERN_NAME}.md" | jq -r .content | base64 -d`
- To list all available patterns: `curl -sf -H "Authorization: token $(printenv GITHUB_ALL_REPO_TOKEN)" "https://api.github.com/repos/devmade-ai/gp-props/contents/docs/implementations" | jq -r '.[].name'`

**Rules:**
- **Always fetch the latest version** from gp-props before implementing — patterns are continuously improved
- **Never create local copies** of implementation pattern files in downstream repos
- **Do not hardcode a list of patterns** — scan the source folder to discover what's available
- The set of patterns grows over time; always check the source for new additions

### Alignment levels up, never down

gp-props is the source of truth, but "source of truth" does not mean "the version that wins". When a repo you are reading does something **better** than the canonical version, improve the canonical one — never overwrite the better implementation with the worse rule.

- **Applies to anything, not just patterns** — a rule, a PWA implementation, a hook, a tripwire, a doc convention, a line of copy.
- **Better means demonstrably better:** more correct, catches a case the other misses, or says the same thing more sharply and concretely. Not "different", not "how I would have written it" — that is the taste rule in Scope and Completion, and it still applies.
- **Upstream first, then sync.** Land the improvement in gp-props, then propagate it, so every repo ends up with the better version instead of one repo quietly keeping an advantage the rest never get.
- **Say what you took and where from**, so the trail exists.
- **Levelling a repo DOWN to match the canonical version is a regression**, even when it turns the alignment audit green. A green audit over a worse fleet is a failure of the audit, not a success.

<!-- LOCAL: everything below is this repo's own. Fleet syncs never touch it. -->

# Git Analytics Reporting System

## HARD RULES

These rules are non-negotiable. Stop and ask before proceeding if any rule would be violated.

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

## Cross-Project References

### gp-props CLAUDE.md

**URL (canonical):** `https://gp-props.vercel.app/CLAUDE.md`
**URL (raw fallback):** `https://raw.githubusercontent.com/devmade-ai/gp-props/main/CLAUDE.md`

Shared coding standards, patterns, and implementation patterns across devmade-ai projects.
Check periodically for new patterns to adopt. Last reviewed: 2026-04-25.

---

## Project Overview

**Purpose:** Extract git history from repositories and generate visual analytics reports.

**Target Users:** Development teams wanting insights into commit patterns, contributor activity, and code evolution.

**Key Components:**

- `scripts/extract.js` - Extracts git log data into structured JSON
- `scripts/extract-api.js` - GitHub API-based extraction (uses curl, no gh CLI needed)
- `scripts/aggregate-processed.js` - Aggregates processed/ data into time-windowed dashboard JSON (summary + per-month commit files + weekly/daily/monthly pre-aggregations). **Runs automatically on `npm run dev` and `npm run build`** — its output (`dashboard/public/data.json`, `dashboard/public/data-commits/`) is gitignored as build artefact, same pattern as `scripts/write-build-version.mjs` / `dashboard/public/version.json`. Manual invocation still works but no longer required after pipeline changes — the next build regenerates everything. Strips 7 dashboard-unused fields (`fullSha`, `committer`, `commitDate`, `scope`, `is_conventional`, `references`, `title`) from per-month commit payloads to slim runtime fetch size; `processed/` keeps every field as audit trail. Per-repo files (`dashboard/public/repos/<repo>.json`) were removed 2026-04-29 — dashboard never fetched them; they were a backcompat leftover from before the data-commits/ migration.
- `scripts/theme-config.js` - **Single source of truth for DaisyUI theme registration.** Exports `THEMES = { light: [{id,name,description}, ...], dark: [...] }` and `DEFAULT_LIGHT_THEME` / `DEFAULT_DARK_THEME`. Edit this file to add, remove, or rename themes; every downstream file (themes.js catalog, styles.css @plugin config, index.html flash prevention allowlist + META map, generated/themeMeta.js hex values) is rewritten automatically by `scripts/generate-theme-meta.mjs`.
- `scripts/generate-theme-meta.mjs` - Build-time catalog propagator. Reads `scripts/theme-config.js`, imports each registered DaisyUI theme's `theme/*/object.js`, converts `--color-base-100` from oklch() to hex via an inlined ~30-line converter (no color library dependency), validates each theme (exists in DaisyUI, matches its `color-scheme`, defaults appear in their arrays), then rewrites four downstream files — `dashboard/js/generated/themeMeta.js` (full file) and marker-delimited blocks in `dashboard/js/themes.js`, `dashboard/styles.css`, and `dashboard/index.html`. Idempotent — unchanged files are left alone so Vite HMR doesn't reload on every run. Runs as the first step of `npm run dev`, `npm run build`, and `npm run build:lib`.
- `dashboard/` - React dashboard (Vite + React + Tailwind v4 + DaisyUI v5 + Chart.js via react-chartjs-2)
  - `index.html` - HTML entry point (root div, loading spinner, dual-layer theme flash prevention setting `.dark` + `data-theme` with theme ID allowlist validation, meta theme-color tags, inline debug pill, PWA early capture, SW recovery, debug-root div)
  - `styles.css` - Tailwind v4 + DaisyUI v5 (`@plugin "daisyui"` with `lofi --default, black --prefersdark` themes). All theming goes through DaisyUI semantic tokens (`var(--color-base-*)`, `var(--color-primary)`, etc.); the `:root` block holds only non-theme design tokens (spacing, radius, z-index scale, fonts).
  - `js/main.jsx` - React entry point with Chart.js registration, DebugPill mount in #debug-root
  - `js/AppContext.jsx` - React Context + useReducer provider (delegates all theme DOM mutations to `themes.js applyTheme()`). Imports `reducer` / `loadInitialState` / `DEFAULT_FILTERS` / `filterCommits` from `./appReducer.js`.
  - `js/appReducer.js` - Pure-data reducer, initial-state loader, `DEFAULT_FILTERS`, and `filterCommits` predicate. Extracted from `AppContext.jsx` on 2026-04-15 to keep both files under the 500-line soft-limit. No React imports — can be unit-tested without mounting a tree.
  - `js/themes.js` - Theme catalog, validators (`validLightTheme`, `validDarkTheme`), `persistTheme()` storage helper, `getMetaColor()` lookup, and the single `applyTheme(dark, themeName, skipPersist)` helper that every theme-affecting caller routes through (AppContext darkMode effect, App.jsx embed override, cross-tab storage listener). Imports meta colors from `generated/themeMeta.js` which is regenerated by `scripts/generate-theme-meta.mjs` on every build. The catalog itself (`LIGHT_THEMES` / `DARK_THEMES` / `DEFAULT_*_THEME`) lives inside a BEGIN/END GENERATED block and is propagated from `scripts/theme-config.js`.
  - `js/generated/themeMeta.js` - AUTO-GENERATED by `scripts/generate-theme-meta.mjs`. Never edit by hand. Exports `META_COLORS` (hex map), `IS_DARK` (bool map), `THEME_NAMES` (ordered list). Committed to the repo so dev works on a fresh clone without running the generator first; regenerated by the prebuild hook on every `npm run build` / `npm run dev`.
  - `js/App.jsx` - Main app component (data loading, tab routing, layout)
  - `js/components/` - Shared components (Header, TabBar, DropZone, FilterSidebar, DetailPane, SettingsPane, CollapsibleSection, ErrorBoundary, EmbedRenderer, HeatmapTooltip, HealthAnomalies, HealthBars, HealthWorkPatterns, HamburgerMenu, QuickGuide, ShowMoreButton, Toast, InstallInstructionsModal, DebugPill, TimingHeatmap). The `components/debug/` subdirectory holds the `DebugPill` extraction (`debugStyles.js` inline-style + colour-map module, `DebugTabs.jsx` log/environment/PWA tab bodies) — split out 2026-04-15 to keep `DebugPill.jsx` under the 500-line soft-limit.
  - `js/sections/` - Section components (Summary, Timeline, Timing, Progress, Contributors, Tags, Health, Discover). The `sections/discover/` subdirectory holds `discoverData.js` — the 21-entry metric pool + `getRandomMetrics` picker + `getHumorousFileName` generator extracted from `Discover.jsx` on 2026-04-15.
  - `js/hooks/` - Custom hooks (useDisclosureFocus, useFocusTrap, useHealthData, useShowMore, useEscapeKey, useScrollLock, useTimelineCharts). `useDisclosureFocus` was extracted from `HamburgerMenu.jsx` on 2026-04-16 — focuses first item on open, returns focus to trigger on close; reusable across any disclosure component. `useFocusTrap` traps Tab/Shift+Tab within a container; accepts an optional `externalRef` second parameter for callers that manage their own ref (HamburgerMenu passes `menuRef`). `useTimelineCharts` was extracted from `sections/Timeline.jsx` on 2026-04-15 and returns all five Timeline chart-data objects (`activityChartData`, `codeChangesChartData`, `urgencyTrendData`, `debtTrendData`, `impactTrendData`) with their original dep arrays — the hook exists purely to keep `Timeline.jsx` under the 500-line soft-limit.
  - `js/state.js` - Constants (VIEW_LEVELS, THRESHOLDS, PAGE_LIMITS) + global state compat shim + anonymous-name roster
  - `js/utils.js` - Pure utility functions
  - `js/urlParams.js` - Centralized URL query parameter parsing (single parse, shared across modules)
  - `js/charts.js` - Chart aggregation helpers
  - `js/chartColors.js` - Centralized chart color system: general 8-token semantic cycle (`getSeriesColor`) + chroma-filtered repo cycle (`resolveActiveRepoColor` skips achromatic tokens so active repos always get colorful assignments, even in monochrome themes like lofi/black). Repo categories: active (colorful), internal (60% neutral), discontinued (30% neutral)
  - `js/debugLog.js` - Structured debug logging with pub/sub, console interception, global error capture, and report generation
  - `js/copyToClipboard.js` - Clipboard utility with multiple fallbacks (ClipboardItem Blob, writeText, textarea)
  - `js/pwa.js` - PWA install/update lifecycle (event-based, communicates with React via CustomEvents). Update behavior is the fleet-standard **auto-on-launch** policy (gp-props `PWA_SYSTEM.md` "Update Application Policy"): a worker already waiting when registration first resolves — or a `version.json` mismatch found by the deferred startup check — applies automatically with one reload (launch is the only safe moment; a mid-session reload would discard a drag-dropped data file). Mid-session detections (hourly poll, visibilitychange, manual check) only arm the header "Update Now" item. Persisted "Automatic updates" toggle (localStorage `pwa-auto-update`, `'true'|'false'`, absent = ON) opts out of launch-apply; the version.json launch reload is guarded by a sessionStorage one-shot flag (`pwa-version-launch-reload`) so it can never loop. `checkForUpdate()` runs SW + version.json checks and returns the canonical `'no-sw' | 'up-to-date' | 'update-available' | 'error'` union, surfaced as a toast by the hamburger menu's "Check for updates" item. Per-browser install instructions extracted to `pwaInstructions.js` on 2026-04-15; the 2026-07-21 update-policy additions pushed pwa.js back over the 500-line soft-limit — split tracked in `docs/TODO.md` "File-size monitoring".
  - `js/pwaInstructions.js` - Browser-detection helpers + per-browser step-by-step install instructions for the InstallInstructionsModal. Pure data module (no DOM, no React).
  - `js/pwaConstants.js` - PWA timing/threshold constants (update intervals, settle delays, etc.)
- `vite.config.js` - Vite build + React + Tailwind v4 + PWA plugin config
- `vite.config.lib.js` - Vite library build config (ES module export)
- `hooks/commit-msg` - Validates conventional commit format
- `docs/COMMIT_CONVENTION.md` - Team guide for commit messages

**Live Dashboard:** https://repo-tor.vercel.app/

**Development:**
- `npm run dev` — Local dev server with hot reload (http://localhost:5173)
- `npm run build` — Production build to `dist/`

**Current State:** Dashboard V2 complete with role-based views. See `docs/SESSION_NOTES.md` for recent changes.

**Remaining Work:** See `docs/TODO.md` for backlog items.

## Dashboard Architecture

**Tabs** — 5 tabs defined in `TabBar.jsx`, routed in `App.jsx`:

| Tab | Internal ID | Sections Rendered |
|-----|-------------|-------------------|
| Summary | `overview` | Summary |
| Timeline | `activity` | Timeline, Timing |
| Breakdown | `work` | Progress, Contributors, Tags |
| Health | `health` | Health (includes Security) |
| Discover | `discover` | Discover |

(The former **Projects** tab was removed 2026-07-23 — the project directory now lives in the gp-props showcase at `https://gp-props.vercel.app/`, reached via a "View all projects" link in the hamburger menu. `dashboard/public/projects.json` and `js/sections/Projects.jsx` were deleted with it.)

Tab-to-section mapping is documented in the table above; actual routing is a switch statement in `js/App.jsx` keyed on `state.activeTab`. (A previous `TAB_SECTIONS` export in `js/state.js` duplicated the table with zero active consumers and was removed 2026-04-13.)

**Role-Based View Levels** — Three audiences with different detail levels:

| View | Contributors | Heatmap | Drilldowns |
|------|-------------|---------|------------|
| Executive | Aggregated totals | Weekly blocks | Stats only |
| Management | Per-repo groupings | Day-of-week bars | Stats + repo split |
| Developer (default) | Individual names | 24x7 hourly grid | Full commit list |

Executive and Management views show interpretation guidance hints; Developer view shows raw data. Selection persists in localStorage.

**Theming — Approach A (per-mode independent)**

This project follows the "Approach A" theme persistence shape from `docs/implementations/THEME_DARK_MODE.md`:

- Storage keys: `darkMode` (required once user has toggled), `lightTheme` (optional per-mode theme name), `darkTheme` (optional per-mode theme name)
- User picks a dark/light mode and, independently, a theme for each mode from a curated catalog
- Catalog: 4 light themes (`lofi`, `nord`, `emerald`, `caramellatte`) + 4 dark themes (`black`, `dim`, `coffee`, `dracula`)
- Theme picker lives inside the burger menu, filtered to the current mode
- Reducer state holds `lightTheme` and `darkTheme` in `AppContext` so cross-tab sync can update the non-active mode's theme without DOM flicker

**Why Approach A (and not Approach B named combos)** — sibling projects in the devmade-ai org use the alternate "Approach B" shape where the user picks a named combo (e.g. `Mono` = lofi/black, `Luxe` = fantasy/luxury) with a single `themeCombo` storage key. Examples: canva-grid, graphiki, fh-fuelhunt, intxt. That shape is simpler when each combo is pre-vetted and the design goal is a cohesive branded experience across modes. We chose Approach A because the dashboard is a utility app with no brand-coupled theme pairings — a user picking Nord in light mode has no reason to also want Coffee in dark mode, and forcing them into a combo constrains the choice unnecessarily. Approach A gives `4 × 4 = 16` possible (mode, theme) combinations vs Approach B's `2 × 2 = 4` combo options, at the cost of a slightly more complex picker UX (two clicks: pick mode, pick theme).

See `docs/implementations/THEME_DARK_MODE.md` for the full reference and `scripts/theme-config.js` for the curated catalog.

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
FRAMEWORK=React 19 + Vite + Tailwind v4 + DaisyUI v5
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

These footers are required on every commit. No exceptions.

---

# My Preferences

## AI Checklists

### At Session Start

- [ ] Read CLAUDE.md (this file)
- [ ] Read docs/SESSION_NOTES.md for current state and context
- [ ] Check docs/TODO.md for pending items and known issues
- [ ] Check docs/AI_MISTAKES.md for past mistakes to avoid
- [ ] Understand what was last done before starting new work

### After Each Significant Task

- [ ] Remove completed items from docs/TODO.md
- [ ] Update docs/SESSION_NOTES.md with current state
- [ ] Update docs/USER_GUIDE.md if dashboard UI or interpretation changed
- [ ] Update docs/ADMIN_GUIDE.md if setup, extraction, or configuration changed
- [ ] Update docs/TESTING_GUIDE.md if new test scenarios needed (use structured format: step-by-step actions, where to click/look, expected results, regression checklist)
- [ ] Update other relevant docs (COMMIT_CONVENTION.md, etc.)
- [ ] Commit changes (code + docs together) — the commit message body is where the "what + why" lives

### Before Each Commit

- [ ] Relevant docs updated for changes in this commit
- [ ] docs/SESSION_NOTES.md reflects current state
- [ ] Commit message is clear and descriptive with conventional format + metadata footers
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

## Testing

- Write tests for critical paths and core business logic
- Test error handling and edge cases for critical functions
- Tests are not required for trivial getters/setters or UI-only code
- Run existing tests before and after changes
- **Note:** No test framework currently configured. If tests are added, update this section with the runner and conventions.

---

## Kept From Replaced Sections

What this repo said in sections the fleet sync replaced, that canonical does
not say. Superseded lines were dropped; these were not. Each is a line, not a
block — the rescue was line-based, so the surrounding context is in the commit
before the sync.

- Documentation :: | File | Purpose | When to update |
- Documentation :: | `CLAUDE.md` | AI preferences, project overview, architecture | When architecture, state structures, or preferences change |
- Documentation :: | `docs/SESSION_NOTES.md` | The few things the next session cannot work without — **default state is empty** | At session end, and the moment an entry goes stale — delete it, don't annotate it |
- Documentation :: | `docs/TODO.md` | AI-managed backlog (pending items only) | When noticing improvements; remove items as they're completed |
- Documentation :: | `docs/USER_ACTIONS.md` | Manual tasks requiring user intervention | When tasks need external action (credentials, dashboards) |
- Documentation :: | `docs/AI_MISTAKES.md` | Record of significant AI errors and learnings | After making a mistake that wasted time or broke things |
- Documentation :: | `docs/DAISYUI_V5_NOTES.md` | DaisyUI v5 cheat sheet — v4→v5 renames, project conventions, verification recipe, deliberately-not-used components | When encountering a new DaisyUI v5 quirk, or when adding a new component class to JSX |
- Documentation :: | `README.md` | User-facing application guide | When features change that affect user interaction |
- Documentation :: | `docs/USER_GUIDE.md` | Comprehensive feature documentation | When adding/changing features or UI workflows |
- Documentation :: | `docs/ADMIN_GUIDE.md` | Setup, extraction, and configuration guide for admins/maintainers | When data extraction, aggregation, deploy, or PWA setup workflows change |
- Documentation :: | `docs/TESTING_GUIDE.md` | Manual test scenarios | When adding features that need test coverage |
- Documentation :: **`SESSION_NOTES.md` is empty by default.** It carries only what the next session genuinely needs *and* cannot get from the code, the docs, or `git log`. Not a session log, not a changelog, not a record of what you did. Pending work goes in `docs/TODO.md`, things only the user can do go in `docs/USER_ACTIONS.md`, mistakes worth remembering go in `docs/AI_MISTAKES.md`. Most sessions leave it empty; kept that way, anything in it is known to matter.
- Documentation :: **Changelog:** the git log is the changelog. Don't maintain a separate `HISTORY.md` / `CHANGELOG.md` — every commit message carries the rationale via its body + metadata footers (see `docs/COMMIT_CONVENTION.md`). Use `git log --oneline` or `git log -p` to browse.
- Code Standards :: - [ ] Follow established patterns and conventions in the codebase
- Code Standards :: - [ ] Use industry-standard solutions over custom implementations when available
- Code Standards :: - [ ] Apply SOLID principles, DRY, and separation of concerns
- Code Standards :: - [ ] Prefer well-maintained, widely-adopted libraries over obscure alternatives
- Code Standards :: - [ ] Follow security best practices (input validation, sanitization, principle of least privilege)
- Code Standards :: - [ ] Handle errors gracefully with meaningful messages
- Code Standards :: - [ ] Write self-documenting code with clear naming
- Code Standards :: - [ ] Prefer smaller, focused files and functions
- Code Standards :: - [ ] Pause and consider extraction at: 500 lines (file), 100 lines (function), 400 lines (component)
- Code Standards :: - [ ] Strongly refactor at: 800+ lines (file), 150+ lines (function), 600+ lines (component)
- Code Standards :: - [ ] Extract reusable logic into separate modules/files immediately
- Code Standards :: - [ ] Group related functionality into logical directories
- Code Standards :: - [ ] Split large components into smaller, focused components when responsibilities diverge
- Code Standards :: ```javascript
- Code Standards :: // Requirement: Show loading state before React mounts
- Code Standards :: // Approach: HTML-level spinner inside #root div, replaced by createRoot()
- Code Standards :: //   - React Suspense only: Rejected - no fallback if JS fails to load
- Code Standards :: //   - Blank screen + ErrorBoundary: Rejected - no feedback during load
- Code Standards :: **Vanilla-only policy** (2026-04-14): the dashboard uses only DaisyUI
- Code Standards :: component classes, DaisyUI semantic tokens, and stock Tailwind v4
- Code Standards :: utilities. No custom CSS classes, no @theme extensions, no @utility
- Code Standards :: directives, no arbitrary bracket values, no hardcoded brand colours.
- Code Standards :: The daisy theme IS the brand colour.
- Code Standards :: - [ ] **No custom CSS classes in `dashboard/styles.css`.** The allowlist test enforces a zero-custom-class policy. styles.css contains only the DaisyUI `@plugin` registration, Tailwind `@import`, `:root` non-theme design tokens (z-index scale, font families, spacing-base, radius), body safe-area padding, reduced-motion media query, and print overrides for element selectors. No `.classname { }` primary rules. **Element-selector exception (one remaining, documented in styles.css):** `body::before` decorative grid background — pseudo-elements cannot be expressed as Tailwind utilities. The earlier `* { font-family }` reset and `h1, h2, h3 { font-family: mono }` heading rule were removed on 2026-04-15: `font-sans` now lives on `<body>` in `index.html` (inherits to descendants via the CSS cascade), and the 4 JSX headings in the tree carry explicit `font-mono` utility classes.
- Code Standards :: - [ ] **No `@theme` tokens** — Tailwind's default scales are used as-is. Text sizes use `text-xs`/`text-sm`/`text-base`/etc., spacing uses the stock integer scale, shadows use `shadow-md`/`shadow-lg`/`shadow-xl`, colours use DaisyUI semantic tokens.
- Code Standards :: - [ ] **No `@utility` directives** — if a style pattern can't be expressed with stock utilities + DaisyUI, it's out of scope.
- Code Standards :: - [ ] **No arbitrary bracket values** (`text-[11px]`, `shadow-[...]`, `grid-cols-[...]`, `w-[420px]`) — round to nearest stock, redesign, or drop the feature. **Exceptions (documented):**
- Code Standards :: - `z-[var(--z-sticky-header)]` (Header.jsx) — references the `--z-sticky-header: 21` design token in `:root`. Stock Tailwind has `z-20` and `z-30` but not `z-21`, and the sticky-header layer needs to sit between the sticky-tabs (z-20) and the menu-backdrop (z-40).
- Code Standards :: - `z-[var(--z-toast)]` (Toast.jsx) — references the `--z-toast: 70` design token. Stock Tailwind tops out at `z-50`; the toast layer needs to render above the modal scale (60s) and below the debug pill (80).
- Code Standards :: - `grid-cols-[auto_repeat(7,1fr)]` (`components/TimingHeatmap.jsx` `HourlyHeatmap`) — grid templates with mixed `auto` + `repeat()` aren't expressible as stock Tailwind, and row-alignment between the hour-label column and the 7 day columns is a functional data-correctness requirement, not cosmetic. (Moved from `sections/Timing.jsx` to `components/TimingHeatmap.jsx` on 2026-04-15 during the line-count refactor; the exception still applies, just at a new location.)
- Code Standards :: - The earlier `max-w-[calc(100vw-2rem)]` (HamburgerMenu.jsx dropdown) was removed on 2026-04-15. The dropdown's max-width is now computed at runtime from `window.innerWidth - 32` in the same `useLayoutEffect` measurement pass that computes `top`/`left` portal positioning — applied as an inline `style={{ maxWidth }}` which is an explicitly allowed inline-style use case (portal positioning / runtime-computed from viewport data). This is also more correct than the CSS approach: `window.innerWidth` excludes scrollbar width on browsers where the scrollbar overlaps the viewport, whereas CSS `100vw` includes it.
- Code Standards :: - [ ] **No hex colour literals anywhere in JSX or JS data constants.** Chart palettes, tag colours, repo colours all resolve DaisyUI semantic CSS variables at runtime via `getComputedStyle`. **Exceptions:**
- Code Standards :: - **DebugPill subsystem** — `dashboard/js/components/DebugPill.jsx` AND every file under `dashboard/js/components/debug/` (`debugStyles.js`, `DebugTabs.jsx`, and any future module in that subdirectory). The debug pill renders in an isolated React root (`#debug-root`) that must survive App crashes AND stylesheet load failures. Tailwind classes won't reach this root if the main CSS bundle never loads, so the entire subsystem uses inline hex colours sourced from a fixed dark-terminal palette. The 2026-04-15 line-count refactor split `DebugPill.jsx` into three files without changing this constraint — all three share the same resilience requirement. Any new file added under `components/debug/` inherits this exception automatically.
- Code Standards :: - `dashboard/js/generated/themeMeta.js` — auto-generated by `scripts/generate-theme-meta.mjs` from each registered DaisyUI theme's `--color-base-100` oklch value, converted to hex. Used for PWA `<meta name="theme-color">` tags which the browser parses as literal hex (CSS variables don't work here). Regenerated on every `npm run build` / `npm run dev` via the generator's prebuild hook. Do not hand-edit.
- Code Standards :: - The earlier `themes.js` `#808080` fallback in `getMetaColor()` was removed on 2026-04-15 — the fallback now reads `META_COLORS[DEFAULT_LIGHT_THEME]` (the generated default-theme hex) so `themes.js` source code contains zero hex literals. See the Approach/Alternatives block above the function for the full rationale.
- Code Standards :: - **Scope note:** this rule applies to `JSX or JS data constants` — i.e., everything under `dashboard/js/`. It does NOT cover `dashboard/index.html`. That file contains a small pre-React loading spinner (lines ~108-117) with inline `style="..."` + hex literals (`#414558`, `#bd93f9`, `#767676`, `#e5e7eb`, `#f59e0b`) + a `@keyframes spin` block. Those are INTENTIONAL and out of the policy's scope: they render before any React or Tailwind code executes (before `createRoot` runs, before the CSS bundle loads), and a Tailwind-class-based spinner would be invisible in the pre-React loading window. The HTML file is the only part of the app that's allowed to use inline hex + inline `style=` pairs for this reason — treat it as a separate layer with its own pre-React rules. Spinner colors follow the Dracula theme palette (updated 2026-04-16).
- Code Standards :: - [ ] No inline `style={}` objects in JSX unless values are runtime-computed from data (progress-bar widths, runtime-computed container heights from data-row counts, portal positioning, Chart.js dataset colours resolved at runtime). **Exception (one remaining):**
- Code Standards :: - **DebugPill subsystem** — same rationale as the hex-literal exception above. All `style={}` in `DebugPill.jsx` and `components/debug/*` is allowed because the pill must render without Tailwind. The earlier "Root ErrorBoundary in main.jsx" static-inline-style exception was removed on 2026-04-15 after converting the fallback to Tailwind utilities — the CSS-load-failure scenario is rare enough that belt-and-suspenders inline styles weren't worth the permanent exception, and the browser's user-agent stylesheet still renders the error text legibly in that edge case.
- Code Standards :: - [ ] Use DaisyUI semantic tokens for theming — never hardcode theme values:
- Code Standards :: - Surfaces: `bg-base-100` (page) / `bg-base-200` (cards, elevated) / `bg-base-300` (inputs, progress rails, hover states)
- Code Standards :: - Text: `text-base-content` (primary) / `text-base-content/80` (secondary) / `text-base-content/60` (tertiary) / `text-base-content/40` (muted)
- Code Standards :: - Borders: `border-base-300` (visible) / `border-base-200` (subtle)
- Code Standards :: - Status: `text-error` / `bg-error/10` / `text-warning` / `text-success` / `text-info` / `text-primary` / `text-secondary` / `text-accent`
- Code Standards :: - [ ] No `<script>` tags — all JS through ES module imports (exceptions: debug pill and PWA early capture in index.html, which must run before modules load)
- Code Standards :: - [ ] Maintain light/dark mode support via dual-layer theming (`.dark` class + `data-theme` attribute). Prefer DaisyUI semantic tokens (auto-switch with theme) over `dark:` prefix pairs. See `docs/implementations/THEME_DARK_MODE.md`.
- Code Standards :: - [ ] Never re-introduce custom `--bg-*`, `--text-*`, `--border-*`, `--color-primary-alpha`, `--chart-grid`, or `--glow-*` variables — they were fully removed in the 2026-04-12 migration. Use DaisyUI tokens or inline `color-mix(in oklab, var(--color-primary) X%, transparent)` for tinted variants.
- Code Standards :: - [ ] **Never write asterisk-slash sequences inside CSS `/* ... */` comments** (e.g. `--bg-*/...` glob patterns). The embedded `*/` terminates the comment early and esbuild's CSS minifier silently drops everything after the break point, producing a build that passes but renders without half the custom styles. Phrase glob patterns in comments as `--bg, --text, --border` instead, or use the word "glob" / "star-slash" spelled out. This mistake already bit us once in this session — see `docs/AI_MISTAKES.md` 2026-04-12 entry.
- Code Standards :: - [ ] Remove all temporary files after implementation is complete
- Code Standards :: - [ ] Delete unused imports, variables, and dead code immediately
- Code Standards :: - [ ] Remove commented-out code unless explicitly marked `// KEEP:` with reason
- Code Standards :: - [ ] Clean up console.log/print statements before marking work complete
- Code Standards :: - [ ] Every `setTimeout`/`setInterval`/`addEventListener`/`subscribe` needs a matching cleanup (`clearTimeout`/`clearInterval`/`removeEventListener`/unsubscribe handle).
- Code Standards :: - [ ] Store timer ids in a scope the cleanup can reach. Nested timeouts → array; single-shot → local const or ref.
- Code Standards :: - [ ] In React: return cleanup from `useEffect`. In plain modules (e.g. `dashboard/js/pwa.js`, `dashboard/js/debugLog.js`): export a `dispose()` or use `AbortController`.
- Code Standards :: - [ ] HMR-safe: guard global listener attachment behind a `window.__<featureName>Attached` flag so hot-reload doesn't double-subscribe. For modules running under Vite, also release listeners via `import.meta.hot.dispose()`.
- Code Standards :: - [ ] Error handling gaps
- Code Standards :: - [ ] Edge cases not covered
- Code Standards :: - [ ] Inconsistent naming
- Code Standards :: - [ ] Code duplication that should be extracted
- Code Standards :: - [ ] Missing input validation at boundaries
- Code Standards :: - [ ] Security concerns (XSS via `dangerouslySetInnerHTML`, unsanitized user input)
- Code Standards :: - [ ] Performance issues (unnecessary re-renders, missing keys, large re-computations)
- Implementation Patterns (Source of Truth) :: **Source of truth:** gp-props repo at `docs/implementations/` — there are NO local copies in this repo or any other devmade-ai repo.
- Implementation Patterns (Source of Truth) :: To fetch a pattern spec (preferred — public GitHub Pages, no token required):
- Implementation Patterns (Source of Truth) :: To fetch via the GitHub API (fallback — requires token):
- Implementation Patterns (Source of Truth) :: | python3 -c "import sys,json,base64; d=json.load(sys.stdin); print(base64.b64decode(d['content']).decode())"
- Implementation Patterns (Source of Truth) :: To list every available pattern (discover what's there before assuming):
- Implementation Patterns (Source of Truth) :: | python3 -c "import sys,json; [print(f['name']) for f in json.load(sys.stdin)]"
- Implementation Patterns (Source of Truth) :: - **Never create local copies** of pattern files — always fetch from gp-props
- Implementation Patterns (Source of Truth) :: - **Always fetch the latest version** before implementing — patterns are updated between sessions
- Implementation Patterns (Source of Truth) :: - **Never rely on memory or summaries** — read the actual spec from gp-props every time
- Prohibitions :: - Leave TODO comments without tracking them in docs/TODO.md
- Prohibitions :: - Ignore errors or warnings in output
- Prohibitions :: - Write code without decision context comments for non-trivial changes
- Prohibitions :: - Use silent `.catch(() => {})` — always handle specific errors (see AI Mistakes)
- Prohibitions :: - Hardcode values that should come from CSS variables or config (see AI Mistakes)
- Prohibitions :: - Document or recommend features that haven't been tested (see AI Mistakes)
- Prohibitions :: - Improvise extraction/analysis workflows — follow `docs/DATA_OPERATIONS.md` exactly, step by step, using the exact formats documented (see AI Mistakes)
- Prohibitions :: - Create local copies of implementation pattern files — always fetch from gp-props (see Implementation Patterns)
- AI Notes :: - **Document your mistakes** in docs/AI_MISTAKES.md so future sessions learn from them
- AI Notes :: - **Always read files before editing** — use the Read tool on every file before attempting to Edit it
- AI Notes :: - **CRITICAL: Keep `QuickGuide.jsx` up to date** — this is user-facing help content shown in-app. When tabs, sections, or features change, update the guide steps to match. Outdated guide content confuses users.
- AI Notes :: - **Verify before assuming** — read the actual code before claiming what it does. Don't describe behavior based on file names, comments, or assumptions — check the implementation. If the user describes how something works, compare it against the actual code rather than agreeing without verification.
- AI Notes :: - **Fix root causes, not symptoms** — when something isn't working, find out WHY before writing code. Don't add workarounds (globals, duplicate listeners, flag variables) to patch over an architectural issue. If the fix requires touching 3+ files to coordinate shared state, that's a smell — look for a simpler structural change.
- AI Notes :: - **Keep docs updated immediately** — update relevant docs right after each change, before moving to the next task (sessions can end abruptly)
- AI Notes :: - **Preserve session context** — update docs/SESSION_NOTES.md after each significant task (not at the end — sessions can end abruptly)
- AI Notes :: - **Capture ideas** — add lower priority items and improvements to docs/TODO.md so they persist between sessions
- AI Notes :: - **Document user actions** — when manual user action is required (external dashboards, credentials, etc.), add detailed instructions to docs/USER_ACTIONS.md
- AI Notes :: - **Commit and push changes before ending a session**
- AI Notes :: - **Check for existing patterns** in the codebase before creating new ones
- AI Notes :: - **Clean up completed or obsolete docs/files** and remove references to them
- AI Notes :: - **Discontinued repos — skip entirely:** `plant-fur`, `coin-zapp`, and `chatty-chart` are discontinued. Do not check, audit, align, or include them in cross-project operations. `chatty-chart` (illuminAI-select org) is also explicitly excluded from data aggregation by name in `scripts/aggregate-processed.js` `EXCLUDED_REPOS`.
- AI Notes :: - **Trigger vs. repo-convention name collisions:** Several trigger names collide with repo concepts in this codebase — `docs` (folder), `config` (folder), `state` (`dashboard/js/state.js`), `api` (`scripts/extract-api.js`), `pwa` (`dashboard/js/pwa.js`), `patterns` (Implementation Patterns section). When a user message uses a bare word that matches both a trigger and a repo concept, interpret as the trigger ONLY when the message context is a review/audit request. Otherwise treat as the repo concept.
- AI Notes :: Default mode is development (`@coder`). Use `@data` to switch when needed.
- AI Notes :: - **@coder (default):** Development work — writing/modifying code, bug fixes, feature implementation, code review, refactoring, technical decisions
- AI Notes :: - **@data:** Data extraction and processing — start message with `@data`. See `docs/DATA_OPERATIONS.md` for details.
- AI Notes :: - **"hatch the chicken"** — Full reset: delete everything, AI analyzes ALL commits from scratch
- AI Notes :: - **"feed the chicken"** — Incremental: AI analyzes only NEW commits not yet processed
