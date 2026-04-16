# Embed Mode

How to embed individual dashboard charts in external apps (e.g., a CV site).

**Status:** Implemented (Phase 1 — iframe-based embed mode with custom colors and auto-height)

---

## Usage

### Single chart

```html
<iframe
  src="https://repo-tor.vercel.app/?embed=activity-timeline"
  width="100%"
  height="400"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>

<!-- Auto-resize: the iframe height adjusts to fit the chart -->
<script src="https://repo-tor.vercel.app/embed.js"></script>
```

The `embed.js` script listens for resize messages from the iframe and adjusts its height automatically. Include it once — it handles all repo-tor iframes on the page.

The `height="400"` acts as a fallback while the chart loads. Once the chart renders, the iframe resizes to fit exactly.

### Multiple charts (single iframe, one bundle load)

```html
<iframe
  src="https://repo-tor.vercel.app/?embed=activity-timeline,tag-distribution"
  width="100%"
  height="800"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>

<script src="https://repo-tor.vercel.app/embed.js"></script>
```

### Light theme override

```html
<iframe
  src="https://repo-tor.vercel.app/?embed=activity-timeline&theme=light"
  width="100%"
  height="400"
  frameborder="0"
></iframe>
```

### Custom background color

```html
<!-- White background for a light-themed site -->
<iframe
  src="https://repo-tor.vercel.app/?embed=activity-timeline&bg=FFFFFF&theme=light"
  width="100%"
  height="400"
  frameborder="0"
></iframe>

<!-- Transparent — chart inherits the parent page's background -->
<iframe
  src="https://repo-tor.vercel.app/?embed=activity-timeline&bg=transparent&theme=light"
  width="100%"
  height="400"
  frameborder="0"
></iframe>

<!-- Match a custom dark background -->
<iframe
  src="https://repo-tor.vercel.app/?embed=activity-timeline&bg=0D1117"
  width="100%"
  height="400"
  frameborder="0"
></iframe>
```

### Custom colors

```html
<!-- Named palette preset -->
<iframe
  src="https://repo-tor.vercel.app/?embed=activity-timeline&palette=warm"
  width="100%"
  height="400"
  frameborder="0"
></iframe>

<!-- Custom color series for multi-dataset charts -->
<iframe
  src="https://repo-tor.vercel.app/?embed=activity-timeline&colors=FF6B35,004E89,1A936F"
  width="100%"
  height="400"
  frameborder="0"
></iframe>

<!-- Custom accent color for single-dataset charts and heatmaps -->
<iframe
  src="https://repo-tor.vercel.app/?embed=activity-heatmap&accent=FF6B35"
  width="100%"
  height="400"
  frameborder="0"
></iframe>

<!-- Combine: palette base + accent override + theme -->
<iframe
  src="https://repo-tor.vercel.app/?embed=hourly-distribution&palette=cool&accent=0077B6&theme=light"
  width="100%"
  height="400"
  frameborder="0"
></iframe>
```

See [EMBED_REFERENCE.md](EMBED_REFERENCE.md) for the full list of available chart IDs and color parameter details.

---

## URL Parameters

| Parameter | Format | Description |
|-----------|--------|-------------|
| `embed` | `chart-id` or `id1,id2,id3` | Required. Chart ID(s) to display |
| `theme` | `light` or `dark` | Optional. Override the default dark theme |
| `bg` | `hex` or `transparent` | Optional. Background color of the embedded element (default: `#1B1B1B`). Use `transparent` to inherit from your page |
| `palette` | preset name | Optional. Named color palette (see below) |
| `colors` | `hex1,hex2,...` | Optional. Custom series colors for multi-dataset charts. Overrides palette series |
| `accent` | `hex` | Optional. Primary accent color for single-dataset charts and heatmaps. Overrides palette accent |
| `muted` | `hex` | Optional. Secondary/muted color (after-hours bars, weekends, etc.) |

Hex values can include or omit the `#` prefix (e.g., `FF6B35` or `#FF6B35`).

### Color Parameter Priority

1. **Default palette** — built-in dashboard colors (blue, green, yellow, purple, red, cyan)
2. **`palette=name`** — replaces both series and accent with the named preset
3. **`colors=...`** — overrides the series colors (from default or palette)
4. **`accent=...`** — overrides the accent color (from default or palette)

### Named Palettes

| Name | Description | Series Preview |
|------|-------------|----------------|
| `default` | Dashboard defaults (blue-first) | `#2D68FF` `#16A34A` `#EAB308` `#a78bfa` `#EF4444` `#22d3ee` |
| `warm` | Warm tones — good for light backgrounds | `#E63946` `#F4A261` `#E9C46A` `#2A9D8F` `#264653` `#606C38` |
| `cool` | Cool tones — corporate / professional | `#0077B6` `#00B4D8` `#90E0EF` `#CAF0F8` `#023E8A` `#48CAE4` |
| `earth` | Natural, muted colors | `#606C38` `#283618` `#DDA15E` `#BC6C25` `#FEFAE0` `#9B2226` |
| `vibrant` | High contrast, colorful | `#FF006E` `#8338EC` `#3A86FF` `#06D6A0` `#FFD166` `#EF476F` |
| `mono` | Single-hue blue variations | `#1D4ED8` `#3B82F6` `#60A5FA` `#93C5FD` `#BFDBFE` `#DBEAFE` |

