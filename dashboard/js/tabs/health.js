import { state, getViewConfig, isMobile } from '../state.js';
import {
    escapeHtml, getAuthorEmail, getAuthorName, sanitizeName,
    renderUrgencyBar, renderImpactBar
} from '../utils.js';
import { getFilteredCommits } from '../filters.js';

export function renderHealth() {
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

    const mobileUT = isMobile();
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
                x: { ticks: { font: { size: mobileUT ? 9 : 12 }, maxRotation: mobileUT ? 60 : 45 } },
                y: { min: 1, max: 5, ticks: { stepSize: 1, font: { size: mobileUT ? 9 : 12 } } }
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

    const mobileIT = isMobile();
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
            plugins: { legend: { position: 'bottom', labels: { boxWidth: mobileIT ? 8 : 12, font: { size: mobileIT ? 8 : 10 }, padding: mobileIT ? 4 : 10 } } },
            scales: {
                x: { stacked: true, ticks: { font: { size: mobileIT ? 9 : 12 }, maxRotation: mobileIT ? 60 : 45 } },
                y: { stacked: true, ticks: { font: { size: mobileIT ? 9 : 12 } } }
            }
        }
    });

    // Urgency by Contributor (or aggregated based on view level)
    const config = getViewConfig();

    if (config.contributors === 'total') {
        // Executive view: show single aggregated bar
        document.getElementById('urgency-by-contributor').innerHTML =
            renderUrgencyBar(urgencyBreakdown, total, 'All Contributors', '', { barHeight: 'h-3' });
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

        const urgencyByContributorHtml = sortedRepos.map(([repo, data]) =>
            renderUrgencyBar(data, data.total, repo, `data-repo-urgency="${escapeHtml(repo)}"`)
        ).join('');
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

        const urgencyByContributorHtml = sortedContributors.map(c =>
            renderUrgencyBar(c, c.total, sanitizeName(c.name, c.email), `data-contributor-urgency="${escapeHtml(c.email)}"`)
        ).join('');
        document.getElementById('urgency-by-contributor').innerHTML = urgencyByContributorHtml || '<p class="text-themed-tertiary text-sm">No data</p>';
    }

    // Impact by Contributor (or aggregated based on view level)
    if (config.contributors === 'total') {
        // Executive view: show single aggregated bar
        document.getElementById('impact-by-contributor').innerHTML =
            renderImpactBar(impactBreakdown, total, 'All Contributors', '', { barHeight: 'h-3' });
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

        const impactByContributorHtml = sortedReposImpact.map(([repo, data]) =>
            renderImpactBar(data, data.total, repo, `data-repo-impact="${escapeHtml(repo)}"`)
        ).join('');
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

        const impactByContributorHtml = sortedContributorsImpact.map(c =>
            renderImpactBar(c, c.total, sanitizeName(c.name, c.email), `data-contributor-impact="${escapeHtml(c.email)}"`)
        ).join('');
        document.getElementById('impact-by-contributor').innerHTML = impactByContributorHtml || '<p class="text-themed-tertiary text-sm">No data</p>';
    }

    // Click handlers are delegated via setupDelegatedHandlers()
}
