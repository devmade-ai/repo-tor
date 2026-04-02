import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import useEscapeKey from '../hooks/useEscapeKey.js';
import { version } from '../../../package.json';

// Requirement: Group secondary header actions into a hamburger menu
// Approach: Disclosure-pattern dropdown (not ARIA menu) with backdrop overlay.
//   Uses aria-expanded on trigger + <nav>/<ul>/<li> structure per WAI-ARIA
//   disclosure pattern. Includes iOS Safari backdrop fix, focus management
//   with hasBeenOpenRef guard, and overscroll-contain on menu card.
// Alternatives:
//   - role="menu" pattern: Rejected — ARIA menu causes screen readers to enter
//     forms mode, suppressing normal Tab navigation. Wrong semantics for nav.
//   - Full-screen overlay menu: Rejected — overkill for 3-5 items
//   - Bottom sheet on mobile: Rejected — inconsistent with desktop, adds complexity
//   - Headless UI Disclosure: Viable — adds dependency for a single component

export default function HamburgerMenu({
    onOpenGuide,
    onSavePDF,
    onInstall,
    onUpdate,
    installReady,
    updateAvailable,
}) {
    const menuId = useId();
    const [open, setOpen] = useState(false);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const timerRef = useRef(null);
    const hasBeenOpenRef = useRef(false);

    const toggle = useCallback(() => setOpen(prev => !prev), []);
    const close = useCallback(() => setOpen(false), []);

    useEscapeKey(open, close);

    // Focus first menu item when dropdown opens, return focus to trigger on close.
    // hasBeenOpenRef guard prevents stealing focus on initial mount (open starts false).
    // cancelAnimationFrame cleanup prevents callback on unmounted component.
    useEffect(() => {
        if (open) {
            hasBeenOpenRef.current = true;
            const rafId = requestAnimationFrame(() => {
                const first = menuRef.current?.querySelector('button');
                first?.focus();
            });
            return () => cancelAnimationFrame(rafId);
        } else if (hasBeenOpenRef.current) {
            triggerRef.current?.focus();
        }
    }, [open]);

    // Cleanup pending action timer on unmount
    useEffect(() => {
        return () => { if (timerRef.current) clearTimeout(timerRef.current); };
    }, []);

    // Close-then-act pattern: close menu before executing the action to prevent
    // visual glitches from state changes while menu is visible. 150ms accounts
    // for the CSS fade animation. Timer cleaned up on unmount via timerRef.
    function handleItem(action) {
        close();
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => {
            try { action(); } catch (e) { console.error('Menu action failed:', e); }
        }, 150);
    }

    // Arrow key navigation between menu items. Wraps around at boundaries.
    function handleMenuKeyDown(e) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const items = menuRef.current?.querySelectorAll('button');
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
        <div className="hamburger-menu">
            <button
                ref={triggerRef}
                type="button"
                className="btn-theme"
                onClick={toggle}
                aria-label="Menu"
                aria-expanded={open}
                aria-controls={menuId}
            >
                {/* Hamburger icon — 3 horizontal lines */}
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {open && (
                <>
                    {/* Backdrop overlay — cursor-pointer required for iOS Safari.
                        iOS Safari does not fire click events on empty <div> elements
                        without cursor: pointer. This is an intentional iOS optimization,
                        not a bug, and persists across all iOS versions. */}
                    <div
                        className="hamburger-backdrop"
                        onClick={close}
                    />
                    <nav
                        ref={menuRef}
                        id={menuId}
                        aria-label="Secondary actions"
                        className="hamburger-dropdown"
                        onKeyDown={handleMenuKeyDown}
                    >
                        <ul className="hamburger-list">
                            <li>
                                <button
                                    type="button"
                                    className="hamburger-item"
                                    onClick={() => handleItem(onOpenGuide)}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                    </svg>
                                    Quick Guide
                                </button>
                            </li>

                            <li>
                                <button
                                    type="button"
                                    className="hamburger-item"
                                    onClick={() => handleItem(onSavePDF)}
                                >
                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                                    </svg>
                                    Save as PDF
                                </button>
                            </li>

                            {installReady && (
                                <li>
                                    <button
                                        type="button"
                                        className="hamburger-item"
                                        onClick={() => handleItem(onInstall)}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                        </svg>
                                        Install App
                                    </button>
                                </li>
                            )}

                            {updateAvailable && (
                                <li>
                                    <button
                                        type="button"
                                        className="hamburger-item hamburger-item-highlight"
                                        onClick={() => handleItem(onUpdate)}
                                    >
                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                        </svg>
                                        Check for Updates
                                    </button>
                                </li>
                            )}
                        </ul>

                        <div className="hamburger-divider" />
                        <div className="hamburger-version">v{version}</div>
                    </nav>
                </>
            )}
        </div>
    );
}
