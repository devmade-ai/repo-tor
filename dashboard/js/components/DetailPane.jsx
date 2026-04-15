import React from 'react';
import { useApp } from '../AppContext.jsx';
import { PAGE_LIMITS } from '../state.js';
import useFocusTrap from '../hooks/useFocusTrap.js';
import useEscapeKey from '../hooks/useEscapeKey.js';
import useShowMore from '../hooks/useShowMore.js';
import ShowMoreButton from './ShowMoreButton.jsx';
import {
    formatDate,
    getCommitTags,
    getTagBadgeClass,
    getAuthorName,
    getCommitSubject,
    sanitizeMessage,
} from '../utils.js';

export default function DetailPane() {
    const { state, dispatch, isMobile } = useApp();
    const { open, title, subtitle, commits } = state.detailPane;
    const trapRef = useFocusTrap(open);

    // Requirement: Paginate commit lists to avoid overwhelming mobile users
    // Approach: Show 10 on mobile, 20 on desktop, with "Show more" button
    // Alternatives:
    //   - Virtual scrolling: Rejected — adds complexity, this pane is already scrollable
    //   - Show all: Rejected — can be 1000+ commits, freezes mobile browsers
    const [mobileLimit, desktopLimit] = PAGE_LIMITS.detailPane;
    const { visible, hasMore, remaining, showMore } = useShowMore(
        commits || [], mobileLimit, desktopLimit, isMobile
    );
    const pageSize = isMobile ? mobileLimit : desktopLimit;

    useEscapeKey(open, handleClose);

    function handleClose() {
        dispatch({ type: 'CLOSE_DETAIL_PANE' });
    }

    return (
        <>
            <div
                className={`detail-pane-overlay ${open ? 'open' : ''}`}
                onClick={handleClose}
                role="presentation"
            />
            <div
                ref={trapRef}
                className={`detail-pane ${open ? 'open' : ''}`}
                role="dialog"
                aria-modal={open}
                aria-label={title || 'Detail pane'}
            >
                {/* `detail-pane-header` is kept as a zero-style marker class
                    so the mobile `::before` pseudo drag-handle rule in
                    styles.css can still target it. All layout classes are
                    inline below. */}
                <div className="detail-pane-header flex items-center justify-between px-6 py-4 border-b border-base-300 shrink-0 max-md:px-4 max-md:py-3 max-md:relative">
                    <div>
                        <div className="text-lg font-semibold text-base-content">{title}</div>
                        {subtitle && <div className="text-xs text-base-content/60 mt-1">{subtitle}</div>}
                    </div>
                    <button type="button" className="btn btn-sm btn-circle btn-ghost" onClick={handleClose} aria-label="Close detail pane">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6 max-md:p-4">
                    {visible.length > 0 ? (
                        <>
                            {visible.map((commit, index) => {
                                const subject = getCommitSubject(commit);
                                const message = sanitizeMessage(subject);
                                const authorName = getAuthorName(commit);
                                const tags = getCommitTags(commit);

                                return (
                                    <div key={commit.sha || index} className="p-3 rounded-md border border-base-300 mb-3 transition-colors hover:bg-base-content/5">
                                        <div className="font-medium text-base-content mb-2">
                                            {message}
                                        </div>
                                        <div className="flex flex-wrap gap-2 text-xs text-base-content/60">
                                            <span>{authorName}</span>
                                            <span>&middot;</span>
                                            <span>{formatDate(commit.timestamp)}</span>
                                        </div>
                                        <div className="flex flex-wrap gap-1 mt-2">
                                            {tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className={`badge badge-sm ${getTagBadgeClass(tag)}`}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {hasMore && (
                                <ShowMoreButton remaining={remaining} pageSize={pageSize} onClick={showMore} />
                            )}
                        </>
                    ) : (
                        <div className="text-center py-12 text-sm text-base-content/60">
                            No commits to display
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
