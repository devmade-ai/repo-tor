import React, { useState, useEffect, useRef, useCallback } from 'react';
import { debugGetEntries, debugSubscribe, debugClear, debugGenerateReport } from '../debugLog.js';
import { copyToClipboard } from '../copyToClipboard.js';

/**
 * React-based debug pill — renders in a separate React root (#debug-root).
 *
 * Requirement: Post-mount debug UI with structured log, environment info, and PWA diagnostics
 * Approach: Separate React root so it survives App crashes. Uses inline styles instead of
 *   Tailwind — survives stylesheet load failures since the pill runs in an isolated root.
 *   The existing inline pill in index.html handles pre-React; this handles post-mount.
 * Alternatives:
 *   - Render inside App tree: Rejected — pill dies when App crashes
 *   - Use Tailwind classes: Rejected — app CSS may not be loaded in isolated root
 *   - Single debug system: Rejected — need pre-React coverage that survives bundle failure
 *
 * See: glow-props docs/implementations/DEBUG_SYSTEM.md
 */

const MAX_ENTRIES = 200;
const TABS = ['Log', 'Environment', 'PWA'];

// Source color mapping for log entries
const SOURCE_COLORS = {
    pwa: '#2dd4bf',
    boot: '#a78bfa',
    render: '#60a5fa',
    global: '#f87171',
    api: '#fbbf24',
    auth: '#fb923c',
    db: '#34d399',
    form: '#c084fc',
};

const SEVERITY_COLORS = {
    info: '#94a3b8',
    success: '#4ade80',
    warn: '#fbbf24',
    error: '#f87171',
};

// --- Styles (inline — survives CSS load failures) ---
// Requirement: Debug pill must render correctly even when app CSS fails to load
// z-index 80 = --z-debug, hardcoded because CSS vars aren't available in isolated root

const styles = {
    pill: {
        position: 'fixed',
        bottom: '8px',
        right: '12px',
        zIndex: 80,
        fontFamily: 'monospace',
        fontSize: '10px',
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        background: 'rgba(30, 30, 30, 0.9)',
        border: '1px solid rgba(255,255,255,0.1)',
        borderRadius: '6px',
        padding: '4px 10px',
        color: '#94a3b8',
        backdropFilter: 'blur(8px)',
        userSelect: 'none',
    },
    badge: (color) => ({
        background: color,
        color: '#000',
        borderRadius: '3px',
        padding: '1px 5px',
        fontSize: '9px',
        fontWeight: 'bold',
        minWidth: '14px',
        textAlign: 'center',
    }),
    panel: {
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        zIndex: 80,
        maxHeight: '45vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        background: '#0f0f0f',
        borderTop: '2px solid #333',
        fontFamily: 'monospace',
        fontSize: '12px',
        color: '#d4d4d4',
    },
    header: {
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '6px 12px',
        background: '#1a1a1a',
        flexShrink: 0,
    },
    tabBar: {
        display: 'flex',
        gap: '0',
    },
    tab: (active) => ({
        padding: '4px 12px',
        background: active ? '#333' : 'transparent',
        color: active ? '#fff' : '#888',
        border: 'none',
        borderRadius: '4px 4px 0 0',
        cursor: 'pointer',
        fontSize: '11px',
        fontFamily: 'monospace',
    }),
    actions: {
        display: 'flex',
        gap: '6px',
    },
    btn: (color) => ({
        padding: '2px 10px',
        background: color,
        color: '#fff',
        border: 'none',
        borderRadius: '3px',
        cursor: 'pointer',
        fontSize: '11px',
        fontFamily: 'monospace',
    }),
    content: {
        overflow: 'auto',
        padding: '8px 12px',
        flex: 1,
    },
    logEntry: (severity) => ({
        padding: '2px 0',
        borderBottom: '1px solid #1a1a1a',
        color: SEVERITY_COLORS[severity] || '#94a3b8',
        wordBreak: 'break-word',
    }),
    timestamp: {
        color: '#666',
        marginRight: '6px',
    },
    sourceTag: (source) => ({
        color: SOURCE_COLORS[source] || '#94a3b8',
        marginRight: '6px',
    }),
    envRow: {
        padding: '3px 0',
        borderBottom: '1px solid #1a1a1a',
    },
    envLabel: {
        color: '#888',
        display: 'inline-block',
        width: '140px',
    },
    envValue: {
        color: '#d4d4d4',
    },
    diagRow: {
        padding: '4px 0',
        borderBottom: '1px solid #1a1a1a',
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
    },
    diagDot: (status) => ({
        width: '8px',
        height: '8px',
        borderRadius: '50%',
        background: status === 'pass' ? '#4ade80' : status === 'fail' ? '#f87171' : status === 'warn' ? '#fbbf24' : '#94a3b8',
        flexShrink: 0,
    }),
    diagLabel: {
        color: '#888',
        width: '120px',
        flexShrink: 0,
    },
    diagDetail: {
        color: '#d4d4d4',
    },
};

