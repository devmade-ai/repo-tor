// Static source-analysis smoke test for the DaisyUI v5 component-class migration.
//
// Requirement: catch regressions that would let a custom class silently shadow
//   a DaisyUI @layer components rule (the exact trap the 2026-04-13 10-phase
//   sweep fixed). The full browser-runtime test lives in dashboard/e2e and
//   runs under Playwright in CI; this file is a source-level tripwire that
//   runs in every local test invocation without needing a browser binary.
//
// Approach: read each migrated source file and assert that:
//   1. The DaisyUI class name is still present at its expected call site.
//   2. The custom class name that was removed in the migration is NOT
//      present anywhere else in the source tree (catching re-introductions).
//   3. The built CSS still ships the DaisyUI component classes we use.
//
// Alternatives considered:
//   - Rendering each component via react-dom/server renderToString: Rejected —
//     requires JSX transpilation at test time (adds a tsx/esbuild dep), and
//     doesn't cover components that depend on React Context (AppContext,
//     which needs a provider + mock data). The browser-runtime Playwright
//     spec covers the composition / interaction layer; this file covers
//     the source-level invariants those tests also check but can catch at
//     zero cost in unit time.
//   - JSDOM full app bootstrap: Rejected — slow, fragile, and duplicates
//     Playwright's E2E coverage without the benefit of real browser
//     rendering or real CSS evaluation.
//
// When to update: add a new assertion here every time a component is
// migrated to (or away from) a DaisyUI component class, matching the
// docs/DAISYUI_V5_NOTES.md "Project conventions we use" section.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');

function read(path) {
    const full = join(REPO_ROOT, path);
    if (!existsSync(full)) throw new Error(`Expected file not found: ${path}`);
    return readFileSync(full, 'utf8');
}

// Load the built CSS bundle once. Some assertions verify that DaisyUI
// classes are actually shipped (content-based tree-shaking by Tailwind v4).
// If `dist/` doesn't exist the build hasn't run yet — skip those checks
// rather than fail, so `npm test` works on a fresh clone before `npm run build`.
function loadBuiltCss() {
    const distDir = join(REPO_ROOT, 'dist', 'assets');
    if (!existsSync(distDir)) return null;
    const { readdirSync } = require('node:fs');
    // Node 22 needs dynamic require or sync fs — use readdirSync via import
    return null; // filled in below after we import readdirSync
}

// Top-level: eagerly load the CSS bundle using top-level await.
let builtCss = null;
try {
    const fs = await import('node:fs');
    const distDir = join(REPO_ROOT, 'dist', 'assets');
    if (fs.existsSync(distDir)) {
        const cssFile = fs.readdirSync(distDir).find(f => f.startsWith('index-') && f.endsWith('.css'));
        if (cssFile) {
            builtCss = fs.readFileSync(join(distDir, cssFile), 'utf8');
        }
    }
} catch {
    builtCss = null;
}

// ----- Phase 1: Modal (QuickGuide + InstallInstructionsModal) -----

