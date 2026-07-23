# Session Notes

Compact context snapshot for AI continuity. Updated 2026-07-23 after
propagating three GitHub repository renames and syncing the tracked-repo
registry with the live org.
Detailed history lives in the git log (`git log --oneline` / `git log -p`).

## Current State

**Branch:** `claude/repo-name-updates-raci2y` (not merged; no PR).

**Repo-registry sync (follow-up to the renames below):** A completeness
audit (`config/repos.json` ↔ `processed/` ↔ `mcp list_repos`) found the
tracked set now matches the org's 21 accessible repos exactly. Changes made:
- **Third rename:** `budgy-ting` → `fl-farlume` (252 commits) — same full
  method as the two renames below (dir + `repo_id` + config note). Found
  because `budgy-ting` had vanished from the org's accessible list; user
  confirmed the rename.
- **6 new repos registered** in `config/repos.json`: `dm-website`,
  `hf-sculpt`, `kl-website`, `sp-backend`, `sp-website`, `web-arch` (all
  private). They have **no `processed/` data yet** — extraction is blocked
  in this sandbox (agent proxy scopes GitHub API to `repo-tor`; others 403).
  Tracked as a pending action in `docs/USER_ACTIONS.md` ("feed the chicken"
  run needed from an environment with org API access).
- **Projects tab removed** — replaced with a "View all projects" link in the
  hamburger menu pointing to the glow-props showcase
  (`https://devmade-ai.github.io/glow-props/`, verified live via WebFetch —
  lists all 12 projects). Deleted `dashboard/js/sections/Projects.jsx` +
  `dashboard/public/projects.json`; dropped the tab from TabBar (6→5), the
  App route, `PAGE_LIMITS.projects`, and the two projects.json PWA-precache
  entries in vite.config.js; added a menu item + grid icon in Header.jsx;
  updated QuickGuide. Supersedes the earlier "Projects tab missing
  four-ems/sun-sea-o" gap. Verified: `vite build` clean (24 precache
  entries, down from 26), `npm test` 106/106 pass.

**This session:** Two repos were renamed on GitHub — `synctone` → `intxt`
and `few-lap` → `fh-fuelhunt`. Only the GitHub repo slugs changed; nothing
else (same project, same history, same Vercel deployment domains). Followed
the existing `social-ad-creator` → `canva-grid` rename precedent: migrate
everything keyed off the slug so the dashboard shows one continuous history
under the new name, plus a `"Renamed from …"` note in config.

**Why a full rename (not just URL pointers):** the dashboard's repo
identity comes from the `repo_id` field inside each `processed/<repo>/commits/*.json`
(aggregate-processed.js derives it from `repo_id`, dir name is only the
fallback), and `extract-api.js` names both the output dir and `repo_id` from
the GitHub slug (`repoOutputDir = outputDir/repo`, `repoId = toKebabCase(repo)`).
So renaming the dirs + `repo_id` + config keeps past history and future
"feed the chicken" extraction pointed at the same continuous project.

**What changed:**

1. **Data** — `git mv processed/synctone processed/intxt` (503 commit
   files) and `processed/few-lap processed/fh-fuelhunt` (363 files).
   Rewrote the internal `"repo_id"` field only (`"repo_id": "synctone"` →
   `"intxt"`, `"few-lap"` → `"fh-fuelhunt"`) via exact-string sed — commit
   `subject`/`body`/`files` audit text was left intact, so 32 intxt + 4
   fh-fuelhunt files still legitimately mention the old names in their
   historical commit messages. `manifest.json` holds only SHA lists (no
   repo name), so it moved cleanly with the dir.
2. **config/repos.json** — `name` + `url` updated to the new slugs; `notes`
   now reads `"Private repository. Renamed from <old> on 2026-07-23"`.
3. **dashboard/public/projects.json** — `name` + `repoUrl` updated. The
   Vercel `liveUrl`s (`synctone.vercel.app`, `few-lap.vercel.app`) were
   left as-is: a GitHub rename doesn't move the deployment domain, and the
   brief said only the GitHub names changed. **If the Vercel projects were
   also renamed, update these two `liveUrl`s.**
4. **Prose** — ~30 `// Pattern from: synctone/few-lap …` attribution
   comments across `dashboard/js/pwa.js`, `pwaConstants.js`,
   `pwaInstructions.js`, `dashboard/index.html`, `vite.config.js`,
   `scripts/write-build-version.mjs`, plus CLAUDE.md's Approach-B example
   list. Comment text only — no runtime code touched.

**Deliberately not touched:**

- `docs/AI_MISTAKES.md` — the `few-lap` mentions there are a dated record
  of a past event; rewriting a historical log would falsify it.
- Commit `subject`/`body` audit text (see item 1).
- `dashboard/repos/*.json` — a stale, unused directory (dead since the
  2026-04-29 per-repo-files removal; nothing in `dashboard/js/` fetches it,
  the aggregator no longer writes it, and it held an orphaned
  `social-ad-creator.json` from the previous rename). Rather than rename
  its `synctone.json` / `few-lap.json` snapshots, the whole dir was
  **deleted** in a follow-up commit (14 files) after confirming no
  consumer — it was never served (not under `public/`) and no source
  references it.

**Verification:** `node scripts/aggregate-processed.js` → 15 repos, `intxt`
503 + `fh-fuelhunt` 363 commits, old names absent from `repoCommitCounts`,
zero malformed commits. `npm test` → 92 pass / 14 build-skipped / 1 fail.
The single failure (`daisyui-surfaces.test.mjs` "Repo color invariant") is
pre-existing and environmental — `node_modules/daisyui/theme/lofi/object.js`
isn't installed in this container; it references zero renamed tokens and is
unrelated to this change. No browser run (sandbox has no browser).

## Open Items

- **Vercel `liveUrl` assumption** — left pointing at the old
  `*.vercel.app` domains; revisit if the deployment projects were renamed
  too.

## Files Touched This Session

- `processed/intxt/` (renamed from `processed/synctone/`, 503 files) +
  `processed/fh-fuelhunt/` (renamed from `processed/few-lap/`, 363 files) —
  dir rename + `repo_id` field rewrite
- `config/repos.json`, `dashboard/public/projects.json` — name/URL/notes
- `dashboard/js/pwa.js`, `dashboard/js/pwaConstants.js`,
  `dashboard/js/pwaInstructions.js`, `dashboard/index.html`,
  `vite.config.js`, `scripts/write-build-version.mjs` — comment attributions
- `CLAUDE.md`, `docs/SESSION_NOTES.md` (this file), `docs/TODO.md`
- `dashboard/repos/` — **deleted** (14 stale, unused JSON files) in the
  follow-up cleanup commit
