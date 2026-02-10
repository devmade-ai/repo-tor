import React, { useMemo } from 'react';
import { useApp } from '../AppContext.jsx';
import { getCommitTags, getWorkPattern } from '../utils.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';

export default function SummaryTab() {
    const { filteredCommits, openDetailPane } = useApp();

    const metrics = useMemo(() => {
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

        return {
            features, fixes, avgUrgency, plannedPct,
            complexChanges, simpleChanges,
            topRepo, topRepoPct,
            afterHoursCount, weekendCount, holidayCount, afterHoursPct,
            refactorCount, testCount,
        };
    }, [filteredCommits]);

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

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <CollapsibleSection title="Key Stats">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div
                        className="stat-card cursor-pointer hover:ring-2 hover:ring-blue-500 rounded-lg transition-all"

                        onClick={() => handleCardClick('features')}
                    >
                        <div className="p-4 bg-themed-tertiary rounded-lg text-center">
                            <div className="text-2xl font-semibold text-themed-primary">{metrics.features}</div>
                            <div className="text-sm text-themed-tertiary">Features Built</div>
                        </div>
                    </div>
                    <div
                        className="stat-card cursor-pointer hover:ring-2 hover:ring-blue-500 rounded-lg transition-all"

                        onClick={() => handleCardClick('fixes')}
                    >
                        <div className="p-4 bg-themed-tertiary rounded-lg text-center">
                            <div className="text-2xl font-semibold text-themed-primary">{metrics.fixes}</div>
                            <div className="text-sm text-themed-tertiary">Bugs Fixed</div>
                        </div>
                    </div>
                    <div
                        className="stat-card cursor-pointer hover:ring-2 hover:ring-blue-500 rounded-lg transition-all"

                        onClick={() => handleCardClick('urgency')}
                    >
                        <div className="p-4 bg-themed-tertiary rounded-lg text-center">
                            <div className="text-2xl font-semibold text-themed-primary">
                                {metrics.avgUrgency > 0 ? metrics.avgUrgency.toFixed(1) : '-'}
                            </div>
                            <div className="text-sm text-themed-tertiary">Avg Urgency</div>
                        </div>
                    </div>
                    <div
                        className="stat-card cursor-pointer hover:ring-2 hover:ring-blue-500 rounded-lg transition-all"

                        onClick={() => handleCardClick('planned')}
                    >
                        <div className="p-4 bg-themed-tertiary rounded-lg text-center">
                            <div className="text-2xl font-semibold text-themed-primary">
                                {metrics.plannedPct > 0 ? `${metrics.plannedPct}%` : '-'}
                            </div>
                            <div className="text-sm text-themed-tertiary">% Planned</div>
                        </div>
                    </div>
                </div>
            </CollapsibleSection>

            {/* Key Highlights */}
            <CollapsibleSection title="Key Highlights">
                {highlights.length > 0 ? (
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                        {highlights.map((h) => (
                            <div key={h.label} className="p-3 bg-themed-tertiary rounded">
                                <p className="text-xs text-themed-tertiary mb-1">{h.label}</p>
                                <p className="text-sm font-semibold text-themed-primary">{h.value}</p>
                                {h.subvalue && (
                                    <p className="text-xs text-themed-tertiary">{h.subvalue}</p>
                                )}
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-themed-tertiary text-sm">No activity</p>
                )}
            </CollapsibleSection>

            {/* Activity Snapshot */}
            <CollapsibleSection title="Activity Snapshot">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    <div className="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded">
                        <p className="text-2xl font-bold text-amber-600">{metrics.afterHoursCount}</p>
                        <p className="text-xs text-themed-tertiary">After-hours</p>
                    </div>
                    <div className="text-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded">
                        <p className="text-2xl font-bold text-indigo-600">{metrics.weekendCount}</p>
                        <p className="text-xs text-themed-tertiary">Weekend</p>
                    </div>
                    <div className="text-center p-3 bg-pink-50 dark:bg-pink-900/20 rounded">
                        <p className="text-2xl font-bold text-pink-600">{metrics.holidayCount}</p>
                        <p className="text-xs text-themed-tertiary">Holiday</p>
                    </div>
                    <div className="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
                        <p className="text-2xl font-bold text-purple-600">{metrics.complexChanges}</p>
                        <p className="text-xs text-themed-tertiary">Complex</p>
                    </div>
                </div>
            </CollapsibleSection>
        </div>
    );
}
