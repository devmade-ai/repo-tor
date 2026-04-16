import React, { useState, useEffect, useCallback } from 'react';
import useFocusTrap from '../hooks/useFocusTrap.js';
import useEscapeKey from '../hooks/useEscapeKey.js';
import useScrollLock from '../hooks/useScrollLock.js';
import { safeStorageGet, safeStorageSet } from '../utils.js';

// Requirement: Provide a simple onboarding tutorial for non-technical users
// Approach: 4-step modal with Next/Back navigation, auto-shows on first visit
// Alternatives:
//   - Inline tooltips pointing at UI elements: Rejected — complex positioning,
//     breaks on mobile, requires knowing element locations
//   - Video walkthrough: Rejected — heavy asset, can't update easily, not accessible
//   - Always-visible help text: Rejected — clutters the UI permanently

const STEPS = [
    {
        title: 'Welcome to Git Analytics',
        body: 'This dashboard shows your team\u2019s work patterns, progress, and activity over time. Everything updates automatically based on your project data.',
        icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
        ),
    },
    {
        title: 'Explore the Tabs',
        body: 'Use the tabs at the top to switch between views. Summary gives you the highlights, Timeline shows trends, Breakdown has detailed numbers, Health flags potential issues, Discover reveals fun insights, and Projects shows all your repositories.',
        icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
        ),
    },
    {
        title: 'Filter Your Data',
        body: 'On larger screens, use the filter panel on the left to focus on specific time periods, people, or projects. On phones and tablets, tap the filter button in the header to open the same panel. When a filter is active, the header shows how many changes are visible out of the total.',
        icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
            </svg>
        ),
    },
    {
        title: 'Choose Your View Level',
        body: 'Open Settings to change the level of detail. Executive shows high-level summaries, Management shows team breakdowns, and Developer shows everything. Pick what makes sense for you.',
        icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
            </svg>
        ),
    },
];

const STORAGE_KEY = 'quickGuideSeen';

export default function QuickGuide({ open, onClose }) {
    const [step, setStep] = useState(0);
    const trapRef = useFocusTrap(open);

    useEscapeKey(open, onClose);
    useScrollLock(open);

    // Reset to first step when opening and move focus into modal
    // Requirement: Keyboard users must know focus moved to the modal
    // Approach: Focus the modal container after a short delay (allows CSS transition)
    // Alternatives:
    //   - Focus first button: Rejected — skips the title/content, screen readers miss context
    //   - No focus management: Rejected — keyboard users stay behind the overlay
    useEffect(() => {
        if (open) {
            setStep(0);
            const id = setTimeout(() => trapRef.current?.focus(), 50);
            return () => clearTimeout(id);
        }
    }, [open]);

    const handleNext = useCallback(() => {
        if (step < STEPS.length - 1) {
            setStep(s => s + 1);
        } else {
            onClose();
        }
    }, [step, onClose]);

    const handleBack = useCallback(() => {
        if (step > 0) setStep(s => s - 1);
    }, [step]);

    if (!open) return null;

    const current = STEPS[step];
    const isLast = step === STEPS.length - 1;

    // DaisyUI modal structure (CSS-class form, not native <dialog>):
    //   <div class="modal modal-open"> positioning wrapper + backdrop
    //     <div class="modal-box"> centered content box
    //     <div class="modal-backdrop"> click-outside layer (transparent by
    //       default — modal wrapper provides the dim overlay)
    // We use the CSS-class form instead of <dialog> + showModal() because
    // React state controls open/close, not native dialog semantics. The
    // modal-backdrop div handles click-outside-to-close; useEscapeKey
    // handles Escape.
    return (
        <div
            ref={trapRef}
            className="modal modal-open"
            role="dialog"
            aria-modal="true"
            aria-label="Quick Guide"
            tabIndex={-1}
        >
            <div className="modal-box relative px-7 pt-8 pb-6">
                <button
                    className="btn btn-sm btn-circle btn-ghost absolute right-3 top-3"
                    onClick={onClose}
                    aria-label="Close guide"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className="text-center mb-6">
                    <div className="flex justify-center mb-4 opacity-80 text-base-content">
                        {current.icon}
                    </div>
                    <h2 className="text-lg font-semibold font-mono text-base-content mb-2.5">{current.title}</h2>
                    <p className="text-sm leading-relaxed text-base-content/80">{current.body}</p>
                </div>

                <div className="modal-action mt-0 flex items-center justify-between">
                    {/* Pagination dots — visual progress indicator for the 4-step guide */}
                    <div className="flex gap-1.5" aria-hidden="true">
                        {STEPS.map((_, i) => (
                            <span
                                key={i}
                                className={`w-2 h-2 rounded-full transition-colors ${
                                    i === step ? 'bg-primary' : 'bg-base-300'
                                }`}
                            />
                        ))}
                    </div>
                    <div className="flex gap-2">
                        {step > 0 && (
                            <button
                                type="button"
                                className="btn btn-ghost btn-sm"
                                onClick={handleBack}
                            >
                                Back
                            </button>
                        )}
                        <button
                            type="button"
                            className="btn btn-primary btn-sm"
                            onClick={handleNext}
                        >
                            {isLast ? 'Got it' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div className="modal-backdrop" onClick={onClose} role="presentation" />
        </div>
    );
}

/** Returns true if the user has never seen the quick guide */
QuickGuide.shouldAutoShow = function () {
    return safeStorageGet(STORAGE_KEY) !== 'true';
};

/** Mark the quick guide as seen */
QuickGuide.markSeen = function () {
    safeStorageSet(STORAGE_KEY, 'true');
};
