# PWA System

Four parts, built on `vite-plugin-pwa` (^1.2.0) with React. Adapt patterns for other frameworks (glow-props uses vanilla JS).

**React dependency note:** React projects using `virtual:pwa-register/react` require `workbox-window` as a dev dependency: `npm install -D workbox-window`. Add `/// <reference types="vite-plugin-pwa/react" />` to your type declarations.

## Vite Config (`vite.config.ts`)

```typescript
import { VitePWA } from 'vite-plugin-pwa'

// Inside defineConfig plugins array:
VitePWA({
  registerType: 'prompt',
  includeAssets: ['favicon.ico', 'apple-touch-icon.png'],
  workbox: {
    cleanupOutdatedCaches: true,
    globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
    // SPA only — omit for multi-page apps:
    // navigateFallback: '/index.html',
  },
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

- **`registerType: 'prompt'`**: Users control when updates apply. `autoUpdate` silently refreshes mid-work. **Never switch from `autoUpdate` to `prompt` in production** — users with the auto-updating SW already installed will never see the prompt-based code because the old SW silently replaces itself before the new registration logic runs.
- **`workbox.cleanupOutdatedCaches`**: Removes caches from incompatible older Workbox major versions. Without this, stale caches accumulate across deployments.
- **`workbox.globPatterns`**: Explicit precache patterns. The default may miss font or image types your app uses.
- **`navigateFallback`**: Only set for SPAs. For multi-page apps (multiple HTML entry points), omit this — it would incorrectly serve `index.html` for all navigation requests.
- **`id`**: Stable app identity. Without it, Chrome derives from `start_url` — breaks on config changes or redeployments.
- **`prefer_related_applications: false`**: Without this, Chrome may skip `beforeinstallprompt` if it thinks a native app exists.
- **Separate icon purposes**: `any` for standard display (192, 512), `maskable` for full-bleed (1024). Never combine `"any maskable"` — browsers pick the wrong one. Use a dedicated 1024x1024 for maskable.
- **`theme_color`**: Static fallback for the browser chrome. Overrides meta tags in Android PWA standalone mode.

## Install Prompt Race Condition (`index.html`)

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

Executes synchronously during HTML parse. Stashes the event for the React hook to consume. `e.preventDefault()` suppresses the browser's default mini-infobar. The hook's fallback `useEffect` listener handles first-visit timing (SW registers after mount). Neither alone covers both cases.

## Service Worker Updates (`usePWAUpdate.ts`)

Wraps `vite-plugin-pwa`'s React hook. Exposes `hasUpdate` boolean and `update()`. Checks for new SW versions every 60 minutes.

**Critical:** `onRegistered` fires on every mount. Putting `setInterval` inside it leaks intervals on remount (Strict Mode, HMR, navigation). Store the registration in a ref and manage the interval in a separate `useEffect` with cleanup.

```typescript
import { useRegisterSW } from 'virtual:pwa-register/react'
import { useEffect, useRef, useState } from 'react'

const CHECK_INTERVAL_MS = 60 * 60 * 1000

export function usePWAUpdate() {
  // Requirement: Periodic SW update checks without leaking intervals
  // Approach: Store registration in ref, manage interval in useEffect with cleanup
  // Why: onRegistered fires per mount — setInterval inside it leaks on remount
  const registrationRef = useRef<ServiceWorkerRegistration | undefined>(undefined)
  const [registered, setRegistered] = useState(false)

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      if (r) {
        registrationRef.current = r
        setRegistered(true)
      }
    },
  })

  // Separate effect for the interval — cleans up on unmount
  useEffect(() => {
    if (!registered || !registrationRef.current) return
    const interval = setInterval(() => {
      registrationRef.current?.update()
    }, CHECK_INTERVAL_MS)
    return () => clearInterval(interval)
  }, [registered])

  const update = () => {
    updateServiceWorker(true)
  }

  return { hasUpdate: needRefresh, update }
}
```

**Offline-ready notifications** are handled by the Toast system (see below) rather than tracked in this hook. When the app goes offline-ready, show a toast via `useToast().addToast('Ready to work offline', { type: 'success', duration: 3000 })`.

## Install Detection (`usePWAInstall.ts`)

Captures `beforeinstallprompt` (consuming the early-captured event from `index.html`), detects browser for manual install instructions, and provides a data-driven `getInstallInstructions()` function. Hides prompt when already installed or dismissed.

```typescript
import { useState, useEffect, useMemo } from 'react'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export type BrowserType = 'chrome' | 'edge' | 'brave' | 'safari' | 'firefox' | 'unknown'

