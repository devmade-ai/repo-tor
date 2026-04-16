// Static source-analysis smoke test for the DaisyUI v5 component-class migration.
//
// Requirement: catch regressions that would let a custom class silently shadow
//   a DaisyUI @layer components rule (the exact trap the 2026-04-13 10-phase
//   sweep fixed). This file is the project's only automated test layer —
//   browser-runtime tests (Playwright) were removed 2026-04-15 because the
//   spec files were never run; see docs/TODO.md "Browser test coverage
//   (future)" and `git log` for context.
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
//     which needs a provider + mock data). Source-level grepping is enough
//     for class-name regressions which are the highest-value catch.
//   - JSDOM full app bootstrap: Rejected — slow, fragile, and doesn't
//     verify the actual built CSS that ships to users (which is what the
//     "built CSS shipping checks" assertions cover via direct file reads
//     of dist/assets/index-*.css).
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

test('Phase 5 — CollapsibleSection uses DaisyUI collapse component', () => {
    // Post-2026-04-14 vanilla-DaisyUI sweep: CollapsibleSection migrated
    // from a hand-rolled card + custom `.collapsible-content` transition
    // to DaisyUI's native `collapse collapse-arrow` component with a
    // native checkbox wired to React state. Embed mode short-circuits
    // to `{children}` so embedders get the bare chart.
    const src = read('dashboard/js/components/CollapsibleSection.jsx');
    assert.match(src, /collapse collapse-arrow/);
    assert.match(src, /bg-base-200 border border-base-300/);
    assert.match(src, /collapse-title/);
    assert.match(src, /collapse-content/);
    assert.match(src, /isEmbedMode/, 'CollapsibleSection must short-circuit in embed mode');
});

