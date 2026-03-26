# Git Analytics Reporting System

## HARD RULES

These rules are non-negotiable. Stop and ask before proceeding if any rule would be violated.

### Before Making Changes

- [ ] Read relevant existing code and documentation first
- [ ] Ask clarifying questions if scope, approach, or intent is unclear
- [ ] Confirm understanding before implementing non-trivial changes
- [ ] Never assume — when in doubt, ask

### Best Practices

- [ ] Follow established patterns and conventions in the codebase
- [ ] Use industry-standard solutions over custom implementations when available
- [ ] Apply SOLID principles, DRY, and separation of concerns
- [ ] Prefer well-maintained, widely-adopted libraries over obscure alternatives
- [ ] Follow security best practices (input validation, sanitization, principle of least privilege)
- [ ] Handle errors gracefully with meaningful messages
- [ ] Write self-documenting code with clear naming

### Code Organization

- [ ] Prefer smaller, focused files and functions
- [ ] Pause and consider extraction at: 500 lines (file), 100 lines (function), 400 lines (class)
- [ ] Strongly consider refactoring at: 800+ lines (file), 150+ lines (function), 600+ lines (class)
- [ ] Extract reusable logic into separate modules/files immediately
- [ ] Group related functionality into logical directories
- [ ] Split large classes into smaller, focused classes when responsibilities diverge

### Decision Documentation in Code

Non-trivial code changes must include comments explaining:
- **What** was the requirement or instruction
- **Why** this approach was chosen
- **What alternatives** were considered and why they were rejected

Example:
```javascript
// Requirement: Show loading state before React mounts
// Approach: HTML-level spinner inside #root div, replaced by createRoot()
// Alternatives:
//   - React Suspense only: Rejected - no fallback if JS fails to load
//   - Blank screen + ErrorBoundary: Rejected - no feedback during load
```

### User Experience (CRITICAL)

Assume all dashboard users are non-technical. This is non-negotiable.

- [ ] UI must be intuitive without instructions
- [ ] Use plain language — no jargon, technical terms, or developer-speak
- [ ] Error messages must tell users what went wrong AND what to do next, in simple terms
- [ ] Labels, buttons, and instructions should be clear to someone unfamiliar with git analytics
- [ ] Prioritize clarity over brevity in user-facing text
- [ ] Confirm destructive actions with clear consequences explained
- [ ] Provide feedback for all user actions (loading states, success confirmations, etc.)
- [ ] Design for the least technical person who will use this

Bad: "Error 500: Internal server exception"
Good: "Something went wrong loading the dashboard. Please try again, or check your data file."

Bad: "Invalid JSON schema"
Good: "This file doesn't look like a dashboard data file. Try exporting from the extraction script first."

### Frontend: Styles and Scripts

- [ ] All custom styles in `dashboard/styles.css` — Tailwind utility classes in JSX are fine (framework convention)
- [ ] No inline `style={}` objects in JSX unless values are dynamic/computed
- [ ] Use CSS variables for theming (colors, spacing, typography) — never hardcode theme values
- [ ] No `<script>` tags — all JS through ES module imports (exceptions: debug pill and PWA early capture in index.html, which must run before modules load)
- [ ] Maintain light/dark mode support through CSS variables

### Documentation

**AI assistants automatically maintain these documents.** Update them as you work — don't wait for the user to ask. This ensures context is always current for the next session.

| File | Purpose | When to update |
|------|---------|----------------|
| `CLAUDE.md` | AI preferences, project overview, architecture | When architecture, state structures, or preferences change |
| `docs/SESSION_NOTES.md` | Compact context snapshot for session continuity | Rewrite at session end with fresh summary |
| `docs/TODO.md` | AI-managed backlog (pending items only) | When noticing improvements; move completed to HISTORY.md |
| `docs/HISTORY.md` | Changelog of completed work | When completing TODO items or significant changes |
| `docs/USER_ACTIONS.md` | Manual tasks requiring user intervention | When tasks need external action (credentials, dashboards) |
| `docs/AI_MISTAKES.md` | Record of significant AI errors and learnings | After making a mistake that wasted time or broke things |
| `README.md` | User-facing application guide | When features change that affect user interaction |
| `docs/USER_GUIDE.md` | Comprehensive feature documentation | When adding/changing features or UI workflows |
| `docs/TESTING_GUIDE.md` | Manual test scenarios | When adding features that need test coverage |

