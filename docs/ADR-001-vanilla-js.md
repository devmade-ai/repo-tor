# ADR-001: Dashboard Framework Decision

**Status:** Superseded — migrated to React (2026-02-10)
**Original Date:** 2026-02-10
**Context:** Dashboard built as a read-only analytics viewer for git commit data.

## Current Decision

Migrated to **React + Tailwind** with react-chartjs-2 for declarative rendering, component isolation, and better developer ergonomics. The original vanilla JS approach worked well but React provides a cleaner foundation for future development.

## Original Decision (Vanilla JS)

Use vanilla JavaScript with ES modules (bundled by Vite) instead of React, Vue, Svelte, or another UI framework.

## Why

The dashboard is a **read-only analytics viewer** — it loads JSON data, renders charts and cards, and lets users filter/drilldown. There are no forms, no complex state flows, no routing, and no deeply nested component trees.

At ~5,400 lines across 10 modules, the codebase is well within what vanilla JS handles cleanly. A framework would add:

- Bundle size (React alone is ~40KB gzipped)
- Build complexity (JSX transpilation, framework-specific tooling)
- Framework-specific debugging instead of standard browser DevTools
- Boilerplate for features we don't need (virtual DOM, component lifecycle, state management libraries)

The project's core principle is **simplicity** — a framework adds indirection without solving a real problem at this scale.

## Trade-offs Accepted

Vanilla JS does have friction points that a framework would solve:

| Pain Point | Our Mitigation |
|------------|---------------|
| HTML string building (innerHTML) | Template helper functions in `utils.js` for repeated patterns |
| Event listener management | Delegated handlers on `#dashboard` via `setupDelegatedHandlers()` |
| Manual escaping (XSS prevention) | `escapeHtml()` used consistently; no raw user data in templates |
| No component reuse | Shared template functions for cards, bars, stats |
| Large tab file | Split into `js/tabs/` — one file per render function |

These are **code organization problems, not framework problems**. They're solved by better patterns within vanilla JS.

## When to Reconsider

Adopt a framework if the dashboard gains:

- **Editable data** (forms, inline editing, validation)
- **Complex state flows** (undo/redo, optimistic updates, real-time sync)
- **Multi-page routing** beyond tab switching
- **Deeply nested reusable components** with shared state

If that happens, **Preact** (3KB, React-compatible API) or **Svelte** (compiles away, minimal runtime) would be the best fits for this project's size and simplicity goals. React/Vue/Angular would be overkill.

## React Migration Cost Assessment (2026-02-10)

A detailed migration analysis was performed. Key findings:

- **~3,500 lines** of DOM-touching code would need rewriting
- **~1,000 lines** (utils, data loading, PWA) transfer unchanged
- **~20-25 React components** needed
- **Tailwind classes** transfer 1:1 into JSX
- **Highest-risk area:** `filters.js` (593 lines of intertwined state logic)
- **No automated tests** — all verification would be visual

**Conclusion:** Migration is feasible but offers no user-facing value for a read-only dashboard. The cost is real; the benefit is developer ergonomics for hypothetical future features.

Full breakdown in `docs/TODO.md` under "React + Tailwind Migration".

## History

The dashboard started as a monolithic 6,927-line `index.html` (2026-02-05), was modularized into 10 ES modules with Vite (2026-02-06), and has since been refined with event delegation, lazy rendering, and role-based views — all in vanilla JS.
