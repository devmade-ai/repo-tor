import { useEffect, useRef } from 'react';

// Requirement: Reusable focus management for disclosure components (menus,
//   dropdowns, modals). Focus first item on open, return to trigger on close.
// Approach: Extracted from HamburgerMenu.jsx inlined focus logic into a shared
//   hook following the glow-props BURGER_MENU.md useDisclosureFocus spec.
//   Uses requestAnimationFrame so portal-rendered content has time to mount
//   before the querySelector runs.
// Alternatives:
//   - Inline per component: Rejected — duplicated logic across HamburgerMenu,
//     future dropdowns, and any disclosure that needs focus-on-open
//   - Focus synchronously in useEffect: Rejected — portal content may not be
//     in the DOM yet on the first effect pass (layout effect sets position
//     state, triggering a re-render that mounts the portal)

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Manages focus for disclosure components: focuses the first focusable
 * element inside contentRef when `open` becomes true, and returns focus
 * to triggerRef when `open` becomes false.
 *
 * The hasBeenOpenRef guard prevents stealing focus on initial mount
 * (when open starts as false).
 *
 * @param {React.RefObject} triggerRef - Ref to the trigger element (focus returns here on close)
 * @param {React.RefObject} contentRef - Ref to the content container (first focusable child gets focus on open)
 * @param {boolean} open - Whether the disclosure is currently open
 * @param {string} [selector] - CSS selector for focusable elements (defaults to standard focusable set)
 */
export default function useDisclosureFocus(triggerRef, contentRef, open, selector = FOCUSABLE) {
    const hasBeenOpenRef = useRef(false);

    useEffect(() => {
        if (open) {
            hasBeenOpenRef.current = true;
            const rafId = requestAnimationFrame(() => {
                const firstItem = contentRef.current?.querySelector(selector);
                firstItem?.focus();
            });
            return () => cancelAnimationFrame(rafId);
        } else if (hasBeenOpenRef.current) {
            triggerRef.current?.focus();
        }
    }, [open, triggerRef, contentRef, selector]);
}
