import React, { useEffect } from 'react';
import { useApp } from '../AppContext.jsx';
import {
    escapeHtml,
    formatDate,
    getCommitTags,
    getTagClass,
    getTagStyle,
    getAuthorName,
    getCommitSubject,
    sanitizeMessage,
} from '../utils.js';

function parseInlineStyle(styleStr) {
    if (!styleStr) return {};
    const style = {};
    styleStr.split(';').forEach(pair => {
        const [key, val] = pair.split(':').map(s => s.trim());
        if (key && val) style[key] = val;
    });
    return style;
}

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

    function handleClose() {
        dispatch({ type: 'CLOSE_DETAIL_PANE' });
    }

    return (
        <>
            <div
                className={`detail-pane-overlay ${open ? 'open' : ''}`}
                onClick={handleClose}
            />
            <div className={`detail-pane ${open ? 'open' : ''}`}>
                <div className="detail-pane-header">
                    <div>
                        <div className="detail-pane-title">{title}</div>
                        {subtitle && <div className="detail-pane-subtitle">{subtitle}</div>}
                    </div>
                    <button className="detail-pane-close" onClick={handleClose}>
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
                                        {escapeHtml(message)}
                                    </div>
                                    <div className="detail-commit-meta">
                                        <span>{escapeHtml(authorName)}</span>
                                        <span>&middot;</span>
                                        <span>{formatDate(commit.timestamp)}</span>
                                    </div>
                                    <div className="detail-commit-tags">
                                        {tags.map(tag => {
                                            const tagClass = getTagClass(tag);
                                            const tagStyleStr = getTagStyle(tag);
                                            const inlineStyle = parseInlineStyle(tagStyleStr);
                                            return (
                                                <span
                                                    key={tag}
                                                    className={`tag ${tagClass}`}
                                                    style={inlineStyle}
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
