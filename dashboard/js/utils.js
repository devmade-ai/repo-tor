// === Utility / Helper Functions ===
// Extracted from index.html into ES module

import { state, anonymousNames, authorAnonMap, getViewConfig } from './state.js';

// === Safe localStorage Wrappers ===
// Requirement: Prevent crashes in sandboxed iframes, disabled-storage settings,
//   and enterprise environments where localStorage throws SecurityError.
// Approach: Wrap all localStorage access in try/catch. Fall back to null/no-op.
// Alternatives:
//   - Raw localStorage calls: Rejected — crashes in sandboxed contexts
//   - Feature detection only: Rejected — some environments allow getItem but throw on setItem
export function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}

export function safeStorageSet(key, value) {
    try { localStorage.setItem(key, String(value)); } catch { /* sandboxed iframe, disabled storage */ }
}

export function safeStorageRemove(key) {
    try { localStorage.removeItem(key); } catch { /* sandboxed iframe, disabled storage */ }
}

// Keyboard handler for clickable non-button elements (Enter/Space activates click)
export function handleKeyActivate(callback) {
    return (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            callback();
        }
    };
}

// --- getUrgencyLabel ---
export function getUrgencyLabel(urgency) {
    if (urgency <= 2) return 'Planned';
    if (urgency === 3) return 'Normal';
    return 'Reactive';
}

// --- Anonymous / Sanitize Helpers ---
function getAnonymousName(email) {
    if (!authorAnonMap.has(email)) {
        const index = authorAnonMap.size % anonymousNames.length;
        authorAnonMap.set(email, anonymousNames[index]);
    }
    return authorAnonMap.get(email);
}

export function sanitizeName(name, email) {
    return getAnonymousName(email);
}

export function sanitizeMessage(message) {
    // Requirement: Show the full commit subject line in all views
    // Approach: Return the message as-is (subject line only, no body)
    // Alternatives:
    //   - Keep hiding: Rejected - user wants to see commit messages in detail view
    //   - Show per view level: Rejected - user chose full subject for all levels
    return message || '[No commit message]';
}

// === South African Public Holidays ===
// Format: 'YYYY-MM-DD' for fixed dates, calculated for moveable feasts
export const SA_HOLIDAYS = {
    // Fixed holidays (apply every year)
    fixed: [
        { month: 1, day: 1, name: "New Year's Day" },
        { month: 3, day: 21, name: "Human Rights Day" },
        { month: 4, day: 27, name: "Freedom Day" },
        { month: 5, day: 1, name: "Workers' Day" },
        { month: 6, day: 16, name: "Youth Day" },
        { month: 8, day: 9, name: "National Women's Day" },
        { month: 9, day: 24, name: "Heritage Day" },
        { month: 12, day: 16, name: "Day of Reconciliation" },
        { month: 12, day: 25, name: "Christmas Day" },
        { month: 12, day: 26, name: "Day of Goodwill" }
    ],
};

// Compute Easter Sunday for a given year using the Anonymous Gregorian algorithm.
// Fix: Previously Easter dates were hardcoded for 2020-2030 only. This computes
// them algorithmically for any year, so holiday detection never silently expires.
// Alternatives:
//   - Extend hardcoded table: Rejected — same problem recurs at new boundary
//   - External library: Rejected — over-engineered for one calculation
function computeEasterSunday(year) {
    const a = year % 19;
    const b = Math.floor(year / 100);
    const c = year % 100;
    const d = Math.floor(b / 4);
    const e = b % 4;
    const f = Math.floor((b + 8) / 25);
    const g = Math.floor((b - f + 1) / 3);
    const h = (19 * a + b - d - g + 15) % 30;
    const i = Math.floor(c / 4);
    const k = c % 4;
    const l = (32 + 2 * e + 2 * i - h - k) % 7;
    const m = Math.floor((a + 11 * h + 22 * l) / 451);
    const month = Math.floor((h + l - 7 * m + 114) / 31);
    const day = ((h + l - 7 * m + 114) % 31) + 1;
    return new Date(year, month - 1, day);
}

// Build holiday lookup set for quick checking
function buildHolidaySet() {
    const holidays = new Set();
    const currentYear = new Date().getFullYear();
    // Cover a wide range: historical data (2015) through 5 years into the future
    const startYear = 2015;
    const endYear = currentYear + 5;

    for (let year = startYear; year <= endYear; year++) {
        // Add fixed holidays
        SA_HOLIDAYS.fixed.forEach(h => {
            const dateStr = `${year}-${String(h.month).padStart(2, '0')}-${String(h.day).padStart(2, '0')}`;
            holidays.add(dateStr);
            // If holiday falls on Sunday, Monday is observed
            const date = new Date(year, h.month - 1, h.day);
            if (date.getDay() === 0) {
                const monday = new Date(date);
                monday.setDate(monday.getDate() + 1);
                holidays.add(monday.toISOString().substring(0, 10));
            }
        });

        // Add Easter-based holidays (Good Friday = Easter - 2, Family Day = Easter + 1)
        const easter = computeEasterSunday(year);
        const goodFriday = new Date(easter);
        goodFriday.setDate(easter.getDate() - 2);
        const familyDay = new Date(easter);
        familyDay.setDate(easter.getDate() + 1);
        holidays.add(goodFriday.toISOString().substring(0, 10));
        holidays.add(familyDay.toISOString().substring(0, 10));
    }
    return holidays;
}
const holidaySet = buildHolidaySet();

