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
      tags: "Read full subject + body, assign ALL that apply. Every commit does something. See tag_categories for the full list.",
      complexity: "1-5. 1=trivial single file, 2=small few files, 3=medium multiple files, 4=large many files, 5=major extensive changes.",
      urgency: "1-5. 1=planned (roadmap, refactoring), 2=normal (standard dev, DEFAULT), 3=elevated (affecting users, deadline), 4=urgent (blocking, breaking), 5=critical (production down, security vuln). Look for keywords: urgent, hotfix, critical, ASAP, emergency, breaking, crash, down, broken, blocking.",
      impact: "internal (devs only: tests, refactoring, docs, tooling, CI/CD) / user-facing (end users: UI, features, UX, bug fixes users experience) / infrastructure (ops: CI/CD, Docker, monitoring, hosting, env vars) / api (integrations: endpoints, breaking changes, webhooks). One category only — if both user-facing and internal, choose user-facing.",
      risk: "low (docs, formatting, config, CSS, comments) / medium (new features, refactors, dependency updates, moderate logic) / high (auth, payments, data integrity, security, database schemas, production infra). Key question: what's the worst that happens if this is wrong?",
      debt: "added (shortcuts, TODOs, workarounds, 'good enough for now') / paid (refactored hacks, removed workarounds, fixed long-standing issues) / neutral (standard work, DEFAULT). Only use 'added' for conscious shortcuts, 'paid' for deliberate cleanup.",
      epic: "What initiative is this part of? Short, lowercase, hyphenated label (e.g. dark-mode, auth-v2, react-migration). Every commit gets one — derive from context.",
      semver: "patch (bug fix, docs, config, refactor, no new functionality) / minor (new feature, enhancement, backward compatible) / major (breaking change, API changes, schema migrations)."
    },
    epic_strategy: [
      "Consecutive related commits → same epic (e.g. 6 docs commits = plant-fur-docs)",
      "PR-grouped commits → merge commit shares the epic of its contents",
      "Standalone commits → descriptive epic based on what it does (repo-setup, ci-pipeline, auth-fix, docs-cleanup)",
      "Cross-repo initiatives → reuse the same epic label",
      "Reuse existing epic labels when the work clearly belongs to the same initiative"
    ],
    tag_categories: {
      user_facing: ["feature", "enhancement", "bugfix", "hotfix", "ui", "ux", "accessibility", "i18n", "localization"],
      code_changes: ["refactor", "simplify", "removal", "deprecation", "migration", "naming", "types"],
      performance: ["performance", "memory", "caching"],
      security: ["security", "auth", "authorization", "vulnerability", "sanitization"],
      testing: ["test-unit", "test-integration", "test-e2e", "test-fix", "coverage", "mocks"],
      documentation: ["docs", "changelog", "comments", "api-docs", "examples"],
      infrastructure: ["ci", "cd", "docker", "monitoring", "hosting"],
      build_config: ["build", "bundler", "config", "env", "lint", "formatter"],
      dependencies: ["dependency-add", "dependency-update", "dependency-remove", "dependency-security"],
      database: ["database", "schema", "data-migration", "seed"],
      api: ["api", "api-breaking", "endpoint"],
      git_process: ["merge", "revert", "release", "init"],
      code_style: ["style", "imports", "whitespace"],
      error_handling: ["error-handling", "logging", "validation"]
    },
    merge_commits: {
      rule: "Merge commits get ONLY the 'merge' tag. Do NOT add descriptive tags from the PR title/body — the real commits already have those tags and adding them to the merge double-counts work in analytics.",
      fields: "Complexity: 1 (merging is trivial), Urgency: 2 (normal), Impact: internal (the merge itself doesn't affect users). Risk: low, Debt: neutral. Semver and epic: derive from the PR's contents (share the epic of the merged commits, share the highest semver)."
    },
    review_format: {
      description: "Present commits in EXACTLY this format. Do not abbreviate, restructure, or use alternative layouts.",
      template: [
        "[1/25] abc123",
        "Subject: Fix button placement and performance issues",
        "Body:",
        "- Move button below the image",
        "- Fix page freeze by removing scrollIntoView",
        "",
        "Tags: refactor, bugfix, performance, docs",
        "Complexity: 4 | Urgency: 3 | Impact: user-facing | Risk: medium | Debt: neutral | Epic: ui-overhaul | Semver: patch",
        "---"
      ],
      user_commands: {
        "approve": "Save batch via merge-analysis.js, continue to next batch",
        "approve and commit": "Save batch + git commit all pending changes",
        "commit": "Git commit all pending changes now",
        "#N correction": "e.g. '#3 should be feature not refactor' — AI corrects and re-presents",
        "stop": "Commit pending changes and end session"
      }
    },
    on_approval: {
      description: "After user approves, pipe ONLY analysis fields to merge-analysis.js. Do NOT write files manually.",
      command_template: "cat <<'EOF' | node scripts/merge-analysis.js <repo-id>\n{\"commits\": [\n  {\"sha\": \"abc123\", \"tags\": [\"feature\", \"ui\"], \"complexity\": 2, \"urgency\": 1, \"impact\": \"user-facing\", \"risk\": \"medium\", \"debt\": \"neutral\", \"epic\": \"dashboard-redesign\", \"semver\": \"minor\"}\n]}\nEOF",
      why: "merge-analysis.js merges AI analysis with full git data from reports/<repo>/commits/<sha>.json. ~10x reduction in AI output tokens. Faster, cheaper, same quality."
    },
    prohibitions: [
      "NEVER output null for any field — best guess always",
      "NEVER improvise the review format — use the exact format shown in review_format.template",
      "NEVER add descriptive tags to merge commits — only 'merge' tag (real commits already have the tags)",
      "NEVER write commit files manually — always pipe analysis to merge-analysis.js",
      "NEVER output full commit objects — only analysis fields (sha, tags, complexity, urgency, impact, risk, debt, epic, semver)",
      "NEVER skip the commit body when analyzing — tags must reflect full message content (subject + body)",
      "NEVER use placeholder data that looks like real data",
      "NEVER reference external docs for instructions — everything you need is in this _instructions block"
    ]
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
