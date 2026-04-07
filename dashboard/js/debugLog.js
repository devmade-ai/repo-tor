/**
 * Debug log module — typed pub/sub event store for runtime diagnostics.
 *
 * Requirement: Centralized debug event system that both inline HTML pill and
 *   React DebugPill can consume, replacing the simple {time, message, stack} array.
 * Approach: In-memory circular buffer with pub/sub. Structured entries include
 *   source, severity, and optional details. Subscribers are notified on add/clear.
 * Alternatives:
 *   - Keep using window.__debugErrors array: Rejected — no structure, no pub/sub,
 *     tightly coupled to inline pill's DOM rendering
 *   - External logging library (Sentry, LogRocket): Rejected — adds dependency,
 *     overkill for alpha-phase diagnostic tool
 *   - localStorage persistence: Rejected — debug data is transient, persistence
 *     wastes space and creates stale data
 */

const MAX_ENTRIES = 200;

let nextId = 1;
const entries = [];
const subscribers = new Set();

/**
 * @typedef {'boot'|'react'|'pwa'|'network'|'console'|'global'} DebugSource
 * @typedef {'info'|'success'|'warn'|'error'} DebugSeverity
 * @typedef {{
 *   id: number,
 *   timestamp: string,
 *   source: DebugSource,
 *   severity: DebugSeverity,
 *   event: string,
 *   details: Record<string, string>|null
 * }} DebugEntry
 */

/**
 * Add an entry to the debug log. Notifies all subscribers.
 * @param {DebugSource} source - Origin of the event
 * @param {DebugSeverity} severity - Severity level
 * @param {string} event - Human-readable description
 * @param {Record<string, string>} [details] - Optional key-value pairs (e.g. stack trace)
 */
export function debugAdd(source, severity, event, details = null) {
    if (entries.length >= MAX_ENTRIES) entries.shift();
    const entry = {
        id: nextId++,
        timestamp: new Date().toISOString(),
        source,
        severity,
        event,
        details,
    };
    entries.push(entry);
    for (const fn of subscribers) {
        try { fn(entries); } catch { /* subscriber errors must not break the log */ }
    }
}

/**
 * Subscribe to log changes. Called with current entries on add and clear.
 * @param {(entries: DebugEntry[]) => void} fn
 * @returns {() => void} Unsubscribe function
 */
export function debugSubscribe(fn) {
    subscribers.add(fn);
    return () => subscribers.delete(fn);
}

/**
 * Get a shallow copy of all current entries.
 * @returns {DebugEntry[]}
 */
export function debugGetEntries() {
    return entries.slice();
}

/**
 * Clear all entries. Notifies subscribers.
 */
export function debugClear() {
    entries.length = 0;
    for (const fn of subscribers) {
        try { fn(entries); } catch { /* subscriber errors must not break the log */ }
    }
}

/**
 * Redact URL query parameters to prevent leaking tokens, data paths,
 * or other sensitive values in debug reports.
 * Preserves parameter names but replaces values with [REDACTED].
 * @param {string} url
 * @returns {string}
 */
function redactQueryParams(url) {
    try {
        const parsed = new URL(url, window.location.origin);
        for (const key of parsed.searchParams.keys()) {
            parsed.searchParams.set(key, '[REDACTED]');
        }
        return parsed.toString();
    } catch {
        return url;
    }
}

/**
 * Generate a full debug report string for clipboard/sharing.
 * Includes environment info, PWA state, and all log entries.
 * URL query parameters are redacted to prevent leaking sensitive values.
 * @returns {string}
 */
export function debugGenerateReport() {
    const now = new Date().toISOString();
    const sw = 'serviceWorker' in navigator;
    const standalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    const ctrl = navigator.serviceWorker?.controller ? 'active' : 'none';

    const sections = [
        '=== Debug Report ===',
        `Generated: ${now}`,
        '',
        '--- Environment ---',
        `URL: ${redactQueryParams(window.location.href)}`,
        `User Agent: ${navigator.userAgent}`,
        `Screen: ${screen.width}x${screen.height} @ ${window.devicePixelRatio}x`,
        `Viewport: ${window.innerWidth}x${window.innerHeight}`,
        `Online: ${navigator.onLine}`,
        `Protocol: ${window.location.protocol}`,
        `Theme: ${document.documentElement.classList.contains('dark') ? 'dark' : 'light'}`,
        '',
        '--- PWA ---',
        `Service Worker support: ${sw}`,
        `SW controller: ${ctrl}`,
        `Standalone: ${standalone}`,
        `React mounted: ${!!window.__debugReactMounted}`,
    ];

    if (entries.length > 0) {
        sections.push('', '--- Log Entries ---');
        for (const e of entries) {
            const time = e.timestamp.split('T')[1]?.replace('Z', '') || e.timestamp;
            let line = `[${time}] [${e.source}/${e.severity}] ${e.event}`;
            if (e.details) {
                for (const [k, v] of Object.entries(e.details)) {
                    // Redact URLs in detail values (e.g. stack traces with query params)
                    const safe = k === 'url' ? redactQueryParams(v) : v;
                    line += `\n  ${k}: ${safe}`;
                }
            }
            sections.push(line);
        }
    } else {
        sections.push('', '--- Log: empty ---');
    }

    sections.push('', '=== End Report ===');
    return sections.join('\n');
}
