# Debug System

Two-phase diagnostic system with in-memory event store, pub/sub, and floating debug pill.

## Architecture

**Phase 1: Inline HTML pill** (`index.html` inline script)
- Runs before any JS bundle loads — works even when the bundle fails entirely
- Captures `window.onerror` and `unhandledrejection` events
- Shows collapsed error pill (bottom-right) with expand/collapse diagnostics view
- Loading timeout (20s) warns user if React hasn't mounted
- SW recovery (30s) clears caches and reloads if app is stuck
- Skipped in embed mode (`?embed=`)

**Phase 2: React DebugPill** (`js/components/DebugPill.jsx`, mounted in `#debug-root`)
- Renders in a separate React root — survives App crashes
- On mount: transfers inline pill errors into debugLog, hides inline pill UI
- Redirects future `window.__debugPushError` calls into debugLog
- 3 tabs: Log, Environment, PWA Diagnostics
- Clipboard fallbacks: ClipboardItem Blob → writeText → textarea
- URL query param redaction in debug reports

**Handoff:** When React mounts, `main.jsx` transfers existing errors from `window.__debugErrors` into the `debugLog` module, hides the inline banner, and sets `window.__debugReactPillMounted = true`. Future `__debugPushError` calls are redirected to `debugAdd()` while also keeping the inline pill array updated as a backup.

## Event Store (`js/debugLog.js`)

Pub/sub system with a capped circular buffer of 200 entries.

**Entry structure:**
```javascript
{
  id: number,           // Auto-incrementing
  timestamp: string,    // ISO 8601
  source: string,       // 'boot' | 'react' | 'pwa' | 'network' | 'console' | 'global'
  severity: string,     // 'info' | 'success' | 'warn' | 'error'
  event: string,        // Human-readable description
  details: object|null  // Optional key-value pairs (e.g. { stack: '...' })
}
```

**API:**
- `debugAdd(source, severity, event, details?)` — add entry, notify subscribers
- `debugSubscribe(fn)` — returns unsubscribe function; called with entries array on add/clear
- `debugGetEntries()` — shallow copy of all current entries
- `debugClear()` — wipe all entries, notify subscribers
- `debugGenerateReport()` — full text report with environment, PWA state, and all entries; URL query params redacted

## Console Interception (`js/debugConsoleInterceptor.js`)

Patches `console.error` and `console.warn` at module load (imported before React in `main.jsx`). Calls the original console method first, then feeds the message into `debugAdd` with `source: 'console'`. Captures React warnings, prop validation errors, and any runtime `console.error` calls.

## React DebugPill (`js/components/DebugPill.jsx`)

**Collapsed state:** Small pill badge showing "dbg" with entry count and error/warning badges. Color-coded: green (ok), amber (warnings), red (errors).

**Expanded state:** Full-width bottom panel with 3 tabs:

| Tab | Content |
|-----|---------|
| Log | Scrollable list of all debug entries. Color-coded by source and severity. Timestamps as HH:MM:SS.mmm. Auto-scrolls to newest. |
| Environment | Runtime diagnostics: network, protocol, screen/viewport, theme, SW status, standalone mode, React mounted, user agent. |
| PWA | Install state, update state, checking status, standalone, prompt received, build time, install history (last 10 events). |

**Actions:** Copy (generates full report to clipboard with 3-tier fallback), Clear (log tab only), Close.

## Clipboard Fallbacks

Three-tier fallback for maximum browser compatibility:

1. **ClipboardItem Blob** — best (preserves MIME type), works in modern browsers
2. **navigator.clipboard.writeText** — simpler API, widely supported
3. **textarea + execCommand('copy')** — works in sandboxed iframes and older browsers

## Files

| File | Purpose |
|------|---------|
| `dashboard/index.html` | Inline HTML pill (pre-React), `#debug-root` div |
| `dashboard/js/debugLog.js` | Event store with pub/sub |
| `dashboard/js/debugConsoleInterceptor.js` | Console.error/warn patching |
| `dashboard/js/components/DebugPill.jsx` | React debug pill (3 tabs) |
| `dashboard/js/main.jsx` | Mounts React pill, bridges inline → React |
| `dashboard/styles.css` | Debug pill and panel styles |
