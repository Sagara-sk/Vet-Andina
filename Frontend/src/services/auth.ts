import { API_BASE_URL } from '@/config/api'

export interface AuthUser {
  id: string
  rol: string
}

interface AuthResponse {
  message?: string
  user: AuthUser
}

async function requestApi(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${API_BASE_URL}${path}`, init)
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `No se pudo conectar con la API (${API_BASE_URL}). Verificá que el backend esté iniciado, que VITE_API_BASE_URL apunte a esa dirección y que FRONTEND_URL permita el origen del frontend.`,
      )
    }

    throw error
  }
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
  const response = await requestApi('/api/auth/login', {
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
  const response = await requestApi('/api/auth/register', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  return (await readResponse(response)).user
}

export interface ClientProfileInput {
  dni_cuit: string
  tipo_persona: 'INDIVIDUAL' | 'EMPRESA_PRODUCTOR'
  direccion_urbana?: string | null
  nombre_finca?: string | null
}

export async function saveClientProfile(input: ClientProfileInput): Promise<void> {
  const response = await requestApi('/api/duenios/perfil', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  if (response.status === 404) {
    throw new Error('La ruta del perfil no está registrada en la API que está ejecutándose.')
  }

  if (!response.ok) {
    const result = (await response.json().catch(() => null)) as { message?: string } | null
    throw new Error(result?.message ?? 'No se pudo guardar el perfil del cliente.')
  }
}

export async function getAuthSession(): Promise<AuthUser | null> {
  const response = await requestApi('/api/auth/session', {
    credentials: 'include',
    cache: 'no-store',
  })

  if (response.status === 401) return null

  return (await readResponse(response)).user
}

export async function logout(): Promise<void> {
  const response = await requestApi('/api/auth/logout', {
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