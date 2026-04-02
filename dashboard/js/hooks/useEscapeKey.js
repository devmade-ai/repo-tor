import { useEffect } from 'react';

/**
 * Calls the callback when the Escape key is pressed, but only while `active` is true.
 * Cleans up the listener when deactivated or unmounted.
 * Stops propagation so only the topmost overlay closes when multiple are stacked.
 *
 * @param {boolean} active - Whether to listen for the key
 * @param {Function} callback - Called on Escape press
 */
export default function useEscapeKey(active, callback) {
    useEffect(() => {
        if (!active) return;
        function handleKey(e) {
            if (e.key === 'Escape') {
                e.stopPropagation();
                callback();
            }
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [active, callback]);
}
