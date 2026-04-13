/**
 * EmbedRenderer — renders only the requested chart(s) for iframe embedding.
 *
 * Requirement: Allow individual dashboard charts to be embedded in external apps
 * Approach: Render the tab component(s) that contain the requested charts, then
 *   use DOM traversal to hide all CollapsibleSections except those containing
 *   a matching data-embed-id element.
 * Alternatives:
 *   - Extract each chart into its own component: Rejected — large refactor,
 *     duplicates data/filter logic already in tab components
 *   - CSS :has() selector: Rejected — still limited browser support in some
 *     enterprise environments; DOM traversal is more reliable
 */
import React, { useEffect, useLayoutEffect, useRef } from 'react';
import ErrorBoundary from './ErrorBoundary.jsx';
import Summary from '../sections/Summary.jsx';
import Timeline from '../sections/Timeline.jsx';
import Timing from '../sections/Timing.jsx';
import Progress from '../sections/Progress.jsx';
import Contributors from '../sections/Contributors.jsx';
import Tags from '../sections/Tags.jsx';
import Health from '../sections/Health.jsx';
import Discover from '../sections/Discover.jsx';

// Maps each embed ID to the section component(s) that render it
// Note: urgency-trend, impact-over-time, debt-trend moved from Health to Timeline
const EMBED_SECTION_MAP = {
    'activity-timeline': [Timeline],
    'code-changes-timeline': [Timeline],
    'urgency-trend': [Timeline],
    'impact-over-time': [Timeline],
    'debt-trend': [Timeline],
    'activity-heatmap': [Timing],
    'hourly-distribution': [Timing],
    'daily-distribution': [Timing],
    'feature-vs-bugfix-trend': [Progress],
    'complexity-over-time': [Progress],
    'semver-distribution': [Progress],
    'contributor-complexity': [Contributors],
    'tag-distribution': [Tags],
};

// All valid embed IDs for validation
const VALID_IDS = new Set(Object.keys(EMBED_SECTION_MAP));

export default function EmbedRenderer({ embedIds }) {
    const containerRef = useRef(null);

    // Determine which section components need to render (deduplicated)
    const sectionsToRender = [];
    const sectionSet = new Set();
    const validIds = embedIds.filter(id => VALID_IDS.has(id));

    validIds.forEach(id => {
        EMBED_SECTION_MAP[id].forEach(SectionComponent => {
            if (!sectionSet.has(SectionComponent)) {
                sectionSet.add(SectionComponent);
                sectionsToRender.push(SectionComponent);
            }
        });
    });

    // After render, hide all .card sections except those containing target charts.
    // Walk up from each [data-embed-id] to its .card ancestor and toggle visibility.
    useLayoutEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        // First: hide ALL .card elements inside the container
        container.querySelectorAll('.card').forEach(card => {
            card.style.display = 'none';
        });

        // Then: show cards that contain a matching embed ID
        validIds.forEach(id => {
            const target = container.querySelector(`[data-embed-id="${id}"]`);
            if (!target) return;

            // Walk up to the .card ancestor
            const card = target.closest('.card');
            if (card) {
                card.style.display = '';
                card.classList.add('embed-target');
            }
        });
    }, [validIds.join(',')]);

    // Requirement: Embedding apps need to know the content height to size their iframe
    // Approach: ResizeObserver on the container + postMessage to parent window
    // Alternatives:
    //   - Fixed height per chart ID: Rejected — heights vary with data, filters, and viewport
    //   - CSS-only (height: fit-content on iframe): Rejected — iframes can't auto-size cross-origin
    //   - document.documentElement.scrollHeight: Rejected — includes elements outside the
    //     embed container (#heatmap-tooltip, body pseudo-elements) causing incorrect height
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !window.parent || window.parent === window) return;

        let rafId = null;
        let lastHeight = 0;
        const postHeight = () => {
            // Measure the container itself, not the full document — avoids picking up
            // stray elements outside #root (tooltip divs, pseudo-elements, etc.)
            const height = container.scrollHeight;
            // Only post when height actually changes to avoid unnecessary parent reflows
            if (height !== lastHeight) {
                lastHeight = height;
                // Requirement: Send resize height to parent for iframe auto-sizing
                // Approach: Use parent origin from referrer or '*' as fallback.
                //   Wildcard is acceptable here because the data (height number) is
                //   non-sensitive. The embed.js listener validates message type and
                //   matches iframe source before acting.
                // Alternatives:
                //   - Strict origin: Rejected — embed can be on any domain, origin unknown at build time
                //   - Don't send: Rejected — breaks iframe auto-resize feature
                let targetOrigin = '*';
                if (document.referrer) {
                    try { targetOrigin = new URL(document.referrer).origin; }
                    catch { /* malformed referrer — fall back to wildcard */ }
                }
                window.parent.postMessage({ type: 'repo-tor:resize', height }, targetOrigin);
            }
        };

        // Debounce via requestAnimationFrame — avoids flooding during chart animations
        const onResize = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(postHeight);
        };

        const observer = new ResizeObserver(onResize);
        observer.observe(container);

        // Delay initial height post to let Chart.js finish its first render.
        // Chart.js uses requestAnimationFrame internally, so a short timeout
        // ensures canvases have their final dimensions before we measure.
        const initialTimer = setTimeout(postHeight, 100);

        return () => {
            observer.disconnect();
            if (rafId) cancelAnimationFrame(rafId);
            clearTimeout(initialTimer);
        };
    }, []);

    // No valid IDs — show error
    if (validIds.length === 0) {
        const attempted = embedIds.join(', ') || '(empty)';
        return (
            <div className="flex flex-col items-center justify-center min-h-[200px] p-6 text-center text-base-content/80 font-sans text-sm gap-2">
                <p>Chart not found: <code className="bg-base-300 px-1.5 py-0.5 rounded text-[13px]">{attempted}</code></p>
                <p>
                    Check <a
                        href="https://github.com/devmade-ai/repo-tor/blob/main/docs/EMBED_REFERENCE.md"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary underline"
                    >EMBED_REFERENCE.md</a> for valid chart IDs.
                </p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="embed-mode">
            <ErrorBoundary>
                {sectionsToRender.map((SectionComponent, idx) => (
                    <SectionComponent key={idx} />
                ))}
            </ErrorBoundary>
        </div>
    );
}
