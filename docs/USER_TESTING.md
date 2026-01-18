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

### Dashboard

**Data loading:**
- [ ] Open `dashboard/index.html` in browser
- [ ] File picker allows selecting `data.json`
- [ ] Dashboard displays after loading data

**Timeline tab:**
- [ ] Daily commit bar chart renders
- [ ] Recent commits list shows with type badges
- [ ] Commit stats (additions/deletions) display

**Progress tab:**
- [ ] Monthly commit volume chart renders
- [ ] Cumulative growth chart shows net lines
- [ ] Feature vs bug fix trend lines display

**Contributors tab:**
- [ ] Commits by contributor bar chart renders
- [ ] Lines changed by contributor chart renders
- [ ] Contributor list shows all contributors

**Security tab:**
- [ ] Security commit count displays
- [ ] Security-tagged commits listed
- [ ] Empty state shows when no security commits

**Types tab:**
- [ ] Pie chart shows type distribution
- [ ] Percentage breakdown list accurate

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
