# User Actions

Manual steps that require user action (external dashboards, credentials, configurations, etc.).

## Pending Actions

None currently.

## Completed Actions

### Set Up GitHub Token for API Extraction (Completed 2026-02-24)

**What:** `extract-api.js` now uses curl + GitHub REST API directly (no `gh` CLI required). It auto-discovers tokens from `GH_TOKEN`, `GITHUB_TOKEN`, or `GITHUB_ALL_REPO_TOKEN` environment variables, or from a `.env` file.

**Setup:** Set any of these env vars with a GitHub personal access token:
```bash
export GH_TOKEN=ghp_your_token_here
# Or: GITHUB_TOKEN, GITHUB_ALL_REPO_TOKEN
```

Or create a `.env` file in the project root:
```
GH_TOKEN=ghp_your_token_here
```

**Test:** `node scripts/extract-api.js devmade-ai/repo-tor --output=reports/`

---

*When AI assistants encounter tasks requiring manual user intervention, detailed instructions should be added here.*
