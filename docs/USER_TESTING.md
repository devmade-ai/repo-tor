# User Testing

Guidelines and checklists for testing features from a user perspective.

## Testing Principles

- Test as a real user would use the tool
- Verify the happy path works smoothly
- Check edge cases and error states
- Ensure feedback is clear and helpful

## Test Scenarios

### Extraction Script

**Basic extraction:**
- [ ] Run `node scripts/extract.js .` on a git repository
- [ ] Verify JSON files created in `reports/{repo-name}/`
- [ ] Check `data.json` contains commits, contributors, files, summary

**Type detection:**
- [ ] Commit with `feat(scope): subject` is detected as `feat`
- [ ] Commit with `fix: subject` is detected as `fix`
- [ ] Commit with "Add new feature" is detected as `feat` (keyword)
- [ ] Commit with "Fix bug" is detected as `fix` (keyword)
- [ ] Commit with no matching keywords is `other`

**Edge cases:**
- [ ] Empty repository (no commits) handles gracefully
- [ ] Repository with merge commits extracts correctly
- [ ] Very long commit messages are handled
- [ ] Non-ASCII characters in commit messages work

### Dashboard (V2)

**Data loading:**
- [ ] Open `dashboard/index.html` in browser
- [ ] File picker allows selecting `data.json`
- [ ] Dashboard displays after loading data
- [ ] Auto-load works when `data.json` is in same directory

**Tab Navigation:**
- [ ] Overview tab shows executive summary cards
- [ ] Activity tab shows timeline + timing content
- [ ] Work tab shows progress + tags + contributors content
- [ ] Health tab shows security + urgency content
- [ ] Tab state persists when switching between tabs

**Overview Tab:**
- [ ] Features Built card shows count with trend
- [ ] Bugs Fixed card shows count with trend
- [ ] Avg Urgency card shows value
- [ ] % Planned card shows percentage
- [ ] Period selector changes data when switched
- [ ] Work breakdown donut chart renders
- [ ] Key highlights section displays

**Activity Tab:**
- [ ] Filters work (tag, author, repo, date range)
- [ ] Activity timeline chart renders
- [ ] Changes list shows commits with badges
- [ ] Clear filters button resets all filters
- [ ] Heatmap shows hour × day grid
- [ ] Hour/day charts render with correct colors

**Work Tab:**
- [ ] Features vs Fixes trend chart renders
- [ ] Complexity over time chart renders
- [ ] Who Does What section shows contributors
- [ ] Tag breakdown shows all tags with bars
- [ ] Complexity by contributor chart renders

**Health Tab:**
- [ ] Security count card shows number
- [ ] Reactive % card shows percentage
- [ ] Weekend % card shows percentage
- [ ] After Hours % card shows percentage
- [ ] Urgency distribution bars render (Planned/Normal/Reactive)
- [ ] Impact distribution bars render
- [ ] Urgency trend line chart renders
- [ ] Impact over time stacked bar renders
- [ ] Urgency by contributor shows stacked bars
- [ ] Impact by contributor shows stacked bars
- [ ] Security commits list displays

**Detail Pane:**
- [ ] Clicking Overview cards opens detail pane
- [ ] Clicking Health cards opens detail pane
- [ ] Clicking urgency bars opens detail pane with filtered commits
- [ ] Clicking impact bars opens detail pane with filtered commits
- [ ] Clicking tag bars opens detail pane with tagged commits
- [ ] Clicking contributor cards opens detail pane with their commits
- [ ] Detail pane shows commit message, author, date, tags
- [ ] Detail pane shows urgency label and impact label
- [ ] Close button (X) closes detail pane
- [ ] Click outside closes detail pane
- [ ] Escape key closes detail pane
- [ ] Mobile: detail pane appears as bottom sheet

**Dark Mode:**
- [ ] Toggle button switches theme
- [ ] All charts re-render in dark mode
- [ ] Detail pane respects dark mode
- [ ] Preference persists on page reload

**Private Mode:**
- [ ] Toggle button enables/disables
- [ ] Author names become anonymous
- [ ] Commit messages are hidden/sanitized
- [ ] Preference persists on page reload

### Commit Hooks

**Hook installation:**
- [ ] Run `./hooks/setup.sh`
- [ ] Verify `.git/hooks/commit-msg` exists
- [ ] Verify `git config commit.template` set

**Validation - valid commits:**
- [ ] `feat: add feature` passes
- [ ] `fix(scope): fix bug` passes
- [ ] `docs: update readme` passes

**Validation - invalid commits:**
- [ ] `added feature` fails with helpful error
- [ ] `FEAT: uppercase` fails (case-sensitive)
- [ ] Subject > 72 chars fails with length error

**Bypass:**
- [ ] `git commit --no-verify` bypasses hook

## Test Results

| Date | Tester | Scenarios | Pass | Fail | Notes |
|------|--------|-----------|------|------|-------|
| | | | | | |

---
