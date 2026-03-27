import React from 'react';

/**
 * Consistent "Show more" button used across all paginated sections.
 *
 * @param {number} remaining - Total items not yet shown
 * @param {number} pageSize - How many items the next batch will add
 * @param {Function} onClick - Called when button is clicked
 * @param {string} [className] - Optional extra CSS classes
 */
export default function ShowMoreButton({ remaining, pageSize, onClick, className }) {
    const nextBatch = Math.min(remaining, pageSize);
    return (
        <button
            type="button"
            className={`show-more-btn${className ? ` ${className}` : ''}`}
            onClick={onClick}
        >
            Show {nextBatch} more of {remaining} remaining
        </button>
    );
}
