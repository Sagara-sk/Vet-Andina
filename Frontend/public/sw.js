const CACHE_NAME = 'vet-andina-v1'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.add('/'))
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
  if (
    url.origin !== self.location.origin ||
    /^\/(animales|historial-clinico|turnos)(\/|$)/.test(url.pathname)
  ) {
    return
  }

  event.respondWith((async () => {
    try {
      const response = await fetch(event.request)

      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME)
        await cache.put(event.request, response.clone())
      }

      return response
    } catch {
      const respuestaCacheada = await caches.match(event.request)
      if (respuestaCacheada) return respuestaCacheada

      if (event.request.mode === 'navigate') {
        const inicio = await caches.match('/')
        if (inicio) return inicio
      }

      return new Response('Sin conexión', {
        status: 503,
        headers: { 'Content-Type': 'text/plain' },
      })
    }
  })())
})
