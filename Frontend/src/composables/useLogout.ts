import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useSessionStore } from '@/stores/session'

export function useLogout() {
  const router = useRouter()
  const session = useSessionStore()
  const logoutError = ref('')
  const isLoggingOut = ref(false)

  async function closeSession() {
    logoutError.value = ''
    isLoggingOut.value = true

    try {
      await session.logout()
      await router.replace({ name: 'login' })
    } catch (error) {
      logoutError.value = error instanceof Error ? error.message : 'No fue posible cerrar sesión.'
    } finally {
      isLoggingOut.value = false
    }
  }

  return { closeSession, logoutError, isLoggingOut }
}
