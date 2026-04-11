import React, { useMemo } from 'react';
import { Bar } from 'react-chartjs-2';
import { useApp } from '../AppContext.jsx';
import {
    getTagClass, getTagStyleObject, getTagColor,
    aggregateContributors, getAuthorEmail, getAuthorName, sanitizeName, handleKeyActivate
} from '../utils.js';
import { getSeriesColor, mutedColor } from '../chartColors.js';
import { PAGE_LIMITS } from '../state.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';
import ShowMoreButton from '../components/ShowMoreButton.jsx';
import { UrgencyBar, ImpactBar } from '../components/HealthBars.jsx';
import useShowMore from '../hooks/useShowMore.js';

// Requirement: Show contributor data during Phase 1 using pre-aggregated summary
// Approach: When commits haven't loaded, map summary.contributors[] (which has name,
//   email, commits count, avgComplexity, tagBreakdown) to the same format
//   aggregateContributors() returns. Once commits load, use aggregateContributors()
//   which respects user-applied filters and view level.
// Alternatives:
//   - Show spinner: Rejected — summary already has contributor data
//   - Conditional hook call: Rejected — violates React hooks rules

export default function Contributors() {
    const { state, filteredCommits, viewConfig, openDetailPane, isMobile, commitsLoaded } = useApp();

    // Aggregated contributor data — from summary during Phase 1, from commits during Phase 2
    const aggregated = useMemo(() => {
        if (!commitsLoaded) {
            // Phase 1: map pre-aggregated summary contributors to expected format
            const summaryContributors = state.data?.contributors;
            if (!summaryContributors?.length) return [];
            return summaryContributors.map(c => ({
                label: c.email || c.author_id,
                displayName: sanitizeName(c.name, c.email || c.author_id),
                count: c.commits,
                breakdown: c.tagBreakdown || {},
                // avgComplexity is a single number; wrap in array so the average
                // computation (sum/length) returns the same value
                complexities: c.avgComplexity != null ? [c.avgComplexity] : [],
            }));
        }
        // Phase 2: compute from filtered commits (respects view level + filters)
        return aggregateContributors(filteredCommits);
    }, [filteredCommits, commitsLoaded, state.data?.contributors]);

    // Paginate contributor cards — 6 mobile / 8 desktop
    const {
        visible: visibleContributors,
        hasMore: contributorsHasMore,
        remaining: contributorsRemaining,
        showMore: showMoreContributors,
    } = useShowMore(aggregated, ...PAGE_LIMITS.contributors, isMobile);

    // Complexity chart data
    const complexityChartData = useMemo(() => {
        const top8 = aggregated.slice(0, 8);
        if (top8.length === 0) return null;

        const chartLabels = top8.map(item => {
            const name = item.displayName;
            return name.length > 20 ? name.substring(0, 17) + '...' : name;
        });

        const avgComplexities = top8.map(item => {
            if (!item.complexities || item.complexities.length === 0) return 0;
            return item.complexities.reduce((a, b) => a + b, 0) / item.complexities.length;
        });


        return {
            data: {
                labels: chartLabels,
                datasets: [{
                    label: 'Avg Complexity',
                    data: avgComplexities,
                    backgroundColor: avgComplexities.map(c =>
                        c >= 3.5 ? getSeriesColor(3) : c >= 2.5 ? getSeriesColor(0) : mutedColor
                    ),
                }],
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                indexAxis: 'y',
                plugins: { legend: { display: false } },
                scales: {
                    x: { min: 0, max: 5, ticks: { stepSize: 1, font: { size: isMobile ? 10 : 12 } } },
                    y: { ticks: { font: { size: isMobile ? 10 : 12 } } },
                },
            },
        };
    // state.darkMode: bust memo on theme toggle so chart picks up new Chart.js defaults
    }, [aggregated, isMobile, state.darkMode]);

    // --- Per-contributor urgency/impact (moved from Health — per-person data belongs here) ---
    // Only computed from loaded commits (needs per-commit urgency/impact values)
    const urgencyByGroup = useMemo(() => {
        if (!commitsLoaded) return [];
        if (viewConfig.contributors === 'total') {
            const breakdown = { planned: 0, normal: 0, reactive: 0 };
            filteredCommits.forEach(c => {
                if (c.urgency <= 2) breakdown.planned++;
                else if (c.urgency === 3) breakdown.normal++;
                else if (c.urgency >= 4) breakdown.reactive++;
            });
            return [{ label: 'All Contributors', counts: breakdown, total: filteredCommits.length }];
        } else if (viewConfig.contributors === 'repo') {
            const repoUrgency = {};
            filteredCommits.forEach(c => {
                const repo = c.repo_id || 'default';
                if (!repoUrgency[repo]) repoUrgency[repo] = { planned: 0, normal: 0, reactive: 0, total: 0 };
                repoUrgency[repo].total++;
                if (c.urgency <= 2) repoUrgency[repo].planned++;
                else if (c.urgency === 3) repoUrgency[repo].normal++;
                else if (c.urgency >= 4) repoUrgency[repo].reactive++;
            });
            return Object.entries(repoUrgency).sort((a, b) => b[1].total - a[1].total).slice(0, 6)
                .map(([repo, data]) => ({ label: repo, key: repo, counts: data, total: data.total, isRepo: true }));
        } else {
            const contributorUrgency = {};
            filteredCommits.forEach(c => {
                const email = getAuthorEmail(c);
                const name = getAuthorName(c);
                if (!contributorUrgency[email]) contributorUrgency[email] = { name, email, planned: 0, normal: 0, reactive: 0, total: 0 };
                contributorUrgency[email].total++;
                if (c.urgency <= 2) contributorUrgency[email].planned++;
                else if (c.urgency === 3) contributorUrgency[email].normal++;
                else if (c.urgency >= 4) contributorUrgency[email].reactive++;
            });
            return Object.values(contributorUrgency).sort((a, b) => b.total - a.total).slice(0, 6)
                .map(c => ({ label: sanitizeName(c.name, c.email), key: c.email, counts: c, total: c.total, isContributor: true, email: c.email }));
        }
    }, [filteredCommits, viewConfig, commitsLoaded]);

    const impactByGroup = useMemo(() => {
        if (!commitsLoaded) return [];
        if (viewConfig.contributors === 'total') {
            const breakdown = { 'user-facing': 0, 'internal': 0, 'infrastructure': 0, 'api': 0 };
            filteredCommits.forEach(c => {
                if (c.impact && breakdown.hasOwnProperty(c.impact)) breakdown[c.impact]++;
            });
            return [{ label: 'All Contributors', counts: breakdown, total: filteredCommits.length }];
        } else if (viewConfig.contributors === 'repo') {
            const repoImpact = {};
            filteredCommits.forEach(c => {
                const repo = c.repo_id || 'default';
                if (!repoImpact[repo]) repoImpact[repo] = { 'user-facing': 0, 'internal': 0, 'infrastructure': 0, 'api': 0, total: 0 };
                repoImpact[repo].total++;
                if (c.impact && repoImpact[repo].hasOwnProperty(c.impact)) repoImpact[repo][c.impact]++;
            });
            return Object.entries(repoImpact).sort((a, b) => b[1].total - a[1].total).slice(0, 6)
                .map(([repo, data]) => ({ label: repo, key: repo, counts: data, total: data.total, isRepo: true }));
        } else {
            const contributorImpact = {};
            filteredCommits.forEach(c => {
                const email = getAuthorEmail(c);
                const name = getAuthorName(c);
                if (!contributorImpact[email]) contributorImpact[email] = { name, email, 'user-facing': 0, 'internal': 0, 'infrastructure': 0, 'api': 0, total: 0 };
                contributorImpact[email].total++;
                if (c.impact && contributorImpact[email].hasOwnProperty(c.impact)) contributorImpact[email][c.impact]++;
            });
            return Object.values(contributorImpact).sort((a, b) => b.total - a.total).slice(0, 6)
                .map(c => ({ label: sanitizeName(c.name, c.email), key: c.email, counts: c, total: c.total, isContributor: true, email: c.email }));
        }
    }, [filteredCommits, viewConfig, commitsLoaded]);

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

    const handleCardClick = (item) => {
        // During Phase 1, no commits to filter — clicking does nothing useful
        if (!commitsLoaded) return;

        let relevantCommits;
        let displayName = item.label;

        if (viewConfig.contributors === 'total') {
            relevantCommits = filteredCommits;
            displayName = 'All Contributors';
        } else if (viewConfig.contributors === 'repo') {
            relevantCommits = filteredCommits.filter(c => (c.repo_id || 'default') === item.label);
        } else {
            relevantCommits = filteredCommits.filter(c => getAuthorEmail(c) === item.label);
            if (relevantCommits.length > 0) {
                displayName = sanitizeName(getAuthorName(relevantCommits[0]), item.label);
            }
        }

        openDetailPane(displayName, `${relevantCommits.length} commits`, relevantCommits);
    };

    return (
        <div className="space-y-6">
            {/* Who Does What */}
            <CollapsibleSection title="Who Does What" subtitle={commitsLoaded ? 'Top contributors and their focus areas' : 'Overall contributor breakdown'}>
                {aggregated.length > 0 ? (
                <>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        {visibleContributors.map((item, idx) => {
                            const totalTags = Object.values(item.breakdown).reduce((s, v) => s + v, 0);
                            const topTags = Object.entries(item.breakdown)
                                .sort((a, b) => b[1] - a[1])
                                .slice(0, 5);

                            return (
                                <div
                                    key={item.label || idx}
                                    className={`p-3 bg-themed-tertiary rounded-lg transition-colors ${commitsLoaded ? 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600' : ''}`}
                                    role={commitsLoaded ? 'button' : undefined}
                                    tabIndex={commitsLoaded ? 0 : undefined}
                                    aria-label={commitsLoaded ? `${item.displayName}, ${item.count} commits — click for details` : undefined}
                                    onClick={() => handleCardClick(item)}
                                    onKeyDown={commitsLoaded ? handleKeyActivate(() => handleCardClick(item)) : undefined}
                                >
                                    <p className="font-medium text-themed-primary mb-1">{item.displayName}</p>
                                    <p className="text-xs text-themed-tertiary mb-2">{item.count} commits</p>
                                    <div className="space-y-1">
                                        {topTags.map(([tag, count]) => {
                                            const pct = totalTags > 0 ? Math.round((count / totalTags) * 100) : 0;
                                            return (
                                                <div key={tag} className="flex items-center gap-2">
                                                    <span
                                                        className={`tag ${getTagClass(tag)}`}
                                                        style={getTagStyleObject(tag)}
                                                    >
                                                        {tag}
                                                    </span>
                                                    <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                                                        <div
                                                            className="h-2 rounded-full"
                                                            style={{ width: `${pct}%`, backgroundColor: getTagColor(tag) }}
                                                        />
                                                    </div>
                                                    <span className="text-xs text-themed-tertiary w-8">{pct}%</span>
                                                </div>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                    {contributorsHasMore && (
                        <ShowMoreButton remaining={contributorsRemaining} pageSize={isMobile ? PAGE_LIMITS.contributors[0] : PAGE_LIMITS.contributors[1]} onClick={showMoreContributors} />
                    )}
                </>
                ) : (
                    <p className="text-themed-tertiary">Nothing matches the current filters. Try adjusting your selections.</p>
                )}
            </CollapsibleSection>

            {/* Complexity by Contributor — collapsed on mobile since the cards above show the key info */}
            {complexityChartData && (
                <CollapsibleSection title="Complexity by Contributor" subtitle="Average complexity of each person's work" defaultExpanded={!isMobile}>
                    <div data-embed-id="contributor-complexity" style={{ height: `${Math.max(200, aggregated.slice(0, 8).length * (isMobile ? 35 : 40))}px` }}>
                        <Bar data={complexityChartData.data} options={complexityChartData.options} />
                    </div>
                </CollapsibleSection>
            )}

            {/* Urgency by Contributor — moved from Health, per-person data belongs here */}
            {urgencyByGroup.length > 0 && (
                <CollapsibleSection title="Urgency by Contributor" subtitle="Who handles planned vs reactive work?" defaultExpanded={!isMobile}>
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
                </CollapsibleSection>
            )}

            {/* Impact by Contributor — moved from Health, per-person data belongs here */}
            {impactByGroup.length > 0 && (
                <CollapsibleSection title="Impact by Contributor" subtitle="Who works on what areas?" defaultExpanded={!isMobile}>
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
                </CollapsibleSection>
            )}
        </div>
    );
}
