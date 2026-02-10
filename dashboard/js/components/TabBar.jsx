import React from 'react';
import { useApp } from '../AppContext.jsx';

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'activity', label: 'Activity' },
    { id: 'work', label: 'Work' },
    { id: 'health', label: 'Health' },
    { id: 'discover', label: 'Discover' },
];

export default function TabBar() {
    const { state, dispatch, activeFilterCount } = useApp();

    return (
        <div className="tabs-bar">
            <div className="flex items-center gap-2">
                <div className="flex overflow-x-auto scrollbar-hide flex-1" role="tablist">
                    {TABS.map(tab => {
                        const isActive = state.activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={isActive}
                                className={`tab-btn ${isActive ? 'border-blue-500 text-blue-600' : ''}`}
                                onClick={() => dispatch({ type: 'SET_ACTIVE_TAB', payload: tab.id })}
                            >
                                {tab.label}
                            </button>
                        );
                    })}
                </div>
                <button
                    onClick={() => dispatch({ type: 'TOGGLE_FILTER_SIDEBAR' })}
                    className={`filter-toggle relative ${state.filterSidebarOpen ? 'active' : ''}`}
                    aria-label="Toggle filters"
                    aria-expanded={state.filterSidebarOpen}
                >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z"
                        />
                    </svg>
                    {activeFilterCount > 0 && (
                        <span className="filter-badge">{activeFilterCount}</span>
                    )}
                </button>
            </div>
        </div>
    );
}
