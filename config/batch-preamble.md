# Batch Analysis Preamble

Read this before analyzing commits. These instructions apply to every commit in this batch.

---

## What Is Expected

You are analyzing git commit messages to assign structured metadata. For each commit, read the **full message** (subject + body) and assign ALL of the following fields:

### Required Fields

| Field | Type | Values |
|-------|------|--------|
| `tags` | Array of strings | One or more from the tag vocabulary below |
| `complexity` | Integer | 1-5 (scope/difficulty of the change) |
| `urgency` | Integer | 1-5 (how critical/reactive the change was) |
| `impact` | String | One of: `internal`, `user-facing`, `infrastructure`, `api` |
| `risk` | String | One of: `low`, `medium`, `high` |
| `debt` | String | One of: `added`, `paid`, `neutral` |
| `epic` | String | Short hyphenated label grouping related commits (e.g., `dark-mode`, `auth-v2`) |
| `semver` | String | One of: `patch`, `minor`, `major` |

### Output Format

Output **only analysis fields** — not the full commit object. The merge script handles the rest.

```json
{"commits": [
  {"sha": "abc123", "tags": ["feature", "ui"], "complexity": 2, "urgency": 1, "impact": "user-facing", "risk": "low", "debt": "neutral", "epic": "dashboard-redesign", "semver": "minor"},
  {"sha": "def456", "tags": ["bugfix"], "complexity": 1, "urgency": 3, "impact": "user-facing", "risk": "low", "debt": "neutral", "epic": "dashboard-redesign", "semver": "patch"}
]}
```

### Review Presentation Format

Present each commit to the user in exactly this format:

```text
[1/25] abc123
Subject: Fix button placement and performance issues
Body:
- Move "Update Visualization" button below the image
- Fix page freeze on visualization update by removing scrollIntoView

Tags: refactor, bugfix, performance | Complexity: 4 | Urgency: 3 | Impact: user-facing | Risk: medium | Debt: neutral | Epic: ui-overhaul | Semver: patch
---
[2/25] def456
...
```

---

## Tag Vocabulary

Assign ALL tags that apply. Multiple tags per commit is expected.

**User-Facing:** `feature` (new for users), `enhancement` (improved existing), `bugfix` (fixed broken), `hotfix` (urgent production fix), `ui` (visual/interface), `ux` (experience flow), `accessibility` (a11y), `i18n` (internationalization), `localization` (translations)

**Code Changes:** `refactor` (restructured), `simplify` (reduced complexity), `removal` (deleted dead code), `deprecation` (marked deprecated), `migration` (new approach/library), `naming` (renamed things), `types` (type definitions)

**Performance:** `performance` (speed), `memory` (memory optimization), `caching` (caching)

**Security:** `security` (general), `auth` (authentication), `authorization` (permissions), `vulnerability` (fixed vuln), `sanitization` (input validation)

**Testing:** `test-unit`, `test-integration`, `test-e2e`, `test-fix` (fixed broken tests), `coverage`, `mocks`

**Documentation:** `docs` (documentation files), `changelog`, `comments` (code comments), `api-docs`, `examples`

**Infrastructure:** `ci` (pipelines), `cd` (deployment), `docker`, `monitoring` (logging/observability), `hosting`

**Build & Config:** `build`, `bundler` (webpack/vite), `config`, `env`, `lint`, `formatter`

**Dependencies:** `dependency-add`, `dependency-update`, `dependency-remove`, `dependency-security`

**Database:** `database`, `schema`, `data-migration`, `seed`

**API:** `api`, `api-breaking`, `endpoint`

**Git/Process:** `merge`, `revert`, `release`, `init`

**Code Style:** `style` (formatting), `imports`, `whitespace`

**Error Handling:** `error-handling`, `logging`, `validation`

---

## Scoring Rubrics

### Complexity (1-5)

| Score | Description |
|-------|-------------|
| 1 | Trivial — single file, minor change, typo fix |
| 2 | Small — few files, straightforward change |
| 3 | Medium — multiple files, moderate complexity |
| 4 | Large — many files, significant changes |
| 5 | Major — extensive changes, architectural impact |

### Urgency (1-5)

| Score | Level | Description |
|-------|-------|-------------|
| 1 | Planned | Roadmap work, no time pressure |
| 2 | Normal | Regular development pace |
| 3 | Elevated | Needs attention soon, bug affecting users |
| 4 | Urgent | High priority, blocking other work |
| 5 | Critical | Drop everything — production down, security vuln |

**Signals for higher urgency:** "urgent", "hotfix", "critical", "ASAP", "crash", "down", "broken", "blocking", weekend/after-hours commits.

**Default:** Most commits are urgency 2.