export interface InstallInstructions {
  browser: string
  steps: string[]
  note?: string
}

let deferredPrompt: BeforeInstallPromptEvent | null =
  (window as any).__pwaInstallPrompt || null

function detectBrowser(): BrowserType {
  const ua = navigator.userAgent
  if ((navigator as any).brave) return 'brave'
  if (/Firefox/i.test(ua)) return 'firefox'
  if (/Safari/i.test(ua) && !/Chrome/i.test(ua) && !/Chromium/i.test(ua)) return 'safari'
  if (/Edg\//i.test(ua)) return 'edge'
  if (/Chrome/i.test(ua) || /Chromium/i.test(ua)) return 'chrome'
  return 'unknown'
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (navigator as any).standalone === true
}

export function usePWAInstall() {
  const [canInstall, setCanInstall] = useState(false)
  const [showManualInstructions, setShowManualInstructions] = useState(false)

  const browser = useMemo(() => detectBrowser(), [])
  const isInstalled = useMemo(() => isStandalone(), [])

  const supportsAutoInstall = browser === 'chrome' || browser === 'edge' || browser === 'brave'
  const supportsManualInstall = browser === 'safari' || browser === 'firefox'

  useEffect(() => {
    if (isInstalled) { setCanInstall(false); return }

    if ((window as any).__pwaInstallPrompt && !deferredPrompt) {
      deferredPrompt = (window as any).__pwaInstallPrompt
    }
    if (deferredPrompt) setCanInstall(true)

    const handler = (e: Event) => {
      e.preventDefault()
      deferredPrompt = e as BeforeInstallPromptEvent
      setCanInstall(true)
    }

    const installedHandler = () => {
      setCanInstall(false)
      deferredPrompt = null
    }

    window.addEventListener('beforeinstallprompt', handler)
    window.addEventListener('appinstalled', installedHandler)

    const timeout = setTimeout(() => {
      if (!deferredPrompt && !isInstalled && supportsManualInstall) {
        setShowManualInstructions(true)
      }
    }, 1000)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
      window.removeEventListener('appinstalled', installedHandler)
      clearTimeout(timeout)
    }
  }, [isInstalled, supportsManualInstall])

  const install = async (): Promise<boolean> => {
    if (!deferredPrompt) return false
    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setCanInstall(false)
      deferredPrompt = null
      return true
    }
    return false
  }

  const getInstallInstructions = (): InstallInstructions => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent)
    const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent)

    switch (browser) {
      case 'safari':
        if (isIOS) {
          return {
            browser: 'Safari (iOS)',
            steps: [
              'Tap the Share button (square with arrow) at the bottom of the screen',
              'Scroll down and tap "Add to Home Screen"',
              'Tap "Add" in the top right corner',
            ],
          }
        }
        return {
          browser: 'Safari (macOS)',
          steps: [
            'Click File in the menu bar',
            'Select "Add to Dock..."',
            'Click "Add" to confirm',
          ],
        }
      case 'firefox':
        if (isMobile) {
          return {
            browser: 'Firefox (Mobile)',
            steps: [
              'Tap the menu button (three dots)',
              'Tap "Add to Home screen"',
              'Tap "Add" to confirm',
            ],
          }
        }
        return {
          browser: 'Firefox (Desktop)',
          steps: [
            'Firefox desktop does not support PWA installation',
            'For the best experience, use Chrome, Edge, or Brave',
            'Alternatively, bookmark this page for quick access',
          ],
          note: 'Firefox removed PWA support for desktop in 2021.',
        }
      case 'brave':
        return {
          browser: 'Brave',
          steps: [
            'Click the install icon in the address bar (computer with down arrow)',
            'Or click the menu (≡) → "Install App..."',
            'Click "Install" to confirm',
          ],
          note: 'If the install option doesn\'t appear, check that Brave Shields isn\'t blocking it.',
        }
      case 'chrome':
      case 'edge':
        return {
          browser: browser === 'edge' ? 'Microsoft Edge' : 'Google Chrome',
          steps: [
            'Click the install icon in the address bar (computer with down arrow)',
            'Or click the menu (⋮) → "Install App..."',
            'Click "Install" to confirm',
          ],
        }
      default:
        return {
          browser: 'Your Browser',
          steps: [
            'Look for an "Install" or "Add to Home Screen" option in your browser menu',
            'For the best experience, use Chrome, Edge, or Brave',
          ],
        }
    }
  }

  return {
    canInstall, install, browser, isInstalled,
    showManualInstructions, setShowManualInstructions,
    supportsAutoInstall, getInstallInstructions,
  }
}
```

**Key design decisions:**
- **`BrowserType` is coarse** — the iOS/macOS split happens inside `getInstallInstructions()` via UA sniffing.
- **`deferredPrompt` is module-level** — survives React remounts.
- **1-second timeout for manual instructions** — gives `beforeinstallprompt` time to fire before falling back.
- **`getInstallInstructions()` returns data, not JSX** — one switch case per browser, not one component.

## Toast System (`Toast.tsx`)

Context-based toast notification system. Used for PWA events (offline ready, update applied) and general app feedback.

```typescript
import { useState, useEffect, useCallback, createContext, useContext, type ReactNode } from 'react'

