import { useEffect, useRef } from 'react';

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Traps Tab key focus within a container while active.
 * Returns a ref to attach to the container element.
 */
export default function useFocusTrap(active) {
    const containerRef = useRef(null);

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
    }, [active]);

    return containerRef;
}
