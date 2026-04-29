# Session Notes

Compact context snapshot for AI continuity. Updated 2026-04-29 after
moving aggregator output from tracked artefact to gitignored build step.
Detailed history lives in the git log (`git log --oneline` / `git log -p`).

## Current State

**Branch:** `claude/align-components-27ypY`.

**Recent work (oldest first):**

1. **Full "feed the chicken" run across all 13 active repos** — drained
   every repo's pending queue through the standard preamble→merge-
   analysis pipeline. Final tally: 4,183 commits across 15 tracked
   repos (13 active + coin-zapp + plant-fur frozen). 1,332 new commit
   JSONs landed under `processed/`.
2. **Vocabulary update + historical retag** — added `data-pipeline` tag
   (analytics/ETL pipeline runs, regenerated data artefacts) to
   `config/batch-preamble.md` under a renamed "Data" group. Retagged
   135 historical commits via heuristic; 0 false positives.
3. **Aggregator output → build artefact** (this session). The
   `dashboard/public/{data.json,data-commits/,repos/}` files were
   tracked, pretty-printed, regenerated wholesale every aggregation
   run. Result: every feed-chicken commit produced ~138k-line diffs
   for ~1% real value change. Fix: gitignored those paths, wired
   `node scripts/aggregate-processed.js` into `dev` and `build`
   scripts in `package.json`, same pattern as `version.json`.
4. **Aggregator output slimmed and dead code removed** (this session,
   wrap-pass follow-up). Greppable absence in `dashboard/js/` confirmed
   7 fields were never read: `fullSha`, `committer`, `commitDate`,
   `scope`, `is_conventional`, `references`, `title`. Stripped at the
   aggregator's dashboard-output boundary. Also removed
   `dashboard/public/repos/` generation entirely: dashboard never
   fetched those files, comment in aggregator confirmed they were
   "backward compat" leftover from before the data-commits/ migration.
   CLAUDE.md prohibits backcompat shims. Net effect: PWA precache went
   from 41 → 26 entries (15 per-repo files dropped); per-month JSON
   payloads ~12% smaller.
5. **Dead fields removed at source, not just at output** (this session,
   surface-pass follow-up). Initial fix in step 4 stripped only at the
   aggregator boundary, leaving `processed/` files carrying the 7 dead
   fields as 1.2 MB of inert pass-through. Source fix:
     - `extract.js`, `extract-api.js`, `fix-malformed.js` no longer
       emit those 7 fields. `extractReferences` import removed (dead).
       `extract.js` git format trimmed (originally 10 fields → 6) —
       committer name/email/date no longer extracted at all; `%H` full
       hash also dropped after refactoring `statsByFullSha` to
       `statsByShortSha` (both `git log` invocations use `%h`, indexed
       directly without a side map).
     - One-time clean: 4034 of 4183 existing `processed/*.json` files
       had at least one dead field; all stripped. 26,058 fields removed.
       JSON formatting preserved (matched original Node output via
       `ensure_ascii=False`); diff is 39,336 deletions / 185 insertions.
     - Strip script preserved as `scripts/strip-dead-fields.mjs`.
       Idempotent. Imports `DASHBOARD_UNUSED_FIELDS` from the aggregator
       (single source of truth — main() only runs when invoked as CLI,
       guarded by `process.argv[1] === __filename`).
     - Tripwire: `scripts/__tests__/aggregate-output.test.mjs`
       (8 tests) catches re-introduction of any dead field, deletion
       of stripCommitForDashboard, resurrection of `dashboard/public/
       repos/` output, missing required fields, AND any new field
       appearing in commits that's not in the explicit
       `KNOWN_COMMIT_FIELDS` allowlist (proactive drift detection).