// === Work Pattern Helpers ===
export function getWorkPattern(commit) {
    // Guard against missing timestamp
    if (!commit.timestamp) {
        return { isAfterHours: false, isWeekend: false, isHoliday: false, hour: 0, dayOfWeek: 0, dateStr: '' };
    }
    const date = new Date(commit.timestamp);
    const hour = state.useUTC ? date.getUTCHours() : date.getHours();
    const dayOfWeek = state.useUTC ? date.getUTCDay() : date.getDay();
    const dateStr = commit.timestamp.substring(0, 10);

    return {
        isAfterHours: hour < state.workHourStart || hour >= state.workHourEnd,
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        isHoliday: holidaySet.has(dateStr),
        hour,
        dayOfWeek,
        dateStr
    };
}


// === Tag Semantics ===
// Requirement: Tag chips must use only DaisyUI semantic badge variants
//   so that the DaisyUI theme IS the brand colour — no static hex
//   palette, no theme-independent values. Tags within the same semantic
//   category render with the same DaisyUI variant.
// Approach: One source of truth — `TAG_SEMANTIC_BASE` maps each tag
//   name to one of 7 DaisyUI semantic bases (success/error/warning/
//   secondary/info/accent/neutral). Two derivation helpers expose:
//     - `getTagBadgeClass(tag)` → `badge-${base}` for JSX chip render
//     - `resolveTagSemanticColor(tag)` → runtime CSS var value for
//       Chart.js dataset backgrounds (which need literal colours, not
//       class names)
//   Both helpers fall back to `neutral` for unknown tags. The 34-tag
//   brand-hex palette (TAG_COLORS) and its companions TAG_TEXT_OVERRIDES
//   + DYNAMIC_TAG_PALETTE + getTagStyleObject() were deleted 2026-04-14
//   in the vanilla-DaisyUI sweep.
// Alternatives considered:
//   - Keep per-tag brand hex: Rejected — user directive "i don't want
//     brand colours or static colours anywhere".
//   - Two parallel maps (TAG_SEMANTIC_BADGE + TAG_SEMANTIC_VAR): Rejected
//     2026-04-14. The first vanilla-sweep version had this duplication
//     — adding a new tag to one map and forgetting the other would let
//     chips and chart datasets disagree. One source of truth via
//     `TAG_SEMANTIC_BASE` is safer.
//
// Maps 34 commit tag names to 7 DaisyUI semantic bases. Tags within a
// category (feature/enhancement/seed/init → success) share the same
// visual — a deliberate reduction from 34 distinct colours to 7 semantic
// meanings. Users lose fine-grained tag discrimination but gain a palette
// that tracks every DaisyUI theme. Tags not listed here fall back to
// `neutral` via `tagSemanticBase()`.
const TAG_SEMANTIC_BASE = {
    // Additive / new functionality → success (green family in most themes)
    feature: 'success', enhancement: 'success', seed: 'success', init: 'success',
    // Problems / fixes → error
    bugfix: 'error', fix: 'error', security: 'error', hotfix: 'error',
    // Removal / revert / deprecation → warning
    removal: 'warning', revert: 'warning', deprecate: 'warning',
    // Refactoring / cleanup → secondary
    refactor: 'secondary', naming: 'secondary', cleanup: 'secondary',
    // Documentation / config → info
    docs: 'info', config: 'info',
    // Testing / build / CI → accent
    test: 'accent', 'test-unit': 'accent', 'test-e2e': 'accent',
    build: 'accent', ci: 'accent', deploy: 'accent',
    // Everything else (chore, style, ui, ux, accessibility, perf, deps, other)
    // falls through to the `neutral` default in tagSemanticBase().
};

function tagSemanticBase(tag) {
    return TAG_SEMANTIC_BASE[tag] || 'neutral';
}

/** DaisyUI badge variant class for a tag name. Unknown tags fall back
 *  to `badge-neutral`. Compose as `badge badge-sm ${getTagBadgeClass(tag)}`
 *  on a `<span>` to render a theme-tracked tag chip. */
export function getTagBadgeClass(tag) {
    return `badge-${tagSemanticBase(tag)}`;
}

