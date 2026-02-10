import { state, getViewConfig } from '../state.js';
import {
    escapeHtml, formatDate, getCommitTags, getTagClass, getTagStyle,
    getAuthorEmail, getAuthorName, getCommitSubject,
    sanitizeMessage, getWorkPatternBadges
} from '../utils.js';
import { getFilteredCommits } from '../filters.js';
import { renderActivityTimeline, renderCodeChangesTimeline, aggregateByWeekPeriod, aggregateByDayPeriod } from '../charts.js';

export function renderTimeline() {
    const filteredCommits = getFilteredCommits();
    const config = getViewConfig();

    // === Activity Summary Cards ===
    const totalCommits = filteredCommits.length;
    document.getElementById('activity-total-commits').textContent = totalCommits;

    // Active days (unique dates with commits)
    const uniqueDays = new Set(filteredCommits.map(c => c.timestamp?.substring(0, 10)).filter(Boolean));
    const activeDays = uniqueDays.size;
    document.getElementById('activity-active-days').textContent = activeDays;

    // Date range
    const sortedDates = [...uniqueDays].sort();
    if (sortedDates.length > 0) {
        const earliest = new Date(sortedDates[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const latest = new Date(sortedDates[sortedDates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        document.getElementById('activity-date-range').textContent = `${earliest} — ${latest}`;
        document.getElementById('activity-days-sub').textContent = `in ${sortedDates.length} day span`;
    } else {
        document.getElementById('activity-date-range').textContent = 'No data';
        document.getElementById('activity-days-sub').textContent = '';
    }

    // Contributors
    const uniqueContributors = new Set(filteredCommits.map(c => getAuthorEmail(c)));
    document.getElementById('activity-contributors').textContent = uniqueContributors.size;

    // Average commits per active day
    const avgPerDay = activeDays > 0 ? (totalCommits / activeDays).toFixed(1) : '0';
    document.getElementById('activity-avg-per-day').textContent = avgPerDay;

    // Click handlers are delegated via setupDelegatedHandlers()

    // Track visible count for load-more (reset when filters change commit count)
    if (!state._commitListVisible || state._commitListTotal !== filteredCommits.length) {
        state._commitListVisible = 100;
        state._commitListTotal = filteredCommits.length;
    }

    // Update count based on view level
    if (config.drilldown === 'commits') {
        const showing = Math.min(filteredCommits.length, state._commitListVisible);
        document.getElementById('commit-count').textContent =
            `Showing ${showing} of ${filteredCommits.length}`;
    } else {
        document.getElementById('commit-count').textContent =
            `${filteredCommits.length} total commits`;
    }

    // Render activity timeline chart
    renderActivityTimeline(filteredCommits);

    // Render code changes timeline chart
    renderCodeChangesTimeline(filteredCommits);

    // Commit List - different view based on level
    let listHtml;

    if (config.drilldown === 'commits') {
        // Developer view: show individual commits (current behavior)
        listHtml = filteredCommits.slice(0, state._commitListVisible).map(commit => {
            const tags = getCommitTags(commit);
            const tagBadges = tags.slice(0, 3).map(t =>
                `<span class="tag ${getTagClass(t)} shrink-0" style="${getTagStyle(t)}">${t}</span>`
            ).join(' ');
            const extraTags = tags.length > 3 ? `<span class="tag tag-other shrink-0">+${tags.length - 3}</span>` : '';
            const workPatternBadges = getWorkPatternBadges(commit);
            const complexityBadge = commit.complexity != null
                ? `<span class="text-xs px-1.5 py-0.5 rounded ${commit.complexity >= 4 ? 'bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300' : commit.complexity >= 2 ? 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300' : 'bg-gray-100 text-themed-secondary dark:bg-gray-700'}">${commit.complexity}/5</span>`
                : '';

            return `
            <div class="p-3 bg-themed-tertiary rounded-lg">
                <div class="flex items-start gap-2 sm:gap-3">
                    <div class="flex flex-wrap gap-1 shrink-0">
                        ${tagBadges}${extraTags}
                    </div>
                    <div class="flex-1 min-w-0">
                        <p class="text-sm font-medium text-themed-primary break-words sm:truncate">${escapeHtml(sanitizeMessage(getCommitSubject(commit)))}</p>
                    </div>
                    ${complexityBadge}
                </div>
                <div class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-themed-tertiary">
                    <span>${escapeHtml(getAuthorName(commit))}</span>
                    <span>·</span>
                    <span>${formatDate(commit.timestamp)}</span>
                    ${commit.repo_id ? `<span class="text-themed-muted">· ${commit.repo_id}</span>` : ''}
                    ${workPatternBadges ? `<span class="ml-1">${workPatternBadges}</span>` : ''}
                </div>
            </div>
        `}).join('');
    } else {
        // Executive/Management view: show summary by time period
        const periodData = config.timing === 'week'
            ? aggregateByWeekPeriod(filteredCommits)
            : aggregateByDayPeriod(filteredCommits);

        listHtml = periodData.slice(0, 20).map(period => {
            const tagSummary = Object.entries(period.tags)
                .sort((a, b) => b[1] - a[1])
                .slice(0, 4)
                .map(([tag, count]) => `<span class="tag ${getTagClass(tag)}" style="${getTagStyle(tag)}">${tag} (${count})</span>`)
                .join(' ');

            return `
            <div class="p-3 bg-themed-tertiary rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" data-period-key="${period.key}">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-sm font-medium text-themed-primary">${period.label}</span>
                    <span class="text-sm text-themed-secondary">${period.count} commits</span>
                </div>
                <div class="flex flex-wrap gap-1">
                    ${tagSummary}
                </div>
                ${period.repos && period.repos.length > 1 ? `<div class="text-xs text-themed-tertiary mt-1">${period.repos.length} repos</div>` : ''}
            </div>
            `;
        }).join('');

        // Click handlers are delegated via setupDelegatedHandlers()
    }

    // Add "Load more" button if there are more commits to show
    if (config.drilldown === 'commits' && filteredCommits.length > state._commitListVisible) {
        const remaining = filteredCommits.length - state._commitListVisible;
        listHtml += `
            <button id="load-more-commits" class="w-full py-3 text-sm font-medium text-themed-secondary hover:text-themed-primary bg-themed-tertiary hover:bg-gray-600 rounded-lg transition-colors cursor-pointer border-0">
                Load ${Math.min(remaining, 100)} more (${remaining} remaining)
            </button>
        `;
    }

    document.getElementById('commit-list').innerHTML = listHtml || '<p class="text-themed-tertiary">No changes match the current filters</p>';
    // Load-more click is delegated via setupDelegatedHandlers()
}
