# Git Analytics Reporting System

Extract and visualize commit history from any git repository. Generate insights on progress, contributors, and code quality.

**Live Dashboard:** https://repo-tor.vercel.app/

## Features

- **Interactive Dashboard** — React + Vite + Tailwind v4 + Chart.js
- **6 Dashboard Tabs** — Summary, Timeline, Breakdown, Health, Discover, Projects
- **Role-Based Views** — Executive, Management, Developer detail levels
- **Extraction Scripts** — Parse git history (local clone or GitHub API) into structured JSON
- **Multi-Repo Aggregation** — Combine data across repositories with author identity mapping
- **Commit Type Detection** — Conventional commits + keyword-based fallback
- **PWA Support** — Installable as offline-capable app
- **Embed Mode** — Embed individual charts via iframe with customizable colors

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev
# Opens at http://localhost:5173

# Production build
npm run build    # Output: dist/
```

To extract data from a repository:

```bash
node scripts/extract.js /path/to/repo --output=reports
```

## Documentation

- [User Guide](docs/USER_GUIDE.md) — Dashboard UI and metric interpretation
- [Admin Guide](docs/ADMIN_GUIDE.md) — Setup, extraction, and configuration
- [Commit Convention](docs/COMMIT_CONVENTION.md) — Commit message format guide
- [Testing Guide](docs/USER_TESTING.md) — Test scenarios
- [Embed Reference](docs/EMBED_REFERENCE.md) — Embeddable chart IDs and usage

## Project Structure

```
dashboard/
  index.html                    # Minimal HTML (root div, debug pill, PWA capture)
  styles.css                    # Tailwind v4 + custom CSS
  js/main.jsx                   # React entry point with Chart.js registration
  js/App.jsx                    # Main app (data loading, tab routing, layout)
  js/AppContext.jsx              # React Context + useReducer state management
  js/state.js                   # Constants (TAB_MAPPING, VIEW_LEVELS, THRESHOLDS)
  js/utils.js                   # Pure utility functions
  js/charts.js                  # Chart aggregation helpers
  js/chartColors.js              # Centralized chart color system (embed overrides)
  js/pwa.js                     # PWA install/update logic
  js/components/                # Shared components (Header, TabBar, DropZone, etc.)
  js/sections/                  # Section components (Summary, Timeline, Timing, etc.)
  js/hooks/                     # Custom hooks (useFocusTrap, useHealthData)
  public/                       # Static assets (data.json, projects.json, icons)
scripts/
  extract.js                    # Git log extraction (local clone)
  extract-api.js                # GitHub API extraction (no cloning needed)
  aggregate-processed.js        # Aggregate processed data into dashboard JSON
  lib/                          # Shared script utilities
hooks/
  commit-msg                    # Conventional commit validation hook
  setup.sh                      # Hook installer
vite.config.js                  # Vite + React + Tailwind v4 + PWA plugin config
docs/                           # All documentation
```

## Dashboard Tabs

| Tab | Label | Purpose |
|-----|-------|---------|
| Summary | Summary | Executive summary, quick stats, key highlights |
| Timeline | Timeline | Activity timeline, heatmap, timing patterns |
| Breakdown | Breakdown | Progress trends, tags, contributors, epics |
| Health | Health | Security, urgency, risk, tech debt, work patterns |
| Discover | Discover | Explorable metrics, comparisons, file activity |
| Projects | Projects | Project directory with live site and repo links |

**View Levels:** Switch between Executive, Management, and Developer views in Settings for different data granularity. Non-developer views include interpretation guidance.

## License

MIT
