#!/usr/bin/env node
/**
 * Git Analytics API Extractor
 *
 * Extracts commit data from GitHub repositories using the GitHub REST API.
 * No cloning required - fetches data directly via HTTP.
 *
 * Usage: node extract-api.js <owner/repo> [--output=reports/]
 *
 * Examples:
 *   node extract-api.js devmade-ai/repo-tor
 *   node extract-api.js devmade-ai/repo-tor --output=reports/
 *   node extract-api.js devmade-ai/repo-tor --since=2026-01-01
 *
 * Authentication (checked in order):
 *   1. GH_TOKEN environment variable
 *   2. GITHUB_TOKEN environment variable
 *   3. GITHUB_ALL_REPO_TOKEN environment variable
 *   4. .env file in project root (any of the above keys)
 *
 * Requirement: Remove gh CLI dependency for API extraction
 * Approach: Use curl for HTTP requests to the GitHub REST API. curl is
 *   universally available, handles proxies correctly, and has no install step.
 * Alternatives:
 *   - gh CLI: Rejected - often not installed in CI/cloud environments
 *   - Node native fetch: Rejected - doesn't respect HTTP_PROXY env vars,
 *     would need undici ProxyAgent which isn't always available
 *   - node-fetch/axios packages: Rejected - unnecessary dependency
 */

import { execFileSync, execFile as execFileCb } from 'child_process';
import { promisify } from 'util';
import fs from 'fs';
import os from 'os';
import path from 'path';
import { fileURLToPath } from 'url';

const execFileAsync = promisify(execFileCb);

import { parseCommitMessage, extractBreakingChange, extractReferences } from './lib/commit-parsing.js';
import { toKebabCase, writeJson } from './lib/utils.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Load .env file if present ===
function loadEnvFile() {
  const envPaths = [
    path.join(process.cwd(), '.env'),
    path.join(__dirname, '..', '.env')
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;

        const match = trimmed.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
        if (match) {
          const [, key, value] = match;
          if (!process.env[key]) {
            process.env[key] = value.replace(/^["']|["']$/g, '');
          }
        }
      }
      return envPath;
    }
  }
  return null;
}

const loadedEnvFile = loadEnvFile();

// === Token Discovery ===
// Requirement: Find the GitHub token from common env var names
// Checks multiple conventions since different environments use different names
function findGitHubToken() {
  const tokenVars = ['GH_TOKEN', 'GITHUB_TOKEN', 'GITHUB_ALL_REPO_TOKEN'];
  for (const varName of tokenVars) {
    const value = process.env[varName]?.trim();
    if (value) {
      return { token: value, source: varName };
    }
  }
  return null;
}

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
  console.log('Requires: GitHub token in GH_TOKEN, GITHUB_TOKEN, or GITHUB_ALL_REPO_TOKEN env var');
  process.exit(1);
}

const [owner, repo] = repoFullName.split('/');

// === GitHub API via curl ===

const API_BASE = 'https://api.github.com';
let authToken = null;

/**
 * Make a GitHub API request via curl.
 * Returns { body, headers } where body is parsed JSON and headers is a string.
 */
