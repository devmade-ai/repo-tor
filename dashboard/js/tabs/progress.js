import { state, isMobile } from '../state.js';
import { getCommitTags } from '../utils.js';
import { getFilteredCommits } from '../filters.js';

export function renderProgress() {
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

    // Click handlers are delegated via setupDelegatedHandlers()

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

    const mobileFF = isMobile();
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
            maintainAspectRatio: false,
            plugins: {
                legend: { labels: { font: { size: mobileFF ? 9 : 12 }, boxWidth: mobileFF ? 8 : 40 } }
            },
            scales: {
                x: { ticks: { font: { size: mobileFF ? 9 : 12 }, maxRotation: mobileFF ? 60 : 45 } },
                y: { ticks: { font: { size: mobileFF ? 9 : 12 } } }
            }
        }
    });

    // Complexity Over Time
    const complexityData = months.map(m => {
        const mc = monthlyComplexity[m];
        return mc && mc.count > 0 ? (mc.total / mc.count) : null;
    });

    const mobileCT = isMobile();
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
                x: { ticks: { font: { size: mobileCT ? 9 : 12 }, maxRotation: mobileCT ? 60 : 45 } },
                y: {
                    min: 1,
                    max: 5,
                    ticks: { stepSize: 1, font: { size: mobileCT ? 9 : 12 } }
                }
            }
        }
    });
}
