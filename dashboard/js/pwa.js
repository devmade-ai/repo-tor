/**
 * PWA Install & Update module
 *
 * Install: Captures beforeinstallprompt for Chromium browsers,
 *   provides browser-specific manual instructions for Safari/Firefox.
 * Update: Uses virtual:pwa-register with registerType:'prompt' for
 *   explicit control over SW activation. Checks hourly for updates.
 *
 * Communicates with React via custom events on `window`:
 *   - 'pwa-install-ready'   → install prompt is available
 *   - 'pwa-installed'       → app was installed
 *   - 'pwa-update-available'→ a new SW is waiting
 *   - 'pwa-offline-ready'   → app ready for offline use
 */

import { registerSW } from 'virtual:pwa-register';

// Safe localStorage wrappers — local copies to avoid importing utils.js
// (pwa.js loads early and shouldn't depend on the full utils module chain)
function safeStorageGet(key) {
    try { return localStorage.getItem(key); } catch { return null; }
}
function safeStorageSet(key, value) {
    try { localStorage.setItem(key, String(value)); } catch { /* sandboxed */ }
}
function safeStorageRemove(key) {
    try { localStorage.removeItem(key); } catch { /* sandboxed */ }
}

// === State ===
let deferredInstallPrompt = null;
let updateSW = null;
let updateInterval = null;
let _installReady = false;
let _updateAvailable = false;

const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

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
 * Returns browser-specific install instructions for the InstallInstructionsModal.
 * Data-driven: the modal renders whatever this returns — adding a browser is one switch case.
 * Returns { browser, steps, note? } matching the glow-props PWA_SYSTEM.md pattern.
 */
export function getInstallInstructions() {
    const { browser, platform } = getBrowserInfo();

    switch (browser) {
        case 'safari':
        case 'safari-mac':
            if (platform === 'ios' || platform === 'ipados') {
                return {
                    browser: 'Safari (iOS)',
                    steps: [
                        'Tap the Share button (square with arrow) at the bottom of the screen',
                        'Scroll down and tap "Add to Home Screen"',
                        'Tap "Add" in the top right corner',
                    ],
                };
            }
            return {
                browser: 'Safari (macOS)',
                steps: [
                    'Click File in the menu bar',
                    'Select "Add to Dock\u2026"',
                    'Click "Add" to confirm',
                ],
            };
        case 'chrome-ios':
        case 'edge-ios':
        case 'firefox-ios':
            return {
                browser: 'iOS Browser',
                steps: [
                    'Open this page in Safari (iOS requires Safari for installation)',
                    'Tap the Share button (square with arrow)',
                    'Tap "Add to Home Screen"',
                ],
                note: 'Only Safari can install apps on iOS. Other browsers use Safari\u2019s engine but lack the install option.',
            };
        case 'firefox':
            if (platform === 'android') {
                return {
                    browser: 'Firefox (Mobile)',
                    steps: [
                        'Tap the menu button (three dots)',
                        'Tap "Add to Home screen"',
                        'Tap "Add" to confirm',
                    ],
                };
            }
            return {
                browser: 'Firefox (Desktop)',
                steps: [
                    'Firefox desktop does not support PWA installation',
                    'For the best experience, use Chrome, Edge, or Brave',
                    'Alternatively, bookmark this page for quick access',
                ],
                note: 'Firefox removed PWA support for desktop in 2021.',
            };
        case 'brave':
            return {
                browser: 'Brave',
                steps: [
                    'Click the install icon in the address bar (computer with down arrow)',
                    'Or click the menu (\u2261) \u2192 "Install App\u2026"',
                    'Click "Install" to confirm',
                ],
                note: 'If the install option doesn\u2019t appear, check that Brave Shields isn\u2019t blocking it.',
            };
        case 'chrome':
        case 'edge':
            return {
                browser: browser === 'edge' ? 'Microsoft Edge' : 'Google Chrome',
                steps: [
                    'Click the install icon in the address bar (computer with down arrow)',
                    'Or click the menu (\u22ee) \u2192 "Install App\u2026"',
                    'Click "Install" to confirm',
                ],
            };
        default:
            return {
                browser: 'Your Browser',
                steps: [
                    'Look for an "Install" or "Add to Home Screen" option in your browser menu',
                    'For the best experience, use Chrome, Edge, or Brave',
                ],
            };
    }
}

/**
 * Whether the current browser supports the native beforeinstallprompt API.
 * If false, show manual install instructions instead.
 */
export function supportsNativeInstall() {
    const { browser } = getBrowserInfo();
    return ['chrome', 'edge', 'brave'].includes(browser);
}

