import { useCallback, useEffect, useRef, useState } from 'react'
import { APP_CONFIG } from '../config/env'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>
}

export interface PwaStatus {
  isOnline: boolean
  isInstalled: boolean
  canInstall: boolean
  /** True on iPhone/iPad when running in browser tab (where beforeinstallprompt does not exist) */
  isIosInstallable: boolean
  hasUpdate: boolean
  promptInstall: () => Promise<boolean>
  applyUpdate: () => void
}

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false
  const nav = window.navigator as Navigator & { standalone?: boolean }
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    nav.standalone === true
  )
}

export function detectIosDevice(
  ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : '',
  platform: string = typeof navigator !== 'undefined' ? navigator.platform : '',
  maxTouchPoints: number = typeof navigator !== 'undefined' ? navigator.maxTouchPoints : 0,
): boolean {
  if (/iPad|iPhone|iPod/i.test(ua)) return true
  // iPadOS 13+ desktop-class Safari reports MacIntel with touch points
  if (platform === 'MacIntel' && maxTouchPoints > 1) return true
  return false
}

export function usePwaStatus(): PwaStatus {
  const [isOnline, setIsOnline] = useState(() =>
    typeof navigator !== 'undefined' ? navigator.onLine : true,
  )
  const [isInstalled, setIsInstalled] = useState(detectStandalone)
  const [isIosDevice] = useState(() => detectIosDevice())
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [waitingWorker, setWaitingWorker] = useState<ServiceWorker | null>(null)

  // Guard so controllerchange ONLY reloads when the user explicitly clicked "به‌روزرسانی"
  // (prevents an unexpected reload on a user's very first visit when sw.js calls clients.claim()).
  const userRequestedUpdateRef = useRef(false)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }
    const handleAppInstalled = () => {
      setIsInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleAppInstalled)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleAppInstalled)
    }
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // In Vite HMR dev mode, unregister any previously installed SW so dev assets are never cached stale
    if (!import.meta.env.PROD || !APP_CONFIG.enablePwa) {
      if (import.meta.env.DEV) {
        navigator.serviceWorker.getRegistrations().then((regs) => {
          for (const reg of regs) {
            void reg.unregister()
          }
        })
      }
      return
    }

    let refreshing = false
    const onControllerChange = () => {
      if (!userRequestedUpdateRef.current || refreshing) return
      refreshing = true
      window.location.reload()
    }
    navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)

    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((registration) => {
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaitingWorker(registration.waiting)
        }
        registration.addEventListener('updatefound', () => {
          const installing = registration.installing
          if (!installing) return
          installing.addEventListener('statechange', () => {
            if (installing.state === 'installed' && navigator.serviceWorker.controller) {
              setWaitingWorker(installing)
            }
          })
        })
      })
      .catch(() => {
        // Ignore SW registration failure in restricted environments
      })

    return () => {
      navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
    }
  }, [])

  const promptInstall = useCallback(async (): Promise<boolean> => {
    if (!deferredPrompt) return false
    await deferredPrompt.prompt()
    const choice = await deferredPrompt.userChoice
    setDeferredPrompt(null)
    return choice.outcome === 'accepted'
  }, [deferredPrompt])

  const applyUpdate = useCallback(() => {
    userRequestedUpdateRef.current = true
    if (waitingWorker) {
      waitingWorker.postMessage({ type: 'SKIP_WAITING' })
    } else {
      window.location.reload()
    }
  }, [waitingWorker])

  return {
    isOnline,
    isInstalled,
    canInstall: Boolean(deferredPrompt) && !isInstalled,
    isIosInstallable: isIosDevice && !isInstalled,
    hasUpdate: Boolean(waitingWorker),
    promptInstall,
    applyUpdate,
  }
}
