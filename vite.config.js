import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = resolve(__dirname, 'dashboard', 'public');

// Requirement: When the icon PNGs change, re-installing the PWA must show the
//   new icon — not the old one cached by the browser HTTP layer, the Vercel
//   CDN, the Workbox precache, or Chrome's WebAPK shadow.
// Approach: SHA-256 each icon file at config-load time, take the first 8 chars,
//   and append `?v=<hash>` to the URL in (a) the PWA manifest icon entries and
//   (b) the static <link rel="icon|apple-touch-icon"> tags in index.html via a
//   small transformIndexHtml plugin. New URL -> fresh fetch at every cache
//   layer; manifest icon URL change -> Chrome WebAPK regeneration. Paired with
//   workbox.cleanupOutdatedCaches + ignoreURLParametersMatching below so the
//   SW also drops the old precache entries on the next activation.
// Alternatives considered:
//   - Rename files (icon-192.v2.png): Rejected — requires bumping the source
//     filename on every change AND keeping legacy names around for transition.
//   - Vite asset-graph hashing: Rejected — vite-plugin-pwa copies includeAssets
//     verbatim with no hash insertion, and dashboard/public/ files bypass the
//     asset graph entirely (Vite serves them at root as-is).
//   - Manual version constant: Rejected — drifts the moment someone forgets to
//     bump it after running `npm run generate-icons`.
// Note: OS-level icon caches (Springboard / Android launcher / Windows icon
//   cache / macOS Icon Services) are platform-controlled and cannot be
//   invalidated by URL changes. A full uninstall is still required there. This
//   fix unblocks every cache layer the web app actually controls.
function iconVersion(relPath) {
  const full = resolve(PUBLIC_DIR, relPath);
  if (!existsSync(full)) {
    // Requirement: A missing icon must not silently produce `?v=0` URLs that
    //   ship to production unnoticed (would break cache-busting AND look
    //   broken to users — 404s on every favicon request).
    // Approach: Warn loudly at config-load time. We don't throw because a
    //   first-time clone may legitimately not have icons yet (npm install
    //   runs before `npm run generate-icons`), and we don't want to break
    //   `npm run dev` for that case. The CI build step runs generate-icons
    //   first, so production builds always have real hashes.
    // Alternatives:
    //   - Throw on missing: Rejected — breaks fresh-clone dev flow.
    //   - Silent '0': Original behavior, rejected — the warning here is
    //     what catches "I deleted icons by accident" before it reaches prod.
    console.warn(
      `[iconVersion] missing icon at ${full} — using '0' as version. ` +
      `Run \`npm run generate-icons\` to regenerate.`
    );
    return '0';
  }
  return createHash('sha256').update(readFileSync(full)).digest('hex').slice(0, 8);
}

const ICON_PATHS = [
  'assets/images/icon-192.png',
  'assets/images/icon-512.png',
  'assets/images/icon.png',
  'assets/images/favicon.png',
  'favicon.ico',
  'apple-touch-icon.png',
];

const ICON_VERSIONS = Object.fromEntries(
  ICON_PATHS.map((p) => [p, iconVersion(p)])
);

const versioned = (relPath) => `${relPath}?v=${ICON_VERSIONS[relPath]}`;

