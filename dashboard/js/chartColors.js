/**
 * Centralized chart color configuration for the dashboard.
 *
 * Requirement: Allow embedding apps to customize graph colors via URL parameters
 * Approach: Single module that all tab components import colors from. Reads
 *   ?colors= (series palette), ?accent= (primary color), and ?palette= (named
 *   presets) from the URL at load time. Falls back to defaults when no overrides
 *   are provided, so the full dashboard is unaffected.
 * Alternatives:
 *   - CSS variable overrides: Rejected — CSS variables can't cross iframe
 *     boundaries, so the embedding app couldn't set them
 *   - postMessage API: Rejected — adds complexity; URL params are simpler
 *     and stateless (bookmarkable, shareable)
 *   - Per-chart URL params: Rejected — too many params; a shared palette
 *     covers the common case cleanly
 */

// --- Default palette (matches the original hardcoded values) ---
const DEFAULT_SERIES = ['#2D68FF', '#16A34A', '#EAB308', '#a78bfa', '#EF4444', '#22d3ee'];
const DEFAULT_ACCENT = '#2D68FF';
const DEFAULT_ACCENT_MUTED = '#94a3b8';

// --- Named palette presets ---
// Curated palettes that embedders can use via ?palette=name instead of
// specifying individual hex values. Each defines a series (for multi-dataset
// charts) and an accent (for single-color charts like heatmaps).
const PALETTES = {
    // Default dashboard palette
    default: { series: DEFAULT_SERIES, accent: DEFAULT_ACCENT },
    // Warm tones — good for light-background embeds
    warm: {
        series: ['#E63946', '#F4A261', '#E9C46A', '#2A9D8F', '#264653', '#606C38'],
        accent: '#E63946',
    },
    // Cool tones — corporate / professional feel
    cool: {
        series: ['#0077B6', '#00B4D8', '#90E0EF', '#CAF0F8', '#023E8A', '#48CAE4'],
        accent: '#0077B6',
    },
    // Earth tones — natural, muted colors
    earth: {
        series: ['#606C38', '#283618', '#DDA15E', '#BC6C25', '#FEFAE0', '#9B2226'],
        accent: '#606C38',
    },
    // Vibrant — high contrast, colorful
    vibrant: {
        series: ['#FF006E', '#8338EC', '#3A86FF', '#06D6A0', '#FFD166', '#EF476F'],
        accent: '#FF006E',
    },
    // Monochrome — single-hue variations (uses accent for tints)
    mono: {
        series: ['#1D4ED8', '#3B82F6', '#60A5FA', '#93C5FD', '#BFDBFE', '#DBEAFE'],
        accent: '#1D4ED8',
    },
};

// --- Parse URL overrides (runs once at module load) ---
function parseColorOverrides() {
    const params = new URLSearchParams(window.location.search);

    // Start from default
    let series = [...DEFAULT_SERIES];
    let accent = DEFAULT_ACCENT;
    let accentMuted = DEFAULT_ACCENT_MUTED;

    // ?palette=name — apply a named preset as the base
    const paletteName = params.get('palette');
    if (paletteName && PALETTES[paletteName]) {
        const preset = PALETTES[paletteName];
        series = [...preset.series];
        accent = preset.accent;
    }

    // Validate hex color format: 3 or 6 hex digits, optionally prefixed with #.
    // Rejects invalid values to prevent broken CSS/chart rendering from URL params.
    const isValidHex = (c) => /^#?[0-9a-fA-F]{3}([0-9a-fA-F]{3})?$/.test(c);
    const toHex = (c) => c.startsWith('#') ? c : `#${c}`;

    // ?colors=hex1,hex2,hex3 — override series colors (takes priority over palette)
    const colorsParam = params.get('colors');
    if (colorsParam) {
        const parsed = colorsParam
            .split(',')
            .map(c => c.trim())
            .filter(c => c && isValidHex(c))
            .map(toHex);
        if (parsed.length > 0) {
            series = parsed;
        }
    }

    // ?accent=hex — override the primary accent color (takes priority over palette)
    const accentParam = params.get('accent');
    if (accentParam && isValidHex(accentParam)) {
        accent = toHex(accentParam);
    }

    // ?muted=hex — override the muted/secondary color (after-hours, weekends, etc.)
    const mutedParam = params.get('muted');
    if (mutedParam && isValidHex(mutedParam)) {
        accentMuted = toHex(mutedParam);
    }

    return { series, accent, accentMuted };
}

const resolved = parseColorOverrides();

// --- Exported color accessors ---

/**
 * The resolved series palette. Use for multi-dataset charts (stacked bars,
 * multi-line charts). Cycle through with index % length.
 */
export const seriesColors = resolved.series;

/**
 * The resolved primary accent color. Use for single-dataset charts, heatmap
 * intensity, and any element that should match the "brand" color.
 */
export const accentColor = resolved.accent;

/**
 * A muted/secondary color for contrast elements (after-hours bars, weekend
 * bars, low-complexity indicators).
 */
export const mutedColor = resolved.accentMuted;

/**
 * Get a series color by index, cycling through the palette.
 */
export function getSeriesColor(index) {
    return seriesColors[index % seriesColors.length];
}

/**
 * Generate an rgba() string from a hex color at the given opacity.
 * Used for chart fill backgrounds (e.g., area under line charts).
 */
export function withOpacity(hex, opacity) {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity})`;
}

/**
 * The named palette presets, exported for documentation/settings UI.
 */
export const palettes = PALETTES;
