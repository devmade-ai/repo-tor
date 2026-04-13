# User Testing

Guidelines and checklists for testing features from a user perspective.

## Automated coverage (added 2026-04-13)

Three automated test layers back the manual checklists below — run them before manual testing to catch regressions cheaply:

| Layer | Command | Runtime | Catches |
|-------|---------|---------|---------|
| **Source-level tripwire** | `npm test` | ~200ms | DaisyUI class-name regressions, dead marker classes, hardcoded Tailwind color shades, v4 cruft (`-bordered`), built-CSS shipping checks |
| **Runtime smoke** | `npm run test:e2e` | ~30s | DOM state after React render, interaction flows (modal open, filter toggle, hamburger portal), Chart.js theme tracking |
| **Visual regression** | `npm run test:visual` | ~60s | Silent visual drift per theme (6 tabs × 8 themes = 48 screenshot baselines) |

Setup: `npm run test:e2e:install` (installs Chromium, one-time ~170MB). See `dashboard/e2e/README.md` for the full setup recipe, CI integration, and sandboxed-environment troubleshooting.

The manual "DaisyUI component-class migration" checklist further down this file is the source-of-truth that the automated suites implement — when you add a manual checklist entry here, add a corresponding assertion in `scripts/__tests__/daisyui-surfaces.test.mjs` or `dashboard/e2e/daisyui-surfaces.spec.js`.

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

**Theme (Light/Dark Mode) — DaisyUI dual-layer theming:**

*First visit / system preference:*
- [ ] Clear localStorage → reload → dashboard matches OS preference (dark if OS is dark, light if OS is light)
- [ ] With no stored preference, changing OS dark mode → dashboard follows (media query listener)
- [ ] Once user toggles manually → OS preference changes are ignored (stored preference wins)

*Theme ID allowlist (forward-compat):*
- [ ] In DevTools console: `localStorage.setItem('darkTheme', 'nonsense'); location.reload()` → dashboard loads in dark mode with `data-theme="black"` (the default fallback), no unstyled flash
- [ ] Same test with `lightTheme = 'nonsense'` after setting `darkMode = 'false'` → loads with `data-theme="lofi"`
- [ ] `localStorage.setItem('darkTheme', 'black'); location.reload()` → loads cleanly with `data-theme="black"` (valid ID in allowlist)

*Theme meta generator (single source of truth):*
- [ ] `npm run build` output shows the generator printing all 8 registered themes with their hex values (e.g. `lofi light #ffffff`, `dracula dark #282a36`)
- [ ] Second run of `npm run build` (or `npm run generate-theme-meta`) reports all four downstream files as **unchanged** — generator is idempotent
- [ ] `dashboard/js/generated/themeMeta.js` exists and contains `META_COLORS` / `IS_DARK` / `THEME_NAMES` exports for all 8 themes
- [ ] `dashboard/js/themes.js` block between `/* BEGIN GENERATED: theme-catalog */` markers contains `LIGHT_THEMES`, `DARK_THEMES`, `DEFAULT_LIGHT_THEME`, `DEFAULT_DARK_THEME` matching `scripts/theme-config.js`
- [ ] `dashboard/styles.css` block between `/* BEGIN GENERATED: daisyui-plugin */` markers contains `@plugin "daisyui" { themes: lofi --default, nord, ..., black --prefersdark, ... }` with all 8 themes
- [ ] `dashboard/index.html` inline script block between `/* BEGIN GENERATED: flash-prevention-meta */` markers contains `LIGHT_THEMES`, `DARK_THEMES`, `DEFAULT_*_THEME`, and a `META` map with all 8 hex values
- [ ] `npm run generate-theme-meta` runs the generator directly without touching vite
- [ ] **Generator error paths:**
  - [ ] Edit `scripts/theme-config.js` to set `DEFAULT_LIGHT_THEME = 'nonsense'` → generator exits with error `DEFAULT_LIGHT_THEME "nonsense" is not one of THEMES.light ids` and exit code 1
  - [ ] Add a typo theme id (e.g. `'nonexistent-theme'`) to `THEMES.light` → generator exits with error `Could not import daisyui/theme/nonexistent-theme/object.js` and exit code 1
  - [ ] Move `'black'` from `THEMES.dark` to `THEMES.light` → generator exits with error `theme "black" is listed under THEMES.light but DaisyUI reports color-scheme="dark"` and exit code 1
