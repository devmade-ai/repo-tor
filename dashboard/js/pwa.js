/**
 * PWA Install & Update module
 *
 * Install: Captures beforeinstallprompt for Chromium browsers,
 *   provides browser-specific manual instructions for Safari/Firefox.
 * Update: Uses virtual:pwa-register with registerType:'prompt' for
 *   explicit control over SW activation. Checks hourly for updates.
 */

import { registerSW } from 'virtual:pwa-register';
import { showToast } from './ui.js';

// === State ===
let deferredInstallPrompt = null;
let updateSW = null; // function returned by registerSW to apply updates
let hasUpdate = false;

const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
const isPWAInstalled = isStandalone || localStorage.getItem('pwaInstalled') === 'true';

// === Install: Browser detection ===

function getBrowserInfo() {
    const ua = navigator.userAgent;
    if (/CriOS/i.test(ua)) return { browser: 'chrome-ios', platform: 'ios' };
    if (/FxiOS/i.test(ua)) return { browser: 'firefox-ios', platform: 'ios' };
    if (/EdgiOS/i.test(ua)) return { browser: 'edge-ios', platform: 'ios' };
    if (/iPad|iPhone|iPod/.test(ua) && !window.MSStream) {
        return { browser: 'safari', platform: 'ios' };
    }
    if (/Macintosh/.test(ua) && 'ontouchend' in document) {
        return { browser: 'safari', platform: 'ipados' };
    }
    if (/Macintosh/.test(ua) && /Safari/.test(ua) && !/Chrome/.test(ua)) {
        return { browser: 'safari-mac', platform: 'macos' };
    }
    if (/Edg\//i.test(ua)) return { browser: 'edge', platform: 'desktop' };
    if (/Brave/i.test(ua) || (navigator.brave && navigator.brave.isBrave)) {
        return { browser: 'brave', platform: 'desktop' };
    }
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) {
        if (/Android/i.test(ua)) return { browser: 'chrome', platform: 'android' };
        return { browser: 'chrome', platform: 'desktop' };
    }
    if (/Firefox/i.test(ua)) {
        if (/Android/i.test(ua)) return { browser: 'firefox', platform: 'android' };
        return { browser: 'firefox', platform: 'desktop' };
    }
    return { browser: 'unknown', platform: 'unknown' };
}

/**
 * Returns browser-specific install instructions for browsers
 * that don't support beforeinstallprompt.
 */
export function getInstallInstructions() {
    const { browser, platform } = getBrowserInfo();

    switch (browser) {
        case 'safari':
        case 'safari-mac':
            return {
                title: 'Install from Safari',
                steps: platform === 'ios' || platform === 'ipados'
                    ? ['Tap the Share button (square with arrow)', 'Scroll down and tap "Add to Home Screen"', 'Tap "Add" to confirm']
                    : ['Click File in the menu bar', 'Click "Add to Dock…"', 'Click "Add" to confirm']
            };
        case 'chrome-ios':
        case 'edge-ios':
        case 'firefox-ios':
            return {
                title: 'Install on iOS',
                steps: ['Open this page in Safari', 'Tap the Share button (square with arrow)', 'Tap "Add to Home Screen"']
            };
        case 'firefox':
            return platform === 'android'
                ? { title: 'Install from Firefox', steps: ['Tap the menu (three dots)', 'Tap "Install"'] }
                : { title: 'Install from Firefox', steps: ['Firefox desktop has limited PWA support', 'Try opening this page in Chrome or Edge for the best experience'] };
        case 'chrome':
        case 'edge':
        case 'brave':
            return {
                title: `Install from ${browser.charAt(0).toUpperCase() + browser.slice(1)}`,
                steps: ['Click the install icon in the address bar', 'Or open Menu → "Install app"']
            };
        default:
            return {
                title: 'Install as App',
                steps: ['Look for an install option in your browser menu', 'Or try opening this page in Chrome or Edge']
            };
    }
}

// === Install: Prompt handling ===

function showInstallButton() {
    const btn = document.getElementById('btn-pwa-install');
    if (btn) btn.classList.remove('hidden');
    const settingsBtn = document.getElementById('btn-pwa-install-settings');
    if (settingsBtn) settingsBtn.disabled = false;
    updateInstallStatus('ready');
}

