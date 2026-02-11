/**
 * React entry point for the Git Analytics Dashboard
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { AppProvider } from './AppContext.jsx';
import App from './App.jsx';

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

// === Early PWA install prompt capture ===
// beforeinstallprompt can fire before pwa.js is dynamically imported.
// Capture it here (synchronous, runs before React) so it's never missed.
window.__pwaInstallPrompt = null;
const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true;
const isPWAInstalled = isStandalone || localStorage.getItem('pwaInstalled') === 'true';

if (!isPWAInstalled) {
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        window.__pwaInstallPrompt = e;
        window.dispatchEvent(new CustomEvent('pwa-install-ready'));
    });
}
window.addEventListener('appinstalled', () => {
    window.__pwaInstallPrompt = null;
    localStorage.setItem('pwaInstalled', 'true');
    window.dispatchEvent(new CustomEvent('pwa-installed'));
});

// === Debug Error Banner ===
// Always-visible indicator at the bottom of the screen.
// Shows "0 errors" pill when clean; expands to full error log when errors occur.
const debugErrors = [];
let debugBannerEl = null;
let debugDismissed = false;

function createDebugBanner() {
    if (debugBannerEl) return debugBannerEl;
    debugBannerEl = document.createElement('div');
    debugBannerEl.id = 'debug-error-banner';
    document.body.appendChild(debugBannerEl);
    renderBannerState();
    return debugBannerEl;
}

function renderBannerState() {
    if (!debugBannerEl) return;
    const hasErrors = debugErrors.length > 0;

    if (hasErrors) {
        Object.assign(debugBannerEl.style, {
            position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '99999',
            maxHeight: '40vh', overflow: 'auto', background: '#1a0000',
            borderTop: '2px solid #ff4444', fontFamily: 'monospace', fontSize: '12px',
            color: '#ff9999', padding: '0', display: 'block',
        });
        debugBannerEl.innerHTML = `
            <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;background:#2a0000;position:sticky;top:0;">
                <span style="font-weight:bold;color:#ff6666;">${debugErrors.length} error${debugErrors.length !== 1 ? 's' : ''}</span>
                <div style="display:flex;gap:8px;">
                    <button id="debug-copy-btn" style="padding:2px 10px;background:#ff4444;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;">Copy</button>
                    <button id="debug-close-btn" style="padding:2px 10px;background:#333;color:#ccc;border:none;border-radius:3px;cursor:pointer;font-size:11px;">Close</button>
                </div>
            </div>
            <pre id="debug-error-log" style="padding:8px 12px;margin:0;white-space:pre-wrap;word-break:break-word;"></pre>
        `;
        const log = debugBannerEl.querySelector('#debug-error-log');
        log.textContent = debugErrors
            .map(e => `[${e.time}] ${e.message}${e.stack ? '\n' + e.stack : ''}`)
            .join('\n---\n');
        debugBannerEl.querySelector('#debug-copy-btn').addEventListener('click', () => {
            const text = debugErrors.map(e => `[${e.time}] ${e.message}\n${e.stack || ''}`).join('\n---\n');
            navigator.clipboard.writeText(text).then(() => {
                const btn = debugBannerEl.querySelector('#debug-copy-btn');
                btn.textContent = 'Copied!';
                setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
            });
        });
        debugBannerEl.querySelector('#debug-close-btn').addEventListener('click', () => {
            debugDismissed = true;
            debugBannerEl.style.display = 'none';
        });
    } else {
        Object.assign(debugBannerEl.style, {
            position: 'fixed', bottom: '0', right: '0', left: 'auto', zIndex: '99999',
            maxHeight: 'none', overflow: 'visible', background: 'transparent',
            borderTop: 'none', fontFamily: 'monospace', fontSize: '10px',
            color: '#4ade80', padding: '8px 12px',
            display: debugDismissed ? 'none' : 'block',
        });
        debugBannerEl.innerHTML = `
            <span id="debug-pill" style="background:rgba(22,163,74,0.15);border:1px solid rgba(22,163,74,0.3);border-radius:4px;padding:3px 8px;color:#4ade80;font-size:10px;cursor:pointer;">0 errors</span>
        `;
        debugBannerEl.querySelector('#debug-pill').addEventListener('click', () => {
            showDebugInfo();
        });
    }
}

function showDebugInfo() {
    if (!debugBannerEl) return;
    // Gather diagnostic info
    const sw = 'serviceWorker' in navigator;
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;
    const pwaInstalled = standalone || localStorage.getItem('pwaInstalled') === 'true';
    const installPrompt = !!window.__pwaInstallPrompt;
    const swController = navigator.serviceWorker?.controller ? 'active' : 'none';

    const lines = [
        `Service Worker support: ${sw ? 'yes' : 'no'}`,
        `SW controller: ${swController}`,
        `Standalone mode: ${standalone}`,
        `PWA installed flag: ${pwaInstalled}`,
        `Install prompt captured: ${installPrompt}`,
        `Errors: ${debugErrors.length}`,
        `User agent: ${navigator.userAgent}`,
    ];

    Object.assign(debugBannerEl.style, {
        position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '99999',
        maxHeight: '40vh', overflow: 'auto', background: '#001a00',
        borderTop: '2px solid #4ade80', fontFamily: 'monospace', fontSize: '12px',
        color: '#4ade80', padding: '0', display: 'block',
    });
    debugBannerEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;background:#002a00;position:sticky;top:0;">
            <span style="font-weight:bold;color:#4ade80;">Diagnostics</span>
            <div style="display:flex;gap:8px;">
                <button id="debug-info-copy-btn" style="padding:2px 10px;background:#16a34a;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;">Copy</button>
                <button id="debug-info-close-btn" style="padding:2px 10px;background:#333;color:#ccc;border:none;border-radius:3px;cursor:pointer;font-size:11px;">Close</button>
            </div>
        </div>
        <pre id="debug-info-log" style="padding:8px 12px;margin:0;white-space:pre-wrap;word-break:break-word;"></pre>
    `;
    debugBannerEl.querySelector('#debug-info-log').textContent = lines.join('\n');
    debugBannerEl.querySelector('#debug-info-copy-btn').addEventListener('click', () => {
        navigator.clipboard.writeText(lines.join('\n')).then(() => {
            const btn = debugBannerEl.querySelector('#debug-info-copy-btn');
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
        });
    });
    debugBannerEl.querySelector('#debug-info-close-btn').addEventListener('click', () => {
        renderBannerState(); // collapse back to pill
    });
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

// Create the banner eagerly so it's visible on page load
if (document.body) {
    createDebugBanner();
} else {
    document.addEventListener('DOMContentLoaded', () => createDebugBanner());
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
