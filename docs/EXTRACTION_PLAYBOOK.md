# Extraction Playbook

Step-by-step instructions for AI-driven data extraction and analysis.

**Persona:** `@data` (see CLAUDE.md)

## Overview

Two-stage process with persistent storage of AI-analyzed commits:

1. **Extract** raw git data (ephemeral)
2. **AI analyzes** each commit message and assigns tags + complexity
3. **Store** in `processed/` folder (persistent, source of truth)
4. **Aggregate** to dashboard (generated from processed)

## Triggers

| Trigger | Action |
|---------|--------|
| **"hatch the chicken"** | Full reset - delete everything, extract all repos, AI analyzes ALL commits, save to `processed/`, aggregate to dashboard |
| **"feed the chicken"** | Incremental - extract repos, AI analyzes only NEW commits (not in `processed/`), update `processed/`, re-aggregate |

## Batch Processing Strategy

Processing commits in batches with checkpoints for resilience:

### Batch Size
- Process **50 commits per batch** (balance between progress and context limits)
- After each batch: write to `processed/`, commit changes
- If session ends mid-processing, work is saved

### Checkpoint System
Each repo tracks progress via `processed/<repo>/checkpoint.json`:

```json
{
  "last_processed_sha": "abc123def456",
  "processed_count": 150,
  "total_count": 302,
  "last_updated": "2026-01-19T15:30:00Z"
}
```

### Resume Logic
1. Read `checkpoint.json` for each repo
2. If `processed_count < total_count`, continue from checkpoint
3. Skip commits already in `commits.json`
4. Process next batch, update checkpoint, commit

### Benefits
- **Resilient**: Session interruptions don't lose work
- **Incremental**: Can stop and continue anytime
- **Traceable**: Know exactly where processing left off

## File Structure

```
processed/                    # Source of truth (committed to git)
  <repo-name>/
    commits.json              # AI-analyzed commits
    metadata.json             # Repo metadata
    checkpoint.json           # Progress tracker for batch processing
config/
  repos.json                  # Tracked repositories
  author-map.json             # Author identity mapping
dashboard/
  commits.json                # Aggregated (generated from processed/)
  data.json                   # Combined data for dashboard
  summary.json                # Aggregated summary
.repo-cache/                  # Cloned repos (gitignored)
```

**Note:** The old `reports/` folder is no longer used. All persistent data lives in `processed/`.

---

## Hatch the Chicken (Full Reset)

Use when: Starting fresh, schema changes, or need to reprocess everything.

### Step 1: Clean Slate

```bash
# Delete existing processed data
rm -rf processed/

# Delete dashboard aggregated data
rm -f dashboard/commits.json dashboard/data.json dashboard/summary.json
```

### Step 2: Extract Each Repository

For each repo in `config/repos.json`:

```bash
# Clone/update repo
scripts/update-all.sh
```

This puts raw repo data in `.repo-cache/`.

### Step 3: AI Analyze Each Repository (Batched)

For each repository, process in batches of 50 commits:

**Per batch:**
1. Read next 50 unprocessed commits
2. For each commit:
   - Read the full commit message
   - Assign tags based on guidelines below
   - Calculate complexity score
3. Append to `processed/<repo-name>/commits.json`
4. Update `processed/<repo-name>/checkpoint.json`
5. Commit changes: `git commit -m "chore: process <repo> batch N/M"`

**Repeat until all commits processed.**

**Checkpoint file format:**
```json
{
  "last_processed_sha": "<sha of last commit in batch>",
  "processed_count": 50,
  "total_count": 302,
  "last_updated": "2026-01-19T15:30:00Z"
}
```

**Verification per repo:**
- [ ] Every commit has at least one tag
- [ ] Every commit has complexity 1-5
- [ ] `checkpoint.json` shows `processed_count == total_count`

### Step 4: Aggregate to Dashboard

Combine all `processed/` data into dashboard files:

```bash
node scripts/aggregate.js
```

### Step 5: Commit Changes

```bash
git add processed/ dashboard/
git commit -m "chore: hatch the chicken - full extraction"
git push
```

