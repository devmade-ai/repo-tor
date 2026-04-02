# Debug System

In-memory event store with floating debug pill. Alpha-phase diagnostic tool.

**Event store**: Pub/sub system with a capped circular buffer of 200 entries. Each entry has: `id`, `timestamp`, `source` (boot/db/graph/pwa/render/global), `severity` (info/success/warn/error), `event`, and optional `details`. Global `window.error` and `unhandledrejection` listeners capture crashes early. No external dependencies or persistence — purely in-memory.

**Floating debug pill**: Renders in a separate React root (survives App crashes). Collapsed state shows a "dbg" pill with entry count and error/warning badges. Expanded state has two tabs:

- **Log tab**: Scrollable list of all debug entries, color-coded by source and severity. Timestamps formatted as `HH:MM:SS.mmm`. Auto-scrolls to newest entry.
- **Environment tab**: Runtime diagnostics — URL, user agent, screen/viewport dimensions, online status, protocol, standalone mode, service worker support.

Actions: "Copy" generates a full debug report to clipboard with textarea fallback. "Clear" wipes all entries.
