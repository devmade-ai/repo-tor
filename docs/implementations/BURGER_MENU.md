# Burger Menu

Dropdown navigation menu triggered by a hamburger icon. Uses the WAI-ARIA **disclosure pattern** (not `role="menu"`) because a burger nav is a list of links/actions revealed by a toggle, not an application menu (File/Edit/View). Two variants: React (Vite + Tailwind) for web-only projects, React Native (Expo) for cross-platform.

## Z-Index Scale

All projects should follow this scale to prevent stacking conflicts between the burger menu, debug pill, modals, toasts, and install banners:

| Layer | Z-Index | Examples |
|-------|---------|----------|
| Base content | 0-10 | Page content, cards |
| Sticky headers | 20 | App bar, bottom nav |
| Sheets / drawers | 30 | Bottom sheets, side panels |
| Menu backdrop | 40 | Burger menu backdrop |
| Menu dropdown | 50 | Burger menu card |
| Modals | 60 | Dialogs, confirmation modals |
| Toasts / banners | 70 | Update banner, install prompt |
| Debug pill | 80 | Debug overlay (separate React root) |

## Standard Menu Items

Adapt per project. Show/hide based on state — never render disabled items.

| Item | When to show | Category |
|------|-------------|----------|
| How to use / Tutorial | Always | Help |
| User Guide | Always (external link — show indicator) | Help |
| Dark / Light mode toggle | Always | Preferences |
| Check for updates | Web platform + PWA registered | PWA |
| Install app | Web + not installed + not dismissed | PWA |
| Admin | When authenticated admin | Auth |
| Sign out | When authenticated | Auth |

## React Web (`BurgerMenu.jsx`)

Disclosure-pattern dropdown with backdrop. Tailwind CSS for styling (v3 and v4 compatible).

```jsx
import { useState, useRef, useCallback, useEffect, useId } from 'react'

// Requirement: Global nav menu accessible from header
// Approach: Disclosure-pattern dropdown with backdrop
// Why disclosure, not role="menu": ARIA menu pattern is for app menus
//   (File/Edit/View). Screen readers enter forms mode, suppress normal nav
//   keys, and expect arrow-key navigation. A burger nav is a disclosure.
// Alternatives:
//   - role="menu" pattern: Rejected — wrong ARIA semantics for navigation
//   - Slide-out drawer: Rejected — needs animation lib, fights with bottom nav
//   - Headless UI Disclosure: Viable — adds dependency for a single component

export function BurgerMenu({ items, id }) {
  const autoId = useId()
  const menuId = id || `nav-menu-${autoId}`
  const [open, setOpen] = useState(false)
  const triggerRef = useRef(null)
  const menuRef = useRef(null)
  const timerRef = useRef(null)
  const hasBeenOpenRef = useRef(false)

  const visibleItems = items.filter((item) => item.visible !== false)

  const close = useCallback(() => setOpen(false), [])

  // Close menu first, then execute action after DOM settles.
  // 150ms accounts for any CSS transition — adjust if animation changes.
  const handleItem = useCallback((action) => {
    close()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try { await action() } catch (e) { console.error('Menu action failed:', e) }
    }, 150)
  }, [close])

  // Cleanup pending action timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // Focus management: focus first item on open, return to trigger on close.
  // hasBeenOpenRef prevents stealing focus on initial mount (open starts false).
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

  // Escape key closes menu
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
        className="p-2 rounded-lg hover:bg-black/5 dark:hover:bg-white/10
                   transition-colors"
        aria-expanded={open}
        aria-controls={menuId}
        aria-label="Menu"
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24"
             stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round"
                d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      {open && (
        <>
          {/* Backdrop — z-40. cursor-pointer required for iOS Safari
              (empty divs don't receive click events without it). */}
          <div
            className="fixed inset-0 z-40 cursor-pointer"
            onClick={close}
          />

          <nav
            ref={menuRef}
            id={menuId}
            aria-label="Main navigation"
            className="absolute right-0 top-full mt-2 z-50
                       w-56 max-w-[calc(100vw-2rem)] rounded-xl shadow-lg
                       bg-white dark:bg-zinc-800
                       border border-zinc-200 dark:border-zinc-700
                       py-1 overflow-hidden overscroll-contain"
          >
            <ul className="list-none m-0 p-0">
              {visibleItems.map((item, i) => (
                <li key={item.label}>
                  {item.separator && i > 0 && (
                    <hr className="my-1 border-zinc-200 dark:border-zinc-700" />
                  )}
                  <button
                    type="button"
                    onClick={() => handleItem(item.action)}
                    className={`w-full text-left px-4 py-2.5 text-sm truncate
                      transition-colors outline-none
                      focus-visible:ring-2 focus-visible:ring-blue-500
                      ${item.destructive
                        ? 'text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20'
                        : 'text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-700'
                      }`}
                  >
                    {item.label}
                    {item.external && (
                      <svg className="inline-block w-3 h-3 ml-1.5 opacity-40"
                           viewBox="0 0 12 12" fill="none" stroke="currentColor"
                           strokeWidth={1.5} aria-hidden="true">
                        <path d="M3.5 3H9v5.5M9 3L3 9" strokeLinecap="round"
                              strokeLinejoin="round" />
                      </svg>
                    )}
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

- **Disclosure pattern, not ARIA menu**: `aria-expanded` on trigger, `<nav>` with `<ul>/<li>` — no `role="menu"`, no `role="menuitem"`, no `aria-haspopup`. Using `role="menu"` causes screen readers (JAWS, NVDA) to enter forms mode, suppressing normal navigation keys and confusing users who expect link-style Tab navigation.
- **`useId()` for unique IDs**: Prevents `aria-controls` collisions if multiple BurgerMenu instances exist on the same page.
- **`cursor-pointer` on backdrop**: iOS Safari does not fire click events on empty `<div>` elements. Without `cursor-pointer`, tapping outside the menu on iPhone/iPad silently fails to close it.
- **`hasBeenOpenRef` guard**: Without this, the focus-return `useEffect` runs on initial mount (when `open` starts as `false`), stealing focus from wherever the user currently is.
- **`cancelAnimationFrame` cleanup**: The `requestAnimationFrame` used for focusing the first item must be cancelled if the component unmounts before the next frame.
- **`overscroll-contain`**: Prevents scroll chaining (scrolling the page behind the menu) without touching `document.body.style.overflow`. Avoids the double-lock problem where two components both write body overflow and one overwrites the other's cleanup.
- **`max-w-[calc(100vw-2rem)]`**: Prevents the dropdown from overflowing the viewport on narrow screens.
- **`truncate`**: Prevents long menu item labels from breaking the layout.

**Usage:**

```jsx
<BurgerMenu items={[
  { label: 'How to use', action: () => setShowTutorial(true) },
  { label: 'User Guide', action: () => window.open(GUIDE_URL, '_blank'), external: true },
  { label: darkMode ? 'Light mode' : 'Dark mode', action: toggleDarkMode, separator: true },
  { label: 'Check for updates', action: checkForUpdates, visible: isPWA },
  { label: 'Install app', action: triggerInstall, visible: showInstallPrompt },
  { label: 'Sign out', action: signOut, visible: isAuth, separator: true, destructive: true },
]} />
```

## React Native (`BurgerMenu.tsx`)

Modal dropdown with transparent backdrop. Cross-platform (iOS, Android, web via Expo).

```tsx
import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Modal, Pressable, View, Text, StyleSheet, Platform, AccessibilityInfo
} from 'react-native'
import { FontAwesome } from '@expo/vector-icons'

