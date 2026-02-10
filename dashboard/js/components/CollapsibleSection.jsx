import React, { useState } from 'react';

export default function CollapsibleSection({ title, subtitle, defaultExpanded = true, children }) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    const sectionId = title.toLowerCase().replace(/\s+/g, '-');

    return (
        <div className="card" data-section={sectionId}>
            <div
                className="collapsible-header"
                aria-expanded={expanded}
                onClick={() => setExpanded(!expanded)}
            >
                <div className="collapsible-title">
                    <h3 className="text-lg font-semibold text-themed-primary">{title}</h3>
                </div>
                {subtitle && <span className="collapsible-subtitle">{subtitle}</span>}
                <svg
                    className="collapsible-chevron"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                >
                    <path
                        fillRule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clipRule="evenodd"
                    />
                </svg>
            </div>
            <div className={`collapsible-content ${expanded ? 'expanded' : ''}`}>
                <div className="pt-2">{children}</div>
            </div>
        </div>
    );
}
