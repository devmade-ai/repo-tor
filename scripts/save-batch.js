#!/usr/bin/env node
/**
 * Save Batch Script
 *
 * Saves an approved batch of analyzed commits to processed/ and updates the manifest.
 * Reads commit data from stdin to avoid shell escaping issues.
 *
 * Usage: echo '<json>' | node save-batch.js <repo-id> <batch-num>
 *
 * Example:
 *   cat analyzed.json | node scripts/save-batch.js social-ad-creator 9
 *
 * Input JSON format (from stdin):
 *   {
 *     "commits": [
 *       { "sha": "abc123", "message": "...", "tags": [...], "complexity": 3, "urgency": 2, "impact": "user-facing", ... }
 *     ]
 *   }
 *
 * This script:
 *   1. Writes batch to processed/<repo>/batches/batch-NNN.json
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

function getNextBatchNumber(repoId) {
  const batchDir = path.join(PROCESSED_DIR, repoId, 'batches');
  if (!fs.existsSync(batchDir)) {
    return 1;
  }
  const files = fs.readdirSync(batchDir).filter(f => f.match(/^batch-\d+\.json$/));
  if (files.length === 0) {
    return 1;
  }
  const numbers = files.map(f => parseInt(f.match(/batch-(\d+)\.json/)[1]));
  return Math.max(...numbers) + 1;
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
    console.log('Usage: echo \'<json>\' | node save-batch.js <repo-id> [batch-num]');
    console.log('');
    console.log('Arguments:');
    console.log('  repo-id    Repository identifier (e.g., social-ad-creator)');
    console.log('  batch-num  Optional batch number (auto-detects next if omitted)');
    console.log('');
    console.log('Example:');
    console.log('  cat data.json | node scripts/save-batch.js social-ad-creator');
    process.exit(1);
  }

  const repoId = args[0];
  let batchNum = args[1] ? parseInt(args[1]) : null;

  // Auto-detect next batch number if not provided
  if (!batchNum) {
    batchNum = getNextBatchNumber(repoId);
  }

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

  if (!data.commits || !Array.isArray(data.commits)) {
    console.error('Error: Input must have a "commits" array');
    process.exit(1);
  }

  // Validate commits have required fields
  for (const commit of data.commits) {
    if (!commit.sha) {
      console.error('Error: Each commit must have a "sha" field');
      process.exit(1);
    }
  }

  // Prepare batch file
  const batchDir = path.join(PROCESSED_DIR, repoId, 'batches');
  fs.mkdirSync(batchDir, { recursive: true });

  const batchFileName = `batch-${String(batchNum).padStart(3, '0')}.json`;
  const batchPath = path.join(batchDir, batchFileName);

  const batchData = {
    batch: batchNum,
    savedAt: new Date().toISOString(),
    count: data.commits.length,
    commits: data.commits
  };

  // Write batch file
  fs.writeFileSync(batchPath, JSON.stringify(batchData, null, 2));
  console.log(`Saved: ${batchPath} (${data.commits.length} commits)`);

  // Update manifest
  const manifest = readManifest(repoId);
  const existingSet = new Set(manifest.processedShas);

  let added = 0;
  for (const commit of data.commits) {
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
