import React, { useState, useEffect, useCallback, useRef, useId, useLayoutEffect } from 'react';
import { createPortal } from 'react-dom';
import useDisclosureFocus from '../hooks/useDisclosureFocus.js';
import useFocusTrap from '../hooks/useFocusTrap.js';
import useEscapeKey from '../hooks/useEscapeKey.js';
import { version } from '../../../package.json';
import { debugAdd } from '../debugLog.js';

// Requirement: Data-driven hamburger menu matching glow-props BurgerMenu pattern
// Approach: Disclosure-pattern dropdown (not ARIA menu) with data-driven items array.
//   Each item has: label, action, icon (optional), visible, disabled, separator, external, destructive.
//   Show/hide via `visible`; gray out via `disabled` (rendered but not clickable/focusable).
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
//
// Stacking-context fix (2026-04-13):
//   The dropdown and backdrop are rendered via createPortal() into document.body
//   instead of remaining inside the `.dashboard-header` subtree. The header has
//   `position: relative; z-index: var(--z-sticky-header)` which creates a
//   stacking context that traps position:fixed children at the header's level —
//   the drawer overlays (z-drawer=30) were rendering ABOVE the backdrop
//   (z-menu-backdrop=40) because the menu's effective stacking-context z-index
//   was clamped to z-sticky-header=21. Portaling to body.element bypasses the
//   trapped context entirely so the menu layers obey their document-level z-index
//   values. The trigger button stays inside the header (so it sticks with the
//   nav bar); only the backdrop + dropdown surface portal out. Because the
//   dropdown now lives outside the trigger's containing block, its position is
//   computed from the trigger's `getBoundingClientRect()` via a useLayoutEffect,
//   using `position: fixed` with explicit top/left and updating on window
//   resize / scroll. See docs/TODO.md entry for prior "Low priority" note — now
//   fixed.

