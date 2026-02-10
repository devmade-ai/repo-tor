/**
 * Main entry point for the Git Analytics Dashboard
 * Imports all modules and initializes the application
 */

import { state, TAB_MAPPING } from './state.js';
import {
    initDarkMode, initSanitizeMode, initDetailPane, initFilterSidebar,
    setupSettingsPanel, showToast, toggleSection
} from './ui.js';
import { loadData, combineDataFiles, tryAutoLoad } from './data.js';
import { renderSummary, renderTimeline, renderProgress, renderContributors, renderSecurity, renderTiming, renderTags, renderHealth, renderDiscover, discoverState, getRandomMetrics } from './tabs.js';
import { saveFiltersToStorage } from './filters.js';
// PWA install + update module (self-initializing, registers SW via virtual:pwa-register)
import { installPWA, checkForUpdate, applyUpdate } from './pwa.js';

// Expose functions needed by inline onclick handlers in HTML
window.toggleSection = toggleSection;
window.installPWA = installPWA;
window.checkForUpdate = checkForUpdate;
window.applyUpdate = applyUpdate;

// === Immediate Dark Mode (prevent flash) ===
document.documentElement.classList.add('dark');

// === Tab Navigation ===
document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        // Update button styles
        document.querySelectorAll('.tab-btn').forEach(b => {
            b.classList.remove('border-blue-500', 'text-blue-600');
            b.classList.add('border-transparent', 'text-themed-tertiary');
        });
        btn.classList.remove('border-transparent', 'text-themed-tertiary');
        btn.classList.add('border-blue-500', 'text-blue-600');

        // Show/hide tabs based on mapping
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.add('hidden'));
        const tabsToShow = TAB_MAPPING[btn.dataset.tab] || [`tab-${btn.dataset.tab}`];
        tabsToShow.forEach(tabId => {
            const tabEl = document.getElementById(tabId);
            if (tabEl) tabEl.classList.remove('hidden');
        });

        const activeTab = btn.dataset.tab;
        state.activeTab = activeTab;

        // Re-render if tab is dirty or if Chart.js needs visible containers
        if (state.data && state.dirtyTabs.has(activeTab)) {
            renderTab(activeTab);
            state.dirtyTabs.delete(activeTab);
        } else if (state.data) {
            // Charts need a re-render when becoming visible
            renderTab(activeTab);
        }

        // Save state (only if data is loaded)
        if (state.data) {
            saveFiltersToStorage();
        }
    });
});

// Centralized tab renderer — renders all sections within a tab group
function renderTab(tab) {
    if (tab === 'overview') {
        renderSummary();
    } else if (tab === 'activity') {
        renderTimeline();
        renderTiming();
    } else if (tab === 'work') {
        renderProgress();
        renderContributors();
        renderTags();
    } else if (tab === 'health') {
        renderHealth();
        renderSecurity();
    } else if (tab === 'discover') {
        renderDiscover();
    }
}

// === File Input Handler ===
const fileInput = document.getElementById('file-input');
const dropZone = document.getElementById('drop-zone');

async function handleFiles(files) {
    if (!files || files.length === 0) return;
    try {
        if (files.length === 1) {
            const text = await files[0].text();
            const jsonData = JSON.parse(text);
            loadData(jsonData);
        } else {
            const allData = [];
            for (const file of files) {
                const text = await file.text();
                const jsonData = JSON.parse(text);
                allData.push(jsonData);
            }
            const combined = combineDataFiles(allData);
            loadData(combined);
        }
    } catch (error) {
        alert('Error loading file(s): ' + error.message);
    }
}

fileInput.addEventListener('change', (e) => handleFiles(e.target.files));

// Drop zone: click to open file picker
dropZone.addEventListener('click', () => fileInput.click());
dropZone.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); fileInput.click(); }
});

// Drop zone: drag and drop
dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const files = [...e.dataTransfer.files].filter(f => f.name.endsWith('.json'));
    if (files.length > 0) handleFiles(files);
});

// === Heatmap Custom Tooltip ===
const heatmapTooltip = document.getElementById('heatmap-tooltip');
document.addEventListener('mouseover', (e) => {
    const cell = e.target.closest('[data-tooltip]');
    if (cell) {
        heatmapTooltip.textContent = cell.dataset.tooltip;
        heatmapTooltip.classList.add('visible');
    }
});
document.addEventListener('mouseout', (e) => {
    if (e.target.closest('[data-tooltip]')) {
        heatmapTooltip.classList.remove('visible');
    }
});
document.addEventListener('mousemove', (e) => {
    if (heatmapTooltip.classList.contains('visible')) {
        heatmapTooltip.style.left = e.clientX + 12 + 'px';
        heatmapTooltip.style.top = e.clientY - 8 + 'px';
    }
});
// Touch support
document.addEventListener('touchstart', (e) => {
    const cell = e.target.closest('[data-tooltip]');
    if (cell) {
        const rect = cell.getBoundingClientRect();
        heatmapTooltip.textContent = cell.dataset.tooltip;
        heatmapTooltip.style.left = rect.left + 'px';
        heatmapTooltip.style.top = rect.top - 30 + 'px';
        heatmapTooltip.classList.add('visible');
        setTimeout(() => heatmapTooltip.classList.remove('visible'), 2000);
    }
}, { passive: true });

// === Shuffle Button Handler (Discover Tab) ===
document.getElementById('shuffle-metrics')?.addEventListener('click', () => {
    // Clear non-pinned metrics and regenerate
    discoverState.selectedMetrics = getRandomMetrics(4);
    renderDiscover();
});

// === Initialize ===
initDarkMode();
initSanitizeMode();
initDetailPane();
initFilterSidebar();
setupSettingsPanel();
tryAutoLoad();
