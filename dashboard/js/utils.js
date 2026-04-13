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

// Shared Tailwind class string for the focus-visible ring used on every
// `role="button"` non-native-button element across the dashboard (stat
// tiles, category cards, drill-down tiles, settings toggles, etc.).
// Native <button>/<input> elements inherit DaisyUI's own focus rings
// through the `btn`/`input` classes — this constant is only for the
// div/span wrappers that play the role of a button but need an explicit
// focus indicator for keyboard users.
//
// Requirement: Previously a global `[role="button"]:focus-visible`
//   attribute selector rule lived in styles.css. The 2026-04-13
//   custom-CSS cleanup pass migrated every named class wrapper to
//   inline Tailwind utilities, and this constant replaces the one
//   attribute-selector rule left in the bespoke-focus section — the
//   "no custom CSS unless necessary" rule applies to attribute selectors
//   too, not just class selectors.
// Approach: Export a plain string so consumers append it to their
//   className template literals. Kept here in utils.js rather than a
//   new file because CLAUDE.md prefers editing existing files over
//   creating new ones for small additions.
// Alternatives considered:
//   - React component wrapper (<InteractiveCard />): Rejected — would
//     require 15+ consumer updates + an extra wrapper element per tile.
//   - CSS @layer rule on `[role="button"]`: Rejected — that's the
//     custom CSS pattern we're trying to eliminate.
export const FOCUS_RING_CLASSES =
    'focus-visible:outline focus-visible:outline-2 ' +
    'focus-visible:outline-primary focus-visible:outline-offset-2';

// --- getUrgencyLabel ---
export function getUrgencyLabel(urgency) {
    if (urgency <= 2) return 'Planned';
    if (urgency === 3) return 'Normal';
    return 'Reactive';
}

