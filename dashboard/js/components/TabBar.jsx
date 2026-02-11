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
                                className={`tab-btn ${isActive ? 'border-blue-500 text-blue-600' : ''}`}
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