---

## How It Works

1. `urlParams.js` reads `?embed=`, `?theme=`, `?bg=`, `?data=` at module load time
2. `App.jsx` checks `embedIds` from urlParams; if present it routes to `EmbedRenderer`
3. `?theme=light|dark` is applied via `applyTheme()` with `skipPersist=true` so the override is session-scoped
4. `?bg=hex|transparent` overrides `--color-base-100` directly for the embed page background
5. Data loads normally from `./data.json` (or `?data=URL`)
6. `CollapsibleSection` detects `isEmbedMode` and short-circuits to render `{children}` only — no card wrapper, no header, no collapse
7. `EmbedRenderer` maps each embed ID to the tab component(s) that contain it, deduplicating
8. Only the required tabs render
9. `useLayoutEffect` hides all top-level container children, then shows only those containing a matching `[data-embed-id]` element
10. Chart dataset colours resolve DaisyUI semantic CSS variables at runtime via `chartColors.js` — every chart tracks the active theme automatically, no per-embed override needed
11. Debug banner is suppressed entirely in embed mode
12. A `ResizeObserver` watches the embed container and posts `{ type: 'repo-tor:resize', height }` to the parent window whenever content size changes

### Color Architecture (vanilla DaisyUI)

The 2026-04-14 vanilla-DaisyUI sweep deleted every brand-hex palette and every chart-colour URL override. Charts now track the active DaisyUI theme via runtime resolution — there's no "branded embed" option beyond picking a theme.

`dashboard/js/chartColors.js` exposes:
- `resolveRuntimeAccent()` — reads `--color-primary` at call time
- `resolveRuntimeMuted()` — returns `color-mix(in oklab, var(--color-base-content) 40%, transparent)`
- `getSeriesColor(i)` — cycles through 8 DaisyUI semantic tokens (primary → secondary → accent → info → success → warning → error → neutral) for general chart series
- `buildRepoColorMap(repos)` — repo-category-aware map builder. Internal repos get `dimNeutral(0.6)`, discontinued repos get `dimNeutral(0.3)`, active repos cycle through `resolveActiveRepoColor(i)` which filters to colorful-only tokens at runtime (oklch chroma ≥ 0.03), guaranteeing active repos are visually distinct from the neutral grays even in monochrome themes (lofi, black)

**How colours flow to charts:**
- `AppContext` dispatches `SET_THEME_COLORS` after every `applyTheme()` call, populating `state.themeAccent` / `state.themeMuted`
- Chart `useMemo` deps include `state.themeAccent` / `state.themeMuted` so datasets rebuild on theme change
- For multi-dataset charts that need distinct colours, `getSeriesColor(i)` resolves fresh per call — charts with >8 series cycle through the palette
- Repo-specific stacked charts use `buildRepoColorMap()` which filters achromatic tokens so active repos always get colorful assignments. In monochrome themes, only the 4 status tokens (info/success/warning/error) survive; colorful themes use all 7 candidate tokens
- Tag colours (`badge-success`, `badge-error`, etc.) track the theme via DaisyUI's semantic tokens; Chart.js tag datasets use `resolveTagSemanticColor(tag)` which maps each tag to one of the 8 semantic CSS variables and reads it at runtime

### Files

| File | Role |
|------|------|
| `dashboard/js/chartColors.js` | Runtime DaisyUI semantic colour resolvers (general 8-token cycle + chroma-filtered repo cycle) |
| `dashboard/js/urlParams.js` | Parses `?embed=`, `?theme=`, `?bg=`, `?data=` once at module load |
| `dashboard/js/App.jsx` | Routes to `EmbedRenderer` when `embedIds` is set |
| `dashboard/js/components/CollapsibleSection.jsx` | Short-circuits to `<>{children}</>` in embed mode (no card/header/collapse) |
| `dashboard/js/components/EmbedRenderer.jsx` | Maps IDs to tabs, hides non-target container children, posts height to parent |
| `dashboard/public/embed.js` | Standalone auto-resize helper for parent pages (copied to `dist/embed.js`) |

---

## Auto-Height

Embedded charts resize their iframe automatically — no need to guess a `height` value.

### Quick Setup

Add the `embed.js` script to your page. It handles all repo-tor iframes automatically:

```html
<iframe
  src="https://repo-tor.vercel.app/?embed=activity-timeline"
  width="100%"
  height="400"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>

<script src="https://repo-tor.vercel.app/embed.js"></script>
```

Include the script once — it handles any number of repo-tor iframes on the page. The `height="400"` acts as a fallback while the chart loads.

### How It Works

1. `EmbedRenderer` attaches a `ResizeObserver` to the embed container
2. Whenever the content size changes (initial render, chart animation, viewport resize), the iframe posts a message to `window.parent`
3. The message format is: `{ type: 'repo-tor:resize', height: <number> }`
4. `embed.js` on the parent page listens for this message and sets the iframe height

