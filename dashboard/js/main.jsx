/**
 * React entry point for the Git Analytics Dashboard
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { AppProvider } from './AppContext.jsx';
import App from './App.jsx';
import './pwa.js';

// Chart.js registration
import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    BarElement,
    LineElement,
    PointElement,
    ArcElement,
    Title,
    Tooltip,
    Legend,
    Filler,
} from 'chart.js';

ChartJS.register(
    CategoryScale, LinearScale, BarElement, LineElement,
    PointElement, ArcElement, Title, Tooltip, Legend, Filler
);

// Set Chart.js defaults for dark theme — read from CSS variables so charts
// stay in sync with the theme automatically.
const computedStyles = getComputedStyle(document.documentElement);
ChartJS.defaults.color = computedStyles.getPropertyValue('--text-secondary').trim() || '#e5e7eb';
ChartJS.defaults.borderColor = computedStyles.getPropertyValue('--chart-grid').trim() || 'rgba(255,255,255,0.1)';

// Set --chart-accent-rgb CSS variable from chartColors.js so heatmap CSS
// classes can use the embed-overridden accent color. This bridges the URL
// param (parsed in JS) to the CSS heatmap intensity classes.
import { accentColor } from './chartColors.js';
(() => {
    const r = parseInt(accentColor.slice(1, 3), 16);
    const g = parseInt(accentColor.slice(3, 5), 16);
    const b = parseInt(accentColor.slice(5, 7), 16);
    document.documentElement.style.setProperty('--chart-accent-rgb', `${r}, ${g}, ${b}`);
})();

// === Debug Error Banner ===
// Always-visible indicator at the bottom of the screen.
// Shows "0 errors" pill when clean; expands to full error log when errors occur.
const debugErrors = [];
let debugBannerEl = null;
let debugDismissed = false;

// Requirement: Debug banner must be safe from XSS and not leak event listeners
// Approach: Use DOM API (textContent/createElement) instead of innerHTML, and a
//   single delegated click handler on the banner root instead of per-render listeners.
// Alternatives:
//   - innerHTML with sanitization: Rejected — error prone, DOM API is safer by default
//   - Re-attaching listeners with removeEventListener: Rejected — delegation is simpler

function createDebugBanner() {
    if (debugBannerEl) return debugBannerEl;
    debugBannerEl = document.createElement('div');
    debugBannerEl.id = 'debug-error-banner';
    // Single delegated click handler — routes actions via data-action attributes
    debugBannerEl.addEventListener('click', handleBannerClick);
    document.body.appendChild(debugBannerEl);
    renderBannerState();
    return debugBannerEl;
}

function handleBannerClick(e) {
    const actionEl = e.target.closest('[data-action]');
    if (!actionEl) return;
    const action = actionEl.dataset.action;

    if (action === 'copy-errors') {
        const text = debugErrors.map(e => `[${e.time}] ${e.message}\n${e.stack || ''}`).join('\n---\n');
        navigator.clipboard.writeText(text).then(() => {
            actionEl.textContent = 'Copied!';
            setTimeout(() => { actionEl.textContent = 'Copy'; }, 1500);
        });
    } else if (action === 'copy-diagnostics') {
        const log = debugBannerEl.querySelector('#debug-info-log');
        if (log) {
            navigator.clipboard.writeText(log.textContent).then(() => {
                actionEl.textContent = 'Copied!';
                setTimeout(() => { actionEl.textContent = 'Copy'; }, 1500);
            });
        }
    } else if (action === 'close') {
        debugDismissed = true;
        debugBannerEl.style.display = 'none';
    } else if (action === 'show-diagnostics') {
        showDebugInfo();
    } else if (action === 'collapse') {
        renderBannerState();
    }
}

function createStyledEl(tag, styles, text) {
    const el = document.createElement(tag);
    Object.assign(el.style, styles);
    if (text) el.textContent = text;
    return el;
}

function renderBannerState() {
    if (!debugBannerEl) return;
    const hasErrors = debugErrors.length > 0;
    debugBannerEl.textContent = '';

    if (hasErrors) {
        Object.assign(debugBannerEl.style, {
            position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '99999',
            maxHeight: '40vh', overflow: 'auto', background: '#1a0000',
            borderTop: '2px solid #ff4444', fontFamily: 'monospace', fontSize: '12px',
            color: '#ff9999', padding: '0', display: 'block',
        });
        const header = createStyledEl('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#2a0000', position: 'sticky', top: '0' });
        header.appendChild(createStyledEl('span', { fontWeight: 'bold', color: '#ff6666' }, `${debugErrors.length} error${debugErrors.length !== 1 ? 's' : ''}`));
        const btnGroup = createStyledEl('div', { display: 'flex', gap: '8px' });
        const copyBtn = createStyledEl('button', { padding: '2px 10px', background: '#ff4444', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }, 'Copy');
        copyBtn.dataset.action = 'copy-errors';
        const closeBtn = createStyledEl('button', { padding: '2px 10px', background: '#333', color: '#ccc', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }, 'Close');
        closeBtn.dataset.action = 'close';
        btnGroup.append(copyBtn, closeBtn);
        header.appendChild(btnGroup);
        debugBannerEl.appendChild(header);

        const log = createStyledEl('pre', { padding: '8px 12px', margin: '0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' });
        log.id = 'debug-error-log';
        log.textContent = debugErrors.map(e => `[${e.time}] ${e.message}${e.stack ? '\n' + e.stack : ''}`).join('\n---\n');
        debugBannerEl.appendChild(log);
    } else {
        Object.assign(debugBannerEl.style, {
            position: 'fixed', bottom: '0', right: '0', left: 'auto', zIndex: '99999',
            maxHeight: 'none', overflow: 'visible', background: 'transparent',
            borderTop: 'none', fontFamily: 'monospace', fontSize: '10px',
            color: '#4ade80', padding: '8px 12px',
            display: debugDismissed ? 'none' : 'block',
        });
        const pill = createStyledEl('span', { background: 'rgba(22,163,74,0.15)', border: '1px solid rgba(22,163,74,0.3)', borderRadius: '4px', padding: '3px 8px', color: '#4ade80', fontSize: '10px', cursor: 'pointer' }, '0 errors');
        pill.dataset.action = 'show-diagnostics';
        debugBannerEl.appendChild(pill);
    }
}

function showDebugInfo() {
    if (!debugBannerEl) return;
    const sw = 'serviceWorker' in navigator;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const pwaInstalled = standalone || localStorage.getItem('pwaInstalled') === 'true';
    const swController = navigator.serviceWorker?.controller ? 'active' : 'none';
    const diagText = [
        `Service Worker support: ${sw ? 'yes' : 'no'}`,
        `SW controller: ${swController}`,
        `Standalone mode: ${standalone}`,
        `PWA installed flag: ${pwaInstalled}`,
        `Errors: ${debugErrors.length}`,
        `User agent: ${navigator.userAgent}`,
    ].join('\n');

    debugBannerEl.textContent = '';
    Object.assign(debugBannerEl.style, {
        position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '99999',
        maxHeight: '40vh', overflow: 'auto', background: '#001a00',
        borderTop: '2px solid #4ade80', fontFamily: 'monospace', fontSize: '12px',
        color: '#4ade80', padding: '0', display: 'block',
    });
    const header = createStyledEl('div', { display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 12px', background: '#002a00', position: 'sticky', top: '0' });
    header.appendChild(createStyledEl('span', { fontWeight: 'bold', color: '#4ade80' }, 'Diagnostics'));
    const btnGroup = createStyledEl('div', { display: 'flex', gap: '8px' });
    const copyBtn = createStyledEl('button', { padding: '2px 10px', background: '#16a34a', color: '#fff', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }, 'Copy');
    copyBtn.dataset.action = 'copy-diagnostics';
    const closeBtn = createStyledEl('button', { padding: '2px 10px', background: '#333', color: '#ccc', border: 'none', borderRadius: '3px', cursor: 'pointer', fontSize: '11px' }, 'Close');
    closeBtn.dataset.action = 'collapse';
    btnGroup.append(copyBtn, closeBtn);
    header.appendChild(btnGroup);
    debugBannerEl.appendChild(header);

    const log = createStyledEl('pre', { padding: '8px 12px', margin: '0', whiteSpace: 'pre-wrap', wordBreak: 'break-word' });
    log.id = 'debug-info-log';
    log.textContent = diagText;
    debugBannerEl.appendChild(log);
}

function logDebugError(message, stack) {
    const entry = { time: new Date().toLocaleTimeString(), message, stack: stack || '' };
    debugErrors.push(entry);
    debugDismissed = false;
    createDebugBanner();
    renderBannerState();
    const log = debugBannerEl?.querySelector('#debug-error-log');
    if (log) log.scrollTop = log.scrollHeight;
}

window.addEventListener('error', (e) => {
    logDebugError(e.message || 'Unknown error', e.error?.stack);
});
window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason;
    logDebugError(
        `Unhandled Promise: ${reason?.message || String(reason)}`,
        reason?.stack
    );
});

// Create the banner eagerly so it's visible on page load — skip in embed mode
// (embedded charts shouldn't show debug diagnostics to the consuming app)
const isEmbedMode = new URLSearchParams(window.location.search).has('embed');
if (!isEmbedMode) {
    if (document.body) {
        createDebugBanner();
    } else {
        document.addEventListener('DOMContentLoaded', () => createDebugBanner());
    }
}

// Top-level ErrorBoundary — catches any unhandled React error
// so the user always sees feedback instead of a blank screen.
class RootErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('Root ErrorBoundary caught:', error, info.componentStack);
        logDebugError(error.message, error.stack + '\n\nComponent Stack:' + info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: '100vh', flexDirection: 'column', gap: '16px',
                    padding: '24px', textAlign: 'center',
                }}>
                    <p style={{ color: '#e5e7eb', fontSize: '16px', fontFamily: 'system-ui, sans-serif' }}>
                        Something went wrong loading the dashboard.
                    </p>
                    <p style={{ color: '#767676', fontSize: '13px', fontFamily: 'monospace', maxWidth: '480px', wordBreak: 'break-word' }}>
                        {this.state.error?.message || 'Unknown error'}
                    </p>
                    <p style={{ color: '#555', fontSize: '11px', fontFamily: 'system-ui, sans-serif', marginTop: '-8px' }}>
                        Error details are in the banner below. Use "Copy" to share.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        style={{
                            marginTop: '8px', padding: '8px 24px',
                            background: '#2D68FF', color: '#fff', border: 'none',
                            borderRadius: '4px', cursor: 'pointer', fontSize: '13px',
                            fontFamily: 'system-ui, sans-serif',
                        }}
                    >
                        Reload
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// Dark mode (prevent flash)
document.documentElement.classList.add('dark');

const root = createRoot(document.getElementById('root'));
root.render(
    <RootErrorBoundary>
        <AppProvider>
            <App />
        </AppProvider>
    </RootErrorBoundary>
);