// Vite plugin: rewrite the static icon link tags in index.html so the browser
// fetches a unique URL whenever the icon contents change. Pairs with the
// versioned manifest icon URLs in the VitePWA config below.
//
// Requirement: A reformat of index.html (single-quoted attrs, attribute
//   reorder, query already present, leading slash dropped, ...) must not
//   silently no-op the cache-bust. `String.replace` returns the original
//   string when the literal is missing; that would let us ship a manifest
//   with versioned icons but a <head> with un-versioned ones, and the bug
//   would only surface on the next icon change after deploy.
// Approach: Walk a list of (literal -> replacement) pairs and assert the
//   literal appears in the source HTML before replacing. Failure is a
//   build-time throw with a clear message pointing at the affected file
//   and literal — caught by `vite build`, by `vite dev`, and by the
//   icon-cache-bust smoke test which exercises this path on every `npm test`.
// Alternatives:
//   - Regex with optional whitespace: Rejected — silently brittle to attr
//     reordering, and gives no signal when the regex stops matching.
//   - String.replaceAll: Rejected — same silent-no-op failure mode.
//   - Generated marker block in index.html (like flash-prevention-meta):
//     Rejected — adds a build artifact in source, the assertion approach
//     keeps the source HTML clean and pushes the contract into the test.
function iconCacheBustHtml() {
  const REPLACEMENTS = [
    {
      from: 'href="/assets/images/favicon.png"',
      to: () => `href="/${versioned('assets/images/favicon.png')}"`,
    },
    {
      from: 'href="/favicon.ico"',
      to: () => `href="/${versioned('favicon.ico')}"`,
    },
    {
      from: 'href="/apple-touch-icon.png"',
      to: () => `href="/${versioned('apple-touch-icon.png')}"`,
    },
  ];

  return {
    name: 'icon-cache-bust-html',
    transformIndexHtml(html) {
      let out = html;
      for (const { from, to } of REPLACEMENTS) {
        if (!out.includes(from)) {
          throw new Error(
            `[icon-cache-bust-html] expected literal not found in index.html: ${from}\n` +
            `  This plugin appends ?v=<hash> to the static icon link tags. If you ` +
            `reformatted the tag (single quotes, attribute reorder, ...), update the ` +
            `REPLACEMENTS table in vite.config.js to match. The icon-cache-bust ` +
            `smoke test (scripts/__tests__/icon-cache-bust.test.mjs) catches this ` +
            `same drift at test time.`
          );
        }
        out = out.replace(from, to());
      }
      return out;
    },
  };
}

