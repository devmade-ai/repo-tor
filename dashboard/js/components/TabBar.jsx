import React from 'react';
import { useApp } from '../AppContext.jsx';
import { canonicalSearch, searchWithTab } from '../tabUrl.js';
import { COARSE_HIT } from '../touchTarget.js';

// Requirement: Primary navigation for the dashboard's 5 tabs. Non-technical
//   users need a clear visual of which tab is active and an obvious way to
//   switch. Accessible to screen readers + keyboard.
// Approach: DaisyUI `tabs tabs-border` structural classes + inline Tailwind
//   utilities for the mono-font uppercase techy typography layered on top.
//   role="tablist" + role="tab" + aria-selected are on the same elements as
//   DaisyUI's tabs expects, so we get both DaisyUI's CSS and proper ARIA.
//   The active-state text-shadow glow uses Tailwind's arbitrary-property
//   syntax `[prop:value]` because Tailwind v4 doesn't ship a text-shadow
//   utility out of the box — that bracketed syntax is the escape hatch
//   for one-off CSS properties that don't have a standard utility class.
// Alternatives:
//   - Pure DaisyUI tabs with tabs-lift or tabs-box: Rejected — defaults use
//     a different typography (sentence case, body font) that doesn't match
//     the dashboard's "techy mono uppercase" navigation aesthetic.
//   - Keep .tab-btn / .tab-btn-active as custom classes (prior approach):
//     Rejected 2026-04-13 as part of the custom-CSS cleanup pass — each
//     rule is a flat list of CSS properties that map 1:1 to Tailwind
//     utilities, so there's no rationale to keep a named class alias.
//   - Use <Tab> as a component: Rejected — 5 tabs with minimal variance;
//     a map() + class composition is clearer.
const TAB_BASE_CLASSES =
    'tab px-4 py-2 text-sm font-medium font-mono uppercase ' +
    'tracking-wider border-b-2 border-transparent ' +
    'text-base-content/60 whitespace-nowrap transition-all duration-150 ' +
    'hover:text-base-content/80 ' +
    'focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2';
const TAB_ACTIVE_CLASSES =
    'tab-active border-primary text-primary font-semibold';

const TABS = [
    { id: 'overview', label: 'Summary' },
    { id: 'activity', label: 'Timeline' },
    { id: 'work', label: 'Breakdown' },
    { id: 'health', label: 'Health' },
    { id: 'discover', label: 'Discover' },
];

export default function TabBar() {
    const { state, dispatch } = useApp();

    // Requirement: The address keeps the selected tab, except Summary,
    //   which leaves `?tab=` off. Back and forward move between tabs.
    //   Other query parameters stay.
    // Approach: Push only when the written query differs from the
    //   canonical form of the current one, so clicking the tab that is
    //   already selected does not add a history entry. popstate in
    //   AppContext reads the address back. shrink-0 keeps each label at
    //   its own width so the row scrolls instead of squeezing.
    // Alternatives:
    //   - replaceState: Rejected — Back would skip the previous tab.
    //   - Write the tab from the reducer: Rejected — the reducer stays
    //     free of window and history.
    function selectTab(id) {
        dispatch({ type: 'SET_ACTIVE_TAB', payload: id });
        const next = searchWithTab(window.location.search, id);
        if (next === canonicalSearch(window.location.search)) return;
        window.history.pushState(null, '', `${window.location.pathname}${next}${window.location.hash}`);
    }

    return (
        <div className="sticky top-0 z-20 bg-base-100 border-b border-base-300">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                {/* flex-nowrap overrides DaisyUI's flex-wrap on `.tabs`,
                    which was putting Health and Discover on a second row
                    and covering the top of the filter drawer. */}
                <div
                    className="tabs tabs-border flex flex-nowrap overflow-x-auto"
                    role="tablist"
                    aria-label="Dashboard sections"
                >
                    {TABS.map(tab => {
                        const isActive = state.activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={isActive}
                                className={`${TAB_BASE_CLASSES} shrink-0 ${COARSE_HIT} ${isActive ? TAB_ACTIVE_CLASSES : ''}`}
                                onClick={() => selectTab(tab.id)}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
            </div>
        </div>
    );
}
