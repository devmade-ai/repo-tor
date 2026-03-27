import React, { useState, useEffect, useCallback } from 'react';
import useFocusTrap from '../hooks/useFocusTrap.js';
import useEscapeKey from '../hooks/useEscapeKey.js';

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
        body: 'Use the tabs at the top to switch between views. Summary gives you the highlights, Timeline shows trends, Breakdown has detailed numbers, Health flags potential issues, and Discover reveals fun insights.',
        icon: (
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h7" />
            </svg>
        ),
    },
    {
        title: 'Filter Your Data',
        body: 'Use the filter button to focus on specific time periods, people, or projects. When a filter is active, the header shows how many changes are visible out of the total.',
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

    // Reset to first step when opening + lock body scroll
    useEffect(() => {
        if (open) {
            setStep(0);
            document.body.style.overflow = 'hidden';
        }
        return () => { document.body.style.overflow = ''; };
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

    return (
        <>
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div className="quick-guide-overlay" onClick={onClose} aria-hidden="true" />
            <div
                ref={trapRef}
                className="quick-guide-modal"
                role="dialog"
                aria-modal="true"
                aria-label="Quick Guide"
            >
                <button
                    className="quick-guide-close"
                    onClick={onClose}
                    aria-label="Close guide"
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>

                <div className="quick-guide-content">
                    <div className="quick-guide-icon text-themed-primary">
                        {current.icon}
                    </div>
                    <h2 className="quick-guide-title">{current.title}</h2>
                    <p className="quick-guide-body">{current.body}</p>
                </div>

                <div className="quick-guide-footer">
                    <div className="quick-guide-dots">
                        {STEPS.map((_, i) => (
                            <span
                                key={i}
                                className={`quick-guide-dot ${i === step ? 'active' : ''}`}
                            />
                        ))}
                    </div>
                    <div className="quick-guide-actions">
                        {step > 0 && (
                            <button
                                type="button"
                                className="quick-guide-btn-secondary"
                                onClick={handleBack}
                            >
                                Back
                            </button>
                        )}
                        <button
                            type="button"
                            className="quick-guide-btn-primary"
                            onClick={handleNext}
                        >
                            {isLast ? 'Got it' : 'Next'}
                        </button>
                    </div>
                </div>
            </div>
        </>
    );
}

/** Returns true if the user has never seen the quick guide */
QuickGuide.shouldAutoShow = function () {
    try {
        return localStorage.getItem(STORAGE_KEY) !== 'true';
    } catch {
        return false;
    }
};

/** Mark the quick guide as seen */
QuickGuide.markSeen = function () {
    try {
        localStorage.setItem(STORAGE_KEY, 'true');
    } catch { /* ignore */ }
};
