// Static + built-output smoke test for the PWA icon cache-busting wiring.
//
// Requirement: The fix in vite.config.js (content-hash `?v=<hash>` queries
//   appended to every icon URL) is brittle to silent regressions:
//
//     1. The `iconCacheBustHtml` Vite plugin string-replaces literal hrefs
//        in dashboard/index.html. If anyone reformats those tags (single
//        quotes, attribute reorder, query already present, leading slash
//        dropped) the plugin silently no-ops and we ship a manifest with
//        versioned icons but a <head> with un-versioned ones — bug only
//        shows up on the next icon change after deploy.
//     2. If `cleanupOutdatedCaches` or `ignoreURLParametersMatching` get
//        removed from the workbox config, the SW either keeps the previous
//        build's precache around indefinitely (1) or stops matching the
//        versioned URLs against precache (2), respectively.
//     3. The manifest icon entries could regress to plain (un-versioned)
//        URLs without anyone noticing — the manifest only changes when an
//        icon does, and visual-diff CI doesn't catch missing query strings.
//
// Approach: Two layers of assertions, mirroring the daisyui-surfaces tripwire:
//
//     - Source assertions (always run, no build dependency): verify
//       vite.config.js still has the iconCacheBustHtml plugin wired up
//       before VitePWA, the workbox options are present, and
//       dashboard/index.html still contains the exact literal hrefs the
//       plugin's REPLACEMENTS table looks for. The literal-href check is
//       the critical one — it prevents (1) above without needing a build.
//
//     - Built-output assertions (skip with a logged warning if dist/ is
//       missing): verify dist/manifest.webmanifest icons all have ?v=<8 hex>
//       queries, dist/index.html link tags all have ?v=<8 hex> queries with
//       NO un-versioned icon URLs leaking through, and dist/sw.js contains
//       both `cleanupOutdatedCaches()` and the `/^v$/` regex inside
//       ignoreURLParametersMatching. CI runs `vite build` before tests so
//       these assertions always execute in CI; local dev sees the skip log.
//
// Alternatives considered:
//   - Run `vite build` from inside the test: Rejected — adds 4s+ per test
//     run and pulls Vite into the test runtime (currently node:test only).
//     Existing tests (oklchToHex, daisyui-surfaces) take ~470ms total;
//     forcing a build here would 10x that.
//   - Snapshot tests on dist/ files: Rejected — file contents change every
//     time icons regenerate (hashes differ). Pattern matches express
//     "must match shape" without being noisy on every legitimate change.
//   - Only test source: Rejected — wouldn't catch a future breakage where
//     someone removes the plugin from the plugins[] array but leaves the
//     function defined (source assertion would still pass).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = join(__dirname, '..', '..');

const VITE_CONFIG = readFileSync(join(REPO_ROOT, 'vite.config.js'), 'utf8');
const INDEX_HTML = readFileSync(join(REPO_ROOT, 'dashboard', 'index.html'), 'utf8');

// ── Source assertions (always run) ──────────────────────────────────────