export default defineConfig({
  root: 'dashboard',
  // Vercel serves at root — no base path prefix needed
  // (was './' for GitHub Pages relative paths)
  base: '/',
  build: {
    outDir: '../dist',
    emptyOutDir: true,
    // Disable sourcemaps in production to reduce bundle size
    sourcemap: false,
  },
  plugins: [
    react(),
    tailwindcss(),
    iconCacheBustHtml(),
    VitePWA({
      registerType: 'prompt',
      // Requirement: data.json (2.68MB) must NOT be precached — exceeds Workbox 2MB limit
      // Approach: Exclude *.json from includeAssets, list only small static assets explicitly
      // data.json is handled via runtimeCaching with NetworkFirst instead
      includeAssets: ['assets/images/*.png', 'projects.json', 'repos/*.json'],
      manifest: {
        name: 'Git Analytics Dashboard',
        short_name: 'Git Analytics',
        description: 'Visual analytics reports for git commit history',
        // Requirement: Stable app identity for PWA install
        // Approach: Explicit id prevents Chrome from deriving it from start_url
        // Alternatives: Omit id — rejected, breaks install identity on config changes/redeployments
        id: '/',
        theme_color: '#bd93f9',
        background_color: '#282a36',
        display: 'standalone',
        // Requirement: Ensure beforeinstallprompt fires on Chromium
        // Approach: Explicit false prevents Chrome from skipping install prompt
        // Alternatives: Omit — rejected, Chrome may think a native app exists and suppress prompt
        prefer_related_applications: false,
        icons: [
          {
            src: versioned('assets/images/icon-192.png'),
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: versioned('assets/images/icon-512.png'),
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: versioned('assets/images/icon.png'),
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // Requirement: When Workbox itself bumps a major version (or we ever
        //   change the precache cache name), the old precache store must not
        //   linger in the browser holding onto the previous build's icons,
        //   HTML, and JS bundle indefinitely.
        // Approach: cleanupOutdatedCaches deletes any cache whose name uses
        //   an older `workbox-precache-*` prefix than the active SW, on
        //   activation. Note: same-prefix entries with stale revisions are
        //   already replaced by Workbox's normal precache install flow — this
        //   option is specifically about cross-version orphans, not per-build
        //   cleanup. (This narrative was overstated in the original commit;
        //   see HISTORY.md 2026-04-16 strengthening entry.)
        // Alternatives: manual cache.delete() in an activate handler —
        //   rejected, Workbox already handles this correctly.
        cleanupOutdatedCaches: true,
        // Requirement: Versioned icon URLs (`?v=<hash>`) must still hit the
        //   Workbox precache. By default Workbox only strips `utm_*` queries
        //   before matching, so `icon-192.png?v=abc` would miss the precached
        //   `icon-192.png` entry and fall through to the network every time.
        // Approach: Add `/^v$/` to ignoreURLParametersMatching so precache
        //   lookup strips the cache-bust query and still serves from cache
        //   offline. Paired with the icon hashing above in vite.config.js.
        ignoreURLParametersMatching: [/^utm_/, /^v$/],
        // Requirement: User-controlled updates — no auto-skipWaiting
        // Approach: Omit skipWaiting and clientsClaim so the new SW waits until
        //   the user explicitly triggers applyUpdate() (which calls updateSW(true)).
        //   This matches synctone, few-lap, and canva-grid patterns.
        // Alternatives considered:
        //   - skipWaiting: true + clientsClaim: true: Rejected — conflicts with
        //     registerType:'prompt'. The SW activates immediately and controllerchange
        //     reloads the page before the user ever sees the update prompt.
        //   - autoUpdate registerType: Rejected — user should control when reloads happen,
        //     especially mid-analysis in the dashboard.
        // Requirement: Embed mode iframes must bypass the SW navigation fallback
        // Approach: navigateFallbackDenylist skips cached index.html for ?embed= URLs,
        //   forcing them to go directly to the network (Vercel). This prevents stale
        //   cached responses from serving old X-Frame-Options headers that block
        //   cross-origin iframes (e.g. see-veo embedding repo-tor charts).
        // Alternatives considered:
        //   - Custom SW fetch handler: Rejected — requires injectManifest mode, more complex
        //   - Strip headers in SW plugin: Rejected — can't modify precached responses retroactively
        navigateFallbackDenylist: [/[?&]embed=/],
        // Requirement: Branded offline page as last-resort fallback
        // Approach: offline.html is precached via globPatterns (*.html). For normal
        //   navigation, precached index.html serves as the SPA shell (always available).
        //   For embed URLs (denylist skips navigateFallback), a runtimeCaching rule
        //   catches failed navigation with a NetworkOnly handler + offline fallback.
        // Pattern from: few-lap sw.js networkFirstWithOfflineFallback()
        // data.json excluded from precache — too large (2.68MB > Workbox 2MB limit)
        // Handled via runtimeCaching with NetworkFirst below instead
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}', 'projects.json'],
        runtimeCaching: [
          {
            // Runtime cache for data.json (summary file, ~126KB)
            // NetworkFirst: always fetch latest data, fall back to cache when offline
            urlPattern: /\/data\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dashboard-data',
              expiration: {
                maxEntries: 1,
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            // Runtime cache for per-month commit files (data-commits/YYYY-MM.json)
            // Requirement: Cache time-windowed commit files for offline access
            // Approach: NetworkFirst so latest data is always fetched, with offline fallback
            // Alternatives: CacheFirst — rejected, commit data changes when reprocessed
            urlPattern: /\/data-commits\/.*\.json$/,
            handler: 'NetworkFirst',
            options: {
              cacheName: 'dashboard-commits',
              expiration: {
                maxEntries: 36, // Up to 3 years of monthly files
                maxAgeSeconds: 60 * 60 * 24 * 7, // 7 days
              },
            },
          },
          {
            urlPattern: /^https:\/\/cdn\.jsdelivr\.net/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'jsdelivr-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/cdnjs\.cloudflare\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'cdnjs-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30,
              },
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com/,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'google-fonts-stylesheets',
            },
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webfonts',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365, // 1 year
              },
            },
          },
        ],
      },
    }),
  ],
  server: {
    open: true,
  },
});
