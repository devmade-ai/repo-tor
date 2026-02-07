import { state, VIEW_LEVELS } from './state.js';
import { updateAllSectionGuidance } from './state.js';
import { escapeHtml, getAllTags, getAuthorEmail, getAuthorName, getCommitTags, getFilesChanged } from './utils.js';
import { renderTimeline, renderProgress, renderContributors, renderTags, renderHealth, renderSecurity, renderTiming, renderSummary } from './tabs.js';

// === Summary Stats ===

export function updateSummaryStats() {
    const commits = getFilteredCommits();

    // Files changed - sum of all file changes across commits (not unique files)
    const totalFileChanges = commits.reduce((sum, c) => sum + getFilesChanged(c), 0);
    const uniqueFiles = state.data.files?.length || 0;
    document.getElementById('stat-files').textContent = totalFileChanges.toLocaleString();
    document.getElementById('stat-files-sub').textContent = uniqueFiles > 0 ? `${uniqueFiles} unique files` : `across ${commits.length} commits`;

    // Contributors - count unique authors in filtered commits
    const uniqueAuthors = new Set(commits.map(c => getAuthorEmail(c)));
    document.getElementById('stat-contributors').textContent = uniqueAuthors.size;
}

// === Filter Functions ===
// Helper to check if filter matches with per-filter mode
export function checkFilter(values, mode, commitValue, matchFn) {
    if (!values || values.length === 0) return null; // No filter active
    const matches = matchFn ? matchFn(values, commitValue) : values.includes(commitValue);
    return mode === 'exclude' ? !matches : matches;
}

export function getFilteredCommits() {
    if (!state.data || !state.data.commits) return [];

    return state.data.commits.filter(commit => {
        // Date range always applies
        if (state.filters.dateFrom) {
            const commitDate = commit.timestamp?.substring(0, 10);
            if (commitDate < state.filters.dateFrom) return false;
        }
        if (state.filters.dateTo) {
            const commitDate = commit.timestamp?.substring(0, 10);
            if (commitDate > state.filters.dateTo) return false;
        }

        // Tag filter - match if commit has ANY of the selected tags
        const tagResult = checkFilter(
            state.filters.tag.values,
            state.filters.tag.mode,
            getCommitTags(commit),
            (selected, commitTags) => selected.some(t => commitTags.includes(t))
        );
        if (tagResult === false) return false;

        // Author filter
        const authorResult = checkFilter(
            state.filters.author.values,
            state.filters.author.mode,
            getAuthorEmail(commit)
        );
        if (authorResult === false) return false;

        // Repo filter
        const repoResult = checkFilter(
            state.filters.repo.values,
            state.filters.repo.mode,
            commit.repo_id
        );
        if (repoResult === false) return false;

        // Urgency filter
        const urgencyResult = checkFilter(
            state.filters.urgency.values,
            state.filters.urgency.mode,
            commit.urgency,
            (selected, urgency) => {
                const urgencyMap = { planned: [1, 2], normal: [3], reactive: [4, 5] };
                return selected.some(s => urgencyMap[s]?.includes(urgency));
            }
        );
        if (urgencyResult === false) return false;

        // Impact filter
        const impactResult = checkFilter(
            state.filters.impact.values,
            state.filters.impact.mode,
            commit.impact
        );
        if (impactResult === false) return false;

        return true;
    });
}

