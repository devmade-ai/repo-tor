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
 *   - 'pwa-update-dismissed'→ user dismissed update prompt
 *   - 'pwa-offline-ready'   → app ready for offline use
 *   - 'pwa-checking-update' → manual update check in progress
 */

import { registerSW } from 'virtual:pwa-register';
import {
    SW_UPDATE_CHECK_INTERVAL_MS,
    JUST_UPDATED_SUPPRESS_MS,
    UPDATE_SETTLE_DELAY_MS,
    VERSION_CHECK_STARTUP_DELAY_MS,
    OFFLINE_READY_DISMISS_MS,
    INSTALL_DIAGNOSTIC_TIMEOUT_MS,
    INSTALL_ANALYTICS_MAX_EVENTS,
} from './pwaConstants.js';
import { debugAdd } from './debugLog.js';

// ── Safe storage wrappers ──
// Local copies to avoid importing utils.js
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
function safeSessionGet(key) {
    try { return sessionStorage.getItem(key); } catch { return null; }
}
function safeSessionSet(key, value) {
    try { sessionStorage.setItem(key, String(value)); } catch { /* sandboxed */ }
}

// ── Post-update suppression ──
// Requirement: Suppress false update re-detection after a reload triggered by applyUpdate
// Approach: 30-second window after update where onNeedRefresh is ignored. Prevents the
//   "update available" prompt from flashing immediately after the user just updated.
// Pattern from: synctone usePWAUpdate.ts (wasJustUpdated), few-lap usePWAUpdate.ts
function wasJustUpdated() {
    const ts = safeSessionGet('pwa-just-updated');
    if (!ts) return false;
    return (Date.now() - Number(ts)) < JUST_UPDATED_SUPPRESS_MS;
}

// ── Version.json polling ──
// Requirement: Detect new deployments even when the SW file hasn't changed
// Approach: Fetch /version.json (written at build time with a timestamp) and compare
//   with localStorage. If different, surface as an update. A simple reload serves
//   fresh assets because runtimeCaching uses NetworkFirst for data files, and
//   the SW precache will update on the next registration if code changed.
// Pattern from: synctone usePWAUpdate.ts (checkVersionJson), few-lap same
// Alternatives considered:
//   - Rely only on SW hash: Rejected — misses config-only deployments (vercel.json)
//   - ETag checks: Rejected — CDN may strip or normalize headers
const VERSION_STORAGE_KEY = 'pwa-build-time';
async function checkVersionJson() {
    try {
        const resp = await fetch(`/version.json?t=${Date.now()}`);
        if (!resp.ok) return;
        const { buildTime } = await resp.json();
        if (!buildTime) return;
        const stored = safeStorageGet(VERSION_STORAGE_KEY);
        if (stored && String(buildTime) !== stored) {
            if (!wasJustUpdated() && !_updateAvailable) {
                _updateAvailable = true;
                window.dispatchEvent(new CustomEvent('pwa-update-available'));
            }
        }
        safeStorageSet(VERSION_STORAGE_KEY, String(buildTime));
    } catch {
        // Network error — skip silently, will retry on next interval
    }
}
function storeCurrentBuildTime() {
    // Fire-and-forget — non-critical, retries via checkVersionJson on next interval.
    // Silent catch is intentional: network errors during update application are expected
    // (the page is about to reload anyway).
    fetch(`/version.json?t=${Date.now()}`).then(r => r.json()).then(({ buildTime }) => {
        if (buildTime) safeStorageSet(VERSION_STORAGE_KEY, String(buildTime));
    }).catch(() => { /* non-critical — see comment above */ });
}