---

## Feed the Chicken (Incremental)

Use when: Adding new commits OR resuming interrupted processing.

### Step 1: Check Current State

For each repository, read `processed/<repo>/checkpoint.json`:
- If `processed_count < total_count`: Resume from checkpoint
- If no checkpoint: Check for new commits since last extraction

### Step 2: Extract Fresh Data

```bash
scripts/update-all.sh
```

### Step 3: Find Unprocessed Commits

For each repository:

1. Load existing `processed/<repo>/commits.json` (if exists)
2. Get set of processed commit SHAs
3. Compare against freshly extracted commits
4. Identify commits NOT in processed (these need analysis)

### Step 4: AI Analyze in Batches

Process 50 commits per batch:

**Per batch:**
1. Read next 50 unprocessed commits
2. For each commit: assign tags + complexity
3. Append to `processed/<repo>/commits.json`
4. Update `processed/<repo>/checkpoint.json`
5. Commit: `git commit -m "chore: feed <repo> batch N"`

**Stop when:**
- All commits processed, OR
- User requests to stop (work is saved at last checkpoint)

**Verification:**
- [ ] Only new commits were analyzed
- [ ] Existing commits unchanged
- [ ] Checkpoint reflects current progress

### Step 5: Re-aggregate to Dashboard

```bash
node scripts/aggregate.js
```

### Step 6: Commit Changes

```bash
git add processed/ dashboard/
git commit -m "chore: feed the chicken - X new commits"
git push
```

---

## Tagging Guidelines

Rules for consistent tag assignment.

### Tags (multiple allowed)

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

### Tag Priority Order

Order tags by importance (first = primary):

1. `security` - Always first if security-related
2. `bugfix` - Fixing broken behavior
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
- `refactor` = Restructuring code (renaming, extracting functions)
- `cleanup` = Removing dead code, deleting unused files

**refactor vs feature:**
- Behavior changes for user → `feature`
- Only internal structure changes → `refactor`

**config vs feature:**
- `config` = CI/CD, build scripts, linter rules
- `feature` = App configuration affecting user behavior

**bugfix vs feature:**
- `bugfix` = Something was broken, now fixed
- `feature` = Something didn't exist, now does

**Conventional prefix wins:**
- `feat:` → `feature`
- `fix:` → `bugfix`
- `docs:` → `docs`
- `test:` → `test`
- `chore:` → `config` or `cleanup` based on content
- `refactor:` → `refactor`
- `style:` → `style`
- `perf:` → `performance`

### Complexity Score (1-5)

Based on files changed and tag count:

| Score | Criteria |
|-------|----------|
| 1 | Single file, single tag |
| 2 | 2-3 files OR 2 tags |
| 3 | 4-6 files OR 3+ tags |
| 4 | 7-10 files AND multiple tags |
| 5 | 10+ files AND 3+ tags |

### Examples

| Commit Message | Tags | Reasoning |
|----------------|------|-----------|
| `feat: add user login page` | `feature` | Conventional prefix |
| `fix: resolve crash on startup` | `bugfix` | Conventional prefix |
| `Add dark mode toggle` | `feature` | New functionality |
| `Fix typo in README` | `docs` | Documentation change |
| `Update dependencies` | `dependency` | Package updates |
| `Refactor auth module` | `refactor` | Restructuring |
| `Remove unused helpers` | `cleanup` | Deleting dead code |
| `feat: add password hashing` | `feature`, `security` | Security feature |
| `fix: patch XSS vulnerability` | `bugfix`, `security` | Security fix |

### Edge Cases

**Vague messages** ("update code", "fix stuff"):
- Default to `cleanup` if truly ambiguous
- Never guess - use conservative tag

**Merge commits:**
- Tag as `cleanup` unless message indicates otherwise

**Initial commits:**
- Tag as `feature` (establishing codebase)

**Version bumps:**
- Tag as `config`

**Reverts:**
- Match tag of what was reverted

---

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

---

*Last updated: 2026-01-19 - Added checkpoint-based batch processing for resilience*
