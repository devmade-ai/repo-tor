# Session Notes

Current state for AI assistants to continue work.

## Current State

**Dashboard:** Complete and deployed at https://devmade-ai.github.io/repo-tor/

**Extraction System:** Ready but not yet run. See `@data` workflow below.

### Tracked Repos (config/repos.json)
| Repo | Est. Commits |
|------|-------------|
| chatty-chart | ~42 |
| repo-tor | ~96 |
| social-ad-creator | ~156 |
| model-pear | ~302 |
| **Total** | **~596** |

## @data Extraction Workflow

The extraction system uses human-in-the-loop AI analysis. Full details in `docs/EXTRACTION_PLAYBOOK.md`.

### Quick Reference

**Triggers (use @data persona):**
- `@data hatch the chicken` - Full reset, analyze ALL commits
- `@data feed the chicken` - Incremental, analyze NEW commits only

**How it works:**
1. Extract script creates `reports/<repo>/batches/batch-NNN.json` files (10 commits each)
2. AI reads each batch, proposes tags + complexity for each commit
3. User reviews and approves (or corrects)
4. Approved batch saved to `processed/<repo>/batches/batch-NNN.json`
5. Progress = compare files in reports/batches/ vs processed/batches/

**User commands during review:**
- `approve` - Save batch, continue to next
- `#3 tag1, tag2` - Correct commit #3's tags
- `stop` - End session (progress saved)

### Current Progress

| Repo | Batches | Processed |
|------|---------|-----------|
| chatty-chart | 5 | 0 |
| repo-tor | 10 | 0 |
| social-ad-creator | 16 | 0 |
| model-pear | 31 | 0 |

**Status:** Ready to start. Run `@data hatch the chicken` to begin.

## Key Files

| File | Purpose |
|------|---------|
| `docs/EXTRACTION_PLAYBOOK.md` | Complete extraction workflow and 55+ tag definitions |
| `config/repos.json` | Tracked repositories |
| `config/author-map.json` | Author email merging |
| `scripts/extract.js` | Extracts git data, creates batch files |
| `scripts/aggregate.js` | Combines processed data for dashboard |
| `scripts/update-all.sh` | Runs extraction for all repos |

## Tags

55+ tags across 14 categories. See `docs/EXTRACTION_PLAYBOOK.md` for full list.

**Categories:** User-Facing, Code Changes, Performance, Security, Testing, Documentation, Infrastructure, Build & Config, Dependencies, Database, API, Git/Process, Code Style, Error Handling

## Notes

- Dashboard is fully functional with existing data
- Extraction workflow designed for human review of AI tagging
- Batch files ensure no commits skipped or duplicated
- All progress persisted to git after each approved batch
