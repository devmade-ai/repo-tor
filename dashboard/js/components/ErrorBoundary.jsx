import React from 'react';
import { debugAdd } from '../debugLog.js';

// Requirement: Catch section-level React errors and show fallback UI
// Approach: Class component ErrorBoundary wraps each tab section. Routes
//   errors to debugLog for diagnostics AND shows inline fallback with retry button.
// Alternatives:
//   - Let errors bubble to RootErrorBoundary: Rejected — crashes entire app
//     for a single section failure
//   - React Suspense: Rejected — Suspense doesn't catch render errors

export default class ErrorBoundary extends React.Component {
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

    render() {
        if (this.state.hasError) {
            return (
                <div role="alert" className="card bg-base-200 border border-base-300">
                    <div className="card-body items-center text-center py-8">
                        <p className="text-base-content/80 text-sm">Something went wrong rendering this section.</p>
                        <button
                            className="btn btn-outline btn-sm mt-3"
                            onClick={() => this.setState({ hasError: false, error: null })}
                        >
                            Try again
                        </button>
                    </div>
                </div>
            );
        }
        return this.props.children;
    }
}
