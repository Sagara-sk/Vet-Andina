import { API_BASE_URL } from '@/config/api'

const API_REQUEST_TIMEOUT_MS = 15_000

// Llamada a la API con la cookie de sesión. Devuelve el JSON o lanza un Error
// con el mensaje del servidor, listo para mostrar al usuario.
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), API_REQUEST_TIMEOUT_MS)

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      credentials: 'include',
      cache: 'no-store',
      headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: controller.signal,
    })

    const result = (await response.json().catch(() => null)) as (T & { message?: string }) | null

    if (!response.ok) {
      throw new Error(result?.message ?? 'No fue posible completar la operación.')
    }
    if (!result) {
      throw new Error('La respuesta del servidor no es válida.')
    }

    return result
  } catch (cause) {
    if (controller.signal.aborted) {
      throw new Error('La solicitud tardó demasiado. Verificá tu conexión e intentá nuevamente.')
    }
    throw cause
  } finally {
    clearTimeout(timeoutId)
  }
}
