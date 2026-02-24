// Requirement: Decompose HealthTab.jsx (780 lines) into smaller, focused sub-components
// What: Extracted the Health Overview summary cards — the four work-pattern / burnout-risk
//   indicators that show security commit count, reactive work percentage, weekend commit
//   percentage, and after-hours commit percentage.
// Why: CLAUDE.md mandates extraction at 500+ lines. These four stat cards form a cohesive
//   "work pattern signals" group focused on burnout risk and operational health. They share
//   the same visual pattern (clickable stat card) and the same data shape (metrics object).
//   Extracting them keeps the parent HealthTab focused on layout orchestration.
// Alternatives:
//   - Extract each card individually: Rejected — they are tightly coupled (same layout,
//     same metrics object, same click handler pattern) and too small to warrant 4 files
//   - Keep inline: Rejected — the section is self-contained with clear props boundary

import React from 'react';
import CollapsibleSection from './CollapsibleSection.jsx';
import { handleKeyActivate } from '../utils.js';

/**
 * Health Overview section — four summary cards showing work pattern and burnout risk indicators.
 *
 * @param {Object} metrics - { securityCount, reactivePct, weekendPct, afterHoursPct }
 * @param {Function} onCardClick - Handler called with card type ('security'|'reactive'|'weekend'|'afterhours')
 */
export default function HealthWorkPatterns({ metrics, onCardClick }) {
    const cards = [
        { type: 'security', value: metrics.securityCount, label: 'Security' },
        { type: 'reactive', value: `${metrics.reactivePct}%`, label: 'Reactive' },
        { type: 'weekend', value: `${metrics.weekendPct}%`, label: 'Weekend' },
        { type: 'afterhours', value: `${metrics.afterHoursPct}%`, label: 'After Hours' },
    ];

    return (
        <CollapsibleSection title="Health Overview">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {cards.map(({ type, value, label }) => (
                    <div
                        key={type}
                        className="p-4 bg-themed-tertiary rounded-lg text-center cursor-pointer hover:ring-2 hover:ring-blue-500 transition-all"
                        role="button"
                        tabIndex={0}
                        onClick={() => onCardClick(type)}
                        onKeyDown={handleKeyActivate(() => onCardClick(type))}
                    >
                        <div className="text-2xl font-semibold text-themed-primary">{value}</div>
                        <div className="text-sm text-themed-tertiary">{label}</div>
                    </div>
                ))}
            </div>
        </CollapsibleSection>
    );
}
