import { useState, useCallback, useMemo } from 'react';

// Requirement: Consistent "Show more" pagination across all list sections
// Approach: Reusable hook that returns sliced items + show more controls,
//   with different limits for mobile vs desktop.
// Alternatives:
//   - Inline useState in each component: Rejected — duplicated logic, inconsistent batch sizes
//   - Virtual scrolling: Rejected — adds complexity, overkill for most lists (<100 items)
//   - Infinite scroll with IntersectionObserver: Rejected — harder to control, users
//     may not realize there's more content

/**
 * @param {Array} items - Full array of items to paginate
 * @param {number} mobileLimit - Items to show per page on mobile
 * @param {number} desktopLimit - Items to show per page on desktop (0 = show all)
 * @param {boolean} isMobile - Whether the current viewport is mobile
 * @returns {{ visible, hasMore, remaining, showMore, resetLimit }}
 */
export default function useShowMore(items, mobileLimit, desktopLimit, isMobile) {
    const pageSize = isMobile ? mobileLimit : desktopLimit;
    const [limit, setLimit] = useState(pageSize);

    // Reset limit when pageSize changes (e.g. viewport resize) or items change significantly
    // Using useMemo to track previous pageSize and reset when it changes
    const effectiveLimit = useMemo(() => {
        setLimit(pageSize);
        return pageSize;
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [pageSize]);

    const visible = useMemo(() => {
        if (pageSize === 0) return items;
        return items.slice(0, limit);
    }, [items, limit, pageSize]);

    const hasMore = pageSize > 0 && items.length > limit;
    const remaining = Math.max(0, items.length - limit);

    const showMore = useCallback(() => {
        setLimit(prev => prev + pageSize);
    }, [pageSize]);

    const resetLimit = useCallback(() => {
        setLimit(pageSize);
    }, [pageSize]);

    return { visible, hasMore, remaining, showMore, resetLimit };
}
