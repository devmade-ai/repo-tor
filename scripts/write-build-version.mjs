/**
 * Write a build-time version stamp to public/version.json.
 *
 * Requirement: Detect new deployments even when the SW file hasn't changed
 * Approach: Build-time JSON file with a timestamp, checked independently of
 *   the SW by pwa.js. If the stored buildTime differs from the fetched one,
 *   an update is surfaced to the user. A simple reload serves fresh assets
 *   because runtimeCaching uses NetworkFirst.
 * Pattern from: synctone scripts/write-build-version.mjs, few-lap same
 * Alternatives considered:
 *   - Rely only on SW hash changes: Rejected — misses config-only deployments
 *     (e.g. vercel.json header changes) where no precached files change
 *   - ETag/Last-Modified checks: Rejected — CDN may strip or normalize these
 *
 * Run as: node scripts/write-build-version.mjs
 * Called by: npm run build (prebuild step)
 */

import { writeFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outPath = resolve(__dirname, '..', 'dashboard', 'public', 'version.json');

writeFileSync(outPath, JSON.stringify({ buildTime: Date.now() }) + '\n');
console.log(`version.json written: ${new Date().toISOString()}`);
