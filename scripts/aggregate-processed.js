#!/usr/bin/env node
/**
 * Aggregate Processed Data
 *
 * Reads AI-analyzed commits from processed/<repo>/commits/ (or batches/ for legacy)
 * and generates dashboard-ready JSON files with full aggregations.
 *
 * Usage:
 *   node aggregate-processed.js [--output=dashboard]
 *
 * Output:
 *   <output>/data.json           - Overall (all repos combined)
 *   <output>/repos/<repo>.json   - Per-repo (same schema)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// === Configuration ===
const PROCESSED_DIR = path.join(__dirname, '..', 'processed');
// Requirement: Output directly to dashboard/public so Vite includes data in builds
// Approach: Changed from dashboard/ to dashboard/public/ (Vite copies public/ to dist/)
// Alternatives: Post-build copy step — rejected as unnecessary indirection
const DEFAULT_OUTPUT = path.join(__dirname, '..', 'dashboard', 'public');
const AUTHOR_MAP_PATH = path.join(__dirname, '..', 'config', 'author-map.json');

// === Author Identity Mapping ===
let authorMap = null;
let emailToCanonical = {};

// Requirement: Track unmapped authors so silent fallbacks are visible
// Approach: Collect unique unmapped author IDs during aggregation and log a summary
// Alternatives: Warn per-commit — rejected because it would produce thousands of lines
//   for repos with many commits by unmapped authors
const unmappedAuthors = new Set();

function loadAuthorMap() {
  if (!fs.existsSync(AUTHOR_MAP_PATH)) {
    console.warn('Warning: author-map.json not found at ' + AUTHOR_MAP_PATH + ', using raw author IDs');
    return;
  }

  try {
    const content = fs.readFileSync(AUTHOR_MAP_PATH, 'utf-8');
    authorMap = JSON.parse(content);

    // Build reverse lookup: email -> canonical author ID
    for (const [canonicalId, author] of Object.entries(authorMap.authors || {})) {
      for (const email of author.emails || []) {
        emailToCanonical[email.toLowerCase()] = canonicalId;
      }
    }

    console.log(`Loaded author map with ${Object.keys(authorMap.authors || {}).length} authors`);
  } catch (err) {
    console.warn(`Warning: Could not load author-map.json: ${err.message}`);
  }
}

/**
 * Resolve an email/author_id to its canonical author ID.
 * Requirement: Log when authors aren't found in author-map.json
 * Approach: Track unique unmapped authors in a Set; summary logged at end of main()
 * Alternatives: Warn per-call — rejected because it would flood output for large repos
 */
function resolveAuthorId(authorId) {
  if (!authorId) return 'unknown';
  const canonical = emailToCanonical[authorId.toLowerCase()];
  if (!canonical && authorMap) {
    // Only track as unmapped if author-map.json was loaded (otherwise all are "unmapped")
    unmappedAuthors.add(authorId.toLowerCase());
  }
  return canonical || authorId;
}

/**
 * Get display info for an author
 */
function getAuthorInfo(authorId) {
  const canonicalId = resolveAuthorId(authorId);
  if (authorMap?.authors?.[canonicalId]) {
    return {
      id: canonicalId,
      name: authorMap.authors[canonicalId].name,
      email: authorMap.authors[canonicalId].emails?.[0] || authorId
    };
  }
  return {
    id: canonicalId,
    name: canonicalId,
    email: authorId
  };
}

// === Argument Parsing ===
const args = process.argv.slice(2);
let outputDir = DEFAULT_OUTPUT;

args.forEach(arg => {
  if (arg.startsWith('--output=')) {
    outputDir = arg.split('=')[1];
  }
});

// === Data Loading ===

/**
 * Validate that a commit has all required fields
 * Returns error message if invalid, null if valid
 */
