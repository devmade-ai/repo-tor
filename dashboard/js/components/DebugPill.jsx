import React, { useState, useEffect, useRef, useCallback } from 'react';
import { debugSubscribe, debugClear, debugGenerateReport } from '../debugLog.js';
import { copyToClipboard } from '../copyToClipboard.js';
import { styles } from './debug/debugStyles.js';
import { LogTab, EnvironmentTab, PWADiagnosticsTab, runDiagnostics } from './debug/DebugTabs.jsx';

/**
 * React-based debug pill — renders in a separate React root (#debug-root).
 *
 * Requirement: Post-mount debug UI with structured log, environment info, and PWA diagnostics
 * Approach: Separate React root so it survives App crashes. Uses inline styles instead of
 *   Tailwind — survives stylesheet load failures since the pill runs in an isolated root.
 *   The existing inline pill in index.html handles pre-React; this handles post-mount.
 *
 *   The three tab bodies (Log / Environment / PWA Diagnostics) and the
 *   inline `styles` object were extracted into `./debug/DebugTabs.jsx`
 *   and `./debug/debugStyles.js` on 2026-04-15 to keep this component
 *   under the 500-line soft-limit. This file owns the pill / panel
 *   chrome, debug-entry subscription, copy/clear actions, and the
 *   stale-run cancellation for the PWA diagnostics tab.
 *
 * Alternatives:
 *   - Render inside App tree: Rejected — pill dies when App crashes
 *   - Use Tailwind classes: Rejected — app CSS may not be loaded in isolated root
 *   - Single debug system: Rejected — need pre-React coverage that survives bundle failure
 *
 * See: glow-props docs/implementations/DEBUG_SYSTEM.md
 */

const MAX_ENTRIES = 200;
const TABS = ['Log', 'Environment', 'PWA'];

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
    const copyTimerRef = useRef(null);

    // Subscribe to debug entries.
    // Reset entries first to handle React strict mode double-mount: without the
    // reset, the second mount's subscription replay appends to the first mount's
    // state, doubling every entry. setEntries([]) + replay builds cleanly from empty.
    useEffect(() => {
        setEntries([]);
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

    // Clean up copy label reset timer on unmount
    useEffect(() => {
        return () => { if (copyTimerRef.current) clearTimeout(copyTimerRef.current); };
    }, []);

    const handleCopy = useCallback(async () => {
        if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
        const report = debugGenerateReport();
        const ok = await copyToClipboard(report);
        if (ok) {
            setCopyLabel('Copied!');
            setReportText(null);
            copyTimerRef.current = setTimeout(() => setCopyLabel('Copy'), 1500);
        } else {
            // All clipboard methods failed — show visible textarea for manual copy
            setReportText(report);
            setCopyLabel('Select & Copy');
            copyTimerRef.current = setTimeout(() => setCopyLabel('Copy'), 3000);
        }
    }, []);

    const handleClear = useCallback(() => {
        debugClear();
        setEntries([]);
        setReportText(null);
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
