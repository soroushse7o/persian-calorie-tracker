const CACHE_VERSION = '__SW_CACHE_VERSION__'
const STATIC_CACHE = `${CACHE_VERSION}-static`
const RUNTIME_CACHE = `${CACHE_VERSION}-runtime`
const MAX_RUNTIME_ENTRIES = 80

const APP_SHELL_ASSETS = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/icon.svg',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/icon-maskable-512.png',
  '/apple-touch-icon.png',
  /* __SW_PRECACHE_ASSETS__ */
]

/** Caps runtime cache size so stale hashed assets never accumulate indefinitely. */
async function trimCache(cacheName, maxEntries) {
  const cache = await caches.open(cacheName)
  const keys = await cache.keys()
  if (keys.length <= maxEntries) return
  const excess = keys.length - maxEntries
  await Promise.all(keys.slice(0, excess).map((req) => cache.delete(req)))
}

self.addEventListener('install', (event) => {
  // Intentionally do NOT call self.skipWaiting() here so an update never reloads
  // the page while the user is mid-entry. Activation happens only when the user
  // clicks "به‌روزرسانی" (which posts SKIP_WAITING) or opens a fresh session.
  event.waitUntil(
    caches.open(STATIC_CACHE).then((cache) => cache.addAll(APP_SHELL_ASSETS)),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== STATIC_CACHE && key !== RUNTIME_CACHE)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting()
  }
})

self.addEventListener('fetch', (event) => {
  const { request } = event
  if (request.method !== 'GET') return

  const url = new URL(request.url)

  // Only handle same-origin requests; never intercept healthchecks or external URLs
  if (url.origin !== self.location.origin || url.pathname === '/health') return

  // Network-first with offline cache fallback for SPA document navigations
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(STATIC_CACHE).then((cache) => cache.put('/index.html', copy))
          }
          return response
        })
        .catch(() =>
          caches
            .match('/index.html', { ignoreVary: true })
            .then((cached) => cached || Response.error()),
        ),
    )
    return
  }

  // Cache-first with bounded LRU pruning for Vite fingerprinted JS/CSS/WOFF2 & icons
  const isStaticAsset =
    url.pathname.startsWith('/assets/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.webmanifest')

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request, { ignoreVary: true }).then((cached) => {
        if (cached) return cached
        return fetch(request)
          .then((response) => {
            if (response.ok) {
              const copy = response.clone()
              caches
                .open(RUNTIME_CACHE)
                .then((cache) => cache.put(request, copy))
                .then(() => trimCache(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES))
            }
            return response
          })
          .catch(() => cached || Response.error())
      }),
    )
  }
})
