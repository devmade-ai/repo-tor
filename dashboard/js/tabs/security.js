import { state, getViewConfig } from '../state.js';
import {
    escapeHtml, formatDate, getCommitSubject, getAuthorName,
    sanitizeMessage, getCommitDateRange
} from '../utils.js';
import { getFilteredCommits } from '../filters.js';

export function renderSecurity() {
    const commits = getFilteredCommits();
    const config = getViewConfig();

    // Use security_events from summary if available, otherwise compute
    let securityCommits;
    if (state.data.summary?.security_events?.length > 0) {
        // Map security_events back to full commits for display
        const securityShas = new Set(state.data.summary.security_events.map(e => e.sha));
        securityCommits = commits.filter(c => securityShas.has(c.sha));
    } else {
        securityCommits = commits.filter(c =>
            c.type === 'security' || (c.tags || []).includes('security')
        );
    }

    let listHtml;

    if (config.contributors === 'total') {
        // Executive view: show summary stats only
        if (securityCommits.length === 0) {
            listHtml = '<p class="text-themed-tertiary text-center py-8">No security-related commits found</p>';
        } else {
            const dateRange = getCommitDateRange(securityCommits);
            const repos = [...new Set(securityCommits.map(c => c.repo_id).filter(Boolean))];
            listHtml = `
                <div class="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div class="text-center">
                        <div class="text-4xl font-bold text-red-600 dark:text-red-400 mb-2">${securityCommits.length}</div>
                        <div class="text-sm text-themed-secondary mb-4">Security-related commits</div>
                        <div class="text-xs text-themed-tertiary">
                            ${dateRange.earliest} — ${dateRange.latest}
                            ${repos.length > 0 ? `<br>Across ${repos.length} repositories` : ''}
                        </div>
                    </div>
                </div>
            `;
        }
    } else if (config.contributors === 'repo') {
        // Management view: show counts per repo
        if (securityCommits.length === 0) {
            listHtml = '<p class="text-themed-tertiary text-center py-8">No security-related commits found</p>';
        } else {
            const byRepo = {};
            securityCommits.forEach(c => {
                const repo = c.repo_id || 'default';
                byRepo[repo] = (byRepo[repo] || 0) + 1;
            });
            const sortedRepos = Object.entries(byRepo).sort((a, b) => b[1] - a[1]);

            listHtml = `
                <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg mb-4">
                    <div class="text-center mb-4">
                        <div class="text-3xl font-bold text-red-600 dark:text-red-400">${securityCommits.length}</div>
                        <div class="text-sm text-themed-secondary">Total security commits</div>
                    </div>
                </div>
                <div class="space-y-2">
                    ${sortedRepos.map(([repo, count]) => `
                        <div class="p-3 bg-themed-tertiary rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" data-security-repo="${escapeHtml(repo)}">
                            <div class="flex justify-between items-center">
                                <span class="text-themed-primary font-medium">${escapeHtml(repo)}</span>
                                <span class="text-red-600 dark:text-red-400 font-semibold">${count} commits</span>
                            </div>
                        </div>
                    `).join('')}
                </div>
            `;

            // Click handlers are delegated via setupDelegatedHandlers()
        }
    } else {
        // Developer view: show full commit details (original behavior)
        listHtml = securityCommits.length > 0
            ? securityCommits.map(commit => `
                <div class="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
                    <div class="flex items-start gap-3">
                        <span class="tag tag-security">security</span>
                        <div class="flex-1">
                            <p class="font-medium text-themed-primary">${escapeHtml(sanitizeMessage(getCommitSubject(commit)))}</p>
                            <p class="text-sm text-themed-secondary mt-1">${state.isSanitized ? '[Details hidden]' : (escapeHtml(commit.body || '').substring(0, 200) || 'No description')}</p>
                            <p class="text-xs text-themed-tertiary mt-2">
                                ${commit.sha} by ${escapeHtml(getAuthorName(commit))} on ${formatDate(commit.timestamp)}
                                ${commit.repo_id ? `in ${commit.repo_id}` : ''}
                            </p>
                        </div>
                    </div>
                </div>
            `).join('')
            : '<p class="text-themed-tertiary text-center py-8">No security-related commits found</p>';
    }

    document.getElementById('security-list').innerHTML = listHtml;
}
