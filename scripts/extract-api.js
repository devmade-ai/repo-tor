#!/usr/bin/env node
/**
 * Git Analytics API Extractor
 *
 * Extracts commit data from GitHub repositories using the GitHub API.
 * No cloning required - fetches data directly via gh CLI.
 *
 * Usage: node extract-api.js <owner/repo> [--output=reports/]
 *
 * Examples:
 *   node extract-api.js devmade-ai/repo-tor
 *   node extract-api.js devmade-ai/repo-tor --output=reports/
 *   node extract-api.js devmade-ai/repo-tor --since=2026-01-01
 *
 * Requires: gh CLI installed and authenticated (gh auth login)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// === Argument Parsing ===
const args = process.argv.slice(2);
let repoFullName = null;  // owner/repo format
let outputDir = 'reports';
let sinceDate = null;

args.forEach(arg => {
  if (arg.startsWith('--output=')) {
    outputDir = arg.split('=')[1];
  } else if (arg.startsWith('--since=')) {
    sinceDate = arg.split('=')[1];
  } else if (!arg.startsWith('--') && arg.includes('/')) {
    repoFullName = arg;
  }
});

if (!repoFullName) {
  console.log('Usage: node extract-api.js <owner/repo> [--output=reports/] [--since=YYYY-MM-DD]');
  console.log('');
  console.log('Examples:');
  console.log('  node extract-api.js devmade-ai/repo-tor');
  console.log('  node extract-api.js devmade-ai/repo-tor --since=2026-01-01');
  console.log('');
  console.log('Requires: gh CLI installed and authenticated');
  process.exit(1);
}

const [owner, repo] = repoFullName.split('/');

// === GitHub API Helpers ===

function gh(command) {
  try {
    const result = execSync(`gh ${command}`, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024, // 50MB buffer
      timeout: 120000 // 2 min timeout
    });
    return result.trim();
  } catch (error) {
    if (error.message.includes('gh: command not found')) {
      console.error('Error: gh CLI not found. Install from https://cli.github.com/');
      process.exit(1);
    }
    if (error.message.includes('not logged in')) {
      console.error('Error: Not authenticated. Run: gh auth login');
      process.exit(1);
    }
    console.error(`GitHub API error: ${error.message}`);
    return null;
  }
}

function ghApi(endpoint, options = {}) {
  let cmd = `api "${endpoint}"`;

  if (options.paginate) {
    cmd += ' --paginate';
  }
  if (options.jq) {
    cmd += ` --jq '${options.jq}'`;
  }

  const result = gh(cmd);
  if (!result) return null;

  try {
    return JSON.parse(result);
  } catch (e) {
    // If jq was used, result might be newline-delimited JSON
    if (options.jq) {
      return result.split('\n').filter(Boolean).map(line => {
        try {
          return JSON.parse(line);
        } catch (e) {
          return line;
        }
      });
    }
    return result;
  }
}

// === Data Extraction ===

function fetchCommitList() {
  console.log('Fetching commit list...');

  let endpoint = `repos/${owner}/${repo}/commits?per_page=100`;
  if (sinceDate) {
    endpoint += `&since=${sinceDate}T00:00:00Z`;
  }

  // Use pagination to get all commits
  const commits = [];
  let page = 1;
  let hasMore = true;

  while (hasMore) {
    const pageEndpoint = `${endpoint}&page=${page}`;
    const result = gh(`api "${pageEndpoint}"`);

    if (!result) break;

    const pageCommits = JSON.parse(result);
    if (pageCommits.length === 0) {
      hasMore = false;
    } else {
      commits.push(...pageCommits);
      console.log(`  Fetched page ${page} (${commits.length} commits so far)...`);
      page++;

      // Safety limit
      if (page > 100) {
        console.log('  Warning: Hit 100 page limit (10,000 commits)');
        hasMore = false;
      }
    }
  }

  return commits;
}

function fetchCommitDetails(sha) {
  const result = gh(`api "repos/${owner}/${repo}/commits/${sha}"`);
  if (!result) return null;
  return JSON.parse(result);
}

function extractCommits(commitList) {
  console.log(`Extracting details for ${commitList.length} commits...`);

  const commits = [];

  for (let i = 0; i < commitList.length; i++) {
    const item = commitList[i];

    if (i % 25 === 0 && i > 0) {
      console.log(`  Processed ${i}/${commitList.length} commits...`);
    }

    // Fetch full commit details (includes stats and files)
    const details = fetchCommitDetails(item.sha);
    if (!details) {
      console.error(`  Warning: Failed to fetch details for ${item.sha.substring(0, 7)}`);
      continue;
    }

    // Parse commit message into subject and body
    const messageParts = (details.commit.message || '').split('\n');
    const subject = messageParts[0] || '';
    const body = messageParts.slice(1).join('\n').trim();

    // Extract author info
    const authorName = details.commit.author?.name || details.author?.login || 'Unknown';
    const authorEmail = details.commit.author?.email || `${details.author?.login || 'unknown'}@users.noreply.github.com`;
    const authorDate = details.commit.author?.date || new Date().toISOString();

    // Extract committer info
    const committerName = details.commit.committer?.name || details.committer?.login || authorName;
    const committerEmail = details.commit.committer?.email || authorEmail;
    const committerDate = details.commit.committer?.date || authorDate;

    // Parse conventional commit format
    const parsed = parseCommitMessage(subject);

    // Extract references from message
    const references = extractReferences(subject + '\n' + body);

    commits.push({
      sha: item.sha.substring(0, 7),
      fullSha: item.sha,
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
      commitDate: committerDate,
      subject: subject,
      body: body,
      tags: [],              // Empty - AI will populate
      complexity: null,      // Null - AI will calculate
      scope: parsed.scope,
      title: parsed.title,
      is_conventional: parsed.is_conventional,
      has_breaking_change: parsed.breaking || extractBreakingChange(body),
      references: references,
      stats: {
        filesChanged: details.stats?.total ? details.files?.length || 0 : 0,
        additions: details.stats?.additions || 0,
        deletions: details.stats?.deletions || 0
      },
      files: (details.files || []).map(f => f.filename)
    });
  }

  return commits;
}

// === Commit Message Parsing (same as extract.js) ===

function parseCommitMessage(subject) {
  const result = {
    tags: [],
    scope: null,
    breaking: false,
    title: subject,
    is_conventional: false
  };

  const conventionalMatch = subject.match(/^(\w+)(?:\(([^)]+)\))?(!)?:\s*(.+)$/);
  if (conventionalMatch) {
    const [, type, scope, breaking, title] = conventionalMatch;
    result.scope = scope || null;
    result.breaking = !!breaking;
    result.title = title;
    result.is_conventional = true;
  }

  return result;
}

function extractBreakingChange(body) {
  if (/\bBREAKING\s*CHANGE\b/i.test(body) || /^BREAKING:/im.test(body)) {
    return true;
  }
  return false;
}

function extractReferences(text) {
  const refs = [];
  const hashRefs = text.match(/#\d+/g) || [];
  refs.push(...hashRefs);
  const jiraRefs = text.match(/[A-Z]+-\d+/g) || [];
  refs.push(...jiraRefs);
  const refsMatch = text.match(/^refs?:\s*(.+)$/im);
  if (refsMatch) {
    const lineRefs = refsMatch[1].match(/(#\d+|[A-Z]+-\d+)/g) || [];
    refs.push(...lineRefs);
  }
  return [...new Set(refs)];
}

// === Aggregation Functions (same as extract.js) ===

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
      for (const tag of commit.tags || []) {
        fileStats.tagCounts[tag] = (fileStats.tagCounts[tag] || 0) + 1;
      }
      fileStats.authors.add(commit.author.email);
    }
  }

  return Array.from(fileMap.values())
    .map(f => ({ ...f, authors: Array.from(f.authors) }))
    .sort((a, b) => b.changeCount - a.changeCount);
}

function toKebabCase(str) {
  return str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function generateMetadata(commits) {
  const repoId = toKebabCase(repo);
  return {
    repo_id: repoId,
    repository: repo,
    remoteUrl: `https://github.com/${owner}/${repo}`,
    extractedAt: new Date().toISOString(),
    extractionMethod: 'github-api'
  };
}

function generateSummary(commits, contributors) {
  const tagBreakdown = {};
  const complexityBreakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, null: 0 };
  const monthlyCommits = {};
  let totalAdditions = 0;
  let totalDeletions = 0;

  for (const commit of commits) {
    for (const tag of commit.tags || []) {
      tagBreakdown[tag] = (tagBreakdown[tag] || 0) + 1;
    }

    const complexity = commit.complexity;
    if (complexity !== null && complexityBreakdown[complexity] !== undefined) {
      complexityBreakdown[complexity]++;
    } else {
      complexityBreakdown[null]++;
    }

    const month = commit.timestamp.substring(0, 7);
    if (!monthlyCommits[month]) {
      monthlyCommits[month] = { total: 0, tags: {} };
    }
    monthlyCommits[month].total++;
    for (const tag of commit.tags || []) {
      monthlyCommits[month].tags[tag] = (monthlyCommits[month].tags[tag] || 0) + 1;
    }

    totalAdditions += commit.stats.additions;
    totalDeletions += commit.stats.deletions;
  }

  const securityCommits = commits.filter(c => (c.tags || []).includes('security'));
  const security_events = securityCommits.map(c => ({
    sha: c.sha,
    subject: c.subject,
    timestamp: c.timestamp,
    author_id: c.author_id
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

// === File Writing ===

function writeCommitFiles(commits, commitsDir) {
  fs.mkdirSync(commitsDir, { recursive: true });
  console.log(`Writing ${commits.length} individual commit files...`);

  for (const commit of commits) {
    const commitFile = path.join(commitsDir, `${commit.sha}.json`);
    fs.writeFileSync(commitFile, JSON.stringify(commit, null, 2));
  }

  return commits.length;
}

// === Main Execution ===

function main() {
  console.log(`\nGit Analytics API Extraction`);
  console.log(`Repository: ${owner}/${repo}`);
  console.log(`Output: ${outputDir}`);
  if (sinceDate) console.log(`Since: ${sinceDate}`);
  console.log('');

  // Check gh CLI is available
  try {
    execSync('gh --version', { encoding: 'utf-8', stdio: 'pipe' });
  } catch (e) {
    console.error('Error: gh CLI not found. Install from https://cli.github.com/');
    process.exit(1);
  }

  // Check authentication
  try {
    execSync('gh auth status', { encoding: 'utf-8', stdio: 'pipe' });
  } catch (e) {
    console.error('Error: Not authenticated with GitHub. Run: gh auth login');
    process.exit(1);
  }

  // Fetch commits
  const commitList = fetchCommitList();
  if (!commitList || commitList.length === 0) {
    console.log('No commits found');
    process.exit(0);
  }

  // Extract full details
  const commits = extractCommits(commitList);

  // Add repo_id to each commit
  const repoId = toKebabCase(repo);
  for (const commit of commits) {
    commit.repo_id = repoId;
  }

  // Generate aggregations
  const metadata = generateMetadata(commits);
  metadata.authors = buildAuthorsMap(extractContributors(commits));

  const contributors = extractContributors(commits);
  const files = extractFileStats(commits);
  const summary = generateSummary(commits, contributors);

  // Create output directory
  const repoOutputDir = path.join(outputDir, repo);
  fs.mkdirSync(repoOutputDir, { recursive: true });

  // Write JSON files
  const writeJson = (filename, data) => {
    const filepath = path.join(repoOutputDir, filename);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    console.log(`Wrote ${filepath}`);
  };

  writeJson('metadata.json', metadata);
  writeJson('commits.json', { commits });
  writeJson('contributors.json', contributors);
  writeJson('files.json', files);
  writeJson('summary.json', summary);
  writeJson('data.json', { metadata, commits, contributors, files, summary });

  // Write individual commit files
  const commitsDir = path.join(repoOutputDir, 'commits');
  const totalCommitFiles = writeCommitFiles(commits, commitsDir);

  console.log(`\nExtraction complete!`);
  console.log(`  Commits: ${commits.length}`);
  console.log(`  Contributors: ${contributors.length}`);
  console.log(`  Files tracked: ${files.length}`);
  console.log(`  Commit files: ${totalCommitFiles}`);
  console.log(`\nData written to: ${repoOutputDir}/`);
}

main();
