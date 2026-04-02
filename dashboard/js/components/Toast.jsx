// Requirement: Non-blocking feedback notifications for user actions
// Approach: Context provider + useToast hook. Stacking, auto-dismiss, exit animation.
//   Adapted from glow-props PWA_SYSTEM.md Toast pattern for repo-tor's CSS variable system.
// Alternatives:
//   - Browser alert(): Rejected — blocks UI, jarring
//   - Third-party library (react-hot-toast): Rejected — adds dependency for simple feature
//   - Inline toast in App.jsx: Rejected — not reusable, only supports one toast at a time

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react';

const ToastContext = createContext(null);

let toastId = 0;
function nextToastId() {
    toastId = (toastId + 1) % Number.MAX_SAFE_INTEGER;
    return toastId;
}

/**
 * Hook to show toast notifications from any component.
 * Must be used within a ToastProvider.
 *
 * Usage:
 *   const { addToast, removeToast } = useToast();
 *   addToast('Saved successfully', { type: 'success' });
 *   addToast('Something went wrong', { type: 'error', duration: 5000 });
 */
export function useToast() {
    const context = useContext(ToastContext);
    if (!context) throw new Error('useToast must be used within a ToastProvider');
    return context;
}

/**
 * Individual toast with auto-dismiss and exit animation.
 * Duration of 0 means persistent (no auto-dismiss).
 */
function ToastItem({ toast, onRemove }) {
    const [isExiting, setIsExiting] = useState(false);

    useEffect(() => {
        if (toast.duration <= 0) return;
        const timer = setTimeout(() => setIsExiting(true), toast.duration);
        return () => clearTimeout(timer);
    }, [toast.duration]);

    useEffect(() => {
        if (!isExiting) return;
        // Wait for exit animation (200ms) before removing from DOM
        const timer = setTimeout(() => onRemove(toast.id), 200);
        return () => clearTimeout(timer);
    }, [isExiting, toast.id, onRemove]);

    return (
        <div
            className={`toast-item toast-${toast.type} ${isExiting ? 'toast-exit' : 'toast-enter'}`}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        >
            <span className="toast-message">{toast.message}</span>
            <button
                type="button"
                className="toast-dismiss"
                onClick={() => setIsExiting(true)}
                aria-label="Dismiss"
            >
                ✕
            </button>
        </div>
    );
}

function ToastContainer({ toasts, onRemove }) {
    if (toasts.length === 0) return null;
    return (
        <div className="toast-container no-print" aria-live="polite" aria-atomic="false">
            {toasts.map(toast => (
                <ToastItem key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
}

/**
 * Wrap your app in ToastProvider to enable useToast() in any component.
 *
 *   <ToastProvider>
 *     <App />
 *   </ToastProvider>
 */
export function ToastProvider({ children }) {
    const [toasts, setToasts] = useState([]);

    const addToast = useCallback((message, { type = 'info', duration = 3000 } = {}) => {
        const id = nextToastId();
        setToasts(prev => [...prev, { id, message, type, duration }]);
        return id;
    }, []);

    const removeToast = useCallback((id) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ addToast, removeToast }}>
            {children}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </ToastContext.Provider>
    );
}
