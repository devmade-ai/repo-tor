# Commit Analysis Guide

Quick reference for AI assistants analyzing git commits.

**Full workflow:** See [EXTRACTION_PLAYBOOK.md](EXTRACTION_PLAYBOOK.md)

---

## Analysis Output Format

```json
{"sha": "abc123", "tags": ["feature", "ui"], "complexity": 2, "urgency": 2, "impact": "user-facing"}
```

All four fields are required for every commit.

---

## Special Cases

### Merge Commits

Merge commits only get the `merge` tag. They don't contain actual work - the real commits already have appropriate tags.

| Field | Value | Reason |
|-------|-------|--------|
| tags | `["merge"]` | Only tag - no feature/bugfix/etc. |
| complexity | 1 | Merging is trivial |
| urgency | 2 | Normal (unless emergency merge) |
| impact | internal | The merge itself doesn't affect users |

**Why?** Adding descriptive tags to merge commits double-counts work in analytics. The PR's commits already have the right tags.

### Documentation-Only Commits

| Field | Value |
|-------|-------|
| tags | `["docs"]`, `["changelog"]`, etc. |
| complexity | 1 |
| urgency | 1-2 |
| impact | `internal` (dev docs) or `user-facing` (user docs) |

### Revert Commits

| Field | Value |
|-------|-------|
| tags | `["revert"]` + original commit's tags |
| complexity | 1-2 |
| urgency | 3-5 (usually elevated - something went wrong) |
| impact | Same as the reverted commit |

### WIP/Checkpoint Commits

Treat as the work they contain. If it's incomplete feature work, still tag as `feature`.

---

## Complexity Scale (1-5)

Based on scope and technical difficulty:

| Score | Label | Description |
|-------|-------|-------------|
| 1 | Trivial | Single file, minor change, typo fix |
| 2 | Small | Few files, straightforward change |
| 3 | Medium | Multiple files, moderate complexity |
| 4 | Large | Many files, significant changes |
| 5 | Major | Extensive changes, architectural impact |

**Signals:**
- File count and lines changed (from stats)
- Number of concepts touched
- Cross-cutting concerns

---

## Urgency Scale (1-5)

Based on how reactive vs planned the work was:

| Score | Level | Description | Signals |
|-------|-------|-------------|---------|
| 1 | Planned | Roadmap work, no pressure | Feature development, tech debt, refactoring |
| 2 | Normal | Regular development pace | Standard bug fixes, improvements |
| 3 | Elevated | Needs attention soon | Bug affecting users, deadline approaching |
| 4 | Urgent | High priority, blocking | Breaking functionality, blocking other devs |
| 5 | Critical | Drop everything | Production down, security vulnerability |

**Keywords that indicate higher urgency:**
- "urgent", "hotfix", "critical", "ASAP", "emergency"
- "crash", "down", "broken", "blocking"
- "security", "vulnerability"

**Default:** Most commits are urgency 2 (normal development).

---

## Impact Categories

Choose ONE primary impact:

| Impact | Who's affected | Examples |
|--------|---------------|----------|
| `internal` | Developers only | Tests, refactoring, dev docs, tooling, CI config |
| `user-facing` | End users | UI, features, bug fixes users see, UX, user docs |
| `infrastructure` | Operations/deployment | CI/CD, Docker, monitoring, hosting, env vars |
| `api` | External integrations | API endpoints, breaking changes, webhooks |

**Decision rules:**
- If user-facing + internal (feature + tests): choose `user-facing`
- Merge commits: `internal`
- User documentation: `user-facing`
- Developer documentation: `internal`

---

## Common Tags Reference

**User-Facing:** `feature`, `enhancement`, `bugfix`, `hotfix`, `ui`, `ux`

**Code Changes:** `refactor`, `simplify`, `removal`, `migration`, `types`

**Performance:** `performance`, `memory`, `caching`

**Security:** `security`, `auth`, `vulnerability`, `sanitization`

**Testing:** `test-unit`, `test-integration`, `test-e2e`, `test-fix`

**Documentation:** `docs`, `changelog`, `comments`, `api-docs`

**Infrastructure:** `ci`, `cd`, `docker`, `monitoring`, `hosting`

**Dependencies:** `dependency-add`, `dependency-update`, `dependency-remove`

**Database:** `database`, `schema`, `data-migration`

**API:** `api`, `api-breaking`, `endpoint`

**Git/Process:** `merge`, `revert`, `release`, `init`

**Full tag list:** See [EXTRACTION_PLAYBOOK.md](EXTRACTION_PLAYBOOK.md#tags-by-category)

---

## Quick Examples

| Commit | Tags | C | U | Impact |
|--------|------|---|---|--------|
| Merge pull request #42 | merge | 1 | 2 | internal |
| Add dark mode toggle | feature, ui | 2 | 1 | user-facing |
| Fix crash on startup | bugfix | 2 | 4 | user-facing |
| HOTFIX: Production DB timeout | hotfix, database | 2 | 5 | infrastructure |
| Refactor auth module | refactor | 3 | 1 | internal |
| Update README | docs | 1 | 1 | internal |
| Add user API endpoint | feature, endpoint, api | 3 | 2 | api |

---

## Lessons Learned

See [AI_LESSONS.md](AI_LESSONS.md) for documented mistakes to avoid.

**Key lesson:** Merge commits should ONLY have the `merge` tag. Don't add descriptive tags based on the PR title.

---

*Last updated: 2026-01-23*
