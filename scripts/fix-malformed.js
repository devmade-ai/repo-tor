#!/usr/bin/env node
/**
 * Fix Malformed Commits
 *
 * Reads needs-reprocess.json files, extracts git metadata for those commits,
 * merges with existing analysis, and saves the fixed commits.
 *
 * Usage: node scripts/fix-malformed.js
 */

import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';

const PROCESSED_DIR = 'processed';
const REPO_CACHE_DIR = '.repo-cache';
const CONFIG_PATH = 'config/repos.json';

// Validate SHA format to prevent command injection
function isValidSha(sha) {
    return /^[0-9a-f]{7,40}$/i.test(sha);
}

// Load repo config
function loadRepoConfig() {
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error(`Config not found: ${CONFIG_PATH}`);
    process.exit(1);
  }
  return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
}

// Clone or update repo
function ensureRepo(repoName, repoUrl) {
  const repoPath = path.join(REPO_CACHE_DIR, repoName);

  if (fs.existsSync(repoPath)) {
    console.log(`  Updating ${repoName}...`);
    execFileSync('git', ['fetch', '--all'], { cwd: repoPath, stdio: 'pipe' });
  } else {
    console.log(`  Cloning ${repoName}...`);
    fs.mkdirSync(REPO_CACHE_DIR, { recursive: true });
    execFileSync('git', ['clone', repoUrl, repoPath], { stdio: 'pipe' });
  }

  return repoPath;
}

// Extract git metadata for a commit
function extractCommitMetadata(repoPath, sha) {
  if (!isValidSha(sha)) {
    console.error(`    Invalid SHA format: ${sha}`);
    return null;
  }

  try {
    // Get commit info using git log
    const format = [
      '%H',      // full sha
      '%an',     // author name
      '%ae',     // author email
      '%cn',     // committer name
      '%ce',     // committer email
      '%aI',     // author date ISO
      '%cI',     // commit date ISO
      '%s',      // subject
      '%b'       // body
    ].join('%x00');

    const output = execFileSync(
      'git', ['log', '-1', `--format=${format}`, sha],
      { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
    ).trim();

    const parts = output.split('\x00');
    if (parts.length < 8) {
      return null;
    }

    const [fullSha, authorName, authorEmail, committerName, committerEmail, authorDate, commitDate, subject, ...bodyParts] = parts;
    const body = bodyParts.join('\x00').trim();

    // Get stats
    let stats = { filesChanged: 0, additions: 0, deletions: 0 };
    try {
      const statOutput = execFileSync(
        'git', ['diff', '--shortstat', `${sha}^..${sha}`],
        { cwd: repoPath, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'] }
      ).trim();

      const filesMatch = statOutput.match(/(\d+) files? changed/);
      const addMatch = statOutput.match(/(\d+) insertions?\(\+\)/);
      const delMatch = statOutput.match(/(\d+) deletions?\(-\)/);

      stats = {
        filesChanged: filesMatch ? parseInt(filesMatch[1]) : 0,
        additions: addMatch ? parseInt(addMatch[1]) : 0,
        deletions: delMatch ? parseInt(delMatch[1]) : 0
      };
    } catch (e) {
      // First commit has no parent, that's ok
    }

    return {
      fullSha,
      author: { name: authorName, email: authorEmail },
      author_id: authorEmail,
      committer: { name: committerName, email: committerEmail },
      timestamp: authorDate,
      commitDate,
      subject,
      body,
      stats
    };
  } catch (e) {
    console.error(`    Failed to extract metadata for ${sha}: ${e.message}`);
    return null;
  }
}

// Fix malformed commits for a repo
function fixRepo(repoName, repoUrl) {
  const reprocessPath = path.join(PROCESSED_DIR, repoName, 'needs-reprocess.json');

  if (!fs.existsSync(reprocessPath)) {
    return { fixed: 0, failed: 0 };
  }

  const malformed = JSON.parse(fs.readFileSync(reprocessPath, 'utf-8'));
  if (malformed.length === 0) {
    return { fixed: 0, failed: 0 };
  }

  console.log(`\nFixing ${repoName}: ${malformed.length} commits`);

  // Ensure repo is available
  const repoPath = ensureRepo(repoName, repoUrl);

  let fixed = 0;
  let failed = 0;
  const stillBroken = [];

  for (const item of malformed) {
    const sha = item.sha;
    const commitPath = path.join(PROCESSED_DIR, repoName, 'commits', `${sha}.json`);

    // Read existing partial commit (has analysis fields)
    let existing = {};
    if (fs.existsSync(commitPath)) {
      existing = JSON.parse(fs.readFileSync(commitPath, 'utf-8'));
    }

    // Extract git metadata
    const metadata = extractCommitMetadata(repoPath, sha);
    if (!metadata) {
      console.log(`    ✗ ${sha}: Could not extract metadata`);
      stillBroken.push(item);
      failed++;
      continue;
    }

    // Merge: git metadata + existing analysis
    const fixedCommit = {
      sha,
      ...metadata,
      tags: existing.tags || ['unknown'],
      complexity: existing.complexity ?? 1,
      urgency: existing.urgency ?? 2,
      impact: existing.impact || 'internal',
      repo_id: repoName
    };

    // Save fixed commit
    fs.writeFileSync(commitPath, JSON.stringify(fixedCommit, null, 2));
    console.log(`    ✓ ${sha}: Fixed`);
    fixed++;
  }

  // Update needs-reprocess.json (only keep still-broken ones)
  if (stillBroken.length > 0) {
    fs.writeFileSync(reprocessPath, JSON.stringify(stillBroken, null, 2));
  } else {
    // All fixed, remove the file
    fs.unlinkSync(reprocessPath);
  }

  return { fixed, failed };
}

function main() {
  console.log('Fix Malformed Commits');
  console.log('=====================\n');

  const config = loadRepoConfig();
  const repoMap = {};
  for (const repo of config.repos) {
    repoMap[repo.name] = repo.url;
  }

  let totalFixed = 0;
  let totalFailed = 0;

  // Process each repo that has needs-reprocess.json
  const repoDirs = fs.readdirSync(PROCESSED_DIR)
    .filter(d => fs.statSync(path.join(PROCESSED_DIR, d)).isDirectory());

  for (const repoName of repoDirs) {
    const repoUrl = repoMap[repoName];
    if (!repoUrl) {
      console.log(`Skipping ${repoName}: not in config/repos.json`);
      continue;
    }

    const { fixed, failed } = fixRepo(repoName, repoUrl);
    totalFixed += fixed;
    totalFailed += failed;
  }

  console.log('\n=====================');
  console.log(`Fixed: ${totalFixed} commits`);
  if (totalFailed > 0) {
    console.log(`Failed: ${totalFailed} commits (check needs-reprocess.json)`);
  }
  console.log('Done!');

  // Re-aggregate
  if (totalFixed > 0) {
    console.log('\nRe-aggregating dashboard data...');
    execFileSync('node', ['scripts/aggregate-processed.js'], { stdio: 'inherit' });
  }
}

main();
