#!/usr/bin/env node
/**
 * Git Analytics Aggregation Script
 *
 * Combines data from multiple repositories into a single aggregated dataset.
 * Supports author identity mapping for normalizing contributors across repos.
 *
 * NOTE: This script aggregates RAW data. Tags and complexity fields will be
 * empty/null until AI populates them via the @data persona (see EXTRACTION_PLAYBOOK.md).
 *
 * Usage:
 *   node aggregate.js reports/repo-a reports/repo-b --output=aggregated
 *   node aggregate.js reports/* --author-map=config/author-map.json
 */

import fs from 'fs';
import path from 'path';

// === Argument Parsing ===
const args = process.argv.slice(2);
let outputDir = 'aggregated';
let authorMapPath = null;
const inputPaths = [];

args.forEach(arg => {
  if (arg.startsWith('--output=')) {
    outputDir = arg.split('=')[1];
  } else if (arg.startsWith('--author-map=')) {
    authorMapPath = arg.split('=')[1];
  } else if (!arg.startsWith('--')) {
    inputPaths.push(arg);
  }
});

if (inputPaths.length === 0) {
  console.log(`
Git Analytics Aggregation Script

Usage:
  node aggregate.js <repo-dirs...> [options]

Arguments:
  <repo-dirs>     Paths to extracted repo directories (containing data.json)

Options:
  --output=DIR       Output directory (default: aggregated)
  --author-map=FILE  Path to author mapping JSON file

Examples:
  node aggregate.js reports/repo-a reports/repo-b
  node aggregate.js reports/* --output=combined --author-map=config/author-map.json
`);
  process.exit(0);
}

// === Author Mapping ===
function loadAuthorMap(filePath) {
  if (!filePath) return null;

  try {
    const content = fs.readFileSync(filePath, 'utf-8');
    const config = JSON.parse(content);

    // Build reverse lookup: email -> author_id
    const emailToAuthorId = new Map();
    const authorIdToName = new Map();

    for (const [authorId, author] of Object.entries(config.authors || {})) {
      authorIdToName.set(authorId, author.name);
      for (const email of author.emails || []) {
        emailToAuthorId.set(email.toLowerCase(), authorId);
      }
    }

    console.log(`Loaded author map with ${authorIdToName.size} authors`);
    return { emailToAuthorId, authorIdToName };
  } catch (error) {
    console.error(`Warning: Could not load author map: ${error.message}`);
    return null;
  }
}

function resolveAuthorId(email, authorMap) {
  if (!authorMap) return null;
  return authorMap.emailToAuthorId.get(email.toLowerCase()) || null;
}

function resolveAuthorName(authorId, authorMap) {
  if (!authorMap || !authorId) return null;
  return authorMap.authorIdToName.get(authorId) || null;
}

// === Data Loading ===
function loadRepoData(repoPath) {
  // Try to find data.json
  let dataPath = repoPath;

  if (fs.statSync(repoPath).isDirectory()) {
    dataPath = path.join(repoPath, 'data.json');
  }

  if (!fs.existsSync(dataPath)) {
    console.error(`Warning: No data.json found at ${dataPath}`);
    return null;
  }

  try {
    const content = fs.readFileSync(dataPath, 'utf-8');
    const data = JSON.parse(content);

    // Derive repo_id from directory name or metadata
    const repoId = data.metadata?.repository ||
                   path.basename(path.dirname(dataPath)) ||
                   'unknown';

    return { ...data, repoId };
  } catch (error) {
    console.error(`Warning: Could not parse ${dataPath}: ${error.message}`);
    return null;
  }
}

