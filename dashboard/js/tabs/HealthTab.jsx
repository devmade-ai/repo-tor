import React, { useMemo } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import { getAuthorEmail, getAuthorName, sanitizeName, handleKeyActivate } from '../utils.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';

function UrgencyBar({ counts, total, label, onClick }) {
    const plannedPct = total > 0 ? Math.round((counts.planned / total) * 100) : 0;
    const normalPct = total > 0 ? Math.round((counts.normal / total) * 100) : 0;
    const reactivePct = total > 0 ? Math.round((counts.reactive / total) * 100) : 0;

    return (
        <div
            className={`p-2 -m-2 transition-colors ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded' : ''}`}
            {...(onClick ? { role: 'button', tabIndex: 0, onKeyDown: handleKeyActivate(onClick) } : {})}
            onClick={onClick}
        >
            <div className="flex justify-between text-sm mb-1">
                <span className="text-themed-secondary font-medium">{label}</span>
                <span className="text-themed-tertiary">{total} commits</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full flex overflow-hidden">
                <div className="bg-green-500 h-full" style={{ width: `${plannedPct}%` }} title={`Planned: ${counts.planned}`} />
                <div className="bg-blue-500 h-full" style={{ width: `${normalPct}%` }} title={`Normal: ${counts.normal}`} />
                <div className="bg-amber-500 h-full" style={{ width: `${reactivePct}%` }} title={`Reactive: ${counts.reactive}`} />
            </div>
            <div className="flex justify-between text-xs text-themed-tertiary mt-1">
                <span>Planned {plannedPct}%</span>
                <span>Normal {normalPct}%</span>
                <span>Reactive {reactivePct}%</span>
            </div>
        </div>
    );
}

function ImpactBar({ counts, total, label, onClick }) {
    const userPct = total > 0 ? Math.round(((counts['user-facing'] || 0) / total) * 100) : 0;
    const internalPct = total > 0 ? Math.round(((counts['internal'] || 0) / total) * 100) : 0;
    const infraPct = total > 0 ? Math.round(((counts['infrastructure'] || 0) / total) * 100) : 0;
    const apiPct = total > 0 ? Math.round(((counts['api'] || 0) / total) * 100) : 0;

    return (
        <div
            className={`p-2 -m-2 transition-colors ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded' : ''}`}
            {...(onClick ? { role: 'button', tabIndex: 0, onKeyDown: handleKeyActivate(onClick) } : {})}
            onClick={onClick}
        >
            <div className="flex justify-between text-sm mb-1">
                <span className="text-themed-secondary font-medium">{label}</span>
                <span className="text-themed-tertiary">{total} commits</span>
            </div>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full flex overflow-hidden">
                <div className="bg-blue-500 h-full" style={{ width: `${userPct}%` }} title={`User-facing: ${counts['user-facing'] || 0}`} />
                <div className="bg-gray-500 h-full" style={{ width: `${internalPct}%` }} title={`Internal: ${counts['internal'] || 0}`} />
                <div className="bg-purple-500 h-full" style={{ width: `${infraPct}%` }} title={`Infrastructure: ${counts['infrastructure'] || 0}`} />
                <div className="bg-green-500 h-full" style={{ width: `${apiPct}%` }} title={`API: ${counts['api'] || 0}`} />
            </div>
            <div className="flex justify-between text-xs text-themed-tertiary mt-1">
                <span>User {userPct}%</span>
                <span>Internal {internalPct}%</span>
                <span>Infra {infraPct}%</span>
                <span>API {apiPct}%</span>
            </div>
        </div>
    );
}

