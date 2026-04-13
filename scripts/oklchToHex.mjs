/**
 * Convert DaisyUI's oklch() color strings to hex for PWA <meta name="theme-color">.
 *
 * Requirement: `scripts/generate-theme-meta.mjs` needs to convert each
 *   registered theme's `--color-base-100` (or another override key) from
 *   the oklch() form DaisyUI ships to a 6-digit hex value that the HTML
 *   meta tag, the inline flash prevention script, and the generated
 *   `themeMeta.js` module can all use. The browser parses color-mix() and
 *   oklch() at runtime, but the meta theme-color attribute wants a plain
 *   hex.
 * Approach: Pure function in a standalone module. Pipeline is the standard
 *   oklch -> oklab -> LMS -> linear sRGB -> gamma-corrected sRGB -> hex,
 *   from Bjorn Ottosson's oklab post. No external color library —
 *   ~30 lines of self-contained math. Exported so the generator can import
 *   it and the test suite can exercise every edge case independently.
 * Alternatives:
 *   - Inline the math in generate-theme-meta.mjs: Rejected — not unit
 *     testable without importing the whole generator, which has side
 *     effects (writes files). The previous version did this and we had
 *     zero test coverage on the color math.
 *   - Pull in a color library (culori, colorjs.io): Rejected — 30 lines of
 *     self-contained math is cheaper than a dependency and matches what
 *     every sibling project in the devmade-ai org does (canva-grid,
 *     glow-props).
 *   - Runtime conversion via getComputedStyle in the browser: Rejected —
 *     requires a browser/DOM environment for the build-time generator,
 *     and the inline flash prevention script can't import modules anyway,
 *     so precomputing at build time is strictly better.
 *
 * Ported from canva-grid's scripts/oklchToHex.mjs with the same edge-case
 * semantics. The key improvement over repo-tor's previous inlined version
 * is explicit percentage-vs-decimal detection via the `(%)?` regex capture
 * group. The old version used `if (L > 1) L /= 100` as a heuristic, which
 * fails at the L=1 boundary: `oklch(1 0 0)` (decimal, meaning white) and
 * `oklch(1% 0 0)` (percent, meaning near-black) would both keep L=1 and
 * produce white — wrong for the percent form. DaisyUI always uses percent
 * form so this never triggered in practice, but the fix is free and
 * matches the CSS Color Level 4 spec.
 *
 * See: https://bottosson.github.io/posts/oklab/
 *      docs/implementations/THEME_DARK_MODE.md (PWA Meta Theme-Color)
 */

/**
 * Parse an oklch() color string and return the 6-digit hex equivalent.
 *
 * Accepts:
 *   - Percentage lightness:  oklch(50% 0.1 200)  (L ∈ [0%, 100%])
 *   - Decimal lightness:     oklch(0.5 0.1 200)  (L ∈ [0, 1])
 *   - Omitted hue (valid when chroma is 0, rarely used):  oklch(50% 0)
 *   - Alpha channel (ignored — meta theme-color doesn't support alpha):
 *       oklch(50% 0.1 200 / 0.5)
 *       oklch(50% 0.1 200 / 80%)
 *   - Extra whitespace inside the parentheses.
 *
 * Returns `null` for input that doesn't match the oklch() form, so callers
 * can fail fast with a clear error instead of silently producing garbage.
 *
 * Out-of-gamut colors are clamped to the [0, 255] range per sRGB channel
 * so we always return a valid 6-digit hex — never NaN or overflow.
 *
 * @param {string} oklchStr — e.g. "oklch(59.435% 0.077 254.027)"
 * @returns {string | null} e.g. "#5e81ac" or null on parse failure
 */
export function oklchToHex(oklchStr) {
    // Regex breakdown:
    //   oklch\(\s*             opening "oklch("
    //   ([\d.]+)               L value, captured (percent sign or decimal form)
    //   (%?)                   optional percent sign, captured separately so we
    //                          can distinguish "1%" (= 0.01) from "1" (= 1.0).
    //                          This is the L=1 edge case the old heuristic
    //                          `if (L > 1) L /= 100` got wrong.
    //   \s+([\d.]+)             C value
    //   (?:\s+([\d.]+))?        optional H value (chroma-0 colors may omit hue)
    //   \s*                     optional trailing whitespace
    //   (?:\/\s*[\d.]+%?\s*)?   optional alpha channel, ignored
    //   \)                      closing paren
    const match = oklchStr.match(
        /oklch\(\s*([\d.]+)(%?)\s+([\d.]+)(?:\s+([\d.]+))?\s*(?:\/\s*[\d.]+%?\s*)?\)/
    );
    if (!match) return null;

    let L = parseFloat(match[1]);
    const isPercent = match[2] === '%';
    const C = parseFloat(match[3]);
    const H = match[4] !== undefined ? parseFloat(match[4]) : 0;

    // Normalize L to the [0, 1] range that the oklab conversion expects.
    // The explicit percent check is what makes this module correct at the
    // L=1 boundary. The previous inlined version used `if (L > 1) L /= 100`
    // which is wrong when L is exactly 1 from a `oklch(1 0 0)` literal
    // (which should be white, not divided).
    if (isPercent) L = L / 100;

    // oklch -> oklab (polar to rectangular)
    const hRad = (H * Math.PI) / 180;
    const a = C * Math.cos(hRad);
    const b = C * Math.sin(hRad);

    // oklab -> LMS (cube roots of the oklab matrix, then cube to recover)
    const lNonlinear = L + 0.3963377774 * a + 0.2158037573 * b;
    const mNonlinear = L - 0.1055613458 * a - 0.0638541728 * b;
    const sNonlinear = L - 0.0894841775 * a - 1.2914855480 * b;
    const l = lNonlinear * lNonlinear * lNonlinear;
    const m = mNonlinear * mNonlinear * mNonlinear;
    const s = sNonlinear * sNonlinear * sNonlinear;

    // LMS -> linear sRGB
    const lr = +4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s;
    const lg = -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s;
    const lb = -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s;

    // Gamma correction (linear sRGB -> gamma-encoded sRGB per the sRGB spec)
    function gammaCorrect(c) {
        if (c <= 0.0031308) return 12.92 * c;
        return 1.055 * Math.pow(c, 1 / 2.4) - 0.055;
    }

    // Clamp each channel to [0, 1] then scale to [0, 255] and convert to a
    // two-digit hex byte. Out-of-gamut values get clamped (valid behavior
    // per CSS Color Level 4 — the result is an approximation, not an error).
    function toHexByte(c) {
        const clamped = Math.max(0, Math.min(1, gammaCorrect(c)));
        const byte = Math.round(clamped * 255);
        return byte.toString(16).padStart(2, '0');
    }

    return `#${toHexByte(lr)}${toHexByte(lg)}${toHexByte(lb)}`;
}
