# End-to-End Tests

Browser-runtime and visual regression tests for the repo-tor dashboard.

## Overview

Three layers of automated test coverage:

| Layer | Tool | Where | When it runs |
|-------|------|-------|--------------|
| **Unit / source** | `node:test` | `scripts/__tests__/*.test.mjs` | Every `npm test` (no browser) |
| **Runtime smoke** | Playwright | `dashboard/e2e/*.spec.js` | `npm run test:e2e` |
| **Visual regression** | Playwright + screenshot baselines | `dashboard/e2e/visual/*.spec.js` | `npm run test:visual` |

The unit tier is the fast tripwire — it runs in milliseconds and catches source-level class-name regressions. The runtime smoke tier verifies the real DOM after React renders, and the visual regression tier catches silent visual drift that passes class-name assertions.

All three were added in the 2026-04-13 DaisyUI v5 component-class migration follow-up. See `docs/HISTORY.md` for the full migration log.

## Quick reference

```bash
# Unit / source tests (no browser)
npm test

# Install Chromium once per machine (~170MB download)
npm run test:e2e:install

# Browser smoke — walks the TESTING_GUIDE DaisyUI migration checklist
npm run test:e2e

# Interactive debugging UI
npm run test:e2e:ui

# Visual regression — diff against committed screenshot baselines
npm run test:visual

# Update screenshot baselines after an intentional visual change
npm run test:visual:update
```

## `daisyui-surfaces.spec.js` — runtime smoke

Walks the same "DaisyUI component-class migration" checklist that lives in `docs/TESTING_GUIDE.md`, but automated in a real Chromium instance.

Each `test()` block asserts that a specific migrated surface renders with the expected DaisyUI class on the expected element **after** React has rendered + CSS has resolved. This catches:

- Class-name regressions that slip past the source-level tripwire (e.g. a conditional className that only triggers in a specific React state).
- Portal / stacking-context bugs (the HamburgerMenu test walks the DOM tree to verify the dropdown is parented to `document.body`, not the `.dashboard-header` subtree).
- Chart.js theme tracking (the theme-change test picks a different theme via localStorage, reloads, and asserts the chart dataset's resolved `backgroundColor` has changed).
- Interaction state — modals open and close, filter sidebar multi-selects expose DaisyUI checkboxes only when their dropdown is open, etc.

When a new component is migrated to or away from a DaisyUI class, add a corresponding `test()` block here AND update `docs/TESTING_GUIDE.md` so the manual-test source-of-truth stays synchronized.

## `visual/theme-baselines.spec.js` — visual regression

Captures a full-page screenshot for each of the 6 dashboard tabs × each of the 8 registered themes (4 light + 4 dark = 48 screenshots). Baselines are committed to `dashboard/e2e/visual/__screenshots__/` and diffed on every CI run.

**When to update baselines**: only after an intentional visual change lands. Run `npm run test:visual:update` locally, review the regenerated PNGs carefully, and commit them in the same change that produced the visual difference. Never update baselines just to silence CI — figure out why the diff exists first.

**Why 48 screenshots and not just 6**: the 2026-04-13 `-bordered` v4 cruft bug slipped past the class-name tests because the visual result looked correct in the default `lofi` theme (v5 makes bordered default). Capturing per-theme baselines is the only way to catch theme-token resolution bugs that only surface when the user picks a specific theme.

## Browser setup

### Standard path (most environments)

```bash
npm run test:e2e:install
```

This downloads Chromium + OS dependencies via Playwright's managed binary path. ~170MB download, runs once per machine or CI runner.

### Sandboxed / firewalled environments

If Playwright's CDN is blocked (some corporate networks, some CI sandboxes), install a system Chromium via the OS package manager and point Playwright at it:

```bash
# Debian/Ubuntu
sudo apt-get install -y chromium
export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium
npm run test:e2e
```

The `playwright.config.js` `launchOptions` block honors `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` so a system browser works as a drop-in replacement.

### CI configuration

For GitHub Actions the recommended step is:

```yaml
- name: Install Playwright Browsers
  run: npx playwright install --with-deps chromium

- name: Run E2E tests
  run: npm run test:e2e

- name: Run visual regression
  run: npm run test:visual
```

The `--with-deps` flag installs the Linux system dependencies Chromium needs (libnss3, libatk1.0, etc.) so no extra apt-get step is required.

## Troubleshooting

### Tests fail with "Loading dashboard…" timeout

The preview server is serving the built dashboard but `data.json` is missing or malformed. Run `npm run build` to regenerate `dist/` and check that `dashboard/public/data.json` exists.

### Visual tests fail with tiny pixel diffs on a fresh machine

Font rendering varies slightly across Linux headless Chromium versions. The baseline threshold is 0.2% pixel difference (`maxDiffPixelRatio: 0.002` in the visual spec) — if real regressions slip through, tighten this; if false positives appear, loosen it. Don't update baselines to silence tiny diffs without investigating first.

### "Host not allowed" when installing Chromium

You're on a network that blocks `cdn.playwright.dev`. Use the system-Chromium path documented above.

### Tests pass locally but fail on CI

Check that CI uses the same Playwright version as `package.json` (pinned to `^1.59.1` at time of writing). CI may use a stale cached browser — force re-install with `npx playwright install --force chromium`.

## Related docs

- `docs/TESTING_GUIDE.md` — Manual test scenarios (the source-of-truth that these specs automate)
- `docs/DAISYUI_V5_NOTES.md` — v4→v5 renames and project conventions
- `docs/HISTORY.md` 2026-04-13 — Full migration log
- `playwright.config.js` — Project structure + browser config
- `scripts/__tests__/daisyui-surfaces.test.mjs` — Source-level class-name tripwire that runs without a browser
