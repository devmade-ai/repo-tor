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

// === State ===
let deferredInstallPrompt = null;
let updateSW = null;

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
                    : ['Click File in the menu bar', 'Click "Add to Dock\u2026"', 'Click "Add" to confirm']
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
                steps: ['Click the install icon in the address bar', 'Or open Menu \u2192 "Install app"']
            };
        default:
            return {
                title: 'Install as App',
                steps: ['Look for an install option in your browser menu', 'Or try opening this page in Chrome or Edge']
            };
    }
}

// === Install: Prompt handling ===

window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    if (isPWAInstalled) return;
    deferredInstallPrompt = e;
    window.dispatchEvent(new CustomEvent('pwa-install-ready'));
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    localStorage.setItem('pwaInstalled', 'true');
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

/** Whether the app is running as an installed PWA */
export function isInstalledPWA() {
    return isPWAInstalled;
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
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
    },
    onOfflineReady() {
        window.dispatchEvent(new CustomEvent('pwa-offline-ready'));
    },
    onRegisteredSW(swUrl, registration) {
        if (registration) {
            setInterval(() => registration.update(), 60 * 60 * 1000);
        }
    },
    onRegisterError(error) {
        console.error('SW registration error:', error);
    }
});

// Check for updates when page regains visibility
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration().then(reg => {
            if (reg) reg.update();
        });
    }
});