The observer fires are debounced via `requestAnimationFrame` to avoid flooding the parent during animations.

### Manual Listener (Advanced)

If you prefer not to include the helper script, add your own listener:

```html
<script>
window.addEventListener('message', function (event) {
  if (!event.data || event.data.type !== 'repo-tor:resize') return;
  // Find the iframe that sent this message
  var iframes = document.querySelectorAll('iframe');
  for (var i = 0; i < iframes.length; i++) {
    if (iframes[i].contentWindow === event.source) {
      iframes[i].style.height = event.data.height + 'px';
      break;
    }
  }
});
</script>
```

### Opting Out

If you don't want auto-height, simply don't include `embed.js` and don't add a `message` event listener. The iframe will use whatever `height` attribute you set. The postMessage calls are harmless if nobody is listening.

---

## Future Enhancements (Optional)

### Accept data via URL

```
?embed=activity-timeline&data=https://example.com/my-data.json
```

App.jsx would fetch from this URL instead of the default `./data.json`.

### postMessage API (data push)

Currently, postMessage is used for resize notifications (iframe → parent). A future enhancement could add parent → iframe data push:

```javascript
const iframe = document.querySelector('iframe');
iframe.contentWindow.postMessage({ type: 'LOAD_DATA', payload: myData }, '*');
```

### Vite Library Build (Phase 2)

For React-to-React apps that want direct component imports without iframes:

```javascript
import { ActivityTimeline } from 'repo-tor/charts';
<ActivityTimeline data={myData} theme="dark" />
```

---

## Alternatives Considered

### Web Components (wrap charts as custom HTML elements)

**Pros:** Framework-agnostic, no iframe, feels native in the consuming app.
**Cons:** Requires a separate Vite library build entry point, bundles React + Chart.js into the embed script (~200KB+), more complex build config.
**Verdict:** Good upgrade path if iframe limitations become a problem. Not needed for initial implementation.

### Vite Library Mode (export as npm package)

**Pros:** Cleanest integration for React-to-React. Tree-shakeable. Shared React instance.
**Cons:** Only works if the consuming app is React. Requires publishing to npm or using a git dependency.
**Verdict:** Best for teams sharing components across multiple React apps. Overkill for a CV embed.

### Static Image Export (PNG/SVG download)

**Pros:** Zero integration complexity. Works in PDFs, Google Docs, anywhere.
**Cons:** Not interactive. Static snapshot — doesn't update with new data.
**Verdict:** Could be added as a complementary feature (Chart.js supports `toBase64Image()` natively). Not a replacement for live embedding.

### CSS Variable Overrides for Colors

**Pros:** Familiar CSS API, could be set by parent page styles.
**Cons:** CSS variables can't cross iframe boundaries — the parent page's styles don't reach into the iframe. Would only work for same-origin embeds or with `postMessage`.
**Verdict:** Rejected for iframe-based embeds. URL parameters are simpler and work cross-origin.

---

## Security Considerations

- **CORS:** The iframe approach works cross-origin by default (no server-side changes needed)
- **Color params:** Only hex color values are accepted; values are prefixed with `#` if missing. No script injection vector.
- **Data URL param:** If implemented, validate the URL and consider an allowlist to prevent loading arbitrary data
- **postMessage (resize):** The iframe sends height data outward — no security risk. The parent should still check `event.data.type === 'repo-tor:resize'` to avoid acting on unrelated messages
- **postMessage (data push):** If implemented, validate `event.origin` before accepting data from the parent frame
- **Content-Security-Policy:** The dashboard's CSP (if any) should allow `frame-ancestors` for the domains that will embed it

---

## Testing Checklist

- [ ] `?embed=activity-timeline` shows only the activity timeline chart, no header/tabs
- [ ] `?embed=invalid-id` shows a clear error message
- [ ] `?embed=debt-trend` with no debt data shows appropriate empty state
- [ ] Charts are responsive within the iframe at various widths
- [ ] Dark theme works in embed mode
- [ ] Normal dashboard (no `?embed=` param) is unaffected
- [ ] Iframe works from a different origin (cross-origin embed)
- [ ] `?embed=activity-timeline&bg=FFFFFF` uses white background
- [ ] `?embed=activity-timeline&bg=transparent` has no background (inherits from page)
- [ ] `?embed=activity-timeline&bg=0D1117` uses custom dark background
- [ ] `?embed=activity-timeline&bg=FFFFFF&theme=light` white bg with light text/grid colors
- [ ] Decorative grid pattern (body::before) is hidden in all embed mode views
- [ ] Full dashboard (no embed/color params) renders with default colors unchanged
- [ ] Auto-height: iframe receives `repo-tor:resize` message with correct height after chart renders
- [ ] Auto-height: iframe resizes when browser window is resized
- [ ] Auto-height: no messages sent when not in an iframe (normal dashboard)
- [ ] Auto-height: multiple iframes each report their own height independently

---

*Last updated: 2026-02-19 — Added embed.js auto-resize helper script.*
