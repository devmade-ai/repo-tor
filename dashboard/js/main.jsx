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
