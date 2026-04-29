// Tripwire test for aggregator output shape.
//
// Requirement: catch regressions that would (a) re-introduce dashboard-unused
//   fields into the per-month commit payloads, (b) re-create the deleted
//   per-repo files (dashboard/public/repos/), or (c) drop fields the
//   dashboard does consume.
//
// Approach: source-level + output-level assertions.
//   1. Source: scripts/aggregate-processed.js declares DASHBOARD_UNUSED_FIELDS
//      and applies stripCommitForDashboard() at the data-commits emit site.
//   2. Output (only when dashboard/public/data-commits/ is on disk):
//      - data.json exists with the 4 expected top-level keys
//      - data-commits/*.json commits never contain any DASHBOARD_UNUSED_FIELDS key
//      - data-commits/*.json commits DO contain the fields the dashboard reads
//      - dashboard/public/repos/ does NOT exist
//
// Output assertions auto-skip when build hasn't run (CI may run tests before
// build); source assertions always run.
//
// When to update: if a new field is added to DASHBOARD_UNUSED_FIELDS, mirror
// it in DEAD_FIELDS below. If the dashboard starts fetching repos/*.json
// again, remove the must-not-exist assertion (and reverse the aggregator
// change that deleted the directory).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');

// Mirror of DASHBOARD_UNUSED_FIELDS in scripts/aggregate-processed.js.
// Keep these arrays in sync.
const DEAD_FIELDS = [
  'fullSha',
  'committer',
  'commitDate',
  'scope',
  'is_conventional',
  'references',
  'title',
];

// Fields the dashboard reads from every commit. Kept minimal — only fields
// that are universally present (verified 2026-04-29 via direct scan of all
// 4183 processed/*.json files). AI-analyzed fields like risk/debt/semver/
// epic/has_breaking_change are populated for newer commits but absent in
// older ones (~36% of corpus); the dashboard handles their absence
// gracefully, so this test should not require them.
const REQUIRED_FIELDS = [
  'sha',
  'timestamp',
  'subject',
  'tags',
  'complexity',
  'urgency',
  'impact',
  'repo_id',
  'stats',
];

const AGGREGATOR_SRC = join(REPO_ROOT, 'scripts/aggregate-processed.js');
const PUBLIC_DIR = join(REPO_ROOT, 'dashboard/public');
const DATA_JSON = join(PUBLIC_DIR, 'data.json');
const DATA_COMMITS_DIR = join(PUBLIC_DIR, 'data-commits');
const REPOS_DIR = join(PUBLIC_DIR, 'repos');

test('aggregator source declares DASHBOARD_UNUSED_FIELDS', () => {
  const src = readFileSync(AGGREGATOR_SRC, 'utf8');
  assert.match(src, /const DASHBOARD_UNUSED_FIELDS = \[/, 'DASHBOARD_UNUSED_FIELDS array missing');
  for (const field of DEAD_FIELDS) {
    assert.match(
      src,
      new RegExp(`'${field}'`),
      `Expected '${field}' to be listed in DASHBOARD_UNUSED_FIELDS in scripts/aggregate-processed.js`,
    );
  }
});

test('aggregator source applies stripCommitForDashboard to per-month commits', () => {
  const src = readFileSync(AGGREGATOR_SRC, 'utf8');
  assert.match(
    src,
    /commits:\s*monthCommits\.map\(stripCommitForDashboard\)/,
    'Expected per-month commits to be mapped through stripCommitForDashboard',
  );
});

test('aggregator source no longer writes per-repo files (dashboard/public/repos/)', () => {
  const src = readFileSync(AGGREGATOR_SRC, 'utf8');
  // Must not call writeJson with a path that lands inside repos/
  assert.doesNotMatch(
    src,
    /writeJson\([^)]*reposDir/,
    'Found writeJson call into reposDir — per-repo file generation should be removed',
  );
  assert.doesNotMatch(
    src,
    /['"]repos['"]/,
    "Found 'repos' string literal — per-repo output path should be removed",
  );
});

// Output-level assertions: only run when build artefacts exist.
const buildHasRun = existsSync(DATA_JSON);

test('data.json has expected top-level keys', { skip: !buildHasRun && 'build has not run; run npm run build first' }, () => {
  const data = JSON.parse(readFileSync(DATA_JSON, 'utf8'));
  for (const key of ['metadata', 'contributors', 'filterOptions', 'summary']) {
    assert.ok(data[key] !== undefined, `data.json missing top-level key: ${key}`);
  }
  assert.equal(typeof data.metadata.commitCount, 'number');
  assert.ok(data.metadata.commitCount > 0, 'data.json reports zero commits');
});

test('data-commits commits contain none of the dead fields', { skip: !buildHasRun && 'build has not run' }, () => {
  const monthFiles = readdirSync(DATA_COMMITS_DIR).filter((f) => f.endsWith('.json'));
  assert.ok(monthFiles.length > 0, 'data-commits/ has no month files');

  for (const file of monthFiles) {
    const data = JSON.parse(readFileSync(join(DATA_COMMITS_DIR, file), 'utf8'));
    for (const commit of data.commits) {
      for (const field of DEAD_FIELDS) {
        assert.ok(
          !(field in commit),
          `${file} commit ${commit.sha} still contains stripped field: ${field}`,
        );
      }
    }
  }
});

test('data-commits commits retain fields the dashboard consumes', { skip: !buildHasRun && 'build has not run' }, () => {
  const monthFiles = readdirSync(DATA_COMMITS_DIR).filter((f) => f.endsWith('.json'));
  // Sample first commit of each month to keep this fast.
  for (const file of monthFiles) {
    const data = JSON.parse(readFileSync(join(DATA_COMMITS_DIR, file), 'utf8'));
    if (data.commits.length === 0) continue;
    const sample = data.commits[0];
    for (const field of REQUIRED_FIELDS) {
      assert.ok(field in sample, `${file} sample commit ${sample.sha} missing required field: ${field}`);
    }
  }
});

test('dashboard/public/repos/ does not exist (per-repo files removed)', { skip: !buildHasRun && 'build has not run' }, () => {
  assert.ok(
    !existsSync(REPOS_DIR),
    'dashboard/public/repos/ exists — per-repo output should be removed',
  );
});