export function populateFilters() {
    // Tag filter - multi-select
    const tagContainer = document.getElementById('filter-tag-container');
    const tagDropdown = tagContainer.querySelector('.filter-multi-select-dropdown');
    const tags = getAllTags(state.data.commits);
    tagDropdown.innerHTML = tags.map(t =>
        `<label class="filter-multi-select-option"><input type="checkbox" value="${escapeHtml(t)}"> ${escapeHtml(t)}</label>`
    ).join('');

    // Author filter - multi-select with author resolution
    const authorContainer = document.getElementById('filter-author-container');
    const authorDropdown = authorContainer.querySelector('.filter-multi-select-dropdown');
    const authorMap = {};
    state.data.commits.forEach(c => {
        const email = getAuthorEmail(c);
        const name = getAuthorName(c);
        if (email && !authorMap[email]) {
            authorMap[email] = name;
        }
    });
    const authors = Object.keys(authorMap).sort();
    authorDropdown.innerHTML = authors.map(email =>
        `<label class="filter-multi-select-option"><input type="checkbox" value="${escapeHtml(email)}"> ${escapeHtml(authorMap[email] || email)}</label>`
    ).join('');

    // Repo filter (only show if aggregated data)
    const repos = [...new Set(state.data.commits.map(c => c.repo_id).filter(Boolean))];
    const repoContainer = document.getElementById('repo-filter-container');
    if (repos.length > 1) {
        repoContainer.style.display = 'block';
        const repoDropdown = document.querySelector('#filter-repo-multiselect .filter-multi-select-dropdown');
        repoDropdown.innerHTML = repos.sort().map(r =>
            `<label class="filter-multi-select-option"><input type="checkbox" value="${escapeHtml(r)}"> ${escapeHtml(r)}</label>`
        ).join('');
    } else {
        repoContainer.style.display = 'none';
    }

    // Date range defaults
    if (state.data.summary?.dateRange) {
        const fromInput = document.getElementById('filter-date-from');
        const toInput = document.getElementById('filter-date-to');
        if (state.data.summary.dateRange.earliest) {
            fromInput.min = state.data.summary.dateRange.earliest.substring(0, 10);
        }
        if (state.data.summary.dateRange.latest) {
            toInput.max = state.data.summary.dateRange.latest.substring(0, 10);
        }
    }

    // Setup multi-select dropdowns
    setupMultiSelectDropdowns();
}

export function setupMultiSelectDropdowns() {
    const containers = document.querySelectorAll('.filter-multi-select');
    containers.forEach(container => {
        const trigger = container.querySelector('.filter-multi-select-trigger');
        const dropdown = container.querySelector('.filter-multi-select-dropdown');
        const filterType = container.id.replace('filter-', '').replace('-container', '').replace('-multiselect', '');

        // Toggle dropdown
        trigger.addEventListener('click', (e) => {
            e.stopPropagation();
            // Close other dropdowns
            document.querySelectorAll('.filter-multi-select-dropdown.open').forEach(d => {
                if (d !== dropdown) d.classList.remove('open');
            });
            dropdown.classList.toggle('open');
        });

        // Handle checkbox changes
        dropdown.addEventListener('change', (e) => {
            if (e.target.type === 'checkbox') {
                updateFilterFromCheckboxes(container, filterType);
                applyFilters();
            }
        });

        // Update option highlight on change
        dropdown.querySelectorAll('.filter-multi-select-option').forEach(opt => {
            opt.addEventListener('click', (e) => {
                if (e.target.tagName !== 'INPUT') {
                    const checkbox = opt.querySelector('input[type="checkbox"]');
                    checkbox.checked = !checkbox.checked;
                    checkbox.dispatchEvent(new Event('change', { bubbles: true }));
                }
            });
        });
    });

    // Close dropdowns when clicking outside
    document.addEventListener('click', () => {
        document.querySelectorAll('.filter-multi-select-dropdown.open').forEach(d => {
            d.classList.remove('open');
        });
    });
}

export function updateFilterFromCheckboxes(container, filterType) {
    const checkboxes = container.querySelectorAll('input[type="checkbox"]:checked');
    const values = Array.from(checkboxes).map(cb => cb.value);
    const trigger = container.querySelector('.filter-multi-select-trigger .selected-text');

    state.filters[filterType].values = values;

    // Update trigger text
    if (values.length === 0) {
        const labels = { tag: 'All Tags', author: 'All Authors', repo: 'All Repos', urgency: 'All Urgency', impact: 'All Impact' };
        trigger.textContent = labels[filterType] || 'All';
    } else if (values.length === 1) {
        const label = container.querySelector(`input[value="${CSS.escape(values[0])}"]`)?.parentElement?.textContent?.trim();
        trigger.textContent = label || values[0];
    } else {
        trigger.textContent = `${values.length} selected`;
    }

    // Update option highlights
    container.querySelectorAll('.filter-multi-select-option').forEach(opt => {
        const cb = opt.querySelector('input[type="checkbox"]');
        opt.classList.toggle('selected', cb.checked);
    });
}

