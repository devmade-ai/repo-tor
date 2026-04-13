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
                {/* `collapsible-header` is kept as a zero-style marker
                    class so `.embed-mode .collapsible-header { display: none }`
                    in styles.css can still hide section headers in embed
                    iframes (which strip all chrome around the chart). All
                    layout, interaction, and focus styles are inline
                    Tailwind below. */}
                <div
                    className="collapsible-header flex items-center justify-between cursor-pointer py-2 sm:py-3 select-none hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
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
                    <div className="flex items-center gap-2">
                        <h3 className="text-base sm:text-lg font-semibold text-base-content">{title}</h3>
                    </div>
                    {subtitle && (
                        <span className="text-xs text-base-content/60 ml-auto mr-2 hidden sm:inline">{subtitle}</span>
                    )}
                    <svg
                        className={`w-5 h-5 shrink-0 text-base-content/60 transition-transform duration-200 ease-in-out ${expanded ? 'rotate-180' : ''}`}
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
                {/* `collapsible-content` stays as a custom class because the
                    max-height transition from `max-h-0` to `max-h-none`
                    needs a CSS rule — Tailwind can't express the `none`
                    value as a transition target, and clamping to
                    `max-h-[9999px]` would clip long sections. See the
                    CSS block for the full transition rationale. */}
                <div id={contentId} className={`collapsible-content ${expanded ? 'expanded' : ''}`}>
                    <div className="pt-2">{children}</div>
                </div>
            </div>
        </div>
    );
}