// === Aggregation ===
function aggregateData(repoDataList, authorMap) {
  const allCommits = [];
  const allFiles = new Map();
  const contributorMap = new Map();
  const repoMetadata = [];

  for (const repoData of repoDataList) {
    const repoId = repoData.repoId;
    console.log(`Processing ${repoId}: ${repoData.commits?.length || 0} commits`);

    // Collect metadata
    repoMetadata.push({
      repoId,
      repository: repoData.metadata?.repository,
      remoteUrl: repoData.metadata?.remoteUrl,
      commitCount: repoData.commits?.length || 0,
      contributorCount: repoData.contributors?.length || 0,
      dateRange: repoData.summary?.dateRange
    });

    // Process commits
    for (const commit of repoData.commits || []) {
      // Add repo_id to commit
      const enrichedCommit = {
        ...commit,
        repo_id: repoId
      };

      // Ensure author_id exists (from new schema or derived from email)
      if (!enrichedCommit.author_id && commit.author?.email) {
        enrichedCommit.author_id = commit.author.email.toLowerCase();
      }

      // Resolve author identity from author map (overrides default)
      const mappedAuthorId = resolveAuthorId(commit.author?.email, authorMap);
      if (mappedAuthorId) {
        enrichedCommit.author_id = mappedAuthorId;
        enrichedCommit.author_canonical = resolveAuthorName(mappedAuthorId, authorMap);
      }

      allCommits.push(enrichedCommit);

      // Aggregate contributor stats
      const contributorKey = mappedAuthorId || commit.author?.email?.toLowerCase() || 'unknown';

      if (!contributorMap.has(contributorKey)) {
        contributorMap.set(contributorKey, {
          author_id: mappedAuthorId || commit.author?.email?.toLowerCase(),
          email: commit.author?.email,
          emails: new Set([commit.author?.email]),
          names: new Set([commit.author?.name]),
          canonicalName: resolveAuthorName(mappedAuthorId, authorMap),
          commits: 0,
          additions: 0,
          deletions: 0,
          repos: new Set(),
          tagCounts: {},
          firstCommit: commit.timestamp,
          lastCommit: commit.timestamp
        });
      }

      const contributor = contributorMap.get(contributorKey);
      contributor.emails.add(commit.author?.email);
      contributor.names.add(commit.author?.name);
      contributor.repos.add(repoId);
      contributor.commits++;
      contributor.additions += commit.stats?.additions || 0;
      contributor.deletions += commit.stats?.deletions || 0;

      // Count each tag occurrence (will be empty until AI populates)
      const tags = commit.tags || [];
      for (const tag of tags) {
        contributor.tagCounts[tag] = (contributor.tagCounts[tag] || 0) + 1;
      }

      if (commit.timestamp < contributor.firstCommit) {
        contributor.firstCommit = commit.timestamp;
      }
      if (commit.timestamp > contributor.lastCommit) {
        contributor.lastCommit = commit.timestamp;
      }
    }

    // Aggregate file stats
    for (const file of repoData.files || []) {
      const fileKey = `${repoId}:${file.path}`;

      if (!allFiles.has(fileKey)) {
        allFiles.set(fileKey, {
          repo_id: repoId,
          path: file.path,
          changeCount: 0,
          tagCounts: {},
          authors: new Set()
        });
      }

      const fileStats = allFiles.get(fileKey);
      fileStats.changeCount += file.changeCount;
      for (const [tag, count] of Object.entries(file.tagCounts || {})) {
        fileStats.tagCounts[tag] = (fileStats.tagCounts[tag] || 0) + count;
      }
      for (const author of file.authors || []) {
        fileStats.authors.add(author);
      }
    }
  }

  // Sort commits by timestamp (newest first)
  allCommits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

  // Convert contributors to array
  const contributors = Array.from(contributorMap.values())
    .map(c => ({
      author_id: c.author_id,
      primaryName: c.canonicalName || Array.from(c.names)[0],
      names: Array.from(c.names),
      email: c.email,
      emails: Array.from(c.emails),
      repos: Array.from(c.repos),
      repoCount: c.repos.size,
      commits: c.commits,
      additions: c.additions,
      deletions: c.deletions,
      tagCounts: c.tagCounts,
      firstCommit: c.firstCommit,
      lastCommit: c.lastCommit
    }))
    .sort((a, b) => b.commits - a.commits);

  // Convert files to array
  const files = Array.from(allFiles.values())
    .map(f => ({
      ...f,
      authors: Array.from(f.authors)
    }))
    .sort((a, b) => b.changeCount - a.changeCount);

  return {
    commits: allCommits,
    contributors,
    files,
    repoMetadata
  };
}

