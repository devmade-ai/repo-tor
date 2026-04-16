/**
 * Discover-tab data: metric pool + humorous file-name generator.
 *
 * Requirement: 21 user-selectable metrics for the Discover tab's
 *   "Metrics" section (random / shuffle / pin), plus a fun anonymized
 *   name generator for the "Most Changed Files" section.
 * Approach: One pure-data module exporting the metric array, the file
 *   name generator, and small helpers used by both consumers (Discover
 *   section component) and tests. No React, no JSX, no hooks — keeps
 *   the metric definitions independent of the component lifecycle so
 *   they can be unit-tested or reused by an embed view in the future.
 *
 * Extracted from sections/Discover.jsx 2026-04-15 to keep the parent
 * component under the 500-line soft-limit (CLAUDE.md "Code
 * Organization"). Discover.jsx had ~270 lines of metric definitions
 * crowding out the ~440 lines of actual React code.
 */

import {
    getCommitTags,
    getAuthorEmail,
    getCommitDateTime,
    getFilesChanged,
} from '../../utils.js';

// --- Humorous file name generator ---
const FILE_NAME_ADJECTIVES = [
    'Whimsical', 'Grumpy', 'Sleepy', 'Dancing', 'Sneaky', 'Jolly', 'Mysterious', 'Brave',
    'Lazy', 'Mighty', 'Tiny', 'Giant', 'Ancient', 'Cosmic', 'Fluffy', 'Sparkly', 'Rusty',
    'Golden', 'Silver', 'Crystal', 'Thunder', 'Shadow', 'Lucky', 'Wild', 'Calm', 'Swift',
];
const FILE_NAME_NOUNS = [
    'Penguin', 'Dragon', 'Unicorn', 'Wizard', 'Robot', 'Ninja', 'Pirate', 'Llama',
    'Phoenix', 'Kraken', 'Goblin', 'Sphinx', 'Yeti', 'Griffin', 'Mermaid', 'Centaur',
    'Cyclops', 'Hydra', 'Chimera', 'Basilisk', 'Troll', 'Ogre', 'Fairy', 'Gnome', 'Sprite',
];

/** Stable adjective+noun pair derived from a file path's hash. The
 *  cache parameter is owned by the consumer (typically a useRef object)
 *  so repeat lookups avoid re-hashing — Discover.jsx renders the
 *  top-10 file list on every metric change and we don't want every
 *  re-render to re-hash 10 paths. */
export function getHumorousFileName(path, cache) {
    if (cache[path]) return cache[path];
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
        hash = ((hash << 5) - hash) + path.charCodeAt(i);
        hash = hash & hash;
    }
    const adjIdx = Math.abs(hash) % FILE_NAME_ADJECTIVES.length;
    const nounIdx = Math.abs(hash >> 8) % FILE_NAME_NOUNS.length;
    const name = `${FILE_NAME_ADJECTIVES[adjIdx]} ${FILE_NAME_NOUNS[nounIdx]}`;
    cache[path] = name;
    return name;
}

