/**
 * PWA configuration constants.
 *
 * Requirement: Centralize timing and threshold constants scattered in pwa.js
 * Approach: Single file for all PWA-related constants. Components and pwa.js
 *   import from here instead of hardcoding values.
 * Pattern from: few-lap src/constants/config.ts, synctone same
 */

/** Service worker update check interval (ms) — 60 minutes */
export const SW_UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/** Suppress false "update available" re-detection for this duration after
 *  applying an update (ms). The browser's SW lifecycle takes time to settle
 *  after reload — a waiting worker may still appear during this window. */
export const JUST_UPDATED_SUPPRESS_MS = 30_000;

/** Delay before checking reg.waiting after reg.update() resolves (ms).
 *  The update process is async — reg.waiting may not be populated immediately. */
export const UPDATE_SETTLE_DELAY_MS = 1500;

/** Delay before initial version.json check on startup (ms).
 *  Deferred so it doesn't block initial rendering. */
export const VERSION_CHECK_STARTUP_DELAY_MS = 3000;

/** Duration to show the "offline ready" notification before auto-dismiss (ms).
 *  Pattern from: few-lap usePWAUpdate.ts — transient, not persistent UI. */
export const OFFLINE_READY_DISMISS_MS = 3000;

/** Diagnostic timeout: warn in debug log if beforeinstallprompt hasn't fired
 *  on Chromium after this delay (ms). Helps debug install issues.
 *  Pattern from: few-lap usePWAInstall.ts */
export const INSTALL_DIAGNOSTIC_TIMEOUT_MS = 5000;

/** Maximum number of install analytics events to keep in localStorage.
 *  Pattern from: few-lap usePWAInstall.ts (last 50 events) */
export const INSTALL_ANALYTICS_MAX_EVENTS = 50;
