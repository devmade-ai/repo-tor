import React, { useState } from 'react';
import { isEmbedMode } from '../urlParams.js';

// Requirement: Wrap each dashboard section in a bordered card with a
//   collapsible header that toggles the section body's visibility. In
//   embed mode (iframe embedding), skip all card chrome entirely and
//   render just the children so the embed shows the bare chart.
// Approach: DaisyUI `collapse collapse-arrow` component, React-controlled
//   via a native checkbox. DaisyUI's collapse uses a checkbox for state,
//   which we wire to our React `expanded` state via `onChange`. The
//   `collapse-open` / `collapse-close` modifier classes force the open
//   state so controlled behaviour is deterministic. Embed mode short-
//   circuits before the collapse wrapper — no card, no header, no
//   collapse mechanism, just `{children}` inside a minimal wrapper.
// Alternatives considered:
//   - Custom card + max-height:none transition (previous state): Rejected
//     — required a custom `.collapsible-content` class in styles.css
//     with a non-stock CSS transition value. The vanilla-DaisyUI sweep
//     (2026-04-14) moved to the native component.
//   - Re-render CollapsibleSection differently per embed: Rejected —
//     early return is the simplest branching and matches how embeds work
//     elsewhere (EmbedRenderer also early-returns on validId failure).
//   - Pass isEmbed as a prop: Rejected — every consumer would need to
//     thread it through. Direct import from urlParams is the same
//     pattern used in main.jsx and App.jsx.
export default function CollapsibleSection({ title, subtitle, defaultExpanded = true, children }) {
    // Embed mode: strip all chrome, render just the children. EmbedRenderer
    // uses DOM traversal to find [data-embed-id] elements inside these
    // children and show only the card ancestors containing a match — since
    // we don't render a card wrapper in embed mode, that ancestor is one
    // of the children itself (the chart container div).
    if (isEmbedMode) return <>{children}</>;

    const [expanded, setExpanded] = useState(defaultExpanded);
    const sectionId = title.toLowerCase().replace(/\s+/g, '-');

    return (
        <div
            className={`collapse collapse-arrow bg-base-200 border border-base-300 ${expanded ? 'collapse-open' : 'collapse-close'}`}
        >
            <input
                type="checkbox"
                id={`${sectionId}-toggle`}
                checked={expanded}
                onChange={e => setExpanded(e.target.checked)}
                aria-label={`Toggle ${title} section`}
            />
            <div className="collapse-title font-semibold flex items-center gap-2">
                <span className="text-base sm:text-lg text-base-content">{title}</span>
                {subtitle && (
                    <span className="text-xs text-base-content/60 ml-auto mr-8 hidden sm:inline">{subtitle}</span>
                )}
            </div>
            <div className="collapse-content">
                {children}
            </div>
        </div>
    );
}
