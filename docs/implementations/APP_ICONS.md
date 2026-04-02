# App Icons from SVG Source

Single SVG source file, Sharp converts to all needed PNG sizes at 400 DPI for crisp edges. One command regenerates everything.

**Dependencies:** `sharp` (devDependency)

```bash
npm install --save-dev sharp
```

**File structure:**
```
assets/
  icon-source.svg          # Source of truth — edit this, regenerate PNGs
  images/
    icon.png               # 1024x1024 — main app icon
    adaptive-icon.png       # 1024x1024 — Android adaptive foreground
    splash-icon.png         # 1024x1024 — splash screen
    favicon.png             # 48x48 — browser tab
    icon-192.png            # 192x192 — PWA manifest (Android home screen)
    icon-512.png            # 512x512 — PWA manifest (Chrome install)
scripts/
  generate-icons.mjs       # Sharp conversion script
```

**Generator script** (`scripts/generate-icons.mjs`):

```javascript
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
// The 192px PWA icon benefits most — arc and needle edges are noticeably crisper.
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

  for (const icon of ICONS) {
    await sharp(svgBuffer, { density: SVG_DENSITY })
      .resize(icon.size, icon.size)
      .png()
      .toFile(join(IMAGES_DIR, icon.name));
    console.log(`  ${icon.name} (${icon.size}x${icon.size})`);
  }
  console.log(`Done — ${ICONS.length} icons generated.`);
}

generate().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
```

**Run:** `node scripts/generate-icons.mjs`

**SVG design rules for maskable icons:**
- Canvas must be square (e.g. `viewBox="0 0 1024 1024"`)
- Add `shape-rendering="geometricPrecision"` to the root `<svg>` element — tells the rasterizer to prioritize accurate geometry over speed
- Background fills entire canvas (no transparency)
- Important content stays within the inner 80% (safe zone for maskable crop)
- Design must be legible at 48px (favicon) — avoid fine details
- No gradients, opacity, glow, or fade — solid colors only for clean rasterization

**PWA manifest icons** (`manifest.json`):
```json
"icons": [
  { "src": "/assets/images/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "/assets/images/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
  { "src": "/assets/images/icon.png", "sizes": "1024x1024", "type": "image/png", "purpose": "maskable" }
]
```

Separate `purpose` values: `any` for standard display (192, 512), `maskable` for the full-bleed 1024. Don't combine `"any maskable"` — browsers pick the wrong one.

**Expo config** (`app.json`): Point `expo.icon`, `expo.splash.image`, `android.adaptiveIcon.foregroundImage`, and `web.favicon` at the generated PNGs. Set `backgroundColor` on splash and adaptive icon to match the SVG background color.
