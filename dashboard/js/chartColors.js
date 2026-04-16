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
 *   General chart datasets cycle through an 8-colour sequence of DaisyUI
 *   semantic tokens (primary → secondary → accent → info → success →
 *   warning → error → neutral) via getSeriesColor(). Repo-specific
 *   charts use a smarter resolver (resolveActiveRepoColor) that filters
 *   out achromatic tokens at runtime — monochrome themes like lofi and
 *   black define primary/secondary/accent as gray, which would make
 *   active repos indistinguishable from internal/discontinued repos.
 *   The previous 20-hex palette offered more distinct values at the cost
 *   of being theme-independent; the vanilla version prioritises theme
 *   fidelity.
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
//
// Active repos use `resolveActiveRepoColor` which filters tokens by
// oklch chroma at runtime. Monochrome themes (lofi, black) define
// primary/secondary/accent as achromatic grays identical to neutral —
// without filtering, active repos would be indistinguishable from
// internal/discontinued repos. The status tokens (info/success/warning/
// error) are colorful in every DaisyUI stock theme, guaranteeing at
// least 4 distinct colours after filtering. Neutral is excluded from
// the active-repo candidate list entirely since it's reserved for the
// internal/discontinued categories.
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

// Candidate tokens for active repos — neutral is excluded because it's
// reserved for the internal/discontinued dimmed overlays.
const ACTIVE_REPO_TOKENS = [
    '--color-primary',
    '--color-secondary',
    '--color-accent',
    '--color-info',
    '--color-success',
    '--color-warning',
    '--color-error',
];

// Minimum oklch chroma to consider a colour "colorful" rather than gray.
// Monochrome themes (lofi, black) set primary/secondary/accent to chroma 0;
// even coffee's secondary (0.029) reads as gray. Threshold 0.03 catches all
// of these while keeping every status token (lowest observed: coffee info at
// 0.063) and every colorful identity token (lowest: nord secondary at 0.059).
const MIN_ACTIVE_CHROMA = 0.03;

/**
 * Resolve a colour for an active (public-facing) repo by index.
 *
 * Filters out achromatic tokens whose oklch chroma falls below
 * MIN_ACTIVE_CHROMA so active repos always stand out from the neutral
 * grays used for internal/discontinued categories. In colorful themes
 * (nord, emerald, dim, dracula) all 7 tokens pass; in monochrome themes
 * (lofi, black) only the 4 status tokens survive, and active repos cycle
 * through those.
 */
function resolveActiveRepoColor(index) {
    const colorful = [];
    for (const token of ACTIVE_REPO_TOKENS) {
        const val = readCssVar(token);
        if (!val) continue;
        // DaisyUI custom properties resolve to oklch(L C H) strings.
        // Extract chroma (2nd numeric value) to detect achromatic tokens.
        const match = val.match(/oklch\(\s*[\d.]+%?\s+([\d.]+)/);
        if (match) {
            if (parseFloat(match[1]) >= MIN_ACTIVE_CHROMA) colorful.push(val);
        } else {
            // Non-oklch format (unlikely but safe) — include rather than exclude
            colorful.push(val);
        }
    }
    if (colorful.length === 0) {
        // Extreme fallback: no token has chroma — use first token raw
        return readCssVar(ACTIVE_REPO_TOKENS[0]);
    }
    return colorful[index % colorful.length];
}

/**
 * Get a chart colour for a repo based on its category. Discontinued repos
 * get a 30%-opacity neutral overlay (ghost), internal repos get 60%
 * neutral (visible but muted), active public-facing repos cycle through
 * colorful semantic tokens only. All values resolve to the active DaisyUI
 * theme at call time.
 *
 * Module-private — only `buildRepoColorMap` below consumes this helper.
 */
function getRepoColor(repoName, activeIndex) {
    if (DISCONTINUED_REPOS.has(repoName)) return dimNeutral(0.3);
    if (INTERNAL_REPOS.has(repoName)) return dimNeutral(0.6);
    return resolveActiveRepoColor(activeIndex);
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
