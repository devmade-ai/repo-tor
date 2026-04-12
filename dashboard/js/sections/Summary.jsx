import React, { useMemo } from 'react';
import { useApp } from '../AppContext.jsx';
import { getCommitTags, getWorkPattern, handleKeyActivate } from '../utils.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';

// Requirement: Derive summary metrics from pre-aggregated data when commits aren't loaded
// Approach: Read tagBreakdown, complexityBreakdown, urgencyBreakdown, riskBreakdown, and
//   debtBreakdown from summary object. Only metrics requiring per-commit timestamp analysis
//   (after-hours, weekend, holiday) fall back to "-" until commits load.
// Alternatives:
//   - Wait for commits to load before rendering: Rejected — delays initial paint
//   - Pre-aggregate work pattern data: Rejected — requires timezone/work-hour config at build time
function metricsFromSummary(summary) {
    const tb = summary.tagBreakdown || {};
    const cb = summary.complexityBreakdown || {};
    const ub = summary.urgencyBreakdown || {};
    const rb = summary.riskBreakdown || {};
    const db = summary.debtBreakdown || {};

    const features = tb.feature || 0;
    const fixes = (tb.bugfix || 0) + (tb.fix || 0);
    const avgUrgency = summary.avgUrgency || 0;

    // Planned = urgency 1 + 2, total = sum of all urgency buckets
    const planned = (ub[1] || 0) + (ub[2] || 0);
    const urgencyTotal = Object.values(ub).reduce((a, b) => a + b, 0);
    const plannedPct = urgencyTotal > 0 ? Math.round((planned / urgencyTotal) * 100) : 0;

    const complexChanges = (cb[4] || 0) + (cb[5] || 0);
    const simpleChanges = (cb[1] || 0) + (cb[2] || 0);

    const refactorCount = tb.refactor || 0;
    const testCount = tb.test || 0;

    const highRiskCount = rb.high || 0;
    const mediumRiskCount = rb.medium || 0;
    const hasRiskData = (rb.low || 0) + mediumRiskCount + highRiskCount > 0;

    const debtAdded = db.added || 0;
    const debtPaid = db.paid || 0;
    const hasDebtData = debtAdded + debtPaid + (db.neutral || 0) > 0;

    // Work pattern metrics require per-commit analysis — not available from pre-aggregated data
    return {
        features, fixes, avgUrgency, plannedPct,
        complexChanges, simpleChanges,
        topRepo: null, topRepoPct: 0,
        afterHoursCount: null, weekendCount: null, holidayCount: null, afterHoursPct: null,
        refactorCount, testCount,
        highRiskCount, mediumRiskCount, debtAdded, debtPaid,
        hasRiskData, hasDebtData,
    };
}

