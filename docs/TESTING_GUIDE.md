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
- [ ] Summary tab shows executive summary cards
- [ ] Timeline tab shows timeline + timing content
- [ ] Breakdown tab shows progress + tags + contributors content
- [ ] Health tab shows security + urgency content
- [ ] Tab state persists when switching between tabs

**Summary Tab:**
- [ ] Features Built card shows count with trend
- [ ] Bugs Fixed card shows count with trend
- [ ] Avg Urgency card shows value
- [ ] % Planned card shows percentage
- [ ] Period selector changes data when switched
- [ ] Work breakdown donut chart renders
- [ ] Key highlights section displays

**Timeline Tab:**
- [ ] Filters work (tag, author, repo, date range)
- [ ] Activity timeline chart renders
- [ ] Changes list shows commits with badges
- [ ] Clear filters button resets all filters
- [ ] Heatmap shows hour × day grid
- [ ] Hour/day charts render with correct colors

**Breakdown Tab:**
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

**Hamburger Menu:**
- [ ] Menu button (☰) appears in header between title and filter button
- [ ] Clicking opens dropdown with all menu items:
  - [ ] Quick Guide — opens onboarding tutorial
  - [ ] User Guide — opens GitHub README in new tab (shows external link indicator ↗)
  - [ ] Dark mode / Light mode — toggles theme, label updates to match current mode
  - [ ] Save as PDF — triggers browser print dialog
  - [ ] Install App — appears only when PWA install is available; shows native prompt (Chromium) or install instructions modal (Safari/Firefox)
  - [ ] Check for Updates — appears only when update is available, highlighted in blue
- [ ] Clicking outside the menu (backdrop) closes it
- [ ] Pressing Escape closes the menu
- [ ] Arrow Down/Up keys navigate between menu items
- [ ] Arrow keys wrap around (Down on last item goes to first)
- [ ] Enter/Space activates focused menu item
- [ ] Separator lines divide menu item groups
- [ ] Version number shown at bottom of menu

**Quick Guide:**
- [ ] Auto-shows on first visit (after data loads)
- [ ] Does NOT auto-show on subsequent visits
- [ ] Menu → Quick Guide reopens it anytime
- [ ] 4 steps with Next/Back navigation
- [ ] Last step shows "Got it" button
- [ ] Escape key closes the guide
- [ ] Clicking overlay backdrop closes the guide

**Header Subtitle:**
- [ ] Shows "X changes" when no filters active
- [ ] Shows "Showing X of Y changes · Filtered" when filters active
- [ ] Filtered text is clickable and opens filter sidebar
- [ ] On mobile: smaller title, less padding, smaller buttons

**Pagination (Show More):**
- [ ] Detail pane: Shows 10 items on mobile, 20 on desktop, with "Show more" button
- [ ] Timeline commits: Shows 10 on mobile, 25 on desktop
- [ ] Progress epics: Shows 6 on mobile, 12 on desktop
- [ ] Contributors: Shows 6 on mobile, 8 on desktop
- [ ] Tags: Shows 8 on mobile, all on desktop
- [ ] Discover files: Shows 5 on mobile, 10 on desktop
- [ ] Projects: Shows 6 on mobile, 12 on desktop
- [ ] "Show more" button loads next batch of same size
- [ ] Changing filters resets pagination to first page

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

**Theme (Light/Dark Mode):**
- [ ] Dashboard respects system preference on first visit
- [ ] Theme persists across page reloads (check localStorage `darkMode`)
- [ ] Cross-tab sync: changing theme in one tab updates other tabs
- [ ] No flash of wrong theme on page load (flash prevention script)
- [ ] All charts render correctly in both light and dark modes
- [ ] Chart axis labels and grid lines update color when toggling theme (not stale)
- [ ] Detail pane, filter sidebar, settings pane all follow theme

**Scroll Lock (Multiple Overlays):**
- [ ] Open settings pane → page doesn't scroll behind overlay
- [ ] Open Quick Guide from hamburger menu while settings pane is closed → page doesn't scroll
- [ ] Open settings pane, then Quick Guide, close Quick Guide → settings pane still blocks scroll
- [ ] Close all overlays → page scrolling restored

