# User Guide

Git Analytics Reporting System - Extract and visualize commit history from any git repository.

## Getting Started

### Prerequisites
- Node.js (v14 or higher)
- Git repository to analyze

### Quick Start

1. **Extract data from a repository:**
   ```bash
   # From the repo-tor directory, analyze the current repo
   node scripts/extract.js . --output=reports

   # Or analyze any other repository
   node scripts/extract.js /path/to/other/repo --output=reports
   ```

2. **View the dashboard:**
   - Open `dashboard/index.html` in a web browser
   - The dashboard will auto-load data from `reports/` if available
   - Or use the file picker to load any `data.json` file

### Using the Shell Wrapper

```bash
# Make script executable (one time)
chmod +x scripts/extract.sh

# Extract current repository
./scripts/extract.sh

# Extract specific repository to custom location
./scripts/extract.sh /path/to/repo ./my-reports
```

## Features

### Data Extraction

The extraction script parses git history and generates:

| File | Description |
|------|-------------|
| `metadata.json` | Repository info (name, branches, URL) |
| `commits.json` | All commits with parsed metadata |
| `contributors.json` | Aggregated contributor statistics |
| `files.json` | File change frequency analysis |
| `summary.json` | Aggregated metrics and breakdown |
| `data.json` | Combined file for dashboard |

### Commit Type Detection

The system uses two detection methods:

1. **Conventional Commits** (if used):
   ```
   feat(auth): add OAuth login
   fix(api): handle timeout errors
   security: patch XSS vulnerability
   ```

2. **Keyword Detection** (fallback):
   - `feat`: add, create, implement, new
   - `fix`: fix, bug, patch, resolve
   - `security`: security, vulnerability, CVE, XSS
   - `docs`: doc, documentation, readme
   - `refactor`: refactor, restructure, cleanup
   - `test`: test, spec, coverage
   - `chore`: chore, maintenance, update, upgrade
   - `perf`: performance, optimize, speed
   - And more...

### Dashboard Views

| Tab | Description |
|-----|-------------|
| **Timeline** | Daily commit activity chart + recent commits list |
| **Progress** | Monthly volume, cumulative growth, feature vs bug trends |
| **Contributors** | Commits and lines changed by author |
| **Security** | Security-tagged commits highlighted |
| **By Type** | Commit type distribution (pie chart + breakdown) |

## Output Structure

```
reports/
  {repo-name}/
    metadata.json
    commits.json
    contributors.json
    files.json
    summary.json
    data.json      # Combined data for dashboard
```

## FAQ

### How do I analyze multiple repositories?

Run the extraction script for each repo - they'll be stored in separate folders:
```bash
node scripts/extract.js /path/to/repo-a --output=reports
node scripts/extract.js /path/to/repo-b --output=reports
```

### How do I improve type detection accuracy?

Use conventional commit format in your commit messages:
```
type(scope): subject

body

tags: security, breaking
refs: #123
```

### Can I use this with private repositories?

Yes - the extraction runs locally using git, so any repository you have access to can be analyzed.

### How do I host the dashboard?

The dashboard is a static HTML file. Options:
- Open directly in browser (file://)
- Serve with any static file server
- Host on GitHub Pages with the data.json files

## Commit Convention

For best results with type detection, use conventional commits. See [COMMIT_CONVENTION.md](./COMMIT_CONVENTION.md) for the full guide.

### Quick Setup

```bash
# Install git hooks for commit validation
./hooks/setup.sh
```

This will:
1. Install the commit-msg validation hook
2. Configure the commit message template

### Commit Format

```
type(scope): subject

body

tags: security, breaking
refs: #123
```

**Types:** `feat`, `fix`, `security`, `docs`, `style`, `refactor`, `perf`, `test`, `build`, `ci`, `chore`, `revert`

---
