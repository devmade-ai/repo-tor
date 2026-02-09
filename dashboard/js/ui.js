// === UI Interaction Functions ===
// Detail pane, settings panel, filter sidebar, collapsible sections,
// dark mode, sanitize mode, and toast notifications.

import { state, anonymousNames, authorAnonMap } from './state.js';
import { updateAllSectionGuidance } from './state.js';
import { escapeHtml, getCommitTags, getAuthorEmail, getAuthorName, sanitizeName, sanitizeMessage, getCommitSubject, getTagClass, getTagStyle, getUrgencyLabel, aggregateForDrilldown, renderDrilldownSummary } from './utils.js';
import { getFilteredCommits, applyFilters, saveFiltersToStorage } from './filters.js';
import { renderTimeline, renderContributors, renderTiming, renderDeveloperPatterns, renderSummary } from './tabs.js';

// === Detail Pane Functions ===
// detailState: optional { type: 'tag'|'author'|'impact'|'urgency'|'all', value: string }
export function openDetailPane(title, subtitle, commits, detailState = null) {
    const overlay = document.getElementById('detail-overlay');
    const pane = document.getElementById('detail-pane');
    const titleEl = document.getElementById('detail-title');
    const subtitleEl = document.getElementById('detail-subtitle');
    const contentEl = document.getElementById('detail-content');

    // Store detail state for shareable links
    state.currentDetailState = detailState;

    titleEl.textContent = title;
    subtitleEl.textContent = subtitle || '';

    // Render content immediately (data is already in memory)
    const drilldown = aggregateForDrilldown(commits, { title });

    let html = '';
    if (drilldown.type === 'commits') {
        if (commits && commits.length > 0) {
            html = commits.map(commit => renderDetailCommit(commit)).join('');
        } else {
            html = '<p class="text-themed-tertiary text-center py-8">No commits found</p>';
        }
    } else {
        html = renderDrilldownSummary(drilldown.data);
    }

    contentEl.innerHTML = `<div class="detail-pane-content-loaded">${html}</div>`;

    overlay.classList.add('open');
    pane.classList.add('open');
    state.detailPaneOpen = true;
    document.body.style.overflow = 'hidden';
}

export function closeDetailPane() {
    const overlay = document.getElementById('detail-overlay');
    const pane = document.getElementById('detail-pane');

    overlay.classList.remove('open');
    pane.classList.remove('open');
    state.detailPaneOpen = false;
    state.currentDetailState = null;
    document.body.style.overflow = '';
}

// === Settings Panel Functions ===

export function openSettingsPane() {
    const overlay = document.getElementById('settings-overlay');
    const pane = document.getElementById('settings-pane');

    // Sync current values to settings panel
    document.getElementById('settings-view-level').value = state.currentViewLevel;
    document.getElementById('settings-timezone').value = state.useUTC ? 'utc' : 'local';
    document.getElementById('settings-work-start').value = state.workHourStart;
    document.getElementById('settings-work-end').value = state.workHourEnd;

    // Sync privacy toggle
    const privacyToggle = document.getElementById('settings-privacy-toggle');
    if (state.isSanitized) {
        privacyToggle.classList.add('active');
    } else {
        privacyToggle.classList.remove('active');
    }

    overlay.classList.add('open');
    pane.classList.add('open');
    state.settingsPaneOpen = true;
    document.body.style.overflow = 'hidden';
}

export function closeSettingsPane() {
    const overlay = document.getElementById('settings-overlay');
    const pane = document.getElementById('settings-pane');

    overlay.classList.remove('open');
    pane.classList.remove('open');
    state.settingsPaneOpen = false;
    document.body.style.overflow = '';
}

