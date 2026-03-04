import React, { useMemo } from 'react';
import { useApp } from '../AppContext.jsx';
import { getAuthorEmail, formatDate, getCommitSubject, sanitizeMessage, getAuthorName, getCommitDateRange, handleKeyActivate } from '../utils.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import { UrgencyBar, ImpactBar } from '../components/HealthBars.jsx';
import { RiskAssessment, DebtBalance } from '../components/HealthAnomalies.jsx';
import HealthWorkPatterns from '../components/HealthWorkPatterns.jsx';
import useHealthData from '../hooks/useHealthData.js';

// Requirement: Health section shows code health indicators — urgency, impact, risk,
//   debt, work patterns, and security events. All "is the codebase healthy?" signals
//   in one place.
// What changed: Security was a separate section rendered alongside Health (both stacked
//   under the Health tab). Merged here because Security is a single metric (count + list)
//   that fits naturally with other health indicators. Trend charts (urgency/debt/impact
//   over time) moved to Timeline section where time-based data belongs. Per-contributor
//   urgency/impact moved to Contributors section where per-person data belongs.
// Alternatives:
//   - Keep Security separate: Rejected — too thin for its own section, and it's a health signal
//   - Keep trends here: Rejected — Health was 11 sections, 2-3x heavier than any other tab content

// Convert summary urgency format {1:N, 2:N, 3:N, 4:N, 5:N} to Health format
function convertSummaryUrgency(summaryUrgency) {
    if (!summaryUrgency) return { planned: 0, normal: 0, reactive: 0 };
    return {
        planned: (summaryUrgency[1] || 0) + (summaryUrgency[2] || 0),
        normal: summaryUrgency[3] || 0,
        reactive: (summaryUrgency[4] || 0) + (summaryUrgency[5] || 0),
    };
}

