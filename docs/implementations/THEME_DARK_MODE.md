# Theme & Dark Mode

User-controlled dark/light mode with CSS variable theming, system preference fallback, persistence, flash prevention, and cross-tab sync.

Adapted for repo-tor's stack: React 19 + Vite + Tailwind v4 + DaisyUI v5 with custom CSS variables.

## Dual-Layer Theming

Tailwind v4, DaisyUI, and the CSS variable system use different mechanisms. All must be set together on every theme change:

1. **`.dark` class on `<html>`** — Tailwind's `dark:` variant reads this for utility classes
2. **`data-theme` attribute on `<html>`** — DaisyUI reads this for component theming (themes: `corporate` light, `business` dark)
3. **CSS variables on `:root`** — Dashboard components read these for colors, shadows, etc.
4. **`color-scheme: dark/light` on `html`** — Browser reads this for native form inputs, scrollbars
5. **`<meta name="theme-color">`** — Browser reads this for address bar and task switcher color

### CSS Setup (Tailwind v4 + DaisyUI v5)

```css
@import "tailwindcss";

@plugin "daisyui" {
    themes: corporate --default, business --prefersdark;
}

/* Class-based dark mode for Tailwind v4 */
@custom-variant dark (&:where(.dark, .dark *));
```

## Persistence

Three localStorage keys:

| Key | Value | Example |
|-----|-------|---------|
| `darkMode` | `'true'` or `'false'` | `'true'` |

When the user toggles, persist their choice. On next visit, read and apply before first paint.

## Safe localStorage Wrappers

localStorage throws `SecurityError` in sandboxed iframes, disabled-storage settings, and some enterprise environments. Wrap all access:

```javascript
export function safeStorageGet(key) {
  try { return localStorage.getItem(key) } catch { return null }
}

export function safeStorageSet(key, value) {
  try { localStorage.setItem(key, value) } catch { /* sandboxed iframe, disabled storage */ }
}
```

When storage is unavailable, degrade to OS preference — no crash, no unstyled page.

## Flash Prevention

### Inline Script in `<head>`

The theme hook/script runs after mount — too late. An inline classic `<script>` in `<head>` reads localStorage and sets `.dark` class, `data-theme` attribute, and `<meta name="theme-color">` before the first paint:

```html
<meta name="theme-color" content="#F8F9FA" media="(prefers-color-scheme: light)">
<meta name="theme-color" content="#1B1B1B" media="(prefers-color-scheme: dark)">
<script>
  (function() {
    try {
      var stored = localStorage.getItem('darkMode');
      var isDark = stored !== null
        ? stored === 'true'
        : window.matchMedia('(prefers-color-scheme: dark)').matches;
      var html = document.documentElement;
      if (isDark) {
        html.classList.add('dark');
        html.setAttribute('data-theme', 'business');
      } else {
        html.classList.remove('dark');
        html.setAttribute('data-theme', 'corporate');
      }
      var color = isDark ? '#1B1B1B' : '#F8F9FA';
      var metas = document.querySelectorAll('meta[name="theme-color"]');
      for (var i = 0; i < metas.length; i++) metas[i].setAttribute('content', color);
    } catch(e) {}
  })();
</script>
```

- **Must be classic script, not `type="module"`**: Module scripts are deferred — too late.
- **try/catch**: Handles environments where localStorage is unavailable.
- **Two `<meta name="theme-color">` tags with media queries**: Browser picks the correct one for OS preference before JS runs. The inline script overrides both to match the stored user preference.
- **`data-theme` attribute**: DaisyUI reads this for component theming. Must be set alongside `.dark` class.

## Cross-Tab Sync

The `storage` event fires in other tabs (not the one that wrote), so there's no infinite loop:

```javascript
useEffect(() => {
  const handleStorage = (e) => {
    if (e.key === 'darkMode') {
      const newDark = e.newValue === 'true';
      applyTheme(newDark);
    }
  };
  window.addEventListener('storage', handleStorage);
  return () => window.removeEventListener('storage', handleStorage);
}, []);
```

## System Preference Fallback

On first visit with no stored preference, use `matchMedia`. Once the user toggles manually, their choice persists and OS changes are ignored:

```javascript
const stored = safeStorageGet('darkMode');
const isDark = stored !== null
  ? stored === 'true'
  : window.matchMedia('(prefers-color-scheme: dark)').matches;

// Track OS changes — only when no explicit user choice
const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
mediaQuery.addEventListener('change', (e) => {
  if (safeStorageGet('darkMode') === null) {
    applyTheme(e.matches);
  }
});
```

System preference is a **fallback, not an override**. Overriding a manual choice is disorienting.

## Key Lessons

1. **Flash prevention requires inline `<script>` in `<head>`** — must run before any CSS or module loads.
2. **Must be classic script, not module** — modules are deferred, too late for first paint.
3. **System preference is fallback, not override** — once user toggles manually, their choice persists.
4. **Cross-tab sync via `storage` event** — fires only in other tabs, no infinite loop.
5. **Wrap all localStorage in try/catch** — sandboxed iframes and enterprise policies throw.
6. **No CSS transitions on theme switch** — instant switches are industry standard (GitHub, Discord, VS Code).
