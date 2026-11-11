
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getAuthSession,
  logout as logoutRequest,
  type AuthUser,
} from '@/services/auth'



const OFFLINE_SESSION_KEY = 'vet-andina-offline-user'

function saveOfflineUser(user: AuthUser | null) {
  try {
    if (user) {
      localStorage.setItem(OFFLINE_SESSION_KEY, JSON.stringify(user))
    } else {
      localStorage.removeItem(OFFLINE_SESSION_KEY)
    }
  } catch (error) {
    console.error('No se pudo guardar la sesión local:', error)
  }
}

function getOfflineUser(): AuthUser | null {
  try {
    const stored = localStorage.getItem(OFFLINE_SESSION_KEY)
    if (!stored) return null

    const user = JSON.parse(stored) as AuthUser

    if (
      typeof user.id !== 'string' ||
      typeof user.nombreCompleto !== 'string' ||
      typeof user.rol !== 'string'
    ) {
      return null
    }

    return user
  } catch {
    return null
  }
}



export const useSessionStore = defineStore('session', () => {
  const user = ref<AuthUser | null>(null)
  const checked = ref(false)
  let pendingCheck: Promise<AuthUser | null> | null = null

  const isAuthenticated = computed(() => user.value !== null)
  const firstName = computed(
    () => user.value?.nombreCompleto.trim().split(/\s+/)[0] ?? '',
  )

  const isClient = computed(() => user.value?.rol === 'CLIENTE')

  // Clasificación del cliente tal como la calcula la API (tipoAtencion). Solo
  // decide qué se muestra: los endpoints vuelven a validarla.
  const isUrbanClient = computed(
    () => isClient.value && user.value?.tipoAtencion === 'URBANO',
  )

  const isRuralClient = computed(
    () => isClient.value && user.value?.tipoAtencion === 'RURAL',
  )

  const profileComplete = computed(
    () => user.value?.profileComplete === true,
  )

function setUser(value: AuthUser | null) {
  user.value = value
  checked.value = true

  if (value) {
    saveOfflineUser(value)
  } else {
    saveOfflineUser(null)
  }
}

  // Restaura la sesión una sola vez y evita solicitudes simultáneas.
  // Ante un error de red no marca la sesión como verificada, para permitir
  // que una navegación posterior vuelva a intentarlo.
async function ensureSession(): Promise<AuthUser | null> {
  if (checked.value) return user.value

  pendingCheck ??= getAuthSession()
    .then((sessionUser) => {
      setUser(sessionUser)
      return sessionUser
    })
    .catch(() => {
      const offlineUser = getOfflineUser()
      console.log('[OFFLINE SESSION]', offlineUser) // Temporal

      if (offlineUser) {
        user.value = offlineUser
        checked.value = true
        return offlineUser
      }

      return null
    })
    .finally(() => {
      pendingCheck = null
    })

  return pendingCheck
}
  // Solo limpia el estado local después de confirmar el cierre en la API.
  async function logout(): Promise<void> {
    await logoutRequest()
    setUser(null)
  }

  return {
    user,
    checked,
    isAuthenticated,
    firstName,
    isClient,
    isUrbanClient,
    isRuralClient,
    profileComplete,
    setUser,
    ensureSession,
    logout,
  }
})
