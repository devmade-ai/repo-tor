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
                <div className="detail-pane-header">
                    <div>
                        <div className="detail-pane-title">{title}</div>
                        {subtitle && <div className="detail-pane-subtitle">{subtitle}</div>}
                    </div>
                    <button type="button" className="detail-pane-close" onClick={handleClose} aria-label="Close detail pane">
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
                                <ShowMoreButton remaining={remaining} pageSize={pageSize} onClick={showMore} />
                            )}
                        </>
                    ) : (
                        <div className="detail-pane-empty">
                            No commits to display
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}
