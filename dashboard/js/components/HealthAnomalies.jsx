// Requirement: Decompose HealthTab.jsx (780 lines) into smaller, focused sub-components
// What: Extracted Risk Assessment and Tech Debt Balance — the "are we in trouble?"
//   anomaly-detection sections that surface red flags about change risk levels and
//   whether technical debt is accumulating or being paid down.
// Why: CLAUDE.md mandates extraction at 500+ lines. These two sections form a cohesive
//   "anomaly/health signals" group that conditionally renders based on data availability
//   (hasRiskData, hasDebtData). Extracting them keeps the parent HealthTab focused on
//   layout orchestration rather than section-level rendering details.
// Alternatives:
//   - Separate RiskAssessment and DebtBalance files: Rejected — they share the same
//     visual pattern (progress bars + click-to-filter) and are conceptually paired
//   - Keep inline: Rejected — together they are ~80 lines of JSX plus they require
//     their own data props, making them natural extraction candidates

import React from 'react';
import CollapsibleSection from './CollapsibleSection.jsx';
import { handleKeyActivate } from '../utils.js';

/**
 * Risk Assessment section — shows high/medium/low risk distribution.
 * Only renders when risk data exists (caller checks hasRiskData).
 *
 * @param {Object} riskBreakdown - { low, medium, high }
 * @param {number} riskTotal - Sum of all risk counts
 * @param {boolean} isMobile - Whether to collapse by default on mobile
 * @param {Function} onRiskFilterClick - Handler called with risk level key ('low'|'medium'|'high')
 */
export function RiskAssessment({ riskBreakdown, riskTotal, isMobile, onRiskFilterClick }) {
    const riskItems = [
        { key: 'high', label: 'High Risk', colorClass: 'bg-red-500' },
        { key: 'medium', label: 'Medium Risk', colorClass: 'bg-amber-500' },
        { key: 'low', label: 'Low Risk', colorClass: 'bg-green-500' },
    ];

    return (
        <CollapsibleSection title="Risk Assessment" subtitle="How risky are recent changes?" defaultExpanded={!isMobile}>
            <div className="space-y-4">
                {riskItems.map(({ key, label, colorClass }) => {
                    const count = riskBreakdown[key];
                    const pct = riskTotal > 0 ? Math.round((count / riskTotal) * 100) : 0;
                    return (
                        <div
                            key={key}
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors"
                            role="button"
                            tabIndex={0}
                            onClick={() => onRiskFilterClick(key)}
                            onKeyDown={handleKeyActivate(() => onRiskFilterClick(key))}
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
    );
}

/**
 * Tech Debt Balance section — shows debt added/paid/neutral distribution with net indicator.
 * Only renders when debt data exists (caller checks hasDebtData).
 *
 * @param {Object} debtBreakdown - { added, paid, neutral }
 * @param {number} debtTotal - Sum of all debt counts
 * @param {boolean} isMobile - Whether to collapse by default on mobile
 * @param {Function} onDebtFilterClick - Handler called with debt key ('added'|'paid'|'neutral')
 */
export function DebtBalance({ debtBreakdown, debtTotal, isMobile, onDebtFilterClick }) {
    const debtItems = [
        { key: 'added', label: 'Debt Added', colorClass: 'bg-red-500' },
        { key: 'paid', label: 'Debt Paid Down', colorClass: 'bg-green-500' },
        { key: 'neutral', label: 'No Change', colorClass: 'bg-gray-400' },
    ];

    return (
        <CollapsibleSection title="Tech Debt Balance" subtitle="Is debt growing or shrinking?" defaultExpanded={!isMobile}>
            <div className="space-y-4">
                {debtItems.map(({ key, label, colorClass }) => {
                    const count = debtBreakdown[key];
                    const pct = debtTotal > 0 ? Math.round((count / debtTotal) * 100) : 0;
                    return (
                        <div
                            key={key}
                            className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors"
                            role="button"
                            tabIndex={0}
                            onClick={() => onDebtFilterClick(key)}
                            onKeyDown={handleKeyActivate(() => onDebtFilterClick(key))}
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
    );
}
