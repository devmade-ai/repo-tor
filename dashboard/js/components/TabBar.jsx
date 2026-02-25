import React from 'react';
import { useApp } from '../AppContext.jsx';

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
                <div className="flex overflow-x-auto scrollbar-hide" role="tablist">
                    {TABS.map(tab => {
                        const isActive = state.activeTab === tab.id;
                        return (
                            <button
                                key={tab.id}
                                role="tab"
                                aria-selected={isActive}
                                className={`tab-btn ${isActive ? 'tab-btn-active' : ''}`}
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