// ── Install analytics ──
// Requirement: Track install events for diagnostics
// Approach: Last N events in localStorage, checked by getWasPreviouslyInstalled()
// Pattern from: few-lap usePWAInstall.ts (trackPWAEvent)
const INSTALL_ANALYTICS_KEY = 'pwa-install-analytics';
function trackInstallEvent(type) {
    try {
        const events = JSON.parse(safeStorageGet(INSTALL_ANALYTICS_KEY) || '[]');
        events.push({ type, timestamp: Date.now() });
        safeStorageSet(INSTALL_ANALYTICS_KEY, JSON.stringify(events.slice(-INSTALL_ANALYTICS_MAX_EVENTS)));
    } catch { /* localStorage unavailable */ }
}
function getWasPreviouslyInstalled() {
    try {
        const events = JSON.parse(safeStorageGet(INSTALL_ANALYTICS_KEY) || '[]');
        return events.some(e => e.type === 'installed' || e.type === 'installed-via-browser');
    } catch { return false; }
}

// ── State ──
let deferredInstallPrompt = null;
let updateSW = null;
let updateInterval = null;
let _installReady = false;
let _updateAvailable = false;
let _isChecking = false;
// Requirement: Only reload on controllerchange when user initiated the update
// Pattern from: synctone usePWAUpdate.ts, few-lap usePWAUpdate.ts
let _userClickedUpdate = false;

const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;

// ── Browser detection ──

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
                // Requirement: Warn about Chrome 90-day cooldown after dismissing install prompt
                // Pattern from: few-lap InstallInstructionsModal.tsx
                note: !deferredInstallPrompt && supportsNativeInstall()
                    ? 'If the install option doesn\u2019t appear, you may have previously dismissed it. Chrome hides the prompt for 90 days after dismissal. Try the browser menu instead.'
                    : undefined,
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

// ── Install: Prompt handling ──

// Requirement: Capture beforeinstallprompt even if it fires before this module loads
// Approach: 2-layer capture — inline <script> in index.html + module-level consumer here.
//   few-lap uses 3 layers (HTML, _layout.tsx module scope, useEffect) because Expo's Metro
//   bundler loads modules later than Vite. Vite modules load faster so 2 layers suffice:
//   the inline script catches the event pre-module-load, and the addEventListener below
//   catches first-visit events that fire after module load.
// Alternatives:
//   - Only listen here: Rejected — module scripts load async; on cached SW visits
//     the event fires before any module executes (see glow-props CLAUDE.md pattern)
//   - Only use inline script: Rejected — need React integration via custom events
//   - 3-layer capture (few-lap pattern): Rejected — unnecessary with Vite's faster module loading
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

// Requirement: Set diagnostic flag so hooks/debug can check if event was ever received
// Pattern from: few-lap +html.tsx (__pwaPromptReceived)
// Note: The inline script in index.html also sets this (for pre-module-load events).
//       This listener covers events that fire after module load.
window.addEventListener('beforeinstallprompt', () => {
    window.__pwaPromptReceived = true;
});

window.addEventListener('appinstalled', () => {
    deferredInstallPrompt = null;
    _installReady = false;
    safeStorageSet('pwaInstalled', 'true');
    trackInstallEvent('installed');
    window.dispatchEvent(new CustomEvent('pwa-installed'));
});

// Requirement: Detect browser-menu installs (user installs via browser UI, not our prompt)
// Approach: Watch display-mode: standalone media query changes. When it switches to true,
//   the user installed via the browser menu (not beforeinstallprompt). Track the event
//   and update state.
// Pattern from: few-lap usePWAInstall.ts (mediaQuery.addEventListener)
if (!isStandalone) {
    const standaloneQuery = window.matchMedia('(display-mode: standalone)');
    standaloneQuery.addEventListener('change', (e) => {
        if (e.matches) {
            deferredInstallPrompt = null;
            _installReady = false;
            safeStorageSet('pwaInstalled', 'true');
            trackInstallEvent('installed-via-browser');
            window.dispatchEvent(new CustomEvent('pwa-installed'));
        }
    });
}

