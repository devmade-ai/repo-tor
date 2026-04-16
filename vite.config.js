import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

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
            src: 'assets/images/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'assets/images/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: 'assets/images/icon.png',
            sizes: '1024x1024',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
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
