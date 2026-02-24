#!/usr/bin/env node
/**
 * Git Analytics Extraction Script
 *
 * Extracts commit data from a git repository and outputs structured JSON
 * for the analytics dashboard.
 *
 * NOTE: This script extracts RAW data only. Tags and complexity are left
 * empty for AI analysis via the @data persona (see EXTRACTION_PLAYBOOK.md).
 *
 * Usage: node extract.js [repo-path] [--output=reports/]
 */

import { execFileSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { parseCommitMessage, extractBreakingChange, extractReferences } from './lib/commit-parsing.js';
import { toKebabCase, writeJson } from './lib/utils.js';

// === Argument Parsing ===
const args = process.argv.slice(2);
let repoPath = process.cwd();
let outputDir = 'reports';

args.forEach(arg => {
  if (arg.startsWith('--output=')) {
    outputDir = arg.split('=')[1];
  } else if (!arg.startsWith('--')) {
    repoPath = path.resolve(arg);
  }
});

// === Git Command Execution ===
function git(args, cwd) {
  try {
    const result = execFileSync('git', args, {
      cwd: cwd || repoPath,
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024
    });
    return result.trim();
  } catch (err) {
    console.error(`Git command failed: git ${args.join(' ')}`);
    return '';
  }
}

// === Data Extraction ===
function extractCommits() {
  console.log('Extracting commits...');

  // Custom format for parsing
  const delimiter = '---COMMIT_DELIMITER---';
  const format = [
    '%H',      // full hash
    '%h',      // short hash
    '%an',     // author name
    '%ae',     // author email
    '%aI',     // author date ISO
    '%cn',     // committer name
    '%ce',     // committer email
    '%cI',     // commit date ISO
    '%s',      // subject
    '%b',      // body
  ].join('%n');

  const logOutput = git(['log', '--all', `--pretty=format:${format}${delimiter}`]);

  if (!logOutput) {
    console.log('No commits found or git log failed');
    return [];
  }

  const commitBlocks = logOutput.split(delimiter).filter(Boolean);
  const commits = [];

  for (const block of commitBlocks) {
    const lines = block.trim().split('\n');
    if (lines.length < 9) continue;

    const [hash, shortHash, authorName, authorEmail, authorDate,
           committerName, committerEmail, commitDate, subject, ...bodyLines] = lines;

    const body = bodyLines.join('\n').trim();
    const parsed = parseCommitMessage(subject);
    const references = extractReferences(subject, body);

    // Check for breaking change in body
    const hasBreakingChange = extractBreakingChange(subject, body) || parsed.breaking;

    commits.push({
      sha: shortHash,
      fullSha: hash,
      author_id: authorEmail.toLowerCase(),
      author: {
        name: authorName,
        email: authorEmail
      },
      committer: {
        name: committerName,
        email: committerEmail
      },
      timestamp: authorDate,
      commitDate: commitDate,
      subject: subject,
      body: body,
      tags: [],              // Empty - AI will populate via @data persona
      complexity: null,      // Null - AI will calculate after tagging
      risk: null,            // Null - AI will assess (low|medium|high)
      debt: null,            // Null - AI will assess (added|paid|neutral)
      epic: null,            // Null - AI will assign free-text grouping label
      semver: null,          // Null - AI will assess (patch|minor|major)
      scope: parsed.scope,
      title: parsed.title,
      is_conventional: parsed.is_conventional,
      has_breaking_change: hasBreakingChange,  // Flag for AI to consider
      references: references
    });
  }

  // Requirement: Batch git stat extraction for performance
  // Approach: Single `git log --numstat` command to get all stats+files in one pass,
  //   then merge results into the existing commits array by SHA lookup.
  // Alternatives:
  //   - Per-commit `git show --stat` + `git show --name-only` (2 calls/commit):
  //     Rejected — O(2n) git processes, extremely slow for 1000+ commits
  //   - `git diff-tree --numstat`: Rejected — needs per-commit calls for boundary handling
  console.log(`Extracting stats for ${commits.length} commits (batched)...`);

  const numstatOutput = git(['log', '--all', '--numstat', '--format=COMMIT_BOUNDARY:%H']);
  if (numstatOutput) {
    const statsByFullSha = new Map();
    let currentSha = null;
    let currentStats = { additions: 0, deletions: 0, files: [] };

    for (const line of numstatOutput.split('\n')) {
      if (line.startsWith('COMMIT_BOUNDARY:')) {
        // Save previous commit's stats
        if (currentSha) {
          statsByFullSha.set(currentSha, { ...currentStats, filesChanged: currentStats.files.length });
        }
        currentSha = line.substring('COMMIT_BOUNDARY:'.length).trim();
        currentStats = { additions: 0, deletions: 0, files: [] };
      } else if (line.trim() && currentSha) {
        // numstat format: "additions\tdeletions\tfilename" (binary files show "-\t-\t")
        const parts = line.split('\t');
        if (parts.length >= 3) {
          const add = parts[0] === '-' ? 0 : parseInt(parts[0]) || 0;
          const del = parts[1] === '-' ? 0 : parseInt(parts[1]) || 0;
          currentStats.additions += add;
          currentStats.deletions += del;
          currentStats.files.push(parts.slice(2).join('\t'));
        }
      }
    }
    // Requirement: Ensure the last commit's stats are always saved
    // Approach: Explicitly flush the last accumulated stats after the loop ends,
    //   because the loop only saves when it encounters the NEXT commit boundary
    // Alternatives: Sentinel value at end of output — rejected because it couples
    //   parsing logic to git format assumptions
    if (currentSha) {
      statsByFullSha.set(currentSha, { ...currentStats, filesChanged: currentStats.files.length });
    }

    // Merge stats into commits
    for (const commit of commits) {
      const stats = statsByFullSha.get(commit.fullSha);
      if (stats) {
        commit.stats = {
          filesChanged: stats.filesChanged,
          additions: stats.additions,
          deletions: stats.deletions
        };
        commit.files = stats.files;
      } else {
        commit.stats = { filesChanged: 0, additions: 0, deletions: 0 };
        commit.files = [];
      }
    }
  } else {
    // Requirement: Clarify this fallback is intentional, not dead code
    // Approach: This branch runs when `git log --numstat` returns empty output,
    //   which happens if git() fails (returns '') or the repo has no diffable history.
    //   The merge loop above (lines 162-175) already handles individual commits missing
    //   from statsByFullSha, but this branch covers the case where numstatOutput itself
    //   is falsy — zero commits would be in the map, so all would get zeroed individually.
    //   Keeping this explicit fallback avoids commits having undefined stats/files fields.
    console.warn('Warning: git log --numstat returned no output, stats will be zeroed');
    for (const commit of commits) {
      commit.stats = { filesChanged: 0, additions: 0, deletions: 0 };
      commit.files = [];
    }
  }

  return commits;
}

function extractContributors(commits) {
  console.log('Aggregating contributors...');

  const contributorMap = new Map();

  for (const commit of commits) {
    const key = commit.author.email.toLowerCase();

    if (!contributorMap.has(key)) {
      contributorMap.set(key, {
        author_id: key,
        email: commit.author.email,
        names: new Set([commit.author.name]),
        commits: 0,
        additions: 0,
        deletions: 0,
        firstCommit: commit.timestamp,
        lastCommit: commit.timestamp,
        tagCounts: {}
      });
    }

    const contributor = contributorMap.get(key);
    contributor.names.add(commit.author.name);
    contributor.commits++;
    contributor.additions += commit.stats.additions;
    contributor.deletions += commit.stats.deletions;

    // Count each tag occurrence (will be empty until AI populates)
    for (const tag of commit.tags || []) {
      contributor.tagCounts[tag] = (contributor.tagCounts[tag] || 0) + 1;
    }

    if (commit.timestamp < contributor.firstCommit) {
      contributor.firstCommit = commit.timestamp;
    }
    if (commit.timestamp > contributor.lastCommit) {
      contributor.lastCommit = commit.timestamp;
    }
  }

  return Array.from(contributorMap.values()).map(c => ({
    ...c,
    names: Array.from(c.names),
    primaryName: Array.from(c.names)[0]
  })).sort((a, b) => b.commits - a.commits);
}

function buildAuthorsMap(contributors) {
  const authors = {};
  for (const contributor of contributors) {
    authors[contributor.author_id] = {
      name: contributor.primaryName,
      email: contributor.email,
      emails: [contributor.email]
    };
  }
  return authors;
}

function extractFileStats(commits) {
  console.log('Calculating file statistics...');

  const fileMap = new Map();

  for (const commit of commits) {
    for (const file of commit.files) {
      if (!fileMap.has(file)) {
        fileMap.set(file, {
          path: file,
          changeCount: 0,
          tagCounts: {},
          authors: new Set()
        });
      }

      const fileStats = fileMap.get(file);
      fileStats.changeCount++;

      // Count each tag occurrence for this file (will be empty until AI populates)
      for (const tag of commit.tags || []) {
        fileStats.tagCounts[tag] = (fileStats.tagCounts[tag] || 0) + 1;
      }

      fileStats.authors.add(commit.author.email);
    }
  }

  return Array.from(fileMap.values())
    .map(f => ({
      ...f,
      authors: Array.from(f.authors)
    }))
    .sort((a, b) => b.changeCount - a.changeCount);
}

function generateMetadata() {
  const repoName = path.basename(repoPath);
  const repoId = toKebabCase(repoName);
  const remoteUrl = git(['config', '--get', 'remote.origin.url']) || 'local';
  const currentBranch = git(['rev-parse', '--abbrev-ref', 'HEAD']);
  const branches = git(['branch', '-a', '--format=%(refname:short)']).split('\n').filter(Boolean);

  return {
    repo_id: repoId,
    repository: repoName,
    remoteUrl: remoteUrl,
    currentBranch: currentBranch,
    branches: branches,
    extractedAt: new Date().toISOString(),
    repoPath: repoPath
  };
}

function generateSummary(commits, contributors) {
  const tagBreakdown = {};
  const complexityBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, null: 0 };
  const monthlyCommits = {};
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const commit of commits) {
    // Tag breakdown (count each tag) - will be empty until AI populates
    for (const tag of commit.tags || []) {
      tagBreakdown[tag] = (tagBreakdown[tag] || 0) + 1;
    }

    // Complexity breakdown - will be null until AI calculates
    const complexity = commit.complexity;
    if (complexity !== null && complexityBreakdown[complexity] !== undefined) {
      complexityBreakdown[complexity]++;
    } else {
      complexityBreakdown[null]++;
    }

    // Monthly aggregation
    const month = commit.timestamp.substring(0, 7); // YYYY-MM
    if (!monthlyCommits[month]) {
      monthlyCommits[month] = { total: 0, tags: {} };
    }
    monthlyCommits[month].total++;
    for (const tag of commit.tags || []) {
      monthlyCommits[month].tags[tag] = (monthlyCommits[month].tags[tag] || 0) + 1;
    }

    // Totals
    totalAdditions += commit.stats.additions;
    totalDeletions += commit.stats.deletions;
  }

  // Security commits with details - will be empty until AI tags
  const securityCommits = commits.filter(c => (c.tags || []).includes('security'));

  const security_events = securityCommits.map(c => ({
    sha: c.sha,
    subject: c.subject,
    timestamp: c.timestamp,
    author_id: c.author_id,
    repo_id: c.repo_id
  }));

  return {
    totalCommits: commits.length,
    totalContributors: contributors.length,
    totalAdditions,
    totalDeletions,
    netLinesChanged: totalAdditions - totalDeletions,
    tagBreakdown,
    complexityBreakdown,
    monthlyCommits,
    securityCommitCount: securityCommits.length,
    security_events,
    dateRange: {
      earliest: commits.length > 0 ? commits[commits.length - 1].timestamp : null,
      latest: commits.length > 0 ? commits[0].timestamp : null
    }
  };
}

