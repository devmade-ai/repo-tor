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
- Aggregate all data into `dashboard/data.json`

**Requirements:** `gh` CLI installed and authenticated (`gh auth login`)

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

The dashboard will auto-load the aggregated data on GitHub Pages.

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
- **GitHub CLI (`gh`)** installed and authenticated - for API-based extraction (see setup below)
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

3. Set up GitHub CLI (required for API-based extraction):
   ```bash
   ./scripts/setup-gh.sh
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

## GitHub CLI Setup

The setup script handles installation and authentication for the GitHub CLI, which is required for API-based extraction (faster, no cloning needed).

### Quick Setup (Interactive)

```bash
./scripts/setup-gh.sh
```

This will:
1. Install `gh` CLI if not present (supports Linux, macOS, WSL)
2. Guide you through authentication (browser or token)
3. Verify API access is working

### CI/CD / Non-Interactive Setup

For automated environments, use a GitHub Personal Access Token:

```bash
# Option 1: Pass token as argument
./scripts/setup-gh.sh --token=ghp_xxxxxxxxxxxx

# Option 2: Use environment variable
GH_TOKEN=ghp_xxxxxxxxxxxx ./scripts/setup-gh.sh

# Option 3: Set GH_TOKEN in CI/CD secrets and just run
./scripts/setup-gh.sh
```

**Token requirements:**
- Create at: https://github.com/settings/tokens/new
- Scopes needed: `repo` (for private repos) or `public_repo` (public only)

### AI Sessions / .env File Setup

For AI assistants (like Claude Code) that can't use interactive authentication:

1. **Create a Personal Access Token** at https://github.com/settings/tokens/new
   - Select scopes: `repo` (for private repos) or `public_repo` (public only)
   - Copy the token (starts with `ghp_`)

2. **Create .env file** from the example:
   ```bash
   cp .env.example .env
   ```

3. **Edit .env** and set your token:
   ```
   GH_TOKEN=ghp_your_token_here
   ```

4. **Test extraction:**
   ```bash
   node scripts/extract-api.js devmade-ai/repo-tor --output=reports/
   ```

The scripts automatically load `.env` from the project root. The `.env` file is gitignored and won't be committed.

**Alternative:** Save token via setup script:
```bash
./scripts/setup-gh.sh --token=ghp_xxx --save-env
```

### Manual Installation

If the setup script doesn't work for your environment:

1. Install `gh` CLI: https://cli.github.com/
2. Authenticate:
   ```bash
   gh auth login
   ```
3. Verify:
   ```bash
   gh auth status
   ```

### Supported Platforms

| Platform | Installation Method |
|----------|---------------------|
| macOS | Homebrew (`brew install gh`) |
| Ubuntu/Debian | apt (official GitHub repo) |
| RHEL/Fedora/CentOS | dnf (official GitHub repo) |
| Arch Linux | pacman |
| Alpine Linux | apk |
| WSL | apt (same as Debian) |
| Other | Manual or conda |

### Troubleshooting

```bash
# Check if gh is installed
gh --version

# Check authentication status
gh auth status

# Re-authenticate if needed
gh auth logout && gh auth login

# Test API access
gh api user --jq '.login'
```

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

### Option 3: GitHub Pages (Automated)

This repository includes a GitHub Actions workflow for automatic deployment.

**Setup (one-time):**

1. Push the repository to GitHub
2. Go to repository **Settings** > **Pages**
3. Under "Build and deployment", set **Source** to **GitHub Actions**
4. The dashboard will deploy automatically on push to `main` or `master`

**Manual deployment:**

You can also trigger a deployment manually:
1. Go to repository **Actions** tab
2. Select "Deploy to GitHub Pages" workflow
3. Click "Run workflow"

**Access URL:** `https://{username}.github.io/{repo}/`

**Live demo:** https://devmade-ai.github.io/repo-tor/

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
