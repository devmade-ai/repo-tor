#!/usr/bin/env node
/**
 * Merge Analysis Script
 *
 * Merges AI analysis output with raw git commit data.
 * This optimizes the "feed the chicken" process by reducing AI output to just
 * the analysis fields (tags, complexity, urgency, impact) instead of full commit objects.
 *
 * Usage: echo '<json>' | node merge-analysis.js <repo-id>
 *
 * Input JSON format (from stdin):
 *   {"commits": [
 *     {"sha": "abc123", "tags": ["feature"], "complexity": 2, "urgency": 1, "impact": "user-facing", "risk": "low", "debt": "neutral", "epic": "dark-mode", "semver": "minor"},
 *     {"sha": "def456", "tags": ["bugfix"], "complexity": 1, "urgency": 3, "impact": "user-facing"}
 *   ]}
 *
 * Or newline-delimited JSON (NDJSON):
 *   {"sha": "abc123", "tags": ["feature"], "complexity": 2, "urgency": 1, "impact": "user-facing", "risk": "low", "debt": "neutral"}
 *   {"sha": "def456", "tags": ["bugfix"], "complexity": 1, "urgency": 3, "impact": "user-facing"}
 *
 * This script:
 *   1. Reads AI analysis from stdin (required: sha + tags + complexity + urgency + impact; optional: risk, debt, epic, semver)
 *   2. Loads raw git data from reports/<repo>/commits/<sha>.json
 *   3. Merges analysis into raw data
 *   4. Saves complete commit to processed/<repo>/commits/<sha>.json
 *   5. Updates processed/<repo>/manifest.json
 *
 * Token savings: ~10x reduction in AI output (50-80 tokens vs 500-800 per commit)
 */

import fs from 'fs';
import path from 'path';
import { readManifest, writeManifest, PROCESSED_DIR } from './lib/manifest.js';
import { readStdin } from './lib/stdin.js';

const REPORTS_DIR = 'reports';

// Required analysis fields from AI
const ANALYSIS_FIELDS = ['tags', 'complexity', 'urgency', 'impact'];

// Optional analysis fields — validated when present, not required (backward compatible)
// Requirement: New metadata fields for richer reporting (risk assessment, debt tracking,
//   epic grouping, semver classification)
// Approach: Optional fields that validate when present but don't break existing workflows
// Alternatives: Making them required — rejected because 1163 existing commits lack these fields
const VALID_RISK = ['low', 'medium', 'high'];
const VALID_DEBT = ['added', 'paid', 'neutral'];
const VALID_SEMVER = ['patch', 'minor', 'major'];

// === Raw Commit Loading ===

function loadRawCommit(repoId, sha) {
  // Try individual commit file first
  const individualPath = path.join(REPORTS_DIR, repoId, 'commits', `${sha}.json`);
  if (fs.existsSync(individualPath)) {
    return JSON.parse(fs.readFileSync(individualPath, 'utf-8'));
  }

  // Fall back to bulk commits.json
  const bulkPath = path.join(REPORTS_DIR, repoId, 'commits.json');
  if (fs.existsSync(bulkPath)) {
    const data = JSON.parse(fs.readFileSync(bulkPath, 'utf-8'));
    const commits = data.commits || [];
    const commit = commits.find(c => c.sha === sha);
    if (commit) return commit;
  }

  return null;
}

// === Input Parsing ===

function parseAnalysisInput(input) {
  const trimmed = input.trim();

  // Try parsing as JSON object with commits array
  try {
    const data = JSON.parse(trimmed);
    if (data.commits && Array.isArray(data.commits)) {
      return data.commits;
    }
    // Single commit object
    if (data.sha) {
      return [data];
    }
  } catch (e) {
    // Not valid JSON object, try NDJSON
  }

  // Try parsing as newline-delimited JSON (NDJSON)
  // Requirement: Make data loss visible when skipping invalid JSON lines
  // Approach: Track skipped count and log a summary after the loop
  // Alternatives: Fail on first invalid line — rejected because partial data is
  //   better than no data, but the summary makes the loss visible
  const lines = trimmed.split('\n').filter(line => line.trim());
  const commits = [];
  let skippedCount = 0;

  for (const line of lines) {
    try {
      const obj = JSON.parse(line);
      if (obj.sha) {
        commits.push(obj);
      }
    } catch (e) {
      skippedCount++;
      console.error(`Warning: Skipping invalid JSON line: ${line.substring(0, 50)}...`);
    }
  }

  if (skippedCount > 0) {
    console.error(`Warning: Skipped ${skippedCount} of ${lines.length} lines (invalid JSON)`);
  }

  return commits;
}

