import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../AppContext.jsx';
import { getCommitTags, getAuthorEmail, getCommitDateTime, getFilesChanged } from '../utils.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';

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

function getHumorousFileName(path, cache) {
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
const DISCOVER_METRICS = [
    {
        id: 'net-growth',
        label: 'Net Code Growth',
        calculate: (commits) => {
            const adds = commits.reduce((sum, c) => sum + (c.stats?.additions || 0), 0);
            const dels = commits.reduce((sum, c) => sum + (c.stats?.deletions || 0), 0);
            const net = adds - dels;
            return { value: net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString(), sub: 'lines' };
        },
    },
    {
        id: 'avg-commit-size',
        label: 'Avg Change Size',
        calculate: (commits) => {
            const total = commits.reduce((sum, c) => sum + (c.stats?.additions || 0) + (c.stats?.deletions || 0), 0);
            const avg = commits.length > 0 ? Math.round(total / commits.length) : 0;
            return { value: avg.toLocaleString(), sub: 'lines per change' };
        },
    },
    {
        id: 'deletion-ratio',
        label: 'Code Removed',
        calculate: (commits) => {
            const adds = commits.reduce((sum, c) => sum + (c.stats?.additions || 0), 0);
            const dels = commits.reduce((sum, c) => sum + (c.stats?.deletions || 0), 0);
            const total = adds + dels;
            const pct = total > 0 ? Math.round((dels / total) * 100) : 0;
            return { value: `${pct}%`, sub: 'of all changes were deletions' };
        },
    },
    {
        id: 'feature-bug-ratio',
        label: 'Features per Bug Fix',
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
        calculate: (commits) => {
            const tests = commits.filter(c => getCommitTags(c).includes('test')).length;
            const pct = commits.length > 0 ? Math.round((tests / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${tests} test changes` };
        },
    },
    {
        id: 'docs-investment',
        label: 'Documentation Effort',
        calculate: (commits) => {
            const docs = commits.filter(c => getCommitTags(c).includes('docs')).length;
            const pct = commits.length > 0 ? Math.round((docs / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${docs} doc changes` };
        },
    },
    {
        id: 'untagged-commits',
        label: 'Uncategorized Changes',
        calculate: (commits) => {
            const untagged = commits.filter(c => !c.tags || c.tags.length === 0).length;
            const pct = commits.length > 0 ? Math.round((untagged / commits.length) * 100) : 0;
            return { value: untagged.toLocaleString(), sub: `${pct}% of total` };
        },
    },
    {
        id: 'breaking-changes',
        label: 'Major Updates',
        calculate: (commits) => {
            const breaking = commits.filter(c => c.has_breaking_change).length;
            return { value: breaking.toLocaleString(), sub: 'changes that may affect users' };
        },
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
            return { value: `${h12}${ampm}`, sub: `${peak[1]} changes` };
        },
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
            return { value: days[parseInt(peak[0])], sub: `${peak[1]} changes` };
        },
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
            return { value: `${pct}%`, sub: 'of all changes' };
        },
    },
    {
        id: 'contributor-count',
        label: 'Active Contributors',
        calculate: (commits) => {
            const authors = new Set(commits.map(c => getAuthorEmail(c)));
            return { value: authors.size.toLocaleString(), sub: 'people' };
        },
    },
    {
        id: 'avg-files-per-commit',
        label: 'Files per Change',
        calculate: (commits) => {
            const total = commits.reduce((sum, c) => sum + getFilesChanged(c), 0);
            const avg = commits.length > 0 ? (total / commits.length).toFixed(1) : 0;
            return { value: avg, sub: 'average files touched' };
        },
    },
    {
        id: 'single-file-commits',
        label: 'Focused Changes',
        calculate: (commits) => {
            const single = commits.filter(c => getFilesChanged(c) === 1).length;
            const pct = commits.length > 0 ? Math.round((single / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${single} touched just 1 file` };
        },
    },
    {
        id: 'large-commits',
        label: 'Large Changes',
        calculate: (commits) => {
            const large = commits.filter(c => (c.stats?.additions || 0) + (c.stats?.deletions || 0) > 500).length;
            const pct = commits.length > 0 ? Math.round((large / commits.length) * 100) : 0;
            return { value: large.toLocaleString(), sub: `${pct}% over 500 lines` };
        },
    },
    {
        id: 'refactor-ratio',
        label: 'Code Cleanup',
        calculate: (commits) => {
            const refactors = commits.filter(c => getCommitTags(c).includes('refactor')).length;
            const pct = commits.length > 0 ? Math.round((refactors / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${refactors} cleanup changes` };
        },
    },
    {
        id: 'security-commits',
        label: 'Security Work',
        calculate: (commits) => {
            const security = commits.filter(c => getCommitTags(c).includes('security')).length;
            return { value: security.toLocaleString(), sub: 'security changes' };
        },
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
            return { value: `${pct}%`, sub: `${weekend} changes` };
        },
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
            return { value: `${pct}%`, sub: `${night} changes (10PM-6AM)` };
        },
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
            return { value: `${pct}%`, sub: `${early} changes (5-9AM)` };
        },
    },
];

