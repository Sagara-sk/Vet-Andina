import { API_BASE_URL } from '@/config/api'

export type StaffRol = 'VETERINARIO' | 'ADMINISTRATIVO'

export interface StaffUser {
  id: string
  nombreCompleto: string
  email: string
  rol: StaffRol
  matriculaProfesional: string | null
}

export interface CreateStaffUserInput {
  nombreCompleto: string
  email: string
  rol: StaffRol
  matriculaProfesional?: string
  contrasena: string
}

// Solo SUPERADMIN: la API responde 403 a cualquier otro rol.
export async function createStaffUser(input: CreateStaffUserInput): Promise<StaffUser> {
  const response = await fetch(`${API_BASE_URL}/api/users`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(input),
  })

  const result = (await response.json().catch(() => null)) as {
    message?: string
    user?: StaffUser
  } | null

  if (!response.ok) {
    throw new Error(result?.message ?? 'No fue posible crear el usuario.')
  }

  if (!result?.user) {
    throw new Error('La respuesta del servidor no es válida.')
  }

  return result.user
}
