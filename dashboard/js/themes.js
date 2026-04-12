// === Theme catalog, validation, and the applyTheme() helper ===
//
// Requirement: Single source of truth for the dashboard's DaisyUI theme
//   selection, flash prevention defaults, PWA status-bar colors, Chart.js
//   sync, and cross-tab storage events. Every theme-affecting code path
//   routes through this module so there is exactly one place that knows how
//   to map (dark: boolean) -> DaisyUI theme name -> DOM attributes -> meta
//   tags -> Chart.js defaults.
//
// Approach: Plain ES module. The catalog itself (LIGHT_THEMES, DARK_THEMES,
//   DEFAULT_LIGHT_THEME, DEFAULT_DARK_THEME) lives inside a BEGIN/END
//   GENERATED block below and is rewritten by `scripts/generate-theme-meta.mjs`
//   from `scripts/theme-config.js` on every build. Everything else in this
//   file — validators, storage helpers, the `applyTheme()` function — is
//   hand-maintained and imports from the generated block.
//
//   Non-React callers (e.g. App.jsx embed mode override) call `applyTheme()`
//   directly, same as AppContext's darkMode effect. The inline flash
//   prevention script in index.html has its own equivalent copy of the
//   catalog because inline scripts can't import ES modules, but that copy
//   also lives inside a BEGIN/END GENERATED block and stays in sync
//   automatically via the same generator.
//
// Alternatives considered:
//   - Keep theme logic inlined in AppContext.jsx: Rejected — App.jsx embed
//     override and the cross-tab storage listener duplicated the same DOM
//     mutations, and the logic mixed with reducer concerns nobody wanted.
//   - Put applyTheme on a React context: Rejected — needed from non-React
//     callers (embed override) and from unit-testable code paths.
//   - String-array catalog instead of object-shape: Rejected — the reference
//     pattern uses `{ id, name, description }` objects so the theme picker UI
//     can show labels without a second lookup map. We now match.
//
// See: docs/implementations/THEME_DARK_MODE.md
//      scripts/theme-config.js (source of truth for the catalog)
//      scripts/generate-theme-meta.mjs (propagates catalog to four files)

import { Chart as ChartJS } from 'chart.js';
import { safeStorageGet, safeStorageSet } from './utils.js';
import { META_COLORS } from './generated/themeMeta.js';

// Chart.js is also imported by main.jsx (for component registration) and
// AppContext.jsx — ES modules are cached so we all share the same Chart
// singleton. Mutating Chart.defaults here takes effect globally on the next
// chart build.

// --- Theme catalog ---
// BEGIN/END GENERATED markers below are read by scripts/generate-theme-meta.mjs.
// DO NOT edit the block between the markers by hand — it will be overwritten
// on the next build. Edit `scripts/theme-config.js` instead, then run
// `npm run generate-theme-meta` (or any `npm run dev` / `npm run build`).
/* BEGIN GENERATED: theme-catalog */
export const LIGHT_THEMES = [
    { id: "lofi", name: "Lo-Fi", description: "Minimal monochrome" },
    { id: "nord", name: "Nord", description: "Cool blue-gray" },
    { id: "emerald", name: "Emerald", description: "Fresh green" },
    { id: "caramellatte", name: "Caramel Latte", description: "Warm neutral" },
];

export const DARK_THEMES = [
    { id: "black", name: "Black", description: "True OLED" },
    { id: "dim", name: "Dim", description: "Soft dark gray" },
    { id: "coffee", name: "Coffee", description: "Dark roast" },
    { id: "dracula", name: "Dracula", description: "Dev classic" },
];

export const DEFAULT_LIGHT_THEME = "lofi";
export const DEFAULT_DARK_THEME = "black";
/* END GENERATED: theme-catalog */

// --- Validation helpers ---
// Reference doc Phase 2 says: "Always validate stored values against the
// catalog. Users may have outdated values from a previous version where a
// theme was removed. Invalid IDs should silently fall back to defaults —
// no crash, no unstyled page."
const lightSet = new Set(LIGHT_THEMES.map((t) => t.id));
const darkSet = new Set(DARK_THEMES.map((t) => t.id));

export function validLightTheme(id) {
    return lightSet.has(id) ? id : DEFAULT_LIGHT_THEME;
}

export function validDarkTheme(id) {
    return darkSet.has(id) ? id : DEFAULT_DARK_THEME;
}

// --- Storage helpers ---
// Storage keys (Approach A from docs/implementations/THEME_DARK_MODE.md):
//   darkMode    - 'true' | 'false' (required once the user has toggled at least once)
//   lightTheme  - DaisyUI theme name (optional; defaults to DEFAULT_LIGHT_THEME)
//   darkTheme   - DaisyUI theme name (optional; defaults to DEFAULT_DARK_THEME)
//
// The per-mode keys are written only when the user picks a non-default
// theme via the burger-menu picker. When absent, getStoredTheme returns
// the default for that mode, so a fresh visit gets lofi/black without
// anything needing to be in localStorage.
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