// === Individual Commit File Generation ===

function writeCommitFiles(commits, commitsDir) {
  fs.mkdirSync(commitsDir, { recursive: true });

  console.log(`\nWriting ${commits.length} individual commit files...`);

  for (const commit of commits) {
    const commitFile = path.join(commitsDir, `${commit.sha}.json`);
    fs.writeFileSync(commitFile, JSON.stringify(commit, null, 2));
  }

  console.log(`  Wrote ${commits.length} commit files to ${commitsDir}/`);
  return commits.length;
}

// === Main Execution ===
function main() {
  console.log(`\nGit Analytics Extraction`);
  console.log(`Repository: ${repoPath}`);
  console.log(`Output: ${outputDir}\n`);

  // Verify git repository
  const gitDir = git(['rev-parse', '--git-dir']);
  if (!gitDir) {
    console.error('Error: Not a git repository');
    process.exit(1);
  }

  // Extract all data
  const metadata = generateMetadata();
  const commits = extractCommits();

  // Add repo_id to each commit for aggregation support
  for (const commit of commits) {
    commit.repo_id = metadata.repo_id;
  }

  const contributors = extractContributors(commits);
  const files = extractFileStats(commits);
  const summary = generateSummary(commits, contributors);

  // Build authors map and add to metadata
  const authors = buildAuthorsMap(contributors);
  metadata.authors = authors;

  // Create output directory
  const repoOutputDir = path.join(outputDir, metadata.repository);
  fs.mkdirSync(repoOutputDir, { recursive: true });

  // Write JSON files
  writeJson(path.join(repoOutputDir, 'metadata.json'), metadata);
  writeJson(path.join(repoOutputDir, 'commits.json'), { commits });
  writeJson(path.join(repoOutputDir, 'contributors.json'), contributors);
  writeJson(path.join(repoOutputDir, 'files.json'), files);
  writeJson(path.join(repoOutputDir, 'summary.json'), summary);

  // Write combined data file for dashboard
  writeJson(path.join(repoOutputDir, 'data.json'), {
    metadata,
    commits,
    contributors,
    files,
    summary
  });

  // Write individual commit files for AI analysis
  const commitsDir = path.join(repoOutputDir, 'commits');
  const totalCommitFiles = writeCommitFiles(commits, commitsDir);

  console.log(`\nExtraction complete!`);
  console.log(`  Commits: ${commits.length}`);
  console.log(`  Contributors: ${contributors.length}`);
  console.log(`  Files tracked: ${files.length}`);
  console.log(`  Commit files: ${totalCommitFiles} (for AI analysis)`);
  console.log(`\nData written to: ${repoOutputDir}/`);
}

main();
