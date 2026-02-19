# Embeddable Elements Reference

Quick reference for all dashboard elements that can be embedded in external applications.

Each element has a `data-embed-id` attribute on its container div. Use these IDs to target specific charts when embedding.

---

## Chart.js Charts

Interactive charts rendered with Chart.js via react-chartjs-2. These are the primary candidates for embedding.

| Embed ID | Tab | Chart Type | What It Shows |
|----------|-----|------------|---------------|
| `activity-timeline` | Timeline | Bar (stacked) | Daily commit counts over the last 60 days, colored by repository |
| `code-changes-timeline` | Timeline | Bar (stacked) | Net code changes (additions minus deletions) per day |
| `hourly-distribution` | Timeline | Bar | Commits by hour of day (0-23), work hours highlighted in blue |
| `daily-distribution` | Timeline | Bar | Commits by day of week (Mon-Sun), weekdays vs weekends |
| `feature-vs-bugfix-trend` | Breakdown | Line | Monthly feature count vs bug fix count over time |
| `complexity-over-time` | Breakdown | Line | Average commit complexity (1-5 scale) per month |
| `semver-distribution` | Breakdown | Doughnut | Distribution of patch / minor / major version changes |
| `contributor-complexity` | Breakdown | Bar (horizontal) | Average complexity per top 8 contributors |
| `tag-distribution` | Breakdown | Doughnut | Distribution of all commit tags (feature, fix, refactor, etc.) |
| `urgency-trend` | Health | Line | Average urgency (1-5) per month over time |
| `impact-over-time` | Health | Bar (stacked) | Monthly breakdown by impact type (user-facing, internal, infrastructure, API) |
| `debt-trend` | Health | Line | Monthly tech debt added vs paid down |

### Conditional Charts

Some charts only render when the data contains the relevant fields:

| Embed ID | Condition |
|----------|-----------|
| `hourly-distribution` | Only in Developer view level (`viewConfig.timing === 'hour'`) |
| `semver-distribution` | Only when commits have `semver` field values |
| `debt-trend` | Only when commits have `debt` field values |

---

## HTML Visualizations

Non-Chart.js elements rendered as styled HTML. Also tagged with `data-embed-id`.

| Embed ID | Tab | What It Shows |
|----------|-----|---------------|
| `activity-heatmap` | Timeline | Commit activity heatmap (format changes by view level — weekly blocks, day-of-week bars, or 24x7 hourly grid) |

---

## Best Candidates for a CV / Portfolio

For showcasing development activity on a CV or portfolio site, these charts tell the strongest story:

| Use Case | Recommended Embed ID | Why |
|----------|---------------------|-----|
| "I ship consistently" | `activity-timeline` | Shows steady commit cadence over time |
| "I write more than I break" | `feature-vs-bugfix-trend` | Shows feature-to-bug ratio trend |
| "I handle complex work" | `complexity-over-time` | Shows ability to tackle high-complexity tasks |
| "I work across the stack" | `tag-distribution` | Shows breadth of work types |
| "I contribute the most" | `contributor-complexity` | Shows your complexity relative to team |
| "I'm active and consistent" | `activity-heatmap` | Visual heatmap of when work happens |

---

## Custom Colors

Embedding apps can customize chart colors via URL parameters. This is useful when the dashboard's default blue doesn't match the embedding site's brand.

### URL Parameters

| Parameter | Format | Example | Description |
|-----------|--------|---------|-------------|
| `bg` | hex or `transparent` | `bg=FFFFFF` | Background color of the embedded element (default: dark `#1B1B1B`) |
| `palette` | preset name | `palette=warm` | Apply a named color palette |
| `colors` | comma-separated hex | `colors=FF6B35,004E89,1A936F` | Custom series colors for multi-dataset charts |
| `accent` | hex | `accent=FF6B35` | Primary color for single-dataset charts and heatmaps |
| `muted` | hex | `muted=999999` | Secondary color for contrast elements (after-hours, weekends) |

