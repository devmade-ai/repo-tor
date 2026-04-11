import { useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';

/**
 * Heatmap tooltip as a React portal.
 *
 * Requirement: Show tooltip text when hovering heatmap cells with [data-tooltip]
 * Approach: React portal rendered outside the component tree into a dedicated
 *   mount point (#heatmap-tooltip). Uses document-level mouseover/mouseout
 *   delegation to detect [data-tooltip] targets and position via getBoundingClientRect.
 *   Clamped to viewport bounds to prevent off-screen clipping.
 * Previous implementation: Vanilla DOM manipulation in App.jsx useEffect —
 *   document.getElementById, classList.add/remove, manual style.left/top.
 * Alternatives:
 *   - Keep vanilla DOM: Rejected — last major non-React UI pattern; portal is
 *     cleaner and uses React's rendering pipeline
 *   - Per-cell tooltip component: Rejected — hundreds of heatmap cells would each
 *     mount a tooltip; delegation is more efficient
 *   - CSS-only :hover tooltip: Rejected — can't clamp to viewport bounds
 */

export default function HeatmapTooltip() {
    const [tooltip, setTooltip] = useState({ visible: false, text: '', x: 0, y: 0 });
    const tooltipRef = useRef(null);
    const mountRef = useRef(null);

    // Cache the mount point once
    if (!mountRef.current) {
        mountRef.current = document.getElementById('heatmap-tooltip');
    }

    const handleMouseOver = useCallback((e) => {
        const target = e.target.closest('[data-tooltip]');
        if (!target) {
            setTooltip(prev => prev.visible ? { ...prev, visible: false } : prev);
            return;
        }
        const text = target.getAttribute('data-tooltip');
        const rect = target.getBoundingClientRect();
        setTooltip({ visible: true, text, rect });
    }, []);

    const handleMouseOut = useCallback((e) => {
        const target = e.target.closest('[data-tooltip]');
        if (target) {
            setTooltip(prev => prev.visible ? { ...prev, visible: false } : prev);
        }
    }, []);

    useEffect(() => {
        document.addEventListener('mouseover', handleMouseOver);
        document.addEventListener('mouseout', handleMouseOut);
        return () => {
            document.removeEventListener('mouseover', handleMouseOver);
            document.removeEventListener('mouseout', handleMouseOut);
        };
    }, [handleMouseOver, handleMouseOut]);

    // Position clamping after render (needs tooltip dimensions)
    useEffect(() => {
        if (!tooltip.visible || !tooltip.rect || !tooltipRef.current) return;
        const el = tooltipRef.current;
        const rect = tooltip.rect;
        let left = rect.left + rect.width / 2 - el.offsetWidth / 2;
        let top = rect.top - el.offsetHeight - 6;
        // Clamp horizontal: keep within viewport with 4px padding
        left = Math.max(4, Math.min(left, window.innerWidth - el.offsetWidth - 4));
        // If tooltip would go above viewport, show below the target instead
        if (top < 4) {
            top = rect.bottom + 6;
        }
        // Clamp vertical: keep within viewport bottom
        top = Math.min(top, window.innerHeight - el.offsetHeight - 4);
        el.style.left = Math.round(left) + 'px';
        el.style.top = Math.round(top) + 'px';
    });

    if (!mountRef.current) return null;

    return createPortal(
        <span
            ref={tooltipRef}
            className={`heatmap-tooltip-inner${tooltip.visible ? ' visible' : ''}`}
        >
            {tooltip.text}
        </span>,
        mountRef.current
    );
}
