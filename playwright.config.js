// Playwright configuration for the repo-tor dashboard.
//
// Requirement: Browser-runtime smoke test coverage for the DaisyUI v5
//   component-class migration. The source-level class-name tripwire lives
//   in `scripts/__tests__/daisyui-surfaces.test.mjs` and runs on every
//   `npm test` invocation without needing a browser. This config drives
//   the real-browser pass that verifies the full rendered DOM, actually
//   resolves CSS, and walks the TESTING_GUIDE "DaisyUI component-class
//   migration" checklist.
// Approach: Single Playwright project suite with two logical subsets —
//   the default "smoke" project runs the DOM-assertion specs against all
//   6 dashboard tabs, and the "visual" project runs the same flows with
//   screenshot baselines per theme (4 light + 4 dark = 8 baselines per
//   tab). Both launch against the built `dist/` output served by
//   `vite preview`, started automatically via the `webServer` config.
// Alternatives considered:
//   - Serve via `npm run dev` (Vite dev server with HMR): Rejected —
//     tests must verify the PRODUCTION build (minified CSS, code-split
//     bundles, tree-shaken DaisyUI classes) because that's what ships.
//     Dev-mode CSS is unminified and includes dev-only rules.
//   - Multiple projects per theme: Rejected — the theme picker is an
//     in-app interaction, so driving it via Playwright's beforeEach hook
//     is cleaner than baking 8 separate projects into the config.
//   - Vitest + Playwright integration: Rejected — adds a test-runner
//     layer we don't need; Playwright's own runner handles everything
//     we use.
//
// Browser setup (CI / local):
//   The Playwright package is installed as a dev dependency but the
//   browser binaries are NOT committed. Run `npm run test:e2e:install`
//   to fetch Chromium + OS dependencies once per machine/CI runner.
//   After that, `npm run test:e2e` runs the smoke suite, and
//   `npm run test:visual` runs the screenshot baselines.
//
//   In sandboxed environments where Playwright's CDN is blocked, install
//   a system Chromium via the package manager and point Playwright at it
//   via the PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH env variable — the
//   `launchOptions` block below reads that variable so a system browser
//   works as a drop-in replacement for Playwright's managed binary.
//
// Test files live under dashboard/e2e/. See dashboard/e2e/README.md for
// the structure rationale and the full TESTING_GUIDE cross-reference.

import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './dashboard/e2e',
    // Fail CI builds that forget to remove test.only() annotations.
    forbidOnly: !!process.env.CI,
    // 0 local retries (surface flakiness immediately), 2 on CI (transient
    // network blips + slow cold starts on GitHub Actions runners).
    retries: process.env.CI ? 2 : 0,
    // Single worker locally keeps the dev-server logs readable; parallel
    // on CI for throughput.
    workers: process.env.CI ? undefined : 1,
    // HTML reporter for local debugging, dot reporter on CI so logs are
    // tailable.
    reporter: process.env.CI ? 'dot' : [['html', { open: 'never' }], ['list']],

    use: {
        // vite preview defaults to 4173 — matches the webServer config below.
        baseURL: 'http://127.0.0.1:4173',
        // Capture trace on retry so failures in CI are debuggable without
        // re-running locally. Trace-on-first-retry is cheap (skipped when
        // tests pass) and standard across Playwright adoption guides.
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'retain-on-failure',
        // Headless everywhere by default; pass `--headed` to the CLI for
        // local debugging.
        headless: true,
    },

    projects: [
        {
            // Smoke project: DOM assertions for DaisyUI class names, ARIA
            // attributes, and interaction flows. Matches every spec EXCEPT
            // the visual regression ones (which live under `visual/`).
            name: 'smoke',
            testIgnore: /visual\//,
            use: {
                ...devices['Desktop Chrome'],
                // Allow an environment-provided Chromium for sandboxed CI.
                // Unset value keeps Playwright's managed binary.
                launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
                    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
                    : undefined,
            },
        },
        {
            // Visual project: screenshot baselines per theme. Deliberately
            // filtered to visual/**/*.spec.js so the smoke run stays fast.
            // Screenshot comparison uses Playwright's built-in toHaveScreenshot
            // with a 0.2 pixel difference threshold — tight enough to catch
            // regressions, loose enough to tolerate font-rendering variance
            // across Linux headless Chromium versions.
            name: 'visual',
            testMatch: /visual\/.*\.spec\.js/,
            use: {
                ...devices['Desktop Chrome'],
                // Pin viewport so screenshot dimensions are deterministic.
                // 1280x720 matches the common "laptop" size used in the
                // TESTING_GUIDE manual walkthrough.
                viewport: { width: 1280, height: 720 },
                launchOptions: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH
                    ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
                    : undefined,
            },
        },
    ],

    // Launch `vite preview` automatically — tests always run against the
    // production build, and `reuseExistingServer` makes local iteration
    // fast when the preview is already running from another terminal.
    webServer: {
        command: 'npm run build && npm run preview -- --strictPort',
        url: 'http://127.0.0.1:4173',
        reuseExistingServer: !process.env.CI,
        timeout: 180_000, // Account for a cold build on slow CI runners
        stdout: 'pipe',
        stderr: 'pipe',
    },
});