type ToastType = 'success' | 'error' | 'info' | 'warning'

interface Toast {
  id: number
  message: string
  type: ToastType
  duration: number
}

interface ToastContextType {
  addToast: (message: string, options?: { type?: ToastType; duration?: number }) => number
  removeToast: (id: number) => void
}

const ToastContext = createContext<ToastContextType | null>(null)

let toastId = 0
const nextToastId = () => { toastId = (toastId + 1) % Number.MAX_SAFE_INTEGER; return toastId }

export function useToast(): ToastContextType {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const addToast = useCallback((message: string, { type = 'info', duration = 3000 } = {}) => {
    const id = nextToastId()
    setToasts(prev => [...prev, { id, message, type, duration }])
    return id
  }, [])

  const removeToast = useCallback((id: number) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  )
}
```

## Install Instructions Modal (`InstallInstructionsModal.tsx`)

Data-driven modal that renders whatever `getInstallInstructions()` returns. Focus-trapped for accessibility.

## Fix: Timer Leaks on Unmount (Nested Timeouts)

Debounce patterns using `setTimeout` leak when a component unmounts mid-timeout.

**Broken:**
```typescript
useEffect(() => {
  const outer = setTimeout(() => {
    doSomething();
    const inner = setTimeout(() => save(), 500); // leaked
  }, 300);
  return () => clearTimeout(outer); // only clears outer
}, [value]);
```

**Fix — track all timeout IDs:**
```typescript
useEffect(() => {
  const timeouts: ReturnType<typeof setTimeout>[] = [];

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
```typescript
const mountedRef = useRef(true);
useEffect(() => () => { mountedRef.current = false; }, []);

// In any async/timeout callback:
if (!mountedRef.current) return;
```

**General rule:** Every `setTimeout`, `setInterval`, `addEventListener`, or `subscribe` call inside a `useEffect` needs a corresponding cleanup in the return function.

## Cache Headers

**Non-hashed files** (`index.html`, `sw.js`, `manifest.webmanifest`): serve with `Cache-Control: no-cache`.

**Content-hashed assets** (`/assets/*.hash.js`): serve with `Cache-Control: public, max-age=31536000, immutable`.

## ChunkLoadError Prevention

Add a lazy-load retry wrapper for the window between deploy and SW update:

```js
const lazyRetry = (importFn) => {
  return new Promise((resolve, reject) => {
    const hasRefreshed = JSON.parse(
      sessionStorage.getItem('retry-lazy-refreshed') || 'false'
    )
    importFn()
      .then(resolve)
      .catch((error) => {
        if (!hasRefreshed) {
          sessionStorage.setItem('retry-lazy-refreshed', 'true')
          window.location.reload()
        } else {
          reject(error)
        }
      })
  })
}
```

## Key Lessons

1. **Never combine `"any maskable"` in icon purpose** — use separate entries.
2. **Set `id` explicitly** in the manifest.
3. **The inline script in `index.html` is essential** — without it, repeat visitors lose the install prompt.
4. **`deferredPrompt` must be module-level** — survives React remounts.
5. **Install instructions should be data-driven** — one switch case per browser, not one component.
6. **`registerType: 'prompt'`** gives users control. Never switch from `autoUpdate` to `prompt` in production.
7. **Never put `setInterval` inside `onRegistered`** — it leaks on remount.
8. **`cleanupOutdatedCaches: true`** — removes stale Workbox caches.
9. **Use a context-based Toast system** — replaces one-off DOM-injected banners.
10. **Clean up all timers** — every `setTimeout`/`setInterval` in `useEffect` needs cleanup.
