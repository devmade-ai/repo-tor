#!/usr/bin/env node
/**
 * Generate PNG icons from SVG source for PWA manifest, favicon, and app icons.
 *
 * Requirement: Single SVG source of truth, regenerate all PNGs with one command
 * Approach: Sharp converts SVG → PNG at 400 DPI for crisp edges at all sizes
 * Alternatives:
 *   - Manual export from Figma/Inkscape: Rejected — error-prone, not reproducible
 *   - ImageMagick: Rejected — Sharp is already common in Node ecosystems, better API
 *
 * Pattern adopted from glow-props CLAUDE.md "App Icons from SVG Source"
 *
 * Usage: node scripts/generate-icons.mjs
 * Requires: npm install --save-dev sharp
 */

import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SVG_SOURCE = join(ROOT, 'assets', 'icon-source.svg');

// Requirement: Icons must exist in both locations
// Approach: Generate to both directories in one pass
// - assets/images/ — project-level source of truth (referenced by docs, version-controlled)
// - dashboard/public/assets/images/ — Vite public dir (served at /assets/images/ in dev and build)
// Alternatives:
//   - Symlink: Rejected — cross-platform issues on Windows, confusing in git
//   - Copy step in build script: Rejected — easy to forget, icons drift out of sync
//   - Single output to dashboard/public/: Rejected — breaks convention of assets/ at project root
const OUTPUT_DIRS = [
    join(ROOT, 'assets', 'images'),
    join(ROOT, 'dashboard', 'public', 'assets', 'images'),
];

// 400 DPI: ~5.5x the default 72 DPI. Sharp rasterizes the SVG at this density
// before downscaling, so edges are anti-aliased from high-res source data.
// The 192px PWA icon benefits most — edges are noticeably crisper.
const SVG_DENSITY = 400;

const ICONS = [
    { name: 'icon.png', size: 1024 },
    { name: 'adaptive-icon.png', size: 1024 },
    { name: 'splash-icon.png', size: 1024 },
    { name: 'favicon.png', size: 48 },
    { name: 'icon-192.png', size: 192 },
    { name: 'icon-512.png', size: 512 },
    // Requirement: Apple touch icon for iOS home screen
    // Approach: 180x180 is the canonical size Apple recommends for modern iPhones
    // Referenced via <link rel="apple-touch-icon"> in index.html
    { name: 'apple-touch-icon.png', size: 180 },
];

async function generate() {
    const svgBuffer = readFileSync(SVG_SOURCE);
    for (const dir of OUTPUT_DIRS) {
        mkdirSync(dir, { recursive: true });
    }

    console.log(`Source: ${SVG_SOURCE}`);
    console.log(`Density: ${SVG_DENSITY} DPI`);
    console.log(`Output: ${OUTPUT_DIRS.length} directories`);
    console.log('');

    for (const icon of ICONS) {
        const pngBuffer = await sharp(svgBuffer, { density: SVG_DENSITY })
            .resize(icon.size, icon.size)
            .png()
            .toBuffer();
        for (const dir of OUTPUT_DIRS) {
            await sharp(pngBuffer).toFile(join(dir, icon.name));
        }
        console.log(`  ${icon.name} (${icon.size}x${icon.size})`);
    }

    console.log('');
    console.log(`Done — ${ICONS.length} icons generated to ${OUTPUT_DIRS.length} directories.`);
}

generate().catch((err) => {
    console.error('Icon generation failed:', err);
    process.exit(1);
});
