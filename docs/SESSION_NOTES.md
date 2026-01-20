# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard V2:** Design complete. See [DASHBOARD_V2_DESIGN.md](DASHBOARD_V2_DESIGN.md) for full specification.

**Extraction System:** AI analysis in progress. Manifest-based incremental tracking implemented.

**Live Dashboard:** https://devmade-ai.github.io/repo-tor/ (V1 - will be replaced by V2)

---

## Dashboard V2 Summary

### Design Decision

Hybrid approach: **Logical Groupings + Contextual Detail Pane**

- **4 tabs** (down from 7): Overview, Activity, Work, Health
- **Detail pane** slides out when clicking any element
- **Mobile:** Bottom sheet instead of side pane

### New Data Dimensions

| Dimension | Values | Purpose |
|-----------|--------|---------|
| `urgency` | 1-5 | Reactive vs planned work |
| `impact` | internal, user-facing, infrastructure, api | Who is affected |

These enable new insights:
- **Urgency Distribution** - operational health indicator
- **Impact Allocation** - where effort goes

### Key Requirement

Same data format for overall and per-repo views:
```
dashboard/
├── data.json              ← Overall (all repos)
└── repos/
    ├── repo-tor.json      ← Same schema, scoped to repo
    └── ...
```

### Implementation Phases

1. **Aggregation** - New script to read processed/ data
2. **Dashboard Structure** - 4 tabs + detail pane
3. **New Visualizations** - Urgency/impact charts
4. **Polish** - Interactions, mobile, dark mode

---

## Extraction Progress

| Repo | Commits | Processed | Status |
|------|---------|-----------|--------|
| chatty-chart | 42 | 42 | ✅ Complete |
| repo-tor | 108 | 108 | ✅ Complete |
| social-ad-creator | 156 | 90 | 🔄 In progress |
| model-pear | 302 | 0 | ⏳ Not started |
| **Total** | **608** | **240** | **39.5%** |

Run `@data feed the chicken` to continue processing.

---

## @data Extraction Workflow

**Triggers (use @data persona):**
- `@data hatch the chicken` - Full reset, analyze ALL commits
- `@data feed the chicken` - Incremental, analyze NEW commits only

**How it works:**
1. Extract script creates batch files (10 commits each)
2. `scripts/pending.js` generates pending batches from manifest comparison
3. AI proposes tags, complexity, urgency, impact for each commit
4. User reviews and approves (or corrects)
5. Approved batches saved to `processed/<repo>/batches/`
6. Manifest updated with processed SHAs

**User commands during review:**
- `approve` - Save batch, continue to next
- `#3 tag1, tag2` - Correct commit #3's tags
- `stop` - End session (progress saved)

---

## Key Files

| File | Purpose |
|------|---------|
| `docs/DASHBOARD_V2_DESIGN.md` | Full design spec for new dashboard |
| `docs/EXTRACTION_PLAYBOOK.md` | Extraction workflow and 55+ tag definitions |
| `docs/DISCOVERY_SESSION.md` | Original discovery that informed design |
| `docs/DISCOVERY_FRAMEWORK.md` | Framework used for discovery |
| `config/repos.json` | Tracked repositories |
| `processed/<repo>/manifest.json` | Tracks processed SHAs |
| `scripts/aggregate-processed.js` | (TO BUILD) New aggregation from processed/ |

---

## Next Actions

1. **Finish extraction** - Process remaining social-ad-creator and model-pear commits
2. **Build aggregation** - Create `scripts/aggregate-processed.js`
3. **Build dashboard V2** - Implement new 4-tab structure

See [TODO.md](TODO.md) for detailed implementation tasks.

---

*Last updated: 2026-01-20 - Dashboard V2 design complete*