function hideInstallButton() {
    const btn = document.getElementById('btn-pwa-install');
    if (btn) btn.classList.add('hidden');
    const settingsBtn = document.getElementById('btn-pwa-install-settings');
    if (settingsBtn) settingsBtn.disabled = true;
}

function updateInstallStatus(status) {
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
            statusText.textContent = 'See manual instructions below for your browser.';
            statusText.style.color = 'var(--text-secondary)';
            if (settingsBtn) settingsBtn.disabled = true;
            break;
    }
}

// Capture the browser's deferred install prompt (Chromium only)
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    if (isPWAInstalled) return;
    deferredInstallPrompt = e;
    showInstallButton();
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    localStorage.setItem('pwaInstalled', 'true');
    hideInstallButton();
    updateInstallStatus('installed');
    showToast('App installed successfully!');
});

/**
 * Trigger native install prompt (Chromium) or show manual instructions.
 */
export async function installPWA() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        if (outcome === 'accepted') {
            showToast('Installing app...');
        }
        deferredInstallPrompt = null;
        return;
    }
    // No native prompt available — show fallback instructions modal
    showInstallInstructionsModal();
}

function showInstallInstructionsModal() {
    const { title, steps } = getInstallInstructions();
    const stepsHtml = steps.map((s, i) => `<li>${i + 1}. ${s}</li>`).join('');

    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'pwa-install-modal';
    modal.style.cssText = 'position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);';
    modal.innerHTML = `
        <div style="background:var(--card-bg, #1f2937);border-radius:12px;padding:24px;max-width:380px;width:90%;color:var(--text-primary, #f3f4f6);box-shadow:0 20px 40px rgba(0,0,0,0.3);">
            <h3 style="font-size:16px;font-weight:600;margin-bottom:16px;">${title}</h3>
            <ul style="list-style:none;padding:0;margin:0 0 20px;font-size:14px;line-height:1.8;color:var(--text-secondary, #d1d5db);">
                ${stepsHtml}
            </ul>
            <button id="pwa-modal-close" style="width:100%;padding:10px;border:none;border-radius:8px;background:var(--color-primary, #2D68FF);color:white;font-size:14px;font-weight:500;cursor:pointer;">Got it</button>
        </div>
    `;
    document.body.appendChild(modal);

    const close = () => modal.remove();
    modal.querySelector('#pwa-modal-close').addEventListener('click', close);
    modal.addEventListener('click', (e) => { if (e.target === modal) close(); });
    document.addEventListener('keydown', function handler(e) {
        if (e.key === 'Escape') { close(); document.removeEventListener('keydown', handler); }
    });

    updateInstallStatus('unsupported');
}

// If already installed, hide install UI immediately
if (isPWAInstalled) {
    hideInstallButton();
    updateInstallStatus('installed');
    if (isStandalone) {
        const pwaSection = document.getElementById('pwa-settings-section');
        if (pwaSection) pwaSection.style.display = 'none';
    }
}

// === Update: Service worker registration ===

function showUpdateButton() {
    const btn = document.getElementById('btn-pwa-update');
    if (btn) btn.classList.remove('hidden');
}

function hideUpdateButton() {
    const btn = document.getElementById('btn-pwa-update');
    if (btn) btn.classList.add('hidden');
}

/**
 * Apply the pending update — activates the new SW and reloads.
 */
export function applyUpdate() {
    if (updateSW) {
        updateSW(true); // skipWaiting + reload
    }
}

/**
 * Manual check for updates (Settings panel button).
 */
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

        if (reg.waiting || reg.installing) {
            statusEl.textContent = 'Update found! Click "Update Available" in the header to apply.';
            statusEl.style.color = 'var(--color-primary, #2D68FF)';
            hasUpdate = true;
            showUpdateButton();
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

// Register the service worker via vite-plugin-pwa virtual module.
// registerType:'prompt' means we control when the new SW activates.
updateSW = registerSW({
    onNeedRefresh() {
        // A new SW is waiting to activate
        hasUpdate = true;
        showUpdateButton();
    },
    onOfflineReady() {
        showToast('App ready for offline use');
    },
    onRegisteredSW(swUrl, registration) {
        // Check for updates every hour
        if (registration) {
            setInterval(() => {
                registration.update();
            }, 60 * 60 * 1000);
        }
    },
    onRegisterError(error) {
        console.error('SW registration error:', error);
    }
});

// Also check for updates when page regains visibility
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) reg.update();
        });
    }
});
