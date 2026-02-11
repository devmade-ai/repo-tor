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

## 2026-01-25: Not checking all docs after making changes

**What happened:** After implementing dashboard changes (summary cards, section defaults, role-specific guidance), only updated SESSION_NOTES.md and HISTORY.md. Didn't check or update CLAUDE.md, README.md, or USER_GUIDE.md until user asked "nothing in claude.md or readme or any other docs?"

**Why it's a problem:**
- CLAUDE.md had stale "Remaining Work" listing already-completed features
- README.md had outdated "Reports Generated" table that didn't match current tabs
- USER_GUIDE.md said "Developer Patterns: Hidden" when we'd changed it to show with guidance
- USER_GUIDE.md didn't document the new summary cards
- Creates drift between code and docs that confuses future sessions

**What should have happened:**
- CLAUDE.md checklist explicitly says: "Update docs/USER_GUIDE.md if dashboard UI or interpretation changed"
- Should have checked ALL user-facing docs after UI changes, not just session tracking docs
- The checklist exists for a reason - follow it completely

**Lesson:** After any UI/feature change, check:
1. USER_GUIDE.md - Does it describe current behavior?
2. README.md - Is the overview accurate?
3. CLAUDE.md - Are "Current State" and "Remaining Work" correct?
4. Any doc that references the changed feature

**Current status:** All docs updated.

**Files affected:**
- `CLAUDE.md` - Had stale feature list
- `README.md` - Had outdated reports table
- `docs/USER_GUIDE.md` - Had wrong info about Developer Patterns visibility, missing summary cards

---

## 2026-02-10: Assumed current implementation matched user's description without checking code

**What happened:** User shared a detailed description of a PWA architecture (React hooks, `registerType: 'prompt'`, `usePWAInstall.js`, `usePWAUpdate.js`, `App.jsx`). AI initially said "yes, this is helpful context" without reading the actual codebase to compare. The real implementation was completely different: vanilla JS in `export.js`, `registerType: 'autoUpdate'`, `injectRegister: 'script'`, no React at all.

**Why it's a problem:**
- Agreeing without verifying wastes the user's time — they had to ask "are you saying our implementation is the same?"
- Could have led to incorrect changes if the AI proceeded based on wrong assumptions
- Shows a pattern of trusting descriptions over code

**What should have happened:**
1. When the user described how something works, immediately read the actual files to verify
2. Compare the description against the implementation before responding
3. If they don't match, say so explicitly with specific differences
4. When unsure about the user's intent (is this a description of current state? a target? a reference?), ask

**Current status:** Added rules to CLAUDE.md AI Notes: "Verify before assuming" and "Ask clarifying questions."

**Files affected:**
- `CLAUDE.md` — Added two new AI Notes

---

## 2026-02-10: React migration dropped CSS without replacing it

**What happened:** During the React migration, the `<link rel="stylesheet" href="./styles.css">` tag was removed from `index.html` (since the old HTML was completely rewritten), but no `import '../styles.css'` was added to `main.jsx`. The build passed, the dev server started, and 22 post-migration issues were identified and fixed — but nobody caught that the build had zero CSS output.

**Why it's a problem:** The PWA served a page with no styles. Since the dark theme defines white text via CSS custom properties, the result was white text on a white background — a completely blank screen. Users who updated their PWA saw nothing.

**What should have happened:**
1. When migrating HTML to a JS framework, check every `<link>` and `<script>` tag in the old HTML — each one needs a corresponding import or alternative in the new setup
2. Verify the build output includes expected file types (JS, CSS, HTML) — a build with zero CSS files is a red flag
3. Visually test the production build, not just confirm "build passes"

**Current status:** Fixed — `import '../styles.css'` added to `main.jsx`. Build now produces 47KB CSS file.

**Files affected:**
- `dashboard/js/main.jsx` — Missing CSS import

---

## 2026-02-11: No fallback when React fails to mount or render

**What happened:** The app showed a completely black screen with only the CSS grid background visible. The loading spinner (a thin 2px blue border circle on a near-black background) was too subtle to notice. There was no HTML-level fallback for when JavaScript fails to load, and no top-level ErrorBoundary to catch React crashes outside the tab-level boundary.

**Why it's a problem:** If React crashes for ANY reason (network error, runtime error, browser incompatibility), the user sees nothing — just a dark background. Three layers of failure had no user feedback: (1) JS not loading, (2) React failing to mount, (3) React component errors outside the tab ErrorBoundary.

**What should have happened:**
1. Always put a visible loading indicator IN THE HTML (not in React) — it shows before JS loads and gets replaced when React mounts
2. Always wrap the entire React tree in a top-level ErrorBoundary, not just individual sections
3. Loading states should be obviously visible — text labels, not just subtle spinners

**Current status:** Fixed all three layers: HTML fallback in `#root`, `RootErrorBoundary` in main.jsx, improved spinner with text label.

**Files affected:**
- `dashboard/index.html` — Added HTML loading indicator
- `dashboard/js/main.jsx` — Added RootErrorBoundary
- `dashboard/js/App.jsx` — Improved loading spinner visibility

---

## 2026-02-11: Silent .catch(() => {}) masked real errors

**What happened:** The data loading code used `.catch(() => {})` to silently ignore ALL fetch errors, with a comment saying "404 is expected." But this also swallowed network failures, JSON parse errors, CORS issues, and service worker cache misses. When data failed to load for any non-404 reason, the app silently fell through to the DropZone — which on the dark background looked like a "black screen" to users.

**Why it's a problem:**
- Users got a blank-looking screen with no explanation of what went wrong
- The loading indicator fix (HTML fallback, ErrorBoundary, better spinner) addressed symptoms but not the root cause
- Developers couldn't diagnose the issue because errors were invisible

**What should have happened:**
1. Only catch the SPECIFIC expected error (404 status) — let all other errors propagate
2. Show error feedback to the user when data fails to load unexpectedly
3. `.catch(() => {})` should almost never be used — it's a code smell that hides real bugs
4. When a `try/catch` wraps a Promise (like `import()`), remember it only catches synchronous errors; use `.catch()` on the promise instead

**Current status:** Fixed — 404 handled separately via `r.status === 404` check before `r.json()`. All other errors show a visible error card with retry button. PWA import properly uses `.catch()` on the promise.

**Files affected:**
- `dashboard/js/App.jsx` — Fixed data loading error handling and PWA import

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
