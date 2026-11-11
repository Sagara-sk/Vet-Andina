const CACHE_NAME = 'vet-andina-shell-v3'
const APP_SHELL_URL = new URL('./', self.registration.scope).href
const FAVICON_URL = new URL('/favicon.svg', self.registration.scope).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll([APP_SHELL_URL, FAVICON_URL]))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('vet-andina-') && cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName)),
        ),
      )
      .then(() => self.clients.claim()),
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  const scopePath = new URL(self.registration.scope).pathname
  const isApiRequest =
    url.pathname === `${scopePath}api` || url.pathname.startsWith(`${scopePath}api/`)

  if (url.origin !== self.location.origin || isApiRequest) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          return await fetch(event.request)
        } catch {
          return (
            (await caches.match(APP_SHELL_URL)) ??
            new Response('Sin conexión', {
              status: 503,
              headers: { 'Content-Type': 'text/plain' },
            })
          )
        }
      })(),
    )
    return
  }

  if (!['script', 'style', 'image', 'font'].includes(event.request.destination)) {
    return
  }

  event.respondWith(
    (async () => {
      try {
        const response = await fetch(event.request)

        if (!response.ok) {
          return (await caches.match(event.request, { ignoreVary: true })) ?? response
        }

      const contentType = response.headers.get('content-type') || ''

if (
  response.ok &&
  response.type === 'basic' &&
  contentType.includes(
    event.request.destination === 'script'
      ? 'javascript'
      : event.request.destination === 'style'
        ? 'text/css'
        : event.request.destination === 'image'
          ? 'image/'
          : 'font/',
  )
) {
      try {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(event.request, response.clone())
      } catch {
        return response
      }
    }

        return response
      } catch {
        return (
          (await caches.match(event.request, { ignoreVary: true })) ??
          new Response('Sin conexión', {
            status: 503,
            headers: { 'Content-Type': 'text/plain' },
          })
        )
      }
    })(),
  )
})