- [ ] **Idempotence cross-check:**
  ```bash
  md5sum dashboard/js/generated/themeMeta.js dashboard/js/themes.js dashboard/styles.css dashboard/index.html > /tmp/before.md5
  npm run generate-theme-meta
  md5sum dashboard/js/generated/themeMeta.js dashboard/js/themes.js dashboard/styles.css dashboard/index.html > /tmp/after.md5
  diff /tmp/before.md5 /tmp/after.md5  # expect: no output
  ```

*Theme picker UI (burger menu):*
- [ ] Open the burger menu (☰) — see the dark/light toggle followed by 4 theme items for the current mode (light mode shows Lo-Fi / Nord / Emerald / Caramel Latte; dark mode shows Black / Dim / Coffee / Dracula)
- [ ] The currently active theme has a checkmark icon and the highlight color class; inactive themes have the palette icon
- [ ] Click a non-active theme → dashboard re-themes without a page reload, the active theme highlight moves, `data-theme` attribute on `<html>` updates, the PWA status bar `<meta name="theme-color">` content updates, all charts re-render with new axis colors
- [ ] **Rapid-preview (keepOpen behavior):** with the burger menu open, click Nord → theme applies, menu stays open, Nord is now marked active with a checkmark. Click Emerald → theme applies, menu stays open, Emerald is now marked active, Nord is back to the palette icon. Click Caramel Latte → same pattern. User can preview all 4 themes for a mode in < 4 clicks from a single menu open.
- [ ] **Mode toggle keepOpen:** with the burger menu open in light mode, click "Dark mode" → app flips to dark, menu stays open, the 4 theme items below the toggle swap from light themes (Lo-Fi/Nord/Emerald/Caramel Latte) to dark themes (Black/Dim/Coffee/Dracula). Now click Dracula → theme applies, menu stays open. Single menu session = full mode + theme switch.
- [ ] **Focus is preserved after a theme click.** Keyboard user: Tab to "Nord", press Enter → Nord becomes active, focus stays on the Nord button (not the first menu item). Press Tab → focus moves to "Emerald" (next theme button), not back to the mode toggle.
- [ ] **Non-theme items still close the menu.** Click "Save as PDF" → menu closes, print dialog opens 150 ms later. Click "Quick Guide" → menu closes, Quick Guide modal opens. Only theme controls have the keepOpen behavior.
- [ ] Toggle dark/light mode → theme list switches to show only themes for the new mode (4 items, not 8)
- [ ] Pick a non-default theme in light mode (e.g. Nord), toggle to dark, pick a non-default theme in dark mode (e.g. Dracula), toggle back to light → Nord is still the active light theme (localStorage `lightTheme` = 'nord')
- [ ] Clear localStorage, reload → dashboard loads with the defaults (lofi / black) and the picker shows the defaults as active
- [ ] Hover / focus a theme item with keyboard → screen reader announces the full label like "Use Nord theme (Cool blue-gray), currently active" (or without the active suffix for inactive themes). After clicking the button, screen reader re-announces with the updated aria-label — natural confirmation feedback.
- [ ] **Click-outside still closes the menu** even with keepOpen items: open menu, click a theme (menu stays open), click anywhere outside the menu → menu closes. Escape key also still works.

*Adding a new theme (developer flow):*
- [ ] Edit `scripts/theme-config.js` — add a new entry to `THEMES.light` or `THEMES.dark` with a valid DaisyUI theme id
- [ ] Run `npm run generate-theme-meta` → generator updates all four downstream files and prints the new theme's hex value
- [ ] Run `npm run build` → the new theme's `[data-theme="..."]` selector block appears in the built CSS
- [ ] The new theme appears as a menu item in the appropriate mode, the inline flash prevention script's allowlist includes the new id, and the new id can be stored in localStorage without being rejected by `validTheme()`
- [ ] **No other file edits required** — themes.js, styles.css, and index.html all update automatically

*Dual-layer attributes:*
- [ ] In DevTools, inspect `<html>` element — in dark mode it should have BOTH `class="dark"` AND `data-theme="black"`
- [ ] In light mode it should have NO `dark` class AND `data-theme="lofi"`
- [ ] `html.dark { color-scheme: dark }` is applied — open Settings and see native selects use dark dropdowns in dark mode
- [ ] In light mode, native selects use light dropdowns

*Flash prevention:*
- [ ] Reload the page in dark mode with slow network throttling — the page starts dark, no white flash before React mounts
- [ ] Reload in light mode — page starts light, no dark flash

