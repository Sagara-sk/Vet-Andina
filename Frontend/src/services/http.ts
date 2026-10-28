import { API_BASE_URL } from '@/config/api'

// Llamada a la API con la cookie de sesión. Devuelve el JSON o lanza un Error
// con el mensaje del servidor, listo para mostrar al usuario.
export async function apiRequest<T>(
  path: string,
  options: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    method: options.method ?? 'GET',
    credentials: 'include',
    cache: 'no-store',
    headers: options.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  })

  const result = (await response.json().catch(() => null)) as (T & { message?: string }) | null

  if (!response.ok) {
    throw new Error(result?.message ?? 'No fue posible completar la operación.')
  }
  if (!result) {
    throw new Error('La respuesta del servidor no es válida.')
  }

  return result
}