test('Phase 1 — QuickGuide uses DaisyUI modal component', () => {
    const src = read('dashboard/js/components/QuickGuide.jsx');
    assert.match(src, /className="modal modal-open"/, 'QuickGuide outer needs `modal modal-open` classes');
    assert.match(src, /className="modal-box/, 'QuickGuide inner needs `modal-box`');
    assert.match(src, /className="modal-backdrop"/, 'QuickGuide needs a DaisyUI modal-backdrop sibling');
    assert.match(src, /className="modal-action/, 'QuickGuide footer needs `modal-action`');
    // Close button should use the DaisyUI btn pattern.
    assert.match(src, /btn btn-sm btn-circle btn-ghost/, 'QuickGuide close button should be `btn btn-sm btn-circle btn-ghost`');
    // Must not re-introduce the removed .quick-guide-* custom classes.
    assert.doesNotMatch(src, /quick-guide-overlay|quick-guide-modal/, 'QuickGuide must not use removed .quick-guide-* custom classes');
});

test('Phase 1 — InstallInstructionsModal uses DaisyUI modal + alert-warning', () => {
    const src = read('dashboard/js/components/InstallInstructionsModal.jsx');
    assert.match(src, /className="modal modal-open"/);
    assert.match(src, /className="modal-box/);
    assert.match(src, /className="modal-backdrop"/);
    assert.match(src, /className="modal-action/);
    // Warning note must be a DaisyUI alert with alert-soft variant.
    assert.match(src, /role="alert" className="alert alert-warning alert-soft/, 'Warning note should be role="alert" + alert alert-warning alert-soft');
    assert.doesNotMatch(src, /install-modal-overlay|install-modal-box/, 'Must not use removed .install-modal-* custom classes');
});

// ----- Phase 2: Toast -----

test('Phase 2 — Toast uses DaisyUI toast + alert classes', () => {
    const src = read('dashboard/js/components/Toast.jsx');
    assert.match(src, /className="toast toast-bottom toast-center/, 'ToastContainer should use `toast toast-bottom toast-center`');
    // Variant-to-alert-class mapping must still point at DaisyUI classes.
    assert.match(src, /alert alert-success/);
    assert.match(src, /alert alert-error/);
    assert.match(src, /alert alert-warning/);
    assert.match(src, /alert alert-info/);
    // Dismiss button is a ghost circle btn.
    assert.match(src, /btn btn-ghost btn-xs btn-circle/);
    // No aria-live as a JSX attribute (comments mentioning it are fine —
    // the rationale block explains WHY the attribute is omitted). Scan
    // line-by-line and skip comment lines.
    const offendingLines = src.split('\n').filter((line) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*')) return false;
        return /\baria-live\s*=/.test(line);
    });
    assert.equal(offendingLines.length, 0, `Toast must not re-add aria-live — role="alert"/role="status" imply it. Offending: ${offendingLines.join(' | ')}`);
});

// ----- Phase 3: Health security alerts -----

test('Phase 3 — Health security summary containers use DaisyUI alert-error', () => {
    const src = read('dashboard/js/sections/Health.jsx');
    // Three summary alerts — accept any ordering of the flex/text utilities.
    const alertMatches = src.match(/role="alert" className="alert alert-error/g);
    assert.ok(alertMatches && alertMatches.length >= 3, `Expected at least 3 alert-error summary containers, found ${alertMatches?.length ?? 0}`);
});

// ----- Phase 4: Timeline work-pattern badges -----

test('Phase 4 — Timeline badges use DaisyUI semantic variants', () => {
    const src = read('dashboard/js/sections/Timeline.jsx');
    assert.match(src, /badge badge-accent/, 'Holiday badge should be `badge badge-accent`');
    assert.match(src, /badge badge-info/, 'Weekend badge should be `badge badge-info`');
    assert.match(src, /badge badge-warning/, 'After-Hours badge should be `badge badge-warning`');
});

// ----- Phase 5: Card unshadow -----

test('Phase 5 — CollapsibleSection uses DaisyUI card + card-body', () => {
    const src = read('dashboard/js/components/CollapsibleSection.jsx');
    assert.match(src, /className="card bg-base-200 border border-base-300"/);
    assert.match(src, /className="card-body /, 'card-body wrapper missing');
});

test('Phase 5 — ErrorBoundary uses DaisyUI card + role="alert"', () => {
    const src = read('dashboard/js/components/ErrorBoundary.jsx');
    assert.match(src, /role="alert" className="card bg-base-200 border border-base-300"/);
    assert.match(src, /className="card-body/);
});

test('Phase 5 — Projects ProjectCard uses DaisyUI card', () => {
    const src = read('dashboard/js/sections/Projects.jsx');
    assert.match(src, /className="card bg-base-200 border border-base-300/);
    assert.match(src, /className="card-body /);
});

test('Phase 5 — Discover metric cards use DaisyUI card', () => {
    const src = read('dashboard/js/sections/Discover.jsx');
    assert.match(src, /className="card bg-base-200 border border-base-300"/);
    assert.match(src, /className="card-body /);
});

// ----- Phase 6: Button unshadow -----

test('Phase 6 — Header uses DaisyUI btn-ghost btn-square for icon buttons', () => {
    const src = read('dashboard/js/components/Header.jsx');
    // Filter toggle with optional btn-active when open
    assert.match(src, /btn btn-ghost btn-square relative .*filterSidebarOpen/s);
    // Filter badge on filter toggle
    assert.match(src, /badge badge-primary badge-xs/);
    // Settings icon button
    const btnSquareMatches = src.match(/btn btn-ghost btn-square/g);
    assert.ok(btnSquareMatches && btnSquareMatches.length >= 2, `Expected at least 2 btn-ghost btn-square uses in Header, found ${btnSquareMatches?.length ?? 0}`);
});

test('Phase 6 — HamburgerMenu trigger is DaisyUI btn-ghost btn-square', () => {
    const src = read('dashboard/js/components/HamburgerMenu.jsx');
    assert.match(src, /className="btn btn-ghost btn-square"/);
});

test('Phase 6 — ShowMoreButton uses DaisyUI btn-ghost btn-block', () => {
    const src = read('dashboard/js/components/ShowMoreButton.jsx');
    assert.match(src, /btn btn-ghost btn-block btn-sm/);
});

test('Phase 6 — FilterSidebar include/exclude uses DaisyUI join + btn-xs', () => {
    const src = read('dashboard/js/components/FilterSidebar.jsx');
    assert.match(src, /className="join /);
    assert.match(src, /join-item btn btn-xs/);
    // Include-active gets primary, exclude-active gets error.
    assert.match(src, /btn-active btn-primary/);
    assert.match(src, /btn-active btn-error/);
    // Clear All button
    assert.match(src, /btn btn-outline btn-sm w-full/);
});

test('Phase 6 — DetailPane + SettingsPane close buttons are DaisyUI btn-ghost circle', () => {
    for (const path of ['dashboard/js/components/DetailPane.jsx', 'dashboard/js/components/SettingsPane.jsx']) {
        const src = read(path);
        assert.match(src, /btn btn-sm btn-circle btn-ghost/, `${path}: close button should be btn btn-sm btn-circle btn-ghost`);
    }
});

// ----- Phase 7: TabBar tabs + tab class composition -----

test('Phase 7 — TabBar uses DaisyUI tabs + tab class composition with ARIA', () => {
    const src = read('dashboard/js/components/TabBar.jsx');
    assert.match(src, /className="tabs tabs-border/);
    assert.match(src, /role="tablist"/);
    assert.match(src, /role="tab"/);
    // TAB_BASE_CLASSES must include DaisyUI's `tab` class so the tab-bar
    // gets DaisyUI's structural tab styling. The `.tab-btn` custom class
    // was deleted 2026-04-13 — typography is now inline Tailwind utilities
    // (font-mono uppercase tracking-wider text-base-content/60).
    assert.match(src, /TAB_BASE_CLASSES\s*=\s*\n?\s*['"`]tab /);
    assert.match(src, /font-mono uppercase/);
    // Active-state class must include `tab-active` (DaisyUI's selected-tab
    // class) plus the theme-aware text-shadow glow.
    assert.match(src, /TAB_ACTIVE_CLASSES\s*=/);
    assert.match(src, /tab-active border-primary text-primary/);
    assert.match(src, /\[text-shadow:0_0_10px_color-mix/);
});

// ----- Phase 8: Form inputs (post-audit fix — DaisyUI v5 makes bordered default) -----

test('Phase 8 — SettingsPane selects use DaisyUI select class (no v4 -bordered cruft)', () => {
    const src = read('dashboard/js/components/SettingsPane.jsx');
    // The 2026-04-13 custom-CSS cleanup added `w-full` inline (the
    // previous `.settings-group select { width: 100% }` descendant rule
    // was deleted), so both selects now carry `select select-sm w-full`.
    const selectMatches = src.match(/className="select select-sm w-full"/g);
    assert.ok(selectMatches && selectMatches.length === 2, `Expected 2 work hour <select> uses with "select select-sm w-full", found ${selectMatches?.length ?? 0}`);
    // Must not re-introduce the v4 `-bordered` cruft.
    assert.doesNotMatch(src, /select-bordered/, 'DaisyUI v5 removed `select-bordered` — see docs/DAISYUI_V5_NOTES.md');
    assert.doesNotMatch(src, /filter-select/, 'Dead .filter-select custom class must not be re-introduced');
});

test('Phase 8 — FilterSidebar date inputs use DaisyUI input class', () => {
    const src = read('dashboard/js/components/FilterSidebar.jsx');
    const inputMatches = src.match(/className="input input-sm w-full"/g);
    assert.ok(inputMatches && inputMatches.length === 2, `Expected 2 date <input> uses, found ${inputMatches?.length ?? 0}`);
    assert.doesNotMatch(src, /input-bordered/, 'DaisyUI v5 removed `input-bordered`');
    assert.doesNotMatch(src, /filter-input/, 'Dead .filter-input custom class must not be re-introduced');
});

// ----- Phase 9: HamburgerMenu portal + stacking context fix -----

test('Phase 9 — HamburgerMenu uses React Portal to escape header stacking context', () => {
    const src = read('dashboard/js/components/HamburgerMenu.jsx');
    assert.match(src, /import \{ createPortal \} from 'react-dom'/);
    assert.match(src, /createPortal\(portalContent, document\.body\)/);
    // Destructive hover must use theme-aware bg-error/10 Tailwind utility
    // (the 2026-04-13 custom-CSS cleanup migrated the
    // .hamburger-item-destructive:hover rule to inline Tailwind in JSX).
    // The bg-error/10 utility resolves to `color-mix(in oklab,
    // var(--color-error) 10%, transparent)` via DaisyUI's semantic token
    // system, so the end-user color is identical — just sourced from
    // Tailwind instead of a hand-rolled CSS rule.
    assert.match(
        src, /hover:bg-error\/10/,
        'HamburgerMenu destructive items must use Tailwind `hover:bg-error/10` ' +
        'for theme-aware hover background. Was previously in styles.css as ' +
        '`.hamburger-item-destructive:hover { background: color-mix(...) }`.'
    );
    // Regression guard: the old hardcoded `rgba(239, 68, 68, ...)` must
    // not return anywhere in the JSX — explicit rgba() is a sign the
    // color-token migration was reversed.
    assert.doesNotMatch(
        src, /rgba\s*\(\s*239/,
        'HamburgerMenu must not use hardcoded `rgba(239, 68, 68, ...)` — ' +
        'use Tailwind `bg-error/10` or DaisyUI semantic tokens.'
    );
});

// ----- Phase 10: FilterSidebar multi-select inner checkbox -----

test('Phase 10 — FilterSidebar multi-select inner checkbox uses DaisyUI checkbox', () => {
    const src = read('dashboard/js/components/FilterSidebar.jsx');
    // The 2026-04-13 custom-CSS cleanup inlined `.filter-multi-select-option
    // input[type="checkbox"] { margin: 0; flex-shrink: 0 }` onto the
    // checkbox className, so the full string is now
    // `checkbox checkbox-xs checkbox-primary m-0 shrink-0`.
    assert.match(src, /className="checkbox checkbox-xs checkbox-primary(?: m-0 shrink-0)?"/);
});

// ----- Follow-up audit: loading spinner shadow removal -----

test('Loading spinner: all consumers use DaisyUI loading loading-spinner, no shadowing', () => {
    const consumers = [
        'dashboard/js/App.jsx',
        'dashboard/js/sections/Timeline.jsx',
        'dashboard/js/sections/Projects.jsx',
        'dashboard/js/sections/Discover.jsx',
    ];
    for (const path of consumers) {
        const src = read(path);
        assert.match(src, /loading loading-spinner loading-(lg|md|sm|xs)/, `${path}: should use DaisyUI loading loading-spinner`);
        // Must not re-introduce the old custom class pattern.
        assert.doesNotMatch(src, /className="loading-spinner loading-spinner-/, `${path}: shadow class pattern must not return`);
    }
    // styles.css must not re-introduce the custom loading-spinner rules.
    const stylesSrc = read('dashboard/styles.css');
    assert.doesNotMatch(stylesSrc, /^\s*\.loading-spinner\s*\{/m, 'Custom .loading-spinner rule must stay removed (DaisyUI v5 ships its own)');
});

// ----- Follow-up audit: hardcoded Tailwind color classes -> DaisyUI semantic tokens -----

// Strip JSX/JS comment blocks so our class-name scans don't false-positive
// on rationale text in {/* ... */} or /* ... */ blocks (those blocks
// intentionally reference removed class names for historical context).
// Line comments are handled separately per-line.
function stripComments(src) {
    // JSX comment: {/* ... */}
    src = src.replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
    // JS block comment: /* ... */
    src = src.replace(/\/\*[\s\S]*?\*\//g, '');
    return src;
}

async function walkJsxFiles(rootDir) {
    const { readdirSync, statSync } = await import('node:fs');
    const results = [];
    function walk(dir) {
        for (const entry of readdirSync(dir)) {
            const full = join(dir, entry);
            const s = statSync(full);
            if (s.isDirectory()) walk(full);
            else if (entry.endsWith('.jsx')) results.push(full);
        }
    }
    walk(rootDir);
    return results;
}

test('Data-viz tokens: no hardcoded Tailwind color shades in dashboard/js', async () => {
    // Scan every .jsx file for bg-{color}-{weight} patterns. CLAUDE.md
    // requires DaisyUI semantic tokens (bg-success, bg-info, etc.) for
    // data-viz categories so they track the active theme. This test
    // catches regressions where someone types `bg-green-500` instead
    // of `bg-success`.
    const jsxFiles = await walkJsxFiles(join(REPO_ROOT, 'dashboard', 'js'));
    const forbidden = /bg-(red|green|blue|yellow|purple|orange|pink|indigo|teal|cyan|lime|emerald|amber|rose|fuchsia|violet|sky|slate|zinc|stone|gray)-\d+/;
    const offenders = [];
    for (const file of jsxFiles) {
        const raw = readFileSync(file, 'utf8');
        const src = stripComments(raw);
        const lines = src.split('\n');
        lines.forEach((line, i) => {
            // Also skip single-line `//` comments after stripComments().
            const trimmed = line.trimStart();
            if (trimmed.startsWith('//')) return;
            if (forbidden.test(line)) {
                offenders.push(`${file.replace(REPO_ROOT + '/', '')}:${i + 1} -> ${line.trim()}`);
            }
        });
    }
    assert.equal(
        offenders.length, 0,
        `Found ${offenders.length} hardcoded Tailwind color shades in JSX:\n${offenders.join('\n')}\nUse DaisyUI semantic tokens (bg-success / bg-info / bg-warning / bg-error / bg-primary / bg-secondary / bg-accent / bg-neutral) instead. See docs/DAISYUI_V5_NOTES.md "Data-viz color tokens".`
    );
});

// ----- Follow-up audit: progress bars migrated to native <progress> -----

test('Progress bars: Progress.jsx + Discover.jsx use native <progress> + DaisyUI progress class', () => {
    const progressSrc = read('dashboard/js/sections/Progress.jsx');
    const discoverSrc = read('dashboard/js/sections/Discover.jsx');
    assert.match(progressSrc, /<progress\s+className="progress progress-primary w-full"/);
    assert.match(discoverSrc, /<progress\s+className="progress progress-info w-full"/);
});

// ----- Follow-up audit: dead marker class removal -----

test('No dead marker classes (stat-card, metric-selector, pin-btn) in JSX className attributes', async () => {
    const jsxFiles = await walkJsxFiles(join(REPO_ROOT, 'dashboard', 'js'));
    // `weekly-heatmap` + `daily-heatmap` were caught in the round-3 sweep —
    // they'd been acting as wrapper marker classes with zero CSS rules
    // defined anywhere. Same pattern as stat-card / metric-selector / pin-btn.
    const deadMarkers = ['stat-card', 'metric-selector', 'pin-btn', 'weekly-heatmap', 'daily-heatmap'];
    const offenders = [];
    for (const file of jsxFiles) {
        const raw = readFileSync(file, 'utf8');
        const src = stripComments(raw);
        const lines = src.split('\n');
        lines.forEach((line, i) => {
            const trimmed = line.trimStart();
            if (trimmed.startsWith('//')) return;
            // Only flag lines that LOOK like className= attributes.
            if (!/className\s*=/.test(line)) return;
            for (const marker of deadMarkers) {
                if (line.includes(marker)) {
                    offenders.push(`${file.replace(REPO_ROOT + '/', '')}:${i + 1} — dead marker "${marker}": ${line.trim()}`);
                }
            }
        });
    }
    assert.equal(offenders.length, 0, `Dead marker class(es) back in JSX:\n${offenders.join('\n')}`);
});

// ----- Chart.js runtime theme-tracking follow-up -----

test('Chart.js components read theme accent from state.themeAccent / state.themeMuted', () => {
    // Timing.jsx hour-of-day and weekday charts should be theme-aware.
    const timingSrc = read('dashboard/js/sections/Timing.jsx');
    assert.match(timingSrc, /state\.themeAccent/, 'Timing.jsx should read state.themeAccent');
    assert.match(timingSrc, /state\.themeMuted/, 'Timing.jsx should read state.themeMuted');
    // Timeline.jsx commit bars and net-lines bars should track theme.
    const timelineSrc = read('dashboard/js/sections/Timeline.jsx');
    const timelineAccentMatches = timelineSrc.match(/state\.themeAccent/g);
    assert.ok(
        timelineAccentMatches && timelineAccentMatches.length >= 2,
        `Timeline.jsx should read state.themeAccent in at least 2 chart memos, found ${timelineAccentMatches?.length ?? 0}`
    );
    // Contributors.jsx low-complexity segment should track theme.
    const contribSrc = read('dashboard/js/sections/Contributors.jsx');
    assert.match(contribSrc, /state\.themeMuted/, 'Contributors.jsx should read state.themeMuted for low-complexity segment');
});

test('chartColors.js exposes runtime theme resolvers', () => {
    const src = read('dashboard/js/chartColors.js');
    assert.match(src, /export function resolveRuntimeAccent/);
    assert.match(src, /export function resolveRuntimeMuted/);
    assert.match(src, /export const hasUrlAccentOverride/);
    // resolveRuntimeAccent must read --color-primary from computed style
    assert.match(src, /getPropertyValue\s*\(\s*'--color-primary'\s*\)/);
});

test('AppContext dispatches SET_THEME_COLORS after applyTheme()', () => {
    const src = read('dashboard/js/AppContext.jsx');
    assert.match(src, /case 'SET_THEME_COLORS'/);
    // The darkMode effect should call resolveRuntimeAccent/Muted + dispatch.
    assert.match(src, /dispatch\(\{\s*type: 'SET_THEME_COLORS'/);
    assert.match(src, /resolveRuntimeAccent\(\)/);
    assert.match(src, /resolveRuntimeMuted\(\)/);
});

// ----- Heatmap CSS: theme-tracking + embed override -----

test('Heatmap CSS uses color-mix + --chart-accent-override fallback chain', () => {
    const stylesSrc = read('dashboard/styles.css');
    // Strip CSS block comments so rationale text referencing the removed
    // --chart-accent-rgb variable doesn't false-trigger the regression check.
    const stripped = stylesSrc.replace(/\/\*[\s\S]*?\*\//g, '');
    // Must use the nested var() fallback chain.
    assert.match(stripped, /var\(--chart-accent-override,\s*var\(--color-primary\)\)/);
    // Must use color-mix for intensity bands.
    assert.match(stripped, /color-mix\(in oklab, var\(--chart-accent-override, var\(--color-primary\)\) 15%/);
    assert.match(stripped, /color-mix\(in oklab, var\(--chart-accent-override, var\(--color-primary\)\) 35%/);
    assert.match(stripped, /color-mix\(in oklab, var\(--chart-accent-override, var\(--color-primary\)\) 60%/);
    // Must NOT re-introduce the old --chart-accent-rgb rgba() pattern.
    assert.doesNotMatch(stripped, /--chart-accent-rgb/, 'Old --chart-accent-rgb CSS variable must not return — migrated to --chart-accent-override');
    // High-intensity cells must use --color-primary-content for readable text
    // (not hardcoded `white`, which is invisible on light themes).
    assert.match(stripped, /color: var\(--color-primary-content\)/);
});

// ----- Built-CSS shipping checks (skip if dist/ missing) -----

test('Built CSS ships all DaisyUI component classes we reference', { skip: !builtCss }, () => {
    const required = [
        // Modal
        '\\.modal\\b', '\\.modal-open', '\\.modal-box', '\\.modal-backdrop', '\\.modal-action',
        // Toast + alert
        '\\.toast\\b', '\\.toast-bottom', '\\.toast-center',
        '\\.alert\\b', '\\.alert-success', '\\.alert-error', '\\.alert-warning', '\\.alert-info', '\\.alert-soft',
        // Cards
        '\\.card\\b', '\\.card-body',
        // Buttons
        '\\.btn\\b', '\\.btn-primary', '\\.btn-ghost', '\\.btn-outline', '\\.btn-square', '\\.btn-circle',
        '\\.btn-xs', '\\.btn-sm', '\\.btn-block', '\\.btn-active', '\\.btn-error',
        // Badges
        '\\.badge\\b', '\\.badge-primary', '\\.badge-xs', '\\.badge-sm',
        '\\.badge-accent', '\\.badge-info', '\\.badge-warning',
        // Tabs
        '\\.tabs\\b', '\\.tabs-border', '\\.tab\\b', '\\.tab-active',
        // Form inputs (v5: no -bordered variant, border is default)
        '\\.select\\b', '\\.select-sm',
        '\\.input\\b', '\\.input-sm',
        // Checkbox
        '\\.checkbox\\b', '\\.checkbox-xs', '\\.checkbox-primary',
        // Join (segmented buttons)
        '\\.join\\b', '\\.join-item',
        // Loading
        '\\.loading\\b', '\\.loading-spinner', '\\.loading-sm', '\\.loading-md', '\\.loading-lg',
        // Progress
        '\\.progress\\b', '\\.progress-primary', '\\.progress-info',
    ];
    const missing = [];
    for (const pattern of required) {
        const re = new RegExp(pattern);
        if (!re.test(builtCss)) missing.push(pattern.replace(/\\/g, ''));
    }
    assert.equal(
        missing.length, 0,
        `Built CSS is missing DaisyUI classes: ${missing.join(', ')}\nRun \`./node_modules/.bin/vite build\` and re-run the test.`
    );
});

test('Built CSS has zero v4 -bordered form cruft (DaisyUI v5 removed these)', { skip: !builtCss }, () => {
    const v4Cruft = ['\\.input-bordered', '\\.select-bordered', '\\.textarea-bordered', '\\.btn-bordered'];
    const found = [];
    for (const pattern of v4Cruft) {
        const re = new RegExp(pattern);
        if (re.test(builtCss)) found.push(pattern.replace(/\\/g, ''));
    }
    assert.equal(
        found.length, 0,
        `Found DaisyUI v4 cruft in built CSS (should be gone in v5): ${found.join(', ')}. See docs/DAISYUI_V5_NOTES.md "v4 -> v5 removed modifiers".`
    );
});

test('Built CSS ships the 8 DaisyUI semantic bg tokens used by data-viz', { skip: !builtCss }, () => {
    const tokens = ['success', 'info', 'warning', 'error', 'primary', 'secondary', 'accent', 'neutral'];
    const missing = [];
    for (const token of tokens) {
        if (!new RegExp(`\\.bg-${token}\\b`).test(builtCss)) missing.push(`bg-${token}`);
    }
    assert.equal(missing.length, 0, `Built CSS missing semantic bg tokens: ${missing.join(', ')}`);
});

// ----- Final allowlist: ONLY these custom classes may remain in styles.css -----

test('styles.css allowlist — only legitimate custom classes remain', () => {
    // The 2026-04-13 "no custom CSS unless absolutely necessary" sweep
    // migrated ~80 custom class wrappers to inline Tailwind utilities.
    // The classes below are the ones that SHOULD stay custom — each has
    // a Tailwind-incompatible feature (pseudo-element, @keyframes, CSS
    // transition from a non-Tailwind value like `max-height: none`,
    // complex state-class descendant selectors for transform slide-overs,
    // or isolated rendering that survives CSS load failure).
    //
    // If a new primary rule head appears in styles.css that isn't in this
    // allowlist, this test fails. Add it to the list ONLY if the rule
    // has a Tailwind-incompatible feature documented in a rationale
    // block. If the new rule is just a layout/typography alias, migrate
    // it to inline Tailwind utilities instead of extending the allowlist.
    const LEGITIMATE_CUSTOM_CLASSES = new Set([
        // --- Transform-based slide-over drawers (state class + transform transitions) ---
        'filter-sidebar',
        'filter-sidebar-overlay',
        'detail-pane',
        'detail-pane-overlay',
        'detail-pane-header',         // zero-style marker for mobile ::before drag handle
        'settings-pane',
        'settings-pane-overlay',
        'settings-pane-header',       // zero-style marker for mobile ::before drag handle
        // --- Pseudo-elements (::after gradient, ::before drag handles) ---
        'dashboard-header',           // ::after gradient accent line
        // --- @keyframes animations ---
        'dashboard-enter',            // fade-in on page load
        'hamburger-dropdown',         // fade-in + complex box-shadow
        'hamburger-update-dot',       // pulse animation
        // --- React-state transitions with Tailwind-incompatible values ---
        'collapsible-content',        // max-height: 0 → none transition
        // --- Isolated rendering that must survive CSS load failure ---
        'root-error-message',
        'root-error-detail',
        'root-error-hint',
        // --- Not shipped by Tailwind ---
        'scrollbar-hide',             // ::-webkit-scrollbar pseudo + iOS scroll
        'header-filter-hint',         // `font: inherit` shorthand
        // --- Data-viz intensity levels (dynamic JSX reference `heatmap-${level}`) ---
        'heatmap-0',
        'heatmap-1',
        'heatmap-2',
        'heatmap-3',
        'heatmap-4',
        // --- Root state marker consumed by descendant selectors in styles.css ---
        'embed-mode',                 // triggers chart-only rendering in embeds
    ]);

    // DaisyUI component classes that appear in styles.css ONLY inside
    // override blocks (print media, embed-mode descendants). They're
    // not custom class definitions — they're overrides of DaisyUI's own
    // classes. The Python rule-head extractor can't distinguish these,
    // so we exempt them explicitly.
    const DAISYUI_OVERRIDES = new Set(['card', 'modal', 'btn', 'tab', 'tabs']);

    const stylesSrc = read('dashboard/styles.css');
    // Strip comments so rationale blocks that reference removed classes
    // don't false-trigger.
    const stripped = stylesSrc.replace(/\/\*[\s\S]*?\*\//g, '');
    // Extract primary rule-head class names (class starts a rule).
    const seen = new Set();
    for (const line of stripped.split('\n')) {
        const m = line.match(/^\s*\.([a-zA-Z][a-zA-Z0-9_-]+)/);
        if (m && line.includes('{')) seen.add(m[1]);
    }

    const unauthorized = [];
    for (const name of seen) {
        if (LEGITIMATE_CUSTOM_CLASSES.has(name)) continue;
        if (DAISYUI_OVERRIDES.has(name)) continue;
        unauthorized.push(name);
    }

    assert.equal(
        unauthorized.length, 0,
        `Unauthorized custom class(es) in dashboard/styles.css: ${unauthorized.sort().join(', ')}\n\n` +
        'Add the class to LEGITIMATE_CUSTOM_CLASSES above ONLY if it has a Tailwind-incompatible ' +
        'feature documented in a rationale block (pseudo-element, @keyframes, max-height:none transition, ' +
        'transform-based slide-over state, CSS-load-failure survival, or unshipped utility like scrollbar-hide). ' +
        'Otherwise migrate it to inline Tailwind utilities at its JSX consumers and delete the rule.'
    );

    // Also verify every legitimate class in the allowlist ACTUALLY still
    // has a rule — the allowlist should stay in sync with reality, and
    // a stale entry (allowlisted but no rule) means a migration removed
    // the rule but forgot to update the allowlist.
    const missingFromCss = [];
    for (const name of LEGITIMATE_CUSTOM_CLASSES) {
        if (!seen.has(name)) missingFromCss.push(name);
    }
    assert.equal(
        missingFromCss.length, 0,
        `Allowlisted classes no longer have rules in styles.css: ${missingFromCss.join(', ')}\n` +
        'Remove them from LEGITIMATE_CUSTOM_CLASSES — the allowlist must track reality.'
    );
});

// ----- Custom-CSS cleanup pass (2026-04-13) invariants -----

test('Dead classes stay deleted (skeleton, timeline-dot, stat-label, stat-value, detail-pane-content-loaded)', () => {
    const stylesSrc = read('dashboard/styles.css');
    // Strip CSS comments so rationale blocks mentioning the removed names
    // don't false-trigger the regression check.
    const stripped = stylesSrc.replace(/\/\*[\s\S]*?\*\//g, '');
    const deadRules = [
        /\.skeleton\s*\{/,
        /\.skeleton-commit\s*\{/,
        /\.skeleton-line\s*\{/,
        /\.timeline-dot\s*\{/,
        /\.stat-label\s*\{/,
        /\.stat-value\s*\{/,
        /\.detail-pane-content-loaded\s*\{/,
        /@keyframes skeleton-loading\b/,
    ];
    const reintroduced = deadRules.filter(re => re.test(stripped)).map(re => re.source);
    assert.equal(
        reintroduced.length, 0,
        `Dead CSS classes re-introduced in dashboard/styles.css: ${reintroduced.join(', ')}`
    );
});

test('Tailwind utility hijack rules stay deleted (.text-3xl/.text-2xl/.card descendant mono)', () => {
    const stylesSrc = read('dashboard/styles.css');
    const stripped = stylesSrc.replace(/\/\*[\s\S]*?\*\//g, '');
    // The pre-cleanup global rule used .text-3xl, .text-2xl, .font-mono,
    // .stat-value in its selector list. The cleanup narrowed it to only
    // semantic HTML heading selectors (h1/h2/h3). Any re-introduction of
    // Tailwind utility names in that rule is a regression.
    const offendingSelectors = /\.(text-3xl|text-2xl|font-mono|stat-value)\b[^{]*\{\s*font-family/;
    assert.doesNotMatch(
        stripped, offendingSelectors,
        'Tailwind utility hijack (e.g. `.text-3xl { font-family: mono }`) must not return — ' +
        'add `font-mono` explicitly to the JSX elements that need mono typography.'
    );
    // The `.card .text-3xl, .card .text-2xl` descendant selector rule
    // that duplicated the mono + added tracking-tight is also gone.
    assert.doesNotMatch(
        stripped, /\.card\s+\.text-3xl/,
        '`.card .text-3xl` descendant selector must not return — use `font-mono tracking-tight` in JSX.'
    );
    assert.doesNotMatch(
        stripped, /\.card\s+\.text-2xl/,
        '`.card .text-2xl` descendant selector must not return — use `font-mono tracking-tight` in JSX.'
    );
    // The mobile .card { padding } / .card .text-3xl / .card .text-lg /
    // .space-y-6 overrides are all gone. Regression-guard the space-y-6
    // descendant selector specifically since it was the most fragile.
    assert.doesNotMatch(
        stripped, /\.space-y-6\s*>/,
        '`.space-y-6 > * + *` descendant selector must not return — use `space-y-4 sm:space-y-6` in JSX.'
    );
});

test('Tag color duplication stays collapsed (no .tag-{name} CSS rules)', () => {
    const stylesSrc = read('dashboard/styles.css');
    const stripped = stylesSrc.replace(/\/\*[\s\S]*?\*\//g, '');
    // Any `.tag-{name}` rule with an rgba() fill is a re-introduction of
    // the pre-cleanup per-tag CSS rules (which duplicated TAG_COLORS from
    // utils.js). Allow the `.tag` base class (common layout — padding,
    // border-radius, font-size) but flag any `.tag-name` pattern.
    const offendingRules = stripped.match(/\.tag-[a-z-]+\s*\{[^}]*\}/g) || [];
    assert.equal(
        offendingRules.length, 0,
        `Per-tag CSS rules re-introduced: ${offendingRules.slice(0, 3).join(' | ')}. ` +
        'Tag colors must come from getTagStyleObject() in utils.js — see that module\'s ' +
        'rationale block for the single-source-of-truth argument.'
    );
});

test('utils.js has no getTagClass export (replaced by className="tag" + getTagStyleObject)', () => {
    const src = read('dashboard/js/utils.js');
    // Strip comments so the rationale note doesn't false-trigger.
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(
        stripped, /export\s+function\s+getTagClass\b/,
        'getTagClass was removed 2026-04-13 — JSX consumers now use `className="tag"` + ' +
        'inline style={getTagStyleObject(tag)}. Do not re-export.'
    );
});

test('TAB_SECTIONS dead export stays deleted', () => {
    const src = read('dashboard/js/state.js');
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(
        stripped, /export\s+const\s+TAB_SECTIONS\b/,
        'TAB_SECTIONS was removed 2026-04-13 (0 consumers, duplicated CLAUDE.md doc table).'
    );
});

test('pwa.js imports safeStorage helpers from utils.js (no local duplication)', () => {
    const src = read('dashboard/js/pwa.js');
    assert.match(
        src, /import\s+\{[^}]*safeStorageGet[^}]*\}\s+from\s+['"]\.\/utils\.js['"]/,
        'pwa.js must import safeStorageGet from utils.js, not define a local copy.'
    );
    // Strip comments before checking for local definitions to avoid
    // false-triggering on rationale blocks that mention the old pattern.
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    assert.doesNotMatch(
        stripped, /function\s+safeStorageGet\s*\(/,
        'Local safeStorageGet definition in pwa.js must not return — import from utils.js.'
    );
});

test('.tag base class stays deleted — tag chips use inline Tailwind utilities', async () => {
    const stylesSrc = read('dashboard/styles.css');
    const stripped = stylesSrc.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(
        stripped, /^\s*\.tag\s*\{/m,
        '.tag base class must not return — use inline Tailwind utilities ' +
        '(inline-block px-2 py-0.5 rounded-full text-xs font-medium) in JSX.'
    );
    // Sweep every .jsx file for any className attribute that includes `tag`
    // as a standalone space-delimited token. This catches regressions like
    // `className="tag tag-security"` (space-delimited "tag" + legacy
    // per-tag class) — neither should appear in JSX after the 2026-04-13
    // tag cleanup. Tag chips must use the full Tailwind class string
    // `inline-block px-2 py-0.5 rounded-full text-xs font-medium` plus
    // an inline style object from `getTagStyleObject(tagName)`.
    const jsxFiles = await walkJsxFiles(join(REPO_ROOT, 'dashboard', 'js'));
    // Pattern: className attribute whose value contains `tag` as a bare
    // token separated by whitespace (or alone). Must not match className
    // values that only contain `tag-chip` / `tag-dynamic` / etc.
    const bareTagPattern = /className\s*=\s*["'](?:[^"']*\s)?tag(?:\s[^"']*)?["']/;
    // Pattern: className attribute containing any `tag-{name}` legacy
    // per-tag class. Catches consumers that kept the old mapping.
    const perTagPattern = /className\s*=\s*["'][^"']*\btag-(?:feature|enhancement|seed|init|bugfix|fix|security|hotfix|removal|revert|deprecate|refactor|naming|cleanup|docs|test|test-unit|test-e2e|build|ci|deploy|config|chore|style|ux|ui|accessibility|performance|perf|dependency|deps|other|dynamic|breaking)\b[^"']*["']/;
    const offenders = [];
    for (const file of jsxFiles) {
        const raw = readFileSync(file, 'utf8');
        const src = stripComments(raw);
        const lines = src.split('\n');
        lines.forEach((line, i) => {
            if (line.trimStart().startsWith('//')) return;
            if (bareTagPattern.test(line) || perTagPattern.test(line)) {
                offenders.push(`${file.replace(REPO_ROOT + '/', '')}:${i + 1} — ${line.trim()}`);
            }
        });
    }
    assert.equal(
        offenders.length, 0,
        `Tag chip regression(s):\n${offenders.join('\n')}\n\n` +
        'Tag chips must use `className="inline-block px-2 py-0.5 rounded-full text-xs font-medium"` ' +
        'plus `style={getTagStyleObject(tagName)}`. The `.tag` base class and the ' +
        '`.tag-{name}` per-tag classes were removed on 2026-04-13.'
    );
    // Every tag-chip consumer must use the full 5-utility Tailwind
    // combination so chip layout is consistent. This is a secondary
    // check (the sweep above is the primary regression guard).
    const tagConsumers = [
        'dashboard/js/sections/Tags.jsx',
        'dashboard/js/sections/Timeline.jsx',
        'dashboard/js/sections/Contributors.jsx',
        'dashboard/js/components/DetailPane.jsx',
        'dashboard/js/sections/Health.jsx',
    ];
    for (const path of tagConsumers) {
        const src = read(path);
        assert.match(
            src, /inline-block\s+px-2\s+py-0\.5\s+rounded-full\s+text-xs\s+font-medium/,
            `${path}: tag chip consumers must use the full Tailwind class ` +
            `string "inline-block px-2 py-0.5 rounded-full text-xs font-medium" ` +
            `for consistent chip layout.`
        );
    }
});

test('.no-print custom class stays deleted — JSX uses Tailwind print:hidden variant', () => {
    const stylesSrc = read('dashboard/styles.css');
    const stripped = stylesSrc.replace(/\/\*[\s\S]*?\*\//g, '');
    // The print media query must not re-introduce `.no-print { display: none }`.
    assert.doesNotMatch(
        stripped, /\.no-print\s*\{\s*display\s*:\s*none/,
        '.no-print custom class must not return — use Tailwind print:hidden variant in JSX.'
    );
    // Every JSX consumer that needs print-hiding must use `print:hidden`
    // instead of `no-print`.
    const printConsumers = [
        'dashboard/js/App.jsx',
        'dashboard/js/components/Toast.jsx',
        'dashboard/js/components/Header.jsx',
    ];
    for (const path of printConsumers) {
        const src = read(path);
        // Skip checks if the file doesn't use any print-hiding at all
        // (some files may have moved the surface elsewhere over time).
        const hasPrintContent = /print:hidden|no-print/.test(src);
        if (!hasPrintContent) continue;
        const strippedSrc = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
        assert.doesNotMatch(
            strippedSrc, /className\s*=\s*['"][^'"]*\bno-print\b/,
            `${path}: JSX must use print:hidden (Tailwind variant) instead of no-print (custom class).`
        );
    }
});

test('Built CSS ships Tailwind print:hidden variant', { skip: !builtCss }, () => {
    // Tailwind v4 generates `.print\:hidden` rules under @media print
    // when the class is referenced in source. Verify the variant shipped
    // so the migration from .no-print is complete.
    assert.match(
        builtCss, /\.print\\:hidden/,
        'Built CSS missing print:hidden utility — Tailwind should generate ' +
        'this when the class appears in JSX. Re-run `vite build`.'
    );
});
