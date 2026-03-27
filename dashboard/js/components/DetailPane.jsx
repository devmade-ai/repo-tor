import React, { useEffect } from 'react';
import { useApp } from '../AppContext.jsx';
import useFocusTrap from '../hooks/useFocusTrap.js';
import useShowMore from '../hooks/useShowMore.js';
import {
    formatDate,
    getCommitTags,
    getTagClass,
    getTagStyleObject,
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
    const { visible, hasMore, remaining, showMore } = useShowMore(
        commits || [], 10, 20, isMobile
    );

    // Escape key to close
    useEffect(() => {
        if (!open) return;
        function handleKey(e) {
            if (e.key === 'Escape') dispatch({ type: 'CLOSE_DETAIL_PANE' });
        }
        document.addEventListener('keydown', handleKey);
        return () => document.removeEventListener('keydown', handleKey);
    }, [open, dispatch]);

    function handleClose() {
        dispatch({ type: 'CLOSE_DETAIL_PANE' });
    }

    return (
        <>
            {/* eslint-disable-next-line jsx-a11y/no-static-element-interactions */}
            <div
                className={`detail-pane-overlay ${open ? 'open' : ''}`}
                onClick={handleClose}
                aria-hidden="true"
            />
            <div
                ref={trapRef}
                className={`detail-pane ${open ? 'open' : ''}`}
                role="dialog"
                aria-modal={open}
                aria-label={title || 'Detail pane'}
            >
                <div className="detail-pane-header">
                    <div>
                        <div className="detail-pane-title">{title}</div>
                        {subtitle && <div className="detail-pane-subtitle">{subtitle}</div>}
                    </div>
                    <button className="detail-pane-close" onClick={handleClose} aria-label="Close detail pane">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="detail-pane-content">
                    {visible.length > 0 ? (
                        <>
                            {visible.map((commit, index) => {
                                const subject = getCommitSubject(commit);
                                const message = sanitizeMessage(subject);
                                const authorName = getAuthorName(commit);
                                const tags = getCommitTags(commit);

                                return (
                                    <div key={commit.sha || index} className="detail-commit">
                                        <div className="detail-commit-message">
                                            {message}
                                        </div>
                                        <div className="detail-commit-meta">
                                            <span>{authorName}</span>
                                            <span>&middot;</span>
                                            <span>{formatDate(commit.timestamp)}</span>
                                        </div>
                                        <div className="detail-commit-tags">
                                            {tags.map(tag => (
                                                <span
                                                    key={tag}
                                                    className={`tag ${getTagClass(tag)}`}
                                                    style={getTagStyleObject(tag)}
                                                >
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </div>
                                );
                            })}
                            {hasMore && (
                                <button
                                    type="button"
                                    className="show-more-btn"
                                    onClick={showMore}
                                >
                                    Show {Math.min(remaining, isMobile ? 10 : 20)} more of {remaining} remaining
                                </button>
                            )}
                        </>
                    ) : (
                        <div className="text-sm text-themed-tertiary" style={{ textAlign: 'center', padding: '48px 0' }}>
                            No commits to display
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