export function setupSettingsPanel() {
    // Open settings button
    document.getElementById('btn-settings').addEventListener('click', openSettingsPane);

    // Close settings button and overlay
    document.getElementById('settings-close').addEventListener('click', closeSettingsPane);
    document.getElementById('settings-overlay').addEventListener('click', closeSettingsPane);

    // View Level change
    document.getElementById('settings-view-level').addEventListener('change', (e) => {
        state.currentViewLevel = e.target.value;
        localStorage.setItem('viewLevel', state.currentViewLevel);
        applyFilters();
        updateAllSectionGuidance();
    });

    // Privacy toggle
    document.getElementById('settings-privacy-toggle').addEventListener('click', () => {
        state.isSanitized = !state.isSanitized;
        localStorage.setItem('sanitized', state.isSanitized);

        const toggle = document.getElementById('settings-privacy-toggle');
        if (state.isSanitized) {
            toggle.classList.add('active');
            document.getElementById('icon-eye').classList.add('hidden');
            document.getElementById('icon-eye-slash').classList.remove('hidden');
        } else {
            toggle.classList.remove('active');
            document.getElementById('icon-eye').classList.remove('hidden');
            document.getElementById('icon-eye-slash').classList.add('hidden');
        }

        applyFilters();
        showToast(state.isSanitized ? 'Privacy mode enabled' : 'Privacy mode disabled');
    });

    // Timezone change
    document.getElementById('settings-timezone').addEventListener('change', (e) => {
        state.useUTC = e.target.value === 'utc';
        saveFiltersToStorage();
        renderTiming();
        renderDeveloperPatterns();
    });

    // Work hours start change
    document.getElementById('settings-work-start').addEventListener('change', (e) => {
        state.workHourStart = parseInt(e.target.value);
        saveFiltersToStorage();
        renderTiming();
        renderDeveloperPatterns();
        renderTimeline();
        renderSummary();
    });

    // Work hours end change
    document.getElementById('settings-work-end').addEventListener('change', (e) => {
        state.workHourEnd = parseInt(e.target.value);
        saveFiltersToStorage();
        renderTiming();
        renderDeveloperPatterns();
        renderTimeline();
        renderSummary();
    });

    // Escape key to close
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.settingsPaneOpen) {
            closeSettingsPane();
        }
    });
}

// === Detail Commit Rendering ===

export function renderDetailCommit(commit) {
    const tags = getCommitTags(commit);
    const email = getAuthorEmail(commit);
    const authorName = sanitizeName(getAuthorName(commit), email);
    const message = sanitizeMessage(getCommitSubject(commit));
    const date = new Date(commit.timestamp).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
    });

    const tagsHtml = tags.map(tag =>
        `<span class="tag ${getTagClass(tag)}" style="${getTagStyle(tag)}">${tag}</span>`
    ).join('');

    const urgencyLabel = commit.urgency ? getUrgencyLabel(commit.urgency) : '';
    const impactLabel = commit.impact ? commit.impact : '';

    return `
        <div class="detail-commit">
            <div class="detail-commit-message">${escapeHtml(message)}</div>
            <div class="detail-commit-meta">
                <span>${authorName}</span>
                <span>•</span>
                <span>${date}</span>
                ${commit.repo_id ? `<span>•</span><span>${commit.repo_id}</span>` : ''}
                ${urgencyLabel ? `<span>•</span><span class="text-amber-600">${urgencyLabel}</span>` : ''}
                ${impactLabel ? `<span>•</span><span class="text-blue-600">${impactLabel}</span>` : ''}
            </div>
            ${tags.length > 0 ? `<div class="detail-commit-tags">${tagsHtml}</div>` : ''}
        </div>
    `;
}

// === Filter Sidebar Functions ===

export function toggleFilterSidebar() {
    const sidebar = document.getElementById('filter-sidebar');
    const overlay = document.getElementById('filter-overlay');
    const toggle = document.getElementById('filter-toggle');
    const isMobile = window.innerWidth <= 768;

    state.filterSidebarOpen = !state.filterSidebarOpen;

    if (state.filterSidebarOpen) {
        sidebar.classList.remove('collapsed');
        if (isMobile) {
            sidebar.classList.add('open');
            overlay.classList.add('open');
            document.body.style.overflow = 'hidden';
        }
        toggle.classList.add('active');
    } else {
        sidebar.classList.add('collapsed');
        if (isMobile) {
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
        toggle.classList.remove('active');
    }
}

export function closeFilterSidebar() {
    if (!state.filterSidebarOpen) return;
    state.filterSidebarOpen = false;
    const sidebar = document.getElementById('filter-sidebar');
    const overlay = document.getElementById('filter-overlay');
    const toggle = document.getElementById('filter-toggle');

    sidebar.classList.add('collapsed');
    sidebar.classList.remove('open');
    overlay.classList.remove('open');
    toggle.classList.remove('active');
    document.body.style.overflow = '';
}

// updateFilterBadge is defined in filters.js (single source of truth)

// === Collapsible Sections ===
// Sections use consistent defaults on every page load (no saved state)

export function toggleSection(header) {
    const isExpanded = header.getAttribute('aria-expanded') === 'true';
    const content = header.nextElementSibling;

    header.setAttribute('aria-expanded', !isExpanded);
    content.classList.toggle('expanded', !isExpanded);
}

export function initCollapsibleSections() {
    // Always use consistent defaults - primary sections expanded
    const defaultExpanded = [
        'work-breakdown', 'highlights',  // Overview tab
        'activity-timeline',             // Activity tab
        'work-type-trend',               // Breakdown/Progress tab
        'commits-by-tag', 'tag-breakdown', // Tags tab
        'who-does-what',                 // Contributors tab
        'urgency-distribution', 'impact-distribution', // Health/Risk tab
        'activity-heatmap'               // Timing tab
    ];

    document.querySelectorAll('[data-section]').forEach(section => {
        const sectionName = section.dataset.section;
        const header = section.querySelector('.collapsible-header');
        const content = section.querySelector('.collapsible-content');
        if (header && content) {
            const shouldExpand = defaultExpanded.includes(sectionName);
            header.setAttribute('aria-expanded', shouldExpand);
            content.classList.toggle('expanded', shouldExpand);

            // Add keyboard accessibility: focusable + Enter/Space to toggle
            header.setAttribute('tabindex', '0');
            header.setAttribute('role', 'button');
            header.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleSection(header);
                }
            });
        }
    });
}

