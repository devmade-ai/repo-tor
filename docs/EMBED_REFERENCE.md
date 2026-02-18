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

*Last updated: 2026-02-18 — Initial catalog of 13 embeddable elements.*