// Requirement: Diagnostic timeout — warn if beforeinstallprompt hasn't fired after 5s on Chromium
// Approach: On Chromium browsers, if no prompt received after timeout, log diagnostic info
//   to the debug pill. Helps debug "why isn't install showing?" without needing DevTools.
// Pattern from: few-lap usePWAInstall.ts (5s diagnostic)
if (supportsNativeInstall() && !earlyCaptured && !window.__pwaPromptReceived && !isStandalone) {
    setTimeout(() => {
        if (window.__pwaPromptReceived || deferredInstallPrompt) return;
        const hasManifest = !!document.querySelector('link[rel="manifest"]');
        const swControlled = !!navigator.serviceWorker?.controller;
        const msg = `No beforeinstallprompt after ${INSTALL_DIAGNOSTIC_TIMEOUT_MS / 1000}s`;
        debugAdd('pwa', 'warn', msg, { manifest: hasManifest, swControlled, standalone: isStandalone });
    }, INSTALL_DIAGNOSTIC_TIMEOUT_MS);
}

/**
 * Trigger native install prompt (Chromium) or return false if unavailable.
 * Returns true if the prompt was shown, false if caller should show manual instructions.
 */
export async function installPWA() {
    if (deferredInstallPrompt) {
        trackInstallEvent('prompted');
        deferredInstallPrompt.prompt();
        const { outcome } = await deferredInstallPrompt.userChoice;
        trackInstallEvent(outcome === 'accepted' ? 'installed' : 'dismissed');
        deferredInstallPrompt = null;
        // Return true = prompt was shown (regardless of user choice).
        // Callers use false to decide whether to show manual install instructions.
        return true;
    }
    return false;
}

/** Current PWA state — safe to call at any time, no race conditions. */
export function getPWAState() {
    return {
        installReady: _installReady,
        updateAvailable: _updateAvailable,
        isChecking: _isChecking,
    };
}

/** Whether the app is running as an installed PWA */
export function isInstalledPWA() {
    return isStandalone || safeStorageGet('pwaInstalled') === 'true' || getWasPreviouslyInstalled();
}

/** Whether the app is running in standalone mode */
export function isStandaloneMode() {
    return isStandalone;
}

/**
 * Dismiss the install prompt — persists to localStorage so it doesn't reappear.
 * Pattern from: few-lap usePWAInstall.ts (dismiss)
 */
export function dismissInstall() {
    _installReady = false;
    safeStorageSet('pwa-install-dismissed', 'true');
    trackInstallEvent('user-dismissed');
    window.dispatchEvent(new CustomEvent('pwa-install-ready'));
}

/** Whether the user has previously dismissed the install prompt */
export function isInstallDismissed() {
    return safeStorageGet('pwa-install-dismissed') === 'true';
}

/**
 * Apply the pending update — activates the new SW and reloads.
 * Requirement: User-controlled update flow — only reload when user clicks
 * Approach: Set _userClickedUpdate flag before calling updateSW(true), which
 *   sends SKIP_WAITING to the waiting SW. The controllerchange listener checks
 *   this flag before reloading. Marks sessionStorage so the next page load
 *   suppresses false re-detection for 30 seconds.
 * Pattern from: synctone usePWAUpdate.ts, few-lap usePWAUpdate.ts
 */
export function applyUpdate() {
    if (updateSW) {
        _userClickedUpdate = true;
        safeSessionSet('pwa-just-updated', String(Date.now()));
        storeCurrentBuildTime();
        updateSW(true);
    }
}

/**
 * Dismiss the update prompt without applying.
 * Requirement: Let users close the update banner without reloading
 * Pattern from: few-lap usePWAUpdate.ts (dismiss)
 */
