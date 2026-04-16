/**
 * Pure calculation functions for commit aggregation.
 *
 * Requirement: Keep aggregate-processed.js under the 500-line soft-limit
 * Approach: Extract 14 pure functions that take a commits array and return
 *   a summary object with no dependency on module-level state (no author
 *   mapping, no config vars, no filesystem access). Each function is a
 *   self-contained reducer over the commits array.
 * Alternatives:
 *   - Keep everything in one file: Rejected — 1042 lines exceeds the
 *     800-line strong refactor threshold from CLAUDE.md
 *   - Split by domain (tags.js, metrics.js, etc.): Rejected — too many
 *     tiny files for simple reducer functions; one "calcs" module is cleaner
 */

/**
 * Calculate tag breakdown from commits
 */
export function calcTagBreakdown(commits) {
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
export function calcComplexityBreakdown(commits) {
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
export function calcUrgencyBreakdown(commits) {
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
 * Approach: Normalize "infra" -> "infrastructure" before counting
 * Alternatives: Reject unknown values -- rejected because source data already contains "infra"
 */
export function calcImpactBreakdown(commits) {
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
export function calcRiskBreakdown(commits) {
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
export function calcDebtBreakdown(commits) {
  const breakdown = { added: 0, paid: 0, neutral: 0 };

  for (const commit of commits) {
    if (commit.debt && breakdown.hasOwnProperty(commit.debt)) {
      breakdown[commit.debt]++;
    }
  }

  return breakdown;
}

/**
 * Calculate epic breakdown -- free-text grouping labels
 * Returns { epicName: commitCount, ... } sorted by count descending
 */
export function calcEpicBreakdown(commits) {
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
 * Calculate per-repo commit counts for ProjectsTab instant loading.
 * Requirement: Show commit counts on project cards during Phase 1 (before lazy-loaded
 *   commits arrive). Without this, cards show no count during Phase 1 or "0 commits".
 * Approach: Simple { repoName: count } map added to summary JSON.
 * Alternatives:
 *   - Derive from contributors[] repoCount: Rejected -- per-contributor, not per-repo total
 *   - Wait for commits to load: Rejected -- 1-3s delay where counts are missing
 */
export function calcRepoCommitCounts(commits) {
  const counts = {};
  for (const commit of commits) {
    const repo = commit.repo_id || 'default';
    counts[repo] = (counts[repo] || 0) + 1;
  }
  return counts;
}

/**
 * Calculate hourly heatmap for TimingTab instant loading.
 * Requirement: Show commit timing heatmap during Phase 1 without raw commits.
 * Approach: Pre-aggregate into 24x7 matrix (hour x dayOfWeek) plus byHour/byDay arrays.
 *   Uses UTC for consistency with other aggregations (monthly, weekly, daily).
 *   Dashboard recomputes with user's timezone preference once commits load.
 * Alternatives:
 *   - Use local time: Rejected -- script runs server-side, no user timezone available
 *   - Skip heatmap during Phase 1: Rejected -- spinner is less useful than approximate data
 */
export function calcHourlyHeatmap(commits) {
  const matrix = Array.from({ length: 24 }, () => new Array(7).fill(0));
  const byHour = new Array(24).fill(0);
  const byDay = new Array(7).fill(0);

  for (const commit of commits) {
    if (!commit.timestamp) continue;
    const date = new Date(commit.timestamp);
    const hour = date.getUTCHours();
    const dayOfWeek = date.getUTCDay(); // 0=Sun, 1=Mon, ...
    matrix[hour][dayOfWeek]++;
    byHour[hour]++;
    byDay[dayOfWeek]++;
  }

  return { matrix, byHour, byDay };
}

/**
 * Calculate semver breakdown (patch|minor|major)
 */
export function calcSemverBreakdown(commits) {
  const breakdown = { patch: 0, minor: 0, major: 0 };

  for (const commit of commits) {
    if (commit.semver && breakdown.hasOwnProperty(commit.semver)) {
      breakdown[commit.semver]++;
    }
  }

  return breakdown;
}

/**
 * Calculate aggregate code stats for Discover section Phase 1 support.
 * Requirement: Show code growth metrics instantly during Phase 1 without raw commits.
 * Approach: Sum all additions/deletions/filesChanged across commits into summary totals.
 * Alternatives:
 *   - Derive from monthly buckets: Rejected -- rounding errors accumulate
 *   - Skip Phase 1 for Discover: Rejected -- metrics are derivable from simple aggregation
 */
export function calcCodeStats(commits) {
  let additions = 0;
  let deletions = 0;
  let filesChanged = 0;

  for (const commit of commits) {
    additions += commit.stats?.additions ?? 0;
    deletions += commit.stats?.deletions ?? 0;
    filesChanged += commit.stats?.files_changed ?? commit.stats?.filesChanged ?? 0;
  }

  return { additions, deletions, filesChanged };
}

/**
 * Calculate average of a numeric field
 */
export function calcAverage(commits, field) {
  const values = commits
    .map(c => c[field])
    .filter(v => typeof v === 'number' && v >= 1 && v <= 5);

  if (values.length === 0) return null;

  const sum = values.reduce((a, b) => a + b, 0);
  return Math.round((sum / values.length) * 100) / 100;
}

/**
 * Calculate date range from commits
 */
export function calcDateRange(commits) {
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
 * Compute filter options from commits -- pre-computed so dashboard FilterSidebar
 * can populate without loading raw commits.
 */
export function calcFilterOptions(commits) {
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
