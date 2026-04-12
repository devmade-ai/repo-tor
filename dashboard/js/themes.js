// === Theme catalog, validation, and the applyTheme() helper ===
//
// Requirement: Single source of truth for the dashboard's DaisyUI theme
//   selection, flash prevention defaults, PWA status-bar colors, Chart.js
//   sync, and cross-tab storage events. Every theme-affecting code path
//   routes through this module so there is exactly one place that knows how
//   to map (dark: boolean) -> DaisyUI theme name -> DOM attributes -> meta
//   tags -> Chart.js defaults.
//
// Approach: Plain ES module that exports the catalog, storage helpers, and
//   an `applyTheme(dark, themeName, skipPersist)` function. React code
//   imports this and calls `applyTheme()` from an effect; non-React callers
//   (e.g. App.jsx embed mode override) call the same function. The inline
//   flash-prevention script in index.html can't import ES modules, so it
//   keeps its own small duplicated copy — the allowlist constants and meta
//   color map in that script MUST stay in sync with this module, and
//   `scripts/generate-theme-meta.mjs` regenerates `generated/themeMeta.js`
//   on every build to catch DaisyUI-side drift automatically.
//
// Alternatives considered:
//   - Keep theme logic inlined in AppContext.jsx: Rejected — App.jsx embed
//     override and the cross-tab storage listener duplicated the same DOM
//     mutations, and the logic mixed with reducer concerns nobody wanted.
//   - Put applyTheme on a React context: Rejected — needed from non-React
//     callers (embed override) and from unit-testable code paths.
//   - Persist theme name alongside darkMode (Approach A/B from the reference
//     doc): Deferred — this project currently has only one theme per mode
//     (lofi/black) and no picker UI. The catalog below is extensible, and
//     `getStoredTheme()` already supports reading an optional per-mode key
//     so adding a picker later is a localized change.
//
// See: docs/implementations/THEME_DARK_MODE.md
//      docs/SESSION_NOTES.md 2026-04-12 entry

import { Chart as ChartJS } from 'chart.js';
import { safeStorageGet, safeStorageSet } from './utils.js';
import { META_COLORS, IS_DARK, THEME_NAMES } from './generated/themeMeta.js';

// Chart.js is also imported by main.jsx (for component registration) and
// AppContext.jsx — ES modules are cached so we all share the same Chart
// singleton. Mutating Chart.defaults here takes effect globally on the next
// chart build.

// --- Theme catalog ---
// Curated arrays per mode. Users pick from these when a picker UI exists.
// Currently the project ships with one theme per mode; adding more is a
// matter of listing them here AND in dashboard/styles.css `@plugin "daisyui"`
// AND in scripts/generate-theme-meta.mjs REGISTERED_THEMES. All three must
// stay in sync — the prebuild hook regenerates `generated/themeMeta.js`
// automatically, but the other two are human-maintained.
export const LIGHT_THEMES = ['lofi'];
export const DARK_THEMES = ['black'];

export const DEFAULT_LIGHT_THEME = 'lofi';
export const DEFAULT_DARK_THEME = 'black';

// --- Validation helpers ---
// Reference doc Phase 2 says: "Always validate stored values against the
// catalog. Users may have outdated values from a previous version where a
// theme was removed. Invalid IDs should silently fall back to defaults —
// no crash, no unstyled page."
const lightSet = new Set(LIGHT_THEMES);
const darkSet = new Set(DARK_THEMES);

export function validLightTheme(id) {
    return lightSet.has(id) ? id : DEFAULT_LIGHT_THEME;
}

export function validDarkTheme(id) {
    return darkSet.has(id) ? id : DEFAULT_DARK_THEME;
}

