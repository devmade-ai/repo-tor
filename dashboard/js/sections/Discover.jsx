import React, { useMemo, useState, useEffect, useCallback, useRef } from 'react';
import { useApp } from '../AppContext.jsx';
import { getCommitTags, getCommitDateTime, safeStorageGet, safeStorageSet } from '../utils.js';
import { PAGE_LIMITS } from '../state.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import ShowMoreButton from '../components/ShowMoreButton.jsx';
import useShowMore from '../hooks/useShowMore.js';
import {
    DISCOVER_METRICS,
    getRandomMetrics,
    getHumorousFileName,
} from './discover/discoverData.js';

// --- Discover metric definitions and helpers were extracted to
//     ./discover/discoverData.js on 2026-04-15 to keep this file under
//     the 500-line component soft-limit. The extracted module owns:
//       - DISCOVER_METRICS (21 metric definitions)
//       - getRandomMetrics(count, pinned) (initial + shuffle picker)
//       - getHumorousFileName(path, cache) (file-name generator)
//     This component still owns all React state, effects, and render. ---


// Load pinned state from localStorage
function loadPinnedMetrics() {
    try {
        const saved = safeStorageGet('discoverState');
        if (saved) {
            const parsed = JSON.parse(saved);
            return parsed.pinnedMetrics || {};
        }
    } catch (e) { console.warn('Failed to load pinned metrics:', e.message); }
    return {};
}