export default function HealthTab() {
    const { state, filteredCommits, viewConfig, openDetailPane, isMobile } = useApp();

    const metrics = useMemo(() => {
        const total = filteredCommits.length;
        const securityCount = filteredCommits.filter(c =>
            c.type === 'security' || (c.tags || []).includes('security')
        ).length;

        const reactiveCount = filteredCommits.filter(c => c.urgency >= 4).length;
        const reactivePct = total > 0 ? Math.round((reactiveCount / total) * 100) : 0;

        const weekendCount = filteredCommits.filter(c => {
            if (!c.timestamp) return false;
            const date = new Date(c.timestamp);
            const day = date.getDay();
            return day === 0 || day === 6;
        }).length;
        const weekendPct = total > 0 ? Math.round((weekendCount / total) * 100) : 0;

        const afterHoursCount = filteredCommits.filter(c => {
            if (!c.timestamp) return false;
            const date = new Date(c.timestamp);
            const hour = date.getHours();
            return hour < state.workHourStart || hour >= state.workHourEnd;
        }).length;
        const afterHoursPct = total > 0 ? Math.round((afterHoursCount / total) * 100) : 0;

        return { total, securityCount, reactivePct, weekendPct, afterHoursPct };
    }, [filteredCommits, state.workHourStart, state.workHourEnd]);

    // Urgency breakdown
    const urgencyBreakdown = useMemo(() => {
        const breakdown = { planned: 0, normal: 0, reactive: 0 };
        filteredCommits.forEach(c => {
            if (c.urgency <= 2) breakdown.planned++;
            else if (c.urgency === 3) breakdown.normal++;
            else if (c.urgency >= 4) breakdown.reactive++;
        });
        return breakdown;
    }, [filteredCommits]);

    // Impact breakdown
    const impactBreakdown = useMemo(() => {
        const breakdown = { 'user-facing': 0, 'internal': 0, 'infrastructure': 0, 'api': 0 };
        filteredCommits.forEach(c => {
            if (c.impact && breakdown.hasOwnProperty(c.impact)) {
                breakdown[c.impact]++;
            }
        });
        return breakdown;
    }, [filteredCommits]);

    // Risk breakdown — only count commits that have a risk value
    const riskBreakdown = useMemo(() => {
        const breakdown = { low: 0, medium: 0, high: 0 };
        filteredCommits.forEach(c => {
            if (c.risk && breakdown.hasOwnProperty(c.risk)) {
                breakdown[c.risk]++;
            }
        });
        return breakdown;
    }, [filteredCommits]);

    const hasRiskData = riskBreakdown.low + riskBreakdown.medium + riskBreakdown.high > 0;
    const riskTotal = riskBreakdown.low + riskBreakdown.medium + riskBreakdown.high;

    // Debt breakdown — tracks whether tech debt is accumulating or shrinking
    const debtBreakdown = useMemo(() => {
        const breakdown = { added: 0, paid: 0, neutral: 0 };
        filteredCommits.forEach(c => {
            if (c.debt && breakdown.hasOwnProperty(c.debt)) {
                breakdown[c.debt]++;
            }
        });
        return breakdown;
    }, [filteredCommits]);

    const hasDebtData = debtBreakdown.added + debtBreakdown.paid + debtBreakdown.neutral > 0;
    const debtTotal = debtBreakdown.added + debtBreakdown.paid + debtBreakdown.neutral;

    // Urgency Trend chart
    const urgencyTrendData = useMemo(() => {
        const monthlyUrgency = {};
        filteredCommits.forEach(c => {
            if (!c.timestamp || !c.urgency) return;
            const month = c.timestamp.substring(0, 7);
            if (!monthlyUrgency[month]) {
                monthlyUrgency[month] = { sum: 0, count: 0 };
            }
            monthlyUrgency[month].sum += c.urgency;
            monthlyUrgency[month].count++;
        });

        const sortedMonths = Object.keys(monthlyUrgency).sort();
        if (sortedMonths.length === 0) return null;

        const urgencyData = sortedMonths.map(m =>
            Math.round((monthlyUrgency[m].sum / monthlyUrgency[m].count) * 100) / 100
        );

        const mobile = isMobile;
        return {
            data: {
                labels: sortedMonths.map(m => {
                    const [year, month] = m.split('-');
                    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }),
                datasets: [{
                    label: 'Avg Urgency',
                    data: urgencyData,
                    borderColor: '#EAB308',
                    backgroundColor: 'rgba(245, 158, 11, 0.1)',
                    fill: true,
                    tension: 0.3,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { font: { size: mobile ? 9 : 12 }, maxRotation: mobile ? 60 : 45 } },
                    y: { min: 1, max: 5, ticks: { stepSize: 1, font: { size: mobile ? 9 : 12 } } },
                },
            },
            sortedMonths,
        };
    }, [filteredCommits, isMobile]);

    // Impact Over Time chart
    const impactTrendData = useMemo(() => {
        const monthlyImpact = {};
        filteredCommits.forEach(c => {
            if (!c.timestamp || !c.impact) return;
            const month = c.timestamp.substring(0, 7);
            if (!monthlyImpact[month]) {
                monthlyImpact[month] = { 'user-facing': 0, 'internal': 0, 'infrastructure': 0, 'api': 0 };
            }
            if (monthlyImpact[month].hasOwnProperty(c.impact)) {
                monthlyImpact[month][c.impact]++;
            }
        });

        const sortedMonths = urgencyTrendData?.sortedMonths || Object.keys(monthlyImpact).sort();
        if (sortedMonths.length === 0) return null;

        const impactColors = {
            'user-facing': '#2D68FF',
            'internal': '#767676',
            'infrastructure': '#a78bfa',
            'api': '#16A34A',
        };

        const mobile = isMobile;
        return {
            data: {
                labels: sortedMonths.map(m => {
                    const [year, month] = m.split('-');
                    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }),
                datasets: ['user-facing', 'internal', 'infrastructure', 'api'].map(impact => ({
                    label: impact,
                    data: sortedMonths.map(m => monthlyImpact[m]?.[impact] || 0),
                    backgroundColor: impactColors[impact],
                })),
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: mobile ? 8 : 12, font: { size: mobile ? 8 : 10 }, padding: mobile ? 4 : 10 },
                    },
                },
                scales: {
                    x: { stacked: true, ticks: { font: { size: mobile ? 9 : 12 }, maxRotation: mobile ? 60 : 45 } },
                    y: { stacked: true, ticks: { font: { size: mobile ? 9 : 12 } } },
                },
            },
        };
    }, [filteredCommits, urgencyTrendData, isMobile]);

    // Debt Trend chart — monthly added vs paid
    const debtTrendData = useMemo(() => {
        if (!hasDebtData) return null;

        const monthlyDebt = {};
        filteredCommits.forEach(c => {
            if (!c.timestamp || !c.debt) return;
            const month = c.timestamp.substring(0, 7);
            if (!monthlyDebt[month]) {
                monthlyDebt[month] = { added: 0, paid: 0, neutral: 0 };
            }
            if (monthlyDebt[month].hasOwnProperty(c.debt)) {
                monthlyDebt[month][c.debt]++;
            }
        });

        const sortedMonths = Object.keys(monthlyDebt).sort();
        if (sortedMonths.length === 0) return null;

        const mobile = isMobile;
        return {
            data: {
                labels: sortedMonths.map(m => {
                    const [year, month] = m.split('-');
                    return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
                }),
                datasets: [
                    {
                        label: 'Debt Added',
                        data: sortedMonths.map(m => monthlyDebt[m]?.added || 0),
                        borderColor: '#ef4444',
                        backgroundColor: 'rgba(239, 68, 68, 0.1)',
                        fill: true,
                        tension: 0.3,
                    },
                    {
                        label: 'Debt Paid',
                        data: sortedMonths.map(m => monthlyDebt[m]?.paid || 0),
                        borderColor: '#16A34A',
                        backgroundColor: 'rgba(22, 163, 74, 0.1)',
                        fill: true,
                        tension: 0.3,
                    },
                ],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { boxWidth: mobile ? 8 : 12, font: { size: mobile ? 8 : 10 }, padding: mobile ? 4 : 10 },
                    },
                },
                scales: {
                    x: { ticks: { font: { size: mobile ? 9 : 12 }, maxRotation: mobile ? 60 : 45 } },
                    y: { ticks: { font: { size: mobile ? 9 : 12 } } },
                },
            },
        };
    }, [filteredCommits, hasDebtData, isMobile]);

    // Urgency by contributor/group
    const urgencyByGroup = useMemo(() => {
        if (viewConfig.contributors === 'total') {
            return [{
                label: 'All Contributors',
                counts: urgencyBreakdown,
                total: metrics.total,
            }];
        } else if (viewConfig.contributors === 'repo') {
            const repoUrgency = {};
            filteredCommits.forEach(c => {
                const repo = c.repo_id || 'default';
                if (!repoUrgency[repo]) {
                    repoUrgency[repo] = { planned: 0, normal: 0, reactive: 0, total: 0 };
                }
                repoUrgency[repo].total++;
                if (c.urgency <= 2) repoUrgency[repo].planned++;
                else if (c.urgency === 3) repoUrgency[repo].normal++;
                else if (c.urgency >= 4) repoUrgency[repo].reactive++;
            });
            return Object.entries(repoUrgency)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 6)
                .map(([repo, data]) => ({
                    label: repo,
                    key: repo,
                    counts: data,
                    total: data.total,
                    isRepo: true,
                }));
        } else {
            const contributorUrgency = {};
            filteredCommits.forEach(c => {
                const email = getAuthorEmail(c);
                const name = getAuthorName(c);
                if (!contributorUrgency[email]) {
                    contributorUrgency[email] = { name, email, planned: 0, normal: 0, reactive: 0, total: 0 };
                }
                contributorUrgency[email].total++;
                if (c.urgency <= 2) contributorUrgency[email].planned++;
                else if (c.urgency === 3) contributorUrgency[email].normal++;
                else if (c.urgency >= 4) contributorUrgency[email].reactive++;
            });
            return Object.values(contributorUrgency)
                .sort((a, b) => b.total - a.total)
                .slice(0, 6)
                .map(c => ({
                    label: sanitizeName(c.name, c.email),
                    key: c.email,
                    counts: c,
                    total: c.total,
                    isContributor: true,
                    email: c.email,
                }));
        }
    }, [filteredCommits, viewConfig, urgencyBreakdown, metrics.total]);

    // Impact by contributor/group
    const impactByGroup = useMemo(() => {
        if (viewConfig.contributors === 'total') {
            return [{
                label: 'All Contributors',
                counts: impactBreakdown,
                total: metrics.total,
            }];
        } else if (viewConfig.contributors === 'repo') {
            const repoImpact = {};
            filteredCommits.forEach(c => {
                const repo = c.repo_id || 'default';
                if (!repoImpact[repo]) {
                    repoImpact[repo] = { 'user-facing': 0, 'internal': 0, 'infrastructure': 0, 'api': 0, total: 0 };
                }
                repoImpact[repo].total++;
                if (c.impact && repoImpact[repo].hasOwnProperty(c.impact)) {
                    repoImpact[repo][c.impact]++;
                }
            });
            return Object.entries(repoImpact)
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 6)
                .map(([repo, data]) => ({
                    label: repo,
                    key: repo,
                    counts: data,
                    total: data.total,
                    isRepo: true,
                }));
        } else {
            const contributorImpact = {};
            filteredCommits.forEach(c => {
                const email = getAuthorEmail(c);
                const name = getAuthorName(c);
                if (!contributorImpact[email]) {
                    contributorImpact[email] = { name, email, 'user-facing': 0, 'internal': 0, 'infrastructure': 0, 'api': 0, total: 0 };
                }
                contributorImpact[email].total++;
                if (c.impact && contributorImpact[email].hasOwnProperty(c.impact)) {
                    contributorImpact[email][c.impact]++;
                }
            });
            return Object.values(contributorImpact)
                .sort((a, b) => b.total - a.total)
                .slice(0, 6)
                .map(c => ({
                    label: sanitizeName(c.name, c.email),
                    key: c.email,
                    counts: c,
                    total: c.total,
                    isContributor: true,
                    email: c.email,
                }));
        }
    }, [filteredCommits, viewConfig, impactBreakdown, metrics.total]);

    const handleSummaryCardClick = (type) => {
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
        let filterFn, title;
        if (filter === 'planned') { filterFn = c => c.urgency <= 2; title = 'Planned Work (Urgency 1-2)'; }
        else if (filter === 'normal') { filterFn = c => c.urgency === 3; title = 'Normal Work (Urgency 3)'; }
        else { filterFn = c => c.urgency >= 4; title = 'Reactive Work (Urgency 4-5)'; }
        const filtered = filteredCommits.filter(filterFn);
        openDetailPane(title, `${filtered.length} commits`, filtered);
    };

    const handleRiskFilterClick = (risk) => {
        const labels = { low: 'Low Risk', medium: 'Medium Risk', high: 'High Risk' };
        const filtered = filteredCommits.filter(c => c.risk === risk);
        openDetailPane(`${labels[risk] || risk} Changes`, `${filtered.length} commits`, filtered);
    };

    const handleDebtFilterClick = (debt) => {
        const labels = { added: 'Debt Added', paid: 'Debt Paid Down', neutral: 'Debt Neutral' };
        const filtered = filteredCommits.filter(c => c.debt === debt);
        openDetailPane(`${labels[debt] || debt}`, `${filtered.length} commits`, filtered);
    };

    const handleImpactFilterClick = (impact) => {
        const labels = { 'user-facing': 'User-Facing', 'internal': 'Internal', 'infrastructure': 'Infrastructure', 'api': 'API' };
        const filtered = filteredCommits.filter(c => c.impact === impact);
        openDetailPane(`${labels[impact] || impact} Impact`, `${filtered.length} commits`, filtered, { type: 'impact', value: impact });
    };

    const handleGroupClick = (group) => {
        if (group.isRepo) {
            const filtered = filteredCommits.filter(c => (c.repo_id || 'default') === group.key);
            openDetailPane(group.key, `${filtered.length} commits`, filtered);
        } else if (group.isContributor) {
            const filtered = filteredCommits.filter(c => getAuthorEmail(c) === group.email);
            openDetailPane(`${group.label}'s Commits`, `${filtered.length} commits`, filtered, { type: 'author', value: group.label });
        }
    };

    const urgencyItems = [
        { label: 'Planned (1-2)', count: urgencyBreakdown.planned, colorClass: 'bg-green-500', filter: 'planned' },
        { label: 'Normal (3)', count: urgencyBreakdown.normal, colorClass: 'bg-blue-500', filter: 'normal' },
        { label: 'Reactive (4-5)', count: urgencyBreakdown.reactive, colorClass: 'bg-amber-500', filter: 'reactive' },
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

    return (
        <div className="space-y-6">
            {/* Summary Cards */}
            <CollapsibleSection title="Health Overview">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div
                        className="p-4 bg-themed-tertiary rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSummaryCardClick('security')}
                        onKeyDown={handleKeyActivate(() => handleSummaryCardClick('security'))}
                    >
                        <div className="text-2xl font-semibold text-themed-primary">{metrics.securityCount}</div>
                        <div className="text-sm text-themed-tertiary">Security</div>
                    </div>
                    <div
                        className="p-4 bg-themed-tertiary rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSummaryCardClick('reactive')}
                        onKeyDown={handleKeyActivate(() => handleSummaryCardClick('reactive'))}
                    >
                        <div className="text-2xl font-semibold text-themed-primary">{metrics.reactivePct}%</div>
                        <div className="text-sm text-themed-tertiary">Reactive</div>
                    </div>
                    <div
                        className="p-4 bg-themed-tertiary rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSummaryCardClick('weekend')}
                        onKeyDown={handleKeyActivate(() => handleSummaryCardClick('weekend'))}
                    >
                        <div className="text-2xl font-semibold text-themed-primary">{metrics.weekendPct}%</div>
                        <div className="text-sm text-themed-tertiary">Weekend</div>
                    </div>
                    <div
                        className="p-4 bg-themed-tertiary rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        role="button"
                        tabIndex={0}
                        onClick={() => handleSummaryCardClick('afterhours')}
                        onKeyDown={handleKeyActivate(() => handleSummaryCardClick('afterhours'))}
                    >
                        <div className="text-2xl font-semibold text-themed-primary">{metrics.afterHoursPct}%</div>
                        <div className="text-sm text-themed-tertiary">After Hours</div>
                    </div>
                </div>
            </CollapsibleSection>

            {/* Urgency Breakdown */}
            <CollapsibleSection title="Urgency Breakdown">
                <div className="space-y-4">
                    {urgencyItems.map(({ label, count, colorClass, filter }) => {
                        const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                        return (
                            <div
                                key={filter}
                                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors"
                                role="button"
                                tabIndex={0}
                                onClick={() => handleUrgencyFilterClick(filter)}
                                onKeyDown={handleKeyActivate(() => handleUrgencyFilterClick(filter))}
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
            <CollapsibleSection title="Impact Breakdown">
                <div className="space-y-4">
                    {impactItems.map(({ key, label, count, colorClass }) => {
                        const pct = metrics.total > 0 ? Math.round((count / metrics.total) * 100) : 0;
                        return (
                            <div
                                key={key}
                                className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors"
                                role="button"
                                tabIndex={0}
                                onClick={() => handleImpactFilterClick(key)}
                                onKeyDown={handleKeyActivate(() => handleImpactFilterClick(key))}
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

            {/* Risk Assessment — only shown when commits have risk data */}
            {hasRiskData && (
                <CollapsibleSection title="Risk Assessment">
                    <div className="space-y-4">
                        {[
                            { key: 'high', label: 'High Risk', colorClass: 'bg-red-500' },
                            { key: 'medium', label: 'Medium Risk', colorClass: 'bg-amber-500' },
                            { key: 'low', label: 'Low Risk', colorClass: 'bg-green-500' },
                        ].map(({ key, label, colorClass }) => {
                            const count = riskBreakdown[key];
                            const pct = riskTotal > 0 ? Math.round((count / riskTotal) * 100) : 0;
                            return (
                                <div
                                    key={key}
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleRiskFilterClick(key)}
                                    onKeyDown={handleKeyActivate(() => handleRiskFilterClick(key))}
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
            )}

            {/* Debt Balance — only shown when commits have debt data */}
            {hasDebtData && (
                <CollapsibleSection title="Tech Debt Balance">
                    <div className="space-y-4">
                        {[
                            { key: 'added', label: 'Debt Added', colorClass: 'bg-red-500' },
                            { key: 'paid', label: 'Debt Paid Down', colorClass: 'bg-green-500' },
                            { key: 'neutral', label: 'No Change', colorClass: 'bg-gray-400' },
                        ].map(({ key, label, colorClass }) => {
                            const count = debtBreakdown[key];
                            const pct = debtTotal > 0 ? Math.round((count / debtTotal) * 100) : 0;
                            return (
                                <div
                                    key={key}
                                    className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors"
                                    role="button"
                                    tabIndex={0}
                                    onClick={() => handleDebtFilterClick(key)}
                                    onKeyDown={handleKeyActivate(() => handleDebtFilterClick(key))}
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
                        {/* Net debt indicator */}
                        <div className="mt-2 p-3 bg-themed-tertiary rounded text-center">
                            <span className="text-sm text-themed-secondary">Net: </span>
                            <span className={`text-sm font-semibold ${
                                debtBreakdown.added > debtBreakdown.paid ? 'text-red-500' :
                                debtBreakdown.paid > debtBreakdown.added ? 'text-green-500' :
                                'text-themed-tertiary'
                            }`}>
                                {debtBreakdown.added > debtBreakdown.paid
                                    ? `+${debtBreakdown.added - debtBreakdown.paid} debt accumulating`
                                    : debtBreakdown.paid > debtBreakdown.added
                                    ? `-${debtBreakdown.paid - debtBreakdown.added} debt shrinking`
                                    : 'Balanced'}
                            </span>
                        </div>
                    </div>
                </CollapsibleSection>
            )}

            {/* Debt Trend Over Time */}
            {debtTrendData && (
                <CollapsibleSection title="Debt Trend">
                    <div data-embed-id="debt-trend" style={{ height: '300px' }}>
                        <Line data={debtTrendData.data} options={debtTrendData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Urgency Trend */}
            {urgencyTrendData && (
                <CollapsibleSection title="Urgency Trend">
                    <div data-embed-id="urgency-trend" style={{ height: '300px' }}>
                        <Line data={urgencyTrendData.data} options={urgencyTrendData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Impact Over Time */}
            {impactTrendData && (
                <CollapsibleSection title="Impact Over Time">
                    <div data-embed-id="impact-over-time" style={{ height: '300px' }}>
                        <Bar data={impactTrendData.data} options={impactTrendData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Urgency by Contributor */}
            <CollapsibleSection title="Urgency by Contributor">
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
                    <p className="text-themed-tertiary text-sm">No data</p>
                )}
            </CollapsibleSection>

            {/* Impact by Contributor */}
            <CollapsibleSection title="Impact by Contributor">
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
                    <p className="text-themed-tertiary text-sm">No data</p>
                )}
            </CollapsibleSection>
        </div>
    );
}