function validateCommit(commit, repoName) {
  if (!commit.sha) return 'missing sha';
  if (!commit.timestamp) return 'missing timestamp';
  if (!commit.author_id && !commit.author) return 'missing author';
  // Add repo_id if missing (for backwards compatibility)
  if (!commit.repo_id) commit.repo_id = repoName;
  return null;
}

/**
 * Load individual commit files from a repo's commits/ directory
 * Returns { commits, malformed } where malformed contains commits that need reprocessing
 */
function loadRepoCommits(repoName) {
  const commitsDir = path.join(PROCESSED_DIR, repoName, 'commits');

  if (!fs.existsSync(commitsDir)) {
    console.log(`  No commits directory for ${repoName}, skipping`);
    return { commits: [], malformed: [] };
  }

  const commitFiles = fs.readdirSync(commitsDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (commitFiles.length === 0) {
    console.log(`  No commit files for ${repoName}, skipping`);
    return { commits: [], malformed: [] };
  }

  const commits = [];
  const malformed = [];

  for (const file of commitFiles) {
    try {
      const content = fs.readFileSync(path.join(commitsDir, file), 'utf-8');
      const commit = JSON.parse(content);

      // Validate commit has required fields
      const error = validateCommit(commit, repoName);
      if (error) {
        malformed.push({ sha: commit.sha || file, error, file });
        continue;
      }

      commits.push(commit);
    } catch (err) {
      console.error(`  Error reading ${file}: ${err.message}`);
    }
  }

  if (malformed.length > 0) {
    console.log(`  ${repoName}: ${commits.length} commits (${malformed.length} MALFORMED - need reprocessing)`);
  } else {
    console.log(`  ${repoName}: ${commits.length} commits`);
  }
  return { commits, malformed };
}

/**
 * Load commits from all repos
 * Returns { repos, allMalformed } where allMalformed maps repo -> malformed commits
 */
function loadAllRepos() {
  const repos = {};
  const allMalformed = {};

  if (!fs.existsSync(PROCESSED_DIR)) {
    console.error(`Processed directory not found: ${PROCESSED_DIR}`);
    process.exit(1);
  }

  const repoDirs = fs.readdirSync(PROCESSED_DIR)
    .filter(d => fs.statSync(path.join(PROCESSED_DIR, d)).isDirectory());

  console.log(`\nLoading processed data from ${repoDirs.length} repos:\n`);

  for (const repoName of repoDirs) {
    const { commits, malformed } = loadRepoCommits(repoName);
    if (commits.length > 0) {
      repos[repoName] = commits;
    }
    if (malformed.length > 0) {
      allMalformed[repoName] = malformed;
    }
  }

  return { repos, allMalformed };
}

// === Aggregation Functions ===

/**
 * Calculate tag breakdown from commits
 */
function calcTagBreakdown(commits) {
  const breakdown = {};

  for (const commit of commits) {
    const tags = commit.tags || [];
    for (const tag of tags) {
      breakdown[tag] = (breakdown[tag] || 0) + 1;
    }
  }

  return breakdown;
}

/**
 * Calculate complexity breakdown (1-5 scale)
 */
function calcComplexityBreakdown(commits) {
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const commit of commits) {
    const complexity = commit.complexity;
    if (complexity >= 1 && complexity <= 5) {
      breakdown[complexity]++;
    }
  }

  return breakdown;
}

/**
 * Calculate urgency breakdown (1-5 scale)
 */
function calcUrgencyBreakdown(commits) {
  const breakdown = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

  for (const commit of commits) {
    const urgency = commit.urgency;
    if (urgency >= 1 && urgency <= 5) {
      breakdown[urgency]++;
    }
  }

  return breakdown;
}

/**
 * Calculate impact breakdown.
 * Requirement: Map non-standard impact values to their canonical equivalents
 * Approach: Normalize "infra" → "infrastructure" before counting
 * Alternatives: Reject unknown values — rejected because source data already contains "infra"
 */
