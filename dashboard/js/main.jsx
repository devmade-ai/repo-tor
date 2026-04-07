/**
 * React entry point for the Git Analytics Dashboard
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
// Console interceptor must import before React to capture React's own warnings.
// originalConsoleError is used by RootErrorBoundary to log to browser devtools
// without triggering the interceptor (avoids double-capture in debugLog).
import { originalConsoleError } from './debugConsoleInterceptor.js';
import { debugAdd } from './debugLog.js';
import { AppProvider } from './AppContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import App from './App.jsx';
import DebugPill from './components/DebugPill.jsx';
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

// Set Chart.js defaults — read DaisyUI theme variable for text color.
// Chart.js needs concrete color strings, not CSS functions.
const computedStyles = getComputedStyle(document.documentElement);
const isDark = document.documentElement.classList.contains('dark');
ChartJS.defaults.color = computedStyles.getPropertyValue('--color-base-content').trim() || '#e5e7eb';
ChartJS.defaults.borderColor = isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.08)';

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

// === Debug System Bridge ===
// Requirement: Debug pill must work even when JS bundle fails to load
// Approach: Two-phase system:
//   1. Inline HTML pill (index.html) — handles pre-React: error capture, loading timeout,
//      SW recovery. Works even when the bundle fails to load entirely.
//   2. React DebugPill (mounted in #debug-root) — handles post-mount: structured log with
//      pub/sub, 3 tabs (Log, Environment, PWA), clipboard fallbacks. Renders in a separate
//      React root so it survives App crashes.
//   On mount: transfer inline errors into debugLog, hide inline pill, mount React pill.
// Alternatives:
//   - Keep everything in inline pill: Rejected — vanilla JS DOM manipulation is
//     unmaintainable for tabbed UI with pub/sub subscriptions
//   - Single React root for everything: Rejected — App crash takes down debug UI

// Signal that the JS bundle loaded and React is about to mount.
// Clears the loading timeout warning from the HTML script.
if (typeof window.__debugClearLoadTimer === 'function') {
    window.__debugClearLoadTimer();
}

// Transfer pre-React errors captured by the inline pill into the debugLog module.
// The inline pill stores errors in window.__debugErrors as {time, message, stack}.
if (Array.isArray(window.__debugErrors)) {
    for (const err of window.__debugErrors) {
        debugAdd('global', 'error', err.message, err.stack ? { stack: err.stack } : null);
    }
}

// Hide the inline HTML pill — the React pill takes over from here.
// The inline pill remains in the DOM (for SW recovery and pre-React fallback)
// but its UI is hidden so it doesn't overlap with the React pill.
const inlineBanner = document.getElementById('debug-error-banner');
if (inlineBanner) inlineBanner.style.display = 'none';
window.__debugReactPillMounted = true;

// Redirect future inline pushError calls into debugLog as well,
// so ErrorBoundary and window.onerror still feed the React pill.
const originalPushError = window.__debugPushError;
window.__debugPushError = function (msg, stack) {
    debugAdd('global', 'error', msg, stack ? { stack } : null);
    // Keep inline pill updated as backup (in case React pill crashes)
    if (typeof originalPushError === 'function') originalPushError(msg, stack);
};

/**
 * Push a React-specific error into the debug system.
 * Used by RootErrorBoundary to include component stack traces.
 */
function logDebugError(message, stack) {
    debugAdd('react', 'error', message, stack ? { stack } : null);
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
        // Use original (unpatched) console.error to log to browser devtools
        // without triggering the console interceptor — logDebugError below
        // already creates the structured debugLog entry with component stack.
        originalConsoleError.call(console, 'Root ErrorBoundary caught:', error, info.componentStack);
        logDebugError(error.message, error.stack + '\n\nComponent Stack:' + info.componentStack);
    }

    // Fix: Replaced hardcoded inline style colors with CSS variable-based classes.
    // Error boundary fallback intentionally uses minimal inline layout styles
    // (flexbox centering) because the CSS file may not have loaded when this
    // renders, but colors now come from CSS variables via utility classes.
    render() {
        if (this.state.hasError) {
            return (
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    minHeight: '100vh', flexDirection: 'column', gap: '16px',
                    padding: '24px', textAlign: 'center',
                }}>
                    <p className="text-themed-secondary root-error-message">
                        Something went wrong loading the dashboard.
                    </p>
                    <p className="text-themed-tertiary root-error-detail">
                        {this.state.error?.message || 'Unknown error'}
                    </p>
                    <p className="text-themed-muted root-error-hint">
                        Error details are in the banner below. Use &ldquo;Copy&rdquo; to share.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn-icon btn-primary"
                    >
                        Reload
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}

// Theme is applied by the flash prevention script in index.html <head>.
// Do NOT set dark class here — it would override the user's stored preference.

const root = createRoot(document.getElementById('root'));
root.render(
    <RootErrorBoundary>
        <ToastProvider>
            <AppProvider>
                <App />
            </AppProvider>
        </ToastProvider>
    </RootErrorBoundary>
);

// Mount React DebugPill in separate root — survives App crashes.
// Skipped in embed mode (inline HTML pill also skips embeds).
if (!new URLSearchParams(location.search).has('embed')) {
    const debugRoot = document.getElementById('debug-root');
    if (debugRoot) {
        createRoot(debugRoot).render(<DebugPill />);
    }
}
