/**
 * Single source of truth for DaisyUI theme registration.
 *
 * Requirement: When adding, removing, or renaming a theme, there is exactly
 *   one place to edit — this file. The build-time generator
 *   (`scripts/generate-theme-meta.mjs`) propagates the change to every
 *   downstream file that needs to know about it:
 *
 *     - dashboard/js/generated/themeMeta.js   (full file, auto-generated)
 *     - dashboard/js/themes.js                (block between BEGIN/END GENERATED markers)
 *     - dashboard/styles.css                  (@plugin "daisyui" block between markers)
 *     - dashboard/index.html                  (inline flash prevention block between markers)
 *
 *   The generator runs as a prebuild step for `npm run dev`, `npm run build`,
 *   and `npm run build:lib`, so any edit here is reflected in the next build
 *   without manual intervention. It's also runnable on demand via
 *   `npm run generate-theme-meta`.
 *
 * Approach: Plain ES module exporting `THEMES` (light + dark arrays of
 *   `{ id, name, description }` objects), `DEFAULT_LIGHT_THEME`, and
 *   `DEFAULT_DARK_THEME`. `id` must be a real DaisyUI stock theme name
 *   (see node_modules/daisyui/theme/). `name` and `description` are used
 *   by the theme picker UI in the burger menu. The generator fails fast
 *   if an `id` is not a valid DaisyUI theme.
 *
 * Alternatives considered:
 *   - Inline the list at the top of generate-theme-meta.mjs: Rejected — the
 *     config is data, not logic, and inlining it made the generator do two
 *     jobs (define the catalog and transform it). Splitting gives a clean
 *     "config vs generator" boundary that also makes the file importable
 *     from tests.
 *   - Put the list in a JSON file: Rejected — JSON doesn't allow comments,
 *     and this file deserves extensive explanatory comments for future
 *     contributors adding themes.
 *   - Put the list in package.json: Rejected — mixes unrelated concerns;
 *     package.json already has too much responsibility.
 *
 * See: docs/implementations/THEME_DARK_MODE.md (Theme Catalog section)
 *      scripts/generate-theme-meta.mjs
 */

// Curated selection — 4 light + 4 dark. The reference doc recommends "2-5
// curated combos (or 8-10 themes per mode)" for utility apps; 4 per mode is
// comfortably in that range and keeps the burger-menu theme picker short.
//
// Selection rationale:
// - light: one minimal (lofi), one cool (nord), one vibrant (emerald), one
//   warm (caramellatte). Covers the main aesthetic axes.
// - dark: one pure OLED (black), one soft (dim), one warm (coffee), one
//   dev-classic (dracula). Same coverage in dark mode.
// All eight are DaisyUI stock themes — no custom theme definitions needed.
export const THEMES = {
    light: [
        { id: 'lofi', name: 'Lo-Fi', description: 'Minimal monochrome' },
        { id: 'nord', name: 'Nord', description: 'Cool blue-gray' },
        { id: 'emerald', name: 'Emerald', description: 'Fresh green' },
        { id: 'caramellatte', name: 'Caramel Latte', description: 'Warm neutral' },
    ],
    dark: [
        { id: 'black', name: 'Black', description: 'True OLED' },
        { id: 'dim', name: 'Dim', description: 'Soft dark gray' },
        { id: 'coffee', name: 'Coffee', description: 'Dark roast' },
        { id: 'dracula', name: 'Dracula', description: 'Dev classic' },
    ],
};

// Defaults MUST be one of the IDs above. The generator verifies this and
// fails the build if they don't match so a typo in either field is caught
// immediately, not in production when a user's first paint renders unstyled.
export const DEFAULT_LIGHT_THEME = 'lofi';
export const DEFAULT_DARK_THEME = 'black';