function calcImpactBreakdown(commits) {
  const breakdown = {
    'internal': 0,
    'user-facing': 0,
    'infrastructure': 0,
    'api': 0
  };

  // Map non-standard impact values to canonical ones
  const impactAliases = { 'infra': 'infrastructure' };

  for (const commit of commits) {
    let impact = commit.impact;
    if (!impact) continue;
    impact = impactAliases[impact] || impact;
    if (breakdown.hasOwnProperty(impact)) {
      breakdown[impact]++;
    }
  }

  return breakdown;
}

/**
 * Calculate risk breakdown (low|medium|high)
 * Only counts commits that have a risk value set
 */
function calcRiskBreakdown(commits) {
  const breakdown = { low: 0, medium: 0, high: 0 };

  for (const commit of commits) {
    if (commit.risk && breakdown.hasOwnProperty(commit.risk)) {
      breakdown[commit.risk]++;
    }
  }

  return breakdown;
}

/**
 * Calculate debt breakdown (added|paid|neutral)
 * Tracks whether commits introduce tech debt, pay it down, or are neutral
 */
function calcDebtBreakdown(commits) {
  const breakdown = { added: 0, paid: 0, neutral: 0 };

  for (const commit of commits) {
    if (commit.debt && breakdown.hasOwnProperty(commit.debt)) {
      breakdown[commit.debt]++;
    }
  }

  return breakdown;
}

/**
 * Calculate epic breakdown — free-text grouping labels
 * Returns { epicName: commitCount, ... } sorted by count descending
 */
function calcEpicBreakdown(commits) {
  const breakdown = {};

  for (const commit of commits) {
    if (commit.epic && typeof commit.epic === 'string') {
      const epic = commit.epic.trim().toLowerCase();
      if (epic) {
        breakdown[epic] = (breakdown[epic] || 0) + 1;
      }
    }
  }

  return breakdown;
}

/**
 * Calculate semver breakdown (patch|minor|major)
 */
function calcSemverBreakdown(commits) {
  const breakdown = { patch: 0, minor: 0, major: 0 };

  for (const commit of commits) {
    if (commit.semver && breakdown.hasOwnProperty(commit.semver)) {
      breakdown[commit.semver]++;
    }
  }

  return breakdown;
}

/**
 * Get ISO week key from a timestamp string.
 * Returns "YYYY-Www" (e.g., "2026-W09") using ISO 8601 week numbering.
 * Requirement: Weekly pre-aggregation for time-windowed reporting
 * Approach: Manual ISO week calculation to avoid external dependencies
 * Alternatives: date-fns/isoWeek — rejected to keep scripts dependency-free
 */
function getISOWeekKey(timestamp) {
  const date = new Date(timestamp);
  // ISO week: week starts Monday, week 1 contains Jan 4
  const dayOfWeek = date.getUTCDay() || 7; // Convert Sunday=0 to 7
  const thursday = new Date(date);
  thursday.setUTCDate(date.getUTCDate() + 4 - dayOfWeek);
  const yearStart = new Date(Date.UTC(thursday.getUTCFullYear(), 0, 1));
  const weekNum = Math.ceil(((thursday - yearStart) / 86400000 + 1) / 7);
  const weekStr = String(weekNum).padStart(2, '0');
  return `${thursday.getUTCFullYear()}-W${weekStr}`;
}

/**
 * Accumulate commit metrics into a time bucket (shared logic for weekly/daily/monthly).
 * Mutates the bucket object in place for performance.
 */
