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

### Step 3: Analyze Each Commit

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

### Step 4: Update Data Files

Write results to:

- `reports/{repo-id}/commits.json` - Per-repo commit data
- `dashboard/data.json` - Aggregated data for dashboard

### Step 5: Report Summary

Provide user with:

- Number of commits processed per repo
- New commits since last extraction (if applicable)
- Any errors or issues encountered

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

*Last updated: 2026-01-19 - Updated for @data persona*