/** Runtime-resolved DaisyUI semantic colour for a tag — reads the active
 *  theme's `--color-<semantic>` CSS variable from computed styles and
 *  returns the resolved value (oklch string or similar). Used by
 *  Chart.js datasets which need literal colour values; for JSX chip
 *  rendering use `getTagBadgeClass(tag)` instead. Returns undefined
 *  outside a DOM context (SSR / tests). */
export function resolveTagSemanticColor(tag) {
    if (typeof document === 'undefined') return undefined;
    const varName = `--color-${tagSemanticBase(tag)}`;
    return getComputedStyle(document.documentElement).getPropertyValue(varName).trim() || undefined;
}

// === Tag Helper Functions ===
export function getCommitTags(commit) {
    if (commit.tags && commit.tags.length > 0) {
        return commit.tags;
    }
    return ['other'];
}

// === Author Resolution ===
export function getAuthorName(commit) {
    let name;
    // Try to resolve from metadata.authors using author_id
    if (commit.author_id && state.data?.metadata?.authors?.[commit.author_id]) {
        name = state.data.metadata.authors[commit.author_id].name;
    } else {
        // Fall back to embedded author object
        name = commit.author?.name || commit.author_id || 'Unknown';
    }
    const email = getAuthorEmail(commit);
    return sanitizeName(name, email);
}

export function getAuthorEmail(commit) {
    // Try to resolve from metadata.authors using author_id
    if (commit.author_id && state.data?.metadata?.authors?.[commit.author_id]) {
        return state.data.metadata.authors[commit.author_id].email;
    }
    // Fall back to embedded author object or author_id
    return commit.author?.email || commit.author_id || 'unknown';
}

// === Data Format Helpers ===
export function getFilesChanged(commit) {
    // Handle different data formats: stats.filesChanged, filesChanged, files_changed
    // Use ?? (nullish coalescing) so that 0 is not treated as falsy
    return commit.stats?.filesChanged ?? commit.filesChanged ?? commit.files_changed ?? 0;
}

export function getCommitSubject(commit) {
    // Handle different data formats: subject vs message
    return commit.subject || commit.message || '';
}

export function getAdditions(commit) {
    // Handle different data formats: stats.additions vs lines_added
    // Use ?? (nullish coalescing) so that 0 is not treated as falsy
    return commit.stats?.additions ?? commit.lines_added ?? 0;
}

export function getDeletions(commit) {
    // Handle different data formats: stats.deletions vs lines_deleted
    // Use ?? (nullish coalescing) so that 0 is not treated as falsy
    return commit.stats?.deletions ?? commit.lines_deleted ?? 0;
}

// === UTC Date Helpers ===
// Requirement: Date grouping in dashboard must match UTC keys from aggregate-processed.js
// Approach: Parse timestamp to Date and extract UTC year/month/day to build YYYY-MM-DD / YYYY-MM
// Alternatives:
//   - substring(0, 10): Rejected — extracts local timezone from ISO string, not UTC
//   - toISOString().substring(): Works but creates unnecessary string allocation
export function getUTCDateKey(timestamp) {
    const d = new Date(timestamp);
    return d.getUTCFullYear() + '-' +
        String(d.getUTCMonth() + 1).padStart(2, '0') + '-' +
        String(d.getUTCDate()).padStart(2, '0');
}

export function getUTCMonthKey(timestamp) {
    const d = new Date(timestamp);
    return d.getUTCFullYear() + '-' + String(d.getUTCMonth() + 1).padStart(2, '0');
}

// === Formatting Helpers ===
export function formatDate(isoString) {
    if (!isoString) return 'N/A';
    return new Date(isoString).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
    });
}

export function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toString();
}

// === Day / Time Helpers ===
export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const DAY_NAMES_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getCommitDateTime(commit) {
    const date = new Date(commit.timestamp);
    if (state.useUTC) {
        return {
            hour: date.getUTCHours(),
            dayOfWeek: date.getUTCDay()
        };
    }
    return {
        hour: date.getHours(),
        dayOfWeek: date.getDay()
    };
}

// === Partial Month Handling ===

/**
 * Requirement: Exclude incomplete last month from trend charts so partial data
 *   doesn't appear as a dramatic drop (e.g., 2 days into March looks like 95% decline).
 * Approach: Check if the latest day in the last month is before the 15th — if so,
 *   the month has less than half its data and would mislead non-technical users.
 * Alternatives:
 *   - Normalize to daily rate: Rejected — changes the y-axis meaning, harder to interpret
 *   - Show with dashed line annotation: Rejected — adds visual complexity, still misleading at a glance
 *   - Use calendar "today" check: Rejected — data.json is static, should be data-driven
 */