/**
 * Data-driven hamburger menu. Items are filtered by `visible` (default true),
 * rendered with optional icons, separators, external indicators, and destructive styling.
 *
 * @param {Array} items - Menu items: { label, action, icon?, visible?, disabled?, separator?, external?, destructive?, highlight?, ariaLabel?, keepOpen? }
 *   - `disabled: true` grays out the item, prevents click, and skips it during
 *     keyboard navigation (ArrowUp/Down, Home/End). The HTML disabled attribute
 *     is set on the button for native behavior; handleItem also guards early.
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
    // triggerPos = screen coordinates of the trigger button's bottom-left
    // corner, used as the dropdown's fixed-position origin. Recomputed every
    // time the menu opens and on window resize/scroll while open. Null when
    // the menu is closed (no work to do).
    const [triggerPos, setTriggerPos] = useState(null);
    const triggerRef = useRef(null);
    const menuRef = useRef(null);
    const timerRef = useRef(null);

    const visibleItems = items.filter(item => item.visible !== false);

    const toggle = useCallback(() => setOpen(prev => !prev), []);
    const close = useCallback(() => setOpen(false), []);

    // Requirement: Focus first item on open, return focus to trigger on close.
    // Approach: useDisclosureFocus (extracted from prior inlined logic) handles
    //   the rAF-delayed initial focus and trigger-return via shared refs.
    // Requirement: Tab key must not escape the open menu.
    // Approach: useFocusTrap wraps Tab/Shift+Tab at container boundaries.
    //   Passes menuRef as externalRef so both hooks and the position-measuring
    //   useLayoutEffect share the same ref on the portal <nav>.
    useDisclosureFocus(triggerRef, menuRef, open);
    useFocusTrap(open, menuRef);
    useEscapeKey(open, close);

    // Compute the dropdown's fixed-position origin from the trigger's
    // bounding rect. useLayoutEffect (not useEffect) so the measurement
    // happens before paint and the dropdown's first frame is already
    // correctly placed — otherwise users would briefly see it at 0,0.
    //
    // Requirement: dropdown must anchor to the trigger visually (same as
    //   the pre-portal absolutely-positioned version) while being rendered
    //   at the document-body level to escape the header's stacking context.
    // Approach: measure getBoundingClientRect on open and on window
    //   resize/scroll; store {top, left} in state; apply as inline fixed
    //   position on the dropdown nav. Uses `capture: true` on scroll so
    //   scrolling any nested scroll container also triggers an update.
    // Alternatives:
    //   - Popper.js / floating-ui: Rejected — adds dependency for one menu
    //   - ResizeObserver on the trigger only: Rejected — doesn't catch
    //     sticky-header offset changes from document scroll
    useLayoutEffect(() => {
        if (!open) {
            setTriggerPos(null);
            return;
        }
        function updatePosition() {
            const rect = triggerRef.current?.getBoundingClientRect();
            if (!rect) return;
            // Requirement: Dropdown must not overflow the viewport on narrow
            //   phones. The trigger button is typically near the right edge
            //   of the header, so the dropdown extends rightward from
            //   rect.left — without a width clamp, the right edge overflows.
            // Approach: Compute maxWidth from `window.innerWidth - 32`
            //   (16px safe margin each side) in the same measurement pass
            //   as top/left. This is functionally equivalent to the previous
            //   CSS `max-w-[calc(100vw-2rem)]` but avoids the arbitrary
            //   bracket value (CLAUDE.md policy) and uses
            //   `window.innerWidth` instead of CSS `100vw` — the former
            //   excludes scrollbar width on browsers where the scrollbar
            //   overlaps the viewport, so the clamp is tighter and correct.
            //   The value is runtime-computed from the viewport, which is an
            //   explicitly allowed inline-style use case per CLAUDE.md.
            // Alternatives:
            //   - CSS `max-w-[calc(100vw-2rem)]` (previous state, deleted
            //     2026-04-15): Rejected — arbitrary bracket value that
            //     required a permanent CLAUDE.md exception. Also used
            //     `100vw` which includes scrollbar width on some browsers.
            //   - Stock `max-w-xs` (320px): Rejected — on a 320px phone the
            //     dropdown would be allowed to be 320px wide, which is the
            //     full viewport width with zero margin. The point is to
            //     leave a safe margin.
            //   - floating-ui / Popper.js: Rejected — dependency for one
            //     menu, and the measurement is already trivial.
            const safeMargin = 16; // px, each side
            setTriggerPos({
                top: rect.bottom + 6, // 6px gap, matches the pre-portal CSS
                left: rect.left,
                maxWidth: window.innerWidth - 2 * safeMargin,
            });
        }
        updatePosition();
        window.addEventListener('resize', updatePosition);
        window.addEventListener('scroll', updatePosition, { capture: true, passive: true });
        return () => {
            window.removeEventListener('resize', updatePosition);
            window.removeEventListener('scroll', updatePosition, { capture: true });
        };
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
        if (item.disabled) return;
        if (item.keepOpen) {
            runAction(item.action);
            return;
        }
        close();
        if (timerRef.current) clearTimeout(timerRef.current);
        timerRef.current = setTimeout(() => runAction(item.action), 150);
    }

    // Keyboard navigation between menu items. ArrowDown/ArrowUp cycle with
    // wrapping, Home/End jump to first/last. Disabled items are skipped via
    // the :not([disabled]) selector so they can't receive keyboard focus.
    function handleMenuKeyDown(e) {
        const focusable = menuRef.current?.querySelectorAll('button:not([disabled])');
        if (!focusable?.length) return;
        const idx = Array.from(focusable).indexOf(document.activeElement);

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                focusable[(idx + 1) % focusable.length].focus();
                break;
            case 'ArrowUp':
                e.preventDefault();
                focusable[(idx - 1 + focusable.length) % focusable.length].focus();
                break;
            case 'Home':
                e.preventDefault();
                focusable[0].focus();
                break;
            case 'End':
                e.preventDefault();
                focusable[focusable.length - 1].focus();
                break;
        }
    }

    // The portaled surface: backdrop + dropdown nav. Rendered into document.body
    // via createPortal() so it escapes the `.dashboard-header` stacking context.
    // Only rendered when `open && triggerPos` — triggerPos is null on the first
    // open() tick before useLayoutEffect measures, and we don't want to flash
    // the dropdown at 0,0 in that one frame.
    const portalContent = (open && triggerPos) ? (
        <>
            {/* Backdrop — cursor-pointer required for iOS Safari (iOS does
                not fire click events on empty <div> elements without cursor:
                pointer set). position:fixed inset-0 covers the full viewport.
                Stacking: stock `z-40` (= --z-menu-backdrop in the :root
                design token scale) sits below the dropdown's stock `z-50`
                (= --z-menu). Both use stock Tailwind utilities directly —
                no `z-[var(...)]` arbitrary values needed because the
                menu-backdrop/menu layers line up with Tailwind's default
                scale exactly. Now that it's portaled to body, no parent
                stacking context traps the backdrop. */}
            <div data-testid="hamburger-backdrop" className="fixed inset-0 z-40 cursor-pointer" onClick={close} />
            <nav
                ref={menuRef}
                id={menuId}
                aria-label="Secondary actions"
                className="fixed min-w-52 bg-base-200 border border-base-300 rounded-md shadow-xl z-50 py-1 overscroll-contain"
                style={{ top: `${triggerPos.top}px`, left: `${triggerPos.left}px`, maxWidth: `${triggerPos.maxWidth}px` }}
                onKeyDown={handleMenuKeyDown}
            >
                <ul className="list-none m-0 p-0">
                    {visibleItems.map((item, i) => {
                        // Color variants: disabled items get muted opacity and a
                        // not-allowed cursor. Destructive / highlight / default
                        // items keep their existing treatment. The icon uses
                        // text-inherit for destructive/highlight (matching the
                        // button text) and text-base-content/60 for default.
                        const itemColors = item.disabled
                            ? 'opacity-40 cursor-not-allowed'
                            : item.destructive
                            ? 'text-error hover:bg-error/10'
                            : item.highlight
                            ? 'text-primary hover:bg-base-300'
                            : 'text-base-content hover:bg-base-300';
                        const iconColor = item.disabled
                            ? 'text-base-content/40'
                            : item.destructive || item.highlight
                            ? 'text-inherit'
                            : 'text-base-content/60';
                        return (
                            <li key={item.label}>
                                {item.separator && i > 0 && (
                                    <div className="h-px bg-base-300 my-1" />
                                )}
                                <button
                                    type="button"
                                    disabled={item.disabled}
                                    className={`flex items-center gap-2.5 w-full px-4 py-2.5 bg-transparent border-0 text-sm text-left cursor-pointer transition-colors outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary ${itemColors}`}
                                    onClick={() => handleItem(item)}
                                    // Requirement: items whose visible label describes a destination
                                    //   (e.g. "Light mode") rather than an action are ambiguous to
                                    //   screen readers without additional context. Callers can pass
                                    //   `ariaLabel` to spell out the action ("Switch to light mode").
                                    //   When not provided, fall back to the visible label.
                                    aria-label={item.ariaLabel || item.label}
                                >
                                    {item.icon && (
                                        <span className={`shrink-0 flex ${iconColor}`} aria-hidden="true">{item.icon}</span>
                                    )}
                                    <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{item.label}</span>
                                    {item.external && (
                                        <svg className="w-3 h-3 shrink-0 opacity-40" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth={1.5} aria-hidden="true">
                                            <path d="M3.5 3H9v5.5M9 3L3 9" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                    )}
                                </button>
                            </li>
                        );
                    })}
                </ul>
                <div className="h-px bg-base-300 my-1" />
                <div className="px-4 py-1.5 text-xs font-mono text-base-content/40">v{version}</div>
            </nav>
        </>
    ) : null;

    return (
        <div className="relative">
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
            {portalContent && createPortal(portalContent, document.body)}
        </div>
    );
}