Hex values work with or without the `#` prefix.

### Quick Examples

```html
<!-- White background for a light-themed site -->
?embed=activity-timeline&bg=FFFFFF&theme=light

<!-- Transparent background — inherits from your page -->
?embed=activity-timeline&bg=transparent&theme=light

<!-- Custom dark background to match your site -->
?embed=activity-timeline&bg=0D1117

<!-- Match your brand color -->
?embed=activity-timeline&accent=FF6B35

<!-- Use a preset palette -->
?embed=activity-timeline&palette=warm

<!-- Full control: background + series + accent + light theme -->
?embed=activity-timeline&bg=FFFFFF&colors=FF6B35,004E89,1A936F&accent=FF6B35&theme=light
```

### Available Palettes

| Name | Style | Accent |
|------|-------|--------|
| `default` | Dashboard blue-first palette | `#2D68FF` |
| `warm` | Warm reds and oranges | `#E63946` |
| `cool` | Corporate blues and teals | `#0077B6` |
| `earth` | Natural greens and browns | `#606C38` |
| `vibrant` | High contrast, colorful | `#FF006E` |
| `mono` | Single-hue blue variations | `#1D4ED8` |

### What Colors Affect

| Chart Type | What Changes | Parameter |
|------------|-------------|-----------|
| Stacked bars (activity, code changes, impact) | Bar segment colors for each dataset/repo | `colors` or `palette` |
| Single bars (hourly, daily distribution) | Work-hours bar color | `accent` |
| Single bars (hourly, daily distribution) | After-hours / weekend bar color | `muted` |
| Line charts (features, bugfix, complexity, urgency, debt) | Line and fill colors | `colors` or `palette` |
| Doughnut (semver) | Segment colors | `colors` or `palette` |
| Heatmap (activity) | Cell intensity color | `accent` |
| Complexity bars (contributor) | High/medium complexity bar colors | `colors` or `palette` |
| Tag distribution doughnut | **Not affected** — uses semantic tag colors | — |

### Priority Order

1. Default palette (built-in)
2. `palette=name` replaces defaults
3. `colors=...` overrides the series (from default or palette)
4. `accent=...` overrides the accent (from default or palette)

See [EMBED_IMPLEMENTATION.md](EMBED_IMPLEMENTATION.md) for full technical details.

---

## Auto-Height

Embedded charts resize their iframe automatically. Include the helper script on your page:

```html
<script src="https://devmade-ai.github.io/repo-tor/embed.js"></script>
```

Include it once — it handles all repo-tor iframes on the page. Height updates fire whenever chart content changes size (initial render, window resize, animations).

If you don't include the script, nothing happens — the iframe uses whatever fixed `height` you set.

See [EMBED_IMPLEMENTATION.md](EMBED_IMPLEMENTATION.md) for manual listener examples and details.

---

## How to Find an Element in the DOM

Each embeddable element can be selected with:

```javascript
document.querySelector('[data-embed-id="activity-timeline"]')
```

Or in CSS:

```css
[data-embed-id="activity-timeline"] { /* styles */ }
```

---

## File Locations

| File | Embed IDs Defined |
|------|------------------|
| `dashboard/js/tabs/TimelineTab.jsx` | `activity-timeline`, `code-changes-timeline` |
| `dashboard/js/tabs/TimingTab.jsx` | `activity-heatmap`, `hourly-distribution`, `daily-distribution` |
| `dashboard/js/tabs/ProgressTab.jsx` | `feature-vs-bugfix-trend`, `complexity-over-time`, `semver-distribution` |
| `dashboard/js/tabs/ContributorsTab.jsx` | `contributor-complexity` |
| `dashboard/js/tabs/TagsTab.jsx` | `tag-distribution` |
| `dashboard/js/tabs/HealthTab.jsx` | `urgency-trend`, `impact-over-time`, `debt-trend` |

---

*Last updated: 2026-02-19 — Added embed.js auto-resize helper script.*
