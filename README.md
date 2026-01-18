# Git Analytics Reporting System

Extract and visualize commit history from any git repository. Generate insights on progress, contributors, and code quality.

## Features

- **Extraction Script** - Parse git history into structured JSON
- **Commit Type Detection** - Conventional commits + keyword-based fallback
- **Interactive Dashboard** - Timeline, progress, contributors, security views
- **Commit Convention Tools** - Templates and validation hooks

## Quick Start

```bash
# Extract data from a repository
node scripts/extract.js /path/to/repo --output=reports

# Open the dashboard
open dashboard/index.html
# Select the generated data.json file
```

## Setup Commit Validation (Optional)

```bash
./hooks/setup.sh
```

## Documentation

- [User Guide](docs/USER_GUIDE.md) - Full usage instructions
- [Commit Convention](docs/COMMIT_CONVENTION.md) - Commit message format guide
- [Testing Guide](docs/USER_TESTING.md) - Test scenarios

## Project Structure

```
scripts/
  extract.js       # Main extraction script
  extract.sh       # Shell wrapper
dashboard/
  index.html       # Analytics dashboard
hooks/
  commit-msg       # Validation hook
  setup.sh         # Hook installer
docs/
  USER_GUIDE.md    # Usage documentation
  COMMIT_CONVENTION.md  # Commit format guide
  ...
```

## Reports Generated

| Report | Description |
|--------|-------------|
| Timeline | Daily commit activity with type coloring |
| Progress | Monthly volume, cumulative growth, feature vs fix trends |
| Contributors | Commits and lines changed by author |
| Security | Security-tagged commits highlighted |
| Types | Commit type distribution breakdown |

## License

MIT
