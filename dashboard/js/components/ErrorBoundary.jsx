import React from 'react';

export default class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error) {
        return { hasError: true, error };
    }

    componentDidCatch(error, info) {
        console.error('ErrorBoundary caught:', error, info.componentStack);
    }

    render() {
        if (this.state.hasError) {
            return (
                <div className="card" style={{ textAlign: 'center', padding: '32px 16px' }}>
                    <p className="text-themed-secondary text-sm">Something went wrong rendering this section.</p>
                    <button
                        className="btn-icon btn-secondary"
                        style={{ marginTop: '12px' }}
                        onClick={() => this.setState({ hasError: false, error: null })}
                    >
                        Try again
                    </button>
                </div>
            );
        }
        return this.props.children;
    }
}
