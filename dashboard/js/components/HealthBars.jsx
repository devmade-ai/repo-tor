// Requirement: Decompose HealthTab.jsx (780 lines) into smaller, focused sub-components
// What: Extracted UrgencyBar and ImpactBar — inline helper components that render
//   stacked horizontal bar breakdowns for urgency (planned/normal/reactive) and
//   impact (user-facing/internal/infrastructure/api) distributions.
// Why: CLAUDE.md mandates extraction at 500+ lines. These are self-contained presentational
//   components with no dependency on HealthTab state — they only need counts, total, label,
//   and an optional onClick handler.
// Alternatives:
//   - Keep inline in HealthTab: Rejected — contributes ~60 lines and is reusable
//   - Separate files per bar type: Rejected — they share the same pattern and are always
//     used together in the Health tab context

import React from 'react';
import { handleKeyActivate } from '../utils.js';

/**
 * Stacked bar showing planned / normal / reactive urgency distribution.
 * @param {Object} counts - { planned, normal, reactive }
 * @param {number} total - Total commit count (denominator for percentages)
 * @param {string} label - Display label (contributor name, repo name, or "All Contributors")
 * @param {Function} [onClick] - Optional click handler to open detail pane
 */
export function UrgencyBar({ counts, total, label, onClick }) {
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

/**
 * Stacked bar showing user-facing / internal / infrastructure / api impact distribution.
 * @param {Object} counts - { 'user-facing', 'internal', 'infrastructure', 'api' }
 * @param {number} total - Total commit count (denominator for percentages)
 * @param {string} label - Display label (contributor name, repo name, or "All Contributors")
 * @param {Function} [onClick] - Optional click handler to open detail pane
 */
export function ImpactBar({ counts, total, label, onClick }) {
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
