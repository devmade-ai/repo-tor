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
import { readFileSync, mkdirSync, copyFileSync, writeFileSync } from 'fs';
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
    { name: 'apple-touch-icon.png', size: 180 },
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

    // Requirement: favicon.ico for Windows taskbar pinning and legacy browsers
    // Approach: Manual ICO packing from a 32x32 PNG — zero extra dependencies
    // Alternatives:
    //   - png-to-ico package: Rejected — adds a dependency for a stable binary format
    //   - Skip .ico entirely: Rejected — inline SVG favicon doesn't cover legacy browsers
    // Pattern from: glow-props APP_ICONS.md (manual ICO packing)
    const favicon32 = await sharp(svgBuffer, { density: SVG_DENSITY })
        .resize(32, 32).png().toBuffer();

    const header = Buffer.alloc(6);
    header.writeUInt16LE(0, 0);  // Reserved
    header.writeUInt16LE(1, 2);  // Type: ICO
    header.writeUInt16LE(1, 4);  // Number of images

    const entry = Buffer.alloc(16);
    entry.writeUInt8(32, 0);     // Width
    entry.writeUInt8(32, 1);     // Height
    entry.writeUInt8(0, 2);      // Color palette
    entry.writeUInt8(0, 3);      // Reserved
    entry.writeUInt16LE(1, 4);   // Color planes
    entry.writeUInt16LE(32, 6);  // Bits per pixel
    entry.writeUInt32LE(favicon32.length, 8);  // Image size
    entry.writeUInt32LE(22, 12); // Offset (6 + 16 = 22)

    writeFileSync(join(IMAGES_DIR, 'favicon.ico'),
        Buffer.concat([header, entry, favicon32]));
    console.log(`  favicon.ico (32x32 ICO)`);

    // Copy all generated assets to Vite's public directory so they're served correctly.
    // Requirement: Vite root is dashboard/ — files in dashboard/public/ are served at /.
    //   The PWA manifest references assets/images/*.png, index.html references
    //   /assets/images/favicon.png, and Apple/legacy browsers need root-level icons.
    // Approach: Copy everything from assets/images/ to dashboard/public/assets/images/,
    //   plus root-level copies for apple-touch-icon and favicon.ico.
    // Alternatives:
    //   - Generate directly to dashboard/public/: Rejected — assets/images/ is the
    //     canonical location per APP_ICONS pattern, used by non-Vite consumers too
    //   - Manual copies: Rejected — drift risk, files go stale between regenerations
    //   - Symlink: Rejected — not portable across OS/deploy environments
    const PUBLIC_DIR = join(ROOT, 'dashboard', 'public');
    const PUBLIC_IMAGES_DIR = join(PUBLIC_DIR, 'assets', 'images');
    mkdirSync(PUBLIC_IMAGES_DIR, { recursive: true });

    for (const icon of ICONS) {
        copyFileSync(join(IMAGES_DIR, icon.name), join(PUBLIC_IMAGES_DIR, icon.name));
    }
    copyFileSync(join(IMAGES_DIR, 'favicon.ico'), join(PUBLIC_IMAGES_DIR, 'favicon.ico'));
    console.log(`  → synced ${ICONS.length} icons + favicon.ico to dashboard/public/assets/images/`);

    // Root-level copies for Apple and legacy browser auto-discovery
    copyFileSync(join(IMAGES_DIR, 'apple-touch-icon.png'), join(PUBLIC_DIR, 'apple-touch-icon.png'));
    copyFileSync(join(IMAGES_DIR, 'favicon.ico'), join(PUBLIC_DIR, 'favicon.ico'));
    console.log(`  → copied apple-touch-icon.png, favicon.ico to dashboard/public/`);

    console.log('');
    console.log(`Done — ${ICONS.length} icons + favicon.ico generated to assets/images/.`);
}

generate().catch((err) => {
    console.error('Icon generation failed:', err);
    process.exit(1);
});