/**
 * Whether the current browser supports manual PWA installation.
 * Safari and Firefox can install manually but don't fire beforeinstallprompt.
 */
export function supportsManualInstall() {
    const { browser } = getBrowserInfo();
    return ['safari', 'safari-mac', 'firefox', 'chrome-ios', 'edge-ios', 'firefox-ios'].includes(browser);
}

// === Install: Prompt handling ===

// Requirement: Capture beforeinstallprompt even if it fires before this module loads
// Approach: index.html has an inline <script> that stashes the event on window.
//   This module consumes it on load, then listens for future events as fallback.
// Alternatives:
//   - Only listen here: Rejected — module scripts load async; on cached SW visits
//     the event fires before any module executes (see glow-props CLAUDE.md pattern)
//   - Only use inline script: Rejected — need React integration via custom events
function consumeEarlyCapturedEvent() {
    const captured = window.__pwaInstallPromptEvent;
    if (captured) {
        delete window.__pwaInstallPromptEvent;
        return captured;
    }
    return null;
}

const earlyCaptured = consumeEarlyCapturedEvent();
if (earlyCaptured) {
    safeStorageRemove('pwaInstalled');
    deferredInstallPrompt = earlyCaptured;
    _installReady = true;
    // Defer event dispatch so React listeners are attached by the time it fires
    setTimeout(() => window.dispatchEvent(new CustomEvent('pwa-install-ready')), 0);
}

// Fallback listener for first-visit case (SW registers after mount)
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    // The browser only fires this event when the app is NOT installed.
    // Clear any stale flag from a previous install that was since removed.
    safeStorageRemove('pwaInstalled');
    deferredInstallPrompt = e;
    _installReady = true;
    window.dispatchEvent(new CustomEvent('pwa-install-ready'));
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    _installReady = false;
    safeStorageSet('pwaInstalled', 'true');
    window.dispatchEvent(new CustomEvent('pwa-installed'));
});

/**
 * Trigger native install prompt (Chromium) or return false if unavailable.
 * Returns true if the prompt was shown, false if caller should show manual instructions.
 */
export async function installPWA() {
    if (deferredInstallPrompt) {
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        return true;
    }
    return false;
}

/** Current PWA state — safe to call at any time, no race conditions. */
export function getPWAState() {
    return { installReady: _installReady, updateAvailable: _updateAvailable };
}

/** Whether the app is running as an installed PWA */
export function isInstalledPWA() {
    return isStandalone || safeStorageGet('pwaInstalled') === 'true';
}

/** Whether the app is running in standalone mode */
export function isStandaloneMode() {
    return isStandalone;
}

/**
 * Apply the pending update — activates the new SW and reloads.
 */
export function applyUpdate() {
    if (updateSW) {
        updateSW(true);
    }
}

/**
 * Stop the hourly update polling interval.
 * Defensive cleanup — the interval is created once at module level,
 * but storing the handle lets us clear it if ever needed.
 */
export function stopUpdatePolling() {
    if (updateInterval) {
        clearInterval(updateInterval);
        updateInterval = null;
    }
}

/**
 * Manual check for updates.
 * Returns: 'update-found' | 'up-to-date' | 'no-sw' | 'error'
 */
export async function checkForUpdate() {
    if (!('serviceWorker' in navigator)) return 'no-sw';
    try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) return 'no-sw';
        await reg.update();
        if (reg.waiting || reg.installing) {
            _updateAvailable = true;
            window.dispatchEvent(new CustomEvent('pwa-update-available'));
            return 'update-found';
        }
        return 'up-to-date';
    } catch {
        return 'error';
    }
}

// Register the service worker via vite-plugin-pwa virtual module.
updateSW = registerSW({
    onNeedRefresh() {
        _updateAvailable = true;
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
    },
    onOfflineReady() {
        window.dispatchEvent(new CustomEvent('pwa-offline-ready'));
    },
    onRegisteredSW(swUrl, registration) {
        if (registration) {
            updateInterval = setInterval(() => registration.update(), 60 * 60 * 1000);
        }
    },
    onRegisterError(error) {
        console.error('SW registration error:', error);
        // Route to debug pill so users without DevTools can see SW failures
        if (typeof window.__debugPushError === 'function') {
            window.__debugPushError('Service worker registration failed: ' + error.message, error.stack);
        }
    }
});

// Reload when a new service worker takes control — ensures pull-to-refresh
// gets fresh JS/CSS assets instead of stale cached versions.
let refreshing = false;
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        refreshing = true;
        window.location.reload();
    });
}

// Check for updates when page regains visibility
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) reg.update();
        }).catch(err => {
            console.warn('Failed to check for SW updates:', err.message || err);
        });
    }
});
