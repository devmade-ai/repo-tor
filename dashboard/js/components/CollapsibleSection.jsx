import React, { useState } from 'react';
import { isEmbedMode } from '../urlParams.js';

// Requirement: Wrap each dashboard section in a bordered card with a
//   collapsible header that toggles the section body's visibility. In
//   embed mode (iframe embedding), strip all card chrome and render a
//   minimal wrapper so EmbedRenderer can isolate individual charts.
// Approach: DaisyUI `collapse collapse-arrow` component, React-controlled
//   via a native checkbox. DaisyUI's collapse uses a checkbox for state,
//   which we wire to our React `expanded` state via `onChange`. The
//   `collapse-open` / `collapse-close` modifier classes force the open
//   state so controlled behaviour is deterministic. Embed mode renders
//   a per-section `<div data-embed-wrapper>` so EmbedRenderer's
//   `useLayoutEffect` can `closest('[data-embed-wrapper]')` walk from
//   each `[data-embed-id]` target to its wrapping CollapsibleSection —
//   this gives per-chart isolation inside multi-chart sections like
//   Timeline (which contains 5 separate embed charts).
// Alternatives considered:
//   - Return `<>{children}</>` Fragment in embed mode (earlier state):
//     Rejected 2026-04-14. A Fragment has no DOM ancestor, so embedded
//     charts inside the same section share a top-level parent and
//     `?embed=activity-timeline` would show all 5 Timeline charts
//     instead of just the one requested.
//   - Use an `ErrorBoundary` wrapper in embed mode: Rejected — the
//     bare data-attribute div is the minimal viable marker and doesn't
//     add error-boundary nesting that EmbedRenderer would need to
//     work around.
// Rules of Hooks: `useState` must be called BEFORE any early return
//   so React's hook count stays consistent across renders. The isEmbed
//   branch is a module-level constant so this is theoretically safe
//   as-is, but eslint-plugin-react-hooks flags the pattern and any
//   future refactor that made it dynamic would crash with "Rendered
//   fewer hooks than expected."
export default function CollapsibleSection({ title, subtitle, defaultExpanded = true, children }) {
    const [expanded, setExpanded] = useState(defaultExpanded);

    // Embed mode: wrap in a data-attribute div so EmbedRenderer can
    // target individual CollapsibleSection instances via closest()
    // DOM traversal. No card, no header, no collapse mechanism — just
    // the children inside a marker div.
    if (isEmbedMode) return <div data-embed-wrapper="">{children}</div>;

    return (
        <div
            className={`collapse collapse-arrow bg-base-200 border border-base-300 ${expanded ? 'collapse-open' : 'collapse-close'}`}
        >
            <input
                type="checkbox"
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
