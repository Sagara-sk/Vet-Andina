import { API_BASE_URL } from '@/config/api'

export type TipoPersona = 'INDIVIDUAL' | 'EMPRESA_PRODUCTOR'
export type TipoAtencion = 'URBANO' | 'RURAL'

// Usuario tal como lo devuelven login, registro y GET /api/auth/session. El rol y
// el tipo de cliente salen de la base en cada request, no del token.
export interface AuthUser {
  id: string
  nombreCompleto: string
  email: string
  rol: string
  // null para el personal y para clientes que todavía no completaron el perfil.
  tipoPersona: TipoPersona | null
  // URBANO o RURAL, calculado por la API con los datos del tutor; null para el
  // personal. Solo decide qué se muestra: la API valida el acceso.
  tipoAtencion: TipoAtencion | null
  profileComplete: boolean
}

interface AuthResponse {
  message?: string
  user: AuthUser
}

async function readResponse(response: Response): Promise<AuthResponse> {
  const result = (await response.json().catch(() => null)) as AuthResponse | null

  if (!response.ok) {
    throw new Error(result?.message ?? 'No fue posible completar la operación.')
  }

  if (!result?.user) {
    throw new Error('La respuesta del servidor no es válida.')
  }

  return result
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, contrasena: password }),
  })

  return (await readResponse(response)).user
}

export async function registerOwner(input: {
  nombreCompleto: string
  email: string
  telefono: string
  localidad: string
  contrasena: string
}): Promise<AuthUser> {
  const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return (await readResponse(response)).user
}

export async function getAuthSession(): Promise<AuthUser | null> {
  const response = await fetch(`${API_BASE_URL}/api/auth/session`, {
    credentials: 'include',
    cache: 'no-store',
  })

  if (response.status === 401) return null

  return (await readResponse(response)).user
}

export async function logout(): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/logout`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  })

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(result?.message ?? 'No fue posible cerrar sesión.')
  }
}

export async function saveClientProfile(data: {
  dni_cuit: string
  tipo_persona: TipoPersona
  direccion_urbana: string | null
  nombre_finca: string | null
}): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })

  const result = (await response.json().catch(() => null)) as {
    message?: unknown
    profileComplete?: unknown
  } | null

  if (!response.ok) {
    const errorMsg =
      typeof result?.message === 'string'
        ? result.message
        : `Error al guardar el perfil (Código: ${response.status})`
    throw new Error(errorMsg)
  }

  if (result?.profileComplete !== true) {
    throw new Error('El servidor no confirmó que el perfil esté completo.')
  }
}
