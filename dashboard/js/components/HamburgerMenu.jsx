import React, { useState, useCallback, useRef } from 'react';
import useEscapeKey from '../hooks/useEscapeKey.js';
import useClickOutside from '../hooks/useClickOutside.js';
import { version } from '../../../package.json';

// Requirement: Group secondary header actions into a hamburger menu
// Approach: Dropdown menu with click-outside-to-close, Escape key, and arrow
//   key navigation between menu items for full keyboard accessibility.
//   Items: Quick Guide, Save as PDF, Install App (conditional), Check for Updates (conditional).
//   Version imported from package.json so it stays in sync automatically.
// Alternatives:
//   - Full-screen overlay menu: Rejected — overkill for 3-5 items
//   - Bottom sheet on mobile: Rejected — inconsistent with desktop, adds complexity
//   - Tooltip-style popover: Rejected — too small for touch targets
//   - Hardcoded version string: Rejected — drifts from package.json on bump

export default function HamburgerMenu({
    onOpenGuide,
    onSavePDF,
    onInstall,
    onUpdate,
    installReady,
    updateAvailable,
}) {
    const [open, setOpen] = useState(false);
    const menuRef = useRef(null);

    const toggle = useCallback(() => setOpen(prev => !prev), []);
    const close = useCallback(() => setOpen(false), []);

    useClickOutside(menuRef, open, close);
    useEscapeKey(open, close);

    function handleItem(action) {
        close();
        action();
    }

    // Requirement: Arrow key navigation between menu items (WAI-ARIA menu pattern)
    // Approach: On ArrowDown/ArrowUp, find all visible menuitem buttons and move
    //   focus to the next/previous one. Wraps around at boundaries.
    // Alternatives:
    //   - roving tabindex: Rejected — more complex state management for same result
    //   - Tab-only navigation: Rejected — doesn't meet ARIA menu keyboard expectations
    function handleMenuKeyDown(e) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll('[role="menuitem"]');
        if (!items?.length) return;
        const currentIdx = Array.from(items).indexOf(document.activeElement);
        let nextIdx;
        if (e.key === 'ArrowDown') {
            nextIdx = currentIdx < items.length - 1 ? currentIdx + 1 : 0;
        } else {
            nextIdx = currentIdx > 0 ? currentIdx - 1 : items.length - 1;
        }
        items[nextIdx].focus();
    }

    return (
        <div className="hamburger-menu" ref={menuRef}>
            <button
                type="button"
                className="btn-theme"
                onClick={toggle}
                aria-label="Menu"
                aria-expanded={open}
                aria-haspopup="true"
            >
                {/* Hamburger icon — 3 horizontal lines */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {open && (
                <div className="hamburger-dropdown" role="menu" onKeyDown={handleMenuKeyDown}>
                    <button
                        type="button"
                        className="hamburger-item"
                        role="menuitem"
                        onClick={() => handleItem(onOpenGuide)}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        Quick Guide
                    </button>

                    <button
                        type="button"
                        className="hamburger-item"
                        role="menuitem"
                        onClick={() => handleItem(onSavePDF)}
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                        </svg>
                        Save as PDF
                    </button>

                    {installReady && (
                        <button
                            type="button"
                            className="hamburger-item"
                            role="menuitem"
                            onClick={() => handleItem(onInstall)}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                            </svg>
                            Install App
                        </button>
                    )}

                    {updateAvailable && (
                        <button
                            type="button"
                            className="hamburger-item hamburger-item-highlight"
                            role="menuitem"
                            onClick={() => handleItem(onUpdate)}
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                            </svg>
                            Check for Updates
                        </button>
                    )}

                    <div className="hamburger-divider" />
                    <div className="hamburger-version">v{version}</div>
                </div>
            )}
        </div>
    );
}
