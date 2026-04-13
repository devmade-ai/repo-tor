/**
 * React entry point for the Git Analytics Dashboard
 */
import React from 'react';
import { createRoot } from 'react-dom/client';
import '../styles.css';
import { AppProvider } from './AppContext.jsx';
import { ToastProvider } from './components/Toast.jsx';
import App from './App.jsx';
import './pwa.js';

// Requirement: Structured debug logging with console interception
// Approach: Import debugLog.js early — at module load it patches console.error/warn,
//   installs global error listeners, and ingests pre-existing inline pill errors.
//   DebugPill renders in a separate React root (#debug-root) so it survives App crashes.
// Alternatives:
//   - Keep inline pill only: Rejected — no structured entries, no tabs, no pub/sub
//   - Render DebugPill inside App tree: Rejected — dies when App crashes
import { debugAdd } from './debugLog.js';
import { isEmbedMode } from './urlParams.js';
import DebugPill from './components/DebugPill.jsx';

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

// Chart.js theme colors (axis labels, grid lines) are set in AppContext.jsx's
// darkMode effect so they update on theme toggle. Initial values are set there
// too — no need to read CSS variables here at module load time.

// Bridge the embedder's URL `?accent=` / `?palette=` override to CSS via
// `--chart-accent-override`. The heatmap intensity rules in styles.css use
// `var(--chart-accent-override, var(--color-primary))` so when this property
// is unset the heatmap tracks the active DaisyUI theme's --color-primary
// automatically. When the embedder supplied a URL override, we pin the CSS
// property so all themes render the embed brand color instead.
//
// Requirement: Embedders that use the dashboard inside a branded iframe
//   want their chosen accent color to survive theme picker clicks. For
//   in-dashboard use (no embed override) the heatmap should track the
//   active theme so lofi/nord/emerald/caramellatte/black/dim/coffee/dracula
//   users each see their theme's primary instead of brand blue.
// Approach: Only set --chart-accent-override when an explicit URL override
//   was supplied. The CSS `var()` fallback chain handles the no-override
//   case for free.
// Alternatives:
//   - Always set --chart-accent-override to the bootstrap accent: Rejected
//     — would shadow DaisyUI's --color-primary even when no embedder is
//     involved, re-introducing the "off-brand single-accent charts" bug
//     the 2026-04-13 audit caught.
//   - Set via JavaScript on every theme change: Rejected — the CSS var()
//     fallback already handles theme tracking without any JS involvement.
import { accentColor, hasUrlAccentOverride } from './chartColors.js';
if (hasUrlAccentOverride) {
    document.documentElement.style.setProperty('--chart-accent-override', accentColor);
}

// === Debug Bridge ===
// Requirement: Debug pill must work even when JS bundle fails to load
// Approach: The inline pill (index.html) handles pre-React errors. debugLog.js provides
//   a structured pub/sub store with console interception. DebugPill.jsx renders the React
//   UI in a separate root (#debug-root). On mount it hides the inline pill and takes over.
// Alternatives:
//   - Keep inline pill only: Rejected — no structured entries, tabs, or pub/sub
//   - Render DebugPill inside App tree: Rejected — dies when App crashes

// Signal that the JS bundle loaded and React is about to mount.
// Clears the 20-second loading timeout warning from the HTML script.
if (typeof window.__debugClearLoadTimer === 'function') {
    window.__debugClearLoadTimer();
}

debugAdd('boot', 'info', 'React bundle loaded, mounting app');

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
        debugAdd('render', 'error', error.message, {
            stack: error.stack,
            componentStack: info.componentStack,
        });
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
                    <p className="text-base-content/80 root-error-message">
                        Something went wrong loading the dashboard.
                    </p>
                    <p className="text-base-content/60 root-error-detail">
                        {this.state.error?.message || 'Unknown error'}
                    </p>
                    <p className="text-base-content/40 root-error-hint">
                        Error details are in the banner below. Use &ldquo;Copy&rdquo; to share.
                    </p>
                    <button
                        onClick={() => window.location.reload()}
                        className="btn btn-primary"
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

// Requirement: Debug pill in separate React root — survives App crashes
// Approach: Mount DebugPill in #debug-root (added to index.html), completely isolated
//   from the App tree. If App crashes, the debug pill still shows diagnostics.
//   Skipped in embed mode — embedded charts shouldn't show debug UI.
const debugRootEl = document.getElementById('debug-root');
if (debugRootEl && !isEmbedMode) {
    const debugRoot = createRoot(debugRootEl);
    debugRoot.render(<DebugPill />);
}

debugAdd('boot', 'success', 'React app mounted successfully');
