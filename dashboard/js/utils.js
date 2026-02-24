// === Utility / Helper Functions ===
// Extracted from index.html into ES module

import { state, anonymousNames, authorAnonMap, getViewConfig } from './state.js';

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
    // Easter-based holidays (Good Friday, Family Day) - pre-calculated for 2020-2030
    // Must cover same range as buildHolidaySet's year loop (2020-2030)
    easter: {
        2020: { goodFriday: '2020-04-10', familyDay: '2020-04-13' },
        2021: { goodFriday: '2021-04-02', familyDay: '2021-04-05' },
        2022: { goodFriday: '2022-04-15', familyDay: '2022-04-18' },
        2023: { goodFriday: '2023-04-07', familyDay: '2023-04-10' },
        2024: { goodFriday: '2024-03-29', familyDay: '2024-04-01' },
        2025: { goodFriday: '2025-04-18', familyDay: '2025-04-21' },
        2026: { goodFriday: '2026-04-03', familyDay: '2026-04-06' },
        2027: { goodFriday: '2027-03-26', familyDay: '2027-03-29' },
        2028: { goodFriday: '2028-04-14', familyDay: '2028-04-17' },
        2029: { goodFriday: '2029-03-30', familyDay: '2029-04-02' },
        2030: { goodFriday: '2030-04-19', familyDay: '2030-04-22' }
    }
};

// Build holiday lookup set for quick checking
export function buildHolidaySet() {
    const holidays = new Set();
    // Add fixed holidays for years 2020-2030
    for (let year = 2020; year <= 2030; year++) {
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
    }
    // Add Easter-based holidays
    Object.values(SA_HOLIDAYS.easter).forEach(e => {
        holidays.add(e.goodFriday);
        holidays.add(e.familyDay);
    });
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
// Semantic presets for common tags
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

// Palette for dynamic tag colors (works well on dark backgrounds)
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

export function getTagColor(tag) {
    return TAG_COLORS[tag] || getDynamicTagColor(tag);
}

export function getTagClass(tag) {
    return TAG_COLORS[tag] ? `tag-${tag}` : 'tag-dynamic';
}

// Returns a style object for dynamic tag colors
export function getTagStyleObject(tag) {
    if (TAG_COLORS[tag]) return {};
    const color = getDynamicTagColor(tag);
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return {
        '--tag-bg': `rgba(${r}, ${g}, ${b}, 0.2)`,
        '--tag-color': color,
        '--tag-border': `rgba(${r}, ${g}, ${b}, 0.3)`,
    };
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
    return commit.stats?.filesChanged || commit.filesChanged || commit.files_changed || 0;
}

export function getCommitSubject(commit) {
    // Handle different data formats: subject vs message
    return commit.subject || commit.message || '';
}

export function getAdditions(commit) {
    // Handle different data formats: stats.additions vs lines_added
    return commit.stats?.additions || commit.lines_added || 0;
}

export function getDeletions(commit) {
    // Handle different data formats: stats.deletions vs lines_deleted
    return commit.stats?.deletions || commit.lines_deleted || 0;
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

