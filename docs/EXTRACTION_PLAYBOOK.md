# Extraction Playbook

Step-by-step instructions for AI-driven data extraction and analysis.

**Persona:** `@data` (see CLAUDE.md)

**Trigger:** `@data feed the chicken`

## Overview

When triggered, the AI assistant (in @data mode):

1. Extracts git commit data from configured repositories
2. Analyzes each commit message to assign tags
3. Calculates complexity scores
4. Updates data files
5. Reports summary to user
6. User commits and pushes changes

## Process

### Step 1: Check Configuration

Read `config/repos.json` to get list of repositories to extract.

### Step 2: Extract Git Data

For each repository, run git log extraction to get:

- Commit hash
- Author (name, email)
- Timestamp (ISO 8601)
- Commit message (subject + body)
- Files changed count
- Lines added/deleted

**IMPORTANT:** Record the total commit count before processing:
```
git rev-list --count HEAD
```

### Step 3: Analyze Each Commit

**Process EVERY commit. No skipping.**

For each commit (one by one, in order):

1. Read the full commit message
2. Assign tags based on the guidelines below
3. Calculate complexity
4. Record to output

**Verification checklist:**
- [ ] Total commits extracted = `git rev-list --count HEAD`
- [ ] Every commit has at least one tag assigned
- [ ] No commits were summarized or batched together

For each commit, AI analyzes the commit message to determine:

**Tags** (multiple allowed):

| Tag | Description |
|-----|-------------|
| `feature` | New functionality added |
| `bugfix` | Bug or error corrected |
| `refactor` | Code restructured without behavior change |
| `docs` | Documentation changes |
| `test` | Test additions or modifications |
| `config` | Configuration, build, or tooling changes |
| `style` | Formatting, whitespace, naming (no logic change) |
| `cleanup` | Removing dead code, organizing files |
| `security` | Security-related changes |
| `performance` | Performance improvements |
| `dependency` | Dependency updates |

**Complexity** (scale 1-5):

Based on files changed and tag count:

| Score | Criteria |
|-------|----------|
| 1 | Single file, single tag |
| 2 | 2-3 files OR 2 tags |
| 3 | 4-6 files OR 3+ tags |
| 4 | 7-10 files AND multiple tags |
| 5 | 10+ files AND 3+ tags |

## Tagging Guidelines

Rules for consistent tag assignment across sessions.

### Core Principles

1. **Evidence-based** - Only assign tags supported by the commit message content
2. **Consistent** - Same commit message should always produce the same tags
3. **Complete** - Assign ALL tags that accurately describe the work
4. **Conventional prefix wins** - If message has `feat:`, `fix:`, etc., that's always the primary tag

### Tag Priority Order

Order tags in the array by importance (first = primary). Use this order:

1. `security` - Always tag if security-related (can combine with others)
2. `bugfix` - Fixing broken behavior takes priority
3. `feature` - New user-facing functionality
4. `performance` - Optimization work
5. `refactor` - Restructuring without behavior change
6. `test` - Test-only changes
7. `docs` - Documentation-only changes
8. `config` - Build/tooling changes
9. `dependency` - Package updates
10. `style` - Formatting only
11. `cleanup` - Catch-all for tidying

### Decision Rules

**refactor vs cleanup:**
- `refactor` = Restructuring code (renaming, extracting functions, reorganizing)
- `cleanup` = Removing dead code, deleting unused files, organizing imports

**refactor vs feature:**
- If behavior changes for the user → `feature`
- If only internal structure changes → `refactor`

**config vs feature:**
- `config` = CI/CD, build scripts, linter rules, tooling
- `feature` = App configuration that affects user behavior

**bugfix vs feature:**
- `bugfix` = Something was broken and is now fixed
- `feature` = Something didn't exist and now does

**When to use multiple tags:**
- `feature` + `test` = New feature with tests in same commit
- `feature` + `security` = Security feature (auth, encryption)
- `bugfix` + `security` = Security vulnerability fix
- `refactor` + `performance` = Refactor that improves performance

### Examples

| Commit Message | Tags | Reasoning |
|----------------|------|-----------|
| `feat: add user login page` | `feature` | Clear conventional prefix |
| `fix: resolve crash on startup` | `bugfix` | Clear conventional prefix |
| `Add dark mode toggle` | `feature` | New functionality, no prefix |
| `Fix typo in README` | `docs` | Documentation change |
| `Update dependencies` | `dependency` | Package updates |
| `Refactor auth module` | `refactor` | Restructuring, no behavior change |
| `Remove unused helper functions` | `cleanup` | Deleting dead code |
| `feat: add password hashing` | `feature`, `security` | Security-related feature |
| `fix: patch XSS vulnerability` | `bugfix`, `security` | Security fix |
| `Add unit tests for UserService` | `test` | Test-only commit |
| `Format code with prettier` | `style` | Formatting only |
| `Optimize database queries` | `performance` | Speed improvement |
| `Update webpack config` | `config` | Build tooling |
| `feat: add search with tests` | `feature`, `test` | Feature + tests together |

### Edge Cases

**Vague messages** (e.g., "update code", "fix stuff", "changes"):
- Look at files changed if available
- Default to `cleanup` if truly ambiguous
- Never guess - use the most conservative tag

**Merge commits:**
- Tag as `cleanup` unless message indicates otherwise
- Skip if it's just "Merge branch X into Y"

**Initial commits:**
- Tag as `feature` (establishing the codebase)

**Version bumps** (e.g., "v1.2.3", "bump version"):
- Tag as `config`

**Reverts:**
- Match the tag of what was reverted (revert a bugfix → `bugfix`)

**Multi-purpose commits** (doing too many things):
- Assign all relevant tags
- Complexity score increases with tag count (see complexity table)

### What NOT to Do

- Don't tag based on file extensions alone (`.test.js` doesn't mean `test` tag)
- Don't use `feature` for internal refactoring
- Don't use `bugfix` for new functionality that was missing
- Don't invent tags not in the tag list
- Don't skip tags that clearly apply - be complete

### Step 4: Update Data Files

Write results to:

- `reports/{repo-id}/commits.json` - Per-repo commit data
- `dashboard/data.json` - Aggregated data for dashboard

### Step 5: Report Summary

Provide user with:

- **Commit count verification:** "Processed X of Y commits" (must match)
- Number of commits processed per repo
- New commits since last extraction (if applicable)
- Any errors or issues encountered

**If counts don't match, STOP and report which commits were missed.**

### Step 6: User Action

User reviews changes and:

```bash
git add .
git commit -m "chore: update extracted data"
git push
```

## Data Schema

### Commit Object

```json
{
  "hash": "abc123",
  "author_id": "john-doe",
  "timestamp": "2026-01-19T10:30:00Z",
  "message": "Add user authentication flow",
  "tags": ["feature", "security"],
  "complexity": 3,
  "files_changed": 5,
  "lines_added": 120,
  "lines_deleted": 15
}
```

### Metadata Object

```json
{
  "repo_id": "my-repo",
  "extracted_at": "2026-01-19T12:00:00Z",
  "commit_count": 150,
  "authors": {
    "john-doe": {
      "name": "John Doe",
      "email": "john@example.com"
    }
  }
}
```

## Notes

- Tags are determined by AI analysis of commit message content, not just conventional commit prefixes
- A commit can have multiple tags (e.g., a feature that also includes tests)
- Complexity is a heuristic - refine the formula based on experience
- Existing `is_conventional` field can be kept for backward compatibility
- The `type` field is deprecated in favor of `tags[]`

---

*Last updated: 2026-01-19 - Added tagging guidelines for consistency*
