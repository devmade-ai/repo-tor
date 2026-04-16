/**
 * Per-browser PWA install instructions + browser-detection helpers.
 *
 * Requirement: The InstallInstructionsModal shows step-by-step install
 *   guidance when the native `beforeinstallprompt` isn't available. The
 *   instructions must match each browser's actual UI (Safari → Share →
 *   "Add to Home Screen"; Chrome → address bar icon; Firefox desktop →
 *   "not supported"). The data is pure text — no React, no DOM — so it
 *   was extracted from `dashboard/js/pwa.js` on 2026-04-15 to keep both
 *   files under the 500-line soft-limit.
 *
 * Approach: One `getBrowserInfo()` detector that returns `{ browser,
 *   platform }`, three capability checkers (`supportsNativeInstall`,
 *   `supportsManualInstall`, `getInstallInstructions`). Data-driven:
 *   the modal renders whatever `getInstallInstructions()` returns — adding
 *   a browser is one switch case.
 *
 * Alternatives:
 *   - Inline in pwa.js: Previous state, pushed pwa.js to 578 lines.
 *   - Inline in Header.jsx or InstallInstructionsModal.jsx: Rejected —
 *     both are already near their own line-count ceilings.
 *   - npm package for browser detection (bowser, ua-parser-js): Rejected
 *     — adds dependency for ~30 lines of regex the glow-props pattern
 *     already handles, and the detection here is specific to PWA install
 *     capabilities rather than general browser identification.
 *
 * See: glow-props docs/implementations/PWA_SYSTEM.md
 */

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

/**
 * Returns browser-specific install instructions for the InstallInstructionsModal.
 * Data-driven: the modal renders whatever this returns — adding a browser is one switch case.
 * Returns { browser, steps, note? } matching the glow-props PWA_SYSTEM.md pattern.
 *
 * @param {{ hasDeferredPrompt: boolean }} options — pass `hasDeferredPrompt: false`
 *   when the native prompt has been consumed or never arrived (used for the Chrome
 *   90-day cooldown warning note).
 */
export function getInstallInstructions({ hasDeferredPrompt = false } = {}) {
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
                note: !hasDeferredPrompt && supportsNativeInstall()
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
