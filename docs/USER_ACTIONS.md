# User Actions

Manual steps that require user action (external dashboards, credentials, configurations, etc.).

## Pending Actions

### Verify Google Analytics traffic on the live dashboard

**What:** GA4 property `G-8CLE4P0DQK` is now wired into `dashboard/index.html` (added on the `claude/add-google-analytics-9B0aw` branch). Once merged and deployed to Vercel, confirm pageviews are arriving.

**Steps:**
1. Open the live dashboard: <https://repo-tor.vercel.app/>
2. Sign in to <https://analytics.google.com/> with the Google account that owns property `G-8CLE4P0DQK`
3. Open **Reports → Realtime** — you should see at least one active user (yourself) within ~30 seconds
4. (Optional) Add a filter in **Admin → Data Settings → Data Filters** to exclude `localhost` traffic from the production stream so dev sessions don't pollute metrics
5. (Optional) Confirm that `?embed=` iframe loads on consuming sites also report — they currently do, since the GA snippet has no embed-mode skip

If no traffic appears: check browser DevTools → Network for a request to `https://www.googletagmanager.com/gtag/js?id=G-8CLE4P0DQK` and a follow-up `collect?...` POST to `google-analytics.com`. Ad blockers will suppress both.

### Extract commit data for 6 newly-registered repos

**What:** On 2026-07-23 six org repositories were added to
`config/repos.json` but have **no `processed/` commit data yet**, so they do
not appear in the dashboard analytics: `dm-website`, `hf-sculpt`,
`kl-website`, `sp-backend`, `sp-website`, `web-arch`. Extraction could not
run in the session that registered them — the remote sandbox's agent proxy
scopes GitHub API access to `repo-tor` only (every other repo returns 403),
so `extract-api.js` cannot reach them from there.

**Why it needs you:** run the extraction from an environment with GitHub API
access to the `devmade-ai` org (a local checkout with a token, or a session
whose network policy allows the org).

**Steps:** follow the `@data` **"feed the chicken"** (incremental) flow in
`docs/DATA_OPERATIONS.md` exactly — do not improvise the workflow. In short,
per repo: `node scripts/extract-api.js devmade-ai/<repo>` → AI-analyse the
new commits into `processed/<repo>/commits/` → the next `npm run build`
re-aggregates them into the dashboard automatically. The six repos are all
private; confirm the token has access to each.

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
