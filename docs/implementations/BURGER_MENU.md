# Burger Menu

Dropdown navigation menu triggered by a hamburger icon. Uses the WAI-ARIA **disclosure pattern** (not `role="menu"`) because a burger nav is a list of links/actions revealed by a toggle, not an application menu (File/Edit/View).

## Z-Index Scale

All components should follow this scale to prevent stacking conflicts:

| Layer | Z-Index | Examples |
|-------|---------|----------|
| Base content | 0-10 | Page content, cards |
| Sticky headers | 20 | App bar, tab bar |
| Sheets / drawers | 30 | Filter sidebar, detail pane |
| Menu backdrop | 40 | Burger menu backdrop |
| Menu dropdown | 50 | Burger menu card |
| Modals | 60 | Quick Guide, confirmation dialogs |
| Toasts / banners | 70 | Update banner, install prompt |
| Debug pill | 80 | Debug overlay (separate from React) |

## Key Patterns

### Disclosure Pattern (not ARIA menu)

Using `role="menu"` causes screen readers (JAWS, NVDA) to enter forms mode, suppressing normal navigation keys. A burger nav should use:
- `aria-expanded` on trigger button
- `<nav>` with `<ul>/<li>` list structure
- No `role="menu"`, `role="menuitem"`, or `aria-haspopup`

### iOS Safari Backdrop Fix

iOS Safari does not fire click events on empty `<div>` elements. The backdrop overlay must have `cursor: pointer` or it silently fails to close on all iPhones and iPads.

### Focus Management

- **`useId()` for unique IDs**: Prevents `aria-controls` collisions if multiple instances exist.
- **`hasBeenOpenRef` guard**: The focus-return effect runs when `open` is `false`, including initial mount. Guard with a ref that only becomes `true` after the menu has been opened at least once.
- **`cancelAnimationFrame` cleanup**: `requestAnimationFrame` used for focusing the first item must be cancelled if the component unmounts before the next frame.

### Scroll Chaining Prevention

Use `overscroll-behavior: contain` on the menu card instead of `document.body.style.overflow = 'hidden'`. Avoids the race where two components both write body overflow and one overwrites the other's cleanup.

### Close-Then-Act Pattern

Close the menu before executing the action to prevent visual glitches from state changes while the menu is visible. Use a 150ms delay (accounts for CSS transition settle time). Clean up the timer on unmount using a ref.

## Reference Implementation

```jsx
import { useState, useRef, useCallback, useEffect, useId } from 'react'

export function BurgerMenu({ items }) {
  const menuId = useId()
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const timerRef = useRef(null)
  const hasBeenOpenRef = useRef(false)

  const visibleItems = items.filter((item) => item.visible !== false)

  const close = useCallback(() => setOpen(false), [])

  const handleItem = useCallback((action) => {
    close()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try { await action() } catch (e) { console.error('Menu action failed:', e) }
    }, 150)
  }, [close])

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // Focus management
  useEffect(() => {
    if (open) {
      hasBeenOpenRef.current = true
      const rafId = requestAnimationFrame(() => {
        const firstItem = menuRef.current?.querySelector('button, a')
        firstItem?.focus()
      })
      return () => cancelAnimationFrame(rafId)
    } else if (hasBeenOpenRef.current) {
      triggerRef.current?.focus()
    }
  }, [open])

  // Escape key
  useEffect(() => {
    if (!open) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); close() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, close])

  return (
    <div className="relative no-print">
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Menu"
      >
        {/* hamburger icon */}
      </button>

      {open && (
        <>
          {/* cursor-pointer required for iOS Safari */}
          <div className="fixed inset-0 z-40 cursor-pointer" onClick={close} />
          <nav
            ref={menuRef}
            id={menuId}
            aria-label="Main navigation"
            className="absolute right-0 top-full mt-2 z-50 overscroll-contain"
          >
            <ul className="list-none m-0 p-0">
              {visibleItems.map((item) => (
                <li key={item.label}>
                  <button type="button" onClick={() => handleItem(item.action)}>
                    {item.label}
                  </button>
                </li>
              ))}
            </ul>
          </nav>
        </>
      )}
    </div>
  )
}
```

## Key Lessons

1. **`role="menu"` is for application menus only** — screen readers enter forms mode.
2. **iOS Safari needs `cursor-pointer` on backdrop** — empty divs don't receive clicks.
3. **Guard focus-return with `hasBeenOpenRef`** — prevents stealing focus on mount.
4. **`cancelAnimationFrame` cleanup** — prevents callback on unmounted components.
5. **`overscroll-contain` avoids scroll lock race** — no body overflow manipulation.
6. **Close menu before executing action** — 150ms delay for transition settle.
