const CACHE_NAME = 'vet-andina-shell-v1'
const APP_SHELL_URL = new URL('./', self.registration.scope).href

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add(APP_SHELL_URL))
      .then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) =>
        Promise.all(
          cacheNames
            .filter((cacheName) => cacheName.startsWith('vet-andina-') && cacheName !== CACHE_NAME)
            .map((cacheName) => caches.delete(cacheName))
        )
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return

  const url = new URL(event.request.url)
  const scopePath = new URL(self.registration.scope).pathname
  const isApiRequest = url.pathname === `${scopePath}api` ||
    url.pathname.startsWith(`${scopePath}api/`)

  if (url.origin !== self.location.origin || isApiRequest) {
    return
  }

  if (event.request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        return await fetch(event.request)
      } catch {
        return await caches.match(APP_SHELL_URL) ?? new Response('Sin conexión', {
          status: 503,
          headers: { 'Content-Type': 'text/plain' },
        })
      }
    })())
    return
  }

  if (!['script', 'style', 'image', 'font'].includes(event.request.destination)) {
    return
  }

  event.respondWith((async () => {
    const cachedResponse = await caches.match(event.request)
    if (cachedResponse) return cachedResponse

    try {
      const response = await fetch(event.request)

      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(event.request, response.clone())
      }

      return response
    } catch {
      return new Response('Sin conexión', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      })
    }
  })())
})
