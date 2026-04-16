/**
 * Time-bucketing system for commit aggregation.
 *
 * Requirement: Keep aggregate-processed.js under the 500-line soft-limit
 * Approach: Extract 9 functions that handle weekly/daily/monthly time-bucketing.
 *   These functions call each other internally but have no dependency on
 *   aggregate-processed.js module-level state (no resolveAuthorId, no
 *   getAuthorInfo, no config vars). Internal helpers (getISOWeekKey,
 *   accumulateBucket, createEmptyBucket, finalizeBucket) are not exported --
 *   only the date-key utilities and aggregation entry points are public.
 * Alternatives:
 *   - Merge into aggregateCalcs.js: Rejected -- calcs are pure single-pass
 *     reducers; time-windowing is a distinct concern with shared bucket logic
 *   - One file per granularity (weekly.js, daily.js, monthly.js): Rejected --
 *     they share accumulateBucket/createEmptyBucket/finalizeBucket helpers
 */

/**
 * Get ISO week key from a timestamp string.
 * Returns "YYYY-Www" (e.g., "2026-W09") using ISO 8601 week numbering.
 * Requirement: Weekly pre-aggregation for time-windowed reporting
 * Approach: Manual ISO week calculation to avoid external dependencies
 * Alternatives: date-fns/isoWeek -- rejected to keep scripts dependency-free
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

  // Code change stats -- use ?? (nullish coalescing) instead of || so that 0 is kept as 0
  const additions = commit.stats?.additions ?? commit.additions ?? 0;
  const deletions = commit.stats?.deletions ?? commit.deletions ?? 0;
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
 * Alternatives: Calendar week (Sunday start) -- rejected for ISO standard consistency
 */
export function calcWeeklyAggregations(commits) {
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
 * Alternatives: substring(0, 10) -- rejected because it uses the local date from the
 *   timestamp string, creating inconsistency with weekly aggregation which uses UTC
 */
export function getUTCDateKey(timestamp) {
  const d = new Date(timestamp);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0') + '-' + String(d.getUTCDate()).padStart(2, '0');
}

/**
 * Get UTC month key from a timestamp string.
 * Returns "YYYY-MM" using UTC date components.
 */
export function getUTCMonthKey(timestamp) {
  const d = new Date(timestamp);
  return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

/**
 * Calculate daily aggregations (per-date buckets).
 * Requirement: Pre-aggregate commits by day for fine-grained dashboard charts
 * Approach: Group by YYYY-MM-DD using UTC date, consistent with weekly/monthly UTC handling
 * Alternatives:
 *   - substring(0, 10): Rejected -- uses local date from timestamp, inconsistent with weekly UTC
 *   - Unix day number: Rejected -- string keys are human-readable in JSON
 */
export function calcDailyAggregations(commits) {
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
 * Calculate monthly aggregations.
 * Refactored to use shared bucket helpers (accumulateBucket/finalizeBucket)
 * for consistency with weekly and daily aggregations.
 * Uses UTC month key for consistency with weekly (UTC) and daily (UTC) aggregations.
 */
export function calcMonthlyAggregations(commits) {
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
