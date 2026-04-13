/**
 * Generate PWA meta theme-color values and propagate the theme catalog to
 * every downstream file that needs to know about it.
 *
 * Requirement: Single source of truth for DaisyUI theme registration. Adding,
 *   removing, or renaming a theme should be a one-line edit in
 *   `scripts/theme-config.js` — the generator then rewrites every other file
 *   that references the catalog so drift is impossible.
 *
 * Approach: Read `scripts/theme-config.js`. For each registered theme, import
 *   its `daisyui/theme/<id>/object.js` and convert `--color-base-100` from
 *   oklch() to hex using an inlined ~30-line color-math pipeline (no
 *   dependency on a color library). Then write four files:
 *
 *     1. `dashboard/js/generated/themeMeta.js` (full rewrite)
 *          Exports META_COLORS / IS_DARK / THEME_NAMES consumed by themes.js.
 *
 *     2. `dashboard/js/themes.js` (BEGIN/END GENERATED: theme-catalog block)
 *          LIGHT_THEMES / DARK_THEMES / DEFAULT_LIGHT_THEME / DEFAULT_DARK_THEME.
 *          The block is replaced; surrounding code (validators, applyTheme,
 *          storage helpers) stays hand-maintained.
 *
 *     3. `dashboard/styles.css` (BEGIN/END GENERATED: daisyui-plugin block)
 *          The `@plugin "daisyui" { themes: ... }` directive.
 *
 *     4. `dashboard/index.html` (BEGIN/END GENERATED: flash-prevention-meta block)
 *          Hardcoded LIGHT_THEMES / DARK_THEMES / DEFAULT_*_THEME / META map
 *          inside the inline flash prevention <script>. Inline scripts can't
 *          import ES modules, so the duplication is structural — but the
 *          generator rewrites this block from the same source of truth, so
 *          drift is impossible.
 *
 *   The generator fails fast if a referenced theme doesn't exist in
 *   node_modules/daisyui/theme/, if DEFAULT_LIGHT_THEME or DEFAULT_DARK_THEME
 *   don't appear in their corresponding arrays, or if a BEGIN/END marker is
 *   missing from a downstream file. All three error modes catch typos and
 *   accidental deletions before they reach the browser.
 *
 * Alternatives considered:
 *   - Only generate themeMeta.js, hand-maintain the other three files:
 *     Rejected — this was our previous approach and it cost ~4 places to
 *     update on every theme change, with only a comment warning against
 *     drift. A commit audit would routinely miss one of the four.
 *   - HTML/CSS/JS parsers for structural edits (parse5, postcss, @babel/parser):
 *     Rejected — adds dependencies and complexity for what is really a
 *     "find-between-markers-and-replace" operation. Marker comments are
 *     unambiguous and survive minification.
 *   - Pull in a color library (culori, colorjs.io): Rejected — 30 lines of
 *     inlined oklch->hex math is self-contained and zero-dependency.
 *
 * See: docs/implementations/THEME_DARK_MODE.md (PWA Meta Theme-Color,
 *        Flash Prevention, Theme Catalog sections)
 *      scripts/theme-config.js (source of truth for the catalog)
 *
 * Run as: node scripts/generate-theme-meta.mjs
 * Called by: npm run dev / build / build:lib (prebuild step), or
 *            `npm run generate-theme-meta` on demand.
 */

