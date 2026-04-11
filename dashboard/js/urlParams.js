/**
 * Centralized URL parameter parsing.
 *
 * Requirement: Multiple modules need access to URL query parameters (?embed=,
 *   ?data=, ?theme=, ?bg=, ?colors=, ?accent=, ?palette=). Previously parsed
 *   independently in App.jsx (3 times), chartColors.js, and main.jsx.
 * Approach: Parse once at module load, export a frozen params object.
 *   URL doesn't change during SPA lifecycle so a single parse is correct.
 * Alternatives:
 *   - Parse in each module: Rejected — 4+ redundant URLSearchParams constructions
 *   - React context: Rejected — overkill for static URL params; also needed by
 *     non-React modules (chartColors.js)
 */

const params = new URLSearchParams(window.location.search);

/** Embed chart IDs from ?embed=id1,id2 — null if not in embed mode */
export const embedIds = (() => {
    const raw = params.get('embed');
    if (!raw) return null;
    return raw.split(',').map(s => s.trim()).filter(Boolean);
})();

/** Whether the dashboard is in embed mode */
export const isEmbedMode = embedIds !== null;

/** Theme override from ?theme=light|dark */
export const themeParam = params.get('theme');

/** Background override from ?bg=hex|transparent */
export const bgParam = params.get('bg');

/** Data URL from ?data=url */
export const dataUrlParam = params.get('data');

/** Raw URLSearchParams for modules that need other params (chartColors.js) */
export const searchParams = params;