// === Detail Pane Initialization ===

// Initialize detail pane event listeners
export function initDetailPane() {
    const overlay = document.getElementById('detail-overlay');
    const closeBtn = document.getElementById('detail-close');

    overlay.addEventListener('click', closeDetailPane);
    closeBtn.addEventListener('click', closeDetailPane);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.detailPaneOpen) {
            closeDetailPane();
        }
    });
}

// Helper to filter commits by criteria and open detail pane
export function showCommitsInPane(title, subtitle, filterFn) {
    const filtered = getFilteredCommits().filter(filterFn);
    openDetailPane(title, subtitle, filtered);
}

// === Filter Sidebar Initialization ===

// Initialize filter sidebar event listeners
export function initFilterSidebar() {
    const toggle = document.getElementById('filter-toggle');
    const overlay = document.getElementById('filter-overlay');

    toggle.addEventListener('click', toggleFilterSidebar);
    overlay.addEventListener('click', closeFilterSidebar);

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && state.filterSidebarOpen) {
            closeFilterSidebar();
        }
    });

    // Handle resize - close mobile overlay if switching to desktop
    window.addEventListener('resize', () => {
        if (window.innerWidth > 768 && state.filterSidebarOpen) {
            const sidebar = document.getElementById('filter-sidebar');
            const overlay = document.getElementById('filter-overlay');
            sidebar.classList.remove('open');
            overlay.classList.remove('open');
            document.body.style.overflow = '';
        }
    });
}

// === Dark Mode (Dark Theme - Always Dark) ===

export function initDarkMode() {
    // dark theme guide: dark mode only
    state.isDarkMode = true;
    applyDarkMode();
}

export function applyDarkMode() {
    // Always apply dark mode for dark theme
    document.documentElement.classList.add('dark');

    // Hide theme toggle icons (dark-only mode)
    const iconSun = document.getElementById('icon-sun');
    const iconMoon = document.getElementById('icon-moon');
    if (iconSun) iconSun.classList.add('hidden');
    if (iconMoon) iconMoon.classList.add('hidden');

    // Chart.js defaults - read from CSS variables for theme consistency
    const styles = getComputedStyle(document.documentElement);
    Chart.defaults.color = styles.getPropertyValue('--text-secondary').trim() || '#e5e7eb';
    Chart.defaults.borderColor = styles.getPropertyValue('--chart-grid').trim() || 'rgba(255, 255, 255, 0.1)';
}

export function toggleDarkMode() {
    // No-op: dark theme is dark-only
    // Kept for compatibility but does nothing
}

// === Sanitization Mode ===

export function initSanitizeMode() {
    state.isSanitized = localStorage.getItem('sanitized') === 'true';
    applySanitizeMode();
}

export function applySanitizeMode() {
    document.getElementById('icon-eye').classList.toggle('hidden', state.isSanitized);
    document.getElementById('icon-eye-slash').classList.toggle('hidden', !state.isSanitized);

    // Sync settings panel toggle
    const toggle = document.getElementById('settings-privacy-toggle');
    if (toggle) {
        toggle.classList.toggle('active', state.isSanitized);
    }

    // Re-render views if data is loaded
    if (state.data) {
        renderTimeline();
        renderContributors();
        renderTiming();
        renderSummary();
    }
}

export function toggleSanitizeMode() {
    state.isSanitized = !state.isSanitized;
    localStorage.setItem('sanitized', state.isSanitized);
    applySanitizeMode();
    showToast(state.isSanitized ? 'Private mode enabled' : 'Private mode disabled');
}

// === Toast Notification ===

export function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    if (!toast) return;

    // Clear any pending hide timer
    if (toast._hideTimer) clearTimeout(toast._hideTimer);
    if (toast._removeTimer) clearTimeout(toast._removeTimer);

    toast.textContent = message;

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    toast._hideTimer = setTimeout(() => {
        toast.classList.remove('show');
    }, duration);
}