function generateSummary(aggregated, repoDataList) {
  const { commits, contributors, repoMetadata } = aggregated;

  const tagBreakdown = {};
  const complexityBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, null: 0 };
  const monthlyCommits = {};
  const repoBreakdown = {};
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const commit of commits) {
    // Tag breakdown (count each tag) - will be empty until AI populates
    const tags = commit.tags || [];
    for (const tag of tags) {
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
    const month = commit.timestamp?.substring(0, 7) || 'unknown';
    if (!monthlyCommits[month]) {
      monthlyCommits[month] = { total: 0, tags: {}, repos: {} };
    }
    monthlyCommits[month].total++;
    for (const tag of tags) {
      monthlyCommits[month].tags[tag] = (monthlyCommits[month].tags[tag] || 0) + 1;
    }
    monthlyCommits[month].repos[commit.repo_id] = (monthlyCommits[month].repos[commit.repo_id] || 0) + 1;

    // Repo breakdown
    repoBreakdown[commit.repo_id] = (repoBreakdown[commit.repo_id] || 0) + 1;

    // Totals
    totalAdditions += commit.stats?.additions || 0;
    totalDeletions += commit.stats?.deletions || 0;
  }

  // Security commits across all repos - will be empty until AI tags
  const securityCommits = commits.filter(c => (c.tags || []).includes('security'));

  const security_events = securityCommits.map(c => ({
    sha: c.sha,
    subject: c.subject,
    timestamp: c.timestamp,
    author_id: c.author_id,
    repo_id: c.repo_id
  }));

  // Date range across all repos
  const timestamps = commits
    .map(c => c.timestamp)
    .filter(Boolean)
    .sort();

  return {
    totalRepos: repoMetadata.length,
    totalCommits: commits.length,
    totalContributors: contributors.length,
    totalAdditions,
    totalDeletions,
    netLinesChanged: totalAdditions - totalDeletions,
    tagBreakdown,
    complexityBreakdown,
    repoBreakdown,
    monthlyCommits,
    securityCommitCount: securityCommits.length,
    security_events,
    dateRange: {
      earliest: timestamps[0] || null,
      latest: timestamps[timestamps.length - 1] || null
    },
    repos: repoMetadata
  };
}

// === Main Execution ===
function main() {
  console.log(`\nGit Analytics Aggregation`);
  console.log(`Input paths: ${inputPaths.length}`);
  console.log(`Output: ${outputDir}\n`);

  // Load author map if provided
  const authorMap = loadAuthorMap(authorMapPath);

  // Load all repo data
  const repoDataList = [];
  for (const inputPath of inputPaths) {
    const data = loadRepoData(inputPath);
    if (data) {
      repoDataList.push(data);
    }
  }

  if (repoDataList.length === 0) {
    console.error('Error: No valid repository data found');
    process.exit(1);
  }

  console.log(`\nLoaded ${repoDataList.length} repositories\n`);

  // Aggregate data
  const aggregated = aggregateData(repoDataList, authorMap);
  const summary = generateSummary(aggregated, repoDataList);

  // Build authors map from contributors
  const authors = {};
  for (const contributor of aggregated.contributors) {
    authors[contributor.author_id] = {
      name: contributor.primaryName,
      email: contributor.email,
      emails: contributor.emails
    };
  }

  // Create metadata
  const metadata = {
    aggregatedAt: new Date().toISOString(),
    repoCount: repoDataList.length,
    repos: summary.repos.map(r => r.repoId),
    authorMapUsed: !!authorMapPath,
    authors
  };

  // Create output directory
  fs.mkdirSync(outputDir, { recursive: true });

  // Write JSON files
  const writeJson = (filename, data) => {
    const filepath = path.join(outputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Wrote ${filepath}`);
  };

  writeJson('metadata.json', metadata);
  writeJson('commits.json', { commits: aggregated.commits });
  writeJson('contributors.json', aggregated.contributors);
  writeJson('files.json', aggregated.files);
  writeJson('summary.json', summary);

  // Write combined data file for dashboard
  writeJson('data.json', {
    metadata: {
      ...metadata,
      repository: `Aggregated (${repoDataList.length} repos)`
    },
    commits: aggregated.commits,
    contributors: aggregated.contributors,
    files: aggregated.files,
    summary
  });

  console.log(`\nAggregation complete!`);
  console.log(`  Repositories: ${repoDataList.length}`);
  console.log(`  Total commits: ${aggregated.commits.length}`);
  console.log(`  Total contributors: ${aggregated.contributors.length}`);
  console.log(`  Files tracked: ${aggregated.files.length}`);
  console.log(`\nData written to: ${outputDir}/`);
}

main();
