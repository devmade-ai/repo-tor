import { useEffect } from 'react';

/**
 * Ref-counted body scroll lock.
 *
 * Requirement: Multiple overlays (DetailPane, SettingsPane, QuickGuide) can each
 *   lock body scroll independently. Previously each component set
 *   document.body.style.overflow directly, causing a race condition: if QuickGuide
 *   closed while SettingsPane was open, it cleared the lock SettingsPane needed.
 * Approach: Module-level counter tracks how many active locks exist. Overflow is
 *   set to 'hidden' when count > 0, cleared when count reaches 0. Each useEffect
 *   increments on mount/activate and decrements on unmount/deactivate.
 * Alternatives:
 *   - Single source in App.jsx: Rejected — requires threading state through all
 *     overlay components, and misses QuickGuide (opened from HamburgerMenu)
 *   - CSS class toggle: Rejected — same race condition with multiple togglers
 *   - body-scroll-lock library: Rejected — adds dependency for a trivial pattern
 */

let lockCount = 0;

function updateOverflow() {
    document.body.style.overflow = lockCount > 0 ? 'hidden' : '';
}

export default function useScrollLock(active) {
    useEffect(() => {
        if (!active) return;
        lockCount++;
        updateOverflow();
        return () => {
            lockCount--;
            updateOverflow();
        };
    }, [active]);
}
