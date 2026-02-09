import { state } from './state.js';
import { getViewConfig } from './state.js';
import {
    escapeHtml, formatDate, formatNumber, getCommitTags, getAllTags, getTagColor, getTagClass, getTagStyle,
    getAuthorEmail, getAuthorName, getCommitSubject, getAdditions, getDeletions, getFilesChanged,
    sanitizeName, sanitizeMessage, getWorkPattern, getWorkPatternBadges, getCommitDateTime,
    getUrgencyLabel, DAY_NAMES, DAY_NAMES_SHORT,
    aggregateContributors, aggregateByTag, getCommitDateRange
} from './utils.js';
import { getFilteredCommits } from './filters.js';
import { renderActivityTimeline, renderCodeChangesTimeline, renderHeatmap, aggregateByWeekPeriod, aggregateByDayPeriod } from './charts.js';
import { openDetailPane } from './ui.js';

// === Timeline Tab ===

function renderTimeline() {
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

    // Add click handlers for activity cards (only once)
    if (!state.activityCardHandlersInitialized) {
        state.activityCardHandlersInitialized = true;
        document.querySelectorAll('[data-activity-card]').forEach(el => {
            el.addEventListener('click', () => {
                const cardType = el.dataset.activityCard;
                const currentCommits = getFilteredCommits();
                if (cardType === 'total') {
                    openDetailPane('All Commits', `${currentCommits.length} commits`, currentCommits, { type: 'all', value: '' });
                } else if (cardType === 'contributors') {
                    // Show contributor list
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
            });
        });
    }

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

        // Add click handlers for period cards
        setTimeout(() => {
            document.querySelectorAll('[data-period-key]').forEach(el => {
                el.addEventListener('click', () => {
                    const key = el.dataset.periodKey;
                    const period = periodData.find(p => p.key === key);
                    if (period) {
                        openDetailPane(period.label, `${period.count} commits`, period.commits);
                    }
                });
            });
        }, 0);
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

    // Attach load-more handler
    document.getElementById('load-more-commits')?.addEventListener('click', () => {
        state._commitListVisible += 100;
        renderTimeline();
    });
}

// === Progress Tab ===

function renderProgress() {
    const commits = getFilteredCommits();

    // === Work Summary Cards ===
    // Count tags across all commits
    let featureCount = 0, bugfixCount = 0, refactorCount = 0;
    let complexitySum = 0, complexityCount = 0;

    commits.forEach(commit => {
        const tags = getCommitTags(commit);
        if (tags.includes('feature')) featureCount++;
        if (tags.includes('bugfix') || tags.includes('fix')) bugfixCount++;
        if (tags.includes('refactor')) refactorCount++;
        if (commit.complexity != null) {
            complexitySum += commit.complexity;
            complexityCount++;
        }
    });

    document.getElementById('work-features').textContent = featureCount;
    document.getElementById('work-bugfixes').textContent = bugfixCount;
    document.getElementById('work-refactors').textContent = refactorCount;
    document.getElementById('work-avg-complexity').textContent =
        complexityCount > 0 ? (complexitySum / complexityCount).toFixed(1) : '-';

    // Add click handlers for work cards (only once)
    if (!state.workCardHandlersInitialized) {
        state.workCardHandlersInitialized = true;
        document.querySelectorAll('[data-work-card]').forEach(el => {
            el.addEventListener('click', () => {
                const cardType = el.dataset.workCard;
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
            });
        });
    }

    // Get months from filtered commits
    const monthSet = new Set(commits.map(c => c.timestamp?.substring(0, 7)).filter(Boolean));
    const months = [...monthSet].sort();

    // Feature vs Bug Fix Trend
    const monthlyTagCounts = {};
    const monthlyComplexity = {};
    commits.forEach(commit => {
        const month = commit.timestamp?.substring(0, 7);
        if (!month) return;
        if (!monthlyTagCounts[month]) monthlyTagCounts[month] = { feature: 0, bugfix: 0 };
        if (!monthlyComplexity[month]) monthlyComplexity[month] = { total: 0, count: 0 };
        const tags = getCommitTags(commit);
        if (tags.includes('feature')) monthlyTagCounts[month].feature++;
        if (tags.includes('bugfix') || tags.includes('fix')) monthlyTagCounts[month].bugfix++;
        if (commit.complexity != null) {
            monthlyComplexity[month].total += commit.complexity;
            monthlyComplexity[month].count++;
        }
    });
    const featData = months.map(m => monthlyTagCounts[m]?.feature || 0);
    const fixData = months.map(m => monthlyTagCounts[m]?.bugfix || 0);

    if (state.charts.featFix) state.charts.featFix.destroy();
    state.charts.featFix = new Chart(document.getElementById('feat-fix-chart'), {
        type: 'line',
        data: {
            labels: months,
            datasets: [
                {
                    label: 'Features',
                    data: featData,
                    borderColor: '#16A34A',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    fill: true,
                    tension: 0.3
                },
                {
                    label: 'Bug Fixes',
                    data: fixData,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.3
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false
        }
    });

    // Complexity Over Time
    const complexityData = months.map(m => {
        const mc = monthlyComplexity[m];
        return mc && mc.count > 0 ? (mc.total / mc.count) : null;
    });

    if (state.charts.complexityTrend) state.charts.complexityTrend.destroy();
    state.charts.complexityTrend = new Chart(document.getElementById('complexity-trend-chart'), {
        type: 'line',
        data: {
            labels: months,
            datasets: [{
                label: 'Avg Complexity',
                data: complexityData,
                borderColor: '#8b5cf6',
                backgroundColor: 'rgba(139, 92, 246, 0.1)',
                fill: true,
                tension: 0.3,
                spanGaps: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: {
                    min: 1,
                    max: 5,
                    ticks: { stepSize: 1 }
                }
            }
        }
    });
}

// === Contributors Tab ===
function renderContributors() {
    const commits = getFilteredCommits();
    const config = getViewConfig();

    // Use aggregation layer for view-level-appropriate grouping
    const aggregated = aggregateContributors(commits);

    // Who Does What - work type breakdown (cards)
    // Different granularity based on view level:
    // - executive: single "All Contributors" card
    // - management: one card per repo
    // - developer: one card per person (current behavior)
    const workTypesHtml = aggregated.slice(0, 8).map(item => {
        const totalTags = Object.values(item.breakdown).reduce((s, v) => s + v, 0);
        const tagBars = Object.entries(item.breakdown)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([tag, count]) => {
                const pct = totalTags > 0 ? Math.round((count / totalTags) * 100) : 0;
                return `<div class="flex items-center gap-2">
                    <span class="tag ${getTagClass(tag)}" style="${getTagStyle(tag)}">${tag}</span>
                    <div class="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div class="h-2 rounded-full" style="width: ${pct}%; background-color: ${getTagColor(tag)}"></div>
                    </div>
                    <span class="text-xs text-themed-tertiary w-8">${pct}%</span>
                </div>`;
            }).join('');
        return `
            <div class="p-3 bg-themed-tertiary rounded-lg cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors" data-drilldown-label="${escapeHtml(item.label)}">
                <p class="font-medium text-themed-primary mb-1">${escapeHtml(item.displayName)}</p>
                <p class="text-xs text-themed-tertiary mb-2">${item.count} commits</p>
                <div class="space-y-1">${tagBars}</div>
            </div>
        `;
    }).join('');
    document.getElementById('contributor-work-types').innerHTML = workTypesHtml || '<p class="text-themed-tertiary">No contributor data</p>';
    // Click handlers are delegated via setupDelegatedHandlers()

    // Complexity chart - same shape, different labels based on view level
    const top8 = aggregated.slice(0, 8);
    const chartLabels = top8.map(item => {
        // Truncate long labels for chart
        const name = item.displayName;
        return name.length > 20 ? name.substring(0, 17) + '...' : name;
    });
    const avgComplexities = top8.map(item => {
        if (!item.complexities || item.complexities.length === 0) return 0;
        return item.complexities.reduce((a, b) => a + b, 0) / item.complexities.length;
    });

    if (state.charts.contributorComplexity) state.charts.contributorComplexity.destroy();
    state.charts.contributorComplexity = new Chart(document.getElementById('contributor-complexity-chart'), {
        type: 'bar',
        data: {
            labels: chartLabels,
            datasets: [{
                label: 'Avg Complexity',
                data: avgComplexities,
                backgroundColor: avgComplexities.map(c => c >= 3.5 ? '#8b5cf6' : c >= 2.5 ? '#2D68FF' : '#94a3b8')
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: { legend: { display: false } },
            scales: {
                x: { min: 0, max: 5, ticks: { stepSize: 1 } }
            }
        }
    });
}

// === Security Tab ===
function renderSecurity() {
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

            // Add click handlers after rendering
            setTimeout(() => {
                document.querySelectorAll('[data-security-repo]').forEach(el => {
                    el.addEventListener('click', () => {
                        const repo = el.dataset.securityRepo;
                        const filtered = securityCommits.filter(c => (c.repo_id || 'default') === repo);
                        openDetailPane(`${repo} Security`, `${filtered.length} commits`, filtered);
                    });
                });
            }, 0);
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

// === Health Tab (Urgency & Impact) ===

function renderHealth() {
    const commits = getFilteredCommits();
    const total = commits.length;

    // Security count
    const securityCount = commits.filter(c =>
        c.type === 'security' || (c.tags || []).includes('security')
    ).length;
    document.getElementById('health-security-count').textContent = securityCount;

    // Reactive percentage (urgency 4-5)
    const reactiveCount = commits.filter(c => c.urgency >= 4).length;
    const reactivePct = total > 0 ? Math.round((reactiveCount / total) * 100) : 0;
    document.getElementById('health-reactive-pct').textContent = `${reactivePct}%`;

    // Weekend percentage
    const weekendCount = commits.filter(c => {
        if (!c.timestamp) return false;
        const date = new Date(c.timestamp);
        const day = date.getDay();
        return day === 0 || day === 6;
    }).length;
    const weekendPct = total > 0 ? Math.round((weekendCount / total) * 100) : 0;
    document.getElementById('health-weekend-pct').textContent = `${weekendPct}%`;

    // After hours percentage
    const afterHoursCount = commits.filter(c => {
        if (!c.timestamp) return false;
        const date = new Date(c.timestamp);
        const hour = date.getHours();
        return hour < state.workHourStart || hour >= state.workHourEnd;
    }).length;
    const afterHoursPct = total > 0 ? Math.round((afterHoursCount / total) * 100) : 0;
    document.getElementById('health-afterhours-pct').textContent = `${afterHoursPct}%`;

    // Urgency breakdown
    const urgencyBreakdown = { planned: 0, normal: 0, reactive: 0 };
    commits.forEach(c => {
        if (c.urgency <= 2) urgencyBreakdown.planned++;
        else if (c.urgency === 3) urgencyBreakdown.normal++;
        else if (c.urgency >= 4) urgencyBreakdown.reactive++;
    });

    const urgencyHtml = [
        { label: 'Planned (1-2)', count: urgencyBreakdown.planned, color: 'bg-green-500', filter: 'planned' },
        { label: 'Normal (3)', count: urgencyBreakdown.normal, color: 'bg-blue-500', filter: 'normal' },
        { label: 'Reactive (4-5)', count: urgencyBreakdown.reactive, color: 'bg-amber-500', filter: 'reactive' }
    ].map(({ label, count, color, filter }) => {
        const pct = total > 0 ? Math.round((count / total) * 100) : 0;
        return `
            <div class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors" data-urgency-filter="${filter}">
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-themed-secondary">${label}</span>
                    <span class="text-themed-primary font-medium">${count} (${pct}%)</span>
                </div>
                <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                    <div class="${color} h-2 rounded-full" style="width: ${pct}%"></div>
                </div>
            </div>
        `;
    }).join('');
    document.getElementById('urgency-breakdown').innerHTML = urgencyHtml;
    // Click handlers are delegated via setupDelegatedHandlers()

    // Impact breakdown
    const impactBreakdown = { 'user-facing': 0, 'internal': 0, 'infrastructure': 0, 'api': 0 };
    commits.forEach(c => {
        if (c.impact && impactBreakdown.hasOwnProperty(c.impact)) {
            impactBreakdown[c.impact]++;
        }
    });

    const impactLabels = {
        'user-facing': { label: 'User-Facing', color: 'bg-blue-500' },
        'internal': { label: 'Internal', color: 'bg-gray-500' },
        'infrastructure': { label: 'Infrastructure', color: 'bg-purple-500' },
        'api': { label: 'API', color: 'bg-green-500' }
    };

    const impactHtml = Object.entries(impactBreakdown)
        .sort((a, b) => b[1] - a[1])
        .map(([key, count]) => {
            const { label, color } = impactLabels[key] || { label: key, color: 'bg-gray-400' };
            const pct = total > 0 ? Math.round((count / total) * 100) : 0;
            return `
                <div class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors" data-impact-filter="${key}">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-themed-secondary">${label}</span>
                        <span class="text-themed-primary font-medium">${count} (${pct}%)</span>
                    </div>
                    <div class="w-full bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                        <div class="${color} h-2 rounded-full" style="width: ${pct}%"></div>
                    </div>
                </div>
            `;
        }).join('');
    document.getElementById('impact-breakdown').innerHTML = impactHtml;
    // Click handlers are delegated via setupDelegatedHandlers()

    // Urgency Trend Chart (line chart by month)
    const monthlyUrgency = {};
    commits.forEach(c => {
        if (!c.timestamp || !c.urgency) return;
        const month = c.timestamp.substring(0, 7);
        if (!monthlyUrgency[month]) {
            monthlyUrgency[month] = { sum: 0, count: 0 };
        }
        monthlyUrgency[month].sum += c.urgency;
        monthlyUrgency[month].count++;
    });

    const sortedMonths = Object.keys(monthlyUrgency).sort();
    const urgencyData = sortedMonths.map(m =>
        Math.round((monthlyUrgency[m].sum / monthlyUrgency[m].count) * 100) / 100
    );

    if (state.charts.urgencyTrend) state.charts.urgencyTrend.destroy();
    state.charts.urgencyTrend = new Chart(document.getElementById('urgency-trend-chart'), {
        type: 'line',
        data: {
            labels: sortedMonths.map(m => {
                const [year, month] = m.split('-');
                return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }),
            datasets: [{
                label: 'Avg Urgency',
                data: urgencyData,
                borderColor: '#EAB308',
                backgroundColor: 'rgba(245, 158, 11, 0.1)',
                fill: true,
                tension: 0.3
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { min: 1, max: 5, ticks: { stepSize: 1 } }
            }
        }
    });

    // Impact Over Time Chart (stacked bar)
    const monthlyImpact = {};
    commits.forEach(c => {
        if (!c.timestamp || !c.impact) return;
        const month = c.timestamp.substring(0, 7);
        if (!monthlyImpact[month]) {
            monthlyImpact[month] = { 'user-facing': 0, 'internal': 0, 'infrastructure': 0, 'api': 0 };
        }
        if (monthlyImpact[month].hasOwnProperty(c.impact)) {
            monthlyImpact[month][c.impact]++;
        }
    });

    const impactColors = {
        'user-facing': '#2D68FF',
        'internal': '#767676',
        'infrastructure': '#a78bfa',
        'api': '#16A34A'
    };

    if (state.charts.impactTrend) state.charts.impactTrend.destroy();
    state.charts.impactTrend = new Chart(document.getElementById('impact-trend-chart'), {
        type: 'bar',
        data: {
            labels: sortedMonths.map(m => {
                const [year, month] = m.split('-');
                return new Date(year, month - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
            }),
            datasets: ['user-facing', 'internal', 'infrastructure', 'api'].map(impact => ({
                label: impact,
                data: sortedMonths.map(m => monthlyImpact[m]?.[impact] || 0),
                backgroundColor: impactColors[impact]
            }))
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom', labels: { boxWidth: 12, font: { size: 10 } } } },
            scales: { x: { stacked: true }, y: { stacked: true } }
        }
    });

    // Urgency by Contributor (or aggregated based on view level)
    const config = getViewConfig();

    if (config.contributors === 'total') {
        // Executive view: show single aggregated bar
        const plannedPct = total > 0 ? Math.round((urgencyBreakdown.planned / total) * 100) : 0;
        const normalPct = total > 0 ? Math.round((urgencyBreakdown.normal / total) * 100) : 0;
        const reactivePctByContrib = total > 0 ? Math.round((urgencyBreakdown.reactive / total) * 100) : 0;

        const urgencyByContributorHtml = `
            <div class="p-2">
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-themed-secondary font-medium">All Contributors</span>
                    <span class="text-themed-tertiary">${total} commits</span>
                </div>
                <div class="w-full h-3 bg-gray-200 dark:bg-gray-600 rounded-full flex overflow-hidden">
                    <div class="bg-green-500 h-full" style="width: ${plannedPct}%" title="Planned: ${urgencyBreakdown.planned}"></div>
                    <div class="bg-blue-500 h-full" style="width: ${normalPct}%" title="Normal: ${urgencyBreakdown.normal}"></div>
                    <div class="bg-amber-500 h-full" style="width: ${reactivePctByContrib}%" title="Reactive: ${urgencyBreakdown.reactive}"></div>
                </div>
                <div class="flex justify-between text-xs text-themed-tertiary mt-1">
                    <span>Planned ${plannedPct}%</span>
                    <span>Normal ${normalPct}%</span>
                    <span>Reactive ${reactivePctByContrib}%</span>
                </div>
            </div>
        `;
        document.getElementById('urgency-by-contributor').innerHTML = urgencyByContributorHtml;
    } else if (config.contributors === 'repo') {
        // Management view: show by repo
        const repoUrgency = {};
        commits.forEach(c => {
            const repo = c.repo_id || 'default';
            if (!repoUrgency[repo]) {
                repoUrgency[repo] = { planned: 0, normal: 0, reactive: 0, total: 0 };
            }
            repoUrgency[repo].total++;
            if (c.urgency <= 2) repoUrgency[repo].planned++;
            else if (c.urgency === 3) repoUrgency[repo].normal++;
            else if (c.urgency >= 4) repoUrgency[repo].reactive++;
        });

        const sortedRepos = Object.entries(repoUrgency)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 6);

        const urgencyByContributorHtml = sortedRepos.map(([repo, data]) => {
            const plannedPct = Math.round((data.planned / data.total) * 100);
            const normalPct = Math.round((data.normal / data.total) * 100);
            const reactivePct = Math.round((data.reactive / data.total) * 100);
            return `
                <div class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors" data-repo-urgency="${escapeHtml(repo)}">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-themed-secondary font-medium">${escapeHtml(repo)}</span>
                        <span class="text-themed-tertiary">${data.total} commits</span>
                    </div>
                    <div class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full flex overflow-hidden">
                        <div class="bg-green-500 h-full" style="width: ${plannedPct}%"></div>
                        <div class="bg-blue-500 h-full" style="width: ${normalPct}%"></div>
                        <div class="bg-amber-500 h-full" style="width: ${reactivePct}%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-themed-tertiary mt-0.5">
                        <span>Planned ${plannedPct}%</span>
                        <span>Normal ${normalPct}%</span>
                        <span>Reactive ${reactivePct}%</span>
                    </div>
                </div>
            `;
        }).join('');
        document.getElementById('urgency-by-contributor').innerHTML = urgencyByContributorHtml || '<p class="text-themed-tertiary text-sm">No data</p>';
    } else {
        // Developer view: show by individual contributor (original behavior)
        const contributorUrgency = {};
        commits.forEach(c => {
            const email = getAuthorEmail(c);
            const name = getAuthorName(c);
            if (!contributorUrgency[email]) {
                contributorUrgency[email] = { name, email, planned: 0, normal: 0, reactive: 0, total: 0 };
            }
            contributorUrgency[email].total++;
            if (c.urgency <= 2) contributorUrgency[email].planned++;
            else if (c.urgency === 3) contributorUrgency[email].normal++;
            else if (c.urgency >= 4) contributorUrgency[email].reactive++;
        });

        const sortedContributors = Object.values(contributorUrgency)
            .sort((a, b) => b.total - a.total)
            .slice(0, 6);

        const urgencyByContributorHtml = sortedContributors.map(c => {
            const plannedPct = Math.round((c.planned / c.total) * 100);
            const normalPct = Math.round((c.normal / c.total) * 100);
            const reactivePct = Math.round((c.reactive / c.total) * 100);
            return `
                <div class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors" data-contributor-urgency="${escapeHtml(c.email)}">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-themed-secondary font-medium">${escapeHtml(sanitizeName(c.name, c.email))}</span>
                        <span class="text-themed-tertiary">${c.total} commits</span>
                    </div>
                    <div class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full flex overflow-hidden">
                        <div class="bg-green-500 h-full" style="width: ${plannedPct}%"></div>
                        <div class="bg-blue-500 h-full" style="width: ${normalPct}%"></div>
                        <div class="bg-amber-500 h-full" style="width: ${reactivePct}%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-themed-tertiary mt-0.5">
                        <span>Planned ${plannedPct}%</span>
                        <span>Normal ${normalPct}%</span>
                        <span>Reactive ${reactivePct}%</span>
                    </div>
                </div>
            `;
        }).join('');
        document.getElementById('urgency-by-contributor').innerHTML = urgencyByContributorHtml || '<p class="text-themed-tertiary text-sm">No data</p>';
    }

    // Impact by Contributor (or aggregated based on view level)
    if (config.contributors === 'total') {
        // Executive view: show single aggregated bar
        const userPct = total > 0 ? Math.round((impactBreakdown['user-facing'] / total) * 100) : 0;
        const internalPct = total > 0 ? Math.round((impactBreakdown['internal'] / total) * 100) : 0;
        const infraPct = total > 0 ? Math.round((impactBreakdown['infrastructure'] / total) * 100) : 0;
        const apiPct = total > 0 ? Math.round((impactBreakdown['api'] / total) * 100) : 0;

        const impactByContributorHtml = `
            <div class="p-2">
                <div class="flex justify-between text-sm mb-1">
                    <span class="text-themed-secondary font-medium">All Contributors</span>
                    <span class="text-themed-tertiary">${total} commits</span>
                </div>
                <div class="w-full h-3 bg-gray-200 dark:bg-gray-600 rounded-full flex overflow-hidden">
                    <div class="bg-blue-500 h-full" style="width: ${userPct}%" title="User-facing: ${impactBreakdown['user-facing']}"></div>
                    <div class="bg-gray-500 h-full" style="width: ${internalPct}%" title="Internal: ${impactBreakdown['internal']}"></div>
                    <div class="bg-purple-500 h-full" style="width: ${infraPct}%" title="Infrastructure: ${impactBreakdown['infrastructure']}"></div>
                    <div class="bg-green-500 h-full" style="width: ${apiPct}%" title="API: ${impactBreakdown['api']}"></div>
                </div>
                <div class="flex justify-between text-xs text-themed-tertiary mt-1">
                    <span>User ${userPct}%</span>
                    <span>Internal ${internalPct}%</span>
                    <span>Infra ${infraPct}%</span>
                    <span>API ${apiPct}%</span>
                </div>
            </div>
        `;
        document.getElementById('impact-by-contributor').innerHTML = impactByContributorHtml;
    } else if (config.contributors === 'repo') {
        // Management view: show by repo
        const repoImpact = {};
        commits.forEach(c => {
            const repo = c.repo_id || 'default';
            if (!repoImpact[repo]) {
                repoImpact[repo] = { 'user-facing': 0, 'internal': 0, 'infrastructure': 0, 'api': 0, total: 0 };
            }
            repoImpact[repo].total++;
            if (c.impact && repoImpact[repo].hasOwnProperty(c.impact)) {
                repoImpact[repo][c.impact]++;
            }
        });

        const sortedReposImpact = Object.entries(repoImpact)
            .sort((a, b) => b[1].total - a[1].total)
            .slice(0, 6);

        const impactByContributorHtml = sortedReposImpact.map(([repo, data]) => {
            const userPct = Math.round((data['user-facing'] / data.total) * 100);
            const internalPct = Math.round((data['internal'] / data.total) * 100);
            const infraPct = Math.round((data['infrastructure'] / data.total) * 100);
            const apiPct = Math.round((data['api'] / data.total) * 100);
            return `
                <div class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors" data-repo-impact="${escapeHtml(repo)}">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-themed-secondary font-medium">${escapeHtml(repo)}</span>
                        <span class="text-themed-tertiary">${data.total} commits</span>
                    </div>
                    <div class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full flex overflow-hidden">
                        <div class="bg-blue-500 h-full" style="width: ${userPct}%"></div>
                        <div class="bg-gray-500 h-full" style="width: ${internalPct}%"></div>
                        <div class="bg-purple-500 h-full" style="width: ${infraPct}%"></div>
                        <div class="bg-green-500 h-full" style="width: ${apiPct}%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-themed-tertiary mt-0.5">
                        <span>User ${userPct}%</span>
                        <span>Internal ${internalPct}%</span>
                        <span>Infra ${infraPct}%</span>
                        <span>API ${apiPct}%</span>
                    </div>
                </div>
            `;
        }).join('');
        document.getElementById('impact-by-contributor').innerHTML = impactByContributorHtml || '<p class="text-themed-tertiary text-sm">No data</p>';
    } else {
        // Developer view: show by individual contributor (original behavior)
        const contributorImpact = {};
        commits.forEach(c => {
            const email = getAuthorEmail(c);
            const name = getAuthorName(c);
            if (!contributorImpact[email]) {
                contributorImpact[email] = { name, email, 'user-facing': 0, 'internal': 0, 'infrastructure': 0, 'api': 0, total: 0 };
            }
            contributorImpact[email].total++;
            if (c.impact && contributorImpact[email].hasOwnProperty(c.impact)) {
                contributorImpact[email][c.impact]++;
            }
        });

        const sortedContributorsImpact = Object.values(contributorImpact)
            .sort((a, b) => b.total - a.total)
            .slice(0, 6);

        const impactByContributorHtml = sortedContributorsImpact.map(c => {
            const userPct = Math.round((c['user-facing'] / c.total) * 100);
            const internalPct = Math.round((c['internal'] / c.total) * 100);
            const infraPct = Math.round((c['infrastructure'] / c.total) * 100);
            const apiPct = Math.round((c['api'] / c.total) * 100);
            return `
                <div class="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors" data-contributor-impact="${escapeHtml(c.email)}">
                    <div class="flex justify-between text-sm mb-1">
                        <span class="text-themed-secondary font-medium">${escapeHtml(sanitizeName(c.name, c.email))}</span>
                        <span class="text-themed-tertiary">${c.total} commits</span>
                    </div>
                    <div class="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-full flex overflow-hidden">
                        <div class="bg-blue-500 h-full" style="width: ${userPct}%"></div>
                        <div class="bg-gray-500 h-full" style="width: ${internalPct}%"></div>
                        <div class="bg-purple-500 h-full" style="width: ${infraPct}%"></div>
                        <div class="bg-green-500 h-full" style="width: ${apiPct}%"></div>
                    </div>
                    <div class="flex justify-between text-xs text-themed-tertiary mt-0.5">
                        <span>User ${userPct}%</span>
                        <span>Internal ${internalPct}%</span>
                        <span>Infra ${infraPct}%</span>
                        <span>API ${apiPct}%</span>
                    </div>
                </div>
            `;
        }).join('');
        document.getElementById('impact-by-contributor').innerHTML = impactByContributorHtml || '<p class="text-themed-tertiary text-sm">No data</p>';
    }

    // Add click handlers for health cards (only once, using dynamic data)
    if (!state.healthCardHandlersInitialized) {
        state.healthCardHandlersInitialized = true;
        document.querySelectorAll('[data-health-card]').forEach(el => {
            el.addEventListener('click', () => {
                const cardType = el.dataset.healthCard;
                // Get filtered commits dynamically (respects current filters)
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
                        const date = new Date(c.timestamp);
                        const day = date.getDay();
                        return day === 0 || day === 6;
                    });
                    title = 'Weekend Commits';
                } else if (cardType === 'afterhours') {
                    filteredCommits = currentCommits.filter(c => {
                        if (!c.timestamp) return false;
                        const date = new Date(c.timestamp);
                        const hour = date.getHours();
                        return hour < state.workHourStart || hour >= state.workHourEnd;
                    });
                    title = 'After Hours Commits';
                }

                if (filteredCommits) {
                    openDetailPane(title, `${filteredCommits.length} commits`, filteredCommits);
                }
            });
        });
    }
}

// === Tags Tab ===
function renderTags() {
    const commits = getFilteredCommits();
    // Build tag breakdown from commits (counting each tag occurrence)
    const tagBreakdown = {};
    commits.forEach(commit => {
        const tags = getCommitTags(commit);
        tags.forEach(tag => {
            tagBreakdown[tag] = (tagBreakdown[tag] || 0) + 1;
        });
    });

    // Sort tags by count (descending) for consistent display
    const sortedTags = Object.entries(tagBreakdown)
        .map(([tag, count]) => ({ tag, count }))
        .sort((a, b) => b.count - a.count);

    const tags = sortedTags.map(t => t.tag);
    const counts = sortedTags.map(t => t.count);
    const colors = tags.map(t => getTagColor(t));
    const total = counts.reduce((a, b) => a + b, 0);

    // Tags Pie Chart
    if (state.charts.tags) state.charts.tags.destroy();
    state.charts.tags = new Chart(document.getElementById('tags-chart'), {
        type: 'doughnut',
        data: {
            labels: tags,
            datasets: [{
                data: counts,
                backgroundColor: colors
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 8,
                        font: { size: 11 },
                        generateLabels: function(chart) {
                            const data = chart.data;
                            return data.labels.map((label, i) => ({
                                text: `${label} (${data.datasets[0].data[i]})`,
                                fillStyle: data.datasets[0].backgroundColor[i],
                                fontColor: Chart.defaults.color,
                                hidden: false,
                                index: i
                            }));
                        }
                    }
                }
            }
        }
    });

    const breakdownHtml = sortedTags.map(({ tag, count }) => `
        <div class="flex items-center gap-3 cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700 rounded p-2 -m-2 transition-colors" data-tag-filter="${tag}">
            <span class="tag ${getTagClass(tag)}" style="${getTagStyle(tag)}">${tag}</span>
            <div class="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                <div class="h-2 rounded-full" style="width: ${(count / total * 100).toFixed(1)}%; background-color: ${getTagColor(tag)}"></div>
            </div>
            <span class="text-sm text-themed-secondary">${count} (${(count / total * 100).toFixed(1)}%)</span>
        </div>
    `).join('');
    document.getElementById('tag-breakdown').innerHTML = breakdownHtml;

    // Click handlers are delegated via setupDelegatedHandlers()
}

// === Timing Tab ===
function renderTiming() {
    const commits = getFilteredCommits();
    const config = getViewConfig();

    // Render the heatmap (handles its own granularity)
    renderHeatmap();

    // Aggregate commits by hour (0-23)
    const byHour = new Array(24).fill(0);
    // Aggregate commits by day of week (0=Sun, 6=Sat)
    const byDay = new Array(7).fill(0);

    commits.forEach(commit => {
        const { hour, dayOfWeek } = getCommitDateTime(commit);
        byHour[hour]++;
        byDay[dayOfWeek]++;
    });

    // Hour chart - only show for developer view (hourly granularity)
    const hourChartContainer = document.getElementById('hour-chart')?.parentElement?.parentElement;
    if (hourChartContainer) {
        if (config.timing === 'hour') {
            hourChartContainer.style.display = '';
        } else {
            hourChartContainer.style.display = 'none';
        }
    }

    // Hour Chart
    const hourLabels = Array.from({ length: 24 }, (_, i) =>
        i.toString().padStart(2, '0') + ':00'
    );

    if (state.charts.hour) state.charts.hour.destroy();
    state.charts.hour = new Chart(document.getElementById('hour-chart'), {
        type: 'bar',
        data: {
            labels: hourLabels,
            datasets: [{
                label: 'Commits',
                data: byHour,
                backgroundColor: byHour.map((_, i) =>
                    (i >= state.workHourStart && i < state.workHourEnd) ? '#2D68FF' : '#94a3b8'
                ),
                borderRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: (ctx) => {
                            const hour = ctx.dataIndex;
                            if (hour >= state.workHourStart && hour < state.workHourEnd) return 'Work hours';
                            return 'After hours';
                        }
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxRotation: 45,
                        callback: function(value, index) {
                            // Show every 3rd label to reduce clutter
                            return index % 3 === 0 ? this.getLabelForValue(value) : '';
                        }
                    }
                },
                y: { beginAtZero: true }
            }
        }
    });

    // Day of Week Chart - reorder to start with Monday
    const mondayFirstOrder = [1, 2, 3, 4, 5, 6, 0]; // Mon-Sun
    const dayLabels = mondayFirstOrder.map(i => DAY_NAMES_SHORT[i]);
    const dayData = mondayFirstOrder.map(i => byDay[i]);

    if (state.charts.day) state.charts.day.destroy();
    state.charts.day = new Chart(document.getElementById('day-chart'), {
        type: 'bar',
        data: {
            labels: dayLabels,
            datasets: [{
                label: 'Commits',
                data: dayData,
                backgroundColor: dayData.map((_, i) =>
                    (i < 5) ? '#2D68FF' : '#94a3b8'  // Mon-Fri blue, Sat-Sun gray
                ),
                borderRadius: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        afterLabel: (ctx) => {
                            return ctx.dataIndex < 5 ? 'Weekday' : 'Weekend';
                        }
                    }
                }
            },
            scales: {
                y: { beginAtZero: true }
            }
        }
    });

    // Render developer activity patterns - only for developer view
    const devPatternsContainer = document.querySelector('[data-section="developer-patterns"]');
    if (devPatternsContainer) {
        if (config.timing === 'hour') {
            devPatternsContainer.style.display = '';
            renderDeveloperPatterns();
        } else {
            devPatternsContainer.style.display = 'none';
        }
    }
}

// === Developer Patterns (sub-section of Timing) ===
function renderDeveloperPatterns() {
    const commits = getFilteredCommits();

    // Get per-author timing data
    const authorPatterns = {};

    commits.forEach(commit => {
        const email = getAuthorEmail(commit);
        const name = getAuthorName(commit);
        const { hour, dayOfWeek } = getCommitDateTime(commit);

        if (!authorPatterns[email]) {
            authorPatterns[email] = {
                name,
                email,
                commitCount: 0,
                byHour: new Array(24).fill(0),
                byDay: new Array(7).fill(0),
                afterHours: 0,
                weekend: 0
            };
        }

        authorPatterns[email].commitCount++;
        authorPatterns[email].byHour[hour]++;
        authorPatterns[email].byDay[dayOfWeek]++;

        if (hour < state.workHourStart || hour >= state.workHourEnd) {
            authorPatterns[email].afterHours++;
        }
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            authorPatterns[email].weekend++;
        }
    });

    // Sort by commit count
    const sorted = Object.values(authorPatterns).sort((a, b) => b.commitCount - a.commitCount);

    // Render top contributors
    const html = sorted.slice(0, 6).map(author => {
        // Find peak hour
        const peakHour = author.byHour.indexOf(Math.max(...author.byHour));
        // Find peak day
        const mondayFirstOrder = [1, 2, 3, 4, 5, 6, 0];
        const dayLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const peakDayIdx = author.byDay.indexOf(Math.max(...author.byDay));
        const peakDayLabel = DAY_NAMES_SHORT[peakDayIdx];

        // After hours percentage
        const afterHoursPct = Math.round((author.afterHours / author.commitCount) * 100);
        const weekendPct = Math.round((author.weekend / author.commitCount) * 100);

        // Mini sparkline for hours (simplified - just show work vs after hours)
        const workHoursCommits = author.byHour.slice(state.workHourStart, state.workHourEnd).reduce((a, b) => a + b, 0);
        const workHoursPct = Math.round((workHoursCommits / author.commitCount) * 100);

        return `
            <div class="p-3 bg-themed-tertiary rounded-lg">
                <div class="flex items-center justify-between mb-2">
                    <span class="font-medium text-themed-primary">${escapeHtml(author.name)}</span>
                    <span class="text-xs text-themed-tertiary">${author.commitCount} commits</span>
                </div>
                <div class="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                    <div class="p-2 bg-themed-secondary rounded">
                        <span class="text-themed-tertiary">Peak Hour</span>
                        <p class="font-semibold text-themed-primary">${peakHour.toString().padStart(2, '0')}:00</p>
                    </div>
                    <div class="p-2 bg-themed-secondary rounded">
                        <span class="text-themed-tertiary">Peak Day</span>
                        <p class="font-semibold text-themed-primary">${peakDayLabel}</p>
                    </div>
                    <div class="p-2 bg-themed-secondary rounded">
                        <span class="text-themed-tertiary">Work Hours</span>
                        <p class="font-semibold ${workHoursPct >= 70 ? 'text-green-600' : workHoursPct >= 50 ? 'text-amber-600' : 'text-red-600'}">${workHoursPct}%</p>
                    </div>
                    <div class="p-2 bg-themed-secondary rounded">
                        <span class="text-themed-tertiary">Weekends</span>
                        <p class="font-semibold ${weekendPct <= 10 ? 'text-green-600' : weekendPct <= 25 ? 'text-amber-600' : 'text-red-600'}">${weekendPct}%</p>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    document.getElementById('developer-patterns').innerHTML = html || '<p class="text-themed-tertiary">No contributor data</p>';
}

// === Executive Summary Tab ===

function renderSummary() {
    const commits = getFilteredCommits();

    // Count metrics
    const countTag = (commits, tag) => commits.filter(c =>
        getCommitTags(c).includes(tag)
    ).length;

    const features = countTag(commits, 'feature');
    const fixes = commits.filter(c => {
        const tags = getCommitTags(c);
        return tags.includes('bugfix') || tags.includes('fix');
    }).length;

    // Urgency metrics
    const getAvgUrgency = (commits) => {
        const urgencies = commits.map(c => c.urgency).filter(u => u != null && u >= 1 && u <= 5);
        return urgencies.length > 0
            ? (urgencies.reduce((a, b) => a + b, 0) / urgencies.length)
            : 0;
    };
    const avgUrgency = getAvgUrgency(commits);

    // Planned percentage (urgency 1-2)
    const getPlannedPct = (commits) => {
        const withUrgency = commits.filter(c => c.urgency != null && c.urgency >= 1 && c.urgency <= 5);
        if (withUrgency.length === 0) return 0;
        const planned = withUrgency.filter(c => c.urgency <= 2).length;
        return Math.round((planned / withUrgency.length) * 100);
    };
    const plannedPct = getPlannedPct(commits);

    // Update stats
    document.getElementById('summary-features').textContent = features;
    document.getElementById('summary-fixes').textContent = fixes;
    document.getElementById('summary-urgency').textContent = avgUrgency > 0 ? avgUrgency.toFixed(1) : '-';
    document.getElementById('summary-planned').textContent = plannedPct > 0 ? `${plannedPct}%` : '-';

    // Key highlights - focus on meaningful insights
    const highlights = [];

    // Complexity breakdown
    const complexChanges = commits.filter(c => c.complexity >= 4).length;
    const simpleChanges = commits.filter(c => c.complexity != null && c.complexity <= 2).length;
    if (complexChanges > 0 || simpleChanges > 0) {
        highlights.push({
            label: 'Complex Changes',
            value: `${complexChanges} high complexity`,
            subvalue: `${simpleChanges} simple`
        });
    }

    // Most active repo (if aggregated)
    const repoCounts = {};
    commits.forEach(c => {
        if (c.repo_id) {
            repoCounts[c.repo_id] = (repoCounts[c.repo_id] || 0) + 1;
        }
    });
    const repos = Object.keys(repoCounts);
    if (repos.length > 1) {
        const topRepo = Object.entries(repoCounts).sort((a, b) => b[1] - a[1])[0];
        const topPct = Math.round((topRepo[1] / commits.length) * 100);
        highlights.push({
            label: 'Most Active Repo',
            value: topRepo[0],
            subvalue: `${topPct}% of work`
        });
    }

    // Work pattern summary
    const afterHoursCount = commits.filter(c => getWorkPattern(c).isAfterHours).length;
    const weekendCount = commits.filter(c => getWorkPattern(c).isWeekend).length;
    const afterHoursPct = commits.length > 0
        ? Math.round((afterHoursCount / commits.length) * 100)
        : 0;
    if (afterHoursPct > 0 || weekendCount > 0) {
        highlights.push({
            label: 'Off-Hours Work',
            value: `${afterHoursPct}% after hours`,
            subvalue: `${weekendCount} weekend`
        });
    }

    // Refactoring ratio
    const refactorCount = commits.filter(c => getCommitTags(c).includes('refactor')).length;
    const testCount = commits.filter(c => getCommitTags(c).includes('test')).length;
    if (refactorCount > 0 || testCount > 0) {
        highlights.push({
            label: 'Quality Work',
            value: `${refactorCount} refactors`,
            subvalue: `${testCount} tests`
        });
    }

    document.getElementById('summary-highlights').innerHTML = highlights.length > 0
        ? highlights.map(h => `
            <div class="p-3 bg-themed-tertiary rounded">
                <p class="text-xs text-themed-tertiary mb-1">${h.label}</p>
                <p class="text-sm font-semibold text-themed-primary">${h.value}</p>
                ${h.subvalue ? `<p class="text-xs text-themed-tertiary">${h.subvalue}</p>` : ''}
            </div>
        `).join('')
        : '<p class="text-themed-tertiary text-sm">No activity</p>';

    // Activity snapshot - work pattern indicators (useful for burnout detection)
    const holidayCount = commits.filter(c => getWorkPattern(c).isHoliday).length;

    document.getElementById('summary-activity').innerHTML = `
        <div class="text-center p-3 bg-amber-50 dark:bg-amber-900/20 rounded">
            <p class="text-2xl font-bold text-amber-600">${afterHoursCount}</p>
            <p class="text-xs text-themed-tertiary">After-hours</p>
        </div>
        <div class="text-center p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded">
            <p class="text-2xl font-bold text-indigo-600">${weekendCount}</p>
            <p class="text-xs text-themed-tertiary">Weekend</p>
        </div>
        <div class="text-center p-3 bg-pink-50 dark:bg-pink-900/20 rounded">
            <p class="text-2xl font-bold text-pink-600">${holidayCount}</p>
            <p class="text-xs text-themed-tertiary">Holiday</p>
        </div>
        <div class="text-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded">
            <p class="text-2xl font-bold text-purple-600">${complexChanges}</p>
            <p class="text-xs text-themed-tertiary">Complex</p>
        </div>
    `;

    // Add click handlers for summary cards (only once, using dynamic data)
    if (!state.summaryCardHandlersInitialized) {
        state.summaryCardHandlersInitialized = true;
        document.querySelectorAll('[data-summary-card]').forEach(el => {
            el.addEventListener('click', () => {
                const cardType = el.dataset.summaryCard;
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
            });
        });
    }
}

// === Discover Tab ===
// Humorous file name generator - maps real paths to fun names
const FILE_NAME_ADJECTIVES = [
    'Whimsical', 'Grumpy', 'Sleepy', 'Dancing', 'Sneaky', 'Jolly', 'Mysterious', 'Brave',
    'Lazy', 'Mighty', 'Tiny', 'Giant', 'Ancient', 'Cosmic', 'Fluffy', 'Sparkly', 'Rusty',
    'Golden', 'Silver', 'Crystal', 'Thunder', 'Shadow', 'Lucky', 'Wild', 'Calm', 'Swift'
];
const FILE_NAME_NOUNS = [
    'Penguin', 'Dragon', 'Unicorn', 'Wizard', 'Robot', 'Ninja', 'Pirate', 'Llama',
    'Phoenix', 'Kraken', 'Goblin', 'Sphinx', 'Yeti', 'Griffin', 'Mermaid', 'Centaur',
    'Cyclops', 'Hydra', 'Chimera', 'Basilisk', 'Troll', 'Ogre', 'Fairy', 'Gnome', 'Sprite'
];

// Cache file name mappings per session
let fileNameCache = {};

function getHumorousFileName(path) {
    if (fileNameCache[path]) return fileNameCache[path];
    // Use path hash for consistent naming
    let hash = 0;
    for (let i = 0; i < path.length; i++) {
        hash = ((hash << 5) - hash) + path.charCodeAt(i);
        hash = hash & hash;
    }
    const adjIdx = Math.abs(hash) % FILE_NAME_ADJECTIVES.length;
    const nounIdx = Math.abs(hash >> 8) % FILE_NAME_NOUNS.length;
    const name = `${FILE_NAME_ADJECTIVES[adjIdx]} ${FILE_NAME_NOUNS[nounIdx]}`;
    fileNameCache[path] = name;
    return name;
}

// Metrics pool - each metric has an id, label, and calculate function
const DISCOVER_METRICS = [
    {
        id: 'net-growth',
        label: 'Net Code Growth',
        calculate: (commits) => {
            const adds = commits.reduce((sum, c) => sum + (c.stats?.additions || 0), 0);
            const dels = commits.reduce((sum, c) => sum + (c.stats?.deletions || 0), 0);
            const net = adds - dels;
            return { value: net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString(), sub: 'lines' };
        }
    },
    {
        id: 'avg-commit-size',
        label: 'Avg Commit Size',
        calculate: (commits) => {
            const total = commits.reduce((sum, c) => sum + (c.stats?.additions || 0) + (c.stats?.deletions || 0), 0);
            const avg = commits.length > 0 ? Math.round(total / commits.length) : 0;
            return { value: avg.toLocaleString(), sub: 'lines/commit' };
        }
    },
    {
        id: 'deletion-ratio',
        label: 'Deletion Ratio',
        calculate: (commits) => {
            const adds = commits.reduce((sum, c) => sum + (c.stats?.additions || 0), 0);
            const dels = commits.reduce((sum, c) => sum + (c.stats?.deletions || 0), 0);
            const total = adds + dels;
            const pct = total > 0 ? Math.round((dels / total) * 100) : 0;
            return { value: `${pct}%`, sub: 'of changes' };
        }
    },
    {
        id: 'feature-bug-ratio',
        label: 'Feature:Bug Ratio',
        calculate: (commits) => {
            const features = commits.filter(c => getCommitTags(c).includes('feature')).length;
            const bugs = commits.filter(c => getCommitTags(c).includes('bugfix') || getCommitTags(c).includes('fix')).length;
            if (bugs === 0) return { value: features > 0 ? `${features}:0` : '0:0', sub: 'features to bugs' };
            const ratio = (features / bugs).toFixed(1);
            return { value: `${ratio}:1`, sub: 'features to bugs' };
        }
    },
    {
        id: 'test-investment',
        label: 'Test Investment',
        calculate: (commits) => {
            const tests = commits.filter(c => getCommitTags(c).includes('test')).length;
            const pct = commits.length > 0 ? Math.round((tests / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${tests} test commits` };
        }
    },
    {
        id: 'docs-investment',
        label: 'Docs Investment',
        calculate: (commits) => {
            const docs = commits.filter(c => getCommitTags(c).includes('docs')).length;
            const pct = commits.length > 0 ? Math.round((docs / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${docs} doc commits` };
        }
    },
    {
        id: 'untagged-commits',
        label: 'Untagged Commits',
        calculate: (commits) => {
            const untagged = commits.filter(c => !c.tags || c.tags.length === 0).length;
            const pct = commits.length > 0 ? Math.round((untagged / commits.length) * 100) : 0;
            return { value: untagged.toLocaleString(), sub: `${pct}% of total` };
        }
    },
    {
        id: 'breaking-changes',
        label: 'Breaking Changes',
        calculate: (commits) => {
            const breaking = commits.filter(c => c.has_breaking_change).length;
            return { value: breaking.toLocaleString(), sub: 'commits' };
        }
    },
    {
        id: 'peak-hour',
        label: 'Peak Hour',
        calculate: (commits) => {
            const hourCounts = {};
            commits.forEach(c => {
                const hour = getCommitDateTime(c).hour;
                hourCounts[hour] = (hourCounts[hour] || 0) + 1;
            });
            const peak = Object.entries(hourCounts).sort((a, b) => b[1] - a[1])[0];
            if (!peak) return { value: '-', sub: '' };
            const hour = parseInt(peak[0]);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            const h12 = hour % 12 || 12;
            return { value: `${h12}${ampm}`, sub: `${peak[1]} commits` };
        }
    },
    {
        id: 'peak-day',
        label: 'Peak Day',
        calculate: (commits) => {
            const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            const dayCounts = {};
            commits.forEach(c => {
                const day = getCommitDateTime(c).dayOfWeek;
                dayCounts[day] = (dayCounts[day] || 0) + 1;
            });
            const peak = Object.entries(dayCounts).sort((a, b) => b[1] - a[1])[0];
            if (!peak) return { value: '-', sub: '' };
            return { value: days[parseInt(peak[0])], sub: `${peak[1]} commits` };
        }
    },
    {
        id: 'top-contributor',
        label: 'Top Contributor',
        calculate: (commits) => {
            const authorCounts = {};
            commits.forEach(c => {
                const email = getAuthorEmail(c);
                authorCounts[email] = (authorCounts[email] || 0) + 1;
            });
            const top = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])[0];
            if (!top) return { value: '-', sub: '' };
            const pct = Math.round((top[1] / commits.length) * 100);
            return { value: `${pct}%`, sub: 'of commits' };
        }
    },
    {
        id: 'contributor-count',
        label: 'Active Contributors',
        calculate: (commits) => {
            const authors = new Set(commits.map(c => getAuthorEmail(c)));
            return { value: authors.size.toLocaleString(), sub: 'unique authors' };
        }
    },
    {
        id: 'avg-files-per-commit',
        label: 'Avg Files/Commit',
        calculate: (commits) => {
            const total = commits.reduce((sum, c) => sum + getFilesChanged(c), 0);
            const avg = commits.length > 0 ? (total / commits.length).toFixed(1) : 0;
            return { value: avg, sub: 'files changed' };
        }
    },
    {
        id: 'single-file-commits',
        label: 'Single-File Commits',
        calculate: (commits) => {
            const single = commits.filter(c => getFilesChanged(c) === 1).length;
            const pct = commits.length > 0 ? Math.round((single / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${single} commits` };
        }
    },
    {
        id: 'large-commits',
        label: 'Large Commits',
        calculate: (commits) => {
            const large = commits.filter(c => (c.stats?.additions || 0) + (c.stats?.deletions || 0) > 500).length;
            const pct = commits.length > 0 ? Math.round((large / commits.length) * 100) : 0;
            return { value: large.toLocaleString(), sub: `${pct}% over 500 lines` };
        }
    },
    {
        id: 'refactor-ratio',
        label: 'Refactor Work',
        calculate: (commits) => {
            const refactors = commits.filter(c => getCommitTags(c).includes('refactor')).length;
            const pct = commits.length > 0 ? Math.round((refactors / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${refactors} refactors` };
        }
    },
    {
        id: 'security-commits',
        label: 'Security Work',
        calculate: (commits) => {
            const security = commits.filter(c => getCommitTags(c).includes('security')).length;
            return { value: security.toLocaleString(), sub: 'security commits' };
        }
    },
    {
        id: 'weekend-work',
        label: 'Weekend Work',
        calculate: (commits) => {
            const weekend = commits.filter(c => {
                const day = getCommitDateTime(c).dayOfWeek;
                return day === 0 || day === 6;
            }).length;
            const pct = commits.length > 0 ? Math.round((weekend / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${weekend} commits` };
        }
    },
    {
        id: 'night-owl',
        label: 'Night Owl Work',
        calculate: (commits) => {
            const night = commits.filter(c => {
                const hour = getCommitDateTime(c).hour;
                return hour >= 22 || hour < 6;
            }).length;
            const pct = commits.length > 0 ? Math.round((night / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${night} commits (10PM-6AM)` };
        }
    },
    {
        id: 'early-bird',
        label: 'Early Bird Work',
        calculate: (commits) => {
            const early = commits.filter(c => {
                const hour = getCommitDateTime(c).hour;
                return hour >= 5 && hour < 9;
            }).length;
            const pct = commits.length > 0 ? Math.round((early / commits.length) * 100) : 0;
            return { value: `${pct}%`, sub: `${early} commits (5-9AM)` };
        }
    }
];

// State for discover tab
let discoverState = {
    selectedMetrics: [], // Array of metric IDs for the 4 cards
    pinnedMetrics: {}    // { cardIndex: metricId } - pinned selections
};

// Load discover state from localStorage
function loadDiscoverState() {
    try {
        const saved = localStorage.getItem('discoverState');
        if (saved) {
            const parsed = JSON.parse(saved);
            discoverState.pinnedMetrics = parsed.pinnedMetrics || {};
        }
    } catch (e) { /* ignore */ }
}

// Save discover state to localStorage
function saveDiscoverState() {
    try {
        localStorage.setItem('discoverState', JSON.stringify({
            pinnedMetrics: discoverState.pinnedMetrics
        }));
    } catch (e) { /* ignore */ }
}

// Get random metrics, respecting pinned selections
function getRandomMetrics(count = 4) {
    const result = new Array(count).fill(null);
    const usedIds = new Set();

    // First, place pinned metrics
    for (let i = 0; i < count; i++) {
        const pinnedId = discoverState.pinnedMetrics[i];
        if (pinnedId && DISCOVER_METRICS.find(m => m.id === pinnedId)) {
            result[i] = pinnedId;
            usedIds.add(pinnedId);
        }
    }

    // Then fill remaining slots with random metrics
    const available = DISCOVER_METRICS.filter(m => !usedIds.has(m.id));
    for (let i = 0; i < count; i++) {
        if (result[i] === null && available.length > 0) {
            const randIdx = Math.floor(Math.random() * available.length);
            result[i] = available[randIdx].id;
            available.splice(randIdx, 1);
        }
    }

    return result;
}

function renderDiscover() {
    const commits = getFilteredCommits();
    loadDiscoverState();

    // Get metrics to display (random or from state)
    if (discoverState.selectedMetrics.length === 0) {
        discoverState.selectedMetrics = getRandomMetrics(4);
    }

    // Render metric cards
    const container = document.getElementById('discover-metrics');
    container.innerHTML = discoverState.selectedMetrics.map((metricId, idx) => {
        const metric = DISCOVER_METRICS.find(m => m.id === metricId);
        if (!metric) return '';

        const result = metric.calculate(commits);
        const isPinned = discoverState.pinnedMetrics[idx] === metricId;

        return `
            <div class="card">
                <div class="flex items-center justify-between mb-2">
                    <select class="metric-selector text-xs bg-transparent border-none text-themed-tertiary cursor-pointer focus:outline-none" data-card-index="${idx}">
                        <option value="random" ${!isPinned ? 'selected' : ''}>Random</option>
                        ${DISCOVER_METRICS.map(m => `
                            <option value="${m.id}" ${isPinned && m.id === metricId ? 'selected' : ''}>${m.label}</option>
                        `).join('')}
                    </select>
                    <button class="pin-btn text-xs ${isPinned ? 'text-blue-500' : 'text-themed-muted'} hover:text-blue-500" data-card-index="${idx}" title="${isPinned ? 'Unpin' : 'Pin this metric'}">
                        <svg class="w-4 h-4" fill="${isPinned ? 'currentColor' : 'none'}" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"></path></svg>
                    </button>
                </div>
                <p class="text-3xl font-bold text-themed-primary">${result.value}</p>
                <p class="text-xs text-themed-muted">${result.sub}</p>
            </div>
        `;
    }).join('');

    // Add event listeners for selectors and pins
    container.querySelectorAll('.metric-selector').forEach(select => {
        select.addEventListener('change', (e) => {
            const idx = parseInt(e.target.dataset.cardIndex);
            const value = e.target.value;

            if (value === 'random') {
                delete discoverState.pinnedMetrics[idx];
                // Pick a new random metric for this slot
                const usedIds = new Set(discoverState.selectedMetrics.filter((_, i) => i !== idx));
                const available = DISCOVER_METRICS.filter(m => !usedIds.has(m.id));
                if (available.length > 0) {
                    discoverState.selectedMetrics[idx] = available[Math.floor(Math.random() * available.length)].id;
                }
            } else {
                discoverState.selectedMetrics[idx] = value;
                discoverState.pinnedMetrics[idx] = value;
            }

            saveDiscoverState();
            renderDiscover();
        });
    });

    container.querySelectorAll('.pin-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = parseInt(e.currentTarget.dataset.cardIndex);
            const metricId = discoverState.selectedMetrics[idx];

            if (discoverState.pinnedMetrics[idx]) {
                delete discoverState.pinnedMetrics[idx];
            } else {
                discoverState.pinnedMetrics[idx] = metricId;
            }

            saveDiscoverState();
            renderDiscover();
        });
    });

    // Render file insights
    renderFileInsights(commits);

    // Render comparisons
    renderComparisons(commits);
}

function renderFileInsights(commits) {
    // Get file change counts
    const fileCounts = {};
    commits.forEach(c => {
        (c.files || []).forEach(path => {
            fileCounts[path] = (fileCounts[path] || 0) + 1;
        });
    });

    // Sort by count and take top 10
    const topFiles = Object.entries(fileCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10);

    const container = document.getElementById('file-insights');
    if (topFiles.length === 0) {
        container.innerHTML = '<p class="text-themed-tertiary text-sm">No file data available</p>';
        return;
    }

    const maxCount = topFiles[0][1];
    container.innerHTML = topFiles.map(([path, count]) => {
        const name = getHumorousFileName(path);
        const pct = Math.round((count / maxCount) * 100);
        return `
            <div class="flex items-center gap-3">
                <div class="flex-1">
                    <div class="flex items-center justify-between mb-1">
                        <span class="text-sm font-medium text-themed-primary" title="Hover for real path">${name}</span>
                        <span class="text-xs text-themed-tertiary">${count} changes</span>
                    </div>
                    <div class="h-2 bg-themed-tertiary rounded-full overflow-hidden">
                        <div class="h-full bg-blue-500 rounded-full" style="width: ${pct}%"></div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function renderComparisons(commits) {
    const comparisons = [];

    // Weekend vs Weekday
    const weekend = commits.filter(c => {
        const day = getCommitDateTime(c).dayOfWeek;
        return day === 0 || day === 6;
    }).length;
    const weekday = commits.length - weekend;
    if (commits.length > 0) {
        comparisons.push({
            label: 'Weekend vs Weekday',
            left: { value: weekend, label: 'Weekend' },
            right: { value: weekday, label: 'Weekday' }
        });
    }

    // Features vs Bugs
    const features = commits.filter(c => getCommitTags(c).includes('feature')).length;
    const bugs = commits.filter(c => getCommitTags(c).includes('bugfix') || getCommitTags(c).includes('fix')).length;
    if (features + bugs > 0) {
        comparisons.push({
            label: 'Features vs Bug Fixes',
            left: { value: features, label: 'Features' },
            right: { value: bugs, label: 'Bug Fixes' }
        });
    }

    // Additions vs Deletions
    const adds = commits.reduce((sum, c) => sum + (c.stats?.additions || 0), 0);
    const dels = commits.reduce((sum, c) => sum + (c.stats?.deletions || 0), 0);
    if (adds + dels > 0) {
        comparisons.push({
            label: 'Additions vs Deletions',
            left: { value: adds, label: 'Added' },
            right: { value: dels, label: 'Deleted' }
        });
    }

    // Planned vs Reactive
    const planned = commits.filter(c => c.urgency != null && c.urgency <= 2).length;
    const reactive = commits.filter(c => c.urgency != null && c.urgency >= 4).length;
    if (planned + reactive > 0) {
        comparisons.push({
            label: 'Planned vs Reactive',
            left: { value: planned, label: 'Planned' },
            right: { value: reactive, label: 'Reactive' }
        });
    }

    // Simple vs Complex
    const simple = commits.filter(c => c.complexity != null && c.complexity <= 2).length;
    const complex = commits.filter(c => c.complexity != null && c.complexity >= 4).length;
    if (simple + complex > 0) {
        comparisons.push({
            label: 'Simple vs Complex',
            left: { value: simple, label: 'Simple' },
            right: { value: complex, label: 'Complex' }
        });
    }

    const container = document.getElementById('discover-comparisons');
    if (comparisons.length === 0) {
        container.innerHTML = '<p class="text-themed-tertiary text-sm">No comparison data available</p>';
        return;
    }

    container.innerHTML = comparisons.map(comp => {
        const total = comp.left.value + comp.right.value;
        const leftPct = total > 0 ? Math.round((comp.left.value / total) * 100) : 50;
        const rightPct = 100 - leftPct;

        return `
            <div class="p-3 bg-themed-tertiary rounded">
                <p class="text-xs text-themed-tertiary mb-2">${comp.label}</p>
                <div class="flex items-center gap-2">
                    <span class="text-sm font-medium text-themed-primary w-20">${comp.left.label}</span>
                    <div class="flex-1 h-4 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden flex">
                        <div class="h-full bg-green-500" style="width: ${leftPct}%"></div>
                        <div class="h-full bg-amber-500" style="width: ${rightPct}%"></div>
                    </div>
                    <span class="text-sm font-medium text-themed-primary w-20 text-right">${comp.right.label}</span>
                </div>
                <div class="flex justify-between text-xs text-themed-muted mt-1">
                    <span>${comp.left.value.toLocaleString()} (${leftPct}%)</span>
                    <span>${comp.right.value.toLocaleString()} (${rightPct}%)</span>
                </div>
            </div>
        `;
    }).join('');
}

// === Delegated Click Handlers ===
// Single handler on #dashboard for all data-* attribute clicks.
// Called once during init — no per-render listener accumulation.
let _delegatedHandlersAttached = false;

function setupDelegatedHandlers() {
    if (_delegatedHandlersAttached) return;
    _delegatedHandlersAttached = true;

    document.getElementById('dashboard').addEventListener('click', (e) => {
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

// === Exports ===
export {
    renderTimeline,
    renderProgress,
    renderContributors,
    renderSecurity,
    renderHealth,
    renderTags,
    renderTiming,
    renderDeveloperPatterns,
    renderSummary,
    renderDiscover,
    renderFileInsights,
    renderComparisons,
    DISCOVER_METRICS,
    getHumorousFileName,
    discoverState,
    getRandomMetrics,
    setupDelegatedHandlers
};
