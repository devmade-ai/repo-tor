import { getCommitTags } from './utils.js';

// Helper: aggregate commits by week for executive view
export function aggregateByWeekPeriod(commits) {
    const byWeek = {};
    commits.forEach(c => {
        if (!c.timestamp) return;
        const date = new Date(c.timestamp);
        const weekStart = new Date(date);
        weekStart.setDate(date.getDate() - ((date.getDay() + 6) % 7));
        const key = weekStart.toISOString().substring(0, 10);
        if (!byWeek[key]) {
            byWeek[key] = { commits: [], tags: {}, repos: new Set() };
        }
        byWeek[key].commits.push(c);
        getCommitTags(c).forEach(tag => {
            byWeek[key].tags[tag] = (byWeek[key].tags[tag] || 0) + 1;
        });
        if (c.repo_id) byWeek[key].repos.add(c.repo_id);
    });

    return Object.entries(byWeek)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, data]) => ({
            key,
            label: `Week of ${new Date(key).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
            count: data.commits.length,
            commits: data.commits,
            tags: data.tags,
            repos: [...data.repos]
        }));
}

// Helper: aggregate commits by day for management view
export function aggregateByDayPeriod(commits) {
    const byDay = {};
    commits.forEach(c => {
        if (!c.timestamp) return;
        const key = c.timestamp.substring(0, 10);
        if (!byDay[key]) {
            byDay[key] = { commits: [], tags: {}, repos: new Set() };
        }
        byDay[key].commits.push(c);
        getCommitTags(c).forEach(tag => {
            byDay[key].tags[tag] = (byDay[key].tags[tag] || 0) + 1;
        });
        if (c.repo_id) byDay[key].repos.add(c.repo_id);
    });

    return Object.entries(byDay)
        .sort((a, b) => b[0].localeCompare(a[0]))
        .map(([key, data]) => ({
            key,
            label: new Date(key).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }),
            count: data.commits.length,
            commits: data.commits,
            tags: data.tags,
            repos: [...data.repos]
        }));
}