export function setupFilterListeners() {
    // Restore saved view level
    const savedViewLevel = localStorage.getItem('viewLevel');
    if (savedViewLevel && VIEW_LEVELS[savedViewLevel]) {
        state.currentViewLevel = savedViewLevel;
    }

    // Initialize section guidance
    updateAllSectionGuidance();

    // Date filters
    document.getElementById('filter-date-from').addEventListener('change', (e) => {
        state.filters.dateFrom = e.target.value;
        document.querySelectorAll('.filter-preset-btn').forEach(b => b.classList.remove('active'));
        applyFilters();
    });

    document.getElementById('filter-date-to').addEventListener('change', (e) => {
        state.filters.dateTo = e.target.value;
        document.querySelectorAll('.filter-preset-btn').forEach(b => b.classList.remove('active'));
        applyFilters();
    });

    // Clear filters
    document.getElementById('clear-filters').addEventListener('click', () => {
        // Reset filter state
        state.filters.tag = { values: [], mode: 'include' };
        state.filters.author = { values: [], mode: 'include' };
        state.filters.repo = { values: [], mode: 'include' };
        state.filters.urgency = { values: [], mode: 'include' };
        state.filters.impact = { values: [], mode: 'include' };
        state.filters.dateFrom = '';
        state.filters.dateTo = '';

        // Clear date inputs
        document.getElementById('filter-date-from').value = '';
        document.getElementById('filter-date-to').value = '';

        // Uncheck all checkboxes
        document.querySelectorAll('.filter-multi-select input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });

        // Reset trigger text
        document.querySelectorAll('.filter-multi-select').forEach(container => {
            const trigger = container.querySelector('.filter-multi-select-trigger .selected-text');
            const filterType = container.id.replace('filter-', '').replace('-container', '').replace('-multiselect', '');
            const labels = { tag: 'All Tags', author: 'All Authors', repo: 'All Repos', urgency: 'All Urgency', impact: 'All Impact' };
            trigger.textContent = labels[filterType] || 'All';
            container.querySelectorAll('.filter-multi-select-option').forEach(opt => opt.classList.remove('selected'));
        });

        // Reset mode toggles to Include
        document.querySelectorAll('.filter-mode-toggle').forEach(toggle => {
            toggle.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
            toggle.querySelector('[data-mode="include"]').classList.add('active');
        });

        applyFilters();
    });

    // Quick select preset handlers
    document.querySelectorAll('.filter-preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const preset = btn.dataset.preset;
            const today = new Date();
            let fromDate, toDate;

            switch (preset) {
                case '30days':
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - 30);
                    toDate = today;
                    break;
                case '90days':
                    fromDate = new Date(today);
                    fromDate.setDate(fromDate.getDate() - 90);
                    toDate = today;
                    break;
                case 'thisyear':
                    fromDate = new Date(today.getFullYear(), 0, 1);
                    toDate = today;
                    break;
                case 'lastyear':
                    fromDate = new Date(today.getFullYear() - 1, 0, 1);
                    toDate = new Date(today.getFullYear() - 1, 11, 31);
                    break;
            }

            if (fromDate && toDate) {
                const formatDate = d => d.toISOString().split('T')[0];
                state.filters.dateFrom = formatDate(fromDate);
                state.filters.dateTo = formatDate(toDate);
                document.getElementById('filter-date-from').value = state.filters.dateFrom;
                document.getElementById('filter-date-to').value = state.filters.dateTo;
                // Highlight active preset
                document.querySelectorAll('.filter-preset-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyFilters();
            }
        });
    });

    // Per-filter mode toggle handlers
    document.querySelectorAll('.filter-mode-toggle').forEach(toggle => {
        const filterType = toggle.dataset.filter;
        toggle.querySelectorAll('button').forEach(btn => {
            btn.addEventListener('click', () => {
                const mode = btn.dataset.mode;
                state.filters[filterType].mode = mode;
                // Update active state within this toggle
                toggle.querySelectorAll('button').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                applyFilters();
            });
        });
    });
}

export function applyFilters() {
    // Update filter indicator
    updateFilterIndicator();
    // Re-render all tabs with filtered data
    updateSummaryStats();
    renderTimeline();
    renderProgress();
    renderContributors();
    renderTags();
    renderHealth();
    renderSecurity();
    renderTiming();
    renderSummary();
    saveFiltersToStorage();
}

export function updateFilterIndicator() {
    const indicator = document.getElementById('filter-indicator');
    const filtered = getFilteredCommits();
    const total = state.data?.commits?.length || 0;
    const hasFilters = state.filters.tag.values.length > 0 ||
                       state.filters.author.values.length > 0 ||
                       state.filters.repo.values.length > 0 ||
                       state.filters.urgency.values.length > 0 ||
                       state.filters.impact.values.length > 0 ||
                       state.filters.dateFrom ||
                       state.filters.dateTo;

    if (hasFilters && filtered.length !== total) {
        indicator.textContent = `${filtered.length} of ${total}`;
        indicator.classList.remove('hidden');
    } else {
        indicator.classList.add('hidden');
    }

    // Update filter badge on toggle button
    updateFilterBadge();
}

