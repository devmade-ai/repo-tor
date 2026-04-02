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
const IMAGES_DIR = join(ROOT, 'assets', 'images');

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
];

async function generate() {
    const svgBuffer = readFileSync(SVG_SOURCE);
    mkdirSync(IMAGES_DIR, { recursive: true });

    console.log(`Source: ${SVG_SOURCE}`);
    console.log(`Density: ${SVG_DENSITY} DPI`);
    console.log('');

    for (const icon of ICONS) {
        await sharp(svgBuffer, { density: SVG_DENSITY })
            .resize(icon.size, icon.size)
            .png()
            .toFile(join(IMAGES_DIR, icon.name));
        console.log(`  ${icon.name} (${icon.size}x${icon.size})`);
    }

    console.log('');
    console.log(`Done — ${ICONS.length} icons generated to assets/images/.`);
}

generate().catch((err) => {
    console.error('Icon generation failed:', err);
    process.exit(1);
});
