// === Data Loading & Combining ===
// Extracted from index.html into ES module

import { state } from './state.js';
import { formatDate, getCommitTags, getAuthorEmail, getAdditions, getDeletions } from './utils.js';
import { populateFilters, setupFilterListeners, applyFilters, loadFiltersFromStorage, getFilteredCommits, updateSummaryStats } from './filters.js';
import { renderSummary, renderTimeline, renderProgress, renderContributors, renderSecurity, renderHealth, renderTags, renderTiming, setupDelegatedHandlers } from './tabs.js';
import { setupExportButtons, applyUrlState, hasActiveFilters } from './export.js';
import { initCollapsibleSections } from './ui.js';

// === Data Loading ===
export async function loadData(jsonData) {
    state.data = jsonData;
    document.getElementById('loader').classList.add('hidden');
    document.getElementById('dashboard').classList.remove('hidden');

    // Update header
    document.getElementById('repo-name').textContent = state.data.metadata.repository;
    document.getElementById('repo-subtitle').textContent =
        `${state.data.summary.totalCommits} commits from ${state.data.summary.totalContributors} contributors | ` +
        `${formatDate(state.data.summary.dateRange.earliest)} - ${formatDate(state.data.summary.dateRange.latest)}`;

    // Update stats - focus on meaningful metrics
    updateSummaryStats();

    // Populate and setup filters
    populateFilters();
    setupFilterListeners();

    // Setup export/share buttons
    setupExportButtons();

    // Load saved state from localStorage (URL params will override)
    const hasUrlParams = window.location.search.length > 1;
    if (!hasUrlParams) {
        loadFiltersFromStorage();
    }

    // Apply URL state (filters, tab, etc.) if present
    applyUrlState();

    // Render all views
    renderSummary();
    renderTimeline();
    renderProgress();
    renderContributors();
    renderSecurity();
    renderHealth();
    renderTags();
    renderTiming();

    // Initialize collapsible sections
    initCollapsibleSections();

    // Setup delegated click handlers (once, no per-render accumulation)
    setupDelegatedHandlers();

    // Apply filters from URL after render
    if (hasActiveFilters()) {
        applyFilters();
    }

    // Update footer
    updateFooter();
}

// === Update Footer ===
export function updateFooter() {
    const commitCount = state.data.summary.totalCommits;
    const dateRange = `${formatDate(state.data.summary.dateRange.earliest)} – ${formatDate(state.data.summary.dateRange.latest)}`;
    const loadedAt = new Date().toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit'
    });
    document.getElementById('footer-summary').textContent =
        `${commitCount} commits · ${dateRange} · Data loaded ${loadedAt}`;
}

// === Combine Multiple Data Files ===
export function combineDataFiles(dataFiles) {
    const allCommits = [];
    const allContributors = new Map();
    const allFiles = new Map();
    const repos = [];

    let totalAdditions = 0;
    let totalDeletions = 0;
    const tagBreakdown = {};
    const monthlyCommits = {};
    const allAuthors = {};

    for (const dataFile of dataFiles) {
        const repoId = dataFile.metadata?.repo_id || dataFile.metadata?.repository || 'unknown';
        repos.push(repoId);

        // Merge authors from metadata
        if (dataFile.metadata?.authors) {
            Object.assign(allAuthors, dataFile.metadata.authors);
        }

        // Process commits
        for (const commit of dataFile.commits || []) {
            const enrichedCommit = { ...commit, repo_id: commit.repo_id || repoId };
            allCommits.push(enrichedCommit);

            // Tag breakdown
            const tags = getCommitTags(commit);
            tags.forEach(tag => {
                tagBreakdown[tag] = (tagBreakdown[tag] || 0) + 1;
            });

            // Monthly
            const month = commit.timestamp?.substring(0, 7);
            if (month) {
                if (!monthlyCommits[month]) monthlyCommits[month] = { total: 0, tags: {} };
                monthlyCommits[month].total++;
                tags.forEach(tag => {
                    monthlyCommits[month].tags[tag] = (monthlyCommits[month].tags[tag] || 0) + 1;
                });
            }

            totalAdditions += getAdditions(commit);
            totalDeletions += getDeletions(commit);
        }

        // Process contributors
        for (const contributor of dataFile.contributors || []) {
            const key = contributor.author_id || contributor.email?.toLowerCase();
            if (!allContributors.has(key)) {
                allContributors.set(key, {
                    ...contributor,
                    repos: new Set([repoId])
                });
            } else {
                const existing = allContributors.get(key);
                existing.commits += contributor.commits;
                existing.additions += contributor.additions;
                existing.deletions += contributor.deletions;
                existing.repos.add(repoId);
                for (const [type, count] of Object.entries(contributor.types || {})) {
                    existing.types[type] = (existing.types[type] || 0) + count;
                }
            }
        }

        // Process files
        for (const file of dataFile.files || []) {
            const key = `${repoId}:${file.path}`;
            if (!allFiles.has(key)) {
                allFiles.set(key, { ...file, repo_id: repoId });
            }
        }
    }

    // Sort commits by timestamp
    allCommits.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    // Convert contributors
    const contributors = Array.from(allContributors.values())
        .map(c => ({
            ...c,
            repos: Array.from(c.repos),
            repoCount: c.repos.size
        }))
        .sort((a, b) => b.commits - a.commits);

    // Get date range
    const timestamps = allCommits.map(c => c.timestamp).filter(Boolean).sort();

    return {
        metadata: {
            repository: `Combined (${repos.length} repos)`,
            repos,
            authors: allAuthors
        },
        commits: allCommits,
        contributors,
        files: Array.from(allFiles.values()),
        summary: {
            totalCommits: allCommits.length,
            totalContributors: contributors.length,
            totalAdditions,
            totalDeletions,
            netLinesChanged: totalAdditions - totalDeletions,
            tagBreakdown,
            monthlyCommits,
            dateRange: {
                earliest: timestamps[0] || null,
                latest: timestamps[timestamps.length - 1] || null
            }
        }
    };
}

// === Show/Hide Loading State ===
export function showLoading(show) {
    const content = document.getElementById('loader-content');
    const spinner = document.getElementById('loader-spinner');
    if (show) {
        content.classList.add('hidden');
        spinner.classList.remove('hidden');
    } else {
        content.classList.remove('hidden');
        spinner.classList.add('hidden');
    }
}

// === Auto-load data.json if present ===
export async function tryAutoLoad() {
    showLoading(true);
    try {
        // Try to load from same directory
        const response = await fetch('data.json');
        if (response.ok) {
            const jsonData = await response.json();
            loadData(jsonData);
            return;
        }
    } catch (e) {
        // Try reports folder
        try {
            const response = await fetch('../reports/repo-tor/data.json');
            if (response.ok) {
                const jsonData = await response.json();
                loadData(jsonData);
                return;
            }
        } catch (e2) {
            // No auto-load available
        }
    }
    // No data found, show file picker
    showLoading(false);
}
