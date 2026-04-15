/**
 * Vanilla-DaisyUI chart colour resolver.
 *
 * Requirement: Chart.js datasets must use only DaisyUI semantic tokens so
 *   every chart tracks the active theme. No static brand palette, no URL
 *   overrides, no hardcoded hex — "the daisy theme is the brand colour".
 * Approach: At runtime, read DaisyUI's semantic colour custom properties
 *   from `getComputedStyle(document.documentElement)` and return the
 *   resolved values (oklch strings or similar). Modern browsers (Chrome
 *   111+, Firefox 113+, Safari 16.2+) parse oklch() in canvas, so Chart.js
 *   accepts the values directly without a conversion step.
 *
 *   Chart datasets with multiple categories cycle through an 8-colour
 *   sequence of DaisyUI semantic tokens (primary → secondary → accent →
 *   info → success → warning → error → neutral). Charts with more than
 *   eight series repeat colours. The previous 20-hex palette offered more
 *   distinct values at the cost of being theme-independent; the vanilla
 *   version prioritises theme fidelity.
 *
 * Alternatives considered:
 *   - 20-hex brand palette (previous state): Rejected — user directive
 *     "i don't want brand colours or static colours anywhere".
 *   - Use `var(--color-*)` literals in Chart.js config: Rejected — canvas
 *     context doesn't resolve CSS variables, only the browser's CSS parser
 *     does.
 *   - Generate lightened/darkened variants with color-mix to extend beyond
 *     8 colours: Possible but over-engineered for now. If a chart actually
 *     has >8 distinct series, we can add a second cycle later.
 */

// Eight DaisyUI semantic CSS variables, in visual-interest order for
// chart cycling. Primary leads because it's the "default dataset" colour
// across the UI; info/success/warning/error come after the tinted colour
// families so the first five slots of a multi-category chart are visually
// distinct without implying status.
const SEMANTIC_CYCLE = [
    '--color-primary',
    '--color-secondary',
    '--color-accent',
    '--color-info',
    '--color-success',
    '--color-warning',
    '--color-error',
    '--color-neutral',
];

function readCssVar(name) {
    if (typeof document === 'undefined' || !document.documentElement) return '';
    return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

/**
 * Active theme's primary colour. Reads --color-primary at call time so
 * every invocation reflects the current theme. Returns empty string in
 * non-DOM contexts (SSR, tests) — callers must handle the empty case.
 */
export function resolveRuntimeAccent() {
    return readCssVar('--color-primary');
}

/**
 * Active theme's "muted" colour — used for secondary/de-emphasised chart
 * segments (after-hours bars, weekend bars, low-complexity indicators).
 * Derived as `color-mix(in oklab, <base-content> 40%, transparent)` which
 * matches the dashboard's `text-base-content/40` tertiary-text convention
 * so muted chart bars visually align with the "inactive" text tone.
 * Modern canvas parses color-mix() natively so Chart.js accepts it as-is.
 */
export function resolveRuntimeMuted() {
    const baseContent = readCssVar('--color-base-content');
    if (!baseContent) return '';
    return `color-mix(in oklab, ${baseContent} 40%, transparent)`;
}

/**
 * Get a series colour by index, cycling through the 8 DaisyUI semantic
 * tokens. Resolves at call time so every invocation reflects the active
 * theme.
 */
export function getSeriesColor(index) {
    return readCssVar(SEMANTIC_CYCLE[index % SEMANTIC_CYCLE.length]);
}

/**
 * Generate an rgba()/color-mix wrapper for a resolved colour at the given
 * opacity. Used for chart fill backgrounds (e.g., area under line charts).
 * Accepts any CSS colour value the browser understands — oklch strings
 * from DaisyUI, color-mix expressions, etc.
 */
export function withOpacity(color, opacity) {
    if (!color) return '';
    return `color-mix(in oklab, ${color} ${Math.round(opacity * 100)}%, transparent)`;
}

// --- Repo category helpers ---
// Repos have three display categories — discontinued, internal, and active.
// Each category maps to a DaisyUI semantic token so the chart tracks the
// active theme. The visual hierarchy preserves the pre-vanilla design
// where active repos are most prominent, internal repos are dimmer, and
// discontinued repos are the dimmest. All three resolve at runtime so
// theme changes update colours via the chart useMemo deps that include
// state.themeAccent / state.themeMuted.
//
// Implementation: both inactive categories use `--color-neutral` with
// different opacity overlays via color-mix. Internal at 60% (clearly
// visible but de-emphasised), discontinued at 30% (barely-there ghost).
// Active cycles through the 8-slot semantic palette via getSeriesColor.
//
// Earlier vanilla-sweep version mapped internal → `--color-base-content`
// (the primary text colour, HIGH contrast) which inverted the intended
// hierarchy — internal repos rendered MORE prominent than active ones
// because base-content is near-pure-black/white in most themes. Fixed
// 2026-04-15 to use neutral with opacity instead.
const DISCONTINUED_REPOS = new Set(['coin-zapp', 'plant-fur', 'chatty-chart']);
const INTERNAL_REPOS = new Set(['tool-till-tees', 'glow-props', 'canva-grid-assets', 'repo-tor']);

function dimNeutral(opacity) {
    const neutral = readCssVar('--color-neutral');
    if (!neutral) return '';
    return `color-mix(in oklab, ${neutral} ${Math.round(opacity * 100)}%, transparent)`;
}

/**
 * Get a chart colour for a repo based on its category. Discontinued repos
 * get a 30%-opacity neutral overlay (ghost), internal repos get 60%
 * neutral (visible but muted), active public-facing repos cycle through
 * the 8-slot semantic palette. All values resolve to the active DaisyUI
 * theme at call time.
 */
export function getRepoColor(repoName, activeIndex) {
    if (DISCONTINUED_REPOS.has(repoName)) return dimNeutral(0.3);
    if (INTERNAL_REPOS.has(repoName)) return dimNeutral(0.6);
    return getSeriesColor(activeIndex);
}

/**
 * Build a colour map for a list of repos, using category-aware colours.
 * Public-facing repos get sequential semantic-cycle colours; discontinued
 * and internal repos get their category's fixed token. Resolves at call
 * time so the caller should memoize on theme state.
 */
export function buildRepoColorMap(repos) {
    const colorMap = {};
    let activeIndex = 0;
    for (const repo of repos) {
        colorMap[repo] = getRepoColor(repo, activeIndex);
        if (!DISCONTINUED_REPOS.has(repo) && !INTERNAL_REPOS.has(repo)) {
            activeIndex++;
        }
    }
    return colorMap;
}
