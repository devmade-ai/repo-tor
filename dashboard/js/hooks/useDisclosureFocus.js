import { useEffect, useRef } from 'react';

/**
 * Manages focus for disclosure-pattern components (dropdown menus, expandable panels).
 * On open: focuses the first focusable element inside the container (via rAF for DOM readiness).
 * On close: returns focus to the trigger element.
 * Skips focus-return on initial mount (when open starts as false) via hasBeenOpenRef guard.
 *
 * Requirement: Disclosure components must manage focus per WAI-ARIA disclosure pattern
 * Approach: Dedicated hook encapsulating the open/close focus cycle with rAF + mount guard
 * Alternatives:
 *   - Inline focus logic per component: Rejected — duplicated in every disclosure component
 *   - Focus on render without rAF: Rejected — DOM may not be ready, querySelector returns null
 *
 * @param {boolean} open - Whether the disclosure is currently open
 * @param {React.RefObject} containerRef - Ref to the dropdown/panel container
 * @param {React.RefObject} triggerRef - Ref to the trigger button
 * @param {string} [focusSelector] - CSS selector for the first focusable element.
 *   Defaults to all standard focusable elements (matches useFocusTrap's selector).
 */
const DEFAULT_FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export default function useDisclosureFocus(open, containerRef, triggerRef, focusSelector = DEFAULT_FOCUSABLE) {
    const hasBeenOpenRef = useRef(false);

    useEffect(() => {
        if (open) {
            hasBeenOpenRef.current = true;
            const rafId = requestAnimationFrame(() => {
                const first = containerRef.current?.querySelector(focusSelector);
                first?.focus();
            });
            return () => cancelAnimationFrame(rafId);
        } else if (hasBeenOpenRef.current) {
            triggerRef.current?.focus();
        }
    }, [open, containerRef, triggerRef, focusSelector]);
}
