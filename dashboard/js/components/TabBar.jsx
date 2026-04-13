import React from 'react';
import { useApp } from '../AppContext.jsx';

// Requirement: Primary navigation for the dashboard's 6 tabs. Non-technical
//   users need a clear visual of which tab is active and an obvious way to
//   switch. Accessible to screen readers + keyboard.
// Approach: DaisyUI `tabs tabs-border` structural classes + our own
//   `.tab-btn` / `.tab-btn-active` custom styling for the mono-font uppercase
//   techy look. DaisyUI's tabs gives us the correct visual grouping and
//   border behavior; our custom classes layer the typography on top.
//   role="tablist" + role="tab" + aria-selected are on the same elements as
//   DaisyUI's tabs expects, so we get both DaisyUI's CSS and proper ARIA.
// Alternatives:
//   - Pure DaisyUI tabs with tabs-lift or tabs-box: Rejected — defaults use
//     a different typography (sentence case, body font) that doesn't match
//     the dashboard's "techy mono uppercase" navigation aesthetic.
//   - Replace .tab-btn with inline Tailwind utilities: Rejected — the
//     typography rules (font-family: mono, text-transform uppercase,
//     letter-spacing, active text-shadow glow) are cohesive enough to stay
//     as a named custom class.
//   - Use <Tab> as a component: Rejected — 6 tabs with minimal variance;
//     a map() + class composition is clearer.
const TABS = [
    { id: 'overview', label: 'Summary' },
    { id: 'activity', label: 'Timeline' },
    { id: 'work', label: 'Breakdown' },
    { id: 'health', label: 'Health' },
    { id: 'discover', label: 'Discover' },
    { id: 'projects', label: 'Projects' },
];

export default function TabBar() {
    const { state, dispatch } = useApp();

    return (
        <div className="tabs-bar">
            <div className="max-w-7xl mx-auto px-4 md:px-8">
                <div
                    className="tabs tabs-border flex overflow-x-auto scrollbar-hide"
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
                                className={`tab tab-btn ${isActive ? 'tab-active tab-btn-active' : ''}`}
                                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })}
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