function accumulateBucket(bucket, commit) {
  bucket.commits++;

  if (commit.complexity >= 1 && commit.complexity <= 5) {
    bucket.complexitySum += commit.complexity;
    bucket.complexityCount++;
  }

  if (commit.urgency >= 1 && commit.urgency <= 5) {
    bucket.urgencySum += commit.urgency;
    bucket.urgencyCount++;
  }

  for (const tag of commit.tags || []) {
    bucket.tags[tag] = (bucket.tags[tag] || 0) + 1;
  }

  if (commit.impact) {
    const impact = commit.impact === 'infra' ? 'infrastructure' : commit.impact;
    if (bucket.impact.hasOwnProperty(impact)) {
      bucket.impact[impact]++;
    }
  }

  if (commit.risk && bucket.risk.hasOwnProperty(commit.risk)) {
    bucket.risk[commit.risk]++;
  }

  if (commit.debt && bucket.debt.hasOwnProperty(commit.debt)) {
    bucket.debt[commit.debt]++;
  }

  if (commit.semver && bucket.semver.hasOwnProperty(commit.semver)) {
    bucket.semver[commit.semver]++;
  }

  // Code change stats
  const additions = commit.stats?.additions || commit.additions || 0;
  const deletions = commit.stats?.deletions || commit.deletions || 0;
  bucket.additions += additions;
  bucket.deletions += deletions;

  // Per-repo breakdown
  const repo = commit.repo_id || 'default';
  bucket.repos[repo] = (bucket.repos[repo] || 0) + 1;
}

/**
 * Create an empty time bucket with all tracked fields.
 */
function createEmptyBucket() {
  return {
    commits: 0,
    complexitySum: 0,
    complexityCount: 0,
    urgencySum: 0,
    urgencyCount: 0,
    tags: {},
    impact: { 'internal': 0, 'user-facing': 0, 'infrastructure': 0, 'api': 0 },
    risk: { low: 0, medium: 0, high: 0 },
    debt: { added: 0, paid: 0, neutral: 0 },
    semver: { patch: 0, minor: 0, major: 0 },
    additions: 0,
    deletions: 0,
    repos: {},
  };
}

/**
 * Finalize a time bucket: compute averages, remove temp fields.
 */
function finalizeBucket(bucket) {
  bucket.avgComplexity = bucket.complexityCount > 0
    ? Math.round((bucket.complexitySum / bucket.complexityCount) * 100) / 100
    : null;
  bucket.avgUrgency = bucket.urgencyCount > 0
    ? Math.round((bucket.urgencySum / bucket.urgencyCount) * 100) / 100
    : null;
  delete bucket.complexitySum;
  delete bucket.complexityCount;
  delete bucket.urgencySum;
  delete bucket.urgencyCount;
}

/**
 * Calculate weekly aggregations (ISO week buckets).
 * Requirement: Pre-aggregate commits by week for time-windowed dashboard reporting
 * Approach: Group by ISO 8601 week key, accumulate same metrics as monthly
 * Alternatives: Calendar week (Sunday start) — rejected for ISO standard consistency
 */
function calcWeeklyAggregations(commits) {
  const weekly = {};

  for (const commit of commits) {
    if (!commit.timestamp) continue;

    const weekKey = getISOWeekKey(commit.timestamp);

    if (!weekly[weekKey]) {
      weekly[weekKey] = createEmptyBucket();
    }

    accumulateBucket(weekly[weekKey], commit);
  }

  for (const bucket of Object.values(weekly)) {
    finalizeBucket(bucket);
  }

  return weekly;
}

/**
 * Get UTC date key from a timestamp string.
 * Returns "YYYY-MM-DD" using UTC date components.
 * Requirement: Consistent UTC-based date handling across all aggregation levels
 * Approach: Parse with Date constructor (handles timezone offsets), extract UTC components
 * Alternatives: substring(0, 10) — rejected because it uses the local date from the
 *   timestamp string, creating inconsistency with weekly aggregation which uses UTC
 */
function getUTCDateKey(timestamp) {
  const d = new Date(timestamp);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}

/**
 * Get UTC month key from a timestamp string.
 * Returns "YYYY-MM" using UTC date components.
 */
