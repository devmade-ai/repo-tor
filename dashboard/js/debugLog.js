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
 * @param {number} [timestamp] — override timestamp (epoch ms). Used by the pre-React
 *   error bridge to preserve original error times. Defaults to Date.now().
 */
export function debugAdd(source, severity, event, details, timestamp) {
    const entry = {
        id: nextId++,
        timestamp: timestamp || Date.now(),
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

/** Clear all entries from the buffer. */
export function debugClear() {
    entries.length = 0;
}

/** Return a shallow copy of the current entries (read-only snapshot). */
export function debugGetEntries() {
    return entries.slice();
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

// --- Shared helpers ---
// Exported for use by DebugPill (avoids duplicating formatting logic).

/** Format epoch ms as HH:MM:SS.mmm */
export function formatDebugTime(ts) {
    const t = new Date(ts);
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}.${String(t.getMilliseconds()).padStart(3, '0')}`;
}

/** Safe JSON.stringify — returns fallback on circular references or throwing values. */
export function safeStringify(obj) {
    try { return JSON.stringify(obj); }
    catch { return '[unserializable]'; }
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
            const detail = e.details ? ` | ${safeStringify(e.details)}` : '';
            return `[${formatDebugTime(e.timestamp)}] [${e.severity.toUpperCase()}] [${e.source}] ${e.event}${detail}`;
        }),
    ];
    return lines.join('\n');
}

// --- HMR cleanup wiring ---
// Requirement: When Vite hot-reloads this module, every listener and console
//   patch installed by the previous instance must be released before the new
//   instance attaches its own. Without explicit dispose, listeners and patched
//   console methods accumulate across hot-reloads (the existing window-flag
//   guards prevent double-attach but never release the originals).
// Approach: Module-level AbortController for the two window listeners +
//   captured original console methods + an import.meta.hot.dispose block that
//   aborts, restores, and clears the window guards so the next module load
//   re-runs the attach paths cleanly.
// Alternatives:
//   - Per-listener removeEventListener with named handlers: Rejected — more
//     boilerplate, error-prone if a handler is missed.
//   - Skip dispose, rely on guards alone: Rejected — guards prevent double
//     attach on the SAME page lifecycle, but stale handlers from the old
//     module instance keep firing into the dead module's closure.
const debugAbortController = new AbortController();
let originalConsoleError = null;
let originalConsoleWarn = null;

// --- Console interception ---
// Requirement: Capture React warnings, library errors, and any console output automatically
// Approach: Patch console.error and console.warn at module load time. Original methods are
//   preserved and called first so DevTools output is unchanged.
// HMR guard: belt-and-suspenders with the dispose block above — guard prevents
//   double-attach if dispose ever misfires, dispose actively unpatches on hot-reload.
// Alternatives:
//   - Explicit debugAdd calls everywhere: Rejected — misses third-party library errors
//   - window.onerror only: Rejected — doesn't capture console.warn (React warnings)
if (!window.__debugConsolePatched) {
    window.__debugConsolePatched = true;
    originalConsoleError = console.error;
    originalConsoleWarn = console.warn;

    function safeString(val) {
        try { return String(val); } catch { return '[unstringifiable]'; }
    }

    console.error = (...args) => {
        originalConsoleError.apply(console, args);
        debugAdd('global', 'error', args.map(safeString).join(' '));
    };

    console.warn = (...args) => {
        originalConsoleWarn.apply(console, args);
        debugAdd('global', 'warn', args.map(safeString).join(' '));
    };
}

// --- Global error capture ---
// Requirement: Capture crashes before React mounts
// Approach: window.error and unhandledrejection listeners installed at module load time.
//   AbortController signal removes them on HMR dispose; window guard prevents
//   double-attach if dispose ever misfires.
if (!window.__debugLogListenersAttached) {
    window.__debugLogListenersAttached = true;

    window.addEventListener('error', (e) => {
        debugAdd('global', 'error', e.message || 'Unknown error', {
            filename: e.filename,
            lineno: e.lineno,
            colno: e.colno,
        });
    }, { signal: debugAbortController.signal });

    window.addEventListener('unhandledrejection', (e) => {
        debugAdd('global', 'error', `Unhandled rejection: ${e.reason}`);
    }, { signal: debugAbortController.signal });
}

// --- Bridge pre-existing inline pill errors ---
// Requirement: Ingest errors captured by the inline <script> in index.html before this
//   module loaded. The inline pill stores errors as {time, message, stack} in window.__debugErrors.
//   time is numeric epoch (Date.now()) so we can preserve the original error timestamp.
// Approach: Call debugAdd with the optional timestamp parameter to preserve original times.
//   No subscribers exist at module load time — DebugPill subscribes later and receives
//   these entries via the subscription replay mechanism.
if (Array.isArray(window.__debugErrors) && window.__debugErrors.length > 0) {
    window.__debugErrors.forEach((err) => {
        const ts = typeof err.time === 'number' ? err.time : undefined;
        debugAdd('boot', 'error', err.message || 'Unknown pre-React error',
            err.stack ? { stack: err.stack } : undefined, ts);
    });
}

// Override the inline pill's push function so any future callers (that haven't been
// updated to import debugAdd directly) still route through debugLog.
window.__debugPushError = function (msg, stack) {
    debugAdd('global', 'error', msg, stack ? { stack } : undefined);
};

// HMR teardown: release listeners, restore console, clear guards. Runs before
// the new module instance loads, so the new instance starts from a clean slate.
if (import.meta.hot) {
    import.meta.hot.dispose(() => {
        debugAbortController.abort();
        if (originalConsoleError) console.error = originalConsoleError;
        if (originalConsoleWarn) console.warn = originalConsoleWarn;
        delete window.__debugConsolePatched;
        delete window.__debugLogListenersAttached;
    });
}

