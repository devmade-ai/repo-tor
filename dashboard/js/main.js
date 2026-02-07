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
import { renderSummary, renderTiming, renderTags, renderHealth, renderDiscover, discoverState, getRandomMetrics } from './tabs.js';
import { saveFiltersToStorage } from './filters.js';
// PWA event listeners are in export.js (they need direct access to deferredInstallPrompt)
import { installPWA, checkForUpdate } from './export.js';

// Expose functions needed by inline onclick handlers in HTML
window.toggleSection = toggleSection;
window.installPWA = installPWA;
window.checkForUpdate = checkForUpdate;

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

        // Re-render content when tab becomes visible (Chart.js needs visible containers)
        if (state.data) {
            const activeTab = btn.dataset.tab;
            if (activeTab === 'overview') {
                renderSummary();
            } else if (activeTab === 'activity') {
                renderTiming();
            } else if (activeTab === 'work') {
                renderTags();
            } else if (activeTab === 'health') {
                renderHealth();
            } else if (activeTab === 'discover') {
                renderDiscover();
            }
        }

        // Save state (only if data is loaded)
        if (state.data) {
            saveFiltersToStorage();
        }
    });
});

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
