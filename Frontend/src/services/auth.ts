import { API_BASE_URL } from '@/config/api'

export interface AuthUser {
  id: string
  nombreCompleto: string
  rol: string
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