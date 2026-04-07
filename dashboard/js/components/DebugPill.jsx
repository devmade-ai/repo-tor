import React, { useState, useEffect, useRef, useCallback } from 'react';
import { debugGetEntries, debugSubscribe, debugClear, debugGenerateReport } from '../debugLog.js';
import { getPWAState, isInstalledPWA, isStandaloneMode } from '../pwa.js';

/**
 * React-based debug pill — renders in a separate React root (#debug-root) so it
 * survives App crashes. Replaces the inline HTML pill after React mounts.
 *
 * Requirement: Post-mount debug UI with structured log, environment info, and PWA diagnostics
 * Approach: Separate React root (not inside App tree), 3 tabs, pub/sub to debugLog module.
 *   Inline HTML pill handles pre-React; this handles post-mount. Handoff via
 *   window.__debugReactPillMounted flag.
 * Alternatives:
 *   - Enhance inline pill with more features: Rejected — vanilla JS DOM manipulation
 *     becomes unmaintainable for tabbed UI with subscriptions
 *   - Render inside App tree: Rejected — App crash takes down debug UI, which is
 *     exactly when you need it most
 * See docs/implementations/DEBUG_SYSTEM.md
 */

const TABS = ['Log', 'Environment', 'PWA'];

/**
 * Copy text to clipboard with fallbacks.
 * Requirement: Clipboard must work across browsers including those without
 *   Clipboard API support (older Safari, sandboxed iframes).
 * Approach: Try ClipboardItem Blob first (preserves formatting), then writeText,
 *   then textarea fallback (works in all browsers including sandboxed contexts).
 * Alternatives:
 *   - writeText only: Rejected — fails in some sandboxed iframes and older browsers
 *   - execCommand only: Rejected — deprecated, but needed as last-resort fallback
 */
async function copyToClipboard(text) {
    // Attempt 1: ClipboardItem with Blob (best — preserves MIME type)
    if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        try {
            const blob = new Blob([text], { type: 'text/plain' });
            await navigator.clipboard.write([new ClipboardItem({ 'text/plain': blob })]);
            return true;
        } catch { /* fall through */ }
    }
    // Attempt 2: writeText (simpler API, widely supported)
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch { /* fall through */ }
    }
    // Attempt 3: textarea fallback (works in sandboxed contexts)
    try {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.style.cssText = 'position:fixed;left:-9999px;top:-9999px;opacity:0';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
        return true;
    } catch {
        return false;
    }
}

// ── Tab Components ──

function LogTab({ entries }) {
    const logRef = useRef(null);

    // Auto-scroll to bottom when new entries arrive
    useEffect(() => {
        if (logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [entries.length]);

    if (entries.length === 0) {
        return <div className="debug-tab-empty">No log entries</div>;
    }

    return (
        <div ref={logRef} className="debug-log-scroll">
            {entries.map(e => {
                const time = e.timestamp.split('T')[1]?.replace('Z', '').slice(0, 12) || e.timestamp;
                return (
                    <div key={e.id} className={`debug-log-entry debug-severity-${e.severity}`}>
                        <span className="debug-log-time">{time}</span>
                        <span className={`debug-log-source debug-source-${e.source}`}>{e.source}</span>
                        <span className="debug-log-event">{e.event}</span>
                        {e.details && Object.entries(e.details).map(([k, v]) => (
                            <div key={k} className="debug-log-detail">
                                <span className="debug-log-detail-key">{k}:</span> {v}
                            </div>
                        ))}
                    </div>
                );
            })}
        </div>
    );
}

function EnvironmentTab() {
    const sw = 'serviceWorker' in navigator;
    const ctrl = navigator.serviceWorker?.controller ? 'active' : 'none';
    const standalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;

    const rows = [
        ['Network', navigator.onLine ? 'Online' : 'OFFLINE'],
        ['Protocol', window.location.protocol],
        ['Screen', `${screen.width}x${screen.height} @ ${window.devicePixelRatio}x`],
        ['Viewport', `${window.innerWidth}x${window.innerHeight}`],
        ['Theme', document.documentElement.classList.contains('dark') ? 'Dark' : 'Light'],
        ['Service Worker', sw ? 'Supported' : 'Not supported'],
        ['SW Controller', ctrl],
        ['Standalone', String(standalone)],
        ['React Mounted', String(!!window.__debugReactMounted)],
        ['User Agent', navigator.userAgent],
    ];

    return (
        <div className="debug-env-grid">
            {rows.map(([label, value]) => (
                <React.Fragment key={label}>
                    <span className="debug-env-label">{label}</span>
                    <span className="debug-env-value">{value}</span>
                </React.Fragment>
            ))}
        </div>
    );
}

function PWATab() {
    const pwaState = getPWAState();
    const installed = isInstalledPWA();
    const standalone = isStandaloneMode();
    const promptReceived = !!window.__pwaPromptReceived;

    let buildTime = 'Unknown';
    try {
        const stored = localStorage.getItem('pwa-build-time');
        if (stored) buildTime = new Date(Number(stored)).toLocaleString();
    } catch { /* localStorage unavailable */ }

    let installEvents = [];
    try {
        installEvents = JSON.parse(localStorage.getItem('pwa-install-analytics') || '[]');
    } catch { /* localStorage unavailable */ }

    const rows = [
        ['Install Ready', String(pwaState.installReady)],
        ['Update Available', String(pwaState.updateAvailable)],
        ['Checking Update', String(pwaState.isChecking)],
        ['Installed', String(installed)],
        ['Standalone', String(standalone)],
        ['Prompt Received', String(promptReceived)],
        ['Build Time', buildTime],
    ];

    return (
        <div>
            <div className="debug-env-grid">
                {rows.map(([label, value]) => (
                    <React.Fragment key={label}>
                        <span className="debug-env-label">{label}</span>
                        <span className="debug-env-value">{value}</span>
                    </React.Fragment>
                ))}
            </div>
            {installEvents.length > 0 && (
                <div className="debug-pwa-events">
                    <div className="debug-pwa-events-title">Install History ({installEvents.length})</div>
                    {installEvents.slice(-10).reverse().map((evt, i) => (
                        <div key={i} className="debug-log-entry debug-severity-info">
                            <span className="debug-log-time">
                                {new Date(evt.timestamp).toLocaleString()}
                            </span>
                            <span className="debug-log-event">{evt.type}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Main DebugPill Component ──

export default function DebugPill() {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    const [entries, setEntries] = useState(debugGetEntries);
    const [copyFeedback, setCopyFeedback] = useState('');

    // Subscribe to debugLog changes
    useEffect(() => {
        return debugSubscribe((newEntries) => {
            setEntries(newEntries.slice());
        });
    }, []);

    const errorCount = entries.filter(e => e.severity === 'error').length;
    const warnCount = entries.filter(e => e.severity === 'warn').length;

    const handleCopy = useCallback(async () => {
        try {
            const report = debugGenerateReport();
            const ok = await copyToClipboard(report);
            setCopyFeedback(ok ? 'Copied!' : 'Failed');
        } catch {
            setCopyFeedback('Failed');
        }
        setTimeout(() => setCopyFeedback(''), 1500);
    }, []);

    const handleClear = useCallback(() => {
        debugClear();
    }, []);

    if (!expanded) {
        // Collapsed pill badge
        return (
            <div className="debug-pill-container">
                <button
                    type="button"
                    className={`debug-pill-badge ${errorCount > 0 ? 'debug-pill-error' : warnCount > 0 ? 'debug-pill-warn' : 'debug-pill-ok'}`}
                    onClick={() => setExpanded(true)}
                    aria-label={`Debug: ${entries.length} entries, ${errorCount} errors`}
                >
                    <span className="debug-pill-label">dbg</span>
                    <span className="debug-pill-count">{entries.length}</span>
                    {errorCount > 0 && <span className="debug-pill-error-badge">{errorCount}</span>}
                    {warnCount > 0 && <span className="debug-pill-warn-badge">{warnCount}</span>}
                </button>
            </div>
        );
    }

    // Expanded panel
    return (
        <div className="debug-panel">
            <div className="debug-panel-header">
                <div className="debug-panel-tabs">
                    {TABS.map((tab, i) => (
                        <button
                            key={tab}
                            type="button"
                            className={`debug-panel-tab ${i === activeTab ? 'debug-panel-tab-active' : ''}`}
                            onClick={() => setActiveTab(i)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div className="debug-panel-actions">
                    <button
                        type="button"
                        className="debug-panel-btn"
                        onClick={handleCopy}
                    >
                        {copyFeedback || 'Copy'}
                    </button>
                    {activeTab === 0 && (
                        <button
                            type="button"
                            className="debug-panel-btn"
                            onClick={handleClear}
                        >
                            Clear
                        </button>
                    )}
                    <button
                        type="button"
                        className="debug-panel-btn"
                        onClick={() => setExpanded(false)}
                    >
                        Close
                    </button>
                </div>
            </div>
            <div className="debug-panel-body">
                {activeTab === 0 && <LogTab entries={entries} />}
                {activeTab === 1 && <EnvironmentTab />}
                {activeTab === 2 && <PWATab />}
            </div>
        </div>
    );
}