6. **Legacy schema normalized + utils.js fallbacks removed** (this
   session, approach-pass discovery). 44 of 4183 commits used a
   pre-migration shape: `message` (not `subject`+`body`),
   `files_changed`/`lines_added`/`lines_deleted` (not nested `stats`).
   Dashboard handled them via fallback chains in `utils.js` —
   backcompat shims that CLAUDE.md prohibits. Fix:
     - 44 commits normalized to the canonical shape via inline
       migration. `message` split into `subject`/`body`. snake_case
       stats moved into `stats`. Missing fields filled with null
       (AI-analyzed) or best-effort defaults (`files: []`,
       `author: {name: <local-part>, email: author_id}`).
     - `getFilesChanged`/`getCommitSubject`/`getAdditions`/
       `getDeletions` simplified from 3-step fallback chains to
       single-line property reads.
     - `KNOWN_COMMIT_FIELDS` allowlist tightened (legacy field names
       no longer permitted; drift detector will fail if they reappear).
7. **Build-output tripwire** (this session, approach-pass shortcut).
   Container has no browser; Playwright Chromium download blocked;
   JSDOM + Vite-built React 19 + Chart.js bundle is non-trivial to
   set up and Chart.js needs canvas. Best honest proxy:
   `scripts/__tests__/build-output.test.mjs` (6 tests) verifies
   `dist/` contains required files (HTML hooks, manifest keys,
   data.json, sw.js routes, JS bundle), bundle still fetches the
   canonical paths, and bundle no longer contains the legacy
   identifiers (`files_changed`, etc.). Real browser coverage is a
   CI concern; documented in TODO under "Browser test coverage".
8. **Cold-pass cleanup** (this session, fresh-eyes branch audit).
   Three findings, all fixed:
     - `scripts/lib/commit-parsing.js` had two exports (`parseCommitMessage`,
       `extractReferences`) that lost their last callers in step 5.
       Module reduced from 62 to 23 lines, exporting only
       `extractBreakingChange`. The breaking-change `!` marker
       detection (previously routed through `parseCommitMessage`)
       was folded into `extractBreakingChange` directly. Callers in
       `extract.js` and `extract-api.js` simplified accordingly.
     - `docs/ADMIN_GUIDE.md` "Multi-Repository Aggregation" section
       referenced a non-existent `scripts/aggregate.js` taking
       `reports/*` CLI args. Rewrote to reflect the actual flow:
       aggregator runs at build time, reads `processed/`, writes
       `dashboard/public/{data.json,data-commits/}`. Author-map
       guidance updated similarly.
     - `docs/TESTING_GUIDE.md` claimed "one automated layer" — now
       lists all 5 test files (88 tests / ~290ms), with auto-skip
       behaviour for `dist/`-dependent assertions explained.

**Why the build-artefact change matters:**

Branch line stats before the change: 197,705 insertions / 14,515
deletions across 1,360 files. ~70% of that is regenerated dashboard
JSON, not actual content change. After the change every future feed-
chicken commit drops ~138k lines of noise; only `processed/` (~45
lines per genuinely new commit) shows up in diffs.

Vercel deploy unaffected: `vercel.json` runs `npm run build`, which now
runs the aggregator before Vite. `processed/` is tracked, so the
aggregator has its input on a fresh clone or fresh deploy. Build time
grows from ~6.6s to ~9.5s (aggregator: 2.9s).

PWA precache count unchanged (41 entries / 870.26 KiB). Output bytes
identical to before — only the tracking changed.

## Open Items

- None blocking. SESSION_NOTES previously stale (last updated 2026-04-16,
  on a different branch); refreshed in this commit.

## Files Touched This Session

- `package.json` — added aggregator to `dev` and `build` scripts
- `.gitignore` — added `dashboard/public/data.json`,
  `dashboard/public/data-commits/`, `dashboard/public/repos/`
- `CLAUDE.md` — updated `aggregate-processed.js` description to note
  build-step integration + gitignored output
- `docs/DATA_OPERATIONS.md` — Step 5 of Hatch + Step 4 of Feed marked
  optional (build does it); `git add` instructions corrected to drop
  `dashboard/`; stale `aggregate.js` reference fixed to
  `aggregate-processed.js`
- `dashboard/public/data.json`, `dashboard/public/data-commits/*`,
  `dashboard/public/repos/*` — `git rm --cached` (still on disk,
  regenerated by build)
