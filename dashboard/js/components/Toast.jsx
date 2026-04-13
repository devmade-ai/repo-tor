// Requirement: Non-blocking feedback notifications for user actions
// Approach: Context provider + useToast hook. Stacking, auto-dismiss, exit animation.
//   Built on DaisyUI's `toast` positioning wrapper + `alert alert-*` variants
//   so notifications get proper ARIA roles, DaisyUI theme-aware styling, and
//   automatic contrast via *-content tokens without a bespoke CSS block.
// Alternatives:
//   - Browser alert(): Rejected — blocks UI, jarring
//   - Third-party library (react-hot-toast): Rejected — adds dependency for simple feature
//   - Inline toast in App.jsx: Rejected — not reusable, only supports one toast at a time
//   - Custom .toast-* CSS classes (previous approach): Rejected — shadowed
//     DaisyUI's built-in toast component class and required ~60 lines of
//     hand-maintained CSS for styling, enter/exit animations, and dismiss
//     button. DaisyUI provides all of this via `toast toast-top toast-center`
//     + `alert alert-*` + Tailwind transition utilities.

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

// Map our toast types to DaisyUI alert variants. Kept as an object rather
// than inline template strings so the mapping is explicit and the build
// can tree-shake unused Tailwind classes cleanly.
const ALERT_CLASS_BY_TYPE = {
    success: 'alert alert-success',
    error: 'alert alert-error',
    warning: 'alert alert-warning',
    info: 'alert alert-info',
};

/**
 * Individual toast with auto-dismiss and exit animation.
 * Duration of 0 means persistent (no auto-dismiss).
 *
 * Requirement: toasts should fade+slide in when appearing and out when
 *   dismissed. DaisyUI's alert has no built-in enter/exit animation, so
 *   we layer Tailwind transition utilities on top: opacity-0 + translate-y-2
 *   while exiting, opacity-100 + translate-y-0 otherwise, 200ms ease.
 * Approach: Two-stage state — isExiting triggers the exit transition; a
 *   second effect waits the transition duration then calls onRemove which
 *   unmounts the node. Matches the pre-migration animation timing.
 * Alternatives:
 *   - CSS keyframes in styles.css: Rejected — defeats the purpose of the
 *     phase (removing custom .toast-* CSS).
 *   - React Spring / Framer Motion: Rejected — adds dependency for
 *     6 lines of Tailwind.
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
        // Wait for exit animation (200 ms) before removing from DOM.
        const timer = setTimeout(() => onRemove(toast.id), 200);
        return () => clearTimeout(timer);
    }, [isExiting, toast.id, onRemove]);

    const alertClass = ALERT_CLASS_BY_TYPE[toast.type] || ALERT_CLASS_BY_TYPE.info;

    return (
        <div
            className={`${alertClass} shadow-lg transition-all duration-200 ease-out ${
                isExiting ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
            }`}
            role={toast.type === 'error' ? 'alert' : 'status'}
            aria-live={toast.type === 'error' ? 'assertive' : 'polite'}
        >
            <span className="flex-1">{toast.message}</span>
            <button
                type="button"
                className="btn btn-ghost btn-xs btn-circle"
                onClick={() => setIsExiting(true)}
                aria-label="Dismiss"
            >
                ✕
            </button>
        </div>
    );
}

// DaisyUI's `toast` class is a positioning wrapper that stacks children
// in the corner of the viewport. `toast-bottom toast-center` matches our
// pre-migration placement (bottom center). An inline z-index style
// threads our --z-toast scale value (70) into the element — DaisyUI's
// default z-index doesn't stack above our custom debug pill (--z-debug:80)
// or against the dashboard drawer layers, so we pin it explicitly.
// The `no-print` class keeps toasts out of PDF exports.
function ToastContainer({ toasts, onRemove }) {
    if (toasts.length === 0) return null;
    return (
        <div
            className="toast toast-bottom toast-center no-print"
            style={{ zIndex: 'var(--z-toast)' }}
            aria-live="polite"
            aria-atomic="false"
        >
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
