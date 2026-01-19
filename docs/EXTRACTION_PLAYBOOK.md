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

Human-in-the-loop review ensures quality tagging.

### Batch Size
- Process **10 commits per batch**
- AI presents analysis, **user reviews and approves**
- After approval: write to `processed/`, update checkpoint
- If session ends, work is saved at last approved batch

### Review Format

For each batch, AI presents commits like this:

```
[1/10] abc123
Subject: Fix button placement and performance issues
Body:
- Move "Update Visualization" button below the image
- Fix page freeze on visualization update by removing scrollIntoView
- Optimize DOM manipulation using classList.toggle
- Update help documentation to reflect UI changes

Tags: refactor, bugfix, performance, docs
Complexity: 4
---
[2/10] def456
...
```

User responds:
- **"approve"** - Save all 10 and continue to next batch
- **"#3 should be feature not refactor"** - AI corrects and re-presents
- **"stop"** - Save progress and end session

### Benefits
- **Accurate**: Human review catches AI mistakes
- **Multi-tag**: AI reads full message, assigns ALL relevant tags
- **Resilient**: Progress saved after each approved batch
- **Incremental**: Can stop and continue anytime

## File Structure

```
reports/                      # Raw extracted data (ephemeral)
  <repo-name>/
    commits.json              # All commits (raw, no AI tags)
    batches/                  # Split into files of 10 for AI review
      batch-001.json          # Commits 1-10
      batch-002.json          # Commits 11-20
      ...
    metadata.json
    data.json

processed/                    # AI-analyzed data (committed to git)
  <repo-name>/
    batches/                  # Approved batches copied here
      batch-001.json          # Approved with AI tags
      batch-002.json
      ...
    metadata.json

config/
  repos.json                  # Tracked repositories
  author-map.json             # Author identity mapping

dashboard/
  data.json                   # Aggregated from processed/
```

**Progress tracking:**
- Compare `reports/<repo>/batches/` vs `processed/<repo>/batches/`
- If `batch-005.json` exists in processed/, it's done
- Next batch = first batch file NOT in processed/

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

### Step 3: AI Analyze Each Repository (Human Review)

For each repository, process batch files one at a time:

**Per batch file:**
1. Find next batch: first `batch-NNN.json` in `reports/<repo>/batches/` NOT in `processed/<repo>/batches/`
2. Read the batch file (10 commits with subject + body)
3. AI analyzes each commit and proposes:
   - Tags (multiple allowed, based on full message content)
   - Complexity score (1-5)
4. Present to user in review format (see above)
5. User approves or requests corrections
6. On approval: copy batch file to `processed/<repo>/batches/batch-NNN.json` (with AI tags added)
7. Commit: `git commit -m "chore: process <repo> batch NNN"`

**User commands:**
- `approve` - Save batch to processed/, continue to next
- `#N tag1, tag2` - Correct tags for commit N, re-present
- `stop` - End session (progress is saved)

**Repeat until all batch files processed or user stops.**

**Progress check:**
```bash
# See what's done vs pending
ls reports/<repo>/batches/   # All batches
ls processed/<repo>/batches/ # Completed batches
```

**Verification per repo:**
- [ ] Every commit has at least one tag
- [ ] Every commit has complexity 1-5
- [ ] Tags reflect FULL message content (subject + body)
- [ ] Same number of batch files in processed/ as reports/

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

### Step 4: AI Analyze with Human Review

Process batch files one at a time:

**Per batch file:**
1. Find next unprocessed batch (in reports/ but not in processed/)
2. AI proposes tags + complexity for each commit
3. Present to user for review
4. User approves or corrects
5. Save approved batch to `processed/<repo>/batches/`
6. Commit changes

**Stop when:**
- All batch files processed, OR
- User says "stop" (progress saved at last approved batch)

**Verification:**
- [ ] Only new batches were analyzed
- [ ] Existing batches unchanged
- [ ] Tags reflect full message content
- [ ] Batch counts match between reports/ and processed/

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

*Last updated: 2026-01-19 - Batch files for tracking (reports/batches/ → processed/batches/)*