test('Root ErrorBoundary in main.jsx uses Tailwind utilities, not inline styles', () => {
    // The root ErrorBoundary fallback was converted from inline style={{}}
    // to Tailwind utility classes on 2026-04-15 (commit aea7c43). This
    // test guards against re-adding inline styles for "CSS-load-failure
    // resilience" — the browser's user-agent default stylesheet renders
    // the fallback legibly even without Tailwind classes, so inline
    // layout styles are belt-and-suspenders that don't justify a
    // permanent CLAUDE.md exception.
    const src = read('dashboard/js/main.jsx');
    // Must use Tailwind layout utilities (not inline style)
    assert.match(src, /className="min-h-screen flex flex-col items-center justify-center/,
        'Root ErrorBoundary fallback should use Tailwind min-h-screen + flex utilities');
    // Must NOT contain inline layout styles like minHeight / flexDirection
    // (the old pattern we removed)
    assert.doesNotMatch(src, /style=\{\{[^}]*minHeight/,
        'Root ErrorBoundary should not use inline style={{ minHeight }} — use Tailwind min-h-screen instead');
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
    // class) plus plain `text-primary font-semibold` — the vanilla-DaisyUI
    // migration (2026-04-14) removed the custom `text-shadow-primary-glow`
    // utility along with every other non-stock styling.
    assert.match(src, /TAB_ACTIVE_CLASSES\s*=/);
    assert.match(src, /tab-active border-primary text-primary/);
    assert.match(src, /font-semibold/);
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
    // Timeline chart-data builders extracted into hooks/useTimelineCharts.js
    // on 2026-04-15 — assertion now reads the hook file. The commit-bar
    // and net-lines bar charts both reference state.themeAccent.
    const timelineHookSrc = read('dashboard/js/hooks/useTimelineCharts.js');
    const timelineAccentMatches = timelineHookSrc.match(/state\.themeAccent/g);
    assert.ok(
        timelineAccentMatches && timelineAccentMatches.length >= 2,
        `useTimelineCharts.js should read state.themeAccent in at least 2 chart memos, found ${timelineAccentMatches?.length ?? 0}`
    );
    // Sanity-check that Timeline.jsx still consumes the hook.
    const timelineSrc = read('dashboard/js/sections/Timeline.jsx');
    assert.match(timelineSrc, /useTimelineCharts/, 'Timeline.jsx should call useTimelineCharts hook');
    // Contributors.jsx low-complexity segment should track theme.
    const contribSrc = read('dashboard/js/sections/Contributors.jsx');
    assert.match(contribSrc, /state\.themeMuted/, 'Contributors.jsx should read state.themeMuted for low-complexity segment');
});

test('chartColors.js is vanilla DaisyUI (no brand hex, no URL overrides)', () => {
    const src = read('dashboard/js/chartColors.js');
    // Runtime resolvers must still exist.
    assert.match(src, /export function resolveRuntimeAccent/);
    assert.match(src, /export function resolveRuntimeMuted/);
    // Must read --color-primary / --color-base-content via getComputedStyle.
    assert.match(src, /getPropertyValue/);
    assert.match(src, /--color-primary/);
    assert.match(src, /--color-base-content/);
    // The 2026-04-14 vanilla sweep removed every URL override and every
    // brand hex — regression-guard so they don't come back.
    assert.doesNotMatch(src, /hasUrlAccentOverride/, 'hasUrlAccentOverride was deleted with the URL-override sweep');
    assert.doesNotMatch(src, /hasUrlMutedOverride/, 'hasUrlMutedOverride was deleted with the URL-override sweep');
    assert.doesNotMatch(src, /DEFAULT_SERIES/, 'DEFAULT_SERIES brand palette was deleted — use SEMANTIC_CYCLE');
    assert.doesNotMatch(src, /DEFAULT_ACCENT/, 'DEFAULT_ACCENT brand hex was deleted');
    assert.doesNotMatch(src, /PALETTES\b/, 'PALETTES preset map was deleted');
    // No hex colour literals anywhere in the file.
    assert.doesNotMatch(src, /#[0-9a-fA-F]{6}\b/, 'chartColors.js must not contain any hex colour literals in vanilla mode');
});

test('AppContext dispatches SET_THEME_COLORS after applyTheme()', () => {
    // Reducer switch cases moved from AppContext.jsx into appReducer.js
    // on 2026-04-15 (line-count split — AppContext was 579 lines, over
    // the 500-line soft-limit). The SET_THEME_COLORS handler now lives
    // in the reducer module; the provider still dispatches the action
    // from its darkMode useEffect. Assertions are split across both
    // files to verify the wiring end-to-end.
    const reducerSrc = read('dashboard/js/appReducer.js');
    assert.match(reducerSrc, /case 'SET_THEME_COLORS'/);

    const contextSrc = read('dashboard/js/AppContext.jsx');
    // The darkMode effect should call resolveRuntimeAccent/Muted + dispatch.
    assert.match(contextSrc, /dispatch\(\{\s*type: 'SET_THEME_COLORS'/);
    assert.match(contextSrc, /resolveRuntimeAccent\(\)/);
    assert.match(contextSrc, /resolveRuntimeMuted\(\)/);
    // Sanity-check the import wiring between the two files so a future
    // refactor that renames the extracted module gets caught.
    assert.match(contextSrc, /from\s+['"]\.\/appReducer\.js['"]/);
});

// ----- Heatmap intensity: JS-driven stock Tailwind utilities -----

test('Heatmap intensity levels use stock bg-primary/N utilities (no custom .heatmap-N classes)', () => {
    // The HEATMAP_LEVEL_CLASSES palette + render branches were extracted
    // from sections/Timing.jsx into components/TimingHeatmap.jsx on
    // 2026-04-15 to keep Timing.jsx under the 500-line component
    // soft-limit. The check now reads the extracted file; the assertions
    // about the deleted .heatmap-N styles.css rules still apply globally.
    const heatmapSrc = read('dashboard/js/components/TimingHeatmap.jsx');
    // Must define the five-entry JS palette mapping level → stock Tailwind class.
    assert.match(heatmapSrc, /HEATMAP_LEVEL_CLASSES\s*=/);
    assert.match(heatmapSrc, /'bg-base-300'/);
    assert.match(heatmapSrc, /'bg-primary\/20'/);
    assert.match(heatmapSrc, /'bg-primary\/40'/);
    assert.match(heatmapSrc, /'bg-primary\/60'/);
    // Must not re-introduce the deleted .heatmap-N custom class references.
    assert.doesNotMatch(heatmapSrc, /heatmap-\$\{level\}/, 'heatmap-${level} template literal was replaced by HEATMAP_LEVEL_CLASSES[level]');

    // sections/Timing.jsx must still render the heatmap via the extracted
    // component — guards against accidental re-inlining of the render code.
    const timingSrc = read('dashboard/js/sections/Timing.jsx');
    assert.match(timingSrc, /import\s+TimingHeatmap\s+from/);
    assert.match(timingSrc, /<TimingHeatmap\b/);

    // styles.css must not re-introduce the deleted .heatmap-N primary rules.
    const stylesSrc = read('dashboard/styles.css');
    const stripped = stylesSrc.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(stripped, /^\s*\.heatmap-[0-4]\s*\{/m, '.heatmap-N custom classes were deleted 2026-04-14 — do not re-introduce');
    assert.doesNotMatch(stripped, /--chart-accent-override/, 'The --chart-accent-override embed hook was deleted with the vanilla-DaisyUI chart palette migration');
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
    // The 2026-04-14 vanilla-DaisyUI sweep aims for an empty allowlist.
    // Anything here is a short-term exception until it can be migrated or
    // accepted as unavoidable. Currently empty — the sweep completed with
    // every custom class removed.
    const LEGITIMATE_CUSTOM_CLASSES = new Set([]);

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

test('Tag brand-hex palette stays deleted (vanilla DaisyUI uses badge variants)', () => {
    const src = read('dashboard/js/utils.js');
    // Strip comments so the rationale note doesn't false-trigger.
    const stripped = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
    // The old brand palette exports must stay removed.
    assert.doesNotMatch(
        stripped, /export\s+const\s+TAG_COLORS\b/,
        'TAG_COLORS export was removed 2026-04-14 — tags now use `getTagBadgeClass(tag)` which returns a DaisyUI badge variant (badge-success/error/warning/info/secondary/accent/neutral).'
    );
    assert.doesNotMatch(
        stripped, /export\s+const\s+DYNAMIC_TAG_PALETTE\b/,
        'DYNAMIC_TAG_PALETTE was removed 2026-04-14 with the vanilla-DaisyUI tag sweep.'
    );
    assert.doesNotMatch(
        stripped, /export\s+function\s+getTagColor\b/,
        'getTagColor() was removed 2026-04-14 — chart datasets use resolveTagSemanticColor() which reads the active DaisyUI theme at runtime.'
    );
    assert.doesNotMatch(
        stripped, /export\s+function\s+getTagStyleObject\b/,
        'getTagStyleObject() was removed 2026-04-14 — tag chips use `className="badge badge-sm ${getTagBadgeClass(tag)}"` with no inline style.'
    );
    // The new vanilla helpers must exist.
    assert.match(
        stripped, /export\s+function\s+getTagBadgeClass\b/,
        'utils.js must export getTagBadgeClass(tag) for tag chip rendering.'
    );
    assert.match(
        stripped, /export\s+function\s+resolveTagSemanticColor\b/,
        'utils.js must export resolveTagSemanticColor(tag) for Chart.js dataset backgrounds.'
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

test('Tag chips use vanilla DaisyUI badge component', () => {
    // Every tag chip must render as a DaisyUI `badge badge-sm ${variant}` span,
    // never with the deleted `inline-block px-2 py-0.5 rounded-full text-xs
    // font-medium` Tailwind combo or an inline `style={getTagStyleObject(...)}`.
    const tagConsumers = [
        'dashboard/js/sections/Tags.jsx',
        'dashboard/js/sections/Timeline.jsx',
        'dashboard/js/sections/Contributors.jsx',
        'dashboard/js/components/DetailPane.jsx',
        'dashboard/js/sections/Health.jsx',
    ];
    for (const path of tagConsumers) {
        const src = read(path);
        // Each consumer must reference the DaisyUI badge class + the badge
        // helper. The exact JSX varies per consumer so we check both
        // signature substrings are present somewhere in the file.
        assert.match(
            src, /badge badge-sm/,
            `${path}: tag chip consumers must use \`badge badge-sm\` (DaisyUI badge component).`
        );
        assert.match(
            src, /getTagBadgeClass/,
            `${path}: tag chip consumers must call getTagBadgeClass(tag) for the variant class.`
        );
        // The deleted inline Tailwind tag-chip combo must not return.
        assert.doesNotMatch(
            src, /inline-block\s+px-2\s+py-0\.5\s+rounded-full\s+text-xs\s+font-medium/,
            `${path}: the pre-DaisyUI Tailwind tag-chip class combo was deleted 2026-04-14 — use the DaisyUI badge component.`
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

// ----- CLAUDE.md exception-list invariants (2026-04-15) -----
//
// Three audit passes over this branch progressively removed documented
// exceptions from CLAUDE.md "Frontend: Styles and Scripts". The tests
// below are REGRESSION GUARDS — they keep the final state locked in
// by enumerating the exact allowed instances and failing if new
// instances appear outside the documented scope. Each test corresponds
// to one CLAUDE.md exception category.
//
// If one of these tests fails, DO NOT just add the offender to the
// allowlist. Verify first that the new instance has a capability-gap
// or resilience rationale that warrants a documented exception in
// CLAUDE.md. If it does, update BOTH the allowlist here AND the
// exception list in CLAUDE.md in the same commit. If it doesn't,
// remove the offender instead.

/**
 * Recursively walk a directory, collecting file paths matching a regex.
 * Used by the exception-list invariant tests below. Pure Node — no
 * external dependencies (we're in node:test-land, not vitest-land).
 */
function walkFiles(dir, pattern, results = []) {
    const fs = require('node:fs');
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
        const full = join(dir, entry.name);
        if (entry.isDirectory()) {
            walkFiles(full, pattern, results);
        } else if (pattern.test(entry.name)) {
            results.push(full);
        }
    }
    return results;
}

// Dynamic require shim — node:test runs as ESM but we need readFileSync
// + readdirSync from node:fs in the walker. Use createRequire.
const { createRequire } = await import('node:module');
const require = createRequire(import.meta.url);

test('Exception invariant: arbitrary bracket values in JSX match CLAUDE.md allowlist exactly', () => {
    // CLAUDE.md documents exactly 4 permitted arbitrary bracket values.
    // Anything else in a JSX className triggers this test.
    //
    // If you see this test fail, read CLAUDE.md "Frontend: Styles and
    // Scripts" → "No arbitrary bracket values" rule first. The 4
    // documented exceptions each have a capability-gap rationale
    // (design-token z-scale above stock Tailwind, functional grid row
    // alignment, viewport calc max-width). A new bracket value requires
    // either rounding to stock, redesigning, or adding a 5th exception
    // with its own rationale.
    // The earlier `max-w-[calc(100vw-2rem)]` (HamburgerMenu.jsx) was
    // removed on 2026-04-15 — the max-width is now computed at runtime
    // from `window.innerWidth` in the portal positioning useLayoutEffect
    // and applied as an inline `style={{ maxWidth }}` which is an
    // allowed inline-style use case (portal positioning / runtime data).
    const ALLOWED_BRACKETS = new Set([
        'z-[var(--z-sticky-header)]',
        'z-[var(--z-toast)]',
        'grid-cols-[auto_repeat(7,1fr)]',
    ]);

    const jsxFiles = walkFiles(join(REPO_ROOT, 'dashboard/js'), /\.(jsx|js)$/);
    const offenders = [];
    // Match a Tailwind-style bracket utility: one or more words with
    // hyphens, followed by `-[...]`. Excludes JS array subscripts
    // like `arr[i]` because those require a preceding identifier+`[`
    // without the `-` infix.
    const BRACKET_RE = /\b[a-z][a-z0-9]*(?:-[a-z0-9]+)*-\[[^\]]+\]/g;

    for (const file of jsxFiles) {
        const src = readFileSync(file, 'utf8');
        // Strip JS/JSX line comments and block comments so documentation
        // mentions of bracket values don't trigger.
        const stripped = src
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
        // Only match inside className strings — the BRACKET_RE is permissive
        // enough that it could catch pure JS syntax, so extract className
        // attribute values first.
        const classNameRe = /className\s*=\s*[{'"`]([^{}'"`]+)[}'"`]/g;
        let cm;
        while ((cm = classNameRe.exec(stripped)) !== null) {
            const classString = cm[1];
            let bm;
            BRACKET_RE.lastIndex = 0;
            while ((bm = BRACKET_RE.exec(classString)) !== null) {
                const utility = bm[0];
                if (!ALLOWED_BRACKETS.has(utility)) {
                    offenders.push(`${file.replace(REPO_ROOT + '/', '')}: ${utility}`);
                }
            }
        }
    }

    assert.equal(
        offenders.length, 0,
        `Arbitrary bracket value(s) outside the CLAUDE.md allowlist:\n${offenders.join('\n')}\n\n` +
        'Allowed: ' + [...ALLOWED_BRACKETS].join(', ') + '\n' +
        'Add to CLAUDE.md "No arbitrary bracket values" exception list ONLY if the ' +
        'new value has a capability-gap rationale (no stock utility can express it, ' +
        'redesign is not feasible). Otherwise round to the nearest stock utility.'
    );
});

test('Exception invariant: hex colour literals in dashboard/js are scoped to the exception allowlist', () => {
    // CLAUDE.md documents two locations where hex literals are permitted:
    //   1. DebugPill subsystem: `components/DebugPill.jsx` AND every file
    //      under `components/debug/` (resilience — must render during
    //      CSS load failure in an isolated React root)
    //   2. `generated/themeMeta.js` (auto-generated PWA meta colours —
    //      browsers parse <meta content=""> as literal hex, not CSS vars)
    //
    // `themes.js` previously carried a `#808080` fallback; removed
    // 2026-04-15 in commit 0cc5d6e. Any hex literal outside the allowlist
    // triggers this test.
    //
    // Hex inside comments does NOT trigger — the stripped source has
    // comments removed before the match.
    const ALLOWED_DIRS = [
        'dashboard/js/components/DebugPill.jsx',
        'dashboard/js/components/debug/',
        'dashboard/js/generated/themeMeta.js',
    ];

    const jsxFiles = walkFiles(join(REPO_ROOT, 'dashboard/js'), /\.(jsx|js)$/);
    const offenders = [];
    const HEX_RE = /#[0-9a-fA-F]{6}\b/g;

    for (const file of jsxFiles) {
        const relPath = file.replace(REPO_ROOT + '/', '');
        // Skip allowlisted files.
        if (ALLOWED_DIRS.some(allowed => relPath === allowed || relPath.startsWith(allowed))) {
            continue;
        }
        const src = readFileSync(file, 'utf8');
        // Strip JS/JSX comments — hex mentions inside rationale blocks
        // (describing the removal) shouldn't trigger the regression check.
        const stripped = src
            .replace(/\/\*[\s\S]*?\*\//g, '')
            .replace(/(^|[^:])\/\/[^\n]*/g, '$1');
        let m;
        while ((m = HEX_RE.exec(stripped)) !== null) {
            offenders.push(`${relPath}: ${m[0]}`);
        }
    }

    assert.equal(
        offenders.length, 0,
        `Hex colour literal(s) outside the CLAUDE.md allowlist:\n${offenders.join('\n')}\n\n` +
        'Allowed locations:\n' +
        '  - dashboard/js/components/DebugPill.jsx (resilience)\n' +
        '  - dashboard/js/components/debug/* (resilience)\n' +
        '  - dashboard/js/generated/themeMeta.js (auto-generated PWA meta)\n\n' +
        'Use DaisyUI semantic tokens via runtime getComputedStyle resolvers ' +
        '(resolveRuntimeAccent / resolveRuntimeMuted in chartColors.js) instead.'
    );
});

test('Repo color invariant: active repos get only colorful tokens in every registered theme', () => {
    // chartColors.js resolveActiveRepoColor() filters ACTIVE_REPO_TOKENS by
    // oklch chroma at runtime (threshold 0.03) so active repos are always
    // visually distinct from the neutral gray used for internal/discontinued
    // repos. This test verifies the filtering at the source-data level by
    // reading each registered DaisyUI theme's token values and checking that
    // the expected number of tokens pass the chroma threshold.
    //
    // If a DaisyUI upgrade changes a theme's token values, this test will
    // catch the shift — either a colorful token became achromatic (fewer
    // palette slots for active repos) or an achromatic token gained chroma
    // (more slots, which is fine but should be reviewed).
    const ACTIVE_REPO_TOKENS = [
        'primary', 'secondary', 'accent', 'info', 'success', 'warning', 'error',
    ];
    const MIN_CHROMA = 0.03;
    const CHROMA_RE = /oklch\(\s*[\d.]+%?\s+([\d.]+)/;

    // Expected colorful-token count per registered theme. Update this map
    // when adding/removing themes in scripts/theme-config.js or when a
    // DaisyUI upgrade changes a token's chroma across the threshold.
    const EXPECTED_COLORFUL_COUNT = {
        lofi: 4,           // only info/success/warning/error
        nord: 7,           // all 7 tokens
        emerald: 7,
        caramellatte: 6,   // primary is achromatic (pure black)
        black: 4,          // primary/secondary/accent all achromatic
        dim: 7,
        coffee: 6,         // secondary chroma 0.029, just below threshold
        dracula: 7,
    };

    // Read theme-config.js to get the registered theme list.
    const themeConfigSrc = read('scripts/theme-config.js');
    const themeIdMatches = [...themeConfigSrc.matchAll(/id:\s*'([^']+)'/g)];
    const registeredThemes = themeIdMatches.map(m => m[1]);

    assert.ok(
        registeredThemes.length >= 4,
        `Expected at least 4 registered themes, found ${registeredThemes.length}`
    );

    for (const theme of registeredThemes) {
        // Import the DaisyUI theme object (same approach as generate-theme-meta.mjs)
        let themeObj;
        try {
            themeObj = require(`daisyui/theme/${theme}/object.js`);
            themeObj = themeObj.default || themeObj;
        } catch {
            assert.fail(`Could not import daisyui/theme/${theme}/object.js — is "${theme}" a valid DaisyUI theme?`);
        }

        // Count colorful tokens
        const colorfulTokens = [];
        const achromaticTokens = [];
        for (const token of ACTIVE_REPO_TOKENS) {
            const val = themeObj[`--color-${token}`];
            assert.ok(val, `Theme "${theme}" missing --color-${token}`);
            const match = val.match(CHROMA_RE);
            assert.ok(match, `Theme "${theme}" --color-${token} is not oklch format: ${val}`);
            const chroma = parseFloat(match[1]);
            if (chroma >= MIN_CHROMA) {
                colorfulTokens.push(token);
            } else {
                achromaticTokens.push(`${token} (${chroma})`);
            }
        }

        // At least 4 colorful tokens must survive (info/success/warning/error
        // are always colorful in DaisyUI stock themes)
        assert.ok(
            colorfulTokens.length >= 4,
            `Theme "${theme}" has only ${colorfulTokens.length} colorful tokens (need >= 4). ` +
            `Achromatic: ${achromaticTokens.join(', ')}`
        );

        // Verify exact expected count if registered in the map
        if (EXPECTED_COLORFUL_COUNT[theme] !== undefined) {
            assert.equal(
                colorfulTokens.length,
                EXPECTED_COLORFUL_COUNT[theme],
                `Theme "${theme}" colorful token count changed: expected ${EXPECTED_COLORFUL_COUNT[theme]}, ` +
                `got ${colorfulTokens.length}. Colorful: [${colorfulTokens.join(', ')}], ` +
                `achromatic: [${achromaticTokens.join(', ')}]. ` +
                'Update EXPECTED_COLORFUL_COUNT in this test if the change is intentional.'
            );
        }

        // Neutral must NOT be in ACTIVE_REPO_TOKENS — it's reserved for
        // internal/discontinued. Verify it exists in the theme (sanity).
        assert.ok(
            themeObj['--color-neutral'],
            `Theme "${theme}" missing --color-neutral`
        );
    }
});

test('Exception invariant: every JSX heading carries font-mono utility class', () => {
    // The `h1, h2, h3 { font-family: var(--font-mono) }` element-selector
    // rule in styles.css was deleted 2026-04-15 in commit 5bcc2c2. The
    // app's techy-developer-tool aesthetic still applies monospace to
    // headings, but via an explicit `font-mono` utility class on each
    // JSX heading rather than a cross-cutting CSS rule.
    //
    // This test enforces the contract: every `<h1>` / `<h2>` / `<h3>` in
    // dashboard/js must carry `font-mono` in its className. `<h4>` through
    // `<h6>` are intentionally excluded — the old styles.css rule targeted
    // h1-h3 only, and h4+ uses inherited body font.
    //
    // If a new heading is added without font-mono, either add the class
    // or promote the heading level (e.g., to h4) if the monospace styling
    // is undesired in that spot.
    const jsxFiles = walkFiles(join(REPO_ROOT, 'dashboard/js'), /\.jsx$/);
    const offenders = [];
    // Match: `<h1 ...>` or `<h2 ...>` or `<h3 ...>`, capturing everything
    // up to the closing `>` of the opening tag.
    const HEADING_RE = /<h[123]\b[^>]*>/g;

    for (const file of jsxFiles) {
        const src = readFileSync(file, 'utf8');
        let m;
        while ((m = HEADING_RE.exec(src)) !== null) {
            const openTag = m[0];
            if (!/\bfont-mono\b/.test(openTag)) {
                const lineNumber = src.slice(0, m.index).split('\n').length;
                offenders.push(`${file.replace(REPO_ROOT + '/', '')}:${lineNumber}: ${openTag.trim()}`);
            }
        }
    }

    assert.equal(
        offenders.length, 0,
        `JSX heading(s) missing font-mono utility class:\n${offenders.join('\n')}\n\n` +
        'The h1/h2/h3 element-selector rule in styles.css was deleted 2026-04-15. ' +
        'Every JSX heading must carry `font-mono` explicitly. Add it to the className ' +
        'or promote the heading level to h4+ if you want inherited body font.'
    );
});
