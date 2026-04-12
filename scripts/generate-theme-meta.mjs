/**
 * Generate PWA meta theme-color values from DaisyUI's own theme definitions.
 *
 * Requirement: Keep the PWA status bar color, the <meta name="theme-color">
 *   defaults in index.html, and the JS theme constants in sync with DaisyUI's
 *   current theme palette. oklch() values in CSS are not directly usable in
 *   <meta name="theme-color">, so we need hex conversions — and we want them
 *   to track DaisyUI updates automatically rather than being maintained by
 *   hand.
 * Approach: Import each registered theme's `object.js` from the installed
 *   daisyui package, convert the --color-base-100 value from oklch() to hex
 *   (the conversion math is inlined here so we don't pull in a color
 *   library — ~30 lines total), and write a generated JS module at
 *   `dashboard/js/generated/themeMeta.js` that `dashboard/js/themes.js`
 *   imports.
 * Alternatives:
 *   - Manually edit hex values in index.html + themes.js every time a theme
 *     is added or DaisyUI updates: Rejected — guaranteed to drift silently.
 *     Once drift happens, the PWA status bar color flashes the wrong color
 *     on first paint and nobody notices until a user complains.
 *   - Pull in a color library (culori, colorjs.io): Rejected — 30 lines of
 *     inlined oklch->hex math is self-contained and has zero dependencies.
 *   - Generate a full TypeScript definition file: Rejected — this project
 *     is plain JS; a .js export is enough.
 *
 * See: docs/implementations/THEME_DARK_MODE.md (PWA Meta Theme-Color section)
 *
 * Run as: node scripts/generate-theme-meta.mjs
 * Called by: npm run build (prebuild step), or manually after adding themes.
 */

import { writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(__dirname, '..');

// --- Registered themes ---
// MUST match the `@plugin "daisyui" { themes: ... }` list in dashboard/styles.css
// AND the LIGHT_THEMES / DARK_THEMES arrays in dashboard/js/themes.js.
// Adding a theme here means:
//   1. Add it to styles.css @plugin config
//   2. Add it to themes.js LIGHT_THEMES or DARK_THEMES
//   3. Add it here
//   4. Rerun `node scripts/generate-theme-meta.mjs`
const REGISTERED_THEMES = ['lofi', 'black'];

// --- oklch() -> hex conversion ---
// Self-contained implementation. No dependencies. Validated against DaisyUI's
// own values during development: lofi base-100 oklch(100% 0 0) -> #ffffff,
// black base-100 oklch(0% 0 0) -> #000000.
//
// Pipeline: parse oklch() -> oklab -> linear sRGB (via LMS) -> gamma-corrected
// sRGB -> hex. Reference: https://bottosson.github.io/posts/oklab/
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

// --- Collect theme metadata ---
// Each registered theme's `object.js` exports a plain object of CSS variables
// with a `color-scheme` key ('light' or 'dark') that tells us which mode the
// theme targets. We use --color-base-100 as the PWA status bar color because
// it's the theme's "main surface" — the color that dominates the first paint
// and best matches the visual identity from the user's perspective.
const collected = {};
for (const themeName of REGISTERED_THEMES) {
    let themeObj;
    try {
        const mod = await import(`daisyui/theme/${themeName}/object.js`);
        themeObj = mod.default || mod;
    } catch (err) {
        console.error(
            `[generate-theme-meta] Could not import daisyui/theme/${themeName}/object.js`
        );
        console.error(`  ${err.message}`);
        console.error(
            `  Check that "${themeName}" is a real DaisyUI theme and that daisyui is installed.`
        );
        process.exit(1);
    }

    const isDark = themeObj['color-scheme'] === 'dark';
    const base100 = themeObj['--color-base-100'];
    const hex = oklchToHex(base100 || '');
    if (!hex) {
        console.error(
            `[generate-theme-meta] Failed to convert "${base100}" for theme "${themeName}"`
        );
        process.exit(1);
    }

    collected[themeName] = { isDark, metaColor: hex };
}

// --- Write the generated module ---
// Plain ES module with three named exports: META_COLORS, IS_DARK, THEME_NAMES.
// Kept small and self-describing so humans can read it if something looks off.
const outDir = resolve(repoRoot, 'dashboard', 'js', 'generated');
mkdirSync(outDir, { recursive: true });
const outPath = resolve(outDir, 'themeMeta.js');

const header = `// AUTO-GENERATED FILE — DO NOT EDIT BY HAND
// Source: scripts/generate-theme-meta.mjs
// Regenerate with: node scripts/generate-theme-meta.mjs
// Regenerated automatically during \`npm run build\` (prebuild step).
//
// Each key is a DaisyUI theme registered in dashboard/styles.css
// (\`@plugin "daisyui"\`) and dashboard/js/themes.js. The metaColor is the
// theme's --color-base-100 converted from oklch() to hex, used as the PWA
// status bar color via <meta name="theme-color">.
`;

const metaColors = Object.fromEntries(
    Object.entries(collected).map(([name, { metaColor }]) => [name, metaColor])
);
const isDarkMap = Object.fromEntries(
    Object.entries(collected).map(([name, { isDark }]) => [name, isDark])
);
const themeNames = Object.keys(collected);

const body = `
export const META_COLORS = ${JSON.stringify(metaColors, null, 2)};

export const IS_DARK = ${JSON.stringify(isDarkMap, null, 2)};

export const THEME_NAMES = ${JSON.stringify(themeNames, null, 2)};
`;

writeFileSync(outPath, header + body);

// --- Human-friendly stdout ---
console.log('[generate-theme-meta] wrote', outPath);
for (const [name, { isDark, metaColor }] of Object.entries(collected)) {
    console.log(`  ${name.padEnd(16)} ${isDark ? 'dark' : 'light'}  ${metaColor}`);
}
