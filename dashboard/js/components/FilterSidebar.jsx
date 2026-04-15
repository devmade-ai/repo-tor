import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useApp } from '../AppContext.jsx';

// Requirement: Multi-select dropdown with full keyboard navigation
// Approach: Arrow keys move a highlighted index through options, Space/Enter
//   toggles selection, Escape closes. Uses role="listbox" + role="option"
//   with aria-activedescendant for screen reader focus tracking. Styling
//   is inline Tailwind utilities using DaisyUI semantic tokens
//   (`bg-base-200`, `bg-primary/10`, etc.) — the old
//   `.filter-multi-select-*` custom classes were removed in the 2026-04-13
//   custom-CSS cleanup. The inner checkbox uses DaisyUI `checkbox` for
//   visual consistency with the rest of the filter sidebar.
// Alternatives:
//   - Native <select multiple>: Rejected — can't style, poor UX on mobile
//   - Headless UI library: Rejected — adds dependency for one component
//   - DaisyUI `dropdown` + `menu`: Rejected — this widget is a WAI-ARIA
//     listbox (role="listbox" + role="option" + aria-multiselectable), not
//     a command menu. DaisyUI's `menu` component implies role="menu" which
//     is semantically wrong for multi-select filter values, and DaisyUI's
//     `dropdown` uses CSS :focus for visibility which conflicts with
//     React-state-controlled open + highlightIndex state needed for the
//     arrow-key navigation. DaisyUI v5 does not provide a first-class
//     listbox component.
function MultiSelect({ options, selected, onChange }) {
    const [open, setOpen] = useState(false);
    const [highlightIndex, setHighlightIndex] = useState(-1);
    const containerRef = useRef(null);
    const listboxRef = useRef(null);

    useEffect(() => {
        if (!open) return;
        function handleClickOutside(e) {
            if (containerRef.current && !containerRef.current.contains(e.target)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [open]);

    // Reset highlight when opening/closing
    useEffect(() => {
        if (open) {
            setHighlightIndex(0);
        } else {
            setHighlightIndex(-1);
        }
    }, [open]);

    // Scroll highlighted option into view
    useEffect(() => {
        if (!open || highlightIndex < 0 || !listboxRef.current) return;
        const highlighted = listboxRef.current.querySelector(`[data-index="${highlightIndex}"]`);
        if (highlighted) highlighted.scrollIntoView({ block: 'nearest' });
    }, [highlightIndex, open]);

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

    const handleKeyDown = useCallback((e) => {
        if (!open) {
            // Open on ArrowDown/ArrowUp/Enter/Space when closed
            if (['ArrowDown', 'ArrowUp', 'Enter', ' '].includes(e.key)) {
                e.preventDefault();
                setOpen(true);
            }
            return;
        }

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                setHighlightIndex(i => Math.min(i + 1, options.length - 1));
                break;
            case 'ArrowUp':
                e.preventDefault();
                setHighlightIndex(i => Math.max(i - 1, 0));
                break;
            case 'Enter':
            case ' ':
                e.preventDefault();
                if (highlightIndex >= 0 && highlightIndex < options.length) {
                    toggleOption(options[highlightIndex]);
                }
                break;
            case 'Escape':
                e.preventDefault();
                setOpen(false);
                break;
            case 'Home':
                e.preventDefault();
                setHighlightIndex(0);
                break;
            case 'End':
                e.preventDefault();
                setHighlightIndex(options.length - 1);
                break;
            default:
                break;
        }
    }, [open, highlightIndex, options, selected, onChange]);

    const activeDescendant = open && highlightIndex >= 0 && highlightIndex < options.length
        ? `multiselect-option-${highlightIndex}`
        : undefined;

    // Tailwind class strings extracted for readability — base layout
    // for each multi-select option, reused in both the live option loop
    // and the empty-state placeholder below.
    const optionBaseClasses = 'flex items-center px-2 py-1.5 cursor-pointer text-xs gap-1.5 leading-tight';

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                className="w-full px-2 py-1.5 text-xs border border-base-300 rounded-sm bg-base-200 text-base-content cursor-pointer flex justify-between items-center min-h-8 hover:border-primary focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
                aria-haspopup="listbox"
                aria-expanded={open}
                aria-activedescendant={activeDescendant}
                onClick={() => setOpen(!open)}
                onKeyDown={handleKeyDown}
            >
                <span className="flex-1 overflow-hidden text-ellipsis whitespace-nowrap">{getDisplayText()}</span>
                <span className="ml-1 opacity-50">
                    <svg width="10" height="10" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                        <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                </span>
            </button>
            <div
                ref={listboxRef}
                className={`absolute top-full left-0 right-0 max-h-50 overflow-y-auto bg-base-200 border border-base-300 rounded-sm shadow-xl z-20 ${open ? 'block' : 'hidden'}`}
                role="listbox"
                aria-multiselectable="true"
            >
                {options.map((option, idx) => {
                    // Selection + highlight state drives the row background.
                    // Four combinations, in cascade priority:
                    //   highlighted + selected → `bg-primary/30` (strongest
                    //     primary tint so keyboard-highlighted selected rows
                    //     don't visually "deselect" while navigating)
                    //   highlighted (not selected) → `bg-base-300` (neutral
                    //     surface lift matching mouse hover)
                    //   selected (not highlighted) → `bg-primary/10` + a
                    //     slightly deeper `hover:bg-primary/20` so mouse
                    //     hover on a selected row deepens the tint instead
                    //     of replacing it
                    //   neither → `hover:bg-base-300` (discoverable hover)
                    // Earlier migration collapsed the highlighted branch to a
                    // single `bg-base-300` regardless of selection, which
                    // lost the primary tint for keyboard-highlighted selected
                    // rows — caught in the 2026-04-14 post-migration audit.
                    const isSelected = selected.includes(option);
                    const isHighlighted = idx === highlightIndex;
                    const bgClass = isHighlighted && isSelected
                        ? 'bg-primary/30'
                        : isHighlighted
                        ? 'bg-base-300'
                        : isSelected
                        ? 'bg-primary/10 hover:bg-primary/20'
                        : 'hover:bg-base-300';
                    return (
                        <div
                            key={option}
                            id={`multiselect-option-${idx}`}
                            data-index={idx}
                            className={`${optionBaseClasses} ${bgClass}`}
                            role="option"
                            aria-selected={isSelected}
                            onClick={(e) => {
                                e.preventDefault();
                                toggleOption(option);
                            }}
                            onMouseEnter={() => setHighlightIndex(idx)}
                        >
                            <input
                                type="checkbox"
                                className="checkbox checkbox-xs checkbox-primary m-0 shrink-0"
                                checked={isSelected}
                                onChange={() => toggleOption(option)}
                                onClick={(e) => e.stopPropagation()}
                                tabIndex={-1}
                                aria-hidden="true"
                            />
                            <span>{option}</span>
                        </div>
                    );
                })}
                {options.length === 0 && (
                    <div className={`${optionBaseClasses} text-base-content/40 cursor-default`}>
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
        <div>
            <div className="flex items-center mb-1">
                <label className="block text-xs text-base-content/60">{label}</label>
                {/*
                  Include/Exclude mode toggle — DaisyUI `join` + `btn btn-xs`
                  segmented buttons. `btn-active` marks the selected mode.
                  The exclude button gets `btn-error` when active so the red
                  visually reinforces "hide matches". Previously a bespoke
                  .filter-mode-toggle wrapper with custom rgba backgrounds.
                */}
                <div className="join ml-auto">
                    <button
                        type="button"
                        className={`join-item btn btn-xs ${filter.mode === 'include' ? 'btn-active btn-primary' : 'btn-ghost'}`}
                        aria-pressed={filter.mode === 'include'}
                        onClick={() => handleModeChange('include')}
                        title="Show only selected items"
                    >
                        Include
                    </button>
                    <button
                        type="button"
                        className={`join-item btn btn-xs ${filter.mode === 'exclude' ? 'btn-active btn-error' : 'btn-ghost'}`}
                        aria-pressed={filter.mode === 'exclude'}
                        onClick={() => handleModeChange('exclude')}
                        title="Hide selected items"
                    >
                        Exclude
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
                <div className="w-70 p-4 bg-base-200 rounded-lg border border-base-300 space-y-4 max-md:w-full max-md:h-full max-md:rounded-none max-md:border-0 max-md:overflow-y-auto max-md:pt-6">
                    <div className="text-xs text-base-content/60 mb-3">
                        Showing {filteredCommits.length} of {state.data?.commits?.length || 0} commits
                        {activeFilterCount > 0 && ` (${activeFilterCount} filters active)`}
                    </div>

                    <FilterGroup label="Tags" filterType="tag" options={filterOptions.tags} />
                    <FilterGroup label="Authors" filterType="author" options={filterOptions.authors} />
                    <FilterGroup label="Repos" filterType="repo" options={filterOptions.repos} />
                    <FilterGroup label="Urgency" filterType="urgency" options={filterOptions.urgencies} />
                    <FilterGroup label="Impact" filterType="impact" options={filterOptions.impacts} />

                    <div>
                        <label className="block text-xs text-base-content/60 mb-1">Date Range</label>
                        <div className="flex flex-col gap-1.5">
                            <input
                                type="date"
                                className="input input-sm w-full"
                                value={state.filters.dateFrom}
                                onChange={(e) => handleDateChange('dateFrom', e.target.value)}
                                aria-label="Filter from date"
                            />
                            <input
                                type="date"
                                className="input input-sm w-full"
                                value={state.filters.dateTo}
                                onChange={(e) => handleDateChange('dateTo', e.target.value)}
                                aria-label="Filter to date"
                            />
                        </div>
                    </div>

                    <button
                        type="button"
                        className="btn btn-outline btn-sm w-full mt-3"
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
                role="presentation"
            />
        </>
    );
}
