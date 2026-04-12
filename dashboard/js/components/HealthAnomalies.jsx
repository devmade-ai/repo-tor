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
    const clickable = typeof onRiskFilterClick === 'function';

    return (
        <CollapsibleSection title="Risk Assessment" subtitle="How risky are recent changes?" defaultExpanded={!isMobile}>
            <div className="space-y-4">
                {riskItems.map(({ key, label, colorClass }) => {
                    const count = riskBreakdown[key];
                    const pct = riskTotal > 0 ? Math.round((count / riskTotal) * 100) : 0;
                    return (
                        <div
                            key={key}
                            className={`rounded p-2 -m-2 transition-colors ${clickable ? 'cursor-pointer hover:bg-base-200' : ''}`}
                            role={clickable ? 'button' : undefined}
                            tabIndex={clickable ? 0 : undefined}
                            onClick={clickable ? () => onRiskFilterClick(key) : undefined}
                            onKeyDown={clickable ? handleKeyActivate(() => onRiskFilterClick(key)) : undefined}
                        >
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-base-content/80">{label}</span>
                                <span className="text-base-content font-medium">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-base-300 rounded-full h-2">
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
    const clickable = typeof onDebtFilterClick === 'function';

    return (
        <CollapsibleSection title="Tech Debt Balance" subtitle="Is debt growing or shrinking?" defaultExpanded={!isMobile}>
            <div className="space-y-4">
                {debtItems.map(({ key, label, colorClass }) => {
                    const count = debtBreakdown[key];
                    const pct = debtTotal > 0 ? Math.round((count / debtTotal) * 100) : 0;
                    return (
                        <div
                            key={key}
                            className={`rounded p-2 -m-2 transition-colors ${clickable ? 'cursor-pointer hover:bg-base-200' : ''}`}
                            role={clickable ? 'button' : undefined}
                            tabIndex={clickable ? 0 : undefined}
                            onClick={clickable ? () => onDebtFilterClick(key) : undefined}
                            onKeyDown={clickable ? handleKeyActivate(() => onDebtFilterClick(key)) : undefined}
                        >
                            <div className="flex justify-between text-sm mb-1">
                                <span className="text-base-content/80">{label}</span>
                                <span className="text-base-content font-medium">{count} ({pct}%)</span>
                            </div>
                            <div className="w-full bg-base-300 rounded-full h-2">
                                <div className={`${colorClass} h-2 rounded-full`} style={{ width: `${pct}%` }} />
                            </div>
                        </div>
                    );
                })}
                {/* Net debt indicator */}
                <div className="mt-2 p-3 bg-base-300 rounded text-center">
                    <span className="text-sm text-base-content/80">Net: </span>
                    <span className={`text-sm font-semibold ${
                        debtBreakdown.added > debtBreakdown.paid ? 'text-error' :
                        debtBreakdown.paid > debtBreakdown.added ? 'text-success' :
                        'text-base-content/60'
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
