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

const fs = require('fs');
const path = require('path');

// === Configuration ===
const PROCESSED_DIR = path.join(__dirname, '..', 'processed');
const DEFAULT_OUTPUT = path.join(__dirname, '..', 'dashboard');
const AUTHOR_MAP_PATH = path.join(__dirname, '..', 'config', 'author-map.json');

// === Author Identity Mapping ===
let authorMap = null;
let emailToCanonical = {};

function loadAuthorMap() {
  if (!fs.existsSync(AUTHOR_MAP_PATH)) {
    console.log('No author-map.json found, using raw author IDs');
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
 * Resolve an email/author_id to its canonical author ID
 */
function resolveAuthorId(authorId) {
  if (!authorId) return 'unknown';
  const canonical = emailToCanonical[authorId.toLowerCase()];
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
 */
function loadRepoCommits(repoName) {
  const commitsDir = path.join(PROCESSED_DIR, repoName, 'commits');

  if (!fs.existsSync(commitsDir)) {
    console.log(`  No commits directory for ${repoName}, skipping`);
    return [];
  }

  const commitFiles = fs.readdirSync(commitsDir)
    .filter(f => f.endsWith('.json'))
    .sort();

  if (commitFiles.length === 0) {
    console.log(`  No commit files for ${repoName}, skipping`);
    return [];
  }

  const commits = [];
  let skipped = 0;

  for (const file of commitFiles) {
    try {
      const content = fs.readFileSync(path.join(commitsDir, file), 'utf-8');
      const commit = JSON.parse(content);

      // Validate commit has required fields
      const error = validateCommit(commit, repoName);
      if (error) {
        skipped++;
        continue; // Skip malformed commits silently
      }

      commits.push(commit);
    } catch (err) {
      console.error(`  Error reading ${file}: ${err.message}`);
    }
  }

  if (skipped > 0) {
    console.log(`  ${repoName}: ${commits.length} commits (${skipped} skipped - missing required fields)`);
  } else {
    console.log(`  ${repoName}: ${commits.length} commits`);
  }
  return commits;
}

/**
 * Load commits from all repos
 */
function loadAllRepos() {
  const repos = {};

  if (!fs.existsSync(PROCESSED_DIR)) {
    console.error(`Processed directory not found: ${PROCESSED_DIR}`);
    process.exit(1);
  }

  const repoDirs = fs.readdirSync(PROCESSED_DIR)
    .filter(d => fs.statSync(path.join(PROCESSED_DIR, d)).isDirectory());

  console.log(`\nLoading processed data from ${repoDirs.length} repos:\n`);

  for (const repoName of repoDirs) {
    const commits = loadRepoCommits(repoName);
    if (commits.length > 0) {
      repos[repoName] = commits;
    }
  }

  return repos;
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
 * Calculate impact breakdown
 */
function calcImpactBreakdown(commits) {
  const breakdown = {
    'internal': 0,
    'user-facing': 0,
    'infrastructure': 0,
    'api': 0
  };

  for (const commit of commits) {
    const impact = commit.impact;
    if (impact && breakdown.hasOwnProperty(impact)) {
      breakdown[impact]++;
    }
  }

  return breakdown;
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
 * Calculate monthly aggregations
 */
function calcMonthlyAggregations(commits) {
  const monthly = {};

  for (const commit of commits) {
    if (!commit.timestamp) continue;

    const month = commit.timestamp.substring(0, 7); // "2026-01"

    if (!monthly[month]) {
      monthly[month] = {
        commits: 0,
        complexitySum: 0,
        complexityCount: 0,
        urgencySum: 0,
        urgencyCount: 0,
        tags: {},
        impact: {
          'internal': 0,
          'user-facing': 0,
          'infrastructure': 0,
          'api': 0
        }
      };
    }

    const m = monthly[month];
    m.commits++;

    // Complexity
    if (commit.complexity >= 1 && commit.complexity <= 5) {
      m.complexitySum += commit.complexity;
      m.complexityCount++;
    }

    // Urgency
    if (commit.urgency >= 1 && commit.urgency <= 5) {
      m.urgencySum += commit.urgency;
      m.urgencyCount++;
    }

    // Tags
    for (const tag of commit.tags || []) {
      m.tags[tag] = (m.tags[tag] || 0) + 1;
    }

    // Impact
    if (commit.impact && m.impact.hasOwnProperty(commit.impact)) {
      m.impact[commit.impact]++;
    }
  }

  // Calculate averages
  for (const month of Object.keys(monthly)) {
    const m = monthly[month];
    m.avgComplexity = m.complexityCount > 0
      ? Math.round((m.complexitySum / m.complexityCount) * 100) / 100
      : null;
    m.avgUrgency = m.urgencyCount > 0
      ? Math.round((m.urgencySum / m.urgencyCount) * 100) / 100
      : null;

    // Clean up temp fields
    delete m.complexitySum;
    delete m.complexityCount;
    delete m.urgencySum;
    delete m.urgencyCount;
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

    // Impact
    if (commit.impact && c.impactBreakdown.hasOwnProperty(commit.impact)) {
      c.impactBreakdown[commit.impact]++;
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
 * Generate full aggregated data for a set of commits
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

  return {
    metadata: {
      generatedAt: new Date().toISOString(),
      repository: scope === 'overall' ? 'All Repositories' : scope,
      scope: scope,
      repoCount: repoCount,
      commitCount: sortedCommits.length,
      authors: authorsLookup  // For dashboard author resolution
    },

    commits: sortedCommits,

    contributors: contributors,

    summary: {
      totalCommits: sortedCommits.length,
      totalContributors: contributors.length,
      tagBreakdown: calcTagBreakdown(sortedCommits),
      complexityBreakdown: calcComplexityBreakdown(sortedCommits),
      urgencyBreakdown: calcUrgencyBreakdown(sortedCommits),
      impactBreakdown: calcImpactBreakdown(sortedCommits),
      avgComplexity: calcAverage(sortedCommits, 'complexity'),
      avgUrgency: calcAverage(sortedCommits, 'urgency'),
      monthly: monthly,
      monthlyCommits: monthly,  // Alias for dashboard compatibility
      dateRange: dateRange,
      security_events: securityEvents
    }
  };
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
  const repos = loadAllRepos();
  const repoNames = Object.keys(repos);

  if (repoNames.length === 0) {
    console.error('\nNo processed data found. Run extraction first.');
    process.exit(1);
  }

  console.log(`\nGenerating aggregations:\n`);

  // Generate per-repo files
  const reposDir = path.join(outputDir, 'repos');

  for (const repoName of repoNames) {
    const commits = repos[repoName];
    const data = generateAggregation(commits, repoName, 1);
    writeJson(path.join(reposDir, `${repoName}.json`), data);
  }

  // Generate overall file
  const allCommits = repoNames.flatMap(name => repos[name]);
  const overallData = generateAggregation(allCommits, 'overall', repoNames.length);
  writeJson(path.join(outputDir, 'data.json'), overallData);

  // Summary
  console.log(`\n========================`);
  console.log(`Aggregation complete!`);
  console.log(`  Repos: ${repoNames.length} (${repoNames.join(', ')})`);
  console.log(`  Total commits: ${allCommits.length}`);
  console.log(`  Contributors: ${overallData.contributors.length}`);
  console.log(`  Output: ${outputDir}/`);
}

main();
