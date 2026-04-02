# PWA System

Four parts, built on `vite-plugin-pwa` (^0.21.1) with React.

## Vite Config (`vite.config.js`)

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

## Service Worker Updates (`usePWAUpdate.js`)

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

## Install Detection (`usePWAInstall.js`)

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
