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

// === Debug Banner Bridge ===
// Requirement: Debug pill must work even when JS bundle fails to load
// Approach: The debug pill is created in index.html as an inline script (no bundle
//   dependency). This module only enhances it with React-specific error info
//   (component stacks from ErrorBoundary). The HTML script exposes:
//   - window.__debugPushError(msg, stack)  — push errors into the HTML pill
//   - window.__debugErrors                 — shared error array
//   - window.__debugClearLoadTimer()       — signal React mounted successfully
// Alternatives:
//   - Keep debug banner in main.jsx: Rejected — pill doesn't show when bundle fails,
//     which is exactly when you need it most (see AI_LESSONS.md: "No fallback when
//     React fails to mount")
//   - Duplicate error listeners: Rejected — HTML script already captures window.onerror
//     and unhandledrejection; adding them here would double-count errors

// Signal that the JS bundle loaded and React is about to mount.
// Clears the 10-second loading timeout warning from the HTML script.
if (typeof window.__debugClearLoadTimer === 'function') {
    window.__debugClearLoadTimer();
}

/**
 * Push a React-specific error into the HTML-level debug pill.
 * Used by RootErrorBoundary to include component stack traces.
 */
function logDebugError(message, stack) {
    if (typeof window.__debugPushError === 'function') {
        window.__debugPushError(message, stack);
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
