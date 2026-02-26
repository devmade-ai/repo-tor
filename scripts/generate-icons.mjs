#!/usr/bin/env node
/**
 * Generate PNG icons from SVG source for PWA manifest and favicon.
 *
 * Requirement: Single SVG source of truth, regenerate all PNGs with one command
 * Approach: Sharp converts SVG → PNG at each required size
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
const SVG_SOURCE = join(ROOT, 'dashboard', 'icons', 'icon.svg');
const ICONS_DIR = join(ROOT, 'dashboard', 'icons');
const PUBLIC_ICONS_DIR = join(ROOT, 'dashboard', 'public', 'icons');

// Icon sizes needed for PWA manifest, favicon, and Apple touch icon
const ICONS = [
    { name: 'icon-512.png', size: 512 },
    { name: 'icon-192.png', size: 192 },
    { name: 'apple-touch-icon.png', size: 180 },
    { name: 'favicon.png', size: 48 },
];

async function generate() {
    const svgBuffer = readFileSync(SVG_SOURCE);
    mkdirSync(ICONS_DIR, { recursive: true });
    mkdirSync(PUBLIC_ICONS_DIR, { recursive: true });

    console.log(`Source: ${SVG_SOURCE}`);
    console.log('');

    for (const icon of ICONS) {
        // Generate to both icons/ (dev) and public/icons/ (build)
        const targets = [
            join(ICONS_DIR, icon.name),
            join(PUBLIC_ICONS_DIR, icon.name),
        ];

        for (const target of targets) {
            await sharp(svgBuffer)
                .resize(icon.size, icon.size)
                .png()
                .toFile(target);
        }
        console.log(`  ${icon.name} (${icon.size}x${icon.size})`);
    }

    console.log('');
    console.log(`Done — ${ICONS.length} icons generated to icons/ and public/icons/.`);
}

generate().catch((err) => {
    console.error('Icon generation failed:', err);
    process.exit(1);
});
