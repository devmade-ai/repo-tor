# TODO

Remaining tasks for Git Analytics Reporting System.

**Design:** See [DASHBOARD_V2_DESIGN.md](DASHBOARD_V2_DESIGN.md) for full specification.

---

## Backlog

### Embedding
1. [ ] Implement embed mode in App.jsx (read `?embed=<chart-id>`, render only target chart)
2. [ ] Create EmbedRenderer component
3. [ ] Add embed-specific CSS (`.embed-container` styles)
4. [ ] Optional: Accept data URL via `?data=` query param
5. [ ] Optional: postMessage API for parent-to-iframe data push

### Research
1. [ ] Device/platform attribution (mobile vs desktop commits)
2. [ ] Merge commit filtering options

---

*Last updated: 2026-02-15 - Fixed extract-api.js pagination bug. Removed untested warning (pagination was the known issue).*