### Impact

| Impact | Who's affected |
|--------|---------------|
| `internal` | Developers only — tests, refactoring, dev docs, tooling, CI config |
| `user-facing` | End users — UI, features, bug fixes users see, UX, user docs |
| `infrastructure` | Operations — CI/CD, Docker, monitoring, hosting, env vars |
| `api` | External integrations — API endpoints, breaking changes, webhooks |

If a commit touches both user-facing and internal (e.g., feature + tests), choose `user-facing`.

### Risk

| Risk | Description |
|------|-------------|
| `low` | Minimal chance of breakage — docs, formatting, config, comments |
| `medium` | Could cause issues — new features, refactors, dependency updates |
| `high` | Touches critical paths — auth, payments, data integrity, security, DB schemas |

**Key question:** "What's the worst that happens if this is wrong?"

### Debt

| Debt | Description |
|------|-------------|
| `added` | Introduced shortcuts — TODOs, workarounds, "good enough for now" |
| `paid` | Cleaned up existing debt — refactored hacks, removed workarounds |
| `neutral` | Neither added nor reduced debt — standard work |

**Default:** Most commits are `neutral`.

### Epic

- Short, lowercase, hyphenated label (e.g., `dark-mode`, `auth-v2`, `react-migration`)
- Reuse the same label across all commits for one initiative
- For standalone commits not tied to a larger effort, use a descriptive label that captures the commit's area (e.g., `docs-update`, `ci-setup`, `initial-scaffold`)

### Semver

| Semver | Description |
|--------|-------------|
| `patch` | Bug fix, correction, no new functionality |
| `minor` | New feature, backward compatible |
| `major` | Breaking change — API changes, schema migrations |

---

## Special Cases

### Merge Commits

Only get the `merge` tag. The real commits already have appropriate tags — adding descriptive tags to merges double-counts work in analytics.

```
Tags: merge | Complexity: 1 | Urgency: 2 | Impact: internal | Risk: low | Debt: neutral | Epic: <same as merged work> | Semver: patch
```

### Revert Commits

Use `revert` tag plus the original commit's tags. Urgency is typically elevated (3-5) since something went wrong.

### WIP/Checkpoint Commits

Tag based on the actual work they contain. Incomplete feature work still gets `feature`.

---

## What Is NOT Allowed

1. **Do not abbreviate or restructure the review format** — use the exact layout shown above
2. **Do not output full commit objects** — only output analysis fields (sha, tags, complexity, urgency, impact, risk, debt, epic, semver). The merge script combines your analysis with the raw git data
3. **Do not skip merge-analysis.js** — always pipe approved analysis through the merge script
4. **Do not invent tags** outside the vocabulary listed above
5. **Do not leave any field blank** — every field must have a value for every commit

---

## When Unsure

**Never leave a field blank.** Make your best judgment from the commit message context. You can understand nuance, intent, and implications that a script cannot — that is why a human-in-the-loop AI process is used instead of automated scripts.

- **Tags:** Read the full message. If the subject says "refactor" but the body mentions fixing a bug, tag both `refactor` and `bugfix`.
- **Complexity:** Count the conceptual scope. A one-liner that touches auth logic is still low complexity (1-2), not high risk.
- **Urgency:** Default to 2 unless keywords or context suggest otherwise.
- **Impact:** When mixed, choose the primary audience. Feature + tests = `user-facing`.
- **Risk:** Think "what breaks if this is wrong?" Docs = `low`. New feature = `medium`. Auth/data = `high`.
- **Debt:** Default to `neutral`. Only `added` for conscious shortcuts, only `paid` for deliberate cleanup.
- **Epic:** Group by initiative. If a standalone commit doesn't belong to a multi-commit effort, use a descriptive area label.
- **Semver:** Bug fix = `patch`. New feature = `minor`. Breaking change = `major`.

The user reviews every batch and can correct any judgment call. A best guess that gets corrected is better than a blank field that breaks downstream processing.

---

## Why This Process Exists

1. **AI reads context, not patterns** — commit messages carry intent, nuance, and cross-references that regex-based scripts miss. A message like "clean up auth flow" could be `refactor`, `security`, `simplify`, or all three — only reading the full body reveals which.
2. **Human review catches mistakes** — presenting batches for approval means every tag assignment gets verified. This is cheaper than fixing bad data downstream.
3. **Token efficiency** — outputting only analysis fields (~50-80 tokens per commit) instead of full commit objects (~500-800 tokens) reduces cost 10x while the merge script preserves data integrity.
4. **Consistency across sessions** — this preamble travels with every batch, so analysis quality doesn't drift between sessions or context windows.

---

*Embedded by pending.js from config/batch-preamble.md*
