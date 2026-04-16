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
import { calcTagBreakdown, calcComplexityBreakdown, calcUrgencyBreakdown, calcImpactBreakdown, calcRiskBreakdown, calcDebtBreakdown, calcEpicBreakdown, calcRepoCommitCounts, calcHourlyHeatmap, calcSemverBreakdown, calcCodeStats, calcAverage, calcDateRange, calcFilterOptions } from './lib/aggregateCalcs.js';
import { getUTCDateKey, getUTCMonthKey, calcWeeklyAggregations, calcDailyAggregations, calcMonthlyAggregations } from './lib/aggregateTimeWindows.js';

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

// Requirement: Permanently exclude discontinued repos from aggregation
// Approach: Skip these repo directories during loadAllRepos(). Deleting
//   processed/ data removes current data; this list prevents re-inclusion
//   if someone accidentally re-extracts the repo.
// Alternatives:
//   - Only delete processed data: Rejected — re-extraction would re-include
//   - Config file: Rejected — overkill for a short static list
const EXCLUDED_REPOS = new Set(['chatty-chart']);

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
    .filter(d => fs.statSync(path.join(PROCESSED_DIR, d)).isDirectory())
    .filter(d => !EXCLUDED_REPOS.has(d));

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
// Pure calculation functions: ./lib/aggregateCalcs.js (14 functions)
// Time-bucketing system: ./lib/aggregateTimeWindows.js (9 functions)

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
      repoCommitCounts: calcRepoCommitCounts(sortedCommits),
      hourlyHeatmap: calcHourlyHeatmap(sortedCommits),
      codeStats: calcCodeStats(sortedCommits),
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
