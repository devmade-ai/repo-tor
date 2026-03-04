// Requirement: Decompose Health section data computation into a custom hook
// What: Computes metrics, urgency/impact/risk/debt breakdowns from filtered commits.
// Why: CLAUDE.md mandates extraction at 500+ lines. Keeps Health section focused on
//   layout orchestration while making the data pipeline independently readable.
// Note: Trend charts (urgency/debt/impact over time) and per-contributor breakdowns
//   were moved to Timeline and Contributors sections respectively, where they
//   conceptually belong ("over time" = Timeline, "by person" = Contributors).

import { useMemo } from 'react';
import { getAuthorEmail } from '../utils.js';

/**
 * Custom hook that computes Health section data from filtered commits.
 * Returns metrics and breakdowns for the Health section.
 *
 * @param {Array} filteredCommits - Commits after filter application
 * @param {Object} state - App state (workHourStart, workHourEnd)
 */
export default function useHealthData(filteredCommits, state) {
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
    };
}