*Cross-tab sync:*
- [ ] Open dashboard in two tabs
- [ ] Toggle dark mode in tab A (menu ☰ → Dark/Light mode)
- [ ] Tab B updates to match within a frame (storage event listener)
- [ ] Tab B also picks up the new `data-theme` attribute and `<meta name="theme-color">` value
- [ ] Pick a non-default theme in tab A (e.g. Nord in light mode) → tab B picker highlights Nord as active
- [ ] Revert to default in tab A (pick Lo-Fi) → tab B picker highlights Lo-Fi as active. Verify `lightTheme` key was **removed** from localStorage in both tabs (not set to 'lofi').
- [ ] **Simulated cross-tab test** (if you only have one tab — fires a synthetic storage event which the real cross-tab path uses):
  ```js
  // In DevTools console:
  localStorage.setItem('darkTheme', 'dracula');
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'darkTheme', newValue: 'dracula', storageArea: localStorage,
  }));
  // Expect: picker updates (if in dark mode)
  localStorage.removeItem('darkTheme');
  window.dispatchEvent(new StorageEvent('storage', {
    key: 'darkTheme', newValue: null, storageArea: localStorage,
  }));
  // Expect: picker reverts to default (Black)
  ```
- [ ] Invalid payload safety: `localStorage.setItem('lightTheme', 'nonsense')` + dispatch → reducer falls back to `DEFAULT_LIGHT_THEME` ('lofi'), no unstyled state

*Theme toggle accessibility:*
- [ ] Inspect the menu item for dark/light mode toggle — its button element should have `aria-label="Switch to dark mode"` (when currently in light mode) or `aria-label="Switch to light mode"` (when currently in dark mode)
- [ ] Toggle the theme → aria-label updates to describe the next transition
- [ ] Screen reader should announce "Switch to light mode, button" rather than just "Light mode, button"

*PWA status bar:*
- [ ] Open DevTools → Elements → `<head>` → find both `<meta name="theme-color">` tags
- [ ] In dark mode both tags have `content="#000000"` (DaisyUI black base-100)
- [ ] In light mode both tags have `content="#ffffff"` (DaisyUI lofi base-100)
- [ ] On mobile (or device toolbar emulation), the browser status bar color matches

*Charts:*
- [ ] Toggle theme while on the Timeline tab — chart axis labels change color in under a second
- [ ] No stale colors on any of the 11 charts (Summary stat cards, Timeline, Timing heatmap, Progress, Contributors, Tags doughnut, Health, Discover)
- [ ] Chart grid lines visible but subtle in both themes (10% opacity of base-content)

*Surfaces auto-switch:*
- [ ] Cards, filter sidebar, detail pane, settings pane, hamburger dropdown, quick guide modal — all follow theme instantly
- [ ] Borders visible in both themes
- [ ] No white text on white background anywhere
- [ ] No dark text on dark background anywhere
- [ ] Hover states on interactive cards still work in both themes (base-200 / base-300)

*Semantic tokens:*
- [ ] Health section security cards use DaisyUI `error` token — background + border + count color all red family
- [ ] Summary Activity Snapshot cards: After-hours (warning), Weekend (info), Holiday (accent), Complex (secondary)
- [ ] Timeline complexity badges: high=secondary, medium=info, low=base-300
- [ ] Toast notifications (success/error/warning/info) use DaisyUI semantic tokens with their `-content` foreground colors for legibility

*Print/PDF:*
- [ ] Menu → Save as PDF → print preview shows white background, black text, regardless of the dashboard's current theme

**DaisyUI component-class migration (2026-04-13):**

Walk through these checks after switching theme to verify every migrated surface picks up the active DaisyUI theme's tokens. Run the checks in both a light theme and a dark theme.

*Modals (Phase 1):*
- [ ] Menu → Quick Guide → modal opens with proper backdrop, close button visible in top-right, footer Next/Done buttons styled as DaisyUI `btn-primary`/`btn-ghost`
- [ ] Quick Guide close button (`btn btn-sm btn-circle btn-ghost`) has ghost hover tint matching theme
- [ ] Menu → Install App → modal opens with step list + warning note rendered as `alert alert-warning alert-soft` (not a bespoke bg-warning/10 block)
- [ ] Both modals dismiss on Escape, backdrop click, and close button

