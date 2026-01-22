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
