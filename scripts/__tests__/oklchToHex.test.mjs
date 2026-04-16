// Unit tests for scripts/oklchToHex.mjs.
//
// Requirement: The oklch -> hex color math is load-bearing for PWA meta
//   theme-color values. A regression here produces wrong status bar
//   colors on mobile that are invisible in pixel-diff CI (and easy to
//   miss in code review). Tests pin the behavior at every edge case the
//   CSS Color Level 4 spec calls out plus the DaisyUI fixtures we actually
//   ship.
// Approach: Node's built-in `node:test` runner and `node:assert/strict`.
//   No Jest, no dependency. Tests are grouped by concern (parsing, known
//   reference values, edge cases, robustness). Fixtures for known DaisyUI
//   theme values come from the actual per-theme object.js files shipped
//   inside node_modules/daisyui/theme/ with daisyui@5, so a DaisyUI version
//   bump that changes these would fail loudly at test time instead of
//   silently producing different status bar colors.
// Alternatives:
//   - Jest: Rejected — this project has no test framework configured, and
//     adding Jest for one module is disproportionate. node:test has been
//     stable since Node 20; we're on Node 22.
//   - Snapshot tests: Rejected — hex values are short, exact-match
//     assertions are clearer and diffs are more readable.
//
// Ported from canva-grid's scripts/__tests__/oklchToHex.test.mjs with the
// assertion API swapped for node:assert. canva-grid uses Jest; we use
// node:test. Coverage and semantics are equivalent.
//
// Run as: npm test
//
// NOTE: This header uses `//` line comments instead of a /* block */
// comment block deliberately, because we have a hard rule against writing
// asterisk-slash sequences inside block comments (CLAUDE.md Frontend
// checklist, docs/AI_MISTAKES.md 2026-04-12 entry). Mentioning filesystem
// paths that contain a star (like the DaisyUI theme directory layout)
// inside a block comment triggers the same CSS-minifier bug that cost us
// half the custom CSS classes earlier in this session. Line comments have
// no such issue.

import { describe, test } from 'node:test';
import { strict as assert } from 'node:assert';
import { oklchToHex } from '../oklchToHex.mjs';

