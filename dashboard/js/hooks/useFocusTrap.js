import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab key focus within a container while active.
 *
 * Two calling conventions (backward-compatible):
 *   1. useFocusTrap(active)          — creates and returns an internal ref
 *   2. useFocusTrap(active, extRef)  — uses the caller's ref (e.g. menuRef)
 *
 * When the trap activates it focuses the first focusable child. Tab and
 * Shift+Tab wrap at the container boundaries so focus cannot escape.
 *
 * @param {boolean} active - Whether the trap is currently active
 * @param {React.RefObject} [externalRef] - Optional caller-owned ref to use instead of an internal one
 * @returns {React.RefObject} The container ref (internal or external)
 */
export default function useFocusTrap(active, externalRef) {
    const internalRef = useRef(null);
    const containerRef = externalRef || internalRef;

    useEffect(() => {
        if (!active || !containerRef.current) return;

        const container = containerRef.current;

        // Focus the first focusable element when trap activates
        const focusable = container.querySelectorAll(FOCUSABLE);
        if (focusable.length > 0) focusable[0].focus();

        function handleKeyDown(e) {
            if (e.key !== 'Tab') return;
            const nodes = container.querySelectorAll(FOCUSABLE);
            if (nodes.length === 0) return;

            const first = nodes[0];
            const last = nodes[nodes.length - 1];

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }

        container.addEventListener('keydown', handleKeyDown);
        return () => container.removeEventListener('keydown', handleKeyDown);
    }, [active, containerRef]);

    return containerRef;
}
