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
not appear in the dashboard analytics: `dm-website` (102 commits),
`web-arch` (70), `sp-website` (55), `kl-website` (51), `sp-backend` (45),
`hf-sculpt` (12) — 335 in total, roughly 14 batches at the documented 25 per
batch.

**The API blocker is gone — do not go looking for another environment.** This
entry used to say extraction could not run from a remote sandbox because the
agent proxy scoped GitHub API access to `repo-tor` alone and every other repo
returned 403. Re-tested 2026-08-07 from a Claude Code remote session using
`GITHUB_ALL_REPO_TOKEN`: all six return **200**, and all six clone cleanly
after `add_repo`. The original note would now send you off to set up a local
checkout for a problem that no longer exists.

**Why it still needs you:** the review, not the access. `docs/DATA_OPERATIONS.md`
puts a human in the loop by design — 25 commits per batch, each batch approved
or corrected by you before it is written to `processed/`. The per-commit
tagging (complexity, urgency, impact, risk, debt, epic, semver) is judgement
work, and your approval is the quality gate rather than a formality. An
assistant can queue every batch unattended, but it cannot approve them.

**Steps:** follow the `@data` **"feed the chicken"** (incremental) flow in
`docs/DATA_OPERATIONS.md` exactly — do not improvise the workflow. In short,
per repo: `node scripts/extract-api.js devmade-ai/<repo>` → `node
scripts/pending.js` to split the unprocessed commits into batches → review and
approve each batch into `processed/<repo>/commits/` → the next `npm run build`
re-aggregates them into the dashboard automatically. Everything up to the
review writes only to `reports/` and `pending/`, both gitignored, so queueing
the batches commits nothing and is safe to do ahead of time.

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
