// Visual regression baselines for the DaisyUI v5 component-class migration.
//
// Requirement: Catch silent visual regressions that the source-level and
//   runtime smoke tests can't see — e.g. a DaisyUI class pair that
//   compiles and passes DOM assertions but renders with the wrong border
//   radius, the wrong background tint, or a theme token that fails to
//   resolve. The 2026-04-13 audit found that the `-bordered` v4 cruft
//   had shipped WITHOUT any test catching it because the visual result
//   looked correct (v5 makes bordered default). Screenshot baselines
//   are the last line of defence against that class of regression.
//
// Approach: For each of the 6 dashboard tabs × each of the 8 registered
//   themes (4 light + 4 dark), capture a full-page screenshot and
//   compare against a committed baseline. Playwright's `toHaveScreenshot`
//   handles the diff with a configurable pixel-difference threshold.
//   Baselines live in `dashboard/e2e/visual/__screenshots__/` and are
//   generated once via `npm run test:visual:update`, then committed to
//   git so CI runs can diff against them.
//
// Alternatives considered:
//   - Percy / Chromatic: Rejected — external SaaS adds cost + latency
//     and stores screenshots outside the repo. Playwright's built-in
//     snapshot comparison keeps everything in-repo and auditable.
//   - Single-theme baselines: Rejected — would only catch regressions
//     in the default theme and miss the theme-token resolution bugs
//     the migration is most likely to hit.
//   - Responsive baselines (mobile + desktop): Viable future extension
//     but not for this first pass. Desktop 1280x720 (matches the
//     TESTING_GUIDE walkthrough viewport) is the priority.
//
// Maintenance:
//   - When intentional visual changes land (new section, redesigned
//     component, updated DaisyUI theme), run `npm run test:visual:update`
//     locally to regenerate baselines, review the diffs, and commit the
//     new PNG files.
//   - Treat unexpected diffs as regressions until proven otherwise.
//   - Don't update baselines just to clear CI — figure out why the
//     diff exists first.
//
// Performance note: 6 tabs × 8 themes = 48 screenshots. Each takes
// ~500ms–1s (page navigation + theme switch + settle + capture), so
// the full suite runs in ~1 minute. Tolerable on CI, skipped by default
// locally (run explicitly via `npm run test:visual`).

import { test, expect } from '@playwright/test';

// Themes registered in scripts/theme-config.js. If that list changes,
// update this array to match — the smoke test in
// `scripts/__tests__/daisyui-surfaces.test.mjs` verifies that the
// theme-config.js catalog stays in sync with the generated meta file,
// so this list being stale is visible in code review.
const LIGHT_THEMES = ['lofi', 'nord', 'emerald', 'caramellatte'];
const DARK_THEMES = ['black', 'dim', 'coffee', 'dracula'];

// Tab list mirrors TabBar.jsx. Label is the user-visible text; id is
// the internal identifier stored in state.activeTab.
const TABS = [
    { label: 'Summary', id: 'overview' },
    { label: 'Timeline', id: 'activity' },
    { label: 'Breakdown', id: 'work' },
    { label: 'Health', id: 'health' },
    { label: 'Discover', id: 'discover' },
    { label: 'Projects', id: 'projects' },
];

// Switch the dashboard to a specific theme via localStorage + reload.
// Using the burger-menu picker would work too but is slower and flakier
// (depends on the picker UI, focus state, etc.). Writing to localStorage
// and reloading goes through the flash-prevention script + AppContext
// bootstrap path, which is the same code path users hit on fresh load.
async function applyTheme(page, themeName, isDark) {
    await page.evaluate(({ theme, dark }) => {
        if (dark) {
            window.localStorage.setItem('darkMode', 'true');
            window.localStorage.setItem('darkTheme', theme);
        } else {
            window.localStorage.setItem('darkMode', 'false');
            window.localStorage.setItem('lightTheme', theme);
        }
    }, { theme: themeName, dark: isDark });
    // Reload so the inline flash-prevention script + AppContext bootstrap
    // re-read the new values. This is the same path a user hits when
    // opening the dashboard for the first time after picking a theme.
    await page.reload();
    await expect(page.getByText('Loading dashboard…')).toBeHidden({ timeout: 30_000 });
    // Verify the DOM actually applied the theme (sanity check — catches
    // a broken theme plugin registration before the screenshot runs).
    await expect(page.locator('html')).toHaveAttribute('data-theme', themeName);
}

async function gotoTab(page, label) {
    await page.getByRole('tab', { name: label }).click();
    await expect(page.getByRole('tab', { name: label })).toHaveAttribute('aria-selected', 'true');
    // Let charts + animations settle before capture. Chart.js renders
    // asynchronously via requestAnimationFrame, so a fixed timeout is
    // more reliable than a waitForLoadState here.
    await page.waitForTimeout(800);
}

// Per-theme, per-tab screenshot. Generating 48 test functions via a
// double for-loop keeps the test report readable — Playwright reports
// "visual > <theme> > <tab>" rows that are clickable individually.
for (const theme of [...LIGHT_THEMES, ...DARK_THEMES]) {
    const isDark = DARK_THEMES.includes(theme);
    test.describe(`visual — ${theme} (${isDark ? 'dark' : 'light'})`, () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/');
            await expect(page.getByText('Loading dashboard…')).toBeHidden({ timeout: 30_000 });
            await applyTheme(page, theme, isDark);
        });

        for (const tab of TABS) {
            test(`${tab.label} tab`, async ({ page }) => {
                await gotoTab(page, tab.label);
                // Full-page screenshot. `fullPage: true` captures everything
                // below the fold so long scrolling sections (Breakdown,
                // Projects) are in the baseline too.
                //
                // `maxDiffPixelRatio: 0.002` = 0.2% of pixels can differ
                // before the test fails. This absorbs font-rendering
                // variance across headless Chromium versions without
                // letting real regressions slip through.
                await expect(page).toHaveScreenshot(`${theme}-${tab.id}.png`, {
                    fullPage: true,
                    maxDiffPixelRatio: 0.002,
                });
            });
        }
    });
}