test('vite.config.js: iconCacheBustHtml plugin is defined', () => {
    assert.match(VITE_CONFIG, /function iconCacheBustHtml\s*\(/, 'iconCacheBustHtml function missing');
    // Plugin must declare its name so Vite logs reference it by name on
    // throw — matches the literal name used in the throw message above.
    assert.match(VITE_CONFIG, /name:\s*['"]icon-cache-bust-html['"]/, 'plugin name missing or renamed');
});

test('vite.config.js: iconCacheBustHtml is wired into plugins[] before VitePWA', () => {
    // Find the plugins array start and the VitePWA call. The plugin must
    // appear in source between them so Vite executes its transformIndexHtml
    // hook before VitePWA's manifest-link injection. (Today VitePWA only
    // appends a <link rel="manifest"> and doesn't touch icon links, so order
    // is neutral — but locking it in keeps the contract stable.)
    const pluginsStart = VITE_CONFIG.indexOf('plugins: [');
    const vitePwaIdx = VITE_CONFIG.indexOf('VitePWA(', pluginsStart);
    const iconPluginIdx = VITE_CONFIG.indexOf('iconCacheBustHtml()', pluginsStart);
    assert.ok(pluginsStart > 0, 'plugins[] array not found');
    assert.ok(vitePwaIdx > 0, 'VitePWA() call not found');
    assert.ok(iconPluginIdx > 0, 'iconCacheBustHtml() call missing from plugins array');
    assert.ok(
        iconPluginIdx < vitePwaIdx,
        `iconCacheBustHtml() must be placed before VitePWA() in plugins[] (got iconPluginIdx=${iconPluginIdx}, vitePwaIdx=${vitePwaIdx})`
    );
});

test('vite.config.js: workbox.cleanupOutdatedCaches is true', () => {
    assert.match(
        VITE_CONFIG,
        /cleanupOutdatedCaches:\s*true/,
        'cleanupOutdatedCaches:true must be set so cross-version Workbox precache stores get swept on activation'
    );
});

test('vite.config.js: workbox.ignoreURLParametersMatching includes /^v$/', () => {
    // Without this, Workbox precache won't match `icon-192.png?v=<hash>`
    // against the precached `icon-192.png` entry — every icon request would
    // fall through to the network even when the SW has a cached copy.
    assert.match(
        VITE_CONFIG,
        /ignoreURLParametersMatching:\s*\[[^\]]*\/\^v\$\//,
        'ignoreURLParametersMatching must include /^v$/ so precache lookup strips the cache-bust query'
    );
});

test('dashboard/index.html: contains the exact literal hrefs the plugin replaces', () => {
    // The iconCacheBustHtml plugin uses string-replace on these literals.
    // If anyone reformats the tags, the plugin throws at build time AND
    // this test fails — both signals point at the same fix.
    const REQUIRED_LITERALS = [
        'href="/assets/images/favicon.png"',
        'href="/favicon.ico"',
        'href="/apple-touch-icon.png"',
    ];
    for (const literal of REQUIRED_LITERALS) {
        assert.ok(
            INDEX_HTML.includes(literal),
            `dashboard/index.html must contain the literal \`${literal}\` for iconCacheBustHtml to find it. ` +
            `If you reformatted the tag, update the REPLACEMENTS table in vite.config.js to match.`
        );
    }
});

// ── Built-output assertions (skip if dist/ is missing) ──────────────────

const DIST_DIR = join(REPO_ROOT, 'dist');
const DIST_AVAILABLE = existsSync(DIST_DIR);

if (!DIST_AVAILABLE) {
    // node:test doesn't have a first-class skip-with-message at the top
    // level — log once so a fresh-clone dev run shows a clear breadcrumb
    // instead of silently passing only the source-level assertions.
    console.warn(
        '[icon-cache-bust] dist/ not found — skipping built-output assertions. ' +
        'Run `npm run build` (or `npx vite build`) to enable them. CI runs the build ' +
        'before tests so this branch is exercised in CI even if it skips locally.'
    );
}

const VERSIONED_ICON_RE = /\?v=[0-9a-f]{8}(?=[^0-9a-f]|$)/;

test('dist/manifest.webmanifest: all icon URLs are versioned', { skip: !DIST_AVAILABLE }, () => {
    const manifestPath = join(DIST_DIR, 'manifest.webmanifest');
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
    assert.ok(Array.isArray(manifest.icons) && manifest.icons.length > 0, 'manifest has no icons');
    for (const icon of manifest.icons) {
        assert.match(
            icon.src,
            VERSIONED_ICON_RE,
            `manifest icon "${icon.src}" must include a ?v=<8-char-hash> query — without it, browser HTTP cache, CDN, and Chrome WebAPK shadow keep serving the previous icon`
        );
    }
});

test('dist/index.html: all icon link tags are versioned', { skip: !DIST_AVAILABLE }, () => {
    const html = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');

    // Each rel="icon" / rel="apple-touch-icon" tag must have a ?v= query.
    // We extract every href on a <link rel="icon" | rel="apple-touch-icon">
    // line and verify it carries the cache-bust query.
    const iconLinkRe = /<link[^>]+rel="(?:icon|apple-touch-icon)"[^>]*>/g;
    const links = html.match(iconLinkRe) || [];
    assert.ok(links.length >= 3, `expected at least 3 icon <link> tags in dist/index.html, got ${links.length}`);

    for (const link of links) {
        const hrefMatch = link.match(/href="([^"]+)"/);
        assert.ok(hrefMatch, `<link> tag has no href: ${link}`);
        assert.match(
            hrefMatch[1],
            VERSIONED_ICON_RE,
            `dist/index.html <link> href "${hrefMatch[1]}" must include a ?v=<hash> query — the iconCacheBustHtml plugin should have rewritten it. Source literal probably drifted.`
        );
    }
});

test('dist/index.html: no un-versioned icon URLs leaked through', { skip: !DIST_AVAILABLE }, () => {
    const html = readFileSync(join(DIST_DIR, 'index.html'), 'utf8');
    // Look for any plain reference to the icons that should have been
    // versioned. Allow ?v= to appear; reject the bare URL.
    const PLAIN_REFS = [
        '/assets/images/favicon.png"',  // closing quote excludes ?v=... matches
        '/favicon.ico"',
        '/apple-touch-icon.png"',
    ];
    for (const ref of PLAIN_REFS) {
        assert.ok(
            !html.includes(ref),
            `dist/index.html still contains an un-versioned reference to "${ref}" — iconCacheBustHtml plugin missed it`
        );
    }
});

test('dist/sw.js: workbox SW has cleanupOutdatedCaches and ?v ignore', { skip: !DIST_AVAILABLE }, () => {
    const sw = readFileSync(join(DIST_DIR, 'sw.js'), 'utf8');
    assert.match(
        sw,
        /cleanupOutdatedCaches\(\)/,
        'dist/sw.js must call cleanupOutdatedCaches() — without it, cross-version Workbox precache stores linger forever'
    );
    // The minified SW serializes the regex array. Look for /^v$/ anywhere
    // inside an ignoreURLParametersMatching:[...] block. The minifier may
    // omit whitespace; allow /\^v\$/ to appear adjacent to the option name.
    assert.match(
        sw,
        /ignoreURLParametersMatching:\s*\[[^\]]*\/\^v\$\//,
        'dist/sw.js must include /^v$/ in ignoreURLParametersMatching — without it, versioned icon URLs miss the precache'
    );
});
