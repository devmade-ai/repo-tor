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
// Self-contained. No dependency on a color library.
//
// Pipeline: parse oklch() -> oklab -> linear sRGB (via LMS) -> gamma-corrected
// sRGB -> hex. Reference: https://bottosson.github.io/posts/oklab/
//
// Validated against DaisyUI's own values during development:
//   lofi   base-100 oklch(100% 0 0) -> #ffffff
//   black  base-100 oklch(0% 0 0)   -> #000000
//   nord   base-100 oklch(95.127% 0.007 260.731) -> close to Nord's snow-storm palette
function oklchToHex(oklchStr) {
    const match = oklchStr.match(/oklch\(\s*([\d.]+)%?\s+([\d.]+)\s+([\d.]+)\s*\)/);
    if (!match) return null;
    let [, L, C, H] = match.map(Number);
    if (L > 1) L /= 100; // normalize percentage form

    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);

    // oklab -> linear sRGB via LMS
    const l_ = L + 0.3963377774 * a + 0.2158037573 * b;
    const m_ = L - 0.1055613458 * a - 0.0638541728 * b;
    const s_ = L - 0.0894841775 * a - 1.2914855480 * b;
    const lCube = l_ ** 3;
    const mCube = m_ ** 3;
    const sCube = s_ ** 3;
    const r = 4.0767416621 * lCube - 3.3077115913 * mCube + 0.2309699292 * sCube;
    const g = -1.2684380046 * lCube + 2.6097574011 * mCube - 0.3413193965 * sCube;
    const bV = -0.0041960863 * lCube - 0.7034186147 * mCube + 1.7076147010 * sCube;

    // Gamma-corrected sRGB -> [0, 255]
    const gamma = (v) =>
        Math.max(
            0,
            Math.min(
                255,
                Math.round(
                    (v <= 0.0031308 ? 12.92 * v : 1.055 * v ** (1 / 2.4) - 0.055) * 255
                )
            )
        );
    return `#${[r, g, bV]
        .map(gamma)
        .map((v) => v.toString(16).padStart(2, '0'))
        .join('')}`;
}

// --- Collect theme metadata from DaisyUI ---
// Each registered theme's `object.js` exports a plain object of CSS variables
// with a `color-scheme` key ('light' or 'dark'). We verify the color-scheme
// matches which array the theme is in (catches config errors where a dark
// theme was accidentally added to THEMES.light or vice versa), then convert
// --color-base-100 from oklch() to hex as the PWA status bar color. We use
// base-100 (the theme's main surface) for both light and dark themes because
// the status bar should blend with the main surface — deliberately diverging
// from the reference's "use --color-primary for light" rule because lofi's
// primary is nearly black and would flash a near-black status bar on an
// otherwise-white light-mode app. See docs/implementations/THEME_DARK_MODE.md
// migration notes for the rationale.
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

    const base100 = themeObj['--color-base-100'];
    const hex = oklchToHex(base100 || '');
    if (!hex) {
        console.error(
            `[generate-theme-meta] Failed to convert "${base100}" for theme "${theme.id}"`
        );
        process.exit(1);
    }

    collected[theme.id] = { isDark: isDarkActual, metaColor: hex };
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
for (const [id, { isDark, metaColor }] of Object.entries(collected)) {
    console.log(`  ${id.padEnd(16)} ${isDark ? 'dark ' : 'light'}  ${metaColor}`);
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