*Toasts (Phase 2):*
- [ ] Trigger a toast (e.g. load a bad data file, apply a filter) → toast appears at the bottom, centered
- [ ] Toast alert background matches its variant (`alert-success` green, `alert-error` red, `alert-warning` yellow, `alert-info` blue) in both themes
- [ ] Toast dismiss button is a tiny circle ghost button (`btn btn-ghost btn-xs btn-circle`)
- [ ] Toast enter fades in smoothly, dismiss fades out with translate-y-2
- [ ] Toast stacks above the debug pill (z-index from `--z-toast`)

*Health security summary (Phase 3):*
- [ ] Health tab → Security section → any of the three summary containers (Secrets, Vulnerabilities, Auth) with findings render as DaisyUI `alert alert-error` (red tinted background, centered text, error icon ghost)
- [ ] The `role="alert"` attribute is present (check DevTools)
- [ ] Per-commit list items below still use the compact `bg-error/10` block (deliberately not migrated)

*Timeline badges (Phase 4):*
- [ ] Timeline tab → find a commit with Holiday badge → renders as `badge badge-accent badge-sm`
- [ ] Weekend badge → `badge badge-info badge-sm`
- [ ] After Hours badge → `badge badge-warning badge-sm`
- [ ] All three badges use DaisyUI semantic colors — switch themes and confirm the colors change

*Cards (Phase 5):*
- [ ] Every CollapsibleSection renders as `card bg-base-200` with a visible `border-base-300` in both themes
- [ ] Error boundary (force an error in React DevTools) renders as a `card` with `role="alert"` + "Try again" button
- [ ] Projects tab → ProjectCard tiles render as `card` with `card-body p-4 gap-0`, hover border tints to `primary/40`
- [ ] Discover tab → metric cards render as `card` with `card-body p-5 gap-0`

*Buttons (Phase 6):*
- [ ] Header filter toggle → `btn btn-ghost btn-square`, shows active state when filters pane is open
- [ ] Header filter badge (when filters active) → `badge badge-primary badge-xs` in top-right of the filter toggle
- [ ] Header settings button → `btn btn-ghost btn-square`
- [ ] Hamburger menu trigger → `btn btn-ghost btn-square`
- [ ] Show More buttons in Timeline/Breakdown/Projects → `btn btn-ghost btn-block btn-sm`
- [ ] FilterSidebar Include/Exclude toggle → `join` segmented buttons, Include active uses `btn-primary`, Exclude active uses `btn-error` (red)
- [ ] FilterSidebar Clear All → `btn btn-outline btn-sm w-full`
- [ ] DetailPane + SettingsPane close buttons → `btn btn-sm btn-circle btn-ghost`

*Tabs (Phase 7):*
- [ ] TabBar renders as `tabs tabs-border` with `role="tablist"` + `aria-label="Dashboard sections"`
- [ ] Each tab has `role="tab"`, `aria-selected={isActive}`, and both `tab tab-btn` + (if active) `tab-active tab-btn-active`
- [ ] Active tab still has the mono-uppercase typography from `.tab-btn` (typography from custom class, border from DaisyUI `tabs-border`)
- [ ] Tab bar scrolls horizontally on narrow screens without showing a scrollbar

*Form inputs (Phase 8):*
- [ ] Settings pane → Work Hours → Start/End selects render as `select select-bordered select-sm` — notice DaisyUI's chevron arrow and hover border
- [ ] Filter sidebar → Date Range → both date inputs render as `input input-bordered input-sm w-full`
- [ ] Switch themes → selects and inputs pick up the new theme's bordered-input style automatically

*HamburgerMenu (Phase 9):*
- [ ] Open hamburger menu → trigger and items still look and behave the same (no regression)
- [ ] Hover a destructive menu item (if any) → hover tint is now theme-aware (red-family for the active theme's error color, not hardcoded red)
- [ ] Keyboard nav still works (arrow keys, Enter, Escape)
- [ ] Theme picker items still `keepOpen: true` — click multiple themes without reopening the menu

*FilterSidebar multi-select (Phase 10):*
- [ ] Open any filter dropdown (Tags, Authors, Repos, Urgency, Impact) → checkbox in each option renders as DaisyUI `checkbox checkbox-xs checkbox-primary` (square with check mark)
- [ ] Switch themes → checkbox fills with the active theme's primary color when checked
- [ ] Keyboard nav still works (arrow keys move highlight, Space/Enter toggles, Escape closes)
- [ ] Selected options still get the `bg-primary/10` tint on their row

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
