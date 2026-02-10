import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../AppContext.jsx';

function MultiSelect({ options, selected, onChange }) {
    const [open, setOpen] = useState(false);
    const containerRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        function handleKeyDown(e) {
            if (e.key === 'Escape') setOpen(false);
        }
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [open]);

    function getDisplayText() {
        if (selected.length === 0) return 'All';
        if (selected.length === 1) return selected[0];
        return `${selected.length} selected`;
    }

    function toggleOption(option) {
        if (selected.includes(option)) {
            onChange(selected.filter(v => v !== option));
        } else {
            onChange([...selected, option]);
        }
    }

    return (
        <div className="filter-multi-select" ref={containerRef}>
            <button
                type="button"
                className="filter-multi-select-trigger"
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen(!open)}
            >
                <span className="selected-text">{getDisplayText()}</span>
                <span className="arrow">
                    <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </span>
            </button>
            <div className={`filter-multi-select-dropdown ${open ? 'open' : ''}`} role="listbox">
                {options.map(option => (
                    <label
                        key={option}
                        className={`filter-multi-select-option ${selected.includes(option) ? 'selected' : ''}`}
                        role="option"
                        aria-selected={selected.includes(option)}
                        onClick={(e) => {
                            e.preventDefault();
                            toggleOption(option);
                        }}
                    >
                        <input
                            type="checkbox"
                            checked={selected.includes(option)}
                            onChange={() => toggleOption(option)}
                            onClick={(e) => e.stopPropagation()}
                        />
                        <span>{option}</span>
                    </label>
                ))}
                {options.length === 0 && (
                    <div className="filter-multi-select-option" style={{ color: 'var(--text-muted)', cursor: 'default' }}>
                        No options available
                    </div>
                )}
            </div>
        </div>
    );
}

function FilterGroup({ label, filterType, options }) {
    const { state, dispatch } = useApp();
    const filter = state.filters[filterType];

    function handleValuesChange(newValues) {
        dispatch({
            type: 'UPDATE_FILTER',
            payload: { filterType, values: newValues },
        });
    }

    function handleModeChange(mode) {
        dispatch({
            type: 'UPDATE_FILTER',
            payload: { filterType, mode },
        });
    }

    return (
        <div className="filter-group">
            <div className="filter-group-header">
                <label>{label}</label>
                <div className="filter-mode-toggle">
                    <button
                        type="button"
                        className={filter.mode === 'include' ? 'active' : ''}
                        aria-pressed={filter.mode === 'include'}
                        onClick={() => handleModeChange('include')}
                    >
                        Inc
                    </button>
                    <button
                        type="button"
                        className={`exclude ${filter.mode === 'exclude' ? 'active' : ''}`}
                        aria-pressed={filter.mode === 'exclude'}
                        onClick={() => handleModeChange('exclude')}
                    >
                        Exc
                    </button>
                </div>
            </div>
            <MultiSelect
                options={options}
                selected={filter.values}
                onChange={handleValuesChange}
            />
        </div>
    );
}

export default function FilterSidebar() {
    const { state, dispatch, filteredCommits, filterOptions, activeFilterCount } = useApp();

    function handleDateChange(field, value) {
        dispatch({
            type: 'SET_DATE_FILTER',
            payload: { field, value },
        });
    }

    return (
        <>
            <div className={`filter-sidebar ${state.filterSidebarOpen ? 'open' : 'collapsed'}`}>
                <div className="filter-sidebar-inner">
                    <div className="text-xs text-themed-tertiary mb-3">
                        Showing {filteredCommits.length} of {state.data?.commits?.length || 0} commits
                        {activeFilterCount > 0 && ` (${activeFilterCount} filters active)`}
                    </div>

                    <FilterGroup label="Tags" filterType="tag" options={filterOptions.tags} />
                    <FilterGroup label="Authors" filterType="author" options={filterOptions.authors} />
                    <FilterGroup label="Repos" filterType="repo" options={filterOptions.repos} />
                    <FilterGroup label="Urgency" filterType="urgency" options={filterOptions.urgencies} />
                    <FilterGroup label="Impact" filterType="impact" options={filterOptions.impacts} />

                    <div className="filter-group">
                        <label>Date Range</label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <input
                                type="date"
                                className="filter-input"
                                value={state.filters.dateFrom}
                                onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                                style={{ width: '100%', paddingLeft: '8px' }}
                            />
                            <input
                                type="date"
                                className="filter-input"
                                value={state.filters.dateTo}
                                onChange={(e) => handleDateChange('dateTo', e.target.value)}
                                style={{ width: '100%', paddingLeft: '8px' }}
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn-icon btn-secondary"
                        style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
                        onClick={() => dispatch({ type: 'CLEAR_FILTERS' })}
                    >
                        Clear All
                    </button>
                </div>
            </div>

            {/* Mobile overlay */}
            <div
                className={`filter-sidebar-overlay ${state.filterSidebarOpen ? 'open' : ''}`}
                onClick={() => dispatch({ type: 'CLOSE_FILTER_SIDEBAR' })}
            />
        </>
    );
}
