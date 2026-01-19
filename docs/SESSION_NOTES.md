# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard:** Complete and deployed at https://devmade-ai.github.io/repo-tor/

**Extraction System:** AI analysis in progress. Manifest-based incremental tracking implemented.

### Tracked Repos (config/repos.json)
| Repo | Commits | Processed | Pending |
|------|---------|-----------|---------|
| chatty-chart | 42 | 42 ✅ | 0 |
| repo-tor | 108 | 108 ✅ | 0 |
| social-ad-creator | 156 | 90 | 66 |
| model-pear | 302 | 0 | 302 |
| **Total** | **608** | **240** | **368** |

## @data Extraction Workflow

The extraction system uses human-in-the-loop AI analysis. Full details in `docs/EXTRACTION_PLAYBOOK.md`.

### Quick Reference

**Triggers (use @data persona):**
- `@data hatch the chicken` - Full reset, analyze ALL commits
- `@data feed the chicken` - Incremental, analyze NEW commits only

**How it works:**
1. Extract script creates `reports/<repo>/batches/batch-NNN.json` files (10 commits each)
2. `scripts/pending.js` compares manifest against extraction, generates `pending/<repo>/batches/`
3. AI reads each pending batch, proposes for each commit:
   - **Tags** (multiple) - What type of work
   - **Complexity** (1-5) - How big/difficult
   - **Urgency** (1-5) - How critical (reactive vs planned)
   - **Impact** (internal/user-facing/infrastructure/api) - Who is affected
4. User reviews and approves (or corrects)
5. Approved batch saved to `processed/<repo>/batches/batch-NNN.json`
6. Manifest updated with processed SHAs (`processed/<repo>/manifest.json`)
7. Progress tracked by SHA, not batch number - allows resuming after new commits

**User commands during review:**
- `approve` - Save batch, continue to next
- `#3 tag1, tag2` - Correct commit #3's tags
- `stop` - End session (progress saved)

### Current Progress

| Repo | Processed | Pending | Status |
|------|-----------|---------|--------|
| chatty-chart | 42/42 | 0 batches | ✅ Complete |
| repo-tor | 108/108 | 0 batches | ✅ Complete |
| social-ad-creator | 90/156 | 7 batches | 🔄 In progress |
| model-pear | 0/302 | 31 batches | ⏳ Not started |

**Status:** 39.5% complete (240/608 commits). Run `@data feed the chicken` to continue.

## Key Files

| File | Purpose |
|------|---------|
| `docs/EXTRACTION_PLAYBOOK.md` | Complete extraction workflow and 55+ tag definitions |
| `config/repos.json` | Tracked repositories |
| `config/author-map.json` | Author email merging |
| `scripts/extract.js` | Extracts git data, creates batch files |
| `scripts/pending.js` | Generates pending batches by comparing manifest vs extraction |
| `scripts/manifest-update.js` | Updates manifest after batch approval |
| `scripts/aggregate.js` | Combines processed data for dashboard |
| `scripts/update-all.sh` | Runs extraction for all repos |
| `processed/<repo>/manifest.json` | Tracks processed SHAs (source of truth for progress) |

## Analysis Dimensions

Each commit gets assigned:

| Dimension | Values | Purpose |
|-----------|--------|---------|
| **Tags** | 55+ options | What type of work |
| **Complexity** | 1-5 | How big/difficult |
| **Urgency** | 1-5 | Reactive vs planned work |
| **Impact** | internal, user-facing, infrastructure, api | Who is affected |

See `docs/EXTRACTION_PLAYBOOK.md` for full tag list and guidelines.

## Notes

- Dashboard is fully functional with existing data
- Extraction workflow designed for human review of AI tagging
- **Manifest-based tracking** ensures proper incremental processing:
  - Progress tracked by SHA, not batch file number
  - Safe to add new commits between sessions
  - `pending.js` generates batches with only unprocessed commits
- All progress persisted to git after each approved batch