### Cleanup

- [ ] Remove all temporary files after implementation is complete
- [ ] Delete unused imports, variables, and dead code immediately
- [ ] Remove commented-out code unless explicitly marked `// KEEP:` with reason
- [ ] Clean up console.log/print statements before marking work complete

### Quality Checks

During every change, actively scan for:
- [ ] Error handling gaps
- [ ] Edge cases not covered
- [ ] Inconsistent naming
- [ ] Code duplication that should be extracted
- [ ] Missing validation
- [ ] Security concerns
- [ ] Performance issues

Report findings even if not directly related to current task.

---

## Cross-Project References

### glow-props CLAUDE.md

**URL:** `https://raw.githubusercontent.com/devmade-ai/glow-props/main/CLAUDE.md`

Shared coding standards, patterns, and suggested implementations across devmade-ai projects.
Check periodically for new patterns to adopt. Last reviewed: 2026-03-26.

**Adopted patterns:**
- PWA install prompt race condition fix (inline `beforeinstallprompt` capture in HTML)
- Timer/listener cleanup patterns for `useEffect` (nested timeout tracking, mounted ref guard)
- SVG → PNG icon generation pipeline via Sharp
- Commit metadata footers (complexity, urgency, impact, risk, debt, epic, semver)
- Debug system (in-memory event store, floating pill — adapted to HTML-level for crash resilience)
- Download as PDF via `window.print()` (`no-print` class, print-friendly CSS overrides)
- Trigger system (10 single-word analysis commands with `start`/`go` sweep)
- `// KEEP:` convention for preserved commented-out code
- Bug report clarification rule (ask before fixing)
- Prohibition: no interactive prompts, no feature removal during cleanup without checking docs

---

## Project Overview

**Purpose:** Extract git history from repositories and generate visual analytics reports.

**Target Users:** Development teams wanting insights into commit patterns, contributor activity, and code evolution.

**Key Components:**

- `scripts/extract.js` - Extracts git log data into structured JSON
- `scripts/extract-api.js` - GitHub API-based extraction (uses curl, no gh CLI needed)
- `scripts/aggregate-processed.js` - Aggregates processed/ data into time-windowed dashboard JSON (summary + per-month commit files + weekly/daily/monthly pre-aggregations)
- `dashboard/` - React dashboard (Vite + React + Tailwind v4 + Chart.js via react-chartjs-2)
  - `index.html` - Minimal HTML (root div, debug pill, PWA early capture)
  - `styles.css` - Tailwind v4 + custom CSS
  - `js/main.jsx` - React entry point with Chart.js registration
  - `js/AppContext.jsx` - React Context + useReducer state management
  - `js/App.jsx` - Main app component (data loading, tab routing, layout)
  - `js/components/` - Shared components (Header, TabBar, DropZone, FilterSidebar, DetailPane, SettingsPane, CollapsibleSection, ErrorBoundary, EmbedRenderer, HealthAnomalies, HealthBars, HealthWorkPatterns)
  - `js/sections/` - Section components (Summary, Timeline, Timing, Progress, Contributors, Tags, Health, Discover, Projects)
  - `js/hooks/` - Custom hooks (useFocusTrap, useHealthData)
  - `js/state.js` - Constants (TAB_SECTIONS, VIEW_LEVELS, THRESHOLDS) + global state compat shim
  - `js/utils.js` - Pure utility functions
  - `js/charts.js` - Chart aggregation helpers
  - `js/chartColors.js` - Centralized chart color system (embed overrides)
  - `js/pwa.js` - PWA install/update logic
- `vite.config.js` - Vite build + React + Tailwind v4 + PWA plugin config
- `hooks/commit-msg` - Validates conventional commit format
- `docs/COMMIT_CONVENTION.md` - Team guide for commit messages

**Live Dashboard:** https://repo-tor.vercel.app/

