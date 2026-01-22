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

const fs = require('fs');
const path = require('path');

const PROCESSED_DIR = 'processed';

function getManifestPath(repoId) {
  return path.join(PROCESSED_DIR, repoId, 'manifest.json');
}

function readManifest(repoId) {
  const manifestPath = getManifestPath(repoId);
  if (fs.existsSync(manifestPath)) {
    return JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
  }
  return { processedShas: [], lastUpdated: null };
}

function writeManifest(repoId, manifest) {
  const manifestPath = getManifestPath(repoId);
  const dir = path.dirname(manifestPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
}

function saveCommit(repoId, commit, commitsDir) {
  const commitPath = path.join(commitsDir, `${commit.sha}.json`);
  fs.writeFileSync(commitPath, JSON.stringify(commit, null, 2));
  return commitPath;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) {
    chunks.push(chunk);
  }
  return Buffer.concat(chunks).toString('utf-8');
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

  // Validate commits have required fields
  const requiredFields = ['sha', 'timestamp', 'subject'];
  const analysisFields = ['tags', 'complexity', 'urgency', 'impact'];

  for (const commit of commits) {
    // Check required metadata fields
    for (const field of requiredFields) {
      if (!commit[field]) {
        console.error(`Error: Commit ${commit.sha || '(unknown)'} missing required field: ${field}`);
        console.error('Each commit must include original git metadata (sha, timestamp, subject, author_id)');
        console.error('plus AI analysis fields (tags, complexity, urgency, impact).');
        console.error('');
        console.error('Make sure to include the full commit object from the pending batch,');
        console.error('not just the analysis fields.');
        process.exit(1);
      }
    }

    // Check analysis fields
    for (const field of analysisFields) {
      if (commit[field] === undefined) {
        console.error(`Error: Commit ${commit.sha} missing analysis field: ${field}`);
        process.exit(1);
      }
    }

    // Ensure author info exists
    if (!commit.author_id && !commit.author) {
      console.error(`Error: Commit ${commit.sha} missing author_id or author`);
      process.exit(1);
    }
  }

  // Prepare commits directory
  const commitsDir = path.join(PROCESSED_DIR, repoId, 'commits');
  fs.mkdirSync(commitsDir, { recursive: true });

  // Save each commit
  let saved = 0;
  let skipped = 0;

  for (const commit of commits) {
    const commitPath = path.join(commitsDir, `${commit.sha}.json`);

    // Check if already exists (idempotent)
    if (fs.existsSync(commitPath)) {
      // Overwrite with new data (allows corrections)
      fs.writeFileSync(commitPath, JSON.stringify(commit, null, 2));
      skipped++;
    } else {
      fs.writeFileSync(commitPath, JSON.stringify(commit, null, 2));
      saved++;
    }
  }

  console.log(`Saved: ${saved} new commits to ${commitsDir}/`);
  if (skipped > 0) {
    console.log(`Updated: ${skipped} existing commits`);
  }

  // Update manifest
  const manifest = readManifest(repoId);
  const existingSet = new Set(manifest.processedShas);

  let added = 0;
  for (const commit of commits) {
    if (!existingSet.has(commit.sha)) {
      manifest.processedShas.push(commit.sha);
      added++;
    }
  }

  manifest.lastUpdated = new Date().toISOString();
  writeManifest(repoId, manifest);

  console.log(`Updated manifest: +${added} SHAs (total: ${manifest.processedShas.length})`);
  console.log('Done!');
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