**Filter Sidebar Keyboard Navigation:**
- [ ] Click a filter dropdown trigger → dropdown opens
- [ ] Press ArrowDown → highlight moves down through options
- [ ] Press ArrowUp → highlight moves up through options
- [ ] Press Enter or Space → toggles selection on highlighted option
- [ ] Press Escape → closes dropdown without changing selection
- [ ] Press Home → highlight jumps to first option
- [ ] Press End → highlight jumps to last option
- [ ] Highlighted option scrolls into view if off-screen

**Accessibility (Screen Reader):**
- [ ] Settings pane: work hour labels announce "Start" and "End" when focused
- [ ] Health urgency bars: screen reader announces "View Planned Work: N commits (X%)"
- [ ] Health impact bars: screen reader announces "View User-Facing impact: N commits (X%)"
- [ ] Timeline summary cards: screen reader announces "View all N commits" and "View N contributors"
- [ ] Progress cards: screen reader announces "View N feature commits" etc.
- [ ] Filter MultiSelect: screen reader announces dropdown as listbox with multiselectable

**Debug Pill (React):**
- [ ] On page load, inline pill shows briefly during boot, then React pill takes over
- [ ] Collapsed pill shows "dbg" with entry count in bottom-right corner
- [ ] Error/warning badges appear on the pill when errors or warnings are logged
- [ ] Click pill → expands to panel with 3 tabs: Log, Environment, PWA
- [ ] Log tab shows timestamped entries color-coded by source and severity
- [ ] Environment tab shows URL (with query params redacted), user agent, screen, etc.
- [ ] PWA tab runs live diagnostics (protocol, network, SW state, manifest, standalone)
- [ ] Click "Copy" → copies full debug report to clipboard (verify URL params are redacted as `?[redacted]`)
- [ ] Click "Clear" → empties all log entries
- [ ] Click "Close" → collapses back to pill
- [ ] Trigger a console.error in DevTools → entry appears in Log tab automatically
- [ ] In embed mode (`?embed=chart-id`) → debug pill is not rendered

**Visual Stacking (Z-Index):**
- [ ] Debug pill visible in bottom-right at all times (z-index 80)
- [ ] Open Quick Guide modal → debug pill still visible above the modal overlay
- [ ] Open hamburger menu → dropdown renders above sticky tabs bar
- [ ] Open hamburger menu → backdrop covers content area (click backdrop closes menu)
- [ ] Hover heatmap cell → tooltip appears above sticky headers and drawers
- [ ] Trigger a toast (e.g. copy action) while hovering a heatmap cell → toast renders above tooltip
- [ ] Open filter sidebar + hamburger menu → menu dropdown renders above tabs but sidebar may render above backdrop (known limitation: backdrop is inside header stacking context)

### PWA Icons

**Apple touch icon (iOS home screen):**
- [ ] Open dashboard in Safari on iOS
- [ ] Tap Share → "Add to Home Screen"
- [ ] Verify the home screen icon shows the branded app icon (dark background with chart bars), not a blank/screenshot
- [ ] Open the app from the home screen — verify it loads correctly in standalone mode

**Favicon.ico (legacy browsers):**
- [ ] Open dashboard in a legacy browser or IE — verify favicon appears in the tab
- [ ] Pin the dashboard to the Windows taskbar — verify the icon displays correctly
- [ ] Request `/favicon.ico` directly — verify 32x32 ICO file is returned

**Icon generation script:**
- [ ] Run `npm run generate-icons`
- [ ] Verify 7 PNG icons generated in `assets/images/` (icon.png, adaptive-icon.png, splash-icon.png, apple-touch-icon.png, favicon.png, icon-192.png, icon-512.png)
- [ ] Verify `favicon.ico` generated in `assets/images/` (32x32 ICO format)
- [ ] Verify `apple-touch-icon.png` and `favicon.ico` copied to `dashboard/public/`
- [ ] Verify apple-touch-icon.png is 180x180 pixels
- [ ] Run `npm run build` — verify `dist/apple-touch-icon.png` and `dist/favicon.ico` exist in build output

**Regression:**
- [ ] Browser favicon shows the app icon (dark background with chart bars) in the tab — generated from icon-source.svg, not a separate design
- [ ] PWA install on Android/Chrome still shows correct icon (192px from manifest)
- [ ] Existing PWA installs still work after update

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
