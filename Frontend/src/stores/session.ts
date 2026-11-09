
import { computed, ref } from 'vue'
import { defineStore } from 'pinia'
import {
  getAuthSession,
  logout as logoutRequest,
  type AuthUser,
} from '@/services/auth'

export const useSessionStore = defineStore('session', () => {
  const user = ref<AuthUser | null>(null)
  const checked = ref(false)
  let pendingCheck: Promise<AuthUser | null> | null = null

  const isAuthenticated = computed(() => user.value !== null)
  const firstName = computed(
    () => user.value?.nombreCompleto.trim().split(/\s+/)[0] ?? '',
  )

  const isClient = computed(() => user.value?.rol === 'CLIENTE')

  // Clasificación del cliente según el tipoPersona almacenado en la base.
  const isUrbanClient = computed(
    () => isClient.value && user.value?.tipoPersona === 'INDIVIDUAL',
  )

  const isRuralClient = computed(
    () => isClient.value && user.value?.tipoPersona === 'EMPRESA_PRODUCTOR',
  )

  const profileComplete = computed(
    () => user.value?.profileComplete === true,
  )

  function setUser(value: AuthUser | null) {
    user.value = value
    checked.value = true
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
      .catch(() => null)
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