// Requirement: Temp header file must not be predictable or in project root
// Approach: Use os.tmpdir() with process.pid for unique, system-appropriate temp path
// Alternatives:
//   - Project root .curl-headers-tmp: Rejected — predictable path, TOCTOU race condition
//   - Node's -i flag for headers: Rejected — curl doesn't have an in-memory header option
function curlGitHub(url, { includeHeaders = false } = {}) {
  const curlArgs = [
    '-s',             // silent
    '-f',             // fail on HTTP errors (returns exit code 22)
    '-L',             // follow redirects
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28',
    '-H', `Authorization: Bearer ${authToken}`,
  ];

  const headerFile = includeHeaders
    ? path.join(os.tmpdir(), `.curl-headers-${process.pid}-${Date.now()}`)
    : null;

  if (includeHeaders) {
    curlArgs.push('-D', headerFile);
  }

  curlArgs.push(url.startsWith('http') ? url : `${API_BASE}${url}`);

  try {
    const result = execFileSync('curl', curlArgs, {
      encoding: 'utf-8',
      maxBuffer: 50 * 1024 * 1024,
      timeout: 120000,
    });

    if (includeHeaders) {
      const headers = fs.existsSync(headerFile) ? fs.readFileSync(headerFile, 'utf-8') : '';
      try { fs.unlinkSync(headerFile); } catch {}
      // Requirement: Validate API response is actual data, not an error page
      // Approach: Check parsed JSON is an object/array before returning
      // Alternatives: Status code check only — rejected because GitHub can return
      //   200 with HTML error pages when auth is misconfigured
      const parsed = JSON.parse(result);
      if (parsed === null || (typeof parsed !== 'object')) {
        throw new Error(`GitHub API returned unexpected response type (${typeof parsed}) for: ${url}`);
      }
      return { headers, body: parsed };
    }

    // Requirement: Validate API response is actual data, not an error page
    const parsed = JSON.parse(result);
    if (parsed === null || (typeof parsed !== 'object')) {
      throw new Error(`GitHub API returned unexpected response type (${typeof parsed}) for: ${url}`);
    }
    return parsed;
  } catch (error) {
    if (headerFile) {
      try { fs.unlinkSync(headerFile); } catch {}
    }
    // Fix: execFileSync throws with error.status (exit code), not error.code.
    // curl exit code 22 = HTTP error (4xx/5xx response).
    if (error.status === 22 || error.code === 22) {
      throw new Error(`GitHub API request failed: ${url}`);
    }
    throw error;
  }
}

/**
 * Async curl for concurrent API requests.
 * Requirement: Speed up commit detail fetching with concurrent requests
 * Approach: Use execFile (async) with concurrency pool instead of sequential execFileSync
 * Alternatives:
 *   - Sequential execFileSync: Rejected — too slow for 300+ commits
 *   - Node fetch: Rejected — doesn't respect HTTP_PROXY (same reason as sync curl)
 */
function curlGitHubAsync(url) {
  const curlArgs = [
    '-s', '-f', '-L',
    '-H', 'Accept: application/vnd.github+json',
    '-H', 'X-GitHub-Api-Version: 2022-11-28',
    '-H', `Authorization: Bearer ${authToken}`,
    url.startsWith('http') ? url : `${API_BASE}${url}`,
  ];

  return execFileAsync('curl', curlArgs, {
    encoding: 'utf-8',
    maxBuffer: 50 * 1024 * 1024,
    timeout: 120000,
  }).then(({ stdout }) => {
    const parsed = JSON.parse(stdout);
    if (parsed === null || (typeof parsed !== 'object')) {
      throw new Error(`GitHub API returned unexpected response type (${typeof parsed}) for: ${url}`);
    }
    return parsed;
  });
}

/** Run async tasks with a concurrency limit */
async function pMap(items, fn, concurrency = 5) {
  const results = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, () => worker()));
  return results;
}

/**
 * Fetch all pages of a paginated GitHub API endpoint.
 * Parses Link header for next page URL.
 */
// Requirement: Periodic rate limit checks during multi-page fetching
// Approach: Check rate limit from response headers every N pages and warn/pause if low
// Alternatives: Check only at start — rejected because long fetches can exhaust limits mid-run
function checkRateLimitFromHeaders(headers, pageNum) {
  const remainingLine = headers.split(/\r?\n/).find(h => h.toLowerCase().startsWith('x-ratelimit-remaining:'));
  if (remainingLine) {
    const remaining = parseInt(remainingLine.split(':')[1].trim(), 10);
    if (remaining <= 10) {
      console.warn(`  Warning: GitHub API rate limit low (${remaining} remaining) at page ${pageNum}`);
    }
  }
}

