# Embed Mode — Implementation Plan

How to allow individual dashboard elements to be pulled into external apps (e.g., a CV site).

---

## Approach: URL-Based Embed Mode (iframe)

The simplest approach. Add a `?embed=<chart-id>` query parameter to the dashboard URL. When present, the app renders only the requested chart — no header, tabs, sidebar, or other chrome.

The consuming app uses a standard `<iframe>` to pull it in.

### Usage

```html
<!-- Embed the activity timeline chart in another app -->
<iframe
  src="https://devmade-ai.github.io/repo-tor/?embed=activity-timeline"
  width="100%"
  height="400"
  frameborder="0"
  style="border: none; border-radius: 8px;"
></iframe>
```

See [EMBED_REFERENCE.md](EMBED_REFERENCE.md) for the full list of available `data-embed-id` values.

---

## Implementation Steps

### 1. Read `embed` param in App.jsx

At the top of the `App` component, read the query parameter:

```javascript
const embedId = useMemo(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('embed');
}, []);
```

### 2. Add embed mode rendering path

When `embedId` is set, skip the full dashboard layout and render only the matching element:

```javascript
// In App.jsx, after data is loaded:
if (embedId && state.data) {
    return (
        <div className="embed-container">
            <EmbedRenderer embedId={embedId} />
        </div>
    );
}
```

### 3. Create EmbedRenderer component

A new component at `dashboard/js/components/EmbedRenderer.jsx` that:

1. Maps `embedId` strings to the specific chart sub-component
2. Renders that chart in isolation (full-width, no CollapsibleSection wrapper)
3. Shows a clean error state if the ID is invalid

```javascript
// Mapping structure
const EMBED_MAP = {
    'activity-timeline': { tab: 'TimelineTab', section: 'Activity Timeline' },
    'tag-distribution': { tab: 'TagsTab', section: 'Tag Distribution' },
    // ... all 13 IDs
};
```

**Design decision:** Rather than extracting each chart into its own component (large refactor), the simplest approach is to render the full tab component but use CSS to hide everything except the target `data-embed-id` element:

```css
/* When in embed mode, hide everything except the target chart */
.embed-container [data-embed-id] {
    display: none;
}
.embed-container [data-embed-id="TARGET"] {
    display: block;
}
```

This avoids duplicating chart logic or extracting 13 sub-components. The tab still computes all its charts, but only the target is visible.

### 4. Embed-specific CSS

Add to `dashboard/styles.css`:

```css
/* Embed mode — minimal chrome, transparent background */
.embed-container {
    padding: 16px;
    background: var(--bg-primary);
    min-height: 100vh;
}

/* Hide CollapsibleSection header in embed mode (chart only, no title) */
.embed-container .collapsible-header {
    display: none;
}
```

### 5. Optional: Accept data via URL

For embedding with custom data (not the dashboard's `data.json`), support a `data` query param:

```
?embed=activity-timeline&data=https://example.com/my-data.json
```

App.jsx would fetch from this URL instead of the default `./data.json`.

### 6. Optional: postMessage API

For tighter integration with a parent app, support receiving data via `window.postMessage`:

```javascript
// In consuming app:
const iframe = document.querySelector('iframe');
iframe.contentWindow.postMessage({ type: 'LOAD_DATA', payload: myData }, '*');
```

This allows the parent app to push data without hosting a separate JSON file.

---

## File Changes Required

| File | Change |
|------|--------|
| `dashboard/js/App.jsx` | Read `?embed=` param, conditional render path |
| `dashboard/js/components/EmbedRenderer.jsx` | **New file** — maps embed ID to tab + shows only target chart |
| `dashboard/styles.css` | Add `.embed-container` styles |
| `dashboard/js/main.jsx` | Skip debug banner and error overlay in embed mode |

### Files Already Changed (this session)

| File | Change |
|------|--------|
| `dashboard/js/tabs/TimelineTab.jsx` | Added `data-embed-id` to 2 charts |
| `dashboard/js/tabs/TimingTab.jsx` | Added `data-embed-id` to 3 elements |
| `dashboard/js/tabs/ProgressTab.jsx` | Added `data-embed-id` to 3 charts |
| `dashboard/js/tabs/ContributorsTab.jsx` | Added `data-embed-id` to 1 chart |
| `dashboard/js/tabs/TagsTab.jsx` | Added `data-embed-id` to 1 chart |
| `dashboard/js/tabs/HealthTab.jsx` | Added `data-embed-id` to 3 charts |

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

*Last updated: 2026-02-18 — Initial implementation plan.*
