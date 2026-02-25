import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'dashboard',
  base: './',
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
      includeAssets: ['icons/*.png', 'icons/*.svg', '*.json', 'repos/*.json'],
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
        // Narrowed from **/*.{json} to specific files to avoid caching large data files
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}', 'data.json', 'projects.json'],
        runtimeCaching: [
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