describe('oklchToHex', () => {
    // --- Known reference values ---
    // Pinned against the CSS Color Level 4 spec and browser implementations.

    describe('basic boundary values', () => {
        test('pure black — oklch(0% 0 0)', () => {
            assert.equal(oklchToHex('oklch(0% 0 0)'), '#000000');
        });

        test('pure white — oklch(100% 0 0)', () => {
            assert.equal(oklchToHex('oklch(100% 0 0)'), '#ffffff');
        });

        test('mid gray — oklch(50% 0 0)', () => {
            const hex = oklchToHex('oklch(50% 0 0)');
            // oklch 50% lightness maps to ~#3b3b3b in sRGB (not #808080, which
            // is ~70% oklch — oklch is perceptually uniform, sRGB is not).
            assert.match(hex, /^#[0-9a-f]{6}$/);
            // Verify it's a neutral gray (R=G=B).
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            assert.equal(r, g);
            assert.equal(g, b);
        });
    });

    // --- Input form parsing ---

    describe('parsing forms', () => {
        test('achromatic colors — chroma=0 means hue is irrelevant', () => {
            const h0 = oklchToHex('oklch(70% 0 0)');
            const h180 = oklchToHex('oklch(70% 0 180)');
            const h359 = oklchToHex('oklch(70% 0 359)');
            // All should produce the same gray regardless of hue.
            assert.equal(h0, h180);
            assert.equal(h0, h359);
        });

        test('optional hue — oklch(50% 0) with only L and C', () => {
            const result = oklchToHex('oklch(50% 0)');
            assert.notEqual(result, null);
            // Should equal the same as explicit hue=0.
            assert.equal(result, oklchToHex('oklch(50% 0 0)'));
        });

        test('alpha channel is ignored — oklch(50% 0.1 250 / 0.5)', () => {
            const withAlpha = oklchToHex('oklch(50% 0.1 250 / 0.5)');
            const without = oklchToHex('oklch(50% 0.1 250)');
            assert.notEqual(withAlpha, null);
            assert.equal(withAlpha, without);
        });

        test('alpha as percentage — oklch(50% 0.1 250 / 80%)', () => {
            const result = oklchToHex('oklch(50% 0.1 250 / 80%)');
            assert.notEqual(result, null);
            assert.equal(result, oklchToHex('oklch(50% 0.1 250)'));
        });

        test('handles extra whitespace', () => {
            const normal = oklchToHex('oklch(50% 0.1 200)');
            const spaced = oklchToHex('oklch(  50%  0.1  200  )');
            assert.equal(spaced, normal);
        });
    });

    // --- L=1 percentage-vs-decimal edge case ---
    // This is the specific bug the previous inlined version had. The old
    // heuristic `if (L > 1) L /= 100` divides by 100 for out-of-range
    // decimal inputs but fails at the L=1 boundary because it can't tell
    // "oklch(1 0 0)" (decimal, meaning white) from "oklch(1% 0 0)" (percent,
    // meaning near-black). The new version captures the percent character
    // explicitly.

    describe('L=1 percentage-vs-decimal boundary', () => {
        test('decimal L without % — oklch(0.5 0 0) treated as 0.5 not 50%', () => {
            const decimal = oklchToHex('oklch(0.5 0 0)');
            const percent = oklchToHex('oklch(50% 0 0)');
            // Both should produce the same mid-gray.
            assert.equal(decimal, percent);
        });

        test('decimal L=1 without % — oklch(1 0 0) is white, not near-black', () => {
            assert.equal(oklchToHex('oklch(1 0 0)'), '#ffffff');
        });

        test('percentage L=1% — oklch(1% 0 0) is near-black, not white', () => {
            const hex = oklchToHex('oklch(1% 0 0)');
            assert.match(hex, /^#[0-9a-f]{6}$/);
            // L=1% is nearly black — R channel should be very low.
            const r = parseInt(hex.slice(1, 3), 16);
            assert.ok(r < 10, `expected R < 10, got ${r} (hex=${hex})`);
        });

        test('decimal L=0 without % — oklch(0 0 0) is black', () => {
            assert.equal(oklchToHex('oklch(0 0 0)'), '#000000');
        });
    });

    // --- DaisyUI fixtures ---
    // These pin the color math against the exact values daisyui@5 ships in
    // its theme/<id>/object.js files. If DaisyUI bumps its palette, we want
    // the test to fail loudly so we can review the change before it silently
    // affects users' status bar colors.

    describe('DaisyUI fixtures', () => {
        test('nord primary — oklch(59.435% 0.077 254.027) -> #5e81ac', () => {
            assert.equal(oklchToHex('oklch(59.435% 0.077 254.027)'), '#5e81ac');
        });

        test('autumn primary — oklch(40.723% 0.161 17.53) -> #8c0327', () => {
            assert.equal(oklchToHex('oklch(40.723% 0.161 17.53)'), '#8c0327');
        });

        test('black base-100 — oklch(0% 0 0) -> #000000', () => {
            assert.equal(oklchToHex('oklch(0% 0 0)'), '#000000');
        });

        test('dracula base-100 — oklch(28.822% 0.022 277.508) -> #282a36', () => {
            assert.equal(oklchToHex('oklch(28.822% 0.022 277.508)'), '#282a36');
        });

        test('lofi base-300 — oklch(94% 0 0) is light gray (canva-grid override value)', () => {
            const hex = oklchToHex('oklch(94% 0 0)');
            assert.match(hex, /^#[0-9a-f]{6}$/);
            // Should be light gray — each channel near 0xea.
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            assert.equal(r, g);
            assert.equal(g, b);
            assert.ok(r > 0xd0 && r < 0xf0, `expected light gray, got ${hex}`);
        });

        test('returns valid 6-digit hex for all chromatic DaisyUI sample values', () => {
            // Sampled from various DaisyUI themes — whichever succeed, all
            // should at least parse and produce valid hex, not throw or
            // return null.
            const samples = [
                'oklch(76.662% 0.135 153.45)',    // emerald primary
                'oklch(85% 0.138 181.071)',        // cupcake primary
                'oklch(90% 0.063 306.703)',        // pastel primary
                'oklch(75.351% 0.138 232.661)',    // night primary
                'oklch(15% 0.09 281.288)',         // synthwave base-100
                'oklch(71.996% 0.123 62.756)',     // coffee primary
            ];
            for (const oklch of samples) {
                const hex = oklchToHex(oklch);
                assert.match(hex, /^#[0-9a-f]{6}$/, `failed on ${oklch}`);
            }
        });
    });

    // --- Robustness ---

    describe('robustness', () => {
        test('output is always lowercase hex', () => {
            const hex = oklchToHex('oklch(59.435% 0.077 254.027)');
            assert.equal(hex, hex.toLowerCase());
        });

        test('clamps out-of-gamut values instead of producing invalid hex', () => {
            // Extremely saturated color — exceeds sRGB gamut.
            // Key assertion: output is still a valid 6-digit hex (clamped,
            // not NaN or overflow).
            const hex = oklchToHex('oklch(50% 0.5 29)');
            assert.match(hex, /^#[0-9a-f]{6}$/);
            // Each channel must be in [0x00, 0xff] — no overflow from clamping.
            const r = parseInt(hex.slice(1, 3), 16);
            const g = parseInt(hex.slice(3, 5), 16);
            const b = parseInt(hex.slice(5, 7), 16);
            assert.ok(r >= 0 && r <= 255);
            assert.ok(g >= 0 && g <= 255);
            assert.ok(b >= 0 && b <= 255);
        });

        test('returns null for non-oklch input', () => {
            assert.equal(oklchToHex('rgb(255, 0, 0)'), null);
            assert.equal(oklchToHex('not a color'), null);
            assert.equal(oklchToHex(''), null);
            assert.equal(oklchToHex('#ff0000'), null);
            assert.equal(oklchToHex('hsl(0, 100%, 50%)'), null);
        });
    });
});
