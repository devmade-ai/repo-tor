import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import useEscapeKey from '../hooks/useEscapeKey.js';
import useDisclosureFocus from '../hooks/useDisclosureFocus.js';
import useFocusTrap from '../hooks/useFocusTrap.js';
import { version } from '../../../package.json';

// Requirement: Data-driven hamburger menu matching glow-props BurgerMenu pattern
// Approach: Disclosure-pattern dropdown (not ARIA menu) with data-driven items array.
//   Each item has: label, action, icon (optional), visible, separator, external, destructive, disabled.
//   Show/hide based on visible flag. Disabled items render grayed-out and are skipped by keyboard nav.
// Alternatives:
//   - Hardcoded JSX per item: Rejected — adding/removing items requires component edits
//   - role="menu" pattern: Rejected — ARIA menu causes screen readers to enter forms mode
//   - Headless UI Disclosure: Viable — adds dependency for a single component
// See docs/implementations/BURGER_MENU.md for the full cross-project reference.

/**
 * Data-driven hamburger menu. Items are filtered by `visible` (default true),
 * rendered with optional icons, separators, external indicators, and destructive styling.
 *
 * @param {Array} items - Menu items: { label, action, icon?, visible?, separator?, external?, destructive?, disabled?, highlight? }
 */
export default function HamburgerMenu({ items }) {
    const menuId = useId();
    const [open, setOpen] = useState(false);
    const triggerRef = useRef(null);
    // useFocusTrap returns a ref that traps Tab/Shift+Tab within the container.
    // Used as the menu container ref so focus cannot escape to the page behind.
    const menuRef = useFocusTrap(open);
    const timerRef = useRef(null);

    const visibleItems = items.filter(item => item.visible !== false);

    const toggle = useCallback(() => setOpen(prev => !prev), []);
    const close = useCallback(() => setOpen(false), []);

    useEscapeKey(open, close);
    useDisclosureFocus(open, menuRef, triggerRef);

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
        timerRef.current = setTimeout(async () => {
            try {
                await action();
            } catch (e) {
                console.error('Menu action failed:', e);
                if (typeof window.__debugPushError === 'function') {
                    window.__debugPushError('Menu action failed: ' + e.message, e.stack);
                }
            }
        }, 150);
    }

    // Keyboard navigation between menu items.
    // ArrowDown/ArrowUp: move focus with wrap-around at boundaries.
    // Home/End: jump to first/last item (standard disclosure pattern keys).
    function handleMenuKeyDown(e) {
        const navKeys = ['ArrowDown', 'ArrowUp', 'Home', 'End'];
        if (!navKeys.includes(e.key)) return;
        e.preventDefault();
        const buttons = menuRef.current?.querySelectorAll('button:not([disabled])');
        if (!buttons?.length) return;
        const currentIdx = Array.from(buttons).indexOf(document.activeElement);
        let nextIdx;
        if (e.key === 'ArrowDown') {
            nextIdx = currentIdx < buttons.length - 1 ? currentIdx + 1 : 0;
        } else if (e.key === 'ArrowUp') {
            nextIdx = currentIdx > 0 ? currentIdx - 1 : buttons.length - 1;
        } else if (e.key === 'Home') {
            nextIdx = 0;
        } else {
            nextIdx = buttons.length - 1;
        }
        buttons[nextIdx].focus();
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
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
            </button>

            {open && (
                <>
                    {/* Backdrop — cursor-pointer required for iOS Safari */}
                    <div className="hamburger-backdrop" onClick={close} />
                    <nav
                        ref={menuRef}
                        id={menuId}
                        aria-label="Secondary actions"
                        className="hamburger-dropdown"
                        onKeyDown={handleMenuKeyDown}
                    >
                        <ul className="hamburger-list">
                            {visibleItems.map((item, i) => (
                                <li key={item.label}>
                                    {item.separator && i > 0 && (
                                        <div className="hamburger-divider" />
                                    )}
                                    <button
                                        type="button"
                                        className={`hamburger-item${item.destructive ? ' hamburger-item-destructive' : ''}${item.highlight ? ' hamburger-item-highlight' : ''}${item.disabled ? ' hamburger-item-disabled' : ''}`}
                                        onClick={item.disabled ? undefined : () => handleItem(item.action)}
                                        disabled={!!item.disabled}
                                    >
                                        {item.icon && (
                                            <span className="hamburger-item-icon" aria-hidden="true">{item.icon}</span>
                                        )}
                                        <span className="hamburger-item-label">{item.label}</span>
                                        {item.external && (
                                            <svg className="hamburger-item-external" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                                                <path d="M3.5 3H9v5.5M9 3L3 9" strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                        )}
                                    </button>
                                </li>
                            ))}
                        </ul>
                        <div className="hamburger-divider" />
                        <div className="hamburger-version">v{version}</div>
                    </nav>
                </>
            )}
        </div>
    );
}
