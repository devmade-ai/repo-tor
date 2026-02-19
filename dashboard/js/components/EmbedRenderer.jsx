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
import SummaryTab from '../tabs/SummaryTab.jsx';
import TimelineTab from '../tabs/TimelineTab.jsx';
import TimingTab from '../tabs/TimingTab.jsx';
import ProgressTab from '../tabs/ProgressTab.jsx';
import ContributorsTab from '../tabs/ContributorsTab.jsx';
import TagsTab from '../tabs/TagsTab.jsx';
import HealthTab from '../tabs/HealthTab.jsx';
import SecurityTab from '../tabs/SecurityTab.jsx';
import DiscoverTab from '../tabs/DiscoverTab.jsx';

// Maps each embed ID to the tab component(s) that render it
const EMBED_TAB_MAP = {
    'activity-timeline': [TimelineTab],
    'code-changes-timeline': [TimelineTab],
    'activity-heatmap': [TimingTab],
    'hourly-distribution': [TimingTab],
    'daily-distribution': [TimingTab],
    'feature-vs-bugfix-trend': [ProgressTab],
    'complexity-over-time': [ProgressTab],
    'semver-distribution': [ProgressTab],
    'contributor-complexity': [ContributorsTab],
    'tag-distribution': [TagsTab],
    'urgency-trend': [HealthTab],
    'impact-over-time': [HealthTab],
    'debt-trend': [HealthTab],
};

// All valid embed IDs for validation
const VALID_IDS = new Set(Object.keys(EMBED_TAB_MAP));

export default function EmbedRenderer({ embedIds }) {
    const containerRef = useRef(null);

    // Determine which tab components need to render (deduplicated)
    const tabsToRender = [];
    const tabSet = new Set();
    const validIds = embedIds.filter(id => VALID_IDS.has(id));

    validIds.forEach(id => {
        EMBED_TAB_MAP[id].forEach(TabComponent => {
            if (!tabSet.has(TabComponent)) {
                tabSet.add(TabComponent);
                tabsToRender.push(TabComponent);
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
    useEffect(() => {
        const container = containerRef.current;
        if (!container || !window.parent || window.parent === window) return;

        let rafId = null;
        const postHeight = () => {
            // Use scrollHeight of the document to capture full content including margins
            const height = document.documentElement.scrollHeight;
            window.parent.postMessage({ type: 'repo-tor:resize', height }, '*');
        };

        // Debounce via requestAnimationFrame — avoids flooding during chart animations
        const onResize = () => {
            if (rafId) cancelAnimationFrame(rafId);
            rafId = requestAnimationFrame(postHeight);
        };

        const observer = new ResizeObserver(onResize);
        observer.observe(container);

        // Send initial height after first paint
        postHeight();

        return () => {
            observer.disconnect();
            if (rafId) cancelAnimationFrame(rafId);
        };
    }, []);

    // No valid IDs — show error
    if (validIds.length === 0) {
        const attempted = embedIds.join(', ') || '(empty)';
        return (
            <div className="embed-error">
                <p>Chart not found: <code>{attempted}</code></p>
                <p>
                    Check <a href="https://github.com/devmade-ai/repo-tor/blob/main/docs/EMBED_REFERENCE.md"
                        target="_blank" rel="noopener noreferrer">EMBED_REFERENCE.md</a> for valid chart IDs.
                </p>
            </div>
        );
    }

    return (
        <div ref={containerRef} className="embed-mode">
            <ErrorBoundary>
                {tabsToRender.map((TabComponent, idx) => (
                    <TabComponent key={idx} />
                ))}
            </ErrorBoundary>
        </div>
    );
}
