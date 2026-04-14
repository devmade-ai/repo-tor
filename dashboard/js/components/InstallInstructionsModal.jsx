// Requirement: Show browser-specific PWA install instructions for Safari/Firefox users
// Approach: Data-driven modal renders whatever getInstallInstructions() returns.
//   Focus-trapped for keyboard accessibility. Benefits section explains WHY to install
//   for non-technical users who don't know what a PWA is.
// Alternatives:
//   - Hardcoded per-browser components: Rejected — adding a browser is a new component
//   - External link to install guide: Rejected — interrupts user flow
//   - Skip non-Chromium browsers: Rejected — Safari/Firefox users can still install manually

import React from 'react';
import useFocusTrap from '../hooks/useFocusTrap.js';
import useEscapeKey from '../hooks/useEscapeKey.js';

export default function InstallInstructionsModal({ isOpen, onClose, instructions }) {
    // useFocusTrap(active) returns a ref — do NOT pass a ref as first arg.
    // Compare: DetailPane.jsx, SettingsPane.jsx, QuickGuide.jsx all use this correctly.
    const trapRef = useFocusTrap(isOpen);
    useEscapeKey(isOpen, onClose);

    if (!isOpen || !instructions) return null;

    // DaisyUI modal (CSS-class form). Structure mirrors QuickGuide — see
    // that component for the rationale on using the CSS-class form instead
    // of the native <dialog> element.
    return (
        <div
            ref={trapRef}
            className="modal modal-open"
            role="dialog"
            aria-modal="true"
            aria-label="Install app"
            tabIndex={-1}
        >
            <div className="modal-box w-105 max-w-viewport-margin">
                {/* Header */}
                <div className="flex items-center gap-3 mb-4">
                    <svg className="w-5 h-5 text-primary shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <div>
                        <h2 className="text-base-content text-base font-semibold">Install App</h2>
                        <p className="text-base-content/60 text-xs">{instructions.browser}</p>
                    </div>
                </div>

                {/* Numbered steps — rendered from data. Each step has a
                    circular badge with the step number and a one-line
                    instruction. */}
                <ol className="list-none p-0 m-0 mb-4 flex flex-col gap-2">
                    {instructions.steps.map((step, i) => (
                        <li key={i} className="flex items-start gap-3">
                            <span
                                className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-semibold shrink-0 bg-primary/10 text-primary"
                                aria-hidden="true"
                            >
                                {i + 1}
                            </span>
                            <span className="text-base-content/80 text-sm">{step}</span>
                        </li>
                    ))}
                </ol>

                {/* Optional warning note (e.g., Brave Shields, Firefox
                    desktop). Uses DaisyUI alert-warning with alert-soft for
                    a muted inline warning box. */}
                {instructions.note && (
                    <div role="alert" className="alert alert-warning alert-soft text-xs mb-4">
                        <span><strong>Note:</strong> {instructions.note}</span>
                    </div>
                )}

                {/* Benefits — helps non-technical users understand WHY to install. */}
                <div className="border-t border-base-300 pt-4">
                    <p className="text-base-content/60 text-xs mb-2">Benefits of installing:</p>
                    <ul className="text-base-content/60 text-xs list-none p-0 m-0 flex flex-col gap-1">
                        <li>✓ Works offline</li>
                        <li>✓ Launches from your dock or home screen</li>
                        <li>✓ Full-screen experience without browser controls</li>
                    </ul>
                </div>

                <div className="modal-action mt-4">
                    <button
                        type="button"
                        className="btn btn-primary btn-block"
                        onClick={onClose}
                    >
                        Got it
                    </button>
                </div>
            </div>
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div className="modal-backdrop" onClick={onClose} role="presentation" />
        </div>
    );
}
