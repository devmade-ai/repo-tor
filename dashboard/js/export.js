import { state, TAB_MAPPING } from './state.js';
import { escapeHtml } from './utils.js';
import { getFilteredCommits, updateFilterFromCheckboxes, saveFiltersToStorage } from './filters.js';
import { openDetailPane, showToast, toggleDarkMode, toggleSanitizeMode } from './ui.js';

// === URL State Management (Shareable Links) ===
export function getStateFromUrl() {
    const params = new URLSearchParams(window.location.search);
    // Helper to parse multi-select filter from URL (values are comma-separated, mode is prefixed with !)
    const parseFilter = (key) => {
        const val = params.get(key) || '';
        if (!val) return { values: [], mode: 'include' };
        if (val.startsWith('!')) {
            return { values: val.slice(1).split(',').filter(Boolean), mode: 'exclude' };
        }
        return { values: val.split(',').filter(Boolean), mode: 'include' };
    };
    return {
        tag: parseFilter('tag'),
        author: parseFilter('author'),
        repo: parseFilter('repo'),
        urgency: parseFilter('urgency'),
        impact: parseFilter('impact'),
        dateFrom: params.get('from') || '',
        dateTo: params.get('to') || '',
        tab: params.get('tab') || 'overview',
        period: params.get('period') || '7days',
        tz: params.get('tz') || 'local',
        detail: params.get('detail') || '',
        detailValue: params.get('dv') || ''
    };
}

export function buildShareableUrl() {
    const url = new URL(window.location.href.split('?')[0]);
    const params = new URLSearchParams();

    // Add current tab
    const activeTab = document.querySelector('.tab-btn.border-blue-500')?.dataset.tab || 'overview';
    if (activeTab !== 'overview') params.set('tab', activeTab);

    // Helper to add multi-select filter to params (prefix with ! for exclude mode)
    const addFilter = (key, filter) => {
        if (filter.values && filter.values.length > 0) {
            const prefix = filter.mode === 'exclude' ? '!' : '';
            params.set(key, prefix + filter.values.join(','));
        }
    };

    // Add filters (only if set)
    addFilter('tag', state.filters.tag);
    addFilter('author', state.filters.author);
    addFilter('repo', state.filters.repo);
    addFilter('urgency', state.filters.urgency);
    addFilter('impact', state.filters.impact);
    if (state.filters.dateFrom) params.set('from', state.filters.dateFrom);
    if (state.filters.dateTo) params.set('to', state.filters.dateTo);

    // Add timezone if on activity tab (which includes timing) and not local
    if (activeTab === 'activity' && state.useUTC) {
        params.set('tz', 'utc');
    }

    // Add detail pane state if open
    if (state.currentDetailState) {
        params.set('detail', state.currentDetailState.type);
        if (state.currentDetailState.value) {
            params.set('dv', state.currentDetailState.value);
        }
    }

    const paramStr = params.toString();
    return paramStr ? `${url}?${paramStr}` : url.toString();
}

