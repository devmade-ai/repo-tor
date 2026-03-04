import React from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import { getAuthorEmail, handleKeyActivate } from '../utils.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import { UrgencyBar, ImpactBar } from '../components/HealthBars.jsx';
import { RiskAssessment, DebtBalance } from '../components/HealthAnomalies.jsx';
import HealthWorkPatterns from '../components/HealthWorkPatterns.jsx';
import useHealthData from '../hooks/useHealthData.js';

// Requirement: Mobile-friendly Health tab layout
// Approach: Reorder sections by importance, collapse less-critical sections on mobile,
//   reduce chart heights on small screens, improve labels for non-technical users.
// Alternatives:
//   - Hide sections entirely on mobile: Rejected — data is still useful, just not primary
//   - Tab sub-navigation: Rejected — adds complexity, collapsing is simpler

// Requirement: Decompose HealthTab.jsx (780 lines) into smaller, focused sub-components
// Approach: Extracted into four focused modules:
//   - useHealthData.js: Custom hook with all useMemo data computation (~300 lines)
//   - HealthBars.jsx: UrgencyBar + ImpactBar presentational bar components (~90 lines)
//   - HealthAnomalies.jsx: RiskAssessment + DebtBalance conditional sections (~125 lines)
//   - HealthWorkPatterns.jsx: Health Overview summary cards (~50 lines)
//   Parent HealthTab retains event handlers and layout orchestration (~280 lines).
// Alternatives:
//   - Keep all useMemo hooks inline: Rejected — HealthTab would remain at 630 lines
//   - Move data computation into child components: Rejected — hooks share intermediate
//     values (e.g., urgencyTrendData.sortedMonths feeds impactTrend) and depend on shared
//     filteredCommits from useApp(); a single hook preserves the computation graph

// Requirement: Show health data during Phase 1 using pre-aggregated summary breakdowns
// Approach: Always call useHealthData (hooks must be unconditional). When commits haven't
//   loaded, override breakdowns with summary data. Summary provides urgencyBreakdown (1-5
//   scale, converted to planned/normal/reactive), impactBreakdown, riskBreakdown,
//   debtBreakdown. Trend charts and per-contributor sections require raw commits and are
//   hidden during Phase 1.
// Alternatives:
//   - Show spinner: Rejected — summary already has most breakdown data
//   - Conditional useHealthData call (early return): Rejected — violates hooks rules

// Convert summary urgency format {1:N, 2:N, 3:N, 4:N, 5:N} to HealthTab format
function convertSummaryUrgency(summaryUrgency) {
    if (!summaryUrgency) return { planned: 0, normal: 0, reactive: 0 };
    return {
        planned: (summaryUrgency[1] || 0) + (summaryUrgency[2] || 0),
        normal: summaryUrgency[3] || 0,
        reactive: (summaryUrgency[4] || 0) + (summaryUrgency[5] || 0),
    };
}

