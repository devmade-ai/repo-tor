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

import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { DASHBOARD_UNUSED_FIELDS } from './aggregate-processed.js';

const __filename = fileURLToPath(import.meta.url);
const REPO_ROOT = join(dirname(__filename), '..');
const PROCESSED_DIR = join(REPO_ROOT, 'processed');

// Single source of truth: imported from aggregate-processed.js.
const DEAD_FIELDS = new Set(DASHBOARD_UNUSED_FIELDS);

let scanned = 0;
let modified = 0;
let fieldsStripped = 0;

const repoDirs = readdirSync(PROCESSED_DIR).filter((d) =>
  statSync(join(PROCESSED_DIR, d)).isDirectory(),
);

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
    const path = join(commitsDir, file);
    const content = readFileSync(path, 'utf-8');
    const data = JSON.parse(content);
    scanned += 1;

    let changed = 0;
    for (const key of DEAD_FIELDS) {
      if (key in data) {
        delete data[key];
        changed += 1;
      }
    }

    if (changed > 0) {
      writeFileSync(path, JSON.stringify(data, null, 2));
      modified += 1;
      fieldsStripped += changed;
    }
  }
}

console.log(`Scanned: ${scanned} | Modified: ${modified} | Fields stripped: ${fieldsStripped}`);
