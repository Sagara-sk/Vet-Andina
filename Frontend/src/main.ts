import './assets/main.css'

import { createApp } from 'vue'
import { createPinia } from 'pinia'

import App from './App.vue'
import router from './router'

// ======================================================
// INSPECCIÓN DE LA CACHÉ DE NAVEGACIÓN (BFCache)
// ======================================================

// Evita mostrar contenido privado mientras el navegador
// conserva una página para recuperarla posteriormente.
window.addEventListener('pagehide', () => {
  document.documentElement.style.visibility = 'hidden'
})

// Detecta si el navegador recuperó una página desde BFCache.
window.addEventListener('pageshow', (event: PageTransitionEvent) => {
  if (event.persisted) {
    // Recarga la aplicación para ejecutar nuevamente
    // la inicialización de Pinia y los guards del router.
    window.location.reload()
    return
  }

  document.documentElement.style.visibility = ''
})

// ======================================================
// INICIALIZACIÓN DE LA APLICACIÓN
// ======================================================

const app = createApp(App)

app.use(createPinia())
app.use(router)

app.mount('#app')

// ======================================================
// REGISTRO DEL SERVICE WORKER
// ======================================================

if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register(`${import.meta.env.BASE_URL}sw.js`, { updateViaCache: 'none' })
      .catch((error: unknown) => {
        console.error('Error registrando Service Worker:', error)
      })
  })
}
