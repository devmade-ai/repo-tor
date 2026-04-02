// Library entry point for direct React component import.
// Usage: import { App, AppProvider } from 'repo-tor'
//
// Requirement: Allow embedding the dashboard as a React component in other apps
// Approach: Export the core components needed to render the dashboard.
//   Consumers must provide their own React, ReactDOM, and Chart.js (peer deps).
// Alternatives:
//   - Export individual section components: Rejected — too granular, requires
//     understanding internal state management
//   - Export a Web Component: Rejected — loses React interop, adds shadow DOM complexity

export { default as App } from './App.jsx';
export { AppProvider, useApp, useAppDispatch } from './AppContext.jsx';

// Re-export utilities that consumers might need
export { safeStorageGet, safeStorageSet } from './utils.js';