**Development:**
- `npm run dev` — Local dev server with hot reload (http://localhost:5173)
- `npm run build` — Production build to `dist/`

**Current State:** Dashboard V2 complete with role-based views. See `docs/SESSION_NOTES.md` for recent changes.

**Remaining Work:** See `docs/TODO.md` for backlog items.

## Dashboard Architecture

**Tabs** — 6 tabs defined in `TabBar.jsx`, routed in `App.jsx`:

| Tab | Internal ID | Sections Rendered |
|-----|-------------|-------------------|
| Summary | `overview` | Summary |
| Timeline | `activity` | Timeline, Timing |
| Breakdown | `work` | Progress, Contributors, Tags |
| Health | `health` | Health (includes Security) |
| Discover | `discover` | Discover |
| Projects | `projects` | Projects |

Tab-to-section mapping in `js/state.js` as `TAB_SECTIONS`. Tab routing in `js/App.jsx`.

**Role-Based View Levels** — Three audiences with different detail levels:

| View | Contributors | Heatmap | Drilldowns |
|------|-------------|---------|------------|
| Executive | Aggregated totals | Weekly blocks | Stats only |
| Management | Per-repo groupings | Day-of-week bars | Stats + repo split |
| Developer (default) | Individual names | 24x7 hourly grid | Full commit list |

Executive and Management views show interpretation guidance hints; Developer view shows raw data. Selection persists in localStorage.

---

## Project-Specific Configuration

### Paths
```
DOCS_PATH=/docs
COMPONENTS_PATH=dashboard/js/components
SECTIONS_PATH=dashboard/js/sections
STYLES_PATH=dashboard/styles.css
SCRIPTS_PATH=scripts
```

### Stack
```
LANGUAGE=JavaScript (ES modules)
FRAMEWORK=React 19 + Vite + Tailwind v4
CHARTS=Chart.js via react-chartjs-2
PACKAGE_MANAGER=npm
BUILD=npm run build (output: dist/)
DEV=npm run dev (http://localhost:5173)
```

### Conventions
```
NAMING_CONVENTION=camelCase (variables/functions), PascalCase (components)
FILE_NAMING=PascalCase.jsx (components), camelCase.js (utilities)
COMPONENT_STRUCTURE=feature-based (js/sections/, js/components/)
COMMIT_FORMAT=conventional commits (see docs/COMMIT_CONVENTION.md)
```

### Commit Message Metadata Footers

All commits must include metadata footers (see `docs/COMMIT_CONVENTION.md` for full guide):

```
type(scope): subject

Body explaining why.

Tags: tag1, tag2, tag3
Complexity: 1-5
Urgency: 1-5
Impact: internal|user-facing|infrastructure|api
Risk: low|medium|high
Debt: added|paid|neutral
Epic: feature-name
Semver: patch|minor|major
```

**Tags:** Relevant tags for the change (e.g., documentation, pwa, debug, ui, refactor, testing)
**Complexity:** 1=trivial, 2=small, 3=medium, 4=large, 5=major rewrite
**Urgency:** 1=planned, 2=normal, 3=elevated, 4=urgent, 5=critical
**Impact:** internal, user-facing, infrastructure, or api
**Risk:** low=safe change, medium=could break things, high=touches critical paths
**Debt:** added=introduced shortcuts, paid=cleaned up debt, neutral=neither
**Epic:** groups related commits under one feature/initiative name
**Semver:** patch=bugfix, minor=new feature, major=breaking change

---

# My Preferences

## Process

1. **Read these preferences first**
2. **Gather context from documentation** (CLAUDE.md, relevant docs/)
3. **Then proceed with the task**

## Principles

1. **User-first design** - Align with how real people will use the tool (top priority)
2. **Simplicity** - Simple flow, clear guidance, non-overwhelming visuals, accurate interpretation
3. **Document WHY** - Explain decisions and how they align with tool goals
4. **Testability** - Ensure correctness and alignment with usage goals can be verified
5. **Know the purpose** - Always be aware of what the tool is for
6. **Follow conventions** - Best practices and consistent patterns
7. **Repeatable process** - Follow consistent steps to ensure all the above

## AI Checklists

### At Session Start

- [ ] Read CLAUDE.md (this file)
- [ ] Read docs/SESSION_NOTES.md for current state and context
- [ ] Check docs/TODO.md for pending items and known issues
- [ ] Check docs/AI_MISTAKES.md for past mistakes to avoid
- [ ] Understand what was last done before starting new work

### After Each Significant Task

- [ ] Remove completed items from docs/TODO.md (tracked in HISTORY.md)
- [ ] Update docs/SESSION_NOTES.md with current state
- [ ] Update docs/USER_GUIDE.md if dashboard UI or interpretation changed
- [ ] Update docs/ADMIN_GUIDE.md if setup, extraction, or configuration changed
- [ ] Update docs/TESTING_GUIDE.md if new test scenarios needed (use structured format: step-by-step actions, where to click/look, expected results, regression checklist)
- [ ] Update other relevant docs (COMMIT_CONVENTION.md, etc.)
- [ ] Add entry to docs/HISTORY.md if code/docs changed
- [ ] Commit changes (code + docs together)

### Before Each Commit

- [ ] Relevant docs updated for changes in this commit
- [ ] docs/HISTORY.md entry added (if significant change)
- [ ] docs/SESSION_NOTES.md reflects current state
- [ ] Commit message is clear and descriptive
- [ ] No unused imports, dead code, or console.log statements (see Hard Rules > Cleanup)

### Before Each Push

- [ ] All commits include their related doc updates
- [ ] docs/SESSION_NOTES.md is current (in case session ends)
- [ ] No work-in-progress that would be lost

### Before Compact

- [ ] docs/SESSION_NOTES.md updated with full context needed to continue after summary:
  - What's being worked on?
  - Current state of the work?
  - What's left to do?
  - Any decisions or blockers?
  - Key details that shouldn't be lost in the summary

## Triggers

Single-word commands that invoke focused analysis passes. Each trigger has a short alias. Type the word or alias to activate.

| # | Trigger | Alias | What it does |
|---|---------|-------|--------------|
| 1 | `review` | `rev` | Code review — bugs, UI, UX, simplification |
| 2 | `audit` | `aud` | Code quality — hacks, anti-patterns, latent bugs, race conditions |
| 3 | `docs` | `doc` | Documentation accuracy vs actual code |
| 4 | `mobile` | `tap` | Mobile UX — touch targets, viewport, safe areas |
| 5 | `clean` | `cln` | Hygiene — duplication, refactor candidates, dead code |
| 6 | `performance` | `perf` | Re-renders, expensive ops, bundle size, DB/API, memory |
| 7 | `security` | `sec` | Injection, auth gaps, data exposure, insecure defaults, CVEs |
| 8 | `debug` | `dbg` | Debug pill coverage — missing logs, noise |
| 9 | `improve` | `imp` | Open-ended — architecture, DX, anything else |
| 10 | `start` | `go` | Sequential sweep of all 9 above, one at a time |

### Trigger behavior

- Each trigger runs a single focused pass and reports findings.
- Findings are listed as numbered text — never interactive prompts or selection UIs.
- One trigger per response. Never combine multiple triggers in a single response.

### `start` / `go` behavior

Runs all 9 triggers in priority sequence, one at a time:

`rev` → `aud` → `doc` → `tap` → `cln` → `perf` → `sec` → `dbg` → `imp`

After each trigger completes and findings are presented, the user responds with one of:
1. `fix` — apply the suggested fixes, then move to the next trigger
2. `skip` — skip this trigger's findings and move to the next trigger
3. `stop` — end the sweep entirely

Rules:
- Always pause after each trigger — never auto-advance to the next one.
- Never run multiple triggers in one response.
- Wait for the user's explicit `fix`, `skip`, or `stop` before proceeding.

---

## Suggested Implementations

Reference patterns from glow-props for features across all projects. Adapt file names and frameworks to this project (React 19 + Vite + Tailwind v4).

### PWA System

Four parts, built on `vite-plugin-pwa` (^0.21.1) with React.

#### Vite Config (`vite.config.js`)

```javascript
import { VitePWA } from 'vite-plugin-pwa'

// Inside defineConfig plugins array:
VitePWA({
  registerType: 'prompt',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
  manifest: {
    name: 'Your App',
    short_name: 'App',
    description: 'Description here',
    id: '/',
    theme_color: '#10b981',
    background_color: '#ffffff',
    display: 'standalone',
    scope: '/',
    start_url: '/',
    prefer_related_applications: false,
    icons: [
      { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: 'pwa-1024x1024.png', sizes: '1024x1024', type: 'image/png', purpose: 'maskable' }
    ]
  }
})
```

- **`registerType: 'prompt'`**: Users control when updates apply. `autoUpdate` silently refreshes mid-work.
- **`id`**: Stable app identity. Without it, Chrome derives from `start_url` — breaks on config changes.
- **`prefer_related_applications: false`**: Without this, Chrome may skip `beforeinstallprompt`.
- **Separate icon purposes**: `any` for standard display (192, 512), `maskable` for full-bleed (1024). Never combine `"any maskable"`.

#### Install Prompt Race Condition (`index.html`)

`beforeinstallprompt` fires once. On repeat visits with a cached SW, it fires before the framework mounts — if nothing catches it, the install prompt is permanently lost.

Inline classic (non-module) script before any `<script type="module">`:

```html
<script>
  window.addEventListener('beforeinstallprompt', function (e) {
    e.preventDefault();
    window.__pwaInstallPromptEvent = e;
  });
</script>
```

#### Service Worker Updates (`usePWAUpdate.js`)

```javascript
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useEffect, useCallback } from 'react'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

export function usePWAUpdate() {
  const {
    needRefresh: [needRefresh],
    offlineReady: [offlineReady, setOfflineReady],
    updateServiceWorker
  } = useRegisterSW({
    onRegisteredSW(_url, registration) {
      if (registration) {
        setInterval(() => registration.update(), CHECK_INTERVAL_MS)
      }
    }
  })

  useEffect(() => {
    if (!offlineReady) return
    const t = setTimeout(() => setOfflineReady(false), 3000)
    return () => clearTimeout(t)
  }, [offlineReady, setOfflineReady])

  const updateApp = useCallback(() => {
    updateServiceWorker(true)
  }, [updateServiceWorker])

  return { hasUpdate: needRefresh, offlineReady, updateApp }
}
```

#### Install Detection (`usePWAInstall.js`)

```javascript
import { useState, useEffect, useCallback } from 'react'

function detectBrowser() {
  const ua = navigator.userAgent
  if (navigator.brave) return 'brave'
  if (/Edg\//i.test(ua)) return 'edge'
  if (/Chrome/i.test(ua) && !/Edg/i.test(ua)) return 'chrome'
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua)) {
    return /iPhone|iPad|iPod/.test(ua) ? 'safari-ios' : 'safari-macos'
  }
  if (/Firefox/i.test(ua)) {
    return /Android/i.test(ua) ? 'firefox-android' : 'firefox-desktop'
  }
  return 'unknown'
}

function consumeEarlyCapturedEvent() {
  const captured = window.__pwaInstallPromptEvent
  if (captured) {
    delete window.__pwaInstallPromptEvent
    return captured
  }
  return null
}

const isStandalone = window.matchMedia('(display-mode: standalone)').matches
  || navigator.standalone === true

export function usePWAInstall() {
  const [browser] = useState(detectBrowser)
  const [deferredPrompt, setDeferredPrompt] = useState(consumeEarlyCapturedEvent)
  const [installed] = useState(isStandalone)
  const [dismissed, setDismissed] = useState(
    () => localStorage.getItem('pwa-install-dismissed') === 'true'
  )

  useEffect(() => {
    if (deferredPrompt) return
    const handler = (e) => {
      e.preventDefault()
      setDeferredPrompt(e)
    }
    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [deferredPrompt])

  const canNativeInstall = !!deferredPrompt
  const needsManualInstructions = ['safari-ios', 'safari-macos', 'firefox-android', 'firefox-desktop'].includes(browser)
  const showInstallPrompt = !installed && !dismissed && (canNativeInstall || needsManualInstructions)

  const triggerInstall = useCallback(async () => {
    if (!deferredPrompt) return
    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    setDeferredPrompt(null)
  }, [deferredPrompt])

  const dismiss = useCallback(() => {
    setDismissed(true)
    localStorage.setItem('pwa-install-dismissed', 'true')
  }, [])

  return {
    browser, installed, dismissed, canNativeInstall,
    needsManualInstructions, showInstallPrompt,
    triggerInstall, dismiss
  }
}
```

### Debug System

In-memory event store with floating debug pill. Alpha-phase diagnostic tool.

**Event store**: Pub/sub system with a capped circular buffer of 200 entries. Each entry has: `id`, `timestamp`, `source` (boot/db/graph/pwa/render/global), `severity` (info/success/warn/error), `event`, and optional `details`. Global `window.error` and `unhandledrejection` listeners capture crashes early. No external dependencies or persistence — purely in-memory.

**Floating debug pill**: Renders in a separate React root (survives App crashes). Collapsed state shows a "dbg" pill with entry count and error/warning badges. Expanded state has two tabs:

- **Log tab**: Scrollable list of all debug entries, color-coded by source and severity. Timestamps formatted as `HH:MM:SS.mmm`. Auto-scrolls to newest entry.
- **Environment tab**: Runtime diagnostics — URL, user agent, screen/viewport dimensions, online status, protocol, standalone mode, service worker support.

Actions: "Copy" generates a full debug report to clipboard with textarea fallback. "Clear" wipes all entries.

### App Icons from SVG Source

Single SVG source file, Sharp converts to all needed PNG sizes at 400 DPI for crisp edges.

**Dependencies:** `sharp` (devDependency)

```javascript
// scripts/generate-icons.mjs
import sharp from 'sharp';
import { readFileSync, mkdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, '..');
const SVG_SOURCE = join(ROOT, 'assets', 'icon-source.svg');
const IMAGES_DIR = join(ROOT, 'assets', 'images');

// 400 DPI: ~5.5x the default 72 DPI. Sharp rasterizes at this density
// before downscaling, so edges are anti-aliased from high-res source data.
const SVG_DENSITY = 400;

const ICONS = [
  { name: 'icon.png', size: 1024 },
  { name: 'adaptive-icon.png', size: 1024 },
  { name: 'splash-icon.png', size: 1024 },
  { name: 'favicon.png', size: 48 },
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
];

async function generate() {
  const svgBuffer = readFileSync(SVG_SOURCE);
  mkdirSync(IMAGES_DIR, { recursive: true });

  for (const icon of ICONS) {
    await sharp(svgBuffer, { density: SVG_DENSITY })
      .resize(icon.size, icon.size)
      .png()
      .toFile(join(IMAGES_DIR, icon.name));
    console.log(`  ${icon.name} (${icon.size}x${icon.size})`);
  }
  console.log(`Done — ${ICONS.length} icons generated.`);
}

generate().catch((err) => {
  console.error('Icon generation failed:', err);
  process.exit(1);
});
```

**SVG design rules for maskable icons:**
- Canvas must be square (e.g. `viewBox="0 0 1024 1024"`)
- Add `shape-rendering="geometricPrecision"` to the root `<svg>` element
- Background fills entire canvas (no transparency)
- Important content stays within the inner 80% (safe zone for maskable crop)
- Design must be legible at 48px (favicon)

### Download as PDF (via `window.print()`)

Zero-dependency PDF download using the browser's native print dialog.

**1. Trigger button:**
```jsx
<button type="button" onClick={() => window.print()}>
  Download as PDF
</button>
```

**2. The `no-print` utility class** — hide interactive elements when printing:
```css
@media print {
  .no-print {
    display: none !important;
  }
}
```

Apply `className="no-print"` to: navigation bars, action buttons, footers, modals, tooltips, debug overlays.

**3. Print-friendly CSS overrides:**
```css
@media print {
  body {
    background: white !important;
    color: black !important;
  }
  a {
    color: black !important;
    text-decoration: underline !important;
  }
  section {
    break-inside: avoid;
    page-break-inside: avoid;
  }
}
```

### Fix: Timer Leaks on Unmount (Nested Timeouts)

Debounce patterns using `setTimeout` leak when a component unmounts mid-timeout.

**Broken:**
```javascript
useEffect(() => {
  const outer = setTimeout(() => {
    doSomething();
    const inner = setTimeout(() => save(), 500); // leaked
  }, 300);
  return () => clearTimeout(outer); // only clears outer
}, [value]);
```

**Fix — track all timeout IDs:**
```javascript
useEffect(() => {
  const timeouts = [];

  const outer = setTimeout(() => {
    doSomething();
    const inner = setTimeout(() => save(), 500);
    timeouts.push(inner);
  }, 300);
  timeouts.push(outer);

  return () => timeouts.forEach(clearTimeout);
}, [value]);
```

**Alternative — mounted ref guard:**
```javascript
const mountedRef = useRef(true);
useEffect(() => () => { mountedRef.current = false; }, []);

// In any async/timeout callback:
if (!mountedRef.current) return;
```

**General rule:** Every `setTimeout`, `setInterval`, `addEventListener`, or `subscribe` call inside a `useEffect` needs a corresponding cleanup in the return function.

### HTTPS Proxy Support for Node.js Scripts

Zero-dependency HTTP CONNECT tunnel for Node.js scripts that need to reach external APIs through an HTTPS proxy. Solves the problem that Node.js's built-in `fetch()` (undici) and `https.get()` do NOT respect `HTTP_PROXY`/`HTTPS_PROXY` environment variables.

```javascript
import http from 'http';
import https from 'https';

// Detect proxy from environment variables
const PROXY_URL = process.env.https_proxy || process.env.HTTPS_PROXY || null;

function getProxyConnectOptions(targetHost) {
  const proxy = new URL(PROXY_URL);
  const options = {
    host: proxy.hostname,
    port: proxy.port,
    method: 'CONNECT',
    path: `${targetHost}:443`,
    headers: { 'Host': `${targetHost}:443` },
    timeout: 15000,
  };
  if (proxy.username) {
    const auth = Buffer.from(
      decodeURIComponent(proxy.username) + ':' + decodeURIComponent(proxy.password)
    ).toString('base64');
    options.headers['Proxy-Authorization'] = `Basic ${auth}`;
  }
  return options;
}

function httpsGet(requestUrl, headers = {}) {
  const parsed = new URL(requestUrl);
  if (PROXY_URL) {
    return httpsGetViaProxy(parsed, headers);
  }
  return httpsGetDirect(parsed, headers);
}

function httpsGetDirect(parsed, headers) {
  return new Promise((resolve, reject) => {
    const req = https.get(parsed.href, { headers, timeout: 15000 }, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(JSON.parse(data));
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data.substring(0, 200)}`));
        }
      });
    });
    req.on('error', reject);
    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
  });
}

