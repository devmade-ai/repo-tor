# Admin Guide

Setup, configuration, and data extraction for the Git Analytics Reporting System.

## Prerequisites

- **Node.js** v14 or higher
- **Git** installed and accessible from command line
- Access to the repository/repositories you want to analyze

## Installation

1. Clone or download this repository:
   ```bash
   git clone <repo-url>
   cd repo-tor
   ```

2. No dependencies to install - the extraction script uses only Node.js built-ins.

## Data Extraction

### Basic Usage

```bash
# Analyze the current directory
node scripts/extract.js .

# Analyze a specific repository
node scripts/extract.js /path/to/repo

# Specify output directory
node scripts/extract.js /path/to/repo --output=reports
```

### Using the Shell Wrapper

```bash
# Make executable (one time)
chmod +x scripts/extract.sh

# Extract current repository to default location (reports/)
./scripts/extract.sh

# Extract specific repo to custom location
./scripts/extract.sh /path/to/repo ./my-reports
```

### Output Files

The extraction creates a folder per repository:

```
reports/
  {repo-name}/
    metadata.json      # Repository info (name, branches, remote URL)
    commits.json       # All commits with parsed metadata
    contributors.json  # Aggregated stats per contributor
    files.json         # File change frequency analysis
    summary.json       # Aggregated metrics and type breakdown
    data.json          # Combined file for dashboard consumption
```

| File | Purpose |
|------|---------|
| `metadata.json` | Repository identification and branch info |
| `commits.json` | Full commit history with type detection |
| `contributors.json` | Per-author commit counts and line changes |
| `files.json` | Most frequently changed files |
| `summary.json` | Totals, date ranges, type breakdown |
| `data.json` | All of the above combined (for dashboard) |

### Extracting Multiple Repositories

Run extraction for each repository - they'll be stored in separate folders:

```bash
node scripts/extract.js /path/to/repo-a --output=reports
node scripts/extract.js /path/to/repo-b --output=reports
node scripts/extract.js /path/to/repo-c --output=reports
```

Result:
```
reports/
  repo-a/
    data.json
    ...
  repo-b/
    data.json
    ...
  repo-c/
    data.json
    ...
```

## Multi-Repository Aggregation

Combine data from multiple repositories into a single view.

### Basic Aggregation

```bash
# Aggregate all repos in reports/
node scripts/aggregate.js reports/*

# Aggregate specific repos
node scripts/aggregate.js reports/repo-a reports/repo-b

# Specify output directory
node scripts/aggregate.js reports/* --output=combined
```

### Output

Aggregated data is written to the output directory:

```
aggregated/
  metadata.json      # Aggregation info, repo list
  commits.json       # All commits with repo_id
  contributors.json  # Combined contributors across repos
  files.json         # Files by repo
  summary.json       # Cross-repo metrics
  data.json          # Combined file for dashboard
```

### Author Identity Mapping

When the same person uses different emails across repositories, use an author map to normalize identities:

1. Copy the example configuration:
   ```bash
   cp config/author-map.example.json config/author-map.json
   ```

2. Edit `config/author-map.json`:
   ```json
   {
     "authors": {
       "john-doe": {
         "name": "John Doe",
         "emails": [
           "john@company.com",
           "john.doe@gmail.com",
           "jdoe@old-company.com"
         ]
       }
     }
   }
   ```

3. Run aggregation with the author map:
   ```bash
   node scripts/aggregate.js reports/* --author-map=config/author-map.json
   ```

Contributors will be grouped by their canonical identity, with:
- `author_id` - The normalized identifier (e.g., "john-doe")
- `primaryName` - The canonical display name
- `emails` - All email addresses associated with this author
- `repos` - List of repositories they contributed to

### Aggregated Metrics

The aggregated summary includes:

| Metric | Description |
|--------|-------------|
| `totalRepos` | Number of repositories combined |
| `totalCommits` | Sum of commits across all repos |
| `totalContributors` | Unique contributors (normalized if using author map) |
| `repoBreakdown` | Commit counts per repository |
| `monthlyCommits.repos` | Monthly breakdown by repository |

## Commit Type Detection

The extraction script detects commit types using two methods:

