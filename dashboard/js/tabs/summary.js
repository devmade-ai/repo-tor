import { getCommitTags, getWorkPattern } from '../utils.js';
import { getFilteredCommits } from '../filters.js';

export function renderSummary() {
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

    // Click handlers are delegated via setupDelegatedHandlers()
}