export default function Health() {
    const { state, filteredCommits, viewConfig, openDetailPane, isMobile, commitsLoaded } = useApp();

    // Always call hook unconditionally (React hooks rules)
    const hookData = useHealthData(filteredCommits, state);

    // During Phase 1, use pre-aggregated summary breakdowns
    const summaryData = state.data?.summary;
    const useSummary = !commitsLoaded && summaryData;

    const urgencyBreakdown = useSummary
        ? convertSummaryUrgency(summaryData.urgencyBreakdown)
        : hookData.urgencyBreakdown;
    // Use nullish coalescing — empty objects {} from summary are valid (no data),
    // while || would incorrectly fall through to hookData for empty objects
    const impactBreakdown = useSummary
        ? (summaryData.impactBreakdown ?? hookData.impactBreakdown)
        : hookData.impactBreakdown;
    const riskBreakdown = useSummary
        ? (summaryData.riskBreakdown ?? hookData.riskBreakdown)
        : hookData.riskBreakdown;
    const debtBreakdown = useSummary
        ? (summaryData.debtBreakdown ?? hookData.debtBreakdown)
        : hookData.debtBreakdown;

    const hasRiskData = riskBreakdown.low + riskBreakdown.medium + riskBreakdown.high > 0;
    const riskTotal = riskBreakdown.low + riskBreakdown.medium + riskBreakdown.high;
    const hasDebtData = debtBreakdown.added + debtBreakdown.paid + debtBreakdown.neutral > 0;
    const debtTotal = debtBreakdown.added + debtBreakdown.paid + debtBreakdown.neutral;

    const total = useSummary ? (summaryData.totalCommits || 0) : hookData.metrics.total;

    const metrics = useSummary ? {
        total,
        securityCount: summaryData.security_events?.length || 0,
        reactivePct: total > 0 ? Math.round((urgencyBreakdown.reactive / total) * 100) : 0,
        weekendPct: null,
        afterHoursPct: null,
    } : hookData.metrics;

    // --- Security data ---
    const securityEvents = state.data?.summary?.security_events || [];
    const securityCommits = useMemo(() => {
        if (!commitsLoaded) return [];
        if (securityEvents.length > 0) {
            const securityShas = new Set(securityEvents.map(e => e.sha));
            return filteredCommits.filter(c => securityShas.has(c.sha));
        }
        return filteredCommits.filter(c =>
            c.type === 'security' || (c.tags || []).includes('security')
        );
    }, [filteredCommits, securityEvents, commitsLoaded]);

    const securityCount = commitsLoaded ? securityCommits.length : securityEvents.length;

    // --- Click handlers ---
    const clickable = commitsLoaded;

    const handleSummaryCardClick = (type) => {
        if (!clickable) return;
        let filtered, title;
        if (type === 'security') {
            filtered = securityCommits;
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
        if (!clickable) return;
        let filterFn, title;
        if (filter === 'planned') { filterFn = c => c.urgency <= 2; title = 'Planned Work (Urgency 1-2)'; }
        else if (filter === 'normal') { filterFn = c => c.urgency === 3; title = 'Normal Work (Urgency 3)'; }
        else { filterFn = c => c.urgency >= 4; title = 'Reactive Work (Urgency 4-5)'; }
        const filtered = filteredCommits.filter(filterFn);
        openDetailPane(title, `${filtered.length} commits`, filtered);
    };

    const handleRiskFilterClick = (risk) => {
        if (!clickable) return;
        const labels = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' };
        const filtered = filteredCommits.filter(c => c.risk === risk);
        openDetailPane(`${labels[risk] || risk} Changes`, `${filtered.length} commits`, filtered);
    };

    const handleDebtFilterClick = (debt) => {
        if (!clickable) return;
        const labels = { added: 'Debt Added', paid: 'Debt Paid Down', neutral: 'Debt Neutral' };
        const filtered = filteredCommits.filter(c => c.debt === debt);
        openDetailPane(`${labels[debt] || debt}`, `${filtered.length} commits`, filtered);
    };

    const handleImpactFilterClick = (impact) => {
        if (!clickable) return;
        const labels = { 'user-facing': 'User-Facing', 'internal': 'Internal', 'infrastructure': 'Infrastructure', 'api': 'API' };
        const filtered = filteredCommits.filter(c => c.impact === impact);
        openDetailPane(`${labels[impact] || impact} Impact`, `${filtered.length} commits`, filtered, { type: 'impact', value: impact });
    };

    const handleSecurityRepoClick = (repo) => {
        if (!clickable) return;
        const filtered = securityCommits.filter(c => (c.repo_id || 'default') === repo);
        openDetailPane(`${repo} Security`, `${filtered.length} commits`, filtered);
    };

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

    // --- Security section content (view-level aware) ---
    const renderSecurityContent = () => {
        // Phase 1: summary events
        if (!commitsLoaded) {
            if (securityEvents.length === 0) {
                return <p className="text-themed-tertiary text-center py-4">No security-related commits found</p>;
            }
            return (
                <div className="space-y-2">
                    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center mb-3">
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400">{securityEvents.length}</div>
                        <div className="text-sm text-themed-secondary">Security-related commits</div>
                    </div>
                    {securityEvents.slice(0, 5).map((event, idx) => (
                        <div key={event.sha || idx} className="p-3 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded">
                            <div className="flex items-start gap-2">
                                <span className="tag tag-security">security</span>
                                <div className="flex-1">
                                    <p className="text-sm font-medium text-themed-primary">{sanitizeMessage(event.subject || 'Security commit')}</p>
                                    <p className="text-xs text-themed-tertiary mt-1">{event.timestamp ? formatDate(event.timestamp) : ''}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        if (securityCommits.length === 0) {
            return <p className="text-themed-tertiary text-center py-4">No security-related commits found</p>;
        }

        // Executive view: count + date range
        if (viewConfig.contributors === 'total') {
            const dateRange = getCommitDateRange(securityCommits);
            const repos = [...new Set(securityCommits.map(c => c.repo_id).filter(Boolean))];
            return (
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center">
                    <div className="text-3xl font-bold text-red-600 dark:text-red-400 mb-1">{securityCommits.length}</div>
                    <div className="text-sm text-themed-secondary mb-2">Security-related commits</div>
                    <div className="text-xs text-themed-tertiary">
                        {dateRange.earliest} &mdash; {dateRange.latest}
                        {repos.length > 0 && <><br />Across {repos.length} repositories</>}
                    </div>
                </div>
            );
        }

        // Management view: per-repo counts
        if (viewConfig.contributors === 'repo') {
            const byRepo = {};
            securityCommits.forEach(c => {
                const repo = c.repo_id || 'default';
                byRepo[repo] = (byRepo[repo] || 0) + 1;
            });
            const sortedRepos = Object.entries(byRepo).sort((a, b) => b[1] - a[1]);
            return (
                <div className="space-y-2">
                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-center mb-3">
                        <div className="text-2xl font-bold text-red-600 dark:text-red-400">{securityCommits.length}</div>
                        <div className="text-sm text-themed-secondary">Total security commits</div>
                    </div>
                    {sortedRepos.map(([repo, count]) => (
                        <div
                            key={repo}
                            className="p-3 bg-themed-tertiary rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            role="button" tabIndex={0}
                            onClick={() => handleSecurityRepoClick(repo)}
                            onKeyDown={handleKeyActivate(() => handleSecurityRepoClick(repo))}
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-themed-primary font-medium">{repo}</span>
                                <span className="text-red-600 dark:text-red-400 font-semibold">{count} commits</span>
                            </div>
                        </div>
                    ))}
                </div>
            );
        }

        // Developer view: full commit details
        return (
            <div className="space-y-2">
                {securityCommits.map((commit, idx) => (
                    <div key={commit.sha || idx} className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded">
                        <div className="flex items-start gap-2">
                            <span className="tag tag-security">security</span>
                            <div className="flex-1">
                                <p className="text-sm font-medium text-themed-primary">{sanitizeMessage(getCommitSubject(commit))}</p>
                                <p className="text-xs text-themed-tertiary mt-1">
                                    {commit.sha} by {getAuthorName(commit)} on {formatDate(commit.timestamp)}
                                    {commit.repo_id && ` in ${commit.repo_id}`}
                                </p>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Summary Cards — anchor, always visible */}
            <HealthWorkPatterns metrics={metrics} onCardClick={clickable ? handleSummaryCardClick : undefined} />

            {/* Risk Assessment */}
            {hasRiskData && (
                <RiskAssessment
                    riskBreakdown={riskBreakdown}
                    riskTotal={riskTotal}
                    isMobile={isMobile}
                    onRiskFilterClick={clickable ? handleRiskFilterClick : undefined}
                />
            )}

            {/* Debt Balance */}
            {hasDebtData && (
                <DebtBalance
                    debtBreakdown={debtBreakdown}
                    debtTotal={debtTotal}
                    isMobile={isMobile}
                    onDebtFilterClick={clickable ? handleDebtFilterClick : undefined}
                />
            )}

            {/* Urgency Breakdown */}
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

            {/* Impact Breakdown */}
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

            {/* Security Events — merged from former SecurityTab */}
            {securityCount > 0 && (
                <CollapsibleSection
                    title="Security Events"
                    subtitle="Changes tagged as security-related"
                    defaultExpanded={!isMobile}
                >
                    {renderSecurityContent()}
                </CollapsibleSection>
            )}
        </div>
    );
}