function formatTime(ts) {
    const t = new Date(ts);
    return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}:${String(t.getSeconds()).padStart(2, '0')}.${String(t.getMilliseconds()).padStart(3, '0')}`;
}

// --- PWA Diagnostics ---
// Requirement: Active health checks for diagnosing PWA issues at runtime
// Approach: Run live probes for HTTPS, SW state, manifest validation, standalone mode,
//   install prompt. Uses monotonic counter for stale-run cancellation.
// Alternatives:
//   - Static environment info only: Rejected — doesn't catch runtime issues
//   - External service: Rejected — adds dependency

function getBrowserName() {
    const ua = navigator.userAgent;
    if (/Edg\//i.test(ua)) return 'Edge';
    if (/Brave/i.test(ua) || (navigator.brave && navigator.brave.isBrave)) return 'Brave';
    if (/CriOS/i.test(ua)) return 'Chrome (iOS)';
    if (/FxiOS/i.test(ua)) return 'Firefox (iOS)';
    if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'Chrome';
    if (/Firefox/i.test(ua)) return 'Firefox';
    if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) return 'Safari';
    return 'Unknown';
}

async function runDiagnostics() {
    const results = [];

    // Sync checks
    results.push({
        label: 'Protocol',
        status: location.protocol === 'https:' || location.hostname === 'localhost' ? 'pass' : 'fail',
        detail: location.protocol,
    });
    results.push({
        label: 'Network',
        status: navigator.onLine ? 'pass' : 'warn',
        detail: navigator.onLine ? 'Online' : 'Offline',
    });
    results.push({
        label: 'SW Support',
        status: 'serviceWorker' in navigator ? 'pass' : 'fail',
        detail: 'serviceWorker' in navigator ? 'Supported' : 'Not supported',
    });

    // Async probes
    if ('serviceWorker' in navigator) {
        try {
            const reg = await navigator.serviceWorker.getRegistration('/');
            const state = reg?.active ? 'active' : reg?.waiting ? 'waiting' : reg?.installing ? 'installing' : 'none';
            results.push({ label: 'SW State', status: reg ? 'pass' : 'warn', detail: state });
        } catch (e) {
            results.push({ label: 'SW State', status: 'fail', detail: String(e) });
        }
    }

    // Manifest validation — spec requires icon sizes, start_url, id checks
    const manifestLink = document.querySelector('link[rel="manifest"]');
    if (manifestLink) {
        try {
            const res = await fetch(manifestLink.getAttribute('href') || '/manifest.json');
            const manifest = await res.json();
            const hasIcons = manifest.icons?.length > 0;
            const hasName = !!manifest.name;
            const iconSizes = manifest.icons?.map(i => i.sizes).join(', ') || 'none';
            const hasStartUrl = !!manifest.start_url;
            const hasId = !!manifest.id;
            const allGood = hasIcons && hasName && hasStartUrl;
            results.push({
                label: 'Manifest',
                status: allGood ? 'pass' : 'warn',
                detail: `name=${manifest.name || 'missing'}, icons=${manifest.icons?.length || 0} (${iconSizes}), start_url=${hasStartUrl ? 'yes' : 'missing'}, id=${hasId ? manifest.id : 'missing'}`,
            });
        } catch {
            results.push({ label: 'Manifest', status: 'fail', detail: 'Failed to fetch' });
        }
    } else {
        results.push({ label: 'Manifest', status: 'warn', detail: 'No <link rel="manifest"> found' });
    }

    // Standalone mode
    const standalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    results.push({ label: 'Standalone', status: standalone ? 'pass' : 'warn', detail: String(standalone) });

    // beforeinstallprompt
    const hasPrompt = !!window.__pwaInstallPromptEvent;
    results.push({ label: 'Install Prompt', status: hasPrompt ? 'pass' : 'warn', detail: hasPrompt ? 'Captured' : 'Not received' });

    // Browser info — helps diagnose browser-specific PWA issues
    results.push({ label: 'Browser', status: 'pass', detail: getBrowserName() });

    return results;
}

// --- Component ---

// Requirement: Embed mode skip is handled in main.jsx (DebugPill is not mounted at all
// in embed mode). This avoids calling hooks conditionally, which violates React's rules.
export default function DebugPill() {
    const [expanded, setExpanded] = useState(false);
    const [activeTab, setActiveTab] = useState(0);
    // Requirement: Hydration-safe initialization — useState([]) + useEffect sync
    // Approach: Initialize empty, sync in useEffect to prevent hydration mismatch
    const [entries, setEntries] = useState([]);
    const [copyLabel, setCopyLabel] = useState('Copy');
    // Requirement: When all clipboard methods fail, show visible textarea for manual copy
    // Approach: Set reportText to the report string, render a textarea with auto-select
    const [reportText, setReportText] = useState(null);
    const [diagnostics, setDiagnostics] = useState([]);
    const [diagLoading, setDiagLoading] = useState(false);
    const logRef = useRef(null);
    const diagnosticRunRef = useRef(0);

    // Subscribe to debug entries
    useEffect(() => {
        setEntries(debugGetEntries());
        return debugSubscribe((entry) => {
            setEntries((prev) => [...prev, entry].slice(-MAX_ENTRIES));
        });
    }, []);

    // Auto-scroll log to bottom when new entries arrive
    useEffect(() => {
        if (expanded && activeTab === 0 && logRef.current) {
            logRef.current.scrollTop = logRef.current.scrollHeight;
        }
    }, [entries, expanded, activeTab]);

    // Run PWA diagnostics when tab is selected
    useEffect(() => {
        if (expanded && activeTab === 2) {
            const runId = ++diagnosticRunRef.current;
            setDiagLoading(true);
            runDiagnostics().then((results) => {
                // Stale-run cancellation: if user switched tabs while probes ran, drop results
                if (diagnosticRunRef.current !== runId) return;
                setDiagnostics(results);
                setDiagLoading(false);
            });
        }
    }, [expanded, activeTab]);

    // Hide inline pill on mount — React pill takes over
    useEffect(() => {
        const inlineBanner = document.getElementById('debug-error-banner');
        if (inlineBanner) inlineBanner.style.display = 'none';
    }, []);

    const handleCopy = useCallback(async () => {
        const report = debugGenerateReport();
        const ok = await copyToClipboard(report);
        if (ok) {
            setCopyLabel('Copied!');
            setReportText(null);
            setTimeout(() => setCopyLabel('Copy'), 1500);
        } else {
            // All clipboard methods failed — show visible textarea for manual copy
            setReportText(report);
            setCopyLabel('Select & Copy');
            setTimeout(() => setCopyLabel('Copy'), 3000);
        }
    }, []);

    const handleClear = useCallback(() => {
        debugClear();
        setEntries([]);
    }, []);

    const errorCount = entries.filter(e => e.severity === 'error').length;
    const warnCount = entries.filter(e => e.severity === 'warn').length;

    // --- Collapsed pill ---
    if (!expanded) {
        return (
            <div
                style={styles.pill}
                onClick={() => setExpanded(true)}
                role="button"
                tabIndex={0}
                aria-label={`Debug pill: ${entries.length} entries, ${errorCount} errors, ${warnCount} warnings. Click to expand.`}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpanded(true); } }}
            >
                <span>dbg</span>
                <span style={{ color: '#666' }}>{entries.length}</span>
                {errorCount > 0 && <span style={styles.badge('#f87171')}>{errorCount}</span>}
                {warnCount > 0 && <span style={styles.badge('#fbbf24')}>{warnCount}</span>}
            </div>
        );
    }

    // --- Expanded panel ---
    return (
        <div style={styles.panel}>
            <div style={styles.header}>
                <div style={styles.tabBar}>
                    {TABS.map((tab, i) => (
                        <button
                            key={tab}
                            style={styles.tab(i === activeTab)}
                            onClick={() => setActiveTab(i)}
                        >
                            {tab}
                        </button>
                    ))}
                </div>
                <div style={styles.actions}>
                    <button style={styles.btn('#2563eb')} onClick={handleCopy}>{copyLabel}</button>
                    <button style={styles.btn('#dc2626')} onClick={handleClear}>Clear</button>
                    <button style={styles.btn('#333')} onClick={() => setExpanded(false)}>Close</button>
                </div>
            </div>

            <div style={styles.content} ref={activeTab === 0 ? logRef : undefined}>
                {activeTab === 0 && <LogTab entries={entries} />}
                {activeTab === 1 && <EnvironmentTab />}
                {activeTab === 2 && <PWADiagnosticsTab diagnostics={diagnostics} loading={diagLoading} />}
            </div>

            {reportText && (
                <div style={{ padding: '8px 12px', borderTop: '1px solid #333', background: '#1a1a1a' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                        <span style={{ color: '#888', fontSize: '10px' }}>
                            Clipboard unavailable — select all text below and copy manually
                        </span>
                        <button
                            style={styles.btn('#333')}
                            onClick={() => setReportText(null)}
                        >
                            Dismiss
                        </button>
                    </div>
                    <textarea
                        readOnly
                        value={reportText}
                        onFocus={(e) => e.target.select()}
                        style={{
                            width: '100%',
                            height: '120px',
                            background: '#0f0f0f',
                            color: '#d4d4d4',
                            border: '1px solid #333',
                            borderRadius: '3px',
                            fontFamily: 'monospace',
                            fontSize: '10px',
                            padding: '6px',
                            resize: 'vertical',
                        }}
                    />
                </div>
            )}
        </div>
    );
}

// --- Log Tab ---
function LogTab({ entries }) {
    if (entries.length === 0) {
        return <div style={{ color: '#666', fontStyle: 'italic' }}>No debug entries yet.</div>;
    }

    return (
        <div>
            {entries.map((entry) => (
                <div key={entry.id} style={styles.logEntry(entry.severity)}>
                    <span style={styles.timestamp}>{formatTime(entry.timestamp)}</span>
                    <span style={styles.sourceTag(entry.source)}>[{entry.source}]</span>
                    <span>{entry.event}</span>
                    {entry.details && (
                        <span style={{ color: '#555', marginLeft: '6px', fontSize: '10px' }}>
                            {JSON.stringify(entry.details)}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

// --- Environment Tab ---
function EnvironmentTab() {
    const standalone = window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true;
    const swSupport = 'serviceWorker' in navigator;

    const envData = [
        // Requirement: Redact query params in environment display
        ['URL', `${window.location.origin}${window.location.pathname}${window.location.search ? '?[redacted]' : ''}`],
        ['User Agent', navigator.userAgent],
        ['Screen', `${screen.width}x${screen.height}`],
        ['Viewport', `${innerWidth}x${innerHeight}`],
        ['Online', String(navigator.onLine)],
        ['Protocol', location.protocol],
        ['Standalone', String(standalone)],
        ['SW Support', String(swSupport)],
        ['IndexedDB', String('indexedDB' in window)],
        ['Timestamp', new Date().toISOString()],
    ];

    return (
        <div>
            {envData.map(([label, value]) => (
                <div key={label} style={styles.envRow}>
                    <span style={styles.envLabel}>{label}</span>
                    <span style={styles.envValue}>{value}</span>
                </div>
            ))}
        </div>
    );
}

// --- PWA Diagnostics Tab ---
function PWADiagnosticsTab({ diagnostics, loading }) {
    if (loading && diagnostics.length === 0) {
        return <div style={{ color: '#888' }}>Running diagnostics...</div>;
    }
    if (diagnostics.length === 0) {
        return <div style={{ color: '#666', fontStyle: 'italic' }}>No diagnostics available.</div>;
    }

    return (
        <div>
            {diagnostics.map((diag) => (
                <div key={diag.label} style={styles.diagRow}>
                    <span style={styles.diagDot(diag.status)} />
                    <span style={styles.diagLabel}>{diag.label}</span>
                    <span style={styles.diagDetail}>{diag.detail}</span>
                </div>
            ))}
            {loading && <div style={{ color: '#888', marginTop: '4px', fontSize: '10px' }}>Updating...</div>}
        </div>
    );
}
