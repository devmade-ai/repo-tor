#!/usr/bin/env node
/**
 * Save Commit Script
 *
 * Saves analyzed commits to processed/<repo>/commits/<sha>.json and updates the manifest.
 * Reads commit data from stdin to avoid shell escaping issues.
 *
 * Usage: echo '<json>' | node save-commit.js <repo-id>
 *
 * Example:
 *   cat analyzed.json | node scripts/save-commit.js social-ad-creator
 *
 * Input JSON format (from stdin):
 *   {
 *     "commits": [
 *       { "sha": "abc123", "message": "...", "tags": [...], "complexity": 3, "urgency": 2, "impact": "user-facing", ... }
 *     ]
 *   }
 *
 * Or single commit:
 *   { "sha": "abc123", "message": "...", "tags": [...], ... }
 *
 * This script:
 *   1. Writes each commit to processed/<repo>/commits/<sha>.json
 *   2. Updates processed/<repo>/manifest.json with new SHAs
 */

import fs from 'fs';
import path from 'path';
import { getManifestPath, readManifest, writeManifest, PROCESSED_DIR } from './lib/manifest.js';
import { readStdin } from './lib/stdin.js';

function saveCommit(repoId, commit, commitsDir) {
  const commitPath = path.join(commitsDir, `${commit.sha}.json`);
  fs.writeFileSync(commitPath, JSON.stringify(commit, null, 2));
  return commitPath;
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: echo \'<json>\' | node save-commit.js <repo-id>');
    console.log('');
    console.log('Arguments:');
    console.log('  repo-id    Repository identifier (e.g., social-ad-creator)');
    console.log('');
    console.log('Input formats:');
    console.log('  { "commits": [...] }  - Array of commits');
    console.log('  { "sha": "..." }      - Single commit');
    console.log('');
    console.log('Example:');
    console.log('  cat data.json | node scripts/save-commit.js social-ad-creator');
    process.exit(1);
  }

  const repoId = args[0];

  // Read JSON from stdin
  const input = await readStdin();
  if (!input.trim()) {
    console.error('Error: No input received from stdin');
    process.exit(1);
  }

  let data;
  try {
    data = JSON.parse(input);
  } catch (e) {
    console.error('Error: Invalid JSON input');
    console.error(e.message);
    process.exit(1);
  }

  // Normalize to array of commits
  let commits;
  if (data.commits && Array.isArray(data.commits)) {
    commits = data.commits;
  } else if (data.sha) {
    // Single commit object
    commits = [data];
  } else {
    console.error('Error: Input must have a "commits" array or be a single commit with "sha"');
    process.exit(1);
  }

  // Validate commits and separate valid from invalid
  const requiredFields = ['sha', 'timestamp', 'subject'];
  const analysisFields = ['tags', 'complexity', 'urgency', 'impact'];

  const validCommits = [];
  const failedCommits = [];

  for (const commit of commits) {
    const errors = [];

    // Check required metadata fields
    for (const field of requiredFields) {
      if (!commit[field]) {
        errors.push(`missing ${field}`);
      }
    }

    // Check analysis fields
    for (const field of analysisFields) {
      if (commit[field] === undefined) {
        errors.push(`missing ${field}`);
      }
    }

    // Ensure author info exists
    if (!commit.author_id && !commit.author) {
      errors.push('missing author_id or author');
    }

    // Validate optional fields when present (don't require them)
    const validRisk = ['low', 'medium', 'high'];
    if (commit.risk !== undefined && commit.risk !== null && !validRisk.includes(commit.risk)) {
      errors.push(`risk must be one of: ${validRisk.join(', ')}`);
    }

    const validDebt = ['added', 'paid', 'neutral'];
    if (commit.debt !== undefined && commit.debt !== null && !validDebt.includes(commit.debt)) {
      errors.push(`debt must be one of: ${validDebt.join(', ')}`);
    }

    if (commit.epic !== undefined && commit.epic !== null && typeof commit.epic !== 'string') {
      errors.push('epic must be a string');
    }

    const validSemver = ['patch', 'minor', 'major'];
    if (commit.semver !== undefined && commit.semver !== null && !validSemver.includes(commit.semver)) {
      errors.push(`semver must be one of: ${validSemver.join(', ')}`);
    }

    if (errors.length > 0) {
      failedCommits.push({
        sha: commit.sha || '(unknown)',
        errors,
        partial: commit
      });
    } else {
      validCommits.push(commit);
    }
  }

  // If there are failures, write them to a reprocess file
  if (failedCommits.length > 0) {
    const reprocessDir = path.join(PROCESSED_DIR, repoId);
    fs.mkdirSync(reprocessDir, { recursive: true });
    const reprocessPath = path.join(reprocessDir, 'needs-reprocess.json');

    // Append to existing failures or create new file
    let existingFailures = [];
    if (fs.existsSync(reprocessPath)) {
      existingFailures = JSON.parse(fs.readFileSync(reprocessPath, 'utf-8'));
    }

    // Add new failures (avoid duplicates by sha)
    const existingShas = new Set(existingFailures.map(f => f.sha));
    for (const failure of failedCommits) {
      if (!existingShas.has(failure.sha)) {
        existingFailures.push(failure);
      }
    }

    fs.writeFileSync(reprocessPath, JSON.stringify(existingFailures, null, 2));

    console.error('\n========== VALIDATION FAILURES ==========');
    console.error(`${failedCommits.length} commit(s) failed validation and need reprocessing:\n`);
    for (const failure of failedCommits) {
      console.error(`  ${failure.sha}: ${failure.errors.join(', ')}`);
    }
    console.error(`\nFailed commits written to: ${reprocessPath}`);
    console.error('\nThese commits were NOT saved. You must include the full commit object');
    console.error('from the pending batch (with all git metadata), not just analysis fields.');
    console.error('==========================================\n');
  }

  // If ALL commits failed, exit with error
  if (validCommits.length === 0) {
    console.error('Error: No valid commits to save. All commits failed validation.');
    process.exit(1);
  }

  // Prepare commits directory
  const commitsDir = path.join(PROCESSED_DIR, repoId, 'commits');
  fs.mkdirSync(commitsDir, { recursive: true });

  // Save each valid commit
  let saved = 0;
  let updated = 0;

  for (const commit of validCommits) {
    const commitPath = path.join(commitsDir, `${commit.sha}.json`);

    // Check if already exists (idempotent)
    if (fs.existsSync(commitPath)) {
      // Overwrite with new data (allows corrections)
      fs.writeFileSync(commitPath, JSON.stringify(commit, null, 2));
      updated++;
    } else {
      fs.writeFileSync(commitPath, JSON.stringify(commit, null, 2));
      saved++;
    }
  }

  console.log(`Saved: ${saved} new commits to ${commitsDir}/`);
  if (updated > 0) {
    console.log(`Updated: ${updated} existing commits`);
  }

  // Update manifest
  const manifest = readManifest(repoId);
  const existingSet = new Set(manifest.processedShas);

  let added = 0;
  for (const commit of validCommits) {
    if (!existingSet.has(commit.sha)) {
      manifest.processedShas.push(commit.sha);
      added++;
    }
  }

  manifest.lastUpdated = new Date().toISOString();
  writeManifest(repoId, manifest);

  console.log(`Updated manifest: +${added} SHAs (total: ${manifest.processedShas.length})`);

  // Final status
  if (failedCommits.length > 0) {
    console.log(`\nWarning: ${failedCommits.length} commit(s) need reprocessing (see needs-reprocess.json)`);
    process.exit(1); // Exit with error so it's clear something went wrong
  } else {
    console.log('Done!');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