export function excludeIncompleteLastMonth(sortedMonths, commits) {
    if (sortedMonths.length === 0) return { months: sortedMonths, excluded: false };

    const lastMonth = sortedMonths[sortedMonths.length - 1];
    const monthCommits = commits.filter(c => c.timestamp?.startsWith(lastMonth));

    if (monthCommits.length === 0) {
        return { months: sortedMonths.slice(0, -1), excluded: true };
    }

    // Find the latest day-of-month in the data for this month
    const maxDay = Math.max(...monthCommits.map(c => new Date(c.timestamp).getDate()));

    if (maxDay < 15) {
        return { months: sortedMonths.slice(0, -1), excluded: true };
    }

    return { months: sortedMonths, excluded: false };
}

// === Aggregation Functions for View Levels ===

/**
 * Aggregate contributors based on view level
 * Returns same data shape, different granularity
 */
export function aggregateContributors(commits) {
    const config = getViewConfig();

    switch (config.contributors) {
        case 'total':
            // Executive: one entry with totals
            const uniqueAuthors = new Set(commits.map(c => getAuthorEmail(c)));
            return [{
                label: '__total__',
                displayName: `All Contributors (${uniqueAuthors.size})`,
                count: commits.length,
                breakdown: aggregateByTag(commits),
                complexities: commits.filter(c => c.complexity != null).map(c => c.complexity)
            }];

        case 'repo':
            // Management: group by repository
            const byRepo = {};
            commits.forEach(c => {
                const repo = c.repo_id || 'default';
                if (!byRepo[repo]) {
                    byRepo[repo] = {
                        label: repo,
                        commits: [],
                        authors: new Set(),
                        complexities: []
                    };
                }
                byRepo[repo].commits.push(c);
                byRepo[repo].authors.add(getAuthorEmail(c));
                if (c.complexity != null) {
                    byRepo[repo].complexities.push(c.complexity);
                }
            });
            return Object.values(byRepo).map(r => ({
                label: r.label,
                displayName: `${r.label} (${r.authors.size} contributors)`,
                count: r.commits.length,
                breakdown: aggregateByTag(r.commits),
                complexities: r.complexities
            })).sort((a, b) => b.count - a.count);

        case 'individual':
        default:
            // Developer: current behavior - per person
            const byAuthor = {};
            commits.forEach(c => {
                const email = getAuthorEmail(c);
                const name = getAuthorName(c);
                if (!byAuthor[email]) {
                    byAuthor[email] = {
                        label: email,
                        displayName: sanitizeName(name, email),
                        commits: [],
                        tags: {},
                        complexities: []
                    };
                }
                byAuthor[email].commits.push(c);
                getCommitTags(c).forEach(tag => {
                    byAuthor[email].tags[tag] = (byAuthor[email].tags[tag] || 0) + 1;
                });
                if (c.complexity != null) {
                    byAuthor[email].complexities.push(c.complexity);
                }
            });
            return Object.values(byAuthor).map(a => ({
                label: a.label,
                displayName: a.displayName,
                count: a.commits.length,
                breakdown: a.tags,
                complexities: a.complexities,
                commits: a.commits
            })).sort((a, b) => b.count - a.count);
    }
}

/**
 * Aggregate commits by tag
 */
export function aggregateByTag(commits) {
    const tags = {};
    commits.forEach(c => {
        getCommitTags(c).forEach(tag => {
            tags[tag] = (tags[tag] || 0) + 1;
        });
    });
    return tags;
}

/**
 * Get date range from commits
 */
export function getCommitDateRange(commits) {
    if (!commits || commits.length === 0) {
        return { earliest: 'N/A', latest: 'N/A' };
    }
    const dates = commits.map(c => c.timestamp).filter(Boolean).sort();
    return {
        earliest: dates[0]?.substring(0, 10) || 'N/A',
        latest: dates[dates.length - 1]?.substring(0, 10) || 'N/A'
    };
}

/**
 * Aggregate for detail pane drilldown based on view level
 */
export function aggregateForDrilldown(commits, context) {
    const config = getViewConfig();

    if (config.drilldown === 'commits') {
        // Developer: return full commit list
        return { type: 'commits', data: commits };
    }

    // Executive/Management: return summary stats
    const uniqueAuthors = new Set(commits.map(c => getAuthorEmail(c)));
    const tagCounts = aggregateByTag(commits);
    const repos = [...new Set(commits.map(c => c.repo_id).filter(Boolean))];

    return {
        type: 'summary',
        data: {
            totalCommits: commits.length,
            contributorCount: uniqueAuthors.size,
            tagBreakdown: tagCounts,
            repoCount: repos.length,
            dateRange: getCommitDateRange(commits),
            // For management, include repo breakdown
            ...(config.contributors === 'repo' && {
                byRepo: repos.map(r => ({
                    name: r,
                    count: commits.filter(c => c.repo_id === r).length
                })).sort((a, b) => b.count - a.count)
            })
        }
    };
}

