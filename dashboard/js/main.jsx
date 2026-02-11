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

// === Debug Error Banner ===
// Captures all JS errors (React + global) and shows a fixed banner
// with copy-paste support for easy bug reporting.
const debugErrors = [];
let debugBannerEl = null;

function createDebugBanner() {
    if (debugBannerEl) return debugBannerEl;
    debugBannerEl = document.createElement('div');
    debugBannerEl.id = 'debug-error-banner';
    Object.assign(debugBannerEl.style, {
        position: 'fixed', bottom: '0', left: '0', right: '0', zIndex: '99999',
        maxHeight: '40vh', overflow: 'auto', background: '#1a0000',
        borderTop: '2px solid #ff4444', fontFamily: 'monospace', fontSize: '12px',
        color: '#ff9999', padding: '0', display: 'none',
    });
    debugBannerEl.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center;padding:6px 12px;background:#2a0000;position:sticky;top:0;">
            <span style="font-weight:bold;color:#ff6666;">Errors</span>
            <div style="display:flex;gap:8px;">
                <button id="debug-copy-btn" style="padding:2px 10px;background:#ff4444;color:#fff;border:none;border-radius:3px;cursor:pointer;font-size:11px;">Copy</button>
                <button id="debug-close-btn" style="padding:2px 10px;background:#333;color:#ccc;border:none;border-radius:3px;cursor:pointer;font-size:11px;">Close</button>
            </div>
        </div>
        <pre id="debug-error-log" style="padding:8px 12px;margin:0;white-space:pre-wrap;word-break:break-word;"></pre>
    `;
    document.body.appendChild(debugBannerEl);
    debugBannerEl.querySelector('#debug-copy-btn').addEventListener('click', () => {
        const text = debugErrors.map(e => `[${e.time}] ${e.message}\n${e.stack || ''}`).join('\n---\n');
        navigator.clipboard.writeText(text).then(() => {
            const btn = debugBannerEl.querySelector('#debug-copy-btn');
            btn.textContent = 'Copied!';
            setTimeout(() => { btn.textContent = 'Copy'; }, 1500);
        });
    });
    debugBannerEl.querySelector('#debug-close-btn').addEventListener('click', () => {
        debugBannerEl.style.display = 'none';
    });
    return debugBannerEl;
}

function logDebugError(message, stack) {
    const entry = { time: new Date().toLocaleTimeString(), message, stack: stack || '' };
    debugErrors.push(entry);
    const banner = createDebugBanner();
    banner.style.display = 'block';
    const log = banner.querySelector('#debug-error-log');
    log.textContent = debugErrors
        .map(e => `[${e.time}] ${e.message}${e.stack ? '\n' + e.stack : ''}`)
        .join('\n---\n');
    log.scrollTop = log.scrollHeight;
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
