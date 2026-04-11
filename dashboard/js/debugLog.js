/**
 * In-memory debug logging with pub/sub for alpha diagnostics.
 *
 * Requirement: Structured debug event store with console interception and global error capture
 * Approach: Circular buffer with typed entries, console interception, global error capture.
 *   Subscribers get notified on every new entry. New subscribers receive current entries
 *   immediately on subscribe to eliminate timing bugs.
 * Alternatives:
 *   - External logging service: Rejected — adds dependency, network requirement
 *   - localStorage persistence: Rejected — fills storage, not needed for alpha
 *   - Plain string arrays: Rejected — Record<string, unknown> details enable filtering
 *
 * See: glow-props docs/implementations/DEBUG_SYSTEM.md
 */

const MAX_ENTRIES = 200;
let nextId = 0;
const entries = [];
const subscribers = new Set();

/**
 * Add a structured debug entry.
 *
 * @param {string} source — origin of the event (e.g. 'boot', 'pwa', 'render', 'global')
 * @param {'info'|'success'|'warn'|'error'} severity
 * @param {string} event — what happened
 * @param {Record<string, unknown>} [details] — structured metadata
 */
export function debugAdd(source, severity, event, details) {
    const entry = {
        id: nextId++,
        timestamp: Date.now(),
        source,
        severity,
        event,
        details,
    };
    entries.push(entry);
    if (entries.length > MAX_ENTRIES) entries.shift();
    subscribers.forEach((fn) => {
        try { fn(entry); } catch { /* subscriber error must not break logging */ }
    });
}

/** Return a shallow copy of all current entries. */
export function debugGetEntries() {
    return [...entries];
}

/** Clear all entries from the buffer. */
export function debugClear() {
    entries.length = 0;
}

/**
 * Subscribe to new debug entries. The callback receives each new entry.
 * New subscribers immediately receive all current entries — eliminates timing
 * bugs where a subscriber misses entries logged before it subscribed.
 *
 * @param {(entry: object) => void} fn
 * @returns {() => void} unsubscribe function
 */
export function debugSubscribe(fn) {
    subscribers.add(fn);
    entries.forEach((entry) => {
        try { fn(entry); } catch { /* ignore */ }
    });
    return () => subscribers.delete(fn);
}

// --- Report generation ---
// Lives in the module, not the pill component — reusable by any consumer.

function getEnvironment() {
    return {
        standalone: window.matchMedia('(display-mode: standalone)').matches
            || window.navigator.standalone === true,
        swSupport: 'serviceWorker' in navigator,
    };
}

/**
 * Generate a full debug report suitable for sharing.
 * URL query params are redacted to prevent token/UTM leaking.
 */
export function debugGenerateReport() {
    const env = getEnvironment();
    const lines = [
        '=== Debug Report ===',
        '',
        '--- Environment ---',
        // Requirement: Redact query params to prevent token/UTM leaking when users share reports
        // Approach: Replace search string with [redacted] if present
        `URL: ${window.location.origin}${window.location.pathname}${window.location.search ? '?[redacted]' : ''}`,
        `User Agent: ${navigator.userAgent}`,
        `Screen: ${screen.width}x${screen.height}`,
        `Viewport: ${innerWidth}x${innerHeight}`,
        `Online: ${navigator.onLine}`,
        `Protocol: ${location.protocol}`,
        `Standalone: ${env.standalone}`,
        `SW Support: ${env.swSupport}`,
        `Timestamp: ${new Date().toISOString()}`,
        '',
        '--- Log ---',
        ...entries.map((e) => {
            const t = new Date(e.timestamp);
            const ts = `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}.${String(t.getMilliseconds()).padStart(3, '0')}`;
            const detail = e.details ? ` | ${JSON.stringify(e.details)}` : '';
            return `[${ts}] [${e.severity.toUpperCase()}] [${e.source}] ${e.event}${detail}`;
        }),
    ];
    return lines.join('\n');
}

// --- Console interception ---
// Requirement: Capture React warnings, library errors, and any console output automatically
// Approach: Patch console.error and console.warn at module load time. Original methods are
//   preserved and called first so DevTools output is unchanged.
// HMR guard: Without this, each Vite hot reload re-captures the already-patched console
//   methods as "originals," creating nested wrapper chains. After N reloads, each
//   console.error call produces N debug entries. The guard ensures patching happens once.
// Alternatives:
//   - Explicit debugAdd calls everywhere: Rejected — misses third-party library errors
//   - window.onerror only: Rejected — doesn't capture console.warn (React warnings)
if (!window.__debugConsolePatched) {
    window.__debugConsolePatched = true;
    const originalError = console.error;
    const originalWarn = console.warn;

    console.error = (...args) => {
        originalError.apply(console, args);
        debugAdd('global', 'error', args.map(String).join(' '));
    };

    console.warn = (...args) => {
        originalWarn.apply(console, args);
        debugAdd('global', 'warn', args.map(String).join(' '));
    };
}

// --- Global error capture ---
// Requirement: Capture crashes before React mounts
// Approach: window.error and unhandledrejection listeners installed at module load time.
//   HMR guard prevents duplicate listeners during development.
if (!window.__debugLogListenersAttached) {
    window.__debugLogListenersAttached = true;

    window.addEventListener('error', (e) => {
        debugAdd('global', 'error', e.message || 'Unknown error', {
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno,
        });
    });

    window.addEventListener('unhandledrejection', (e) => {
        debugAdd('global', 'error', `Unhandled rejection: ${e.reason}`);
    });
}

// --- Bridge pre-existing inline pill errors ---
// Requirement: Ingest errors captured by the inline <script> in index.html before this
//   module loaded. The inline pill stores errors as {time, message, stack} in window.__debugErrors.
// Approach: Convert each to a debugLog entry so they appear in the React DebugPill.
if (Array.isArray(window.__debugErrors) && window.__debugErrors.length > 0) {
    window.__debugErrors.forEach((err) => {
        debugAdd('boot', 'error', err.message || 'Unknown pre-React error', {
            stack: err.stack,
            capturedAt: err.time,
        });
    });
}

// Override the inline pill's push function so any future callers (that haven't been
// updated to import debugAdd directly) still route through debugLog.
window.__debugPushError = function (msg, stack) {
    debugAdd('global', 'error', msg, stack ? { stack } : undefined);
};