// --- Anonymous / Sanitize Helpers ---
export function getAnonymousName(email) {
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
export function buildHolidaySet() {
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
export const holidaySet = buildHolidaySet();

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


// === Tag Colors ===
// Requirement: Tags have brand/semantic colors that must NOT track theme
//   (feature=green, fix=red, docs=blue, etc. — these meanings are fixed
//   regardless of which DaisyUI theme the user picks). CLAUDE.md explicitly
//   carves out data-viz brand colors from the "always use semantic tokens"
//   rule for this reason.
// Approach: Single source of truth here. `getTagColor(tag)` returns the
//   brand hex (used for Chart.js dataset backgrounds that need a solid
//   fill), and `getTagStyleObject(tag)` returns the chip display style
//   (background/color/border with per-tag alpha tuning) used for rendering
//   tag pills across the UI. Previously the same 34 hex values were
//   duplicated in 40+ `.tag-{name}` CSS rules in styles.css; those rules
//   were collapsed into this module on 2026-04-13 so there is exactly one
//   place to edit when adding, renaming, or recoloring a tag.
// Alternatives considered:
//   - CSS custom properties per tag (set via class): Rejected — the same
//     duplication, just split differently (keys in JS, values in CSS).
//   - Shadow DaisyUI's own `.badge` component with per-tag color variants:
//     Rejected — DaisyUI's badge color modifiers (`badge-info` etc.) track
//     the theme's semantic tokens, which is exactly what we do NOT want
//     for brand-fixed tag colors.
//   - Tailwind color utilities (`bg-red-500/30 text-red-400`): Rejected —
//     leaks brand colors into inline JSX in a way that couples UI layout
//     to the tag palette (renaming `feature` from green to teal would
//     require editing every JSX call site).
//
// TAG_COLORS: primary brand color per tag. Used by Chart.js datasets
// (solid fill) and passed to getTagStyleObject for the chip's background.
export const TAG_COLORS = {
    // Additive (green family)
    feature: '#16A34A',
    enhancement: '#22c55e',
    seed: '#4ade80',
    init: '#10b981',
    // Problems/Fixes (red family)
    bugfix: '#ef4444',
    fix: '#ef4444',
    security: '#dc2626',
    hotfix: '#f87171',
    // Removal/Revert (orange/amber)
    removal: '#f59e0b',
    revert: '#fb923c',
    deprecate: '#fbbf24',
    // Refactoring (purple family)
    refactor: '#8b5cf6',
    naming: '#a78bfa',
    cleanup: '#7c3aed',
    // Documentation (blue)
    docs: '#2D68FF',
    // Testing (yellow)
    test: '#EAB308',
    'test-unit': '#facc15',
    'test-e2e': '#fde047',
    // DevOps/Build (orange/slate)
    build: '#f97316',
    ci: '#fb923c',
    deploy: '#ea580c',
    // Config/Chore (slate)
    config: '#64748b',
    chore: '#94a3b8',
    // Style/UX (pink family)
    style: '#ec4899',
    ux: '#f472b6',
    ui: '#e879f9',
    accessibility: '#d946ef',
    // Performance (cyan)
    performance: '#06b6d4',
    perf: '#22d3ee',
    // Dependencies (lime)
    dependency: '#84cc16',
    deps: '#a3e635',
    // Fallback
    other: '#9ca3af'
};

// TAG_TEXT_OVERRIDES: tags whose chip text uses a lighter variant of the
// brand color family for readability on the semi-transparent background.
// Preserved from the pre-consolidation `.tag-{name}` CSS rules where some
// primaries (dark reds, deep purples, etc.) needed a lifted text tone to
// stay legible on a 30%-opaque fill. Tags not listed here use TAG_COLORS
// for both background and text. Keep this in sync with the pre-migration
// CSS rules — reference commit history if you need to verify a value.
const TAG_TEXT_OVERRIDES = {
    security: '#f87171',    // bg #dc2626 (red-600) -> text red-400
    refactor: '#a78bfa',    // bg #8b5cf6 (violet-500) -> text violet-400
    cleanup: '#a78bfa',     // bg #7c3aed (violet-600) -> text violet-400
    config: '#94a3b8',      // bg #64748b (slate-500) -> text slate-400
    style: '#f472b6',       // bg #ec4899 (pink-500) -> text pink-400
    performance: '#22d3ee', // bg #06b6d4 (cyan-500) -> text cyan-400
    dependency: '#a3e635',  // bg #84cc16 (lime-500) -> text lime-400
    other: '#d1d5db',       // bg #9ca3af (gray-400) -> text gray-300
};

// Palette for dynamic tag colors (works well on dark backgrounds).
// Used when a commit has a tag name that isn't in TAG_COLORS — the hash
// function below picks a deterministic slot so the same unknown tag
// always renders with the same color across renders and sessions.
export const DYNAMIC_TAG_PALETTE = [
    '#f472b6', // pink
    '#a78bfa', // purple
    '#60a5fa', // blue
    '#34d399', // emerald
    '#fbbf24', // amber
    '#fb923c', // orange
    '#f87171', // red
    '#2dd4bf', // teal
    '#a3e635', // lime
    '#e879f9', // fuchsia
];

// Simple hash function for consistent color assignment
export function hashString(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash);
}

export function getDynamicTagColor(tag) {
    const index = hashString(tag) % DYNAMIC_TAG_PALETTE.length;
    return DYNAMIC_TAG_PALETTE[index];
}

// === Tag Helper Functions ===
export function getCommitTags(commit) {
    if (commit.tags && commit.tags.length > 0) {
        return commit.tags;
    }
    return ['other'];
}

export function getAllTags(commits) {
    const tagSet = new Set();
    commits.forEach(c => {
        getCommitTags(c).forEach(tag => tagSet.add(tag));
    });
    return [...tagSet].sort();
}

/** Primary brand hex for a tag. Used by Chart.js datasets and any
 *  call site that needs a solid-fill color (not a chip style). */
export function getTagColor(tag) {
    return TAG_COLORS[tag] || getDynamicTagColor(tag);
}

// Note: `getTagClass(tag)` was removed 2026-04-13 as part of the tag-color
// duplication collapse. JSX consumers previously combined
// `className={`tag ${getTagClass(tag)}`}` so the returned `tag-{name}` or
// `tag-dynamic` class could pick up per-tag CSS rules. Those rules are
// gone now — every tag renders with inline Tailwind layout utilities
// (`inline-block px-2 py-0.5 rounded-full text-xs font-medium`) plus the
// `getTagStyleObject(tag)` inline style for colors. The `.tag` base CSS
// class was also deleted in a follow-up pass the same day. Don't re-add
// any of them.

/** Inline style object for a tag chip — { backgroundColor, color, border }.
 *
 *  Cached at module level so React re-renders of long tag lists (500+
 *  tags × re-renders = thousands of allocations) hit a Map lookup
 *  instead of recomputing the rgba strings every time.
 *
 *  Alpha values (0.3 bg / 0.5 border for known tags, 0.2 bg / 0.3 border
 *  for dynamic tags) match the pre-consolidation `.tag-{name}` CSS rules
 *  — known tags get a slightly stronger presence because they represent
 *  established semantic categories, dynamic tags get a muted tone to
 *  signal "this is an ad-hoc label, not a first-class category".
 *  Text color honors TAG_TEXT_OVERRIDES so tags with dark primaries
 *  (security, cleanup, config, etc.) get a lifted text tone for
 *  readability on the 30%-opaque background. */
const tagStyleCache = new Map();
export function getTagStyleObject(tag) {
    if (tagStyleCache.has(tag)) return tagStyleCache.get(tag);
    const isDynamic = !TAG_COLORS[tag];
    const bgColor = isDynamic ? getDynamicTagColor(tag) : TAG_COLORS[tag];
    const textColor = isDynamic ? bgColor : (TAG_TEXT_OVERRIDES[tag] || bgColor);
    const r = parseInt(bgColor.slice(1, 3), 16);
    const g = parseInt(bgColor.slice(3, 5), 16);
    const b = parseInt(bgColor.slice(5, 7), 16);
    const bgAlpha = isDynamic ? 0.2 : 0.3;
    const borderAlpha = isDynamic ? 0.3 : 0.5;
    const style = {
        backgroundColor: `rgba(${r}, ${g}, ${b}, ${bgAlpha})`,
        color: textColor,
        border: `1px solid rgba(${r}, ${g}, ${b}, ${borderAlpha})`,
    };
    tagStyleCache.set(tag, style);
    return style;
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

