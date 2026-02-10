import { getCommitTags, getAuthorEmail, getCommitDateTime, getFilesChanged } from '../utils.js';
import { getFilteredCommits } from '../filters.js';

// Humorous file name generator - maps real paths to fun names
const FILE_NAME_ADJECTIVES = [
    'Whimsical', 'Grumpy', 'Sleepy', 'Dancing', 'Sneaky', 'Jolly', 'Mysterious', 'Brave',
    'Lazy', 'Mighty', 'Tiny', 'Giant', 'Ancient', 'Cosmic', 'Fluffy', 'Sparkly', 'Rusty',
    'Golden', 'Silver', 'Crystal', 'Thunder', 'Shadow', 'Lucky', 'Wild', 'Calm', 'Swift'
];
const FILE_NAME_NOUNS = [
    'Penguin', 'Dragon', 'Unicorn', 'Wizard', 'Robot', 'Ninja', 'Pirate', 'Llama',
    'Phoenix', 'Kraken', 'Goblin', 'Sphinx', 'Yeti', 'Griffin', 'Mermaid', 'Centaur',
    'Cyclops', 'Hydra', 'Chimera', 'Basilisk', 'Troll', 'Ogre', 'Fairy', 'Gnome', 'Sprite'
];

// Cache file name mappings per session
let fileNameCache = {};

export function getHumorousFileName(path) {
    if (fileNameCache[path]) return fileNameCache[path];
    // Use path hash for consistent naming
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
        hash = ((hash << 5) - hash) + path.charCodeAt(i);
        hash = hash & hash;
    }
    const adjIdx = Math.abs(hash) % FILE_NAME_ADJECTIVES.length;
    const nounIdx = Math.abs(hash >> 8) % FILE_NAME_NOUNS.length;
    const name = `${FILE_NAME_ADJECTIVES[adjIdx]} ${FILE_NAME_NOUNS[nounIdx]}`;
    fileNameCache[path] = name;
    return name;
}

