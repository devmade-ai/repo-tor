import React from 'react';
import { formatDebugTime, safeStringify } from '../../debugLog.js';
import { styles } from './debugStyles.js';

/**
 * Debug pill tab bodies — Log, Environment, PWA Diagnostics.
 *
 * Requirement: Three independent debug surfaces with distinct data
 *   sources. Extracted from DebugPill.jsx 2026-04-15 to keep the parent
 *   under the 500-line component soft-limit (CLAUDE.md "Code
 *   Organization").
 * Approach: Three small presentational components plus a
 *   `runDiagnostics()` async helper. The helper runs live PWA probes
 *   (HTTPS, SW state, manifest validation, standalone mode, install
 *   prompt) and returns an array of `{label, status, detail}` rows.
 *   The DebugPill parent owns the diagnostics state + stale-run
 *   cancellation; this module is purely presentation + the probe code.
 *
 * All tab components share the inline `styles` object from
 * `./debugStyles.js`.
 */

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

// Requirement: Active health checks for diagnosing PWA issues at runtime
// Approach: Run live probes for HTTPS, SW state, manifest validation,
//   standalone mode, install prompt. Stale-run cancellation lives in the
//   parent component (DebugPill) via a monotonic counter ref — this
//   helper just runs the probes and returns the result array.
// Alternatives:
//   - Static environment info only: Rejected — doesn't catch runtime issues
//   - External service: Rejected — adds dependency
export async function runDiagnostics() {
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

export function LogTab({ entries }) {
    if (entries.length === 0) {
        return <div style={{ color: '#666', fontStyle: 'italic' }}>No debug entries yet.</div>;
    }

    return (
        <div>
            {entries.map((entry) => (
                <div key={entry.id} style={styles.logEntry(entry.severity)}>
                    <span style={styles.timestamp}>{formatDebugTime(entry.timestamp)}</span>
                    <span style={styles.sourceTag(entry.source)}>[{entry.source}]</span>
                    <span>{entry.event}</span>
                    {entry.details && (
                        <span style={{ color: '#555', marginLeft: '6px', fontSize: '10px' }}>
                            {safeStringify(entry.details)}
                        </span>
                    )}
                </div>
            ))}
        </div>
    );
}

export function EnvironmentTab() {
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

export function PWADiagnosticsTab({ diagnostics, loading }) {
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