### 1. Conventional Commits (Preferred)

If your commits follow the conventional format, types are extracted directly:

```
feat(auth): add OAuth login       -> type: feat
fix(api): handle timeout errors   -> type: fix
security: patch XSS vulnerability -> type: security
```

### 2. Keyword Detection (Fallback)

For non-conventional commits, keywords in the subject are used:

| Detected Type | Keywords |
|---------------|----------|
| `feat` | add, create, implement, new, introduce |
| `fix` | fix, bug, patch, resolve, correct |
| `security` | security, vulnerability, CVE, XSS, injection |
| `docs` | doc, documentation, readme |
| `refactor` | refactor, restructure, cleanup, reorganize |
| `test` | test, spec, coverage |
| `chore` | chore, maintenance, update, upgrade |
| `perf` | performance, optimize, speed, faster |
| `style` | style, format, lint |
| `build` | build, compile, bundle |
| `ci` | ci, pipeline, workflow |
| `revert` | revert |
| `other` | (no match) |

### Improving Detection Accuracy

For best results, adopt conventional commits in your team. See [COMMIT_CONVENTION.md](./COMMIT_CONVENTION.md).

## Setting Up Commit Validation

Optional hooks to enforce conventional commit format:

### Quick Setup

```bash
./hooks/setup.sh
```

This installs:
- `commit-msg` hook - Validates format on every commit
- Commit template - Pre-filled structure when you run `git commit`

### Manual Setup

```bash
# Copy hook to git hooks directory
cp hooks/commit-msg .git/hooks/commit-msg
chmod +x .git/hooks/commit-msg

# Configure commit template
git config commit.template .gitmessage
```

### Hook Behavior

**Valid commits pass:**
```
feat: add feature       # OK
fix(scope): fix bug     # OK
docs: update readme     # OK
```

**Invalid commits are rejected:**
```
added feature          # Missing type prefix
FEAT: uppercase        # Types must be lowercase
Very long subject...   # Subject > 72 characters
```

**Bypass when needed:**
```bash
git commit --no-verify -m "emergency fix"
```

## Hosting the Dashboard

The dashboard is a static HTML file with no server requirements.

### Option 1: Local File

Simply open `dashboard/index.html` in any browser.

### Option 2: Static File Server

```bash
# Python
python -m http.server 8000 --directory dashboard

# Node.js (npx)
npx serve dashboard

# Then open http://localhost:8000
```

### Option 3: GitHub Pages

1. Push the repository to GitHub
2. Enable GitHub Pages in repository settings
3. Set source to the branch containing the dashboard
4. Access at `https://{username}.github.io/{repo}/dashboard/`

### Option 4: Any Static Host

Upload `dashboard/index.html` and your `data.json` files to:
- Netlify
- Vercel
- AWS S3
- Any web server

## Auto-Loading Data

The dashboard looks for data in this order:

1. `../reports/*/data.json` (any repo in reports folder)
2. `./data.json` (same directory as dashboard)
3. Manual file upload via the file picker

For automatic loading, place your `data.json` adjacent to the dashboard or in a `reports/` folder one level up.

## Refreshing Data

To update the dashboard with latest commits:

1. Re-run the extraction script
2. Refresh the dashboard in your browser
3. If using file upload, select the new `data.json`

Consider automating extraction with:
- Cron job
- Git post-receive hook
- CI/CD pipeline on push

## Troubleshooting

### "Not a git repository" error

Ensure you're pointing to a directory containing a `.git` folder:
```bash
ls /path/to/repo/.git  # Should exist
```

### Empty or missing data

Check that the repository has commits:
```bash
cd /path/to/repo
git log --oneline -5
```

### Dashboard shows no data

1. Check browser console for errors (F12 > Console)
2. Verify `data.json` exists and is valid JSON
3. Try manual file upload to rule out auto-load issues

### Hook not running

Verify the hook is executable:
```bash
ls -la .git/hooks/commit-msg
# Should show -rwxr-xr-x
```

If not:
```bash
chmod +x .git/hooks/commit-msg
```

---

*For understanding the dashboard UI and interpreting reports, see [USER_GUIDE.md](./USER_GUIDE.md).*