export function dismissUpdate() {
    _updateAvailable = false;
    window.dispatchEvent(new CustomEvent('pwa-update-dismissed'));
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
 * Requirement: Explicitly check for SW updates and surface waiting workers
 * Approach: Call reg.update(), then wait for the async update process to
 *   complete before checking reg.waiting/reg.installing. Without the settle delay,
 *   the check can miss updates that are still being fetched/installed.
 * Pattern from: synctone usePWAUpdate.ts, few-lap usePWAUpdate.ts
 * Returns: 'update-found' | 'up-to-date' | 'no-sw' | 'error'
 */
export async function checkForUpdate() {
    if (!('serviceWorker' in navigator)) return 'no-sw';
    _isChecking = true;
    window.dispatchEvent(new CustomEvent('pwa-checking-update'));
    try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (!reg) { _isChecking = false; return 'no-sw'; }
        await reg.update();
        // Settle delay — the update process is async and reg.waiting/reg.installing
        // may not be populated immediately after reg.update() resolves
        await new Promise(r => setTimeout(r, UPDATE_SETTLE_DELAY_MS));
        if (reg.waiting || reg.installing) {
            _updateAvailable = true;
            window.dispatchEvent(new CustomEvent('pwa-update-available'));
            return 'update-found';
        }
        return 'up-to-date';
    } catch {
        return 'error';
    } finally {
        _isChecking = false;
        window.dispatchEvent(new CustomEvent('pwa-checking-update'));
    }
}

// ── SW registration ──

// Register the service worker via vite-plugin-pwa virtual module.
updateSW = registerSW({
    onNeedRefresh() {
        // Suppress false re-detection in the 30s window after a user-initiated update
        if (wasJustUpdated()) return;
        _updateAvailable = true;
        window.dispatchEvent(new CustomEvent('pwa-update-available'));
    },
    onOfflineReady() {
        window.dispatchEvent(new CustomEvent('pwa-offline-ready'));
        // Requirement: Auto-dismiss offline-ready after 3s — transient notification
        // Pattern from: few-lap usePWAUpdate.ts (offlineReady auto-dismiss)
        setTimeout(() => {
            window.dispatchEvent(new CustomEvent('pwa-offline-dismissed'));
        }, OFFLINE_READY_DISMISS_MS);
    },
    onRegisteredSW(swUrl, registration) {
        if (registration) {
            // Hourly: check both SW updates and version.json
            updateInterval = setInterval(() => {
                registration.update();
                checkVersionJson();
            }, SW_UPDATE_CHECK_INTERVAL_MS);
        }
        // Initial version check on startup (deferred so it doesn't block rendering)
        setTimeout(() => checkVersionJson(), VERSION_CHECK_STARTUP_DELAY_MS);
    },
    onRegisterError(error) {
        debugAdd('pwa', 'error', 'Service worker registration failed: ' + error.message, {
            stack: error.stack,
        });
    }
});

// ── controllerchange ──

// Requirement: Only reload on controllerchange when the user initiated the update
// Approach: Check _userClickedUpdate flag before reloading. Background SW lifecycle
//   events (browser auto-update, visibility check) should NOT cause surprise reloads
//   while the user is mid-analysis. The user triggers reload via applyUpdate() which
//   sets the flag, sends SKIP_WAITING, and the controllerchange handler reloads.
// Pattern from: synctone usePWAUpdate.ts, few-lap usePWAUpdate.ts
// Alternatives considered:
//   - Always reload on controllerchange: Rejected — causes surprise reloads during use
//   - Never reload: Rejected — user would need to manually refresh after clicking update
let refreshing = false;
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        if (!_userClickedUpdate) return;
        refreshing = true;
        window.location.reload();
    });
}

// ── Visibility change ──

// Requirement: Surface waiting SW updates on tab focus and manual refresh
// Approach: On visibilitychange, call reg.update() and after a settle delay check
//   for waiting/installing workers. The onNeedRefresh callback from registerSW only
//   fires once during setup — separate reg.update() calls won't re-trigger it, so
//   we need to dispatch the event manually if a waiting worker is found.
// Pattern from: synctone usePWAUpdate.ts (visibility + settle), few-lap usePWAUpdate.ts
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
        if (wasJustUpdated()) return;
        navigator.serviceWorker.getRegistration().then(reg => {
            if (!reg) return;
            reg.update();
            setTimeout(() => {
                if (reg.waiting && !_updateAvailable) {
                    _updateAvailable = true;
                    window.dispatchEvent(new CustomEvent('pwa-update-available'));
                }
            }, UPDATE_SETTLE_DELAY_MS);
        }).catch(err => {
            console.warn('Failed to check for SW updates:', err.message || err);
        });
    }
});