function savePinnedMetrics(pinned) {
    try {
        safeStorageSet('discoverState', JSON.stringify({ pinnedMetrics: pinned }));
    } catch (e) { console.warn('Failed to save pinned metrics:', e.message); }
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
    } = useShowMore(fileList, ...PAGE_LIMITS.files, isMobile);

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
        <div className="space-y-4 sm:space-y-6">
            {/* Metric Cards — pick a metric from the dropdown, or shuffle for surprise */}
            <CollapsibleSection title="Metrics" subtitle="Pick a metric or shuffle for surprises">
                <div className="flex justify-end mb-3">
                    <button
                        className="text-xs text-base-content/80 hover:text-base-content"
                        onClick={handleShuffle}
                    >
                        Shuffle
                    </button>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {metricValues.map((metricResult, idx) => {
                        const isPinned = !!pinnedMetrics[idx];
                        return (
                            <div key={selectedMetrics[idx]} className="card bg-base-200 border border-base-300">
                                <div className="card-body p-5 gap-0">
                                    <div className="flex items-center justify-between mb-2 gap-1">
                                        {/* Compact inline metric picker — kept as a raw <select> with
                                            Tailwind utilities instead of DaisyUI `select select-xs`
                                            because DaisyUI's select ships a 2rem minimum height and
                                            a chevron icon that's wrong for this ultra-dense inline
                                            control (the whole card-body is p-5 and the dropdown sits
                                            beside a pin toggle in a flex row). Dead `metric-selector`
                                            marker class removed during the 2026-04-13 audit pass. */}
                                        <select
                                            className="text-xs bg-base-300 text-base-content/80 rounded px-1 py-0.5 cursor-pointer focus:outline-none focus:ring-1 focus:ring-primary min-w-0 truncate"
                                            value={isPinned ? selectedMetrics[idx] : 'random'}
                                            onChange={(e) => handleSelectChange(idx, e.target.value)}
                                        >
                                            <option value="random">Random</option>
                                            {DISCOVER_METRICS.map(m => (
                                                <option key={m.id} value={m.id}>{m.label}</option>
                                            ))}
                                        </select>
                                        {/* Bare icon toggle — kept as a raw <button> with Tailwind
                                            text-color utilities instead of DaisyUI `btn btn-ghost btn-xs`
                                            because the pin toggle is a bare 16px icon that sits inline
                                            with the metric title. DaisyUI's btn applies padding, min
                                            height, and a pill border-radius that would shift the
                                            header layout. Dead `pin-btn` marker class removed during
                                            the 2026-04-13 audit pass. */}
                                        <button
                                            type="button"
                                            className={`text-xs flex-shrink-0 ${isPinned ? 'text-primary' : 'text-base-content/40'} hover:text-primary`}
                                            aria-label={isPinned ? 'Unpin this metric' : 'Pin this metric'}
                                            title={isPinned ? 'Unpin' : 'Pin this metric'}
                                            onClick={() => handlePinToggle(idx)}
                                        >
                                            <svg className="w-4 h-4" fill={isPinned ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
                                            </svg>
                                        </button>
                                    </div>
                                    <p className="text-2xl sm:text-3xl font-bold font-mono tracking-tight text-base-content">{metricResult.value}</p>
                                    <p className="text-xs text-base-content/40">{metricResult.sub}</p>
                                    {metricResult.description && (
                                        <p className="text-xs text-base-content/60 mt-2 leading-snug">{metricResult.description}</p>
                                    )}
                                </div>
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
                                <div key={comp.label} className="p-3 bg-base-300 rounded">
                                    <p className="text-xs text-base-content/60 mb-2">{comp.label}</p>
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs sm:text-sm font-medium text-base-content w-16 sm:w-20 flex-shrink-0">{comp.left.label}</span>
                                        <div className="flex-1 h-4 bg-base-300 rounded-full overflow-hidden flex">
                                            {/* Two-sided comparison bar — success/warning semantic pair
                                                reads as "good vs caution" regardless of active theme. */}
                                            <div className="h-full bg-success" style={{ width: `${leftPct}%` }} />
                                            <div className="h-full bg-warning" style={{ width: `${rightPct}%` }} />
                                        </div>
                                        <span className="text-xs sm:text-sm font-medium text-base-content w-16 sm:w-20 text-right flex-shrink-0">{comp.right.label}</span>
                                    </div>
                                    <div className="flex justify-between text-xs text-base-content/40 mt-1">
                                        <span>{comp.left.value.toLocaleString()} ({leftPct}%)</span>
                                        <span>{comp.right.value.toLocaleString()} ({rightPct}%)</span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-base-content/60 text-sm">Nothing matches the current filters. Try adjusting your selections.</p>
                )}
            </CollapsibleSection>

            {/* File Insights — most changed files (with fun names), least engaging */}
            <CollapsibleSection title="Most Changed Files" subtitle={`Top ${fileList.length} files by number of changes`}>
                {fileInsights === 'loading' ? (
                    <div
                        className="flex items-center gap-2 py-4 justify-center"
                        role="status"
                    >
                        <span className="loading loading-spinner loading-sm text-primary" aria-hidden="true" />
                        <p className="text-base-content/60 text-sm">Loading file data&hellip;</p>
                    </div>
                ) : visibleFiles.length > 0 ? (
                    <div className="space-y-3">
                        {visibleFiles.map(({ path, name, count, pct }) => (
                            <div key={path} className="flex items-center gap-3">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1 gap-2">
                                        <span className="text-sm font-medium text-base-content truncate" title={path}>
                                            {name}
                                        </span>
                                        <span className="text-xs text-base-content/60 whitespace-nowrap">{count} changes</span>
                                    </div>
                                    {/* Native <progress> with DaisyUI progress + progress-info variant.
                                        Screen readers announce "{name} progress: X percent", the fill
                                        color tracks the active theme's info token, and the single
                                        semantic element replaces the prior two-div wrapper pattern. */}
                                    <progress
                                        className="progress progress-info w-full"
                                        value={pct}
                                        max="100"
                                        aria-label={`${name} changes: ${pct} percent of top file`}
                                    />
                                </div>
                            </div>
                        ))}
                        {filesHasMore && (
                            <ShowMoreButton remaining={filesRemaining} pageSize={isMobile ? PAGE_LIMITS.files[0] : PAGE_LIMITS.files[1]} onClick={showMoreFiles} />
                        )}
                    </div>
                ) : (
                    <p className="text-base-content/60 text-sm">No file data available for the current selection.</p>
                )}
            </CollapsibleSection>
        </div>
    );
}