export function applyUrlState() {
    const urlState = getStateFromUrl();

    // Helper to apply multi-select filter from URL state
    const applyMultiSelectFilter = (filterType, containerSelector, filterUrlState) => {
        if (!filterUrlState || filterUrlState.values.length === 0) return;

        const container = document.querySelector(containerSelector);
        if (!container) return;

        // Set filter values and mode
        state.filters[filterType].values = filterUrlState.values;
        state.filters[filterType].mode = filterUrlState.mode;

        // Update checkboxes
        filterUrlState.values.forEach(v => {
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
            toggle.querySelector(`[data-mode="${filterUrlState.mode}"]`)?.classList.add('active');
        }
    };

    // Apply multi-select filters
    applyMultiSelectFilter('tag', '#filter-tag-container', urlState.tag);
    applyMultiSelectFilter('author', '#filter-author-container', urlState.author);
    applyMultiSelectFilter('repo', '#filter-repo-multiselect', urlState.repo);
    applyMultiSelectFilter('urgency', '#filter-urgency-container', urlState.urgency);
    applyMultiSelectFilter('impact', '#filter-impact-container', urlState.impact);

    // Apply date filters
    state.filters.dateFrom = urlState.dateFrom;
    state.filters.dateTo = urlState.dateTo;
    document.getElementById('filter-date-from').value = urlState.dateFrom;
    document.getElementById('filter-date-to').value = urlState.dateTo;

    // Apply timezone
    if (urlState.tz === 'utc') {
        state.useUTC = true;
        document.getElementById('settings-timezone').value = 'utc';
    }

    // Switch to specified tab
    if (urlState.tab) {
        const tabBtn = document.querySelector(`.tab-btn[data-tab="${urlState.tab}"]`);
        if (tabBtn) tabBtn.click();
    }

    // Open detail pane if specified (after a brief delay to let data load)
    if (urlState.detail) {
        setTimeout(() => openDetailFromUrlState(urlState.detail, urlState.detailValue), 300);
    }
}

// Open detail pane from URL state
export function openDetailFromUrlState(type, value) {
    const currentCommits = getFilteredCommits();
    let title, filtered;

    switch (type) {
        case 'tag':
            filtered = currentCommits.filter(c => c.tags && c.tags.includes(value));
            title = `${value} Commits`;
            openDetailPane(title, `${filtered.length} commits`, filtered, { type, value });
            break;
        case 'author':
            filtered = currentCommits.filter(c => c.author === value);
            title = `${value}'s Commits`;
            openDetailPane(title, `${filtered.length} commits`, filtered, { type, value });
            break;
        case 'impact':
            filtered = currentCommits.filter(c => c.impact === value);
            title = `${value} Impact`;
            openDetailPane(title, `${filtered.length} commits`, filtered, { type, value });
            break;
        case 'urgency':
            const urgencyMap = { planned: [1, 2], normal: [3], reactive: [4, 5] };
            const levels = urgencyMap[value] || [];
            filtered = currentCommits.filter(c => levels.includes(c.urgency));
            title = `${value.charAt(0).toUpperCase() + value.slice(1)} Work`;
            openDetailPane(title, `${filtered.length} commits`, filtered, { type, value });
            break;
        case 'all':
            openDetailPane('All Commits', `${currentCommits.length} commits`, currentCommits, { type: 'all', value: '' });
            break;
    }
}

export function copyShareableLink() {
    const url = buildShareableUrl();
    navigator.clipboard.writeText(url).then(() => {
        showToast('Link copied to clipboard!');
    }).catch(() => {
        // Fallback for older browsers
        const input = document.createElement('input');
        input.value = url;
        document.body.appendChild(input);
        input.select();
        document.execCommand('copy');
        document.body.removeChild(input);
        showToast('Link copied to clipboard!');
    });
}

// === PDF Export ===
export async function exportToPdf() {
    const exportBtn = document.getElementById('btn-export-pdf');
    const originalText = exportBtn.innerHTML;
    exportBtn.innerHTML = `
        <svg class="animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
            <path stroke-linecap="round" stroke-linejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
        </svg>
        Generating...
    `;
    exportBtn.disabled = true;

    try {
        // Get current active tab and use TAB_MAPPING to find actual content containers
        const activeTab = document.querySelector('.tab-btn.border-blue-500')?.dataset.tab || 'overview';
        const tabIds = TAB_MAPPING[activeTab] || [`tab-${activeTab}`];
        const tabNames = { overview: 'Overview', activity: 'Activity', work: 'Breakdown', health: 'Risk', discover: 'Discover' };

        // Create a container for PDF content with light theme overrides
        const pdfContent = document.createElement('div');
        pdfContent.style.cssText = 'background: white; padding: 20px; max-width: 1000px; color: #111827;';

        // Add header
        const header = document.createElement('div');
        header.innerHTML = `
            <h1 style="font-size: 24px; font-weight: bold; color: #111827; margin-bottom: 8px;">
                ${document.getElementById('repo-name').textContent}
            </h1>
            <p style="color: #6b7280; font-size: 14px; margin-bottom: 16px;">
                ${document.getElementById('repo-subtitle').textContent}
            </p>
            <p style="color: #9ca3af; font-size: 12px; margin-bottom: 24px;">
                Generated: ${new Date().toLocaleString()} | Tab: ${tabNames[activeTab] || activeTab}
                ${hasActiveFilters() ? ' | Filtered view' : ''}
            </p>
        `;
        pdfContent.appendChild(header);

        // Add summary stats (4 key metrics from Overview)
        const stats = document.createElement('div');
        stats.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 12px; margin-bottom: 24px;">
                <div style="background: #f9fafb; padding: 12px; border-radius: 8px;">
                    <p style="color: #6b7280; font-size: 11px; text-transform: uppercase;">Features Built</p>
                    <p style="font-size: 20px; font-weight: bold; color: #16a34a;">${document.getElementById('summary-features')?.textContent || '0'}</p>
                </div>
                <div style="background: #f9fafb; padding: 12px; border-radius: 8px;">
                    <p style="color: #6b7280; font-size: 11px; text-transform: uppercase;">Bugs Fixed</p>
                    <p style="font-size: 20px; font-weight: bold; color: #d97706;">${document.getElementById('summary-fixes')?.textContent || '0'}</p>
                </div>
                <div style="background: #f9fafb; padding: 12px; border-radius: 8px;">
                    <p style="color: #6b7280; font-size: 11px; text-transform: uppercase;">Avg Urgency</p>
                    <p style="font-size: 20px; font-weight: bold; color: #111827;">${document.getElementById('summary-urgency')?.textContent || '-'}</p>
                </div>
                <div style="background: #f9fafb; padding: 12px; border-radius: 8px;">
                    <p style="color: #6b7280; font-size: 11px; text-transform: uppercase;">% Planned</p>
                    <p style="font-size: 20px; font-weight: bold; color: #16a34a;">${document.getElementById('summary-planned')?.textContent || '0%'}</p>
                </div>
            </div>
        `;
        pdfContent.appendChild(stats);

        // Clone ALL content containers for the active tab (using TAB_MAPPING)
        for (const tabId of tabIds) {
            const tabEl = document.getElementById(tabId);
            if (!tabEl) continue;

            // Convert chart canvases to images before cloning (canvas content doesn't survive cloneNode)
            const canvases = tabEl.querySelectorAll('canvas');
            const canvasImages = [];
            canvases.forEach(canvas => {
                try {
                    const img = document.createElement('img');
                    img.src = canvas.toDataURL('image/png');
                    img.style.cssText = `width: ${canvas.offsetWidth}px; height: ${canvas.offsetHeight}px; max-width: 100%; background: white;`;
                    canvasImages.push({ canvas, img });
                } catch (e) {
                    // Skip tainted canvases
                }
            });

            const contentClone = tabEl.cloneNode(true);
            contentClone.classList.remove('hidden');

            // Replace cloned canvas placeholders with the captured images
            const clonedCanvases = contentClone.querySelectorAll('canvas');
            canvasImages.forEach(({ img }, i) => {
                if (clonedCanvases[i]) {
                    clonedCanvases[i].replaceWith(img.cloneNode(true));
                }
            });

            // Remove interactive elements
            contentClone.querySelectorAll('select, button, input').forEach(el => {
                if (el.tagName === 'SELECT') {
                    const span = document.createElement('span');
                    span.textContent = el.options[el.selectedIndex]?.text || '';
                    span.style.cssText = 'font-weight: 500; color: #111827;';
                    el.replaceWith(span);
                } else if (el.tagName === 'BUTTON') {
                    el.remove();
                }
            });

            // Override dark theme colors for PDF readability
            contentClone.style.cssText += 'color: #111827; background: white;';
            contentClone.querySelectorAll('.card, [class*="card"]').forEach(el => {
                el.style.background = '#ffffff';
                el.style.borderColor = '#e5e7eb';
                el.style.color = '#111827';
            });
            contentClone.querySelectorAll('h1, h2, h3, h4, h5, h6, .text-themed-primary').forEach(el => {
                el.style.color = '#111827';
            });
            contentClone.querySelectorAll('p, span, div, td, th, li').forEach(el => {
                const cs = window.getComputedStyle(el);
                // Only override very light text (dark theme text colors)
                if (el.style.color === '' || el.style.color.includes('var(')) {
                    el.style.color = '#374151';
                }
            });
            contentClone.querySelectorAll('.text-themed-secondary, .text-themed-tertiary, .text-themed-muted').forEach(el => {
                el.style.color = '#6b7280';
            });

            pdfContent.appendChild(contentClone);
        }

        // Temporarily add to DOM for rendering
        pdfContent.style.position = 'absolute';
        pdfContent.style.left = '-9999px';
        document.body.appendChild(pdfContent);

        // Generate PDF with pagebreak settings to avoid cutting content
        const opt = {
            margin: [10, 10, 10, 10],
            filename: `git-analytics-${activeTab}-${new Date().toISOString().split('T')[0]}.pdf`,
            image: { type: 'jpeg', quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                logging: false,
                backgroundColor: '#ffffff'
            },
            jsPDF: {
                unit: 'mm',
                format: 'a4',
                orientation: 'landscape'
            },
            pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
        };

        await html2pdf().set(opt).from(pdfContent).save();

        // Cleanup
        document.body.removeChild(pdfContent);
        showToast('PDF exported successfully!');
    } catch (error) {
        console.error('PDF export error:', error);
        showToast('Export failed. Please try again.');
    } finally {
        exportBtn.innerHTML = originalText;
        exportBtn.disabled = false;
    }
}

export function hasActiveFilters() {
    return state.filters.tag.values.length > 0 ||
           state.filters.author.values.length > 0 ||
           state.filters.repo.values.length > 0 ||
           state.filters.urgency.values.length > 0 ||
           state.filters.impact.values.length > 0 ||
           state.filters.dateFrom ||
           state.filters.dateTo;
}

// Setup export/share button handlers
export function setupExportButtons() {
    document.getElementById('export-buttons').classList.remove('hidden');
    document.getElementById('btn-share').addEventListener('click', copyShareableLink);
    document.getElementById('btn-export-pdf').addEventListener('click', exportToPdf);
    document.getElementById('btn-theme').addEventListener('click', toggleDarkMode);
    document.getElementById('btn-sanitize').addEventListener('click', toggleSanitizeMode);
}

// === PWA Support ===
// Service worker registration handled by vite-plugin-pwa
let deferredInstallPrompt = null;
export function getDeferredInstallPrompt() { return deferredInstallPrompt; }
export function setDeferredInstallPrompt(val) { deferredInstallPrompt = val; }

// Handle install prompt
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredInstallPrompt = e;
    showPWAInstallButton();
    updatePWAStatus('ready');
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    hidePWAInstallButton();
    updatePWAStatus('installed');
    showToast('App installed successfully!');
});

export function showPWAInstallButton() {
    const btn = document.getElementById('btn-pwa-install');
    if (btn) btn.classList.remove('hidden');
    const settingsBtn = document.getElementById('btn-pwa-install-settings');
    if (settingsBtn) settingsBtn.disabled = false;
}

export function hidePWAInstallButton() {
    const btn = document.getElementById('btn-pwa-install');
    if (btn) btn.classList.add('hidden');
    const settingsBtn = document.getElementById('btn-pwa-install-settings');
    if (settingsBtn) settingsBtn.disabled = true;
}

export function updatePWAStatus(status) {
    const statusText = document.getElementById('pwa-status-text');
    const settingsBtn = document.getElementById('btn-pwa-install-settings');
    if (!statusText) return;

    switch (status) {
        case 'ready':
            statusText.textContent = 'Ready to install';
            statusText.style.color = 'var(--color-success, #16a34a)';
            if (settingsBtn) settingsBtn.disabled = false;
            break;
        case 'installed':
            statusText.textContent = 'App is installed';
            statusText.style.color = 'var(--color-success, #16a34a)';
            if (settingsBtn) {
                settingsBtn.disabled = true;
                settingsBtn.textContent = 'Already Installed';
            }
            break;
        case 'unsupported':
            statusText.textContent = 'Install not available in this browser. See manual instructions below.';
            statusText.style.color = 'var(--text-secondary)';
            if (settingsBtn) settingsBtn.disabled = true;
            break;
        default:
            statusText.textContent = '';
    }
}

export async function installPWA() {
    if (!deferredInstallPrompt) {
        // If no deferred prompt, show guidance
        updatePWAStatus('unsupported');
        return;
    }
    deferredInstallPrompt.prompt();
    const { outcome } = await deferredInstallPrompt.userChoice;
    if (outcome === 'accepted') {
        showToast('Installing app...');
    }
    deferredInstallPrompt = null;
}

// Check if already installed (standalone mode)
if (window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true) {
    updatePWAStatus('installed');
}

// PWA updates handled automatically by vite-plugin-pwa (registerType: 'autoUpdate')
// Manual check for updates
export async function checkForUpdate() {
    const statusEl = document.getElementById('pwa-update-status');
    const btn = document.getElementById('btn-pwa-check-update');
    if (!statusEl || !btn) return;

    if (!('serviceWorker' in navigator)) {
        statusEl.textContent = 'Service workers not supported in this browser.';
        statusEl.style.color = 'var(--text-secondary)';
        return;
    }

    btn.disabled = true;
    statusEl.textContent = 'Checking...';
    statusEl.style.color = 'var(--text-secondary)';

    try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) {
            statusEl.textContent = 'No service worker registered. Try refreshing the page.';
            statusEl.style.color = 'var(--text-secondary)';
            btn.disabled = false;
            return;
        }

        await reg.update();

        if (reg.waiting) {
            statusEl.textContent = 'Update available! Close and reopen the app to apply.';
            statusEl.style.color = 'var(--color-primary, #2D68FF)';
            showToast('Update available! Close and reopen to apply.');
        } else {
            statusEl.textContent = 'You are on the latest version.';
            statusEl.style.color = 'var(--color-success, #16a34a)';
        }
    } catch (err) {
        statusEl.textContent = 'Could not check for updates. Check your connection.';
        statusEl.style.color = 'var(--text-secondary)';
    }
    btn.disabled = false;
}
