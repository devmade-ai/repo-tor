// Requirement: Library build for direct React component import
// Approach: Separate Vite config that exports key components as an ES module.
//   Consumers import via: import { App, AppProvider } from 'repo-tor'
//   React, ReactDOM, and Chart.js are externalized (peer dependencies).
// Alternatives:
//   - Single config with mode flag: Rejected — too complex, mixes app and lib concerns
//   - Rollup directly: Rejected — Vite handles JSX, Tailwind, and tree-shaking already
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  root: 'dashboard',
  plugins: [
    react(),
    tailwindcss(),
  ],
  build: {
    outDir: '../dist-lib',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: 'js/lib.js',
      formats: ['es'],
      fileName: 'repo-tor',
    },
    rollupOptions: {
      // Externalize peer dependencies — consumers provide their own
      external: [
        'react',
        'react-dom',
        'react/jsx-runtime',
        'chart.js',
        'react-chartjs-2',
      ],
    },
  },
});