// --- Storage helpers ---
// Storage keys:
//   darkMode    - 'true' | 'false' (required)
//   lightTheme  - DaisyUI theme name (optional; defaults to DEFAULT_LIGHT_THEME)
//   darkTheme   - DaisyUI theme name (optional; defaults to DEFAULT_DARK_THEME)
//
// The optional per-mode keys are forward-compat plumbing: today there's no
// UI for setting them, so they're always absent and the defaults apply. As
// soon as a theme picker is added, writing to these keys will just work
// without any other code changes.
export function getStoredTheme(dark) {
    if (dark) {
        return validDarkTheme(safeStorageGet('darkTheme') || DEFAULT_DARK_THEME);
    }
    return validLightTheme(safeStorageGet('lightTheme') || DEFAULT_LIGHT_THEME);
}

export function persistTheme(dark, themeName) {
    safeStorageSet('darkMode', String(dark));
    // Only persist the per-mode theme key if it differs from the default.
    // Avoids cluttering localStorage with redundant entries and makes it
    // easier to observe "the user hasn't picked a custom theme yet".
    const defaultForMode = dark ? DEFAULT_DARK_THEME : DEFAULT_LIGHT_THEME;
    if (themeName && themeName !== defaultForMode) {
        safeStorageSet(dark ? 'darkTheme' : 'lightTheme', themeName);
    }
}

// --- Meta color lookup ---
export function getMetaColor(themeName) {
    return META_COLORS[themeName] || '#808080';
}

// --- applyTheme: single source of truth for DOM mutations ---
// Requirement: Every theme change must apply dual-layer theming atomically —
//   the .dark class for Tailwind's dark: variant AND the data-theme attribute
//   for DaisyUI's semantic tokens. It must also update the PWA status bar
//   color and Chart.js canvas defaults. Missing any of these produces visual
//   inconsistencies (dark text on white background, stale chart axis colors,
//   mismatched mobile status bar).
// Approach: One function, one set of DOM mutations. Callers pass `skipPersist
//   = true` when the new value came from another tab's storage event (the
//   value is already in localStorage — writing it back would be redundant at
//   best and could trigger a write loop at worst).
// Alternatives:
//   - Split into multiple functions (applyClass, applyDataTheme, applyMeta):
//     Rejected — every caller needs all of them. Splitting creates a chance
//     to forget one and get into an inconsistent state.
//   - Call from a React effect only: Rejected — embed override and the
//     initial hydration step need to apply theme before React mounts /
//     outside React lifecycle.
export function applyTheme(dark, themeName, skipPersist = false) {
    const root = document.documentElement;
    if (dark) {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }

    const validatedName = dark ? validDarkTheme(themeName) : validLightTheme(themeName);
    root.setAttribute('data-theme', validatedName);

    // Update BOTH <meta name="theme-color"> tags — we have one per
    // prefers-color-scheme media query. Overwriting content on both makes the
    // active theme win regardless of OS preference.
    const color = getMetaColor(validatedName);
    document.querySelectorAll('meta[name="theme-color"]').forEach((meta) => {
        meta.setAttribute('content', color);
    });

    // Feed Chart.js the active theme's foreground token.
    // DaisyUI exposes --color-base-content as an oklch() value. Canvas
    // context parses oklch() and color-mix() the same way CSS does in
    // modern browsers (Chrome 111+, Firefox 113+, Safari 16.2+), so we pass
    // color-mix expressions through verbatim. Axis labels use 80% alpha
    // for "secondary text" legibility, grid lines 10% alpha to stay subtle.
    const styles = getComputedStyle(root);
    const baseContent = styles.getPropertyValue('--color-base-content').trim();
    if (baseContent && ChartJS && ChartJS.defaults) {
        ChartJS.defaults.color = `color-mix(in oklab, ${baseContent} 80%, transparent)`;
        ChartJS.defaults.borderColor = `color-mix(in oklab, ${baseContent} 10%, transparent)`;
    }

    if (!skipPersist) {
        persistTheme(dark, validatedName);
    }
}

// --- Debug / inspection helpers ---
// Exposed for the debug pill and for ad-hoc console inspection. Not part of
// the public API surface most code should care about.
export const __allThemes = THEME_NAMES;
export const __isDark = IS_DARK;
