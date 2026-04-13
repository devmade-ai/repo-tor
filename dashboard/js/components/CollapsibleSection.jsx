import React, { useState } from 'react';

// Requirement: Wrap each dashboard section in a bordered card with a
//   collapsible header that toggles the section body's visibility.
// Approach: DaisyUI `card bg-base-200` outer wrapper + `card-body` inner
//   container with custom padding + collapse-animated content. Note that
//   we DON'T use DaisyUI's own `collapse` component because DaisyUI's
//   collapse is a radio/checkbox-driven stateless mechanism that doesn't
//   play well with React's controlled state and doesn't support our
//   chevron rotation / max-height transition animation.
//   `card-body p-6 gap-0` overrides DaisyUI's card-body defaults
//   (2rem padding + 0.5rem flex gap) for our denser layout.
// Alternatives:
//   - DaisyUI `collapse collapse-arrow`: Rejected — stateless CSS checkbox
//     approach doesn't match React reducer state, and visual arrow/padding
//     differ from our design.
//   - DaisyUI `accordion`: Rejected — same issue, and we don't want
//     single-open semantics (users can expand multiple sections).
//   - Migrate to DaisyUI `card` without `card-body`: Rejected — card
//     expects its child to be card-body for correct padding behavior;
//     bypassing it means re-implementing the card-body defaults inline.
export default function CollapsibleSection({ title, subtitle, defaultExpanded = true, children }) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    const sectionId = title.toLowerCase().replace(/\s+/g, '-');
    const contentId = `${sectionId}-content`;

    return (
        <div className="card bg-base-200 border border-base-300">
            <div className="card-body p-6 gap-0">
                <div
                    className="collapsible-header"
                    role="button"
                    tabIndex={0}
                    aria-expanded={expanded}
                    aria-controls={contentId}
                    onClick={() => setExpanded(!expanded)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setExpanded(!expanded);
                        }
                    }}
                >
                    <div className="collapsible-title">
                        <h3 className="text-lg font-semibold text-base-content">{title}</h3>
                    </div>
                    {subtitle && <span className="collapsible-subtitle">{subtitle}</span>}
                    <svg
                        className="collapsible-chevron"
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        aria-hidden="true"
                    >
                        <path
                            fillRule="evenodd"
                            d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                            clipRule="evenodd"
                        />
                    </svg>
                </div>
                <div id={contentId} className={`collapsible-content ${expanded ? 'expanded' : ''}`}>
                    <div className="pt-2">{children}</div>
                </div>
            </div>
        </div>
    );
}
