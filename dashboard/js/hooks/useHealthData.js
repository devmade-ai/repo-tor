// Requirement: Decompose HealthTab.jsx (780 lines) into smaller, focused sub-components
// What: Extracted all useMemo data computation hooks from HealthTab into a custom hook.
//   This includes: metrics, urgency/impact/risk/debt breakdowns, chart data (urgency trend,
//   impact trend, debt trend), and contributor/group groupings.
// Why: CLAUDE.md mandates extraction at 500+ lines. After extracting three presentational
//   components (HealthBars, HealthAnomalies, HealthWorkPatterns), HealthTab was still 630
//   lines — mostly useMemo hooks. Extracting them into a custom hook keeps HealthTab focused
//   on layout orchestration and event handlers (~280 lines) while making the data pipeline
//   independently readable and testable.
// Alternatives:
//   - Keep data in HealthTab: Rejected — still exceeds 300 line target
//   - Split into multiple hooks (useHealthMetrics, useHealthCharts, etc.): Rejected — the
//     hooks share intermediate values (e.g., urgencyTrendData.sortedMonths feeds impactTrend),
//     so splitting them would require passing values between hooks or duplicating computation

import { useMemo } from 'react';
import { getAuthorEmail, getAuthorName, sanitizeName } from '../utils.js';
import { getSeriesColor, withOpacity, mutedColor } from '../chartColors.js';

/**
 * Custom hook that computes all HealthTab data from filtered commits.
 * Returns metrics, breakdowns, chart data, and contributor groupings.
 *
 * @param {Array} filteredCommits - Commits after filter application
 * @param {Object} state - App state (workHourStart, workHourEnd)
 * @param {Object} viewConfig - View level config (contributors: 'total'|'repo'|'individual')
 * @param {boolean} isMobile - Whether the viewport is mobile-sized
 */
export default function useHealthData(filteredCommits, state, viewConfig, isMobile) {
    // Core metrics: totals and percentages for summary cards
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

    // Urgency breakdown: planned / normal / reactive
    const urgencyBreakdown = useMemo(() => {
        const breakdown = { planned: 0, normal: 0, reactive: 0 };
        filteredCommits.forEach(c => {
            if (c.urgency <= 2) breakdown.planned++;
            else if (c.urgency === 3) breakdown.normal++;
            else if (c.urgency >= 4) breakdown.reactive++;
        });
        return breakdown;
    }, [filteredCommits]);

    // Impact breakdown: user-facing / internal / infrastructure / api
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

    // Urgency Trend chart data
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
                    borderColor: getSeriesColor(2),
                    backgroundColor: withOpacity(getSeriesColor(2), 0.1),
                    fill: true,
                    tension: 0.3,
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: {
                    x: { ticks: { font: { size: mobile ? 10 : 12 }, maxRotation: mobile ? 60 : 45 } },
                    y: { min: 1, max: 5, ticks: { stepSize: 1, font: { size: mobile ? 10 : 12 } } },
                },
            },
            sortedMonths,
        };
    }, [filteredCommits, isMobile]);

    // Impact Over Time chart data
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
            'user-facing': getSeriesColor(0),
            'internal': mutedColor,
            'infrastructure': getSeriesColor(3),
            'api': getSeriesColor(1),
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
                        labels: { boxWidth: mobile ? 8 : 12, font: { size: mobile ? 9 : 10 }, padding: mobile ? 4 : 10 },
                    },
                },
                scales: {
                    x: { stacked: true, ticks: { font: { size: mobile ? 10 : 12 }, maxRotation: mobile ? 60 : 45 } },
                    y: { stacked: true, ticks: { font: { size: mobile ? 10 : 12 } } },
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
                        borderColor: getSeriesColor(4),
                        backgroundColor: withOpacity(getSeriesColor(4), 0.1),
                        fill: true,
                        tension: 0.3,
                    },
                    {
                        label: 'Debt Paid',
                        data: sortedMonths.map(m => monthlyDebt[m]?.paid || 0),
                        borderColor: getSeriesColor(1),
                        backgroundColor: withOpacity(getSeriesColor(1), 0.1),
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
                        labels: { boxWidth: mobile ? 8 : 12, font: { size: mobile ? 9 : 10 }, padding: mobile ? 4 : 10 },
                    },
                },
                scales: {
                    x: { ticks: { font: { size: mobile ? 10 : 12 }, maxRotation: mobile ? 60 : 45 } },
                    y: { ticks: { font: { size: mobile ? 10 : 12 } } },
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

    return {
        metrics,
        urgencyBreakdown,
        impactBreakdown,
        riskBreakdown,
        hasRiskData,
        riskTotal,
        debtBreakdown,
        hasDebtData,
        debtTotal,
        urgencyTrendData,
        impactTrendData,
        debtTrendData,
        urgencyByGroup,
        impactByGroup,
    };
}