export default function Summary() {
    const { state, filteredCommits, commitsLoaded, openDetailPane } = useApp();

    // Requirement: Show metrics from pre-aggregated data immediately, refine when commits load
    // Approach: Use summary breakdowns for counts/averages (available instantly), compute
    //   per-commit metrics (work patterns, top repo) only after commits are loaded.
    //   Once commits are loaded, ALWAYS use filteredCommits (even if empty due to filters)
    //   to avoid falling back to unfiltered summary data.
    // Alternatives: Compute everything from commits — rejected, blocks rendering until loaded
    const metrics = useMemo(() => {
        // If commits are loaded, compute full metrics from filtered commits
        if (commitsLoaded) {
            const commits = filteredCommits;

            const features = commits.filter(c => getCommitTags(c).includes('feature')).length;
            const fixes = commits.filter(c => {
                const tags = getCommitTags(c);
                return tags.includes('bugfix') || tags.includes('fix');
            }).length;

            const urgencies = commits.map(c => c.urgency).filter(u => u != null && u >= 1 && u <= 5);
            const avgUrgency = urgencies.length > 0
                ? (urgencies.reduce((a, b) => a + b, 0) / urgencies.length)
                : 0;

            const withUrgency = commits.filter(c => c.urgency != null && c.urgency >= 1 && c.urgency <= 5);
            const planned = withUrgency.filter(c => c.urgency <= 2).length;
            const plannedPct = withUrgency.length > 0 ? Math.round((planned / withUrgency.length) * 100) : 0;

            const complexChanges = commits.filter(c => c.complexity >= 4).length;
            const simpleChanges = commits.filter(c => c.complexity != null && c.complexity <= 2).length;

            const repoCounts = {};
            commits.forEach(c => {
                if (c.repo_id) {
                    repoCounts[c.repo_id] = (repoCounts[c.repo_id] || 0) + 1;
                }
            });
            const repos = Object.keys(repoCounts);
            let topRepo = null;
            let topRepoPct = 0;
            if (repos.length > 1) {
                const sorted = Object.entries(repoCounts).sort((a, b) => b[1] - a[1]);
                topRepo = sorted[0][0];
                topRepoPct = Math.round((sorted[0][1] / commits.length) * 100);
            }

            const afterHoursCount = commits.filter(c => getWorkPattern(c).isAfterHours).length;
            const weekendCount = commits.filter(c => getWorkPattern(c).isWeekend).length;
            const holidayCount = commits.filter(c => getWorkPattern(c).isHoliday).length;
            const afterHoursPct = commits.length > 0
                ? Math.round((afterHoursCount / commits.length) * 100)
                : 0;

            const refactorCount = commits.filter(c => getCommitTags(c).includes('refactor')).length;
            const testCount = commits.filter(c => getCommitTags(c).includes('test')).length;

            const highRiskCount = commits.filter(c => c.risk === 'high').length;
            const mediumRiskCount = commits.filter(c => c.risk === 'medium').length;
            const debtAdded = commits.filter(c => c.debt === 'added').length;
            const debtPaid = commits.filter(c => c.debt === 'paid').length;
            const hasRiskData = commits.some(c => c.risk);
            const hasDebtData = commits.some(c => c.debt);

            return {
                features, fixes, avgUrgency, plannedPct,
                complexChanges, simpleChanges,
                topRepo, topRepoPct,
                afterHoursCount, weekendCount, holidayCount, afterHoursPct,
                refactorCount, testCount,
                highRiskCount, mediumRiskCount, debtAdded, debtPaid,
                hasRiskData, hasDebtData,
            };
        }

        // Pre-aggregated path: derive from summary breakdowns
        if (state.data?.summary) {
            return metricsFromSummary(state.data.summary);
        }

        // No data at all
        return {
            features: 0, fixes: 0, avgUrgency: 0, plannedPct: 0,
            complexChanges: 0, simpleChanges: 0,
            topRepo: null, topRepoPct: 0,
            afterHoursCount: null, weekendCount: null, holidayCount: null, afterHoursPct: null,
            refactorCount: 0, testCount: 0,
            highRiskCount: 0, mediumRiskCount: 0, debtAdded: 0, debtPaid: 0,
            hasRiskData: false, hasDebtData: false,
        };
    }, [filteredCommits, commitsLoaded, state.data?.summary]);

    const highlights = useMemo(() => {
        const items = [];

        if (metrics.complexChanges > 0 || metrics.simpleChanges > 0) {
            items.push({
                label: 'Complex Changes',
                value: `${metrics.complexChanges} high complexity`,
                subvalue: `${metrics.simpleChanges} simple`,
            });
        }

        if (metrics.topRepo) {
            items.push({
                label: 'Most Active Repo',
                value: metrics.topRepo,
                subvalue: `${metrics.topRepoPct}% of work`,
            });
        }

        if (metrics.afterHoursPct > 0 || metrics.weekendCount > 0) {
            items.push({
                label: 'Off-Hours Work',
                value: `${metrics.afterHoursPct}% after hours`,
                subvalue: `${metrics.weekendCount} weekend`,
            });
        }

        if (metrics.refactorCount > 0 || metrics.testCount > 0) {
            items.push({
                label: 'Quality Work',
                value: `${metrics.refactorCount} refactors`,
                subvalue: `${metrics.testCount} tests`,
            });
        }

        // Risk highlight — only when risk data exists
        if (metrics.hasRiskData && (metrics.highRiskCount > 0 || metrics.mediumRiskCount > 0)) {
            items.push({
                label: 'Risky Changes',
                value: `${metrics.highRiskCount} high risk`,
                subvalue: `${metrics.mediumRiskCount} medium risk`,
            });
        }

        // Debt highlight — only when debt data exists
        if (metrics.hasDebtData && (metrics.debtAdded > 0 || metrics.debtPaid > 0)) {
            const net = metrics.debtAdded - metrics.debtPaid;
            items.push({
                label: 'Tech Debt',
                value: net > 0 ? `+${net} accumulating` : net < 0 ? `${net} shrinking` : 'Balanced',
                subvalue: `${metrics.debtAdded} added, ${metrics.debtPaid} paid`,
            });
        }

        return items;
    }, [metrics]);

    const handleCardClick = (cardType) => {
        let filtered, title;
        if (cardType === 'features') {
            filtered = filteredCommits.filter(c => getCommitTags(c).includes('feature'));
            title = 'Feature Commits';
        } else if (cardType === 'fixes') {
            filtered = filteredCommits.filter(c => {
                const tags = getCommitTags(c);
                return tags.includes('bugfix') || tags.includes('fix');
            });
            title = 'Bug Fix Commits';
        } else if (cardType === 'urgency') {
            filtered = filteredCommits.filter(c => c.urgency >= 4);
            title = 'Reactive Commits (Urgency 4-5)';
        } else if (cardType === 'planned') {
            filtered = filteredCommits.filter(c => c.urgency <= 2);
            title = 'Planned Work (Urgency 1-2)';
        }
        if (filtered) {
            openDetailPane(title, `${filtered.length} commits`, filtered);
        }
    };

    // Requirement: Order sections from most interesting to least interesting
    // Approach: Highlights first (surprising patterns), then colorful snapshot, then raw stats
    // Alternatives:
    //   - Stats first: Rejected — numbers without context are the least engaging opener
    //   - Snapshot first: Rejected — highlights surface actionable insights better
    return (
        <div className="space-y-6">
            {/* Key Highlights — most interesting: surfaces notable patterns and surprises */}
            <CollapsibleSection title="Key Highlights" subtitle="Notable patterns in recent work">
                {highlights.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {highlights.map((h) => (
                            <div key={h.label} className="p-3 bg-base-300 rounded">
                                <p className="text-xs text-base-content/60 mb-1">{h.label}</p>
                                <p className="text-sm font-semibold text-base-content">{h.value}</p>
                                {h.subvalue && (
                                    <p className="text-xs text-base-content/60">{h.subvalue}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-base-content/60 text-sm">No highlights to show for the current data</p>
                )}
            </CollapsibleSection>

            {/*
              Activity Snapshot — four attention-grabbing cards.
              Requirement: Each metric needs a visually distinct background so users
                can scan the four stats at a glance.
              Approach: Use DaisyUI semantic tokens (warning / info / accent / secondary)
                with a ~15% tint for the background and the full token for the number.
                These auto-switch with the active theme so we don't need `dark:` pairs.
              Alternatives:
                - Fixed Tailwind pastels (bg-amber-50 etc.) with `dark:` pairs: Rejected —
                  the whole point of the DaisyUI migration is to eliminate `dark:` pairs
                  and let the theme token system drive colors.
                - Same token for all four cards: Rejected — the stats are categorically
                  different (after-hours / weekend / holiday / complex), so visually
                  distinct tints help users parse them at a glance.
            */}
            <CollapsibleSection title="Activity Snapshot" subtitle="Work timing and complexity signals">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-warning/15 rounded">
                        <p className="text-2xl font-bold text-warning">{metrics.afterHoursCount ?? '...'}</p>
                        <p className="text-xs text-base-content/60">After-hours</p>
                    </div>
                    <div className="text-center p-3 bg-info/15 rounded">
                        <p className="text-2xl font-bold text-info">{metrics.weekendCount ?? '...'}</p>
                        <p className="text-xs text-base-content/60">Weekend</p>
                    </div>
                    <div className="text-center p-3 bg-accent/15 rounded">
                        <p className="text-2xl font-bold text-accent">{metrics.holidayCount ?? '...'}</p>
                        <p className="text-xs text-base-content/60">Holiday</p>
                    </div>
                    <div className="text-center p-3 bg-secondary/15 rounded">
                        <p className="text-2xl font-bold text-secondary">{metrics.complexChanges}</p>
                        <p className="text-xs text-base-content/60">Complex</p>
                    </div>
                </div>
            </CollapsibleSection>

            {/* Key Stats — reference numbers, least engaging but useful for context */}
            <CollapsibleSection title="Key Stats" subtitle="Overall project numbers">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div
                        className="stat-card cursor-pointer hover:ring-2 hover:ring-blue-500 rounded-lg transition-all"
                        role="button"
                        tabIndex={0}
                        aria-label={`${metrics.features} features built — click to see details`}
                        onClick={() => handleCardClick('features')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('features'))}
                    >
                        <div className="p-4 bg-base-300 rounded-lg text-center">
                            <div className="text-2xl font-semibold text-base-content">{metrics.features}</div>
                            <div className="text-sm text-base-content/60">Features Built</div>
                        </div>
                    </div>
                    <div
                        className="stat-card cursor-pointer hover:ring-2 hover:ring-blue-500 rounded-lg transition-all"
                        role="button"
                        tabIndex={0}
                        aria-label={`${metrics.fixes} bugs fixed — click to see details`}
                        onClick={() => handleCardClick('fixes')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('fixes'))}
                    >
                        <div className="p-4 bg-base-300 rounded-lg text-center">
                            <div className="text-2xl font-semibold text-base-content">{metrics.fixes}</div>
                            <div className="text-sm text-base-content/60">Bugs Fixed</div>
                        </div>
                    </div>
                    <div
                        className="stat-card cursor-pointer hover:ring-2 hover:ring-blue-500 rounded-lg transition-all"
                        role="button"
                        tabIndex={0}
                        aria-label={`Average urgency ${metrics.avgUrgency > 0 ? metrics.avgUrgency.toFixed(1) : 'not available'} — click to see reactive commits`}
                        onClick={() => handleCardClick('urgency')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('urgency'))}
                    >
                        <div className="p-4 bg-base-300 rounded-lg text-center">
                            <div className="text-2xl font-semibold text-base-content">
                                {metrics.avgUrgency > 0 ? metrics.avgUrgency.toFixed(1) : '-'}
                            </div>
                            <div className="text-sm text-base-content/60">Avg Urgency</div>
                        </div>
                    </div>
                    <div
                        className="stat-card cursor-pointer hover:ring-2 hover:ring-blue-500 rounded-lg transition-all"
                        role="button"
                        tabIndex={0}
                        aria-label={`${metrics.plannedPct > 0 ? metrics.plannedPct + '% planned work' : 'No planned work data'} — click to see details`}
                        onClick={() => handleCardClick('planned')}
                        onKeyDown={handleKeyActivate(() => handleCardClick('planned'))}
                    >
                        <div className="p-4 bg-base-300 rounded-lg text-center">
                            <div className="text-2xl font-semibold text-base-content">
                                {metrics.plannedPct > 0 ? `${metrics.plannedPct}%` : '-'}
                            </div>
                            <div className="text-sm text-base-content/60">% Planned</div>
                        </div>
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
}
