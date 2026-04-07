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
  images/                  # Project-level copy (version-controlled, referenced by docs)
    icon.png               # 1024x1024 — main app icon
    adaptive-icon.png       # 1024x1024 — Android adaptive foreground
    splash-icon.png         # 1024x1024 — splash screen
    favicon.png             # 48x48 — browser tab
    icon-192.png            # 192x192 — PWA manifest (Android home screen)
    icon-512.png            # 512x512 — PWA manifest (Chrome install)
    apple-touch-icon.png    # 180x180 — iOS home screen icon
dashboard/
  public/
    assets/
      images/              # Vite public dir copy (served at /assets/images/ in dev and build)
        (same files)       # Generator writes to both directories in one pass
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

// Generate to both project-level and Vite public directories
const OUTPUT_DIRS = [
  join(ROOT, 'assets', 'images'),
  join(ROOT, 'dashboard', 'public', 'assets', 'images'),
];

const SVG_DENSITY = 400;

const ICONS = [
  { name: 'icon.png', size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'splash-icon.png', size: 1024 },
  { name: 'favicon.png', size: 48 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
];

async function generate() {
  const svgBuffer = readFileSync(SVG_SOURCE);
  for (const dir of OUTPUT_DIRS) {
    mkdirSync(dir, { recursive: true });
  }

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
  console.log(`Done — ${ICONS.length} icons generated to ${OUTPUT_DIRS.length} directories.`);
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

**Apple touch icon** (`index.html`):
```html
<link rel="apple-touch-icon" href="/assets/images/apple-touch-icon.png">
```

180x180 is the canonical size for modern iPhones (6+/X/11/12/13/14/15). iOS uses this when users add the site to their home screen. Without it, iOS takes a screenshot of the page instead — resulting in a blurry, unbranded icon.

**Expo config** (`app.json`): Point `expo.icon`, `expo.splash.image`, `android.adaptiveIcon.foregroundImage`, and `web.favicon` at the generated PNGs. Set `backgroundColor` on splash and adaptive icon to match the SVG background color.
