// Requirement: Show browser-specific PWA install instructions for Safari/Firefox users
// Approach: Data-driven modal renders whatever getInstallInstructions() returns.
//   Focus-trapped for keyboard accessibility. Benefits section explains WHY to install
//   for non-technical users who don't know what a PWA is.
// Alternatives:
//   - Hardcoded per-browser components: Rejected — adding a browser is a new component
//   - External link to install guide: Rejected — interrupts user flow
//   - Skip non-Chromium browsers: Rejected — Safari/Firefox users can still install manually

import React, { useRef } from 'react';
import useFocusTrap from '../hooks/useFocusTrap.js';
import useEscapeKey from '../hooks/useEscapeKey.js';

export default function InstallInstructionsModal({ isOpen, onClose, instructions }) {
    const modalRef = useRef(null);
    useFocusTrap(modalRef, isOpen);
    useEscapeKey(isOpen, onClose);

    if (!isOpen || !instructions) return null;

    return (
        <div className="install-modal-overlay">
            <div
                className="install-modal-backdrop"
                onClick={onClose}
                role="presentation"
            />
            <div
                ref={modalRef}
                className="install-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Install app"
                tabIndex={-1}
            >
                {/* Header */}
                <div className="install-modal-header">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    <div>
                        <h2 className="text-themed-primary text-base font-semibold">Install App</h2>
                        <p className="text-themed-tertiary text-xs">{instructions.browser}</p>
                    </div>
                </div>

                {/* Numbered steps — rendered from data */}
                <ol className="install-modal-steps">
                    {instructions.steps.map((step, i) => (
                        <li key={i} className="install-modal-step">
                            <span className="install-modal-step-number">{i + 1}</span>
                            <span className="text-themed-secondary text-sm">{step}</span>
                        </li>
                    ))}
                </ol>

                {/* Optional warning note (e.g., Brave Shields, Firefox desktop) */}
                {instructions.note && (
                    <div className="install-modal-note">
                        <strong>Note:</strong> {instructions.note}
                    </div>
                )}

                {/* Benefits — helps non-technical users understand WHY to install */}
                <div className="install-modal-benefits">
                    <p className="text-themed-tertiary text-xs mb-2">Benefits of installing:</p>
                    <ul className="text-themed-muted text-xs">
                        <li>Works offline</li>
                        <li>Launches from your dock or home screen</li>
                        <li>Full-screen experience without browser controls</li>
                    </ul>
                </div>

                <button
                    type="button"
                    className="btn-primary install-modal-close"
                    onClick={onClose}
                >
                    Got it
                </button>
            </div>
        </div>
    );
}