// Load pinned state from localStorage
function loadPinnedMetrics() {
    try {
        const saved = localStorage.getItem('discoverState');
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed.pinnedMetrics || {};
        }
    } catch (e) { /* ignore */ }
    return {};
}

function savePinnedMetrics(pinned) {
    try {
        localStorage.setItem('discoverState', JSON.stringify({ pinnedMetrics: pinned }));
    } catch (e) { /* ignore */ }
}

function getRandomMetrics(count, pinned) {
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

export default function DiscoverTab() {
    const { filteredCommits } = useApp();
    const fileNameCacheRef = useRef({});

    const [pinnedMetrics, setPinnedMetrics] = useState(() => loadPinnedMetrics());
    const [selectedMetrics, setSelectedMetrics] = useState(() =>
        getRandomMetrics(4, loadPinnedMetrics())
    );

    // Save pinned state when it changes
    useEffect(() => {
        savePinnedMetrics(pinnedMetrics);
    }, [pinnedMetrics]);

    // Compute metric values
    const metricValues = useMemo(() => {
        return selectedMetrics.map(metricId => {
            const metric = DISCOVER_METRICS.find(m => m.id === metricId);
            if (!metric) return { value: '-', sub: '', label: 'Unknown' };
            const result = metric.calculate(filteredCommits);
            return { ...result, label: metric.label, id: metric.id };
        });
    }, [selectedMetrics, filteredCommits]);

    const handleSelectChange = useCallback((cardIndex, value) => {
        if (value === 'random') {
            // Unpin and randomize this slot
            setPinnedMetrics(prev => {
                const next = { ...prev };
                delete next[cardIndex];
                return next;
            });
            setSelectedMetrics(prev => {
                const next = [...prev];
                const usedIds = new Set(prev.filter((_, i) => i !== cardIndex));
                const available = DISCOVER_METRICS.filter(m => !usedIds.has(m.id));
                if (available.length > 0) {
                    next[cardIndex] = available[Math.floor(Math.random() * available.length)].id;
                }
                return next;
            });
        } else {
            setPinnedMetrics(prev => ({ ...prev, [cardIndex]: value }));
            setSelectedMetrics(prev => {
                const next = [...prev];
                next[cardIndex] = value;
                return next;
            });
        }
    }, []);

    const handlePinToggle = useCallback((cardIndex) => {
        setPinnedMetrics(prev => {
            const next = { ...prev };
            if (next[cardIndex]) {
                delete next[cardIndex];
            } else {
                next[cardIndex] = selectedMetrics[cardIndex];
            }
            return next;
        });
    }, [selectedMetrics]);

    const handleShuffle = useCallback(() => {
        setSelectedMetrics(getRandomMetrics(4, pinnedMetrics));
    }, [pinnedMetrics]);

    // File Insights
    const fileInsights = useMemo(() => {
        const fileCounts = {};
        filteredCommits.forEach(c => {
            (c.files || []).forEach(path => {
                fileCounts[path] = (fileCounts[path] || 0) + 1;
            });
        });

        const topFiles = Object.entries(fileCounts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 10);

        if (topFiles.length === 0) return null;

        const maxCount = topFiles[0][1];
        return topFiles.map(([path, count]) => ({
            path,
            name: getHumorousFileName(path, fileNameCacheRef.current),
            count,
            pct: Math.round((count / maxCount) * 100),
        }));
    }, [filteredCommits]);

    // Comparisons
    const comparisons = useMemo(() => {
        const items = [];

        // Weekend vs Weekday
        const weekend = filteredCommits.filter(c => {
            const day = getCommitDateTime(c).dayOfWeek;
            return day === 0 || day === 6;
        }).length;
        const weekday = filteredCommits.length - weekend;
        if (filteredCommits.length > 0) {
            items.push({
                label: 'Weekend vs Weekday',
                left: { value: weekend, label: 'Weekend' },
                right: { value: weekday, label: 'Weekday' },
            });
        }

        // Features vs Bugs
        const features = filteredCommits.filter(c => getCommitTags(c).includes('feature')).length;
        const bugs = filteredCommits.filter(c => getCommitTags(c).includes('bugfix') || getCommitTags(c).includes('fix')).length;
        if (features + bugs > 0) {
            items.push({
                label: 'Features vs Bug Fixes',
                left: { value: features, label: 'Features' },
                right: { value: bugs, label: 'Bug Fixes' },
            });
        }

        // Additions vs Deletions
        const adds = filteredCommits.reduce((sum, c) => sum + (c.stats?.additions || 0), 0);
        const dels = filteredCommits.reduce((sum, c) => sum + (c.stats?.deletions || 0), 0);
        if (adds + dels > 0) {
            items.push({
                label: 'Additions vs Deletions',
                left: { value: adds, label: 'Added' },
                right: { value: dels, label: 'Deleted' },
            });
        }

        // Planned vs Reactive
        const planned = filteredCommits.filter(c => c.urgency != null && c.urgency <= 2).length;
        const reactive = filteredCommits.filter(c => c.urgency != null && c.urgency >= 4).length;
        if (planned + reactive > 0) {
            items.push({
                label: 'Planned vs Reactive',
                left: { value: planned, label: 'Planned' },
                right: { value: reactive, label: 'Reactive' },
            });
        }

        // Simple vs Complex
        const simple = filteredCommits.filter(c => c.complexity != null && c.complexity <= 2).length;
        const complex = filteredCommits.filter(c => c.complexity != null && c.complexity >= 4).length;
        if (simple + complex > 0) {
            items.push({
                label: 'Simple vs Complex',
                left: { value: simple, label: 'Simple' },
                right: { value: complex, label: 'Complex' },
            });
        }

        return items;
    }, [filteredCommits]);

    return (
        <div className="space-y-6">
            {/* Metric Cards — pick a metric from the dropdown, or shuffle for surprise */}
            <CollapsibleSection title="Metrics" subtitle="Pick a metric or shuffle for surprises">
                <div className="flex justify-end mb-3">
                    <button
                        className="text-xs text-themed-secondary hover:text-themed-primary"
                        onClick={handleShuffle}
                    >
                        Shuffle
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {metricValues.map((metricResult, idx) => {
                        const isPinned = !!pinnedMetrics[idx];
                        return (
                            <div key={selectedMetrics[idx]} className="card">
                                <div className="flex items-center justify-between mb-2 gap-1">
                                    <select
                                        className="metric-selector text-xs bg-themed-tertiary text-themed-secondary rounded px-1 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-blue-500 min-w-0 truncate"
                                        value={isPinned ? selectedMetrics[idx] : 'random'}
                                        onChange={(e) => handleSelectChange(idx, e.target.value)}
                                    >
                                        <option value="random">Random</option>
                                        {DISCOVER_METRICS.map(m => (
                                            <option key={m.id} value={m.id}>{m.label}</option>
                                        ))}
                                    </select>
                                    <button
                                        className={`pin-btn text-xs flex-shrink-0 ${isPinned ? 'text-blue-500' : 'text-themed-muted'} hover:text-blue-500`}
                                        aria-label={isPinned ? 'Unpin this metric' : 'Pin this metric'}
                                        title={isPinned ? 'Unpin' : 'Pin this metric'}
                                        onClick={() => handlePinToggle(idx)}
                                    >
                                        <svg className="w-4 h-4" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                        </svg>
                                    </button>
                                </div>
                                <p className="text-2xl sm:text-3xl font-bold text-themed-primary">{metricResult.value}</p>
                                <p className="text-xs text-themed-muted">{metricResult.sub}</p>
                            </div>
                        );
                    })}
                </div>
            </CollapsibleSection>

            {/* Comparisons — visually engaging side-by-side bars */}
            <CollapsibleSection title="Head to Head" subtitle="Key metrics compared side by side">
                {comparisons.length > 0 ? (
                    <div className="space-y-4">
                        {comparisons.map((comp) => {
                            const total = comp.left.value + comp.right.value;
                            const leftPct = total > 0 ? Math.round((comp.left.value / total) * 100) : 50;
                            const rightPct = 100 - leftPct;

                            return (
                                <div key={comp.label} className="p-3 bg-themed-tertiary rounded">
                                    <p className="text-xs text-themed-tertiary mb-2">{comp.label}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs sm:text-sm font-medium text-themed-primary w-16 sm:w-20 flex-shrink-0">{comp.left.label}</span>
                                        <div className="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                                            <div className="h-full bg-green-500" style={{ width: `${leftPct}%` }} />
                                            <div className="h-full bg-amber-500" style={{ width: `${rightPct}%` }} />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-themed-primary w-16 sm:w-20 text-right flex-shrink-0">{comp.right.label}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-themed-muted mt-1">
                                        <span>{comp.left.value.toLocaleString()} ({leftPct}%)</span>
                                        <span>{comp.right.value.toLocaleString()} ({rightPct}%)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-themed-tertiary text-sm">No comparison data available</p>
                )}
            </CollapsibleSection>

            {/* File Insights — most changed files (with fun names), least engaging */}
            <CollapsibleSection title="Most Changed Files" subtitle="Top 10 files by number of changes">
                {fileInsights ? (
                    <div className="space-y-3">
                        {fileInsights.map(({ path, name, count, pct }) => (
                            <div key={path} className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1 gap-2">
                                        <span className="text-sm font-medium text-themed-primary truncate" title={path}>
                                            {name}
                                        </span>
                                        <span className="text-xs text-themed-tertiary whitespace-nowrap">{count} changes</span>
                                    </div>
                                    <div className="h-2 bg-themed-tertiary rounded-full overflow-hidden">
                                        <div className="h-full bg-blue-500 rounded-full" style={{ width: `${pct}%` }} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-themed-tertiary text-sm">No file data available</p>
                )}
            </CollapsibleSection>
        </div>
    );
}
