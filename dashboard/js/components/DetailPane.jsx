import React, { useEffect } from 'react';
import { useApp } from '../AppContext.jsx';
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
    const { state, dispatch } = useApp();
    const { open, title, subtitle, commits } = state.detailPane;

    // Manage body overflow when detail pane opens/closes
    useEffect(() => {
        if (open) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }
        return () => {
            document.body.style.overflow = '';
        };
    }, [open]);

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
            <div
                className={`detail-pane-overlay ${open ? 'open' : ''}`}
                onClick={handleClose}
            />
            <div
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
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="18" y1="6" x2="6" y2="18" />
                            <line x1="6" y1="6" x2="18" y2="18" />
                        </svg>
                    </button>
                </div>
                <div className="detail-pane-content">
                    {commits && commits.length > 0 ? (
                        commits.map((commit, index) => {
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
                                        {tags.map(tag => {
                                            return (
                                                <span
                                                    key={tag}
                                                    className={`tag ${getTagClass(tag)}`}
                                                    style={getTagStyleObject(tag)}
                                                >
                                                    {tag}
                                                </span>
                                            );
                                        })}
                                    </div>
                                </div>
                            );
                        })
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