import { writeFileSync, readFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import {
    THEMES,
    DEFAULT_LIGHT_THEME,
    DEFAULT_DARK_THEME,
} from './theme-config.js';
import { oklchToHex } from './oklchToHex.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// --- Validate theme-config.js at load time ---
// Fail fast if the config is internally inconsistent. The build would still
// pass downstream if we let garbage propagate, but the inline flash
// prevention script would apply defaults and users would silently get the
// wrong theme — so catch it here.
if (!THEMES || !Array.isArray(THEMES.light) || !Array.isArray(THEMES.dark)) {
    console.error('[generate-theme-meta] theme-config.js must export THEMES = { light: [...], dark: [...] }');
    process.exit(1);
}
if (THEMES.light.length === 0 || THEMES.dark.length === 0) {
    console.error('[generate-theme-meta] theme-config.js must register at least one light theme and one dark theme');
    process.exit(1);
}
const lightIds = new Set(THEMES.light.map((t) => t.id));
const darkIds = new Set(THEMES.dark.map((t) => t.id));
if (!lightIds.has(DEFAULT_LIGHT_THEME)) {
    console.error(`[generate-theme-meta] DEFAULT_LIGHT_THEME "${DEFAULT_LIGHT_THEME}" is not one of THEMES.light ids`);
    process.exit(1);
}
if (!darkIds.has(DEFAULT_DARK_THEME)) {
    console.error(`[generate-theme-meta] DEFAULT_DARK_THEME "${DEFAULT_DARK_THEME}" is not one of THEMES.dark ids`);
    process.exit(1);
}

// --- oklch() -> hex conversion ---
// The actual math lives in scripts/oklchToHex.mjs so it can be unit-tested
// independently (see scripts/__tests__/oklchToHex.test.mjs, run via
// `npm test`). This used to be inlined in this file; extracting it gave
// us 21 unit tests covering the CSS Color Level 4 edge cases, including
// the L=1 percentage-vs-decimal boundary that the old inlined version
// got wrong via the `if (L > 1) L /= 100` heuristic.

// --- Per-theme color-key overrides ---
// Default rule from docs/implementations/THEME_DARK_MODE.md:
//   - Light themes use --color-primary as the PWA status bar color (the
//     theme's brand accent).
//   - Dark themes use --color-base-100 (the theme's main surface).
//
// This default is right for most themes, but some light themes have a
// --color-primary that doesn't represent the theme feel — typically
// monochrome or warm-minimal themes whose primary is near-black, which
// produces a jarring dark status bar on an otherwise-light app. For those
// we override which CSS variable we read. Keys below are DaisyUI theme
// ids from theme-config.js; values are the CSS variable name to read
// instead.
//
// Pattern borrowed from canva-grid's scripts/generate-theme-meta.mjs.
// canva-grid's override map is just `lofi: --color-base-300`. We add
// caramellatte for the same reason (DaisyUI ships it with primary =
// literal oklch(0% 0 0), i.e. pure black).
const COLOR_KEY_OVERRIDES = {
    // lofi's --color-primary is oklch(15.906% 0 0) ≈ #1c1c1c (near-black),
    // which looks wrong as a light-mode status bar. Use --color-base-300
    // (oklch(94% 0 0) ≈ #ebebeb, a neutral light gray) instead — still
    // matches the monochrome aesthetic without flashing near-black on
    // mobile status bars.
    lofi: '--color-base-300',
    // caramellatte's --color-primary is oklch(0% 0 0) = pure black, a
    // DaisyUI design decision. For a "warm neutral" light theme that
    // otherwise uses creams and tans, a black status bar is visually
    // wrong. --color-base-300 (oklch(90% 0.076 70.697) ≈ warm tan) is
    // the most distinctive "caramel" tone available from the base
    // surface palette and blends cleanly with the theme's main surfaces.
    caramellatte: '--color-base-300',
};

// --- Collect theme metadata from DaisyUI ---
// Each registered theme's per-theme object.js (found at
// node_modules/daisyui/theme/<id>/object.js) exports a plain object of
// CSS variables with a `color-scheme` key ('light' or 'dark'). We verify
// color-scheme matches which THEMES array the theme is listed in — this
// catches config typos where a dark theme was accidentally added to
// THEMES.light or vice versa before they render wrong in a real browser.
//
// For the meta theme-color itself, we read one variable per theme:
//   - Light themes default to `--color-primary` (the theme's brand accent)
//   - Dark themes default to `--color-base-100` (the theme's main surface)
//   - Any theme in COLOR_KEY_OVERRIDES uses the override variable instead.
// Reference: docs/implementations/THEME_DARK_MODE.md PWA Meta Theme-Color
// section. The light->primary rule is the reference default; we borrow
// the per-theme override mechanism from canva-grid to handle monochrome
// themes whose primary is too dark to read as a status bar.
const collected = {};
const allThemes = [...THEMES.light, ...THEMES.dark];
const expectedDark = new Map([
    ...THEMES.light.map((t) => [t.id, false]),
    ...THEMES.dark.map((t) => [t.id, true]),
]);

for (const theme of allThemes) {
    let themeObj;
    try {
        const mod = await import(`daisyui/theme/${theme.id}/object.js`);
        themeObj = mod.default || mod;
    } catch (err) {
        console.error(
            `[generate-theme-meta] Could not import daisyui/theme/${theme.id}/object.js`
        );
        console.error(`  ${err.message}`);
        console.error(
            `  Check that "${theme.id}" is a real DaisyUI theme and that daisyui is installed.`
        );
        process.exit(1);
    }

    const isDarkExpected = expectedDark.get(theme.id);
    const isDarkActual = themeObj['color-scheme'] === 'dark';
    if (isDarkExpected !== isDarkActual) {
        console.error(
            `[generate-theme-meta] theme "${theme.id}" is listed under THEMES.${isDarkExpected ? 'dark' : 'light'} but DaisyUI reports color-scheme="${themeObj['color-scheme']}"`
        );
        console.error(
            `  Move "${theme.id}" to the correct array in scripts/theme-config.js.`
        );
        process.exit(1);
    }

    // Which CSS variable to read for this theme's meta color.
    // Resolution order: explicit override -> mode default.
    const defaultKey = isDarkActual ? '--color-base-100' : '--color-primary';
    const colorKey = COLOR_KEY_OVERRIDES[theme.id] || defaultKey;
    const oklch = themeObj[colorKey];
    if (!oklch) {
        console.error(
            `[generate-theme-meta] theme "${theme.id}" is missing ${colorKey}`
        );
        console.error(
            `  Check COLOR_KEY_OVERRIDES or DaisyUI's theme object for this id.`
        );
        process.exit(1);
    }

    const hex = oklchToHex(oklch);
    if (!hex) {
        console.error(
            `[generate-theme-meta] Failed to convert ${colorKey}="${oklch}" for theme "${theme.id}"`
        );
        process.exit(1);
    }

    collected[theme.id] = { isDark: isDarkActual, metaColor: hex, colorKey };
}

// --- Output 1: dashboard/js/generated/themeMeta.js (full rewrite) ---
// Human-readable generated module. Header says DO NOT EDIT BY HAND.
const generatedDir = resolve(repoRoot, 'dashboard', 'js', 'generated');
mkdirSync(generatedDir, { recursive: true });
const generatedPath = resolve(generatedDir, 'themeMeta.js');

const metaColors = Object.fromEntries(
    Object.entries(collected).map(([id, { metaColor }]) => [id, metaColor])
);
const isDarkMap = Object.fromEntries(
    Object.entries(collected).map(([id, { isDark }]) => [id, isDark])
);
const themeNames = Object.keys(collected);

const generatedHeader = `// AUTO-GENERATED FILE — DO NOT EDIT BY HAND
// Source: scripts/generate-theme-meta.mjs (reads scripts/theme-config.js)
// Regenerate with: node scripts/generate-theme-meta.mjs (or npm run generate-theme-meta)
// Regenerated automatically during \`npm run build\` / \`npm run dev\` prebuild.
//
// Each key is a DaisyUI theme registered in scripts/theme-config.js. The
// metaColor is the theme's --color-base-100 converted from oklch() to hex,
// used as the PWA status bar color via <meta name="theme-color">.
`;

const generatedBody = `
export const META_COLORS = ${JSON.stringify(metaColors, null, 2)};

export const IS_DARK = ${JSON.stringify(isDarkMap, null, 2)};

export const THEME_NAMES = ${JSON.stringify(themeNames, null, 2)};
`;

// Only write when the content actually changes — matches the rewriteBetweenMarkers
// idempotence pattern below so every `npm run dev` doesn't bump mtimes and
// trigger Vite HMR reloads for a no-op regeneration.
const generatedContent = generatedHeader + generatedBody;
let generatedChanged = false;
try {
    generatedChanged = readFileSync(generatedPath, 'utf8') !== generatedContent;
} catch {
    // File doesn't exist yet — first run.
    generatedChanged = true;
}
if (generatedChanged) {
    writeFileSync(generatedPath, generatedContent);
}

// --- Marker-based rewrite helper ---
// Finds the marker pair in a file and replaces the content between them with
// newBody (preserving the markers themselves). Fails with a clear error if
// either marker is missing — catches accidental deletion during refactors.
function rewriteBetweenMarkers(filePath, beginMarker, endMarker, newBody) {
    const content = readFileSync(filePath, 'utf8');
    const beginIdx = content.indexOf(beginMarker);
    if (beginIdx === -1) {
        throw new Error(
            `Missing begin marker "${beginMarker}" in ${filePath}. Did someone delete the marker by hand?`
        );
    }
    const blockStart = beginIdx + beginMarker.length;
    const endIdx = content.indexOf(endMarker, blockStart);
    if (endIdx === -1) {
        throw new Error(
            `Missing end marker "${endMarker}" in ${filePath}. Did someone delete the marker by hand?`
        );
    }
    const next = content.slice(0, blockStart) + '\n' + newBody + '\n' + content.slice(endIdx);
    if (next === content) {
        // Idempotent no-op — the block was already up to date. Common case
        // during incremental rebuilds; stay quiet.
        return false;
    }
    writeFileSync(filePath, next);
    return true;
}

// --- Output 2: dashboard/js/themes.js LIGHT_THEMES / DARK_THEMES block ---
// Re-emit the catalog as object literals with id/name/description preserved
// from theme-config.js, plus the default constants. Indentation matches the
// surrounding code (4 spaces).
function fmtThemeArray(name, themes) {
    const lines = themes.map(
        (t) =>
            `    { id: ${JSON.stringify(t.id)}, name: ${JSON.stringify(t.name)}, description: ${JSON.stringify(t.description)} },`
    );
    return `export const ${name} = [\n${lines.join('\n')}\n];`;
}

const themesJsBody = [
    fmtThemeArray('LIGHT_THEMES', THEMES.light),
    '',
    fmtThemeArray('DARK_THEMES', THEMES.dark),
    '',
    `export const DEFAULT_LIGHT_THEME = ${JSON.stringify(DEFAULT_LIGHT_THEME)};`,
    `export const DEFAULT_DARK_THEME = ${JSON.stringify(DEFAULT_DARK_THEME)};`,
].join('\n');

const themesJsChanged = rewriteBetweenMarkers(
    resolve(repoRoot, 'dashboard', 'js', 'themes.js'),
    '/* BEGIN GENERATED: theme-catalog */',
    '/* END GENERATED: theme-catalog */',
    themesJsBody
);

// --- Output 3: dashboard/styles.css @plugin "daisyui" block ---
// Build the `themes: lofi --default, nord, ..., black --prefersdark, ...`
// comma list with the default markers on the DEFAULT_LIGHT_THEME and
// DEFAULT_DARK_THEME entries.
const pluginThemes = allThemes
    .map((t) => {
        if (t.id === DEFAULT_LIGHT_THEME) return `${t.id} --default`;
        if (t.id === DEFAULT_DARK_THEME) return `${t.id} --prefersdark`;
        return t.id;
    })
    .join(', ');

const stylesCssBody = `@plugin "daisyui" {
  themes: ${pluginThemes};
}`;

const stylesCssChanged = rewriteBetweenMarkers(
    resolve(repoRoot, 'dashboard', 'styles.css'),
    '/* BEGIN GENERATED: daisyui-plugin */',
    '/* END GENERATED: daisyui-plugin */',
    stylesCssBody
);

// --- Output 4: dashboard/index.html flash prevention block ---
// Inline script can't import ES modules, so we emit JS literals it can
// execute directly. Indentation matches the surrounding IIFE (6 spaces).
const indent = '      ';
const lightIdArray = `[${THEMES.light.map((t) => `'${t.id}'`).join(', ')}]`;
const darkIdArray = `[${THEMES.dark.map((t) => `'${t.id}'`).join(', ')}]`;
const metaEntries = Object.entries(metaColors)
    .map(([id, hex]) => `${indent}  '${id}': '${hex}'`)
    .join(',\n');

const indexHtmlBody = [
    `${indent}var LIGHT_THEMES = ${lightIdArray};`,
    `${indent}var DARK_THEMES = ${darkIdArray};`,
    `${indent}var DEFAULT_LIGHT_THEME = '${DEFAULT_LIGHT_THEME}';`,
    `${indent}var DEFAULT_DARK_THEME = '${DEFAULT_DARK_THEME}';`,
    `${indent}var META = {`,
    metaEntries,
    `${indent}};`,
].join('\n');

const indexHtmlChanged = rewriteBetweenMarkers(
    resolve(repoRoot, 'dashboard', 'index.html'),
    '/* BEGIN GENERATED: flash-prevention-meta */',
    '/* END GENERATED: flash-prevention-meta */',
    indexHtmlBody
);

// --- Human-friendly stdout ---
// Report each theme with its mode, the CSS variable we read, and the hex
// result. The variable name tells reviewers at a glance whether a theme
// is using the default (primary for light, base-100 for dark) or an
// override from COLOR_KEY_OVERRIDES.
for (const [id, { isDark, metaColor, colorKey }] of Object.entries(collected)) {
    const keyDisplay = colorKey.replace('--color-', '');
    console.log(
        `  ${id.padEnd(16)} ${isDark ? 'dark ' : 'light'}  ${metaColor}   ${keyDisplay}`
    );
}
console.log(
    `[generate-theme-meta] ${generatedChanged ? 'updated' : 'unchanged'}   dashboard/js/generated/themeMeta.js`
);
console.log(
    `[generate-theme-meta] ${themesJsChanged ? 'updated' : 'unchanged'}   dashboard/js/themes.js`
);
console.log(
    `[generate-theme-meta] ${stylesCssChanged ? 'updated' : 'unchanged'}   dashboard/styles.css`
);
console.log(
    `[generate-theme-meta] ${indexHtmlChanged ? 'updated' : 'unchanged'}   dashboard/index.html`
);