function httpsGetViaProxy(parsed, headers) {
  return new Promise((resolve, reject) => {
    const connectOptions = getProxyConnectOptions(parsed.hostname);
    const proxyReq = http.request(connectOptions);

    proxyReq.on('connect', (res, socket) => {
      if (res.statusCode !== 200) {
        socket.destroy();
        reject(new Error(`Proxy CONNECT failed: ${res.statusCode}`));
        return;
      }
      const tlsReq = https.get({
        host: parsed.hostname,
        path: parsed.pathname + parsed.search,
        headers,
        socket,
        servername: parsed.hostname,
        timeout: 15000,
      }, (tlsRes) => {
        let data = '';
        tlsRes.on('data', (chunk) => { data += chunk; });
        tlsRes.on('end', () => {
          if (tlsRes.statusCode >= 200 && tlsRes.statusCode < 300) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`HTTP ${tlsRes.statusCode}: ${data.substring(0, 200)}`));
          }
        });
      });
      tlsReq.on('error', reject);
      tlsReq.on('timeout', () => { tlsReq.destroy(); reject(new Error('Request timeout')); });
    });

    proxyReq.on('error', reject);
    proxyReq.on('timeout', () => { proxyReq.destroy(); reject(new Error('Proxy connect timeout')); });
    proxyReq.end();
  });
}
```

**Usage:**
```javascript
const data = await httpsGet('https://api.example.com/status', {
  'User-Agent': 'MyApp/1.0',
});
```

---

## Communication Style

- Direct, concise responses
- No filler phrases or conversational padding
- State facts and actions, not opinions
- Ask specific questions with concrete options when clarification needed
- Never proceed with assumptions on ambiguous requests

---

## Testing

- Write tests for critical paths and core business logic
- Test error handling and edge cases for critical functions
- Tests are not required for trivial getters/setters or UI-only code
- Run existing tests before and after changes
- **Note:** No test framework currently configured. If tests are added, update this section with the runner and conventions.

---

## Prohibitions

Never:
- Start implementation without understanding full scope
- Create files outside established project structure
- Leave TODO comments without tracking them in docs/TODO.md
- Ignore errors or warnings in output
- Make "while I'm here" changes without asking
- Use placeholder data that looks like real data
- Skip error handling "for now"
- Write code without decision context comments for non-trivial changes
- Add workarounds for architectural issues — fix root causes (see AI Mistakes)
- Use silent `.catch(() => {})` — always handle specific errors (see AI Mistakes)
- Hardcode values that should come from CSS variables or config (see AI Mistakes)
- Document or recommend features that haven't been tested (see AI Mistakes)
- Improvise extraction/analysis workflows — follow `docs/DATA_OPERATIONS.md` exactly, step by step, using the exact formats documented (see AI Mistakes)
- Use interactive input prompts or selection UIs — list options as numbered text instead
- Remove features during "cleanup" without checking if they're documented as intentional (see AI Mistakes)

---

## AI Notes

- **Document your mistakes** in docs/AI_MISTAKES.md so future sessions learn from them
- **Always read files before editing** — use the Read tool on every file before attempting to Edit it
- **Verify before assuming** — read the actual code before claiming what it does. Don't describe behavior based on file names, comments, or assumptions — check the implementation. If the user describes how something works, compare it against the actual code rather than agreeing without verification.
- **Fix root causes, not symptoms** — when something isn't working, find out WHY before writing code. Don't add workarounds (globals, duplicate listeners, flag variables) to patch over an architectural issue. If the fix requires touching 3+ files to coordinate shared state, that's a smell — look for a simpler structural change.
- **ASK before assuming on bug reports** — when a user reports a bug, ask clarifying questions (which mode? what did you type? what do you see?) BEFORE writing code. One clarifying question saves multiple wrong commits.
- **Keep docs updated immediately** — update relevant docs right after each change, before moving to the next task (sessions can end abruptly)
- **Preserve session context** — update docs/SESSION_NOTES.md after each significant task (not at the end — sessions can end abruptly)
- **Capture ideas** — add lower priority items and improvements to docs/TODO.md so they persist between sessions
- **Document user actions** — when manual user action is required (external dashboards, credentials, etc.), add detailed instructions to docs/USER_ACTIONS.md
- **Commit and push changes before ending a session**
- **Communication style:** Direct, concise responses. No filler phrases or conversational padding. State facts and actions. Ask specific questions with concrete options when clarification is needed.
- **Claude Code mobile/web — accessing sibling repos:** Use `GITHUB_ALL_REPO_TOKEN` with the GitHub API (`api.github.com/repos/devmade-ai/{repo}/contents/{path}`) to read files from other devmade-ai repos. Use `$(printenv GITHUB_ALL_REPO_TOKEN)` not `$GITHUB_ALL_REPO_TOKEN` to avoid shell expansion issues. Never clone sibling repos — use the API instead.

### Personas

Default mode is development (`@coder`). Use `@data` to switch when needed.

- **@coder (default):** Development work — writing/modifying code, bug fixes, feature implementation, code review, refactoring, technical decisions
- **@data:** Data extraction and processing — start message with `@data`. See `docs/DATA_OPERATIONS.md` for details.
  - **"hatch the chicken"** — Full reset: delete everything, AI analyzes ALL commits from scratch
  - **"feed the chicken"** — Incremental: AI analyzes only NEW commits not yet processed

---
