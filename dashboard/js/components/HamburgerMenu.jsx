import React, { useState, useEffect, useCallback, useRef, useId } from 'react';
import useEscapeKey from '../hooks/useEscapeKey.js';
import { version } from '../../../package.json';
import { debugAdd } from '../debugLog.js';

// Requirement: Data-driven hamburger menu matching glow-props BurgerMenu pattern
// Approach: Disclosure-pattern dropdown (not ARIA menu) with data-driven items array.
//   Each item has: label, action, icon (optional), visible, separator, external, destructive.
//   Show/hide based on state — never render disabled items.
// Alternatives:
//   - Hardcoded JSX per item: Rejected — adding/removing items requires component edits
//   - role="menu" pattern: Rejected — ARIA menu causes screen readers to enter forms mode
//   - Headless UI Disclosure: Viable — adds dependency for a single component
//   - DaisyUI `dropdown` + `dropdown-content menu`: Rejected — DaisyUI's dropdown
//     shows/hides via CSS `:focus` or the `[open]` attribute, which conflicts with
//     our React-state-controlled `open` flag (needed for keepOpen theme picker
//     behavior and async action error capture). DaisyUI's `menu` also implies
//     `role="menu"`, which we explicitly avoid per the BURGER_MENU pattern. The
//     trigger button IS migrated to DaisyUI (`btn btn-ghost btn-square`); the
//     dropdown surface stays custom because no DaisyUI component fits the
//     disclosure pattern without re-introducing the menu-role accessibility trap.
// See docs/implementations/BURGER_MENU.md for the full cross-project reference.

/**
 * Data-driven hamburger menu. Items are filtered by `visible` (default true),
 * rendered with optional icons, separators, external indicators, and destructive styling.
 *
 * @param {Array} items - Menu items: { label, action, icon?, visible?, separator?, external?, destructive?, highlight?, ariaLabel?, keepOpen? }
 *   - `keepOpen: true` suppresses the usual close-on-click-and-act behavior so the
 *     user can activate the item and remain in the menu. Used for theme picker
 *     items and the dark/light mode toggle so users can rapid-preview multiple
 *     themes (or pick a theme after toggling mode) without reopening the menu.
 *     Pattern borrowed from glow-props where theme controls lack the
 *     `data-close` attribute that other items have.
 */
export default function HamburgerMenu({ items }) {
    const menuId = useId();
    const [open, setOpen] = useState(false);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const timerRef = useRef(null);
    const hasBeenOpenRef = useRef(false);

    const visibleItems = items.filter(item => item.visible !== false);

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

    // Run a menu item's action with shared error handling — any throw goes to
    // the debug pill as a render error so users see the failure in context
    // instead of a silent dead click.
    async function runAction(action) {
        try {
            await action();
        } catch (e) {
            debugAdd('render', 'error', 'Menu action failed: ' + e.message, {
                stack: e.stack,
            });
        }
    }

    // Handle a menu item click. Two modes:
    //
    //   1. Regular item (default): close the menu first, then run the action
    //      after a 150ms delay. The delay matches the CSS fade animation so
    //      state changes triggered by the action don't cause visual glitches
    //      (text reflow, layout shift, re-render flicker) while the menu is
    //      still visibly on screen.
    //
    //   2. keepOpen item: run the action immediately without closing. Used by
    //      the dark/light toggle and the theme picker items so users can
    //      rapid-preview multiple themes or switch modes and then pick a
    //      theme for the new mode — all without reopening the menu. The
    //      active-theme highlight updates in place as the React tree
    //      re-renders from the reducer state change.
    //
    // Pattern borrowed from glow-props where the equivalent behavior is
    // implemented via a `data-close` attribute on menu items that SHOULD
    // close the menu, with theme controls deliberately omitting it.
    function handleItem(item) {
        if (item.keepOpen) {
            runAction(item.action);
            return;
        }
        close();
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => runAction(item.action), 150);
    }

    // Arrow key navigation between menu items. Wraps around at boundaries.
    function handleMenuKeyDown(e) {
        if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
        e.preventDefault();
        const buttons = menuRef.current?.querySelectorAll('button');
        if (!buttons?.length) return;
        const currentIdx = Array.from(buttons).indexOf(document.activeElement);
        let nextIdx;
        if (e.key === 'ArrowDown') {
            nextIdx = currentIdx < buttons.length - 1 ? currentIdx + 1 : 0;
        } else {
            nextIdx = currentIdx > 0 ? currentIdx - 1 : buttons.length - 1;
        }
        buttons[nextIdx].focus();
    }

    return (
        <div className="hamburger-menu">
            <button
                ref={triggerRef}
                type="button"
                className="btn btn-ghost btn-square"
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
                                        className={`hamburger-item${item.destructive ? ' hamburger-item-destructive' : ''}${item.highlight ? ' hamburger-item-highlight' : ''}`}
                                        onClick={() => handleItem(item)}
                                        // Requirement: items whose visible label describes a destination
                                        //   (e.g. "Light mode") rather than an action are ambiguous to
                                        //   screen readers without additional context. Callers can pass
                                        //   `ariaLabel` to spell out the action ("Switch to light mode").
                                        //   When not provided, fall back to the visible label.
                                        aria-label={item.ariaLabel || item.label}
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
