#!/usr/bin/env node
/**
 * Strip dashboard-unused fields from existing processed/<repo>/commits/*.json
 * files in-place.
 *
 * Idempotent: scans every commit JSON, removes any keys listed in
 * DASHBOARD_UNUSED_FIELDS, and rewrites only the files that actually changed.
 * Format-preserving: matches the original Node JSON.stringify output (no
 * ASCII escaping; 2-space indent; no trailing newline) so the resulting diff
 * is pure deletions for the stripped fields.
 *
 * Usage: node scripts/strip-dead-fields.mjs
 *
 * When to run:
 *   - After adding a new field to DASHBOARD_UNUSED_FIELDS in
 *     scripts/aggregate-processed.js (keep these in sync).
 *   - After backfilling old commits via fix-malformed.js if it ever
 *     re-introduces a stripped field.
 *
 * Safe to run on a clean tree (no-op if all files are already stripped).
 */

import { readFileSync, writeFileSync, readdirSync, statSync, existsSync, renameSync, unlinkSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DASHBOARD_UNUSED_FIELDS } from './aggregate-processed.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(__filename), '..');
const PROCESSED_DIR = join(REPO_ROOT, 'processed');

// Single source of truth: imported from aggregate-processed.js.
const DEAD_FIELDS = new Set(DASHBOARD_UNUSED_FIELDS);

if (!existsSync(PROCESSED_DIR)) {
  console.error(
    `processed/ not found at ${PROCESSED_DIR}.\n` +
    `Run extraction + analysis first — see docs/DATA_OPERATIONS.md ` +
    `("Hatch the Chicken" for a fresh start, "Feed the Chicken" for incremental).`,
  );
  process.exit(1);
}

// Defensive: commit filenames written by merge-analysis.js are sha-based.
// Validate before joining paths so a corrupted or malicious entry (e.g.
// `../foo.json`) can't escape the commits directory.
const COMMIT_FILENAME = /^[0-9a-f]{7,40}\.json$/i;
// Repo names come from config/repos.json (kebab-case alphanumerics).
const REPO_DIRNAME = /^[a-z0-9][a-z0-9_-]*$/i;

let scanned = 0;
let modified = 0;
let fieldsStripped = 0;
let skipped = 0;

const repoDirs = readdirSync(PROCESSED_DIR).filter((d) => {
  if (!REPO_DIRNAME.test(d)) {
    console.warn(`  skipping non-conforming repo dirname: ${d}`);
    skipped += 1;
    return false;
  }
  return statSync(join(PROCESSED_DIR, d)).isDirectory();
});

// Pass 1: read + parse every file. If any fails to parse, abort BEFORE
// writing anything — partial writes on a mid-run JSON.parse crash leave
// processed/ in an inconsistent half-stripped state.
const planned = [];
for (const repo of repoDirs.sort()) {
  const commitsDir = join(PROCESSED_DIR, repo, 'commits');
  let entries;
  try {
    entries = readdirSync(commitsDir);
  } catch {
    continue; // no commits/ subdir
  }

  for (const file of entries.sort()) {
    if (!file.endsWith('.json')) continue;
    if (!COMMIT_FILENAME.test(file)) {
      console.warn(`  skipping non-conforming commit filename: ${repo}/${file}`);
      skipped += 1;
      continue;
    }
    const path = join(commitsDir, file);
    const content = readFileSync(path, 'utf-8');
    let data;
    try {
      data = JSON.parse(content);
    } catch (e) {
      throw new Error(`Failed to parse ${path}: ${e.message}. Aborting before any writes.`);
    }
    scanned += 1;

    let changed = 0;
    for (const key of DEAD_FIELDS) {
      if (key in data) {
        delete data[key];
        changed += 1;
      }
    }

    if (changed > 0) {
      planned.push({ path, data, changed });
    }
  }
}

// Pass 2: write only after all files parsed cleanly. Each write is
// atomic per-file via .tmp + rename so a mid-run disk failure leaves
// every file in either its old or new state — never half-written.
const writtenTmps = [];
try {
  for (const { path, data, changed } of planned) {
    const tmpPath = `${path}.tmp`;
    writeFileSync(tmpPath, JSON.stringify(data, null, 2));
    writtenTmps.push(tmpPath);
    renameSync(tmpPath, path);
    writtenTmps.pop(); // succeeded — no longer needs cleanup
    modified += 1;
    fieldsStripped += changed;
  }
} catch (e) {
  // Clean up any orphan .tmp files from incomplete writes.
  for (const tmp of writtenTmps) {
    try { unlinkSync(tmp); } catch { /* best effort */ }
  }
  throw new Error(
    `Write failed after ${modified} of ${planned.length} files updated. ` +
    `Already-renamed files have new content; remaining files are unchanged. ` +
    `Re-run after fixing the underlying issue: ${e.message}`,
  );
}

const skippedNote = skipped > 0 ? ` | Skipped (non-conforming names): ${skipped}` : '';
console.log(`Scanned: ${scanned} | Modified: ${modified} | Fields stripped: ${fieldsStripped}${skippedNote}`);
