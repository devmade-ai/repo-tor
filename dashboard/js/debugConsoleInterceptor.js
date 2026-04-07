/**
 * Console interception — patches console.error and console.warn to capture
 * React warnings and runtime errors into the debugLog module.
 *
 * Requirement: React warnings (prop types, key warnings, strict mode) and
 *   console.error calls should appear in the debug log for diagnostics.
 * Approach: Wrap console.error/warn, call original first, then feed into debugLog.
 *   Imported early in main.jsx so it captures React's own console calls.
 * Alternatives:
 *   - Patch in index.html inline script: Rejected — can't import ES modules there,
 *     and the inline pill already captures window.onerror/unhandledrejection
 *   - Only capture in ErrorBoundary: Rejected — misses console.warn (React warnings)
 *     and console.error calls that don't throw (e.g. prop validation)
 */

import { debugAdd } from './debugLog.js';

// Exported so callers (e.g. RootErrorBoundary) can log to browser devtools
// without triggering the interceptor — avoids double-capture in debugLog.
export const originalConsoleError = console.error;
const originalWarn = console.warn;

// Reentrant guard — prevents infinite recursion if a debugLog subscriber
// or debugAdd itself triggers console.error/warn (e.g. via a React re-render
// that logs a warning). Without this, the call chain would be:
// console.error → debugAdd → subscriber → console.error → debugAdd → ...
let intercepting = false;

console.error = function (...args) {
    originalConsoleError.apply(console, args);
    if (intercepting) return;
    intercepting = true;
    try {
        const message = args.map(a => (typeof a === 'string' ? a : String(a))).join(' ');
        debugAdd('console', 'error', message);
    } finally {
        intercepting = false;
    }
};

console.warn = function (...args) {
    originalWarn.apply(console, args);
    if (intercepting) return;
    intercepting = true;
    try {
        const message = args.map(a => (typeof a === 'string' ? a : String(a))).join(' ');
        debugAdd('console', 'warn', message);
    } finally {
        intercepting = false;
    }
};
