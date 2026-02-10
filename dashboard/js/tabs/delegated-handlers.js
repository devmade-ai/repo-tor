import { state, getViewConfig } from '../state.js';
import { escapeHtml, getAuthorEmail, getAuthorName, sanitizeName } from '../utils.js';
import { getFilteredCommits } from '../filters.js';
import { aggregateByWeekPeriod, aggregateByDayPeriod } from '../charts.js';
import { openDetailPane } from '../ui.js';
import { renderTimeline } from './timeline.js';

// Single handler on #dashboard for all data-* attribute clicks.
// Called once during init — no per-render listener accumulation.
let _delegatedHandlersAttached = false;

export function setupDelegatedHandlers() {
    if (_delegatedHandlersAttached) return;
    _delegatedHandlersAttached = true;

    document.getElementById('dashboard').addEventListener('click', (e) => {
        // Activity cards (Total Commits, Contributors, etc.)
        const activityEl = e.target.closest('[data-activity-card]');
        if (activityEl) {
            const cardType = activityEl.dataset.activityCard;
            const currentCommits = getFilteredCommits();
            if (cardType === 'total') {
                openDetailPane('All Commits', `${currentCommits.length} commits`, currentCommits, { type: 'all', value: '' });
            } else if (cardType === 'contributors') {
                const contributors = {};
                currentCommits.forEach(c => {
                    const email = getAuthorEmail(c);
                    if (!contributors[email]) {
                        contributors[email] = { name: getAuthorName(c), count: 0 };
                    }
                    contributors[email].count++;
                });
                const sorted = Object.values(contributors).sort((a, b) => b.count - a.count);
                const html = sorted.map(c =>
                    `<div class="flex justify-between p-2 bg-themed-tertiary rounded mb-2">
                        <span class="text-themed-primary">${escapeHtml(c.name)}</span>
                        <span class="text-themed-tertiary">${c.count} commits</span>
                    </div>`
                ).join('');
                document.getElementById('detail-title').textContent = 'Contributors';
                document.getElementById('detail-subtitle').textContent = `${sorted.length} active`;
                document.getElementById('detail-content').innerHTML = html;
                document.getElementById('detail-overlay').classList.add('open');
                document.getElementById('detail-pane').classList.add('open');
                state.detailPaneOpen = true;
            }
            return;
        }

        // Work cards (Features, Bug Fixes, Refactors)
        const workEl = e.target.closest('[data-work-card]');
        if (workEl) {
            const cardType = workEl.dataset.workCard;
            const currentCommits = getFilteredCommits();
            let filtered, title;
            if (cardType === 'features') {
                filtered = currentCommits.filter(c => (c.tags || []).includes('feature'));
                title = 'Feature Commits';
            } else if (cardType === 'bugfixes') {
                filtered = currentCommits.filter(c =>
                    (c.tags || []).includes('bugfix') || (c.tags || []).includes('fix')
                );
                title = 'Bug Fix Commits';
            } else if (cardType === 'refactors') {
                filtered = currentCommits.filter(c => (c.tags || []).includes('refactor'));
                title = 'Refactor Commits';
            }
            if (filtered) {
                openDetailPane(title, `${filtered.length} commits`, filtered);
            }
            return;
        }

        // Health cards (Security, Reactive, Weekend, After Hours)
        const healthEl = e.target.closest('[data-health-card]');
        if (healthEl) {
            const cardType = healthEl.dataset.healthCard;
            const currentCommits = getFilteredCommits();
            let filteredCommits, title;
            if (cardType === 'security') {
                filteredCommits = currentCommits.filter(c =>
                    c.type === 'security' || (c.tags || []).includes('security')
                );
                title = 'Security Commits';
            } else if (cardType === 'reactive') {
                filteredCommits = currentCommits.filter(c => c.urgency >= 4);
                title = 'Reactive Work (Urgency 4-5)';
            } else if (cardType === 'weekend') {
                filteredCommits = currentCommits.filter(c => {
                    if (!c.timestamp) return false;
                    const day = new Date(c.timestamp).getDay();
                    return day === 0 || day === 6;
                });
                title = 'Weekend Commits';
            } else if (cardType === 'afterhours') {
                filteredCommits = currentCommits.filter(c => {
                    if (!c.timestamp) return false;
                    const hour = new Date(c.timestamp).getHours();
                    return hour < state.workHourStart || hour >= state.workHourEnd;
                });
                title = 'After Hours Commits';
            }
            if (filteredCommits) {
                openDetailPane(title, `${filteredCommits.length} commits`, filteredCommits);
            }
            return;
        }

        // Summary cards (Features Built, Bugs Fixed, Avg Urgency, % Planned)
        const summaryEl = e.target.closest('[data-summary-card]');
        if (summaryEl) {
            const cardType = summaryEl.dataset.summaryCard;
            const allCommits = getFilteredCommits();
            let filteredCommits, title;
            if (cardType === 'features') {
                filteredCommits = allCommits.filter(c => (c.tags || []).includes('feature'));
                title = 'Feature Commits';
            } else if (cardType === 'fixes') {
                filteredCommits = allCommits.filter(c =>
                    (c.tags || []).includes('bugfix') || (c.tags || []).includes('fix')
                );
                title = 'Bug Fix Commits';
            } else if (cardType === 'urgency') {
                filteredCommits = allCommits.filter(c => c.urgency >= 4);
                title = 'Reactive Commits (Urgency 4-5)';
            } else if (cardType === 'planned') {
                filteredCommits = allCommits.filter(c => c.urgency <= 2);
                title = 'Planned Work (Urgency 1-2)';
            }
            if (filteredCommits) {
                openDetailPane(title, `${filteredCommits.length} commits`, filteredCommits);
            }
            return;
        }

        // Period cards (Executive/Management timeline view)
        const periodEl = e.target.closest('[data-period-key]');
        if (periodEl) {
            const key = periodEl.dataset.periodKey;
            // Re-aggregate to get actual commits for this period
            const config = getViewConfig();
            const periodCommits = config.timing === 'week'
                ? aggregateByWeekPeriod(getFilteredCommits())
                : aggregateByDayPeriod(getFilteredCommits());
            const period = periodCommits.find(p => p.key === key);
            if (period) {
                openDetailPane(period.label, `${period.count} commits`, period.commits);
            }
            return;
        }

        // Security repo cards (Management view)
        const secRepoEl = e.target.closest('[data-security-repo]');
        if (secRepoEl) {
            const repo = secRepoEl.dataset.securityRepo;
            const commits = getFilteredCommits();
            const securityCommits = commits.filter(c =>
                c.type === 'security' || (c.tags || []).includes('security')
            );
            const filtered = securityCommits.filter(c => (c.repo_id || 'default') === repo);
            openDetailPane(`${repo} Security`, `${filtered.length} commits`, filtered);
            return;
        }

        // Load more button
        const loadMoreEl = e.target.closest('#load-more-commits');
        if (loadMoreEl) {
            state._commitListVisible += 100;
            renderTimeline();
            return;
        }

        // Urgency distribution bars
        const urgencyEl = e.target.closest('[data-urgency-filter]');
        if (urgencyEl) {
            const filter = urgencyEl.dataset.urgencyFilter;
            let filterFn, title;
            if (filter === 'planned') { filterFn = c => c.urgency <= 2; title = 'Planned Work (Urgency 1-2)'; }
            else if (filter === 'normal') { filterFn = c => c.urgency === 3; title = 'Normal Work (Urgency 3)'; }
            else { filterFn = c => c.urgency >= 4; title = 'Reactive Work (Urgency 4-5)'; }
            openDetailPane(title, `${getFilteredCommits().filter(filterFn).length} commits`, getFilteredCommits().filter(filterFn));
            return;
        }

        // Impact distribution bars
        const impactEl = e.target.closest('[data-impact-filter]');
        if (impactEl) {
            const impact = impactEl.dataset.impactFilter;
            const labels = { 'user-facing': 'User-Facing', 'internal': 'Internal', 'infrastructure': 'Infrastructure', 'api': 'API' };
            const filtered = getFilteredCommits().filter(c => c.impact === impact);
            openDetailPane(`${labels[impact] || impact} Impact`, `${filtered.length} commits`, filtered, { type: 'impact', value: impact });
            return;
        }

        // Tag breakdown bars
        const tagEl = e.target.closest('[data-tag-filter]');
        if (tagEl) {
            const tag = tagEl.dataset.tagFilter;
            const filtered = getFilteredCommits().filter(c => (c.tags || []).includes(tag));
            openDetailPane(`${tag} Commits`, `${filtered.length} commits`, filtered, { type: 'tag', value: tag });
            return;
        }

        // Urgency by contributor
        const contribUrgencyEl = e.target.closest('[data-contributor-urgency]');
        if (contribUrgencyEl) {
            const email = contribUrgencyEl.dataset.contributorUrgency;
            const filtered = getFilteredCommits().filter(c => getAuthorEmail(c) === email);
            const name = filtered.length > 0 ? sanitizeName(getAuthorName(filtered[0]), email) : 'Unknown';
            openDetailPane(`${name}'s Commits`, `${filtered.length} commits`, filtered, { type: 'author', value: name });
            return;
        }

        // Urgency by repo
        const repoUrgencyEl = e.target.closest('[data-repo-urgency]');
        if (repoUrgencyEl) {
            const repo = repoUrgencyEl.dataset.repoUrgency;
            const filtered = getFilteredCommits().filter(c => (c.repo_id || 'default') === repo);
            openDetailPane(`${repo}`, `${filtered.length} commits`, filtered);
            return;
        }

        // Impact by contributor
        const contribImpactEl = e.target.closest('[data-contributor-impact]');
        if (contribImpactEl) {
            const email = contribImpactEl.dataset.contributorImpact;
            const filtered = getFilteredCommits().filter(c => getAuthorEmail(c) === email);
            const name = filtered.length > 0 ? sanitizeName(getAuthorName(filtered[0]), email) : 'Unknown';
            openDetailPane(`${name}'s Commits`, `${filtered.length} commits`, filtered, { type: 'author', value: name });
            return;
        }

        // Impact by repo
        const repoImpactEl = e.target.closest('[data-repo-impact]');
        if (repoImpactEl) {
            const repo = repoImpactEl.dataset.repoImpact;
            const filtered = getFilteredCommits().filter(c => (c.repo_id || 'default') === repo);
            openDetailPane(`${repo}`, `${filtered.length} commits`, filtered);
            return;
        }

        // Contributor/repo drilldown cards (Who Does What)
        const drilldownEl = e.target.closest('[data-drilldown-label]');
        if (drilldownEl) {
            const label = drilldownEl.dataset.drilldownLabel;
            const commits = getFilteredCommits();
            const config = getViewConfig();
            let relevantCommits, displayName = label;
            if (config.contributors === 'total') {
                relevantCommits = commits;
                displayName = 'All Contributors';
            } else if (config.contributors === 'repo') {
                relevantCommits = commits.filter(c => (c.repo_id || 'default') === label);
            } else {
                relevantCommits = commits.filter(c => getAuthorEmail(c) === label);
                if (relevantCommits.length > 0) {
                    displayName = sanitizeName(getAuthorName(relevantCommits[0]), label);
                }
            }
            openDetailPane(displayName, `${relevantCommits.length} commits`, relevantCommits);
            return;
        }
    });
}
