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
      includeAssets: ['icons/*.png', 'icons/*.svg', 'projects.json', 'repos/*.json'],
      manifest: {
        name: 'Git Analytics Dashboard',
        short_name: 'Git Analytics',
        description: 'Visual analytics reports for git commit history',
        theme_color: '#2D68FF',
        background_color: '#1B1B1B',
        display: 'standalone',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
          {
            src: 'icons/icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
        ],
      },
      workbox: {
        skipWaiting: true,
        clientsClaim: true,
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
