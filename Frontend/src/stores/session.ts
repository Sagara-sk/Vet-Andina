import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import { getAuthSession, logout as logoutRequest, type AuthUser } from '@/services/auth'

// Usuario de la sesión verificada por la API. Solo se guarda en memoria: la
// sesión vive en la cookie HttpOnly, así que al recargar la página se vuelve a
// consultar una vez a la API para restaurarla.
export const useSessionStore = defineStore('session', () => {
  const user = ref<AuthUser | null>(null)
  const checked = ref(false)
  let pendingCheck: Promise<AuthUser | null> | null = null

  const isAuthenticated = computed(() => user.value !== null)
  const firstName = computed(() => user.value?.nombreCompleto.trim().split(/\s+/)[0] ?? '')

  function setUser(value: AuthUser | null) {
    user.value = value
    checked.value = true
  }

  // Devuelve la sesión de Pinia; solo llama a la API si todavía no se verificó.
  // Un error de red se trata como "sin sesión" pero no se marca como verificado,
  // así la próxima navegación vuelve a intentar.
  async function ensureSession(): Promise<AuthUser | null> {
    if (checked.value) return user.value

    pendingCheck ??= getAuthSession()
      .then((sessionUser) => {
        setUser(sessionUser)
        return sessionUser
      })
      .catch(() => null)
      .finally(() => {
        pendingCheck = null
      })

    return pendingCheck
  }

  // Pide a la API que borre la cookie y recién entonces limpia el store. Si la API
  // falla, la sesión sigue abierta en el servidor y no se oculta ese error.
  async function logout(): Promise<void> {
    await logoutRequest()
    setUser(null)
  }

  return { user, checked, isAuthenticated, firstName, setUser, ensureSession, logout }
})