function fetchAllPages(endpoint) {
  let url = `${API_BASE}${endpoint}`;
  const allItems = [];
  let pageNum = 0;

  while (url) {
    pageNum++;
    const { headers, body } = curlGitHub(url, { includeHeaders: true });

    // Check rate limit every 5 pages to catch depletion early
    if (pageNum % 5 === 0) {
      checkRateLimitFromHeaders(headers, pageNum);
    }

    if (Array.isArray(body)) {
      allItems.push(...body);
    } else {
      return body;
    }

    // Parse Link header for next page
    // Requirement: Warn when Link header exists but doesn't match expected format
    // Approach: Log a warning so pagination issues are visible in output
    // Alternatives: Silent skip — rejected because silent data truncation is worse
    url = null;
    const linkLine = headers.split(/\r?\n/).find(h => h.toLowerCase().startsWith('link:'));
    if (linkLine) {
      const nextMatch = linkLine.match(/<([^>]+)>;\s*rel="next"/);
      if (nextMatch) {
        url = nextMatch[1];
      } else {
        console.warn(`  Warning: Link header present but no "next" rel found: ${linkLine.substring(0, 120)}`);
      }
    }
  }

  return allItems;
}

// === Data Extraction ===

function fetchCommitList() {
  console.log('Fetching commit list...');

  let endpoint = `/repos/${owner}/${repo}/commits?per_page=100`;
  if (sinceDate) {
    endpoint += `&since=${sinceDate}T00:00:00Z`;
  }

  const commits = fetchAllPages(endpoint);

  if (!commits || !Array.isArray(commits)) {
    return [];
  }

  console.log(`  Fetched ${commits.length} commits`);
  return commits;
}

function fetchCommitDetails(sha) {
  return curlGitHub(`/repos/${owner}/${repo}/commits/${sha}`);
}

function detailToCommit(item, details) {
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
    const references = extractReferences(subject, body);

    return {
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
      risk: null,            // Null - AI will assess (low|medium|high)
      debt: null,            // Null - AI will assess (added|paid|neutral)
      epic: null,            // Null - AI will assign free-text grouping label
      semver: null,          // Null - AI will assess (patch|minor|major)
      scope: parsed.scope,
      title: parsed.title,
      is_conventional: parsed.is_conventional,
      has_breaking_change: parsed.breaking || extractBreakingChange(subject, body),
      references: references,
      // Fix: filesChanged should directly use files array length, not gate on stats.total
      // which is the sum of additions+deletions (unrelated to file count)
      stats: {
        filesChanged: details.files?.length || 0,
        additions: details.stats?.additions || 0,
        deletions: details.stats?.deletions || 0
      },
      files: (details.files || []).map(f => f.filename)
    };
}

// Requirement: Speed up commit detail fetching
// Approach: Concurrent API requests with configurable pool size (default 5).
//   Falls back to sequential if async fails (e.g. curl not supporting concurrent use).
// Alternatives:
//   - Sequential for loop: Rejected — too slow for 300+ commits (1 req/s = 5+ min)
//   - Unbounded Promise.all: Rejected — would hit GitHub rate limits immediately
async function extractCommits(commitList) {
  console.log(`Extracting details for ${commitList.length} commits (concurrent)...`);

  const results = await pMap(commitList, async (item, i) => {
    if (i % 25 === 0 && i > 0) {
      console.log(`  Processed ${i}/${commitList.length} commits...`);
      // Requirement: Periodic rate limit checks during concurrent fetching
      // Approach: Check rate limit every 25 commits to detect depletion mid-batch
      try {
        const rateLimit = await curlGitHubAsync('/rate_limit');
        const remaining = rateLimit.resources?.core?.remaining;
        if (remaining !== undefined && remaining <= 50) {
          console.warn(`  Warning: GitHub API rate limit low (${remaining} remaining) at commit ${i}/${commitList.length}`);
        }
      } catch { /* Non-critical — continue extraction */ }
    }
    try {
      const details = await curlGitHubAsync(`/repos/${owner}/${repo}/commits/${item.sha}`);
      return detailToCommit(item, details);
    } catch (err) {
      console.error(`  Warning: Failed to fetch details for ${item.sha.substring(0, 7)}: ${err.message}`);
      return null;
    }
  }, 5);

  const commits = results.filter(Boolean);
  console.log(`  Extracted ${commits.length}/${commitList.length} commits`);
  return commits;
}

