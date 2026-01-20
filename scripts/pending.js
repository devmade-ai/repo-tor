#!/usr/bin/env node
/**
 * Pending Commits Script
 *
 * Identifies unprocessed commits by comparing extracted data against
 * the manifest of already-processed commits. Generates pending batches
 * for AI review.
 *
 * Usage: node pending.js [--rebuild-manifests]
 *
 * Options:
 *   --rebuild-manifests  Rebuild manifest files from existing processed batches
 *
 * Flow:
 *   1. Read manifest for each repo (processed/<repo>/manifest.json)
 *   2. Read extracted commits (reports/<repo>/commits.json)
 *   3. Filter out already-processed commits (by SHA)
 *   4. Generate pending batches (pending/<repo>/batches/batch-NNN.json)
 */

const fs = require('fs');
const path = require('path');

const BATCH_SIZE = 15;
const REPORTS_DIR = 'reports';
const PROCESSED_DIR = 'processed';
const PENDING_DIR = 'pending';

// === Manifest Management ===

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
  console.log(`  Updated manifest: ${manifestPath}`);
}

function rebuildManifestFromBatches(repoId) {
  const batchDir = path.join(PROCESSED_DIR, repoId, 'batches');
  const processedShas = [];

  if (!fs.existsSync(batchDir)) {
    return { processedShas: [], lastUpdated: null };
  }

  const batchFiles = fs.readdirSync(batchDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  for (const file of batchFiles) {
    const batchPath = path.join(batchDir, file);
    const batch = JSON.parse(fs.readFileSync(batchPath, 'utf-8'));
    for (const commit of batch.commits) {
      processedShas.push(commit.sha);
    }
  }

  return {
    processedShas,
    lastUpdated: new Date().toISOString(),
    rebuiltFrom: `${batchFiles.length} batch files`
  };
}

// === Pending Batch Generation ===

function getExtractedCommits(repoId) {
  const commitsPath = path.join(REPORTS_DIR, repoId, 'commits.json');
  if (!fs.existsSync(commitsPath)) {
    return [];
  }
  const data = JSON.parse(fs.readFileSync(commitsPath, 'utf-8'));
  return data.commits || [];
}

function writePendingBatches(repoId, commits) {
  const pendingDir = path.join(PENDING_DIR, repoId, 'batches');

  // Clear existing pending batches
  if (fs.existsSync(pendingDir)) {
    fs.rmSync(pendingDir, { recursive: true });
  }
  fs.mkdirSync(pendingDir, { recursive: true });

  if (commits.length === 0) {
    console.log(`  No pending commits for ${repoId}`);
    return 0;
  }

  const totalBatches = Math.ceil(commits.length / BATCH_SIZE);

  for (let i = 0; i < commits.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batchCommits = commits.slice(i, i + BATCH_SIZE);
    const batchFile = path.join(pendingDir, `batch-${String(batchNum).padStart(3, '0')}.json`);

    fs.writeFileSync(batchFile, JSON.stringify({
      batch: batchNum,
      totalBatches: totalBatches,
      startIndex: i,
      count: batchCommits.length,
      commits: batchCommits
    }, null, 2));
  }

  console.log(`  Generated ${totalBatches} pending batches for ${repoId} (${commits.length} commits)`);
  return totalBatches;
}

// === Main Logic ===

function getRepoIds() {
  const repoIds = new Set();

  // Get repos from reports/
  if (fs.existsSync(REPORTS_DIR)) {
    for (const dir of fs.readdirSync(REPORTS_DIR)) {
      const fullPath = path.join(REPORTS_DIR, dir);
      if (fs.statSync(fullPath).isDirectory()) {
        repoIds.add(dir);
      }
    }
  }

  // Get repos from processed/
  if (fs.existsSync(PROCESSED_DIR)) {
    for (const dir of fs.readdirSync(PROCESSED_DIR)) {
      const fullPath = path.join(PROCESSED_DIR, dir);
      if (fs.statSync(fullPath).isDirectory()) {
        repoIds.add(dir);
      }
    }
  }

  return Array.from(repoIds).sort();
}

function processRepo(repoId, rebuildManifest) {
  console.log(`\nProcessing ${repoId}...`);

  // Get or rebuild manifest
  let manifest;
  if (rebuildManifest) {
    console.log(`  Rebuilding manifest from processed batches...`);
    manifest = rebuildManifestFromBatches(repoId);
    writeManifest(repoId, manifest);
  } else {
    manifest = readManifest(repoId);
  }

  const processedSet = new Set(manifest.processedShas);
  console.log(`  Already processed: ${processedSet.size} commits`);

  // Get extracted commits
  const allCommits = getExtractedCommits(repoId);
  console.log(`  Total extracted: ${allCommits.length} commits`);

  // Filter to pending (unprocessed) commits
  const pendingCommits = allCommits.filter(c => !processedSet.has(c.sha));
  console.log(`  Pending: ${pendingCommits.length} commits`);

  // Write pending batches
  const batchCount = writePendingBatches(repoId, pendingCommits);

  return {
    repoId,
    total: allCommits.length,
    processed: processedSet.size,
    pending: pendingCommits.length,
    batches: batchCount
  };
}

function main() {
  const args = process.argv.slice(2);
  const rebuildManifests = args.includes('--rebuild-manifests');

  console.log('Pending Commits Generator');
  console.log('=========================');

  if (rebuildManifests) {
    console.log('\nMode: Rebuilding manifests from existing processed batches');
  }

  const repoIds = getRepoIds();

  if (repoIds.length === 0) {
    console.log('\nNo repositories found. Run extraction first.');
    process.exit(1);
  }

  console.log(`\nFound ${repoIds.length} repositories: ${repoIds.join(', ')}`);

  const results = [];
  for (const repoId of repoIds) {
    results.push(processRepo(repoId, rebuildManifests));
  }

  // Summary
  console.log('\n=========================');
  console.log('Summary:');
  console.log('=========================');

  let totalPending = 0;
  let totalBatches = 0;

  for (const r of results) {
    console.log(`  ${r.repoId}: ${r.pending}/${r.total} pending (${r.batches} batches)`);
    totalPending += r.pending;
    totalBatches += r.batches;
  }

  console.log(`\nTotal: ${totalPending} pending commits in ${totalBatches} batches`);

  if (totalPending > 0) {
    console.log(`\nPending batches written to: ${PENDING_DIR}/`);
    console.log('Run @data review to process them.');
  } else {
    console.log('\nAll commits have been processed!');
  }
}

main();
