import { useEffect } from 'react';

/**
 * Calls the callback when a click occurs outside the element referenced by `ref`,
 * but only while `active` is true. Uses a zero-delay setTimeout so the event
 * that triggered the open doesn't immediately close it.
 *
 * @param {React.RefObject} ref - Ref to the container element
 * @param {boolean} active - Whether to listen for outside clicks
 * @param {Function} callback - Called on outside click
 */
export default function useClickOutside(ref, active, callback) {
    useEffect(() => {
        if (!active) return;
        function handleClick(e) {
            if (ref.current && !ref.current.contains(e.target)) {
                callback();
            }
        }
        const id = setTimeout(() => {
            document.addEventListener('click', handleClick);
        }, 0);
        return () => {
            clearTimeout(id);
            document.removeEventListener('click', handleClick);
        };
    }, [ref, active, callback]);
}