// === Validation ===

function validateAnalysis(analysis) {
  const errors = [];

  if (!analysis.sha) {
    errors.push('missing sha');
  }

  for (const field of ANALYSIS_FIELDS) {
    if (analysis[field] === undefined) {
      errors.push(`missing ${field}`);
    }
  }

  // Validate field types
  if (analysis.tags !== undefined && !Array.isArray(analysis.tags)) {
    errors.push('tags must be an array');
  }

  if (analysis.complexity !== undefined) {
    const c = analysis.complexity;
    if (!Number.isInteger(c) || c < 1 || c > 5) {
      errors.push('complexity must be integer 1-5');
    }
  }

  if (analysis.urgency !== undefined) {
    const u = analysis.urgency;
    if (!Number.isInteger(u) || u < 1 || u > 5) {
      errors.push('urgency must be integer 1-5');
    }
  }

  const validImpacts = ['internal', 'user-facing', 'infrastructure', 'api'];
  if (analysis.impact !== undefined && !validImpacts.includes(analysis.impact)) {
    errors.push(`impact must be one of: ${validImpacts.join(', ')}`);
  }

  // Optional fields — validate type/value when present
  if (analysis.risk !== undefined && !VALID_RISK.includes(analysis.risk)) {
    errors.push(`risk must be one of: ${VALID_RISK.join(', ')}`);
  }

  if (analysis.debt !== undefined && !VALID_DEBT.includes(analysis.debt)) {
    errors.push(`debt must be one of: ${VALID_DEBT.join(', ')}`);
  }

  if (analysis.epic !== undefined && typeof analysis.epic !== 'string') {
    errors.push('epic must be a string');
  }

  if (analysis.semver !== undefined && !VALID_SEMVER.includes(analysis.semver)) {
    errors.push(`semver must be one of: ${VALID_SEMVER.join(', ')}`);
  }

  return errors;
}

// === Main Logic ===

