/**
 * Inline-style object + colour maps for the DebugPill UI.
 *
 * Requirement: Debug pill renders in an isolated React root (#debug-root)
 *   that must survive App crashes AND stylesheet load failures. Tailwind
 *   classes can't be used here because the main CSS bundle may not have
 *   loaded by the time the debug pill renders.
 * Approach: One central styles object + two colour lookup maps (severity,
 *   source). Every value is a literal hex / colour token — no DaisyUI
 *   semantic variables, no Tailwind classes. Documented in CLAUDE.md
 *   "Frontend: Styles and Scripts" hex-literal exception list.
 *
 * z-index 80 = --z-debug from the design-token scale, hardcoded because
 * CSS variables aren't reachable from an isolated React root.
 *
 * Extracted from DebugPill.jsx 2026-04-15 to keep the parent component
 * under the 500-line soft-limit (CLAUDE.md "Code Organization").
 */

// Source color mapping for log entries.
// Unknown sources fall back to '#94a3b8' (neutral gray) via the lookup in
// sourceTag() below, so adding a new source here is optional — but named
// colors make the log tab scannable when filtering by category.
export const SOURCE_COLORS = {
    pwa: '#2dd4bf',
    boot: '#a78bfa',
    render: '#60a5fa',
    theme: '#c4b5fd',   // lavender — distinct from render (blue) and boot (purple)
    global: '#f87171',
    api: '#fbbf24',
    auth: '#fb923c',
    db: '#34d399',
    form: '#c084fc',
    import: '#38bdf8',
    export: '#a3e635',
};

export const SEVERITY_COLORS = {
    info: '#94a3b8',
    success: '#4ade80',
    warn: '#fbbf24',
    error: '#f87171',
};

export const styles = {
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
