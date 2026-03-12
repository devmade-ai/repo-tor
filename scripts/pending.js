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

import fs from 'fs';
import path from 'path';
import { getManifestPath, readManifest, writeManifest, PROCESSED_DIR } from './lib/manifest.js';

const BATCH_SIZE = 25;
const REPORTS_DIR = 'reports';
const PENDING_DIR = 'pending';

// Requirement: Embed analysis instructions into every batch file so AI reads them before processing
// Approach: Include as _instructions field at the top of each batch JSON
// Why: The whole point of AI-driven analysis is contextual intelligence, not mechanical field-filling.
//   Past sessions have used nulls, omitted fields, or half-assed analysis. This preamble ensures
//   every batch file carries the full context regardless of which session processes it.
const BATCH_PREAMBLE = {
  _instructions: {
    rule: "NO NULLS — MANDATORY. Every field gets a real value. No nulls. No exceptions. Best guess always beats null.",
    why: "The entire point of AI-driven commit analysis (instead of a script) is contextual intelligence. A script can extract git metadata — but only an intelligent reader can recognize multi-commit initiatives, assess risk from what code was touched, and infer release impact. The dashboard's reporting is only as good as its data. Nulls create gaps in charts, breakdowns, and trend analysis. The user reviews every batch — they will catch mistakes. They cannot catch laziness.",
    fields: {
      tags: "Read full subject + body, assign ALL that apply. Every commit does something.",
      complexity: "1-5. Judge from files changed, scope described in body. Every change has a size.",
      urgency: "1-5. Keywords (hotfix, critical), timing, context. Default: 2. Every change has a priority.",
      impact: "internal / user-facing / infrastructure / api. Who's affected by this change.",
      risk: "low / medium / high. What's the worst that happens if this is wrong?",
      debt: "added / paid / neutral. Did this add shortcuts or clean them up? Default: neutral.",
      epic: "What initiative is this part of? Look at surrounding commits, PR groupings, shared scope. Standalone commits get a descriptive epic (e.g. repo-setup, image-pipeline, docs-cleanup). Every commit exists for a reason that can be named.",
      semver: "patch / minor / major. feature→minor, fix→patch, breaking→major, docs/config/refactor→patch, init→minor."
    },
    epic_strategy: [
      "Consecutive related commits → same epic (e.g. 6 docs commits = plant-fur-docs)",
      "PR-grouped commits → merge commit shares the epic of its contents",
      "Standalone commits → descriptive epic based on what it does",
      "Cross-repo initiatives → reuse the same epic label"
    ],
    merge_commits: {
      rule: "Merge commits get ONLY the 'merge' tag. Do NOT add descriptive tags from the PR title/body — the real commits already have those tags and adding them to the merge double-counts work in analytics.",
      fields: "Complexity: 1 (merging is trivial), Urgency: 2 (normal), Impact: internal (the merge itself doesn't affect users). Risk, debt, semver, epic: derive from the PR's contents (share the epic of the merged commits)."
    },
    prohibitions: [
      "NEVER output null for any field — best guess always",
      "NEVER improvise the review format — use the exact format from EXTRACTION_PLAYBOOK.md",
      "NEVER add descriptive tags to merge commits — only 'merge' tag (real commits already have the tags)",
      "NEVER write commit files manually — always pipe analysis to merge-analysis.js",
      "NEVER output full commit objects — only analysis fields (sha, tags, complexity, urgency, impact, risk, debt, epic, semver)",
      "NEVER skip the commit body when analyzing — tags must reflect full message content (subject + body)",
      "NEVER use placeholder data that looks like real data"
    ],
    format: "Present using exact review format from EXTRACTION_PLAYBOOK.md. On approval, pipe only analysis fields (sha, tags, complexity, urgency, impact, risk, debt, epic, semver) to merge-analysis.js. Nothing else."
  }
};

// === Manifest Management ===

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

// Requirement: Clear pending batches safely without data loss on interruption
// Approach: Write to temp directory, then swap via rename (atomic on same filesystem).
// Alternatives:
//   - Direct rmSync + mkdirSync: Rejected — interruption between them loses data
//   - In-place file-by-file delete: Rejected — still non-atomic, more complex
function writePendingBatches(repoId, commits) {
  const pendingDir = path.join(PENDING_DIR, repoId, 'batches');
  const pendingTmp = path.join(PENDING_DIR, repoId, 'batches-tmp');
  const pendingOld = path.join(PENDING_DIR, repoId, 'batches-old');

  // Requirement: Recover from interrupted previous runs on startup
  // Approach: If pendingOld exists but pendingDir doesn't, a previous swap was interrupted
  //   after the first rename but before the second — restore pendingOld as pendingDir
  // Alternatives: Just delete pendingOld — rejected because that loses the only copy of data
  if (fs.existsSync(pendingOld) && !fs.existsSync(pendingDir)) {
    console.warn(`  Recovering from interrupted swap: restoring ${pendingOld} → ${pendingDir}`);
    fs.renameSync(pendingOld, pendingDir);
  }

  // Clean up any leftover temp/old dirs from previous interrupted runs
  if (fs.existsSync(pendingTmp)) fs.rmSync(pendingTmp, { recursive: true });
  if (fs.existsSync(pendingOld)) fs.rmSync(pendingOld, { recursive: true });

  fs.mkdirSync(pendingTmp, { recursive: true });

  if (commits.length === 0) {
    // Still swap to ensure clean state
    if (fs.existsSync(pendingDir)) {
      fs.renameSync(pendingDir, pendingOld);
      fs.rmSync(pendingOld, { recursive: true });
    }
    fs.renameSync(pendingTmp, pendingDir);
    console.log(`  No pending commits for ${repoId}`);
    return 0;
  }

  const totalBatches = Math.ceil(commits.length / BATCH_SIZE);

  for (let i = 0; i < commits.length; i += BATCH_SIZE) {
    const batchNum = Math.floor(i / BATCH_SIZE) + 1;
    const batchCommits = commits.slice(i, i + BATCH_SIZE);
    const batchFile = path.join(pendingTmp, `batch-${String(batchNum).padStart(3, '0')}.json`);

    fs.writeFileSync(batchFile, JSON.stringify({
      ...BATCH_PREAMBLE,
      batch: batchNum,
      totalBatches: totalBatches,
      startIndex: i,
      count: batchCommits.length,
      commits: batchCommits
    }, null, 2));
  }

  // Requirement: Prevent data loss if process is interrupted between sequential renames
  // Approach: Wrap in try-catch; if the first rename succeeds but the second fails,
  //   roll back by renaming pendingOld back to pendingDir
  // Alternatives: Single rename — not possible because we need to replace an existing dir
  try {
    if (fs.existsSync(pendingDir)) {
      fs.renameSync(pendingDir, pendingOld);
    }
    fs.renameSync(pendingTmp, pendingDir);
  } catch (err) {
    // Recovery: if pendingOld exists but pendingDir doesn't, the second rename failed
    // Restore the old directory so data isn't lost
    if (fs.existsSync(pendingOld) && !fs.existsSync(pendingDir)) {
      console.error(`  Error during swap, restoring previous batches: ${err.message}`);
      fs.renameSync(pendingOld, pendingDir);
    }
    throw err;
  }
  if (fs.existsSync(pendingOld)) {
    fs.rmSync(pendingOld, { recursive: true });
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
    console.log(`  Updated manifest: ${getManifestPath(repoId)}`);
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