async function main() {
  const args = process.argv.slice(2);

  if (args.length < 1) {
    console.log('Usage: echo \'<json>\' | node merge-analysis.js <repo-id>');
    console.log('');
    console.log('Arguments:');
    console.log('  repo-id    Repository identifier (e.g., social-ad-creator)');
    console.log('');
    console.log('Input formats:');
    console.log('  {"commits": [{sha, tags, complexity, urgency, impact}, ...]}');
    console.log('  Or newline-delimited JSON (NDJSON)');
    console.log('');
    console.log('Example:');
    console.log('  cat analysis.json | node scripts/merge-analysis.js social-ad-creator');
    process.exit(1);
  }

  const repoId = args[0];

  // Read analysis from stdin
  const input = await readStdin();
  if (!input.trim()) {
    console.error('Error: No input received from stdin');
    process.exit(1);
  }

  // Parse input
  const analysisItems = parseAnalysisInput(input);
  if (analysisItems.length === 0) {
    console.error('Error: No valid analysis items found in input');
    process.exit(1);
  }

  console.log(`\nMerging ${analysisItems.length} commits for ${repoId}...`);

  // Prepare output directory
  const commitsDir = path.join(PROCESSED_DIR, repoId, 'commits');
  fs.mkdirSync(commitsDir, { recursive: true });

  // Process each analysis item
  const results = {
    merged: [],
    failed: [],
    updated: []
  };

  for (const analysis of analysisItems) {
    // Validate analysis
    const validationErrors = validateAnalysis(analysis);
    if (validationErrors.length > 0) {
      results.failed.push({
        sha: analysis.sha || '(unknown)',
        errors: validationErrors,
        analysis
      });
      continue;
    }

    // Load raw commit data
    const rawCommit = loadRawCommit(repoId, analysis.sha);
    if (!rawCommit) {
      results.failed.push({
        sha: analysis.sha,
        errors: [`Raw commit not found in reports/${repoId}/`],
        analysis
      });
      continue;
    }

    // Merge analysis into raw commit (required + optional fields)
    const mergedCommit = {
      ...rawCommit,
      tags: analysis.tags,
      complexity: analysis.complexity,
      urgency: analysis.urgency,
      impact: analysis.impact
    };

    // Merge optional fields when present
    if (analysis.risk !== undefined) mergedCommit.risk = analysis.risk;
    if (analysis.debt !== undefined) mergedCommit.debt = analysis.debt;
    if (analysis.epic !== undefined) mergedCommit.epic = analysis.epic;
    if (analysis.semver !== undefined) mergedCommit.semver = analysis.semver;

    // Check if already exists
    const commitPath = path.join(commitsDir, `${analysis.sha}.json`);
    const isUpdate = fs.existsSync(commitPath);

    // Save merged commit
    fs.writeFileSync(commitPath, JSON.stringify(mergedCommit, null, 2));

    if (isUpdate) {
      results.updated.push(analysis.sha);
    } else {
      results.merged.push(analysis.sha);
    }
  }

  // Report and save failures
  if (results.failed.length > 0) {
    const reprocessPath = path.join(PROCESSED_DIR, repoId, 'needs-reprocess.json');

    // Load existing failures (avoid duplicates)
    let existingFailures = [];
    if (fs.existsSync(reprocessPath)) {
      existingFailures = JSON.parse(fs.readFileSync(reprocessPath, 'utf-8'));
    }

    // Add new failures (update existing entries by sha)
    const existingBySha = new Map(existingFailures.map(f => [f.sha, f]));
    for (const failure of results.failed) {
      existingBySha.set(failure.sha, {
        sha: failure.sha,
        errors: failure.errors,
        analysis: failure.analysis,
        failedAt: new Date().toISOString(),
        attempts: (existingBySha.get(failure.sha)?.attempts || 0) + 1
      });
    }

    // Write updated failures
    const updatedFailures = Array.from(existingBySha.values());
    fs.mkdirSync(path.dirname(reprocessPath), { recursive: true });
    fs.writeFileSync(reprocessPath, JSON.stringify(updatedFailures, null, 2));

    console.error('\n========== MERGE FAILURES ==========');
    console.error(`${results.failed.length} commit(s) failed to merge:\n`);
    for (const failure of results.failed) {
      const attempts = existingBySha.get(failure.sha)?.attempts || 1;
      console.error(`  ${failure.sha}: ${failure.errors.join(', ')} (attempt ${attempts})`);
    }
    console.error(`\nFailed commits written to: ${reprocessPath}`);
    console.error('=====================================\n');
  }

  // Update manifest
  if (results.merged.length > 0 || results.updated.length > 0) {
    const manifest = readManifest(repoId);
    const existingSet = new Set(manifest.processedShas);

    let added = 0;
    for (const sha of results.merged) {
      if (!existingSet.has(sha)) {
        manifest.processedShas.push(sha);
        added++;
      }
    }

    manifest.lastUpdated = new Date().toISOString();
    writeManifest(repoId, manifest);

    console.log(`Merged: ${results.merged.length} new commits`);
    if (results.updated.length > 0) {
      console.log(`Updated: ${results.updated.length} existing commits`);
    }
    console.log(`Manifest: +${added} SHAs (total: ${manifest.processedShas.length})`);
  }

  // Summary
  if (results.failed.length > 0) {
    console.log(`\nWarning: ${results.failed.length} commit(s) failed to merge`);
    process.exit(1);
  } else {
    console.log('Done!');
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
