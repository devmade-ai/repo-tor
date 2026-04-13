import React from 'react';

/**
 * Consistent "Show more" button used across all paginated sections.
 *
 * @param {number} remaining - Total items not yet shown
 * @param {number} pageSize - How many items the next batch will add
 * @param {Function} onClick - Called when button is clicked
 */
export default function ShowMoreButton({ remaining, pageSize, onClick }) {
    const nextBatch = Math.min(remaining, pageSize);
    return (
        <button
            type="button"
            className="btn btn-ghost btn-block btn-sm mt-3"
            onClick={onClick}
            aria-label={`Show ${nextBatch} more items, ${remaining} remaining`}
        >
            Show {nextBatch} more of {remaining} remaining
        </button>
    );
}
