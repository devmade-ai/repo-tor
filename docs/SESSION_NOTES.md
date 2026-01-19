# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard:** Complete and deployed at https://devmade-ai.github.io/repo-tor/

**Extraction System:** Fresh extraction complete, AI analysis pending. Schema updated with urgency + impact dimensions.

### Tracked Repos (config/repos.json)
| Repo | Commits |
|------|---------|
| chatty-chart | 42 |
| repo-tor | 104 |
| social-ad-creator | 156 |
| model-pear | 302 |
| **Total** | **604** |

## @data Extraction Workflow

The extraction system uses human-in-the-loop AI analysis. Full details in `docs/EXTRACTION_PLAYBOOK.md`.

### Quick Reference

**Triggers (use @data persona):**
- `@data hatch the chicken` - Full reset, analyze ALL commits
- `@data feed the chicken` - Incremental, analyze NEW commits only

**How it works:**
1. Extract script creates `reports/<repo>/batches/batch-NNN.json` files (10 commits each)
2. AI reads each batch, proposes for each commit:
   - **Tags** (multiple) - What type of work
   - **Complexity** (1-5) - How big/difficult
   - **Urgency** (1-5) - How critical (reactive vs planned)
   - **Impact** (internal/user-facing/infrastructure/api) - Who is affected
3. User reviews and approves (or corrects)
4. Approved batch saved to `processed/<repo>/batches/batch-NNN.json`
5. Progress = compare files in reports/batches/ vs processed/batches/

**User commands during review:**
- `approve` - Save batch, continue to next
- `#3 tag1, tag2` - Correct commit #3's tags
- `stop` - End session (progress saved)

### Current Progress

| Repo | Commits | Batches | Processed |
|------|---------|---------|-----------|
| chatty-chart | 42 | 5 | 0 |
| repo-tor | 104 | 11 | 0 |
| social-ad-creator | 156 | 16 | 0 |
| model-pear | 302 | 31 | 0 |
| **Total** | **604** | **63** | **0** |

**Status:** Fresh extraction complete. Run `@data hatch the chicken` to continue AI analysis.

## Key Files

| File | Purpose |
|------|---------|
| `docs/EXTRACTION_PLAYBOOK.md` | Complete extraction workflow and 55+ tag definitions |
| `config/repos.json` | Tracked repositories |
| `config/author-map.json` | Author email merging |
| `scripts/extract.js` | Extracts git data, creates batch files |
| `scripts/aggregate.js` | Combines processed data for dashboard |
| `scripts/update-all.sh` | Runs extraction for all repos |

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
- Batch files ensure no commits skipped or duplicated
- All progress persisted to git after each approved batch