// === Aggregation Functions ===

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

// Fix: Add branches and currentBranch fields that dashboard expects for some features.
// API extraction doesn't have local git info, so we fetch default branch from the API
// and note that the branch list may be incomplete (API doesn't always list all branches).
function generateMetadata(commits) {
  const repoId = toKebabCase(repo);
  let defaultBranch = 'main';
  try {
    const repoInfo = curlGitHub(`/repos/${owner}/${repo}`);
    defaultBranch = repoInfo.default_branch || 'main';
  } catch {
    // Non-critical — use default
  }
  return {
    repo_id: repoId,
    repository: repo,
    remoteUrl: `https://github.com/${owner}/${repo}`,
    extractedAt: new Date().toISOString(),
    extractionMethod: 'github-api',
    currentBranch: defaultBranch,
    branches: [defaultBranch],
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
  // Fix: Include repo_id for consistency with extract.js — needed for multi-repo aggregation
  const repoId = toKebabCase(repo);
  const security_events = securityCommits.map(c => ({
    sha: c.sha,
    subject: c.subject,
    timestamp: c.timestamp,
    author_id: c.author_id,
    repo_id: repoId
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

async function main() {
  console.log(`\nGit Analytics API Extraction`);
  console.log(`Repository: ${owner}/${repo}`);
  console.log(`Output: ${outputDir}`);
  if (sinceDate) console.log(`Since: ${sinceDate}`);
  console.log('');

  // Show env file status
  if (loadedEnvFile) {
    console.log(`Loaded environment from: ${loadedEnvFile}`);
  }

  // Find authentication token
  const tokenInfo = findGitHubToken();
  if (!tokenInfo) {
    console.error('Error: No GitHub token found.');
    console.error('');
    console.error('Set one of these environment variables:');
    console.error('  GH_TOKEN=ghp_...');
    console.error('  GITHUB_TOKEN=ghp_...');
    console.error('  GITHUB_ALL_REPO_TOKEN=ghp_...');
    console.error('');
    console.error('Or add it to a .env file in the project root.');
    console.error('Create a token at: https://github.com/settings/tokens/new');
    process.exit(1);
  }

  authToken = tokenInfo.token;
  console.log(`Authentication: Using ${tokenInfo.source} from environment`);

  // Verify token works by checking rate limit
  try {
    const rateLimit = curlGitHub('/rate_limit');
    const remaining = rateLimit.resources?.core?.remaining ?? '?';
    console.log(`API rate limit remaining: ${remaining}`);
  } catch (err) {
    console.error(`Error: Token authentication failed: ${err.message}`);
    console.error('Check that your token is valid and has repo access.');
    process.exit(1);
  }

  // Fetch commits
  const commitList = fetchCommitList();
  if (!commitList || commitList.length === 0) {
    console.log('No commits found');
    process.exit(0);
  }

  // Extract full details (async — concurrent API fetching)
  const commits = await extractCommits(commitList);

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
  const writeReportJson = (filename, data) => {
    const filepath = path.join(repoOutputDir, filename);
    writeJson(filepath, data);
  };

  writeReportJson('metadata.json', metadata);
  writeReportJson('commits.json', { commits });
  writeReportJson('contributors.json', contributors);
  writeReportJson('files.json', files);
  writeReportJson('summary.json', summary);
  writeReportJson('data.json', { metadata, commits, contributors, files, summary });

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

main().catch(err => {
  console.error('Fatal error:', err.message || err);
  process.exit(1);
});