// Requirement: Global nav menu accessible from header
// Approach: Modal dropdown with transparent backdrop (disclosure pattern)
// Alternatives:
//   - react-native-drawer-layout: Rejected — extra dependency, fights with tab nav
//   - ActionSheet: Rejected — no custom styling, platform-inconsistent

interface MenuItem {
  label: string
  action: () => void | Promise<void>
  visible?: boolean
  separator?: boolean
  destructive?: boolean
  external?: boolean
}

interface BurgerMenuProps {
  items: MenuItem[]
  theme: {
    surface: string; border: string; text: string
    textSecondary: string; danger: string
  }
}

// Set this to match your app's header height (status bar + nav bar).
// React Native Modal renders in its own layer detached from the trigger,
// so there is no CSS top-full equivalent — this must be a known constant.
const MENU_TOP = 52

export function BurgerMenu({ items, theme }: BurgerMenuProps) {
  const [open, setOpen] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const visibleItems = items.filter((item) => item.visible !== false)

  const close = useCallback(() => setOpen(false), [])

  // Close menu first, then execute action after Modal dismiss settles.
  // 150ms accounts for Modal fade animation — adjust if animationType changes.
  const handleItem = useCallback((action: () => void | Promise<void>) => {
    close()
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      try { await action() } catch (e) { console.error('Menu action failed:', e) }
    }, 150)
  }, [close])

  // Cleanup pending action timer on unmount
  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, [])

  // Announce menu state to screen readers
  useEffect(() => {
    if (open) AccessibilityInfo.announceForAccessibility('Menu opened')
  }, [open])

  // Explicit Escape key handler for web — onRequestClose is not always
  // reliable for Escape on all React Native Web versions.
  useEffect(() => {
    if (!open || Platform.OS !== 'web') return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { e.preventDefault(); close() }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [open, close])

  return (
    <>
      <Pressable
        onPress={() => setOpen((o) => !o)}
        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        accessibilityRole="button"
        accessibilityLabel="Menu"
        accessibilityState={{ expanded: open }}
      >
        <FontAwesome name="bars" size={20} color={theme.textSecondary} />
      </Pressable>

      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={close}
      >
        {/* Backdrop: e.target === e.currentTarget instead of stopPropagation
            on children — more reliable in React Native Web. */}
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={(e) => {
            if (e.target === e.currentTarget) close()
          }}
        >
          <View
            style={[styles.dropdown, {
              backgroundColor: theme.surface,
              borderColor: theme.border,
            }]}
          >
            {visibleItems.map((item, i) => (
              <View key={item.label}>
                {item.separator && i > 0 && (
                  <View style={[styles.separator, { backgroundColor: theme.border }]} />
                )}
                <Pressable
                  style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
                  onPress={() => handleItem(item.action)}
                  accessibilityRole="button"
                  accessibilityLabel={
                    item.external ? `${item.label}, opens externally` : item.label
                  }
                >
                  <Text
                    style={[
                      styles.itemText,
                      { color: item.destructive ? theme.danger : theme.text },
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}{item.external ? ' ↗' : ''}
                  </Text>
                </Pressable>
              </View>
            ))}
          </View>
        </Pressable>
      </Modal>
    </>
  )
}

const styles = StyleSheet.create({
  dropdown: {
    position: 'absolute',
    right: 12,
    top: MENU_TOP,
    width: 220,
    maxWidth: '85%',
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
    paddingVertical: 4,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
             shadowOpacity: 0.15, shadowRadius: 12 },
      android: { elevation: 8 },
      default: { boxShadow: '0 4px 16px rgba(0,0,0,0.12)' },
    }),
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 4,
  },
  item: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 44,
  },
  itemPressed: {
    opacity: 0.7,
  },
  itemText: {
    fontSize: 15,
  },
})
```

- **`onRequestClose={close}`**: Handles Android hardware back button. Also fires on Escape in some React Native Web versions, but the explicit `keydown` listener provides reliable backup.
- **`e.target === e.currentTarget` on backdrop**: `stopPropagation()` on nested `Pressable` components is unreliable in React Native Web — the RN event system is separate from the DOM event system. Checking the target on the outer handler is more robust.
- **`MENU_TOP` as a project-level constant**: React Native `Modal` renders in its own layer detached from the trigger element. There is no CSS `top-full` equivalent — the menu position must be a known value matching the app's header height. Adjust this per project.
- **All colors from `theme` prop**: No hardcoded color values in the component. Platform shadows (`shadowColor`, `elevation`, `boxShadow`) use neutral values since shadow theming is not practical cross-platform.
- **`minHeight: 44`**: Minimum touch target per Apple HIG and Material Design guidelines.
- **`numberOfLines={1}`**: Prevents long labels from breaking the menu layout.
- **`AccessibilityInfo.announceForAccessibility`**: Notifies screen readers when the menu opens, since React Native does not automatically announce modal visibility changes on all platforms.

## Key Lessons

1. **`role="menu"` is for application menus only** — File/Edit/View style. Screen readers enter forms mode, suppress normal navigation keys, and expect arrow-key item navigation. A burger nav menu is a disclosure — use `aria-expanded` on the trigger and `<nav>` with a `<ul>/<li>` list. Do not use `aria-haspopup` (it signals "this opens an application menu").
2. **iOS Safari does not fire click events on empty divs** — the backdrop overlay must have `cursor: pointer` (Tailwind: `cursor-pointer`) or it silently fails on all iPhones and iPads. This is an intentional iOS Safari optimization, not a bug, and has persisted across all iOS versions.
3. **Don't steal focus on mount** — the "return focus to trigger on close" effect runs when `open` is `false`, which includes initial mount. Guard with a `hasBeenOpenRef` flag that only becomes `true` after the menu has been opened at least once.
4. **`requestAnimationFrame` needs cleanup** — return `cancelAnimationFrame(id)` from the effect. Without it, the callback fires on unmounted components if the component is destroyed before the next frame.
5. **`overscroll-behavior: contain` avoids the scroll lock race** — two components both writing `document.body.style.overflow = 'hidden'` causes one to overwrite the other's cleanup on unmount. Using `overscroll-contain` on the menu card prevents scroll chaining without touching body styles.
6. **`stopPropagation` is unreliable in React Native Web** — nested `Pressable` event propagation doesn't always work because the RN event system is separate from the DOM. Use `e.target === e.currentTarget` on the outer backdrop handler instead.
7. **RN Modal `onRequestClose` is not enough for web Escape** — it reliably handles Android back button but not always Escape on React Native Web. Add an explicit `keydown` listener as backup for `Platform.OS === 'web'`.
8. **Close-then-act with 150ms delay** — close the menu before executing the action to prevent visual glitches from state changes while the menu is visible. The 150ms accounts for Modal/CSS transition settle time. Clean up the timer on unmount using a ref.
9. **Tailwind v4 `dark:` variant requires project-level config** — v4 defaults to `prefers-color-scheme` (OS preference). For class-based dark mode toggling (`.dark` on `<html>`), the project must add `@custom-variant dark (&:where(.dark, .dark *));` to its CSS. This is the project's responsibility, not the component's. All other Tailwind classes used here are compatible with both v3 and v4.
10. **If wrapping in `React.memo`, memoize the `items` array** — inline array literals (`items={[...]}`) create new references every render, defeating memoization. Use `useMemo` for the items array if the parent re-renders frequently and the menu is memoized.