// Metrics pool - each metric has an id, label, and calculate function
export const DISCOVER_METRICS = [
    {
        id: 'net-growth',
        label: 'Net Code Growth',
        calculate: (commits) => {
            const adds = commits.reduce((sum, c) => sum + (c.stats?.additions || 0), 0);
            const dels = commits.reduce((sum, c) => sum + (c.stats?.deletions || 0), 0);
            const net = adds - dels;
            return { value: net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString(), sub: 'lines' };
        }
    },
    {
        id: 'avg-commit-size',
        label: 'Avg Commit Size',
        calculate: (commits) => {
            const total = commits.reduce((sum, c) => sum + (c.stats?.additions || 0) + (c.stats?.deletions || 0), 0);
            const avg = commits.length > 0 ? Math.round(total / commits.length) : 0;
            return { value: avg.toLocaleString(), sub: 'lines/commit' };
        }
    },
    {
        id: 'deletion-ratio',
        label: 'Deletion Ratio',
        calculate: (commits) => {
            const adds = commits.reduce((sum, c) => sum + (c.stats?.additions || 0), 0);
            const dels = commits.reduce((sum, c) => sum + (c.stats?.deletions || 0), 0);
            const total = adds + dels;
            const pct = total > 0 ? Math.round((dels / total) * 100) : 0;
            return { value: `${pct}%`, sub: 'of changes' };
        }
    },
    {
        id: 'feature-bug-ratio',
        label: 'Feature:Bug Ratio',
        calculate: (commits) => {
            const features = commits.filter(c => getCommitTags(c).includes('feature')).length;
            const bugs = commits.filter(c => getCommitTags(c).includes('bugfix') || getCommitTags(c).includes('fix')).length;
            if (bugs === 0) return { value: features > 0 ? `${features}:0` : '0:0', sub: 'features to bugs' };
            const ratio = (features / bugs).toFixed(1);
            return { value: `${ratio}:1`, sub: 'features to bugs' };
        }
    },
    {
        id: 'test-investment',
        label: 'Test Investment',
        calculate: (commits) => {
            const tests = commits.filter(c => getCommitTags(c).includes('test')).length;
            const pct = commits.length > 0 ? Math.round((tests / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${tests} test commits` };
        }
    },
    {
        id: 'docs-investment',
        label: 'Docs Investment',
        calculate: (commits) => {
            const docs = commits.filter(c => getCommitTags(c).includes('docs')).length;
            const pct = commits.length > 0 ? Math.round((docs / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${docs} doc commits` };
        }
    },
    {
        id: 'untagged-commits',
        label: 'Untagged Commits',
        calculate: (commits) => {
            const untagged = commits.filter(c => !c.tags || c.tags.length === 0).length;
            const pct = commits.length > 0 ? Math.round((untagged / commits.length) * 100) : 0;
            return { value: untagged.toLocaleString(), sub: `${pct}% of total` };
        }
    },
    {
        id: 'breaking-changes',
        label: 'Breaking Changes',
        calculate: (commits) => {
            const breaking = commits.filter(c => c.has_breaking_change).length;
            return { value: breaking.toLocaleString(), sub: 'commits' };
        }
    },
    {
        id: 'peak-hour',
        label: 'Peak Hour',
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
            return { value: `${h12}${ampm}`, sub: `${peak[1]} commits` };
        }
    },
    {
        id: 'peak-day',
        label: 'Peak Day',
        calculate: (commits) => {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayCounts = {};
            commits.forEach(c => {
                const day = getCommitDateTime(c).dayOfWeek;
                dayCounts[day] = (dayCounts[day] || 0) + 1;
            });
            const peak = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
            if (!peak) return { value: '-', sub: '' };
            return { value: days[parseInt(peak[0])], sub: `${peak[1]} commits` };
        }
    },
    {
        id: 'top-contributor',
        label: 'Top Contributor',
        calculate: (commits) => {
            const authorCounts = {};
            commits.forEach(c => {
                const email = getAuthorEmail(c);
                authorCounts[email] = (authorCounts[email] || 0) + 1;
            });
            const top = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0];
            if (!top) return { value: '-', sub: '' };
            const pct = Math.round((top[1] / commits.length) * 100);
            return { value: `${pct}%`, sub: 'of commits' };
        }
    },
    {
        id: 'contributor-count',
        label: 'Active Contributors',
        calculate: (commits) => {
            const authors = new Set(commits.map(c => getAuthorEmail(c)));
            return { value: authors.size.toLocaleString(), sub: 'unique authors' };
        }
    },
    {
        id: 'avg-files-per-commit',
        label: 'Avg Files/Commit',
        calculate: (commits) => {
            const total = commits.reduce((sum, c) => sum + getFilesChanged(c), 0);
            const avg = commits.length > 0 ? (total / commits.length).toFixed(1) : 0;
            return { value: avg, sub: 'files changed' };
        }
    },
    {
        id: 'single-file-commits',
        label: 'Single-File Commits',
        calculate: (commits) => {
            const single = commits.filter(c => getFilesChanged(c) === 1).length;
            const pct = commits.length > 0 ? Math.round((single / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${single} commits` };
        }
    },
    {
        id: 'large-commits',
        label: 'Large Commits',
        calculate: (commits) => {
            const large = commits.filter(c => (c.stats?.additions || 0) + (c.stats?.deletions || 0) > 500).length;
            const pct = commits.length > 0 ? Math.round((large / commits.length) * 100) : 0;
            return { value: large.toLocaleString(), sub: `${pct}% over 500 lines` };
        }
    },
    {
        id: 'refactor-ratio',
        label: 'Refactor Work',
        calculate: (commits) => {
            const refactors = commits.filter(c => getCommitTags(c).includes('refactor')).length;
            const pct = commits.length > 0 ? Math.round((refactors / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${refactors} refactors` };
        }
    },
    {
        id: 'security-commits',
        label: 'Security Work',
        calculate: (commits) => {
            const security = commits.filter(c => getCommitTags(c).includes('security')).length;
            return { value: security.toLocaleString(), sub: 'security commits' };
        }
    },
    {
        id: 'weekend-work',
        label: 'Weekend Work',
        calculate: (commits) => {
            const weekend = commits.filter(c => {
                const day = getCommitDateTime(c).dayOfWeek;
                return day === 0 || day === 6;
            }).length;
            const pct = commits.length > 0 ? Math.round((weekend / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${weekend} commits` };
        }
    },
    {
        id: 'night-owl',
        label: 'Night Owl Work',
        calculate: (commits) => {
            const night = commits.filter(c => {
                const hour = getCommitDateTime(c).hour;
                return hour >= 22 || hour < 6;
            }).length;
            const pct = commits.length > 0 ? Math.round((night / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${night} commits (10PM-6AM)` };
        }
    },
    {
        id: 'early-bird',
        label: 'Early Bird Work',
        calculate: (commits) => {
            const early = commits.filter(c => {
                const hour = getCommitDateTime(c).hour;
                return hour >= 5 && hour < 9;
            }).length;
            const pct = commits.length > 0 ? Math.round((early / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${early} commits (5-9AM)` };
        }
    }
];

// State for discover tab
export let discoverState = {
    selectedMetrics: [], // Array of metric IDs for the 4 cards
    pinnedMetrics: {}    // { cardIndex: metricId } - pinned selections
};

// Load discover state from localStorage
function loadDiscoverState() {
    try {
        const saved = localStorage.getItem('discoverState');
        if (saved) {
            const parsed = JSON.parse(saved);
            discoverState.pinnedMetrics = parsed.pinnedMetrics || {};
        }
    } catch (e) { /* ignore */ }
}

// Save discover state to localStorage
function saveDiscoverState() {
    try {
        localStorage.setItem('discoverState', JSON.stringify({
            pinnedMetrics: discoverState.pinnedMetrics
        }));
    } catch (e) { /* ignore */ }
}

// Get random metrics, respecting pinned selections
export function getRandomMetrics(count = 4) {
    const result = new Array(count).fill(null);
    const usedIds = new Set();

    // First, place pinned metrics
    for (let i = 0; i < count; i++) {
        const pinnedId = discoverState.pinnedMetrics[i];
        if (pinnedId && DISCOVER_METRICS.find(m => m.id === pinnedId)) {
            result[i] = pinnedId;
            usedIds.add(pinnedId);
        }
    }

    // Then fill remaining slots with random metrics
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

export function renderDiscover() {
    const commits = getFilteredCommits();
    loadDiscoverState();

    // Get metrics to display (random or from state)
    if (discoverState.selectedMetrics.length === 0) {
        discoverState.selectedMetrics = getRandomMetrics(4);
    }

    // Render metric cards
    const container = document.getElementById('discover-metrics');
    container.innerHTML = discoverState.selectedMetrics.map((metricId, idx) => {
        const metric = DISCOVER_METRICS.find(m => m.id === metricId);
        if (!metric) return '';

        const result = metric.calculate(commits);
        const isPinned = discoverState.pinnedMetrics[idx] === metricId;

        return `
            <div class="card">
                <div class="flex items-center justify-between mb-2">
                    <select class="metric-selector text-xs bg-transparent border-none text-themed-tertiary cursor-pointer focus:outline-none" data-card-index="${idx}">
                        <option value="random" ${!isPinned ? 'selected' : ''}>Random</option>
                        ${DISCOVER_METRICS.map(m => `
                            <option value="${m.id}" ${isPinned && m.id === metricId ? 'selected' : ''}>${m.label}</option>
                        `).join('')}
                    </select>
                    <button class="pin-btn text-xs ${isPinned ? 'text-blue-500' : 'text-themed-muted'} hover:text-blue-500" data-card-index="${idx}" title="${isPinned ? 'Unpin' : 'Pin this metric'}">
                        <svg class="w-4 h-4" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                    </button>
                </div>
                <p class="text-3xl font-bold text-themed-primary">${result.value}</p>
                <p class="text-xs text-themed-muted">${result.sub}</p>
            </div>
        `;
    }).join('');

    // Add event listeners for selectors and pins
    container.querySelectorAll('.metric-selector').forEach(select => {
        select.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.cardIndex);
            const value = e.target.value;

            if (value === 'random') {
                delete discoverState.pinnedMetrics[idx];
                // Pick a new random metric for this slot
                const usedIds = new Set(discoverState.selectedMetrics.filter((_, i) => i !== idx));
                const available = DISCOVER_METRICS.filter(m => !usedIds.has(m.id));
                if (available.length > 0) {
                    discoverState.selectedMetrics[idx] = available[Math.floor(Math.random() * available.length)].id;
                }
            } else {
                discoverState.selectedMetrics[idx] = value;
                discoverState.pinnedMetrics[idx] = value;
            }

            saveDiscoverState();
            renderDiscover();
        });
    });

    container.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.cardIndex);
            const metricId = discoverState.selectedMetrics[idx];

            if (discoverState.pinnedMetrics[idx]) {
                delete discoverState.pinnedMetrics[idx];
            } else {
                discoverState.pinnedMetrics[idx] = metricId;
            }

            saveDiscoverState();
            renderDiscover();
        });
    });

    // Render file insights
    renderFileInsights(commits);

    // Render comparisons
    renderComparisons(commits);
}

export function renderFileInsights(commits) {
    // Get file change counts
    const fileCounts = {};
    commits.forEach(c => {
        (c.files || []).forEach(path => {
            fileCounts[path] = (fileCounts[path] || 0) + 1;
        });
    });

    // Sort by count and take top 10
    const topFiles = Object.entries(fileCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const container = document.getElementById('file-insights');
    if (topFiles.length === 0) {
        container.innerHTML = '<p class="text-themed-tertiary text-sm">No file data available</p>';
        return;
    }

    const maxCount = topFiles[0][1];
    container.innerHTML = topFiles.map(([path, count]) => {
        const name = getHumorousFileName(path);
        const pct = Math.round((count / maxCount) * 100);
        return `
            <div class="flex items-center gap-3">
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-sm font-medium text-themed-primary" title="Hover for real path">${name}</span>
                        <span class="text-xs text-themed-tertiary">${count} changes</span>
                    </div>
                    <div class="h-2 bg-themed-tertiary rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500 rounded-full" style="width: ${pct}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

export function renderComparisons(commits) {
    const comparisons = [];

    // Weekend vs Weekday
    const weekend = commits.filter(c => {
        const day = getCommitDateTime(c).dayOfWeek;
        return day === 0 || day === 6;
    }).length;
    const weekday = commits.length - weekend;
    if (commits.length > 0) {
        comparisons.push({
            label: 'Weekend vs Weekday',
            left: { value: weekend, label: 'Weekend' },
            right: { value: weekday, label: 'Weekday' }
        });
    }

    // Features vs Bugs
    const features = commits.filter(c => getCommitTags(c).includes('feature')).length;
    const bugs = commits.filter(c => getCommitTags(c).includes('bugfix') || getCommitTags(c).includes('fix')).length;
    if (features + bugs > 0) {
        comparisons.push({
            label: 'Features vs Bug Fixes',
            left: { value: features, label: 'Features' },
            right: { value: bugs, label: 'Bug Fixes' }
        });
    }

    // Additions vs Deletions
    const adds = commits.reduce((sum, c) => sum + (c.stats?.additions || 0), 0);
    const dels = commits.reduce((sum, c) => sum + (c.stats?.deletions || 0), 0);
    if (adds + dels > 0) {
        comparisons.push({
            label: 'Additions vs Deletions',
            left: { value: adds, label: 'Added' },
            right: { value: dels, label: 'Deleted' }
        });
    }

    // Planned vs Reactive
    const planned = commits.filter(c => c.urgency != null && c.urgency <= 2).length;
    const reactive = commits.filter(c => c.urgency != null && c.urgency >= 4).length;
    if (planned + reactive > 0) {
        comparisons.push({
            label: 'Planned vs Reactive',
            left: { value: planned, label: 'Planned' },
            right: { value: reactive, label: 'Reactive' }
        });
    }

    // Simple vs Complex
    const simple = commits.filter(c => c.complexity != null && c.complexity <= 2).length;
    const complex = commits.filter(c => c.complexity != null && c.complexity >= 4).length;
    if (simple + complex > 0) {
        comparisons.push({
            label: 'Simple vs Complex',
            left: { value: simple, label: 'Simple' },
            right: { value: complex, label: 'Complex' }
        });
    }

    const container = document.getElementById('discover-comparisons');
    if (comparisons.length === 0) {
        container.innerHTML = '<p class="text-themed-tertiary text-sm">No comparison data available</p>';
        return;
    }

    container.innerHTML = comparisons.map(comp => {
        const total = comp.left.value + comp.right.value;
        const leftPct = total > 0 ? Math.round((comp.left.value / total) * 100) : 50;
        const rightPct = 100 - leftPct;

        return `
            <div class="p-3 bg-themed-tertiary rounded">
                <p class="text-xs text-themed-tertiary mb-2">${comp.label}</p>
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-themed-primary w-20">${comp.left.label}</span>
                    <div class="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                        <div class="h-full bg-green-500" style="width: ${leftPct}%"></div>
                        <div class="h-full bg-amber-500" style="width: ${rightPct}%"></div>
                    </div>
                    <span class="text-sm font-medium text-themed-primary w-20 text-right">${comp.right.label}</span>
                </div>
                <div class="flex justify-between text-xs text-themed-muted mt-1">
                    <span>${comp.left.value.toLocaleString()} (${leftPct}%)</span>
                    <span>${comp.right.value.toLocaleString()} (${rightPct}%)</span>
                </div>
            </div>
        `;
    }).join('');
}
