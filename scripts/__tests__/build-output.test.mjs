// Built-output integrity tripwire.
//
// Requirement: catch regressions where the build produces a bundle that's
//   syntactically valid (Vite would reject otherwise) but missing or
//   broken in ways static analysis of source can't detect:
//   - dist/ missing required files (HTML, JS bundle, manifest)
//   - HTML stripped of critical hooks (root div, script src, theme attrs)
//   - JS bundle missing references to critical runtime code paths
//   - JS bundle still containing identifiers we deliberately stripped
//
// This is NOT a real browser test — Chart.js needs canvas, JSDOM has API
// drift, Playwright can't download Chromium in some sandboxes (commit
// af0f02d, deleted 2026-04-15, documented this). Real browser coverage
// has to be a CI-level concern. The tripwires below are the cheapest
// useful proxy.
//
// Skips when dist/ is absent (CI may run tests before build).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');
const DIST = join(REPO_ROOT, 'dist');

const buildHasRun = existsSync(join(DIST, 'index.html'));
const SKIP_REASON = 'dist/ absent — run npm run build first';

function findBundle() {
  const assetsDir = join(DIST, 'assets');
  if (!existsSync(assetsDir)) return null;
  return readdirSync(assetsDir).find((f) => f.startsWith('index-') && f.endsWith('.js'));
}

test('dist/index.html contains required hooks', { skip: !buildHasRun && SKIP_REASON }, () => {
  const html = readFileSync(join(DIST, 'index.html'), 'utf8');
  assert.match(html, /<div id="root">/, 'root div missing');
  assert.match(html, /<script[^>]+src="\/assets\/index-[A-Za-z0-9_-]+\.js"/, 'main script tag missing');
  assert.match(html, /<link[^>]+rel="manifest"/, 'manifest link missing');
  assert.match(html, /data-theme="/, 'data-theme attribute missing — theme flash prevention broken');
  assert.match(html, /<meta name="theme-color"/, 'theme-color meta missing — PWA chrome broken');
});

test('dist/manifest.webmanifest is valid JSON with required keys', { skip: !buildHasRun && SKIP_REASON }, () => {
  const manifest = JSON.parse(readFileSync(join(DIST, 'manifest.webmanifest'), 'utf8'));
  for (const k of ['name', 'short_name', 'start_url', 'display', 'icons']) {
    assert.ok(manifest[k] !== undefined, `manifest missing key: ${k}`);
  }
  assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'manifest has no icons');
});

test('dist/data.json + data-commits/ exist (aggregator ran)', { skip: !buildHasRun && SKIP_REASON }, () => {
  assert.ok(existsSync(join(DIST, 'data.json')), 'data.json missing — aggregator did not run');
  assert.ok(existsSync(join(DIST, 'data-commits')), 'data-commits/ missing — aggregator did not run');
  const monthFiles = readdirSync(join(DIST, 'data-commits')).filter((f) => f.endsWith('.json'));
  assert.ok(monthFiles.length > 0, 'data-commits/ has no month files');
});

test('dist/sw.js exists and references the right precache routes', { skip: !buildHasRun && SKIP_REASON }, () => {
  assert.ok(existsSync(join(DIST, 'sw.js')), 'sw.js missing — PWA generation broken');
  const sw = readFileSync(join(DIST, 'sw.js'), 'utf8');
  assert.match(sw, /\/data\\?\.json/, 'sw.js does not register a route for data.json');
  assert.match(sw, /data-commits/, 'sw.js does not reference data-commits/');
});

test('main JS bundle does not contain stripped dead-field identifiers', { skip: !buildHasRun && SKIP_REASON }, () => {
  const bundle = findBundle();
  assert.ok(bundle, 'no main JS bundle found in dist/assets/');
  const src = readFileSync(join(DIST, 'assets', bundle), 'utf8');

  // Dead fields that should not appear as property accesses or string
  // literals in the production bundle (we removed them at source AND
  // from utils.js fallback chains). If any sneaks back in via a new
  // call site or a legacy comment, this test catches it.
  //
  // We check string-literal form ('foo') because minifiers preserve
  // property access via dot-notation as bareword identifiers, but
  // bracket access ('foo') always survives. The 7 dead fields were
  // removed from both, so neither form should be present.
  const deadIdentifiers = ['files_changed', 'lines_added', 'lines_deleted'];
  for (const id of deadIdentifiers) {
    assert.doesNotMatch(
      src,
      new RegExp(`["']${id}["']`),
      `main bundle contains stripped legacy identifier: ${id} — fallback chain may have been re-introduced`,
    );
  }
});

test('main JS bundle references the canonical fetch paths', { skip: !buildHasRun && SKIP_REASON }, () => {
  const bundle = findBundle();
  if (!bundle) return;
  const src = readFileSync(join(DIST, 'assets', bundle), 'utf8');
  // Sanity check: the bundle still fetches data.json and data-commits/
  // (catches accidental refactor that wires up the wrong URL path).
  assert.match(src, /["']\.\/data\.json["']/, 'bundle does not fetch ./data.json');
  assert.match(src, /\/data-commits\//, 'bundle does not reference /data-commits/');
});
