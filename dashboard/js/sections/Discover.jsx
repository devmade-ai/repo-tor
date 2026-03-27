import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../AppContext.jsx';
import { getCommitTags, getAuthorEmail, getCommitDateTime, getFilesChanged } from '../utils.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import useShowMore from '../hooks/useShowMore.js';

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

// Load pinned state from localStorage
function loadPinnedMetrics() {
    try {
        const saved = localStorage.getItem('discoverState');
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed.pinnedMetrics || {};
        }
    } catch (e) { console.warn('Failed to load pinned metrics:', e.message); }
    return {};
}

function savePinnedMetrics(pinned) {
    try {
        localStorage.setItem('discoverState', JSON.stringify({ pinnedMetrics: pinned }));
    } catch (e) { console.warn('Failed to save pinned metrics:', e.message); }
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

export default function Discover() {
    const { state, filteredCommits, commitsLoaded, isMobile } = useApp();
    const fileNameCacheRef = useRef({});

    const [pinnedMetrics, setPinnedMetrics] = useState(() => loadPinnedMetrics());
    const [selectedMetrics, setSelectedMetrics] = useState(() =>
        getRandomMetrics(4, loadPinnedMetrics())
    );

    // Save pinned state when it changes
    useEffect(() => {
        savePinnedMetrics(pinnedMetrics);
    }, [pinnedMetrics]);

    // Requirement: Show Discover metrics during Phase 1 using pre-aggregated summary data
    // Approach: When commits aren't loaded, derive metric values from summary fields
    //   (codeStats, tagBreakdown, urgencyBreakdown, complexityBreakdown, hourlyHeatmap,
    //   contributors). Not all metrics can be computed from summary — those that can't
    //   show "\u2014" (em dash) until commits load.
    // Alternatives:
    //   - Show spinner: Rejected — most metrics ARE derivable from summary
    //   - Pre-compute all metric values in aggregation: Rejected — metrics are user-selectable
    //     and the calculate functions are complex; summary fields provide enough to derive most
    const metricValues = useMemo(() => {
        if (commitsLoaded) {
            return selectedMetrics.map(metricId => {
                const metric = DISCOVER_METRICS.find(m => m.id === metricId);
                if (!metric) return { value: '-', sub: '', label: 'Unknown', description: '' };
                const result = metric.calculate(filteredCommits);
                return { ...result, label: metric.label, id: metric.id, description: metric.description };
            });
        }

        // Phase 1: derive from summary data
        const summary = state.data?.summary;
        if (!summary) return selectedMetrics.map(() => ({ value: '\u2014', sub: '', label: '' }));

        const cs = summary.codeStats || {};
        const tb = summary.tagBreakdown || {};
        const ub = summary.urgencyBreakdown || {};
        const cb = summary.complexityBreakdown || {};
        const hm = summary.hourlyHeatmap || {};
        const total = summary.totalCommits || 0;

        const summaryCalc = {
            'net-growth': () => {
                const net = (cs.additions || 0) - (cs.deletions || 0);
                return { value: net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString(), sub: 'lines' };
            },
            'avg-commit-size': () => {
                const totalChanges = (cs.additions || 0) + (cs.deletions || 0);
                const avg = total > 0 ? Math.round(totalChanges / total) : 0;
                return { value: avg.toLocaleString(), sub: 'lines per change' };
            },
            'deletion-ratio': () => {
                const totalChanges = (cs.additions || 0) + (cs.deletions || 0);
                const pct = totalChanges > 0 ? Math.round(((cs.deletions || 0) / totalChanges) * 100) : 0;
                return { value: `${pct}%`, sub: 'of all changes were deletions' };
            },
            'feature-bug-ratio': () => {
                const features = tb.feature || 0;
                const bugs = (tb.bugfix || 0) + (tb.fix || 0);
                if (bugs === 0) return { value: features > 0 ? `${features}:0` : '0:0', sub: 'features to bug fixes' };
                return { value: `${(features / bugs).toFixed(1)}:1`, sub: 'features to bug fixes' };
            },
            'test-investment': () => {
                const tests = tb.test || 0;
                const pct = total > 0 ? Math.round((tests / total) * 100) : 0;
                return { value: `${pct}%`, sub: `${tests} test changes` };
            },
            'docs-investment': () => {
                const docs = tb.docs || 0;
                const pct = total > 0 ? Math.round((docs / total) * 100) : 0;
                return { value: `${pct}%`, sub: `${docs} doc changes` };
            },
            'peak-hour': () => {
                const byHour = hm.byHour || [];
                if (byHour.length === 0) return { value: '\u2014', sub: '' };
                const peakIdx = byHour.indexOf(Math.max(...byHour));
                const ampm = peakIdx >= 12 ? 'PM' : 'AM';
                const h12 = peakIdx % 12 || 12;
                return { value: `${h12}${ampm}`, sub: `${byHour[peakIdx]} changes (UTC)` };
            },
            'peak-day': () => {
                const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
                const byDay = hm.byDay || [];
                if (byDay.length === 0) return { value: '\u2014', sub: '' };
                const peakIdx = byDay.indexOf(Math.max(...byDay));
                return { value: days[peakIdx], sub: `${byDay[peakIdx]} changes` };
            },
            'contributor-count': () => {
                return { value: (summary.totalContributors || 0).toLocaleString(), sub: 'people contributing' };
            },
        };

        return selectedMetrics.map(metricId => {
            const metric = DISCOVER_METRICS.find(m => m.id === metricId);
            if (!metric) return { value: '-', sub: '', label: 'Unknown', description: '' };
            const calc = summaryCalc[metricId];
            if (calc) return { ...calc(), label: metric.label, id: metric.id, description: metric.description };
            return { value: '\u2014', sub: 'Loading\u2026', label: metric.label, id: metric.id, description: metric.description };
        });
    }, [selectedMetrics, filteredCommits, commitsLoaded, state.data?.summary]);

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

    // File Insights — requires per-commit file lists, not available from summary
    const fileInsights = useMemo(() => {
        if (!commitsLoaded) return 'loading';
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
    }, [filteredCommits, commitsLoaded]);

    // Paginate file insights — 5 mobile / 10 desktop
    const fileList = Array.isArray(fileInsights) ? fileInsights : [];
    const {
        visible: visibleFiles,
        hasMore: filesHasMore,
        remaining: filesRemaining,
        showMore: showMoreFiles,
    } = useShowMore(fileList, 5, 10, isMobile);

    // Comparisons — derive from summary during Phase 1, from commits during Phase 2
    const comparisons = useMemo(() => {
        const items = [];

        if (commitsLoaded) {
            // Phase 2: compute from filtered commits
            const weekend = filteredCommits.filter(c => {
                const day = getCommitDateTime(c).dayOfWeek;
                return day === 0 || day === 6;
            }).length;
            const weekday = filteredCommits.length - weekend;
            if (filteredCommits.length > 0) items.push({ label: 'Weekend vs Weekday', left: { value: weekend, label: 'Weekend' }, right: { value: weekday, label: 'Weekday' } });

            const features = filteredCommits.filter(c => getCommitTags(c).includes('feature')).length;
            const bugs = filteredCommits.filter(c => getCommitTags(c).includes('bugfix') || getCommitTags(c).includes('fix')).length;
            if (features + bugs > 0) items.push({ label: 'Features vs Bug Fixes', left: { value: features, label: 'Features' }, right: { value: bugs, label: 'Bug Fixes' } });

            const adds = filteredCommits.reduce((sum, c) => sum + (c.stats?.additions ?? 0), 0);
            const dels = filteredCommits.reduce((sum, c) => sum + (c.stats?.deletions ?? 0), 0);
            if (adds + dels > 0) items.push({ label: 'Additions vs Deletions', left: { value: adds, label: 'Added' }, right: { value: dels, label: 'Deleted' } });

            const planned = filteredCommits.filter(c => c.urgency != null && c.urgency <= 2).length;
            const reactive = filteredCommits.filter(c => c.urgency != null && c.urgency >= 4).length;
            if (planned + reactive > 0) items.push({ label: 'Planned vs Reactive', left: { value: planned, label: 'Planned' }, right: { value: reactive, label: 'Reactive' } });

            const simple = filteredCommits.filter(c => c.complexity != null && c.complexity <= 2).length;
            const complex = filteredCommits.filter(c => c.complexity != null && c.complexity >= 4).length;
            if (simple + complex > 0) items.push({ label: 'Simple vs Complex', left: { value: simple, label: 'Simple' }, right: { value: complex, label: 'Complex' } });
        } else {
            // Phase 1: derive from summary data
            const summary = state.data?.summary;
            if (summary) {
                const tb = summary.tagBreakdown || {};
                const ub = summary.urgencyBreakdown || {};
                const cb = summary.complexityBreakdown || {};
                const cs = summary.codeStats || {};
                const hm = summary.hourlyHeatmap || {};

                const byDay = hm.byDay || [];
                const weekend = (byDay[0] || 0) + (byDay[6] || 0);
                const weekday = byDay.slice(1, 6).reduce((s, v) => s + v, 0);
                if (weekend + weekday > 0) items.push({ label: 'Weekend vs Weekday', left: { value: weekend, label: 'Weekend' }, right: { value: weekday, label: 'Weekday' } });

                const features = tb.feature || 0;
                const bugs = (tb.bugfix || 0) + (tb.fix || 0);
                if (features + bugs > 0) items.push({ label: 'Features vs Bug Fixes', left: { value: features, label: 'Features' }, right: { value: bugs, label: 'Bug Fixes' } });

                if ((cs.additions || 0) + (cs.deletions || 0) > 0) items.push({ label: 'Additions vs Deletions', left: { value: cs.additions, label: 'Added' }, right: { value: cs.deletions, label: 'Deleted' } });

                const planned = (ub[1] || 0) + (ub[2] || 0);
                const reactive = (ub[4] || 0) + (ub[5] || 0);
                if (planned + reactive > 0) items.push({ label: 'Planned vs Reactive', left: { value: planned, label: 'Planned' }, right: { value: reactive, label: 'Reactive' } });

                const simple = (cb[1] || 0) + (cb[2] || 0);
                const complex = (cb[4] || 0) + (cb[5] || 0);
                if (simple + complex > 0) items.push({ label: 'Simple vs Complex', left: { value: simple, label: 'Simple' }, right: { value: complex, label: 'Complex' } });
            }
        }

        return items;
    }, [filteredCommits, commitsLoaded, state.data?.summary]);

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
                                {metricResult.description && (
                                    <p className="text-xs text-themed-tertiary mt-2 leading-snug">{metricResult.description}</p>
                                )}
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
                    <p className="text-themed-tertiary text-sm">Nothing matches the current filters. Try adjusting your selections.</p>
                )}
            </CollapsibleSection>

            {/* File Insights — most changed files (with fun names), least engaging */}
            <CollapsibleSection title="Most Changed Files" subtitle={`Top ${fileList.length} files by number of changes`}>
                {fileInsights === 'loading' ? (
                    <div className="flex items-center gap-2 py-4 justify-center">
                        <div className="loading-spinner" style={{ width: 16, height: 16, borderWidth: 2 }} />
                        <p className="text-themed-tertiary text-sm">Loading file data&hellip;</p>
                    </div>
                ) : visibleFiles.length > 0 ? (
                    <div className="space-y-3">
                        {visibleFiles.map(({ path, name, count, pct }) => (
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
                        {filesHasMore && (
                            <button type="button" className="show-more-btn" onClick={showMoreFiles}>
                                Show {Math.min(filesRemaining, isMobile ? 5 : 10)} more of {filesRemaining} remaining
                            </button>
                        )}
                    </div>
                ) : (
                    <p className="text-themed-tertiary text-sm">No file data available for the current selection.</p>
                )}
            </CollapsibleSection>
        </div>
    );
}
