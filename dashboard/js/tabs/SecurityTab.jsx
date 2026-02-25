import React, { useMemo } from 'react';
import { useApp } from '../AppContext.jsx';
import {
    formatDate, getCommitSubject, getAuthorName,
    sanitizeMessage, getCommitDateRange, handleKeyActivate,
} from '../utils.js';
import CollapsibleSection from '../components/CollapsibleSection.jsx';

export default function SecurityTab() {
    const { state, filteredCommits, viewConfig, openDetailPane } = useApp();

    // Compute security commits using two detection methods:
    // 1. Security events from metadata (if available) — extracted by the analysis pipeline
    // 2. Fallback: commits tagged or typed as "security" by the AI analysis
    const usesSecurityEvents = state.data?.summary?.security_events?.length > 0;
    const securityCommits = useMemo(() => {
        if (usesSecurityEvents) {
            const securityShas = new Set(state.data.summary.security_events.map(e => e.sha));
            return filteredCommits.filter(c => securityShas.has(c.sha));
        }
        return filteredCommits.filter(c =>
            c.type === 'security' || (c.tags || []).includes('security')
        );
    }, [filteredCommits, state.data, usesSecurityEvents]);

    const handleRepoClick = (repo) => {
        const filtered = securityCommits.filter(c => (c.repo_id || 'default') === repo);
        openDetailPane(`${repo} Security`, `${filtered.length} commits`, filtered);
    };

    // Executive view: summary stats
    if (viewConfig.contributors === 'total') {
        if (securityCommits.length === 0) {
            return (
                <CollapsibleSection title="Security Commits">
                    <p className="text-themed-tertiary text-center py-8">No security-related commits found</p>
                </CollapsibleSection>
            );
        }

        const dateRange = getCommitDateRange(securityCommits);
        const repos = [...new Set(securityCommits.map(c => c.repo_id).filter(Boolean))];

        return (
            <CollapsibleSection title="Security Commits" subtitle="Changes tagged as security-related by the analysis pipeline">
                <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div className="text-center">
                        <div className="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">
                            {securityCommits.length}
                        </div>
                        <div className="text-sm text-themed-secondary mb-4">Security-related commits</div>
                        <div className="text-xs text-themed-tertiary">
                            {dateRange.earliest} &mdash; {dateRange.latest}
                            {repos.length > 0 && (
                                <>
                                    <br />
                                    Across {repos.length} repositories
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </CollapsibleSection>
        );
    }

    // Management view: counts per repo
    if (viewConfig.contributors === 'repo') {
        if (securityCommits.length === 0) {
            return (
                <CollapsibleSection title="Security Commits">
                    <p className="text-themed-tertiary text-center py-8">No security-related commits found</p>
                </CollapsibleSection>
            );
        }

        const byRepo = {};
        securityCommits.forEach(c => {
            const repo = c.repo_id || 'default';
            byRepo[repo] = (byRepo[repo] || 0) + 1;
        });
        const sortedRepos = Object.entries(byRepo).sort((a, b) => b[1] - a[1]);

        return (
            <CollapsibleSection title="Security Commits" subtitle="Changes tagged as security-related by the analysis pipeline">
                <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                    <div className="text-center mb-4">
                        <div className="text-3xl font-bold text-red-600 dark:text-red-400">
                            {securityCommits.length}
                        </div>
                        <div className="text-sm text-themed-secondary">Total security commits</div>
                    </div>
                </div>
                <div className="space-y-2">
                    {sortedRepos.map(([repo, count]) => (
                        <div
                            key={repo}
                            className="p-3 bg-themed-tertiary rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
                            role="button"
                            tabIndex={0}
                            onClick={() => handleRepoClick(repo)}
                            onKeyDown={handleKeyActivate(() => handleRepoClick(repo))}
                        >
                            <div className="flex justify-between items-center">
                                <span className="text-themed-primary font-medium">{repo}</span>
                                <span className="text-red-600 dark:text-red-400 font-semibold">{count} commits</span>
                            </div>
                        </div>
                    ))}
                </div>
            </CollapsibleSection>
        );
    }

    // Developer view: full commit details
    return (
        <CollapsibleSection title="Security Commits" subtitle="Changes tagged as security-related by the analysis pipeline">
            {securityCommits.length > 0 ? (
                <div className="space-y-3">
                    {securityCommits.map((commit, idx) => (
                        <div
                            key={commit.sha || idx}
                            className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg"
                        >
                            <div className="flex items-start gap-3">
                                <span className="tag tag-security">security</span>
                                <div className="flex-1">
                                    <p className="font-medium text-themed-primary">
                                        {sanitizeMessage(getCommitSubject(commit))}
                                    </p>
                                    <p className="text-xs text-themed-tertiary mt-2">
                                        {commit.sha} by {getAuthorName(commit)} on {formatDate(commit.timestamp)}
                                        {commit.repo_id && ` in ${commit.repo_id}`}
                                    </p>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-themed-tertiary text-center py-8">No security-related commits found</p>
            )}
        </CollapsibleSection>
    );
}