function getUTCMonthKey(timestamp) {
  const d = new Date(timestamp);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

/**
 * Calculate daily aggregations (per-date buckets).
 * Requirement: Pre-aggregate commits by day for fine-grained dashboard charts
 * Approach: Group by YYYY-MM-DD using UTC date, consistent with weekly/monthly UTC handling
 * Alternatives:
 *   - substring(0, 10): Rejected — uses local date from timestamp, inconsistent with weekly UTC
 *   - Unix day number: Rejected — string keys are human-readable in JSON
 */
function calcDailyAggregations(commits) {
  const daily = {};

  for (const commit of commits) {
    if (!commit.timestamp) continue;

    const dateKey = getUTCDateKey(commit.timestamp);

    if (!daily[dateKey]) {
      daily[dateKey] = createEmptyBucket();
    }

    accumulateBucket(daily[dateKey], commit);
  }

  for (const bucket of Object.values(daily)) {
    finalizeBucket(bucket);
  }

  return daily;
}

/**
 * Calculate average of a numeric field
 */
function calcAverage(commits, field) {
  const values = commits
    .map(c => c[field])
    .filter(v => typeof v === 'number' && v >= 1 && v <= 5);

  if (values.length === 0) return null;

  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

/**
 * Calculate monthly aggregations.
 * Refactored to use shared bucket helpers (accumulateBucket/finalizeBucket)
 * for consistency with weekly and daily aggregations.
 * Uses UTC month key for consistency with weekly (UTC) and daily (UTC) aggregations.
 */
function calcMonthlyAggregations(commits) {
  const monthly = {};

  for (const commit of commits) {
    if (!commit.timestamp) continue;

    const month = getUTCMonthKey(commit.timestamp);

    if (!monthly[month]) {
      monthly[month] = createEmptyBucket();
    }

    accumulateBucket(monthly[month], commit);
  }

  for (const bucket of Object.values(monthly)) {
    finalizeBucket(bucket);
  }

  return monthly;
}

/**
 * Calculate contributor aggregations (with author identity merging)
 */
function calcContributorAggregations(commits) {
  const contributors = {};

  for (const commit of commits) {
    // Use canonical author ID (merges multiple emails to single identity)
    const rawAuthorId = commit.author_id || 'unknown';
    const authorId = resolveAuthorId(rawAuthorId);
    const authorInfo = getAuthorInfo(rawAuthorId);

    if (!contributors[authorId]) {
      contributors[authorId] = {
        author_id: authorId,
        name: authorInfo.name,
        email: authorInfo.email,
        rawEmails: new Set(),
        commits: 0,
        complexitySum: 0,
        complexityCount: 0,
        urgencySum: 0,
        urgencyCount: 0,
        tagBreakdown: {},
        impactBreakdown: {
          'internal': 0,
          'user-facing': 0,
          'infrastructure': 0,
          'api': 0
        },
        riskBreakdown: { low: 0, medium: 0, high: 0 },
        debtBreakdown: { added: 0, paid: 0, neutral: 0 },
        repos: new Set(),
        firstCommit: commit.timestamp,
        lastCommit: commit.timestamp
      };
    }

    const c = contributors[authorId];
    c.commits++;
    c.repos.add(commit.repo_id || 'unknown');
    c.rawEmails.add(rawAuthorId);  // Track original emails for debugging

    // Complexity
    if (commit.complexity >= 1 && commit.complexity <= 5) {
      c.complexitySum += commit.complexity;
      c.complexityCount++;
    }

    // Urgency
    if (commit.urgency >= 1 && commit.urgency <= 5) {
      c.urgencySum += commit.urgency;
      c.urgencyCount++;
    }

    // Tags
    for (const tag of commit.tags || []) {
      c.tagBreakdown[tag] = (c.tagBreakdown[tag] || 0) + 1;
    }

    // Impact (normalize "infra" → "infrastructure")
    if (commit.impact) {
      const impact = commit.impact === 'infra' ? 'infrastructure' : commit.impact;
      if (c.impactBreakdown.hasOwnProperty(impact)) {
        c.impactBreakdown[impact]++;
      }
    }

    // Risk
    if (commit.risk && c.riskBreakdown.hasOwnProperty(commit.risk)) {
      c.riskBreakdown[commit.risk]++;
    }

    // Debt
    if (commit.debt && c.debtBreakdown.hasOwnProperty(commit.debt)) {
      c.debtBreakdown[commit.debt]++;
    }

    // Date range
    if (commit.timestamp < c.firstCommit) c.firstCommit = commit.timestamp;
    if (commit.timestamp > c.lastCommit) c.lastCommit = commit.timestamp;
  }

  // Finalize and convert to array
  const result = Object.values(contributors).map(c => {
    const rawEmails = Array.from(c.rawEmails);
    return {
      author_id: c.author_id,
      name: c.name,
      email: c.email,
      emails: rawEmails.length > 1 ? rawEmails : undefined,  // Only include if merged
      commits: c.commits,
      avgComplexity: c.complexityCount > 0
        ? Math.round((c.complexitySum / c.complexityCount) * 100) / 100
        : null,
      avgUrgency: c.urgencyCount > 0
        ? Math.round((c.urgencySum / c.urgencyCount) * 100) / 100
        : null,
      tagBreakdown: c.tagBreakdown,
      impactBreakdown: c.impactBreakdown,
      riskBreakdown: c.riskBreakdown,
      debtBreakdown: c.debtBreakdown,
      repos: Array.from(c.repos),
      repoCount: c.repos.size,
      firstCommit: c.firstCommit,
      lastCommit: c.lastCommit
    };
  });

  // Sort by commit count
  result.sort((a, b) => b.commits - a.commits);

  return result;
}

/**
 * Calculate date range from commits
 */
function calcDateRange(commits) {
  const timestamps = commits
    .map(c => c.timestamp)
    .filter(Boolean)
    .sort();

  return {
    earliest: timestamps[0] || null,
    latest: timestamps[timestamps.length - 1] || null
  };
}

/**
 * Compute filter options from commits — pre-computed so dashboard FilterSidebar
 * can populate without loading raw commits.
 */
function calcFilterOptions(commits) {
  const tags = new Set();
  const authors = new Set();
  const repos = new Set();
  const urgencies = new Set();
  const impacts = new Set();

  for (const commit of commits) {
    for (const tag of commit.tags || []) {
      tags.add(tag);
    }
    if (commit.author_id) authors.add(commit.author_id);
    if (commit.repo_id) repos.add(commit.repo_id);
    if (commit.urgency >= 1 && commit.urgency <= 5) {
      // Mirror dashboard's getUrgencyLabel mapping (utils.js)
      if (commit.urgency <= 2) urgencies.add('Planned');
      else if (commit.urgency === 3) urgencies.add('Normal');
      else urgencies.add('Reactive');
    }
    if (commit.impact) impacts.add(commit.impact === 'infra' ? 'infrastructure' : commit.impact);
  }

  return {
    tags: [...tags].sort(),
    authors: [...authors].sort(),
    repos: [...repos].sort(),
    urgencies: [...urgencies].sort(),
    impacts: [...impacts].sort(),
  };
}

/**
 * Generate full aggregated data for a set of commits.
 *
 * Requirement: Support time-windowed reporting with weekly/daily pre-aggregations
 * Approach: Compute monthly, weekly, and daily buckets using shared accumulator logic.
 *   Returns both a summary (for fast dashboard load) and sorted commits (for per-month files).
 * Alternatives:
 *   - Only monthly: Rejected — user requested weekly + daily granularity
 *   - Aggregate in dashboard: Rejected — moves computation to client, increases initial load
 */
function generateAggregation(commits, scope, repoCount = 1) {
  // Sort commits by timestamp (newest first) and normalize author_id
  const sortedCommits = [...commits]
    .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
    .map(c => ({
      ...c,
      author_id: resolveAuthorId(c.author_id)  // Normalize to canonical ID
    }));

  const dateRange = calcDateRange(sortedCommits);

  const contributors = calcContributorAggregations(sortedCommits);
  const monthly = calcMonthlyAggregations(sortedCommits);
  const weekly = calcWeeklyAggregations(sortedCommits);
  const daily = calcDailyAggregations(sortedCommits);

  // Security events - commits with 'security' tag
  const securityEvents = sortedCommits
    .filter(c => (c.tags || []).includes('security'))
    .map(c => ({ sha: c.sha, timestamp: c.timestamp, subject: c.subject }));

  // Build author lookup for dashboard (keyed by author_id)
  const authorsLookup = {};
  for (const c of contributors) {
    authorsLookup[c.author_id] = {
      name: c.name,
      email: c.email,
      emails: c.emails  // Multiple emails if merged
    };
  }

  // Pre-compute filter options so dashboard sidebar works without loading raw commits
  const filterOptions = calcFilterOptions(sortedCommits);

  // Determine which months have commit data (for lazy loading index)
  // Uses UTC month key for consistency with monthly/daily/weekly aggregations
  const commitMonths = [...new Set(
    sortedCommits.map(c => c.timestamp ? getUTCMonthKey(c.timestamp) : null).filter(Boolean)
  )].sort();

  // Build summary file (no raw commits — those go to per-month files)
  const summary = {
    metadata: {
      generatedAt: new Date().toISOString(),
      repository: scope === 'overall' ? 'All Repositories' : scope,
      scope: scope,
      repoCount: repoCount,
      commitCount: sortedCommits.length,
      authors: authorsLookup,
      commitMonths: commitMonths,
    },

    contributors: contributors,

    filterOptions: filterOptions,

    summary: {
      totalCommits: sortedCommits.length,
      totalContributors: contributors.length,
      tagBreakdown: calcTagBreakdown(sortedCommits),
      complexityBreakdown: calcComplexityBreakdown(sortedCommits),
      urgencyBreakdown: calcUrgencyBreakdown(sortedCommits),
      impactBreakdown: calcImpactBreakdown(sortedCommits),
      riskBreakdown: calcRiskBreakdown(sortedCommits),
      debtBreakdown: calcDebtBreakdown(sortedCommits),
      epicBreakdown: calcEpicBreakdown(sortedCommits),
      semverBreakdown: calcSemverBreakdown(sortedCommits),
      avgComplexity: calcAverage(sortedCommits, 'complexity'),
      avgUrgency: calcAverage(sortedCommits, 'urgency'),
      monthly: monthly,
      monthlyCommits: monthly,  // Alias for dashboard compatibility
      weekly: weekly,
      daily: daily,
      dateRange: dateRange,
      security_events: securityEvents
    }
  };

  return { summary, sortedCommits };
}

// === Output ===

function writeJson(filepath, data) {
  const dir = path.dirname(filepath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
  console.log(`  Wrote ${filepath}`);
}

// === Main ===

function main() {
  console.log('Aggregate Processed Data');
  console.log('========================\n');

  // Load author identity mapping
  loadAuthorMap();

  // Load all repos
  const { repos, allMalformed } = loadAllRepos();
  const repoNames = Object.keys(repos);

  if (repoNames.length === 0) {
    console.error('\nNo processed data found. Run extraction first.');
    process.exit(1);
  }

  // Report malformed commits loudly
  const malformedRepos = Object.keys(allMalformed);
  if (malformedRepos.length > 0) {
    console.log('\n========== MALFORMED COMMITS ==========');
    console.log('The following commits need reprocessing:\n');

    let totalMalformed = 0;
    for (const repoName of malformedRepos) {
      const malformed = allMalformed[repoName];
      totalMalformed += malformed.length;
      console.log(`  ${repoName}: ${malformed.length} malformed`);
      for (const m of malformed) {
        console.log(`    - ${m.sha}: ${m.error}`);
      }

      // Write to needs-reprocess.json in the repo's processed folder
      const reprocessPath = path.join(PROCESSED_DIR, repoName, 'needs-reprocess.json');
      writeJson(reprocessPath, malformed);
    }

    console.log(`\nTotal: ${totalMalformed} commits need reprocessing`);
    console.log('Written to: processed/<repo>/needs-reprocess.json');
    console.log('=========================================\n');
  }

  console.log(`\nGenerating aggregations:\n`);

  // Generate per-repo files (these still include inline commits for backward compat)
  const reposDir = path.join(outputDir, 'repos');

  for (const repoName of repoNames) {
    const commits = repos[repoName];
    const { summary, sortedCommits } = generateAggregation(commits, repoName, 1);
    // Per-repo files keep commits inline (they're small enough individually)
    writeJson(path.join(reposDir, `${repoName}.json`), { ...summary, commits: sortedCommits });
  }

  // Generate overall aggregation
  const allCommits = repoNames.flatMap(name => repos[name]);
  const { summary: overallSummary, sortedCommits: overallCommits } = generateAggregation(allCommits, 'overall', repoNames.length);

  // Requirement: Split commits into per-month files for time-windowed loading
  // Approach: Write data.json as summary-only (no commits), plus data-commits/YYYY-MM.json
  //   files containing raw commits grouped by month. Dashboard loads summary first (fast),
  //   then lazy-loads month files on demand for drilldowns and filtered views.
  // Alternatives:
  //   - Keep all commits in data.json: Rejected — 2.9 MB payload, slow initial load
  //   - Split by repo instead of month: Rejected — month-based matches time-windowed UI pattern
  const commitsDir = path.join(outputDir, 'data-commits');

  // Group commits by UTC month (consistent with monthly/daily/weekly aggregations)
  const commitsByMonth = {};
  for (const commit of overallCommits) {
    if (!commit.timestamp) continue;
    const month = getUTCMonthKey(commit.timestamp);
    if (!commitsByMonth[month]) commitsByMonth[month] = [];
    commitsByMonth[month].push(commit);
  }

  // Write per-month commit files
  for (const [month, monthCommits] of Object.entries(commitsByMonth)) {
    writeJson(path.join(commitsDir, `${month}.json`), {
      month,
      commits: monthCommits,
    });
  }

  // Write summary file (no raw commits)
  writeJson(path.join(outputDir, 'data.json'), overallSummary);

  const monthCount = Object.keys(commitsByMonth).length;

  // Summary
  console.log(`\n========================`);
  console.log(`Aggregation complete!`);
  console.log(`  Repos: ${repoNames.length} (${repoNames.join(', ')})`);
  console.log(`  Total commits: ${overallCommits.length}`);
  console.log(`  Contributors: ${overallSummary.contributors.length}`);
  console.log(`  Commit files: ${monthCount} months in data-commits/`);
  console.log(`  Weekly buckets: ${Object.keys(overallSummary.summary.weekly).length}`);
  console.log(`  Daily buckets: ${Object.keys(overallSummary.summary.daily).length}`);
  console.log(`  Output: ${outputDir}/`);

  // Requirement: Make unmapped author fallbacks visible
  // Approach: Log a summary of unique unmapped authors after all aggregation is done
  // Alternatives: Log per-commit — rejected because it floods output
  if (unmappedAuthors.size > 0) {
    console.warn(`\n  Warning: ${unmappedAuthors.size} author(s) not found in author-map.json`);
    for (const author of Array.from(unmappedAuthors).sort()) {
      console.warn(`    - ${author}`);
    }
  }

  if (malformedRepos.length > 0) {
    console.log(`\n  WARNING: Some commits were skipped due to missing fields.`);
    console.log(`  Check processed/<repo>/needs-reprocess.json for details.`);
  }
}

main();
