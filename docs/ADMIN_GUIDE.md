# Admin Guide

Setup, configuration, and data extraction for the Git Analytics Reporting System.

## Quick Start: Managed Repos

The easiest way to track multiple repositories is using the config file:

### 1. Add repos to config

Edit `config/repos.json`:

```json
{
  "repos": [
    {
      "name": "my-app",
      "url": "https://github.com/myorg/my-app.git",
      "added": "2026-01-19"
    },
    {
      "name": "my-api",
      "url": "https://github.com/myorg/my-api.git",
      "added": "2026-01-19"
    }
  ]
}
```

### 2. Run the update script

```bash
./scripts/update-all.sh
```

This will:
- Fetch commit data via GitHub API (no cloning needed)
- Extract git data from each repo
- Aggregate all data into `dashboard/public/data.json`

**Requirements:** GitHub token set via `GH_TOKEN`, `GITHUB_TOKEN`, or `GITHUB_ALL_REPO_TOKEN` env var (or `.env` file)

**Alternative (clone-based):**
```bash
./scripts/update-all.sh --clone   # Clone repos instead of using API
```

### 3. Commit and push

```bash
git add reports/ dashboard/ config/repos.json
git commit -m "chore: update extracted data"
git push
```

The dashboard will auto-load the aggregated data once deployed.

### Refreshing data

Just run the script again:

```bash
./scripts/update-all.sh         # Fetch via API (default)
./scripts/update-all.sh --clone # Use clone-based extraction
./scripts/update-all.sh --fresh # Re-clone everything from scratch
```

### Using Claude Code (AI Assistant)

If you're using Claude Code, you can simply provide repo URLs and ask it to add them:

```
"Add this repo: https://github.com/myorg/my-repo.git"
```

Claude will:
1. Fetch commit data via API
2. Run extraction
3. Update `config/repos.json`
4. Re-aggregate all data
5. Commit and push

For future updates, just ask: "Update all repo data"

---

## Prerequisites

- **Node.js** v14 or higher
- **GitHub token** - set `GH_TOKEN`, `GITHUB_TOKEN`, or `GITHUB_ALL_REPO_TOKEN` env var (or `.env` file) for API-based extraction
- **curl** - for API-based extraction (pre-installed on most systems)
- **Git** (optional) - only needed if using `--clone` flag
- Access to the repository/repositories you want to analyze

## Installation

1. Clone or download this repository:
   ```bash
   git clone <repo-url>
   cd repo-tor
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Set up a GitHub token for API extraction:
   ```bash
   export GH_TOKEN=ghp_your_token_here
   # Or add to .env file: GH_TOKEN=ghp_your_token_here
   ```

## Local Development

The dashboard uses Vite for development with hot reload and PWA support:

```bash
npm run dev      # Start dev server at http://localhost:5173
npm run build    # Production build to dist/
npm run preview  # Preview production build locally
```

The dev server provides:
- Hot module replacement (instant updates)
- PWA service worker in dev mode
- Source maps for debugging

## GitHub Token Setup

API-based extraction uses `curl` with a GitHub Personal Access Token. No `gh` CLI is required.

### Setting Up a Token

1. **Create a Personal Access Token** at https://github.com/settings/tokens/new
   - Select scopes: `repo` (for private repos) or `public_repo` (public only)
   - Copy the token (starts with `ghp_`)

2. **Set the token** via one of these methods:

   **Option A: .env file (recommended for local / AI sessions)**
   ```bash
   cp .env.example .env
   # Edit .env and set: GH_TOKEN=ghp_your_token_here
   ```

   **Option B: Environment variable**
   ```bash
   export GH_TOKEN=ghp_your_token_here
   ```

   **Option C: CI/CD secrets**
   Set `GH_TOKEN` in your CI/CD environment variables.

3. **Test extraction:**
   ```bash
   node scripts/extract-api.js devmade-ai/repo-tor --output=reports/
   ```

The scripts check for tokens in this order: `GH_TOKEN`, `GITHUB_TOKEN`, `GITHUB_ALL_REPO_TOKEN`. The `.env` file is loaded automatically from the project root and is gitignored.

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

The dashboard uses Vite for bundling. For production, build first with `npm run build` — this outputs optimized files to `dist/`.

### Option 1: Local Development

```bash
npm run dev      # Dev server with hot reload at http://localhost:5173
npm run preview  # Preview production build locally
```

**Note:** Opening `dashboard/index.html` directly won't work since it uses ES modules. Use the dev server instead.

### Option 2: Preview Production Build

```bash
npm run build    # Build to dist/
npm run preview  # Serve dist/ locally for testing
```

**Note:** Opening `dashboard/index.html` directly won't work — the dashboard uses ES modules and requires a proper server. Use `npm run dev` for development or `npm run preview` to test production builds.

### Option 3: Vercel (Automated)

The repository uses Vercel for automatic deployment. A `vercel.json` config is included with SPA rewrites for client-side routing.

**Setup (one-time):**

1. Go to [vercel.com](https://vercel.com) and sign in with GitHub
2. Click "Add New Project" and import the `repo-tor` repository
3. Vercel auto-detects Vite — no build settings to configure
4. Click "Deploy"

Vercel auto-deploys on every push to `main`.

**Access URL:** `https://repo-tor.vercel.app/` (or your custom domain)

**Environment variables:** If the app uses any secrets (e.g., API keys), add them in Vercel dashboard under **Settings > Environment Variables**.

### Option 4: Any Static Host

Build and upload the `dist/` folder to any static hosting provider:

```bash
npm run build    # Creates dist/ with optimized files
```

Upload the contents of `dist/` to:
- Netlify
- AWS S3
- Any web server

**Note:** For SPA routing, configure your host to serve `index.html` for all non-asset paths (Vercel's `vercel.json` handles this automatically).

## Auto-Loading Data

The dashboard loads data in two phases:

1. **Summary file** (`./data.json`, ~126 KB) — fetched first for instant chart rendering using pre-aggregated weekly/daily/monthly data
2. **Commit files** (`./data-commits/YYYY-MM.json`) — lazy-loaded in background for drilldowns and filtered views
3. **Manual file upload** via the drag-and-drop zone (shown when no data.json is found) — supports both the new split format and legacy single-file format

The aggregation script (`scripts/aggregate-processed.js`) writes to `dashboard/public/` by default:
- `dashboard/public/data.json` — summary with pre-aggregated data (no raw commits)
- `dashboard/public/data-commits/` — per-month commit files

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