export default function HealthTab() {
    const { state, filteredCommits, viewConfig, openDetailPane, isMobile, commitsLoaded } = useApp();

    // Always call useHealthData unconditionally (React hooks rules).
    // During Phase 1, filteredCommits is empty → hook returns zeros.
    // We override with summary data below.
    const hookData = useHealthData(filteredCommits, state, viewConfig, isMobile);

    // During Phase 1, use pre-aggregated summary breakdowns
    const summaryData = state.data?.summary;
    const useSummary = !commitsLoaded && summaryData;

    const urgencyBreakdown = useSummary
        ? convertSummaryUrgency(summaryData.urgencyBreakdown)
        : hookData.urgencyBreakdown;
    const impactBreakdown = useSummary
        ? (summaryData.impactBreakdown || hookData.impactBreakdown)
        : hookData.impactBreakdown;
    const riskBreakdown = useSummary
        ? (summaryData.riskBreakdown || hookData.riskBreakdown)
        : hookData.riskBreakdown;
    const debtBreakdown = useSummary
        ? (summaryData.debtBreakdown || hookData.debtBreakdown)
        : hookData.debtBreakdown;

    const hasRiskData = riskBreakdown.low + riskBreakdown.medium + riskBreakdown.high > 0;
    const riskTotal = riskBreakdown.low + riskBreakdown.medium + riskBreakdown.high;
    const hasDebtData = debtBreakdown.added + debtBreakdown.paid + debtBreakdown.neutral > 0;
    const debtTotal = debtBreakdown.added + debtBreakdown.paid + debtBreakdown.neutral;

    // Total commits for percentage calculations
    const total = useSummary ? (summaryData.totalCommits || 0) : hookData.metrics.total;

    // Metrics for summary cards — partial during Phase 1 (no weekend%/afterhours% without timestamps)
    const metrics = useSummary ? {
        total,
        securityCount: summaryData.security_events?.length || 0,
        reactivePct: total > 0 ? Math.round((urgencyBreakdown.reactive / total) * 100) : 0,
        weekendPct: null,    // Needs per-commit timestamps
        afterHoursPct: null, // Needs per-commit timestamps
    } : hookData.metrics;

    // Trend charts and per-contributor data only available with loaded commits
    const urgencyTrendData = commitsLoaded ? hookData.urgencyTrendData : null;
    const impactTrendData = commitsLoaded ? hookData.impactTrendData : null;
    const debtTrendData = commitsLoaded ? hookData.debtTrendData : null;
    const urgencyByGroup = commitsLoaded ? hookData.urgencyByGroup : [];
    const impactByGroup = commitsLoaded ? hookData.impactByGroup : [];

    const handleSummaryCardClick = (type) => {
        if (!commitsLoaded) return;
        let filtered, title;
        if (type === 'security') {
            filtered = filteredCommits.filter(c =>
                c.type === 'security' || (c.tags || []).includes('security')
            );
            title = 'Security Commits';
        } else if (type === 'reactive') {
            filtered = filteredCommits.filter(c => c.urgency >= 4);
            title = 'Reactive Work (Urgency 4-5)';
        } else if (type === 'weekend') {
            filtered = filteredCommits.filter(c => {
                if (!c.timestamp) return false;
                const day = new Date(c.timestamp).getDay();
                return day === 0 || day === 6;
            });
            title = 'Weekend Commits';
        } else if (type === 'afterhours') {
            filtered = filteredCommits.filter(c => {
                if (!c.timestamp) return false;
                const hour = new Date(c.timestamp).getHours();
                return hour < state.workHourStart || hour >= state.workHourEnd;
            });
            title = 'After Hours Commits';
        }
        if (filtered) {
            openDetailPane(title, `${filtered.length} commits`, filtered);
        }
    };

    const handleUrgencyFilterClick = (filter) => {
        if (!commitsLoaded) return;
        let filterFn, title;
        if (filter === 'planned') { filterFn = c => c.urgency <= 2; title = 'Planned Work (Urgency 1-2)'; }
        else if (filter === 'normal') { filterFn = c => c.urgency === 3; title = 'Normal Work (Urgency 3)'; }
        else { filterFn = c => c.urgency >= 4; title = 'Reactive Work (Urgency 4-5)'; }
        const filtered = filteredCommits.filter(filterFn);
        openDetailPane(title, `${filtered.length} commits`, filtered);
    };

    const handleRiskFilterClick = (risk) => {
        if (!commitsLoaded) return;
        const labels = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' };
        const filtered = filteredCommits.filter(c => c.risk === risk);
        openDetailPane(`${labels[risk] || risk} Changes`, `${filtered.length} commits`, filtered);
    };

    const handleDebtFilterClick = (debt) => {
        if (!commitsLoaded) return;
        const labels = { added: 'Debt Added', paid: 'Debt Paid Down', neutral: 'Debt Neutral' };
        const filtered = filteredCommits.filter(c => c.debt === debt);
        openDetailPane(`${labels[debt] || debt}`, `${filtered.length} commits`, filtered);
    };

    const handleImpactFilterClick = (impact) => {
        if (!commitsLoaded) return;
        const labels = { 'user-facing': 'User-Facing', 'internal': 'Internal', 'infrastructure': 'Infrastructure', 'api': 'API' };
        const filtered = filteredCommits.filter(c => c.impact === impact);
        openDetailPane(`${labels[impact] || impact} Impact`, `${filtered.length} commits`, filtered, { type: 'impact', value: impact });
    };

    const handleGroupClick = (group) => {
        if (!commitsLoaded) return;
        if (group.isRepo) {
            const filtered = filteredCommits.filter(c => (c.repo_id || 'default') === group.key);
            openDetailPane(group.key, `${filtered.length} commits`, filtered);
        } else if (group.isContributor) {
            const filtered = filteredCommits.filter(c => getAuthorEmail(c) === group.email);
            openDetailPane(`${group.label}'s Commits`, `${filtered.length} commits`, filtered, { type: 'author', value: group.label });
        }
    };

    // Requirement: Urgency labels must be clear to non-technical users
    // Approach: Use plain language descriptions instead of numeric scale references
    // Alternatives:
    //   - Keep "(1-2)" ranges: Rejected — non-technical users don't know the scale
    //   - Add tooltips explaining scale: Rejected — labels should be self-explanatory
    const urgencyItems = [
        { label: 'Planned Work', count: urgencyBreakdown.planned, colorClass: 'bg-green-500', filter: 'planned' },
        { label: 'Routine Work', count: urgencyBreakdown.normal, colorClass: 'bg-blue-500', filter: 'normal' },
        { label: 'Urgent Fixes', count: urgencyBreakdown.reactive, colorClass: 'bg-amber-500', filter: 'reactive' },
    ];

    const impactItems = [
        { key: 'user-facing', label: 'User-Facing', colorClass: 'bg-blue-500' },
        { key: 'internal', label: 'Internal', colorClass: 'bg-gray-500' },
        { key: 'infrastructure', label: 'Infrastructure', colorClass: 'bg-purple-500' },
        { key: 'api', label: 'API', colorClass: 'bg-green-500' },
    ].map(item => ({
        ...item,
        count: impactBreakdown[item.key],
    })).sort((a, b) => b.count - a.count);

    const chartHeight = isMobile ? '220px' : '300px';
    const clickable = commitsLoaded;

    // Requirement: Order sections from most interesting to least interesting
    // Approach: Overview stats first (anchor), then "red flag" sections (risk, debt) that
    //   answer "are we in trouble?", then current-state breakdowns, then trend charts, then
    //   per-person detail last.
    // Alternatives:
    //   - Risk/debt first: Rejected — they're conditional and may not render, so overview
    //     anchors the page consistently
    //   - Trend charts before breakdowns: Rejected — breakdowns are more scannable
    return (
        <div className="space-y-6">
            {/* Summary Cards — anchor for context, always visible */}
            <HealthWorkPatterns metrics={metrics} onCardClick={clickable ? handleSummaryCardClick : undefined} />

            {/* Risk Assessment — "are we in trouble?" — most attention-grabbing */}
            {hasRiskData && (
                <RiskAssessment
                    riskBreakdown={riskBreakdown}
                    riskTotal={riskTotal}
                    isMobile={isMobile}
                    onRiskFilterClick={clickable ? handleRiskFilterClick : undefined}
                />
            )}

            {/* Debt Balance — "is debt growing?" — actionable red/green indicator */}
            {hasDebtData && (
                <DebtBalance
                    debtBreakdown={debtBreakdown}
                    debtTotal={debtTotal}
                    isMobile={isMobile}
                    onDebtFilterClick={clickable ? handleDebtFilterClick : undefined}
                />
            )}

            {/* Urgency Breakdown — planned vs reactive split */}
            <CollapsibleSection title="How Work Gets Prioritized" subtitle="Planned vs reactive changes">
                <div className="space-y-4">
                    {urgencyItems.map(({ label, count, colorClass, filter }) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                            <div
                                key={filter}
                                className={`rounded p-2 -m-2 transition-colors ${clickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''}`}
                                role={clickable ? 'button' : undefined}
                                tabIndex={clickable ? 0 : undefined}
                                onClick={() => handleUrgencyFilterClick(filter)}
                                onKeyDown={clickable ? handleKeyActivate(() => handleUrgencyFilterClick(filter)) : undefined}
                            >
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-themed-secondary">{label}</span>
                                    <span className="text-themed-primary font-medium">{count} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CollapsibleSection>

            {/* Impact Breakdown — where changes land */}
            <CollapsibleSection title="Where Changes Land" subtitle="What parts of the product are affected">
                <div className="space-y-4">
                    {impactItems.map(({ key, label, count, colorClass }) => {
                        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
                        return (
                            <div
                                key={key}
                                className={`rounded p-2 -m-2 transition-colors ${clickable ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700' : ''}`}
                                role={clickable ? 'button' : undefined}
                                tabIndex={clickable ? 0 : undefined}
                                onClick={() => handleImpactFilterClick(key)}
                                onKeyDown={clickable ? handleKeyActivate(() => handleImpactFilterClick(key)) : undefined}
                            >
                                <div className="flex justify-between text-sm mb-1">
                                    <span className="text-themed-secondary">{label}</span>
                                    <span className="text-themed-primary font-medium">{count} ({pct}%)</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                    <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CollapsibleSection>

            {/* Urgency Trend — collapsed on mobile, only when commits loaded */}
            {urgencyTrendData && (
                <CollapsibleSection title="Urgency Over Time" subtitle="Is urgency increasing or decreasing?" defaultExpanded={!isMobile}>
                    <div data-embed-id="urgency-trend" style={{ height: chartHeight }}>
                        <Line data={urgencyTrendData.data} options={urgencyTrendData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Debt Trend Over Time — collapsed on mobile, only when commits loaded */}
            {debtTrendData && (
                <CollapsibleSection title="Debt Trend" subtitle="Monthly debt added vs paid" defaultExpanded={!isMobile}>
                    <div data-embed-id="debt-trend" style={{ height: chartHeight }}>
                        <Line data={debtTrendData.data} options={debtTrendData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Impact Over Time — collapsed on mobile, only when commits loaded */}
            {impactTrendData && (
                <CollapsibleSection title="Impact Over Time" subtitle="Monthly breakdown by area" defaultExpanded={!isMobile}>
                    <div data-embed-id="impact-over-time" style={{ height: chartHeight }}>
                        <Bar data={impactTrendData.data} options={impactTrendData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Urgency by Contributor — per-person detail, only when commits loaded */}
            {commitsLoaded && (
                <CollapsibleSection title="Urgency by Contributor" subtitle="Who handles planned vs reactive work?" defaultExpanded={!isMobile}>
                    {urgencyByGroup.length > 0 ? (
                        <div className="space-y-4">
                            {urgencyByGroup.map((group, idx) => (
                                <UrgencyBar
                                    key={group.key || idx}
                                    counts={group.counts}
                                    total={group.total}
                                    label={group.label}
                                    onClick={group.isRepo || group.isContributor ? () => handleGroupClick(group) : undefined}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-themed-tertiary text-sm">Nothing matches the current filters. Try adjusting your selections.</p>
                    )}
                </CollapsibleSection>
            )}

            {/* Impact by Contributor — per-person detail, only when commits loaded */}
            {commitsLoaded && (
                <CollapsibleSection title="Impact by Contributor" subtitle="Who works on what areas?" defaultExpanded={!isMobile}>
                    {impactByGroup.length > 0 ? (
                        <div className="space-y-4">
                            {impactByGroup.map((group, idx) => (
                                <ImpactBar
                                    key={group.key || idx}
                                    counts={group.counts}
                                    total={group.total}
                                    label={group.label}
                                    onClick={group.isRepo || group.isContributor ? () => handleGroupClick(group) : undefined}
                                />
                            ))}
                        </div>
                    ) : (
                        <p className="text-themed-tertiary text-sm">Nothing matches the current filters. Try adjusting your selections.</p>
                    )}
                </CollapsibleSection>
            )}
        </div>
    );
}
