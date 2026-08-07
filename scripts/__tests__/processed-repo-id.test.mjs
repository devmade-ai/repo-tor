// Tripwire test for repo identity across a rename.
//
// Requirement: a tracked repo's name lives in four places — config/repos.json,
//   the processed/<name>/ directory, the "repo_id" inside every commit record
//   under it, and prose in docs/. A rename that updates only the first two
//   leaves the records keyed by the OLD name, and nothing notices.
//
// Why this needs a test (2026-08-07, see docs/AI_MISTAKES.md): PR #124 renamed
//   processed/glow-props to processed/gp-props and updated config/repos.json,
//   correctly reasoning that the directory is the join key aggregate-processed.js
//   resolves. All 236 records inside kept "repo_id": "glow-props". But repo_id is
//   the key everything DOWNSTREAM groups by — repoBreakdown and
//   monthlyCommits[month].repos in aggregate.js, the buckets in aggregateCalcs.js
//   and aggregateTimeWindows.js, the per-repo series in useTimelineCharts.js. Old
//   records said glow-props, new ones would say gp-props, and the dashboard would
//   have shown one repo as two: a frozen glow-props holding all the history beside
//   a gp-props starting at zero.
//
//   It could not self-heal. aggregate-processed.js fills repo_id only when it is
//   MISSING, so a wrong-but-present value survives every run.
//
//   The bug is only expressible DURING a rename — absent one, a record's key and
//   its directory cannot disagree — which is exactly when nobody is looking for
//   it. Renames are not rare here: config/repos.json records five
//   (canva-grid<-social-ad-creator, intxt<-synctone, fh-fuelhunt<-few-lap,
//   fl-farlume<-budgy-ting, gp-props<-glow-props).
//
// Approach: two assertions over the committed corpus, no build required.
//   1. Every commit record's repo_id, WHEN PRESENT, equals its directory name.
//   2. Every processed/<dir> is named in config/repos.json — catches the inverse
//      slip, where records and directory agree but the config was never updated.
//
// Deliberately NOT asserted: that every repos.json entry has a processed/
//   directory. Six registered repos legitimately have none — extraction is
//   pending on batch review, see docs/USER_ACTIONS.md — so requiring it would
//   fail on a known, tracked, intentional state.
//
// A MISSING repo_id is allowed: aggregate-processed.js backfills it from the
//   directory name, and 25 model-pear records rely on that path. Absent is
//   handled; wrong is not, which is why only wrong is an error here.
//
// When to update: nothing to update on a rename — that is the point. Move the
//   directory, update config/repos.json, rewrite repo_id in the records, and
//   this test goes green on its own. If a repo is ever tracked without a
//   repos.json entry, assertion 2 is the one to revisit.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');
const PROCESSED = join(REPO_ROOT, 'processed');
const REPOS_JSON = join(REPO_ROOT, 'config', 'repos.json');

function processedDirs() {
  if (!existsSync(PROCESSED)) return [];
  return readdirSync(PROCESSED).filter((d) =>
    statSync(join(PROCESSED, d)).isDirectory(),
  );
}

test('every commit record is keyed by its own directory name', () => {
  const dirs = processedDirs();
  assert.ok(dirs.length > 0, 'no processed/ directories found — corpus missing?');

  // Collect every mismatch before failing, so a rename that missed N repos
  // reports all N rather than one per test run.
  const mismatches = [];
  for (const dir of dirs) {
    const commitsDir = join(PROCESSED, dir, 'commits');
    if (!existsSync(commitsDir)) continue;

    for (const file of readdirSync(commitsDir)) {
      if (!file.endsWith('.json')) continue;
      const path = join(commitsDir, file);
      const commit = JSON.parse(readFileSync(path, 'utf8'));
      // Absent is fine (backfilled from the directory name); wrong is not.
      if (commit.repo_id !== undefined && commit.repo_id !== dir) {
        mismatches.push(`processed/${dir}/commits/${file}: "${commit.repo_id}"`);
      }
    }
  }

  assert.deepEqual(
    mismatches,
    [],
    `${mismatches.length} commit record(s) carry a repo_id that disagrees with ` +
      `their directory. A rename moved the directory but not the records — the ` +
      `dashboard will group these as a separate, stale repo. Rewrite repo_id to ` +
      `match the directory; leave any mention in subject/body alone, that is the ` +
      `commit message as authored. First few:\n  ${mismatches.slice(0, 5).join('\n  ')}`,
  );
});

test('every processed directory is a repo named in config/repos.json', () => {
  const configured = new Set(
    JSON.parse(readFileSync(REPOS_JSON, 'utf8')).repos.map((r) => r.name),
  );
  const unknown = processedDirs().filter((d) => !configured.has(d));

  assert.deepEqual(
    unknown,
    [],
    `processed/ holds ${unknown.length} directory/directories with no ` +
      `config/repos.json entry: ${unknown.join(', ')}. Either the repo was ` +
      `renamed in the config but its directory was not moved, or the directory ` +
      `is orphaned and should be removed.`,
  );
});
