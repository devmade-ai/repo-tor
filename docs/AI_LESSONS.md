# AI Lessons Learned

Mistakes and oversights made by AI assistants during development. Document these to help future sessions avoid repeating them.

---

## 2026-01-22: Built feature without testing capability

**What happened:** Built `scripts/extract-api.js` for GitHub API-based extraction without realizing it required `gh auth login` to test. The feature was coded, documented, and made the default in `update-all.sh` - all without ever running it successfully.

**Why it's a problem:**
- Code may have bugs that would have been caught immediately
- Docs describe a workflow that might not work
- User discovered the issue when asking to test it
- Wasted effort if the feature doesn't work

**What should have happened:**
1. Before building: Check if prerequisites can be tested in current environment
2. If auth/credentials needed: Ask user first or note it's untested
3. Don't make untested code the default path
4. Don't document features as if they work when they haven't been run

**Current status:** Feature exists but is marked as untested in `docs/TODO.md`. Use `--clone` flag until someone authenticates and tests it.

**Files affected:**
- `scripts/extract-api.js` - The untested script
- `scripts/update-all.sh` - Defaults to API mode (risky)
- `docs/EXTRACTION_PLAYBOOK.md` - Documents API extraction as if it works

---

## 2026-01-23: Merge commits should only have `merge` tag

**What happened:** When analyzing commits, AI added descriptive tags (feature, bugfix, ui) to merge commits based on the PR title/body.

**Why it's a problem:**
- Merge commits don't contain the actual work - they just combine branches
- The real commits already have the appropriate tags
- Adding tags to merges double-counts work in analytics

**What should have happened:**
- Merge commits get only the `merge` tag
- Complexity: 1 (merging is trivial)
- Urgency: 2 (normal)
- Impact: internal (the merge itself doesn't affect users)

**Current status:** Corrected in current batch, documented for future sessions.

---

## 2026-01-25: Hardcoded values instead of reading CSS variables

**What happened:** When fixing chart text visibility, changed `Chart.defaults.color` from one hardcoded hex value (`#767676`) to another (`#e5e7eb`) that "matched" the CSS variable `--text-secondary`. Did this twice - first with `#b0b0b0`, then when corrected, still used a hardcoded value.

**Why it's a problem:**
- If the CSS variable changes, charts won't update
- Defeats the purpose of having a theming system
- "Matching" values is fragile - easy to get out of sync
- Shows a pattern of taking shortcuts rather than doing it properly

**What should have happened:**
- Read CSS variables with JavaScript: `getComputedStyle(document.documentElement).getPropertyValue('--text-secondary')`
- This keeps charts in sync with the theme automatically
- Fallback to a default only if the variable is missing

**Correct approach:**
```javascript
const styles = getComputedStyle(document.documentElement);
Chart.defaults.color = styles.getPropertyValue('--text-secondary').trim() || '#e5e7eb';
```

**Current status:** Fixed to read from CSS variables properly.

**Files affected:**
- `dashboard/index.html` - Chart.defaults configuration

---

## Template for Future Entries

```markdown
## YYYY-MM-DD: Brief description

**What happened:** Describe what went wrong.

**Why it's a problem:** Explain the impact.

**What should have happened:** How to avoid this in future.

**Current status:** What was done to address it.

**Files affected:** List relevant files.
```

---

*This file helps AI assistants learn from past mistakes. Add entries when you make an oversight - being honest about mistakes helps everyone.*