export function updateFilterBadge() {
    const badge = document.getElementById('filter-badge');
    let activeCount = 0;
    if (state.filters.tag.values.length > 0) activeCount++;
    if (state.filters.author.values.length > 0) activeCount++;
    if (state.filters.repo.values.length > 0) activeCount++;
    if (state.filters.urgency.values.length > 0) activeCount++;
    if (state.filters.impact.values.length > 0) activeCount++;
    if (state.filters.dateFrom) activeCount++;
    if (state.filters.dateTo) activeCount++;

    if (activeCount > 0) {
        badge.textContent = activeCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

// === Filter Persistence ===
export function saveFiltersToStorage() {
    const stored = {
        filters: state.filters,
        useUTC: state.useUTC,
        workHourStart: state.workHourStart,
        workHourEnd: state.workHourEnd,
        activeTab: document.querySelector('.tab-btn.border-blue-500')?.dataset.tab || 'overview'
    };
    localStorage.setItem('dashboardState', JSON.stringify(stored));
}

export function loadFiltersFromStorage() {
    try {
        const stored = localStorage.getItem('dashboardState');
        if (!stored) return false;

        const saved = JSON.parse(stored);

        // Restore multi-select filters
        if (saved.filters) {
            // Helper to restore a multi-select filter
            const restoreMultiSelectFilter = (filterType, containerSelector) => {
                const savedFilter = saved.filters[filterType];
                if (savedFilter && savedFilter.values && Array.isArray(savedFilter.values)) {
                    const container = document.querySelector(containerSelector);
                    if (!container) return;

                    // Restore values - only include values that exist in current options
                    const validValues = savedFilter.values.filter(v => {
                        return container.querySelector(`input[value="${CSS.escape(v)}"]`);
                    });

                    state.filters[filterType].values = validValues;
                    state.filters[filterType].mode = savedFilter.mode || 'include';

                    // Update checkboxes
                    validValues.forEach(v => {
                        const cb = container.querySelector(`input[value="${CSS.escape(v)}"]`);
                        if (cb) {
                            cb.checked = true;
                            cb.closest('.filter-multi-select-option')?.classList.add('selected');
                        }
                    });

                    // Update trigger text
                    updateFilterFromCheckboxes(container, filterType);

                    // Update mode toggle
                    const toggle = document.querySelector(`.filter-mode-toggle[data-filter="${filterType}"]`);
                    if (toggle) {
                        toggle.querySelectorAll('button').forEach(btn => btn.classList.remove('active'));
                        toggle.querySelector(`[data-mode="${state.filters[filterType].mode}"]`)?.classList.add('active');
                    }
                }
            };

            restoreMultiSelectFilter('tag', '#filter-tag-container');
            restoreMultiSelectFilter('author', '#filter-author-container');
            restoreMultiSelectFilter('repo', '#filter-repo-multiselect');
            restoreMultiSelectFilter('urgency', '#filter-urgency-container');
            restoreMultiSelectFilter('impact', '#filter-impact-container');

            // Date filters don't need validation
            state.filters.dateFrom = saved.filters.dateFrom || '';
            state.filters.dateTo = saved.filters.dateTo || '';
            document.getElementById('filter-date-from').value = state.filters.dateFrom;
            document.getElementById('filter-date-to').value = state.filters.dateTo;
        }

        // Restore timezone
        if (saved.useUTC !== undefined) {
            state.useUTC = saved.useUTC;
            document.getElementById('settings-timezone').value = state.useUTC ? 'utc' : 'local';
        }

        // Restore work hours
        if (saved.workHourStart !== undefined) {
            state.workHourStart = saved.workHourStart;
            document.getElementById('settings-work-start').value = state.workHourStart;
        }
        if (saved.workHourEnd !== undefined) {
            state.workHourEnd = saved.workHourEnd;
            document.getElementById('settings-work-end').value = state.workHourEnd;
        }

        // Restore active tab
        if (saved.activeTab) {
            const tabBtn = document.querySelector(`.tab-btn[data-tab="${saved.activeTab}"]`);
            if (tabBtn) tabBtn.click();
        }

        return true;
    } catch (e) {
        console.warn('Failed to restore dashboard state:', e);
        return false;
    }
}

export const saveState = saveFiltersToStorage;