// --- Metrics pool ---
// Requirement: Make all metric labels understandable to non-technical users
// Approach: Replace dev jargon ("commit", "ratio", "refactor", "untagged") with
//   plain language ("change", "per", "cleanup", "uncategorized"). Keep labels concise
//   since they appear in small metric cards and dropdown selectors.
// Alternatives:
//   - Add tooltips explaining jargon: Rejected — extra click/hover, CLAUDE.md says
//     "UI must be intuitive without instructions"
//   - Keep dev terms: Rejected — violates "no jargon, technical terms" hard rule
export const DISCOVER_METRICS = [
    {
        id: 'net-growth',
        label: 'Net Code Growth',
        description: 'How much the codebase grew or shrank overall',
        calculate: (commits) => {
            const adds = commits.reduce((sum, c) => sum + (c.stats?.additions ?? 0), 0);
            const dels = commits.reduce((sum, c) => sum + (c.stats?.deletions ?? 0), 0);
            const net = adds - dels;
            return { value: net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString(), sub: 'lines' };
        },
    },
    {
        id: 'avg-commit-size',
        label: 'Avg Change Size',
        description: 'Typical size of each change — smaller is usually easier to review',
        calculate: (commits) => {
            const total = commits.reduce((sum, c) => sum + (c.stats?.additions ?? 0) + (c.stats?.deletions ?? 0), 0);
            const avg = commits.length > 0 ? Math.round(total / commits.length) : 0;
            return { value: avg.toLocaleString(), sub: 'lines per change' };
        },
    },
    {
        id: 'deletion-ratio',
        label: 'Code Removed',
        description: 'How much work went toward removing old code vs adding new code',
        calculate: (commits) => {
            const adds = commits.reduce((sum, c) => sum + (c.stats?.additions ?? 0), 0);
            const dels = commits.reduce((sum, c) => sum + (c.stats?.deletions ?? 0), 0);
            const total = adds + dels;
            const pct = total > 0 ? Math.round((dels / total) * 100) : 0;
            return { value: `${pct}%`, sub: 'of all changes were deletions' };
        },
    },
    {
        id: 'feature-bug-ratio',
        label: 'Features per Bug Fix',
        description: 'Balance between building new things and fixing existing problems',
        calculate: (commits) => {
            const features = commits.filter(c => getCommitTags(c).includes('feature')).length;
            const bugs = commits.filter(c => getCommitTags(c).includes('bugfix') || getCommitTags(c).includes('fix')).length;
            if (bugs === 0) return { value: features > 0 ? `${features}:0` : '0:0', sub: 'features to bug fixes' };
            const ratio = (features / bugs).toFixed(1);
            return { value: `${ratio}:1`, sub: 'features to bug fixes' };
        },
    },
    {
        id: 'test-investment',
        label: 'Testing Effort',
        description: 'How much work is going toward testing — higher means more confidence in quality',
        calculate: (commits) => {
            const tests = commits.filter(c => getCommitTags(c).includes('test')).length;
            const pct = commits.length > 0 ? Math.round((tests / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${tests} test changes` };
        },
    },
    {
        id: 'docs-investment',
        label: 'Documentation Effort',
        description: 'How much work is going toward documentation and guides',
        calculate: (commits) => {
            const docs = commits.filter(c => getCommitTags(c).includes('docs')).length;
            const pct = commits.length > 0 ? Math.round((docs / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${docs} doc changes` };
        },
    },
    {
        id: 'untagged-commits',
        label: 'Uncategorized Changes',
        description: 'Changes without a category — high numbers may mean inconsistent labeling',
        calculate: (commits) => {
            const untagged = commits.filter(c => !c.tags || c.tags.length === 0).length;
            const pct = commits.length > 0 ? Math.round((untagged / commits.length) * 100) : 0;
            return { value: untagged.toLocaleString(), sub: `${pct}% of total` };
        },
    },
    {
        id: 'breaking-changes',
        label: 'Major Updates',
        description: 'Significant changes that could affect how the product works for users',
        calculate: (commits) => {
            const breaking = commits.filter(c => c.has_breaking_change).length;
            return { value: breaking.toLocaleString(), sub: 'changes that may affect users' };
        },
    },
    {
        id: 'peak-hour',
        label: 'Peak Hour',
        description: 'The time of day when the most work gets done',
        calculate: (commits) => {
            const hourCounts = {};
            commits.forEach(c => {
                const hour = getCommitDateTime(c).hour;
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            });
            const peak = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
            if (!peak) return { value: '-', sub: '' };
            const hour = parseInt(peak[0]);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const h12 = hour % 12 || 12;
            return { value: `${h12}${ampm}`, sub: `${peak[1]} changes` };
        },
    },
    {
        id: 'peak-day',
        label: 'Peak Day',
        description: 'The day of the week when the most work happens',
        calculate: (commits) => {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayCounts = {};
            commits.forEach(c => {
                const day = getCommitDateTime(c).dayOfWeek;
                dayCounts[day] = (dayCounts[day] || 0) + 1;
            });
            const peak = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
            if (!peak) return { value: '-', sub: '' };
            return { value: days[parseInt(peak[0])], sub: `${peak[1]} changes` };
        },
    },
    {
        id: 'top-contributor',
        label: 'Top Contributor',
        description: 'The person responsible for the largest share of work',
        calculate: (commits) => {
            const authorCounts = {};
            commits.forEach(c => {
                const email = getAuthorEmail(c);
                authorCounts[email] = (authorCounts[email] || 0) + 1;
            });
            const top = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0];
            if (!top) return { value: '-', sub: '' };
            const pct = Math.round((top[1] / commits.length) * 100);
            return { value: `${pct}%`, sub: 'of all changes' };
        },
    },
    {
        id: 'contributor-count',
        label: 'Active Contributors',
        description: 'How many people contributed work during this period',
        calculate: (commits) => {
            const authors = new Set(commits.map(c => getAuthorEmail(c)));
            return { value: authors.size.toLocaleString(), sub: 'people' };
        },
    },
    {
        id: 'avg-files-per-commit',
        label: 'Files per Change',
        description: 'How many files are typically touched at once — fewer means more focused work',
        calculate: (commits) => {
            const total = commits.reduce((sum, c) => sum + getFilesChanged(c), 0);
            const avg = commits.length > 0 ? (total / commits.length).toFixed(1) : 0;
            return { value: avg, sub: 'average files touched' };
        },
    },
    {
        id: 'single-file-commits',
        label: 'Focused Changes',
        description: 'Changes that touched only one file — a sign of small, targeted work',
        calculate: (commits) => {
            const single = commits.filter(c => getFilesChanged(c) === 1).length;
            const pct = commits.length > 0 ? Math.round((single / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${single} touched just 1 file` };
        },
    },
    {
        id: 'large-commits',
        label: 'Large Changes',
        description: 'Changes over 500 lines — these can be harder to review and more risky',
        calculate: (commits) => {
            const large = commits.filter(c => (c.stats?.additions ?? 0) + (c.stats?.deletions ?? 0) > 500).length;
            const pct = commits.length > 0 ? Math.round((large / commits.length) * 100) : 0;
            return { value: large.toLocaleString(), sub: `${pct}% over 500 lines` };
        },
    },
    {
        id: 'refactor-ratio',
        label: 'Code Cleanup',
        description: 'How much effort is spent reorganizing and improving existing code',
        calculate: (commits) => {
            const refactors = commits.filter(c => getCommitTags(c).includes('refactor')).length;
            const pct = commits.length > 0 ? Math.round((refactors / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${refactors} cleanup changes` };
        },
    },
    {
        id: 'security-commits',
        label: 'Security Work',
        description: 'Changes related to keeping the product safe and secure',
        calculate: (commits) => {
            const security = commits.filter(c => getCommitTags(c).includes('security')).length;
            return { value: security.toLocaleString(), sub: 'security changes' };
        },
    },
    {
        id: 'weekend-work',
        label: 'Weekend Work',
        description: 'Work done on Saturdays and Sundays — can indicate deadline pressure',
        calculate: (commits) => {
            const weekend = commits.filter(c => {
                const day = getCommitDateTime(c).dayOfWeek;
                return day === 0 || day === 6;
            }).length;
            const pct = commits.length > 0 ? Math.round((weekend / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${weekend} changes` };
        },
    },
    {
        id: 'night-owl',
        label: 'Night Owl Work',
        description: 'Work done late at night (10PM\u20136AM) — may signal crunch time',
        calculate: (commits) => {
            const night = commits.filter(c => {
                const hour = getCommitDateTime(c).hour;
                return hour >= 22 || hour < 6;
            }).length;
            const pct = commits.length > 0 ? Math.round((night / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${night} changes (10PM-6AM)` };
        },
    },
    {
        id: 'early-bird',
        label: 'Early Bird Work',
        description: 'Work done early in the morning (5\u20139AM)',
        calculate: (commits) => {
            const early = commits.filter(c => {
                const hour = getCommitDateTime(c).hour;
                return hour >= 5 && hour < 9;
            }).length;
            const pct = commits.length > 0 ? Math.round((early / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${early} changes (5-9AM)` };
        },
    },
];

/** Pick `count` distinct metric ids, honouring any pinned slots from
 *  the `pinned` map (slot index → metric id). Pinned metrics are
 *  placed first; remaining slots are filled randomly from the unused
 *  metrics. Used by Discover.jsx on initial mount and on shuffle. */
export function getRandomMetrics(count, pinned) {
    const result = new Array(count).fill(null);
    const usedIds = new Set();

    // Place pinned metrics first
    for (let i = 0; i < count; i++) {
        const pinnedId = pinned[i];
        if (pinnedId && DISCOVER_METRICS.find(m => m.id === pinnedId)) {
            result[i] = pinnedId;
            usedIds.add(pinnedId);
        }
    }

    // Fill remaining with random
    const available = DISCOVER_METRICS.filter(m => !usedIds.has(m.id));
    for (let i = 0; i < count; i++) {
        if (result[i] === null && available.length > 0) {
            const randIdx = Math.floor(Math.random() * available.length);
            result[i] = available[randIdx].id;
            available.splice(randIdx, 1);
        }
    }

    return result;
}
