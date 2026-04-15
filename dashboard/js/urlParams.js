/**
 * Centralized URL parameter parsing.
 *
 * Requirement: Multiple modules need access to URL query parameters
 *   (?embed=, ?data=, ?theme=, ?bg=). Previously parsed independently in
 *   App.jsx (3 times) and main.jsx.
 * Approach: Parse once at module load, export a frozen params object.
 *   URL doesn't change during SPA lifecycle so a single parse is correct.
 * Alternatives:
 *   - Parse in each module: Rejected — redundant URLSearchParams constructions
 *   - React context: Rejected — overkill for static URL params; also needed by
 *     non-React modules
 *
 * Note: the 2026-04-14 vanilla-DaisyUI sweep deleted `?colors=`, `?accent=`,
 * `?palette=`, and `?muted=` embed-brand overrides. Embedders now get the
 * active DaisyUI theme's semantic colours — the theme IS the brand.
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
