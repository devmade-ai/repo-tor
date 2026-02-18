# Embed Mode

How to embed individual dashboard charts in external apps (e.g., a CV site).

**Status:** Implemented (Phase 1 — iframe-based embed mode)

---

## Usage

### Single chart

```html
<iframe
  src="https://devmade-ai.github.io/repo-tor/?embed=activity-timeline"
  width="100%"
  height="400"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>
```

### Multiple charts (single iframe, one bundle load)

```html
<iframe
  src="https://devmade-ai.github.io/repo-tor/?embed=activity-timeline,tag-distribution"
  width="100%"
  height="800"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>
```

### Light theme override

```html
<iframe
  src="https://devmade-ai.github.io/repo-tor/?embed=activity-timeline&theme=light"
  width="100%"
  height="400"
  frameborder="0"
></iframe>
```

See [EMBED_REFERENCE.md](EMBED_REFERENCE.md) for the full list of available chart IDs.

---

## URL Parameters

| Parameter | Format | Description |
|-----------|--------|-------------|
| `embed` | `chart-id` or `id1,id2,id3` | Required. Chart ID(s) to display |
| `theme` | `light` or `dark` | Optional. Override the default dark theme |

---

## How It Works

1. `App.jsx` reads `?embed=` from the URL at module load time
2. If present, `?theme=` is also checked and applied to `<html>` class
3. Data loads normally from `./data.json`
4. Instead of the full dashboard, `EmbedRenderer` is rendered
5. `EmbedRenderer` maps each embed ID to the tab component(s) that contain it
6. Only the required tabs render (deduplicated — two charts in one tab = one tab render)
7. `useLayoutEffect` hides all `.card` elements, then shows only those containing a matching `data-embed-id`
8. CSS removes card borders, section headers, and padding for clean chart display
9. Debug banner is suppressed entirely in embed mode

### Files

| File | Role |
|------|------|
| `dashboard/js/App.jsx` | Reads `?embed=` and `?theme=` params, routes to `EmbedRenderer` |
| `dashboard/js/components/EmbedRenderer.jsx` | Maps IDs to tabs, renders tabs, hides non-target sections |
| `dashboard/styles.css` | `.embed-mode` styles (transparent cards, hidden headers, error state) |
| `dashboard/js/main.jsx` | Skips debug banner creation in embed mode |
| `dashboard/js/tabs/*.jsx` | Each chart container has `data-embed-id` attribute |

---

## Future Enhancements (Optional)

### Accept data via URL

```
?embed=activity-timeline&data=https://example.com/my-data.json
```

App.jsx would fetch from this URL instead of the default `./data.json`.

### postMessage API

For tighter integration with a parent app:

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

---

## Security Considerations

- **CORS:** The iframe approach works cross-origin by default (no server-side changes needed for GitHub Pages)
- **Data URL param:** If implemented, validate the URL and consider an allowlist to prevent loading arbitrary data
- **postMessage:** Validate `event.origin` before accepting data from the parent frame
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

---

*Last updated: 2026-02-18 — Phase 1 implemented (iframe embed mode with multi-chart and theme support).*
