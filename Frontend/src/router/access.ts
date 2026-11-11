import type { RouteLocationRaw, RouteRecordNormalized } from 'vue-router'
import type { TipoPersona } from '@/services/auth'

// Roles definidos en la base de datos.
export type Rol = 'SUPERADMIN' | 'ADMINISTRATIVO' | 'VETERINARIO' | 'CLIENTE'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    allowedRoles?: readonly Rol[]
    allowedTipoPersona?: readonly TipoPersona[]
    title?: string
  }
}

// Comprueba los permisos de navegación de todos los registros de la ruta.
// La autorización real siempre debe validarse también desde la API.
export function canAccess(
  matched: readonly RouteRecordNormalized[],
  rol: string,
  tipoPersona: TipoPersona | null = null,
): boolean {
  const requiresAuth = matched.some((record) => record.meta.requiresAuth)

  const roleRestrictions = matched
    .map((record) => record.meta.allowedRoles)
    .filter((roles): roles is readonly Rol[] => Array.isArray(roles))

  const personaRestrictions = matched
    .map((record) => record.meta.allowedTipoPersona)
    .filter((types): types is readonly TipoPersona[] => Array.isArray(types))

  // Una ruta privada debe declarar al menos una restricción de roles.
  if (requiresAuth && roleRestrictions.length === 0) {
    return false
  }

  // Cada nivel de la ruta debe permitir el rol del usuario.
  const hasAllowedRole = roleRestrictions.every((roles) => roles.includes(rol as Rol))

  if (!hasAllowedRole) {
    return false
  }

  // Las restricciones de tipoPersona solo se aplican cuando están declaradas.
  // Un cliente sin tipoPersona no puede acceder a secciones específicas.
  const hasAllowedPersona = personaRestrictions.every(
    (types) => tipoPersona !== null && types.includes(tipoPersona),
  )

  return hasAllowedPersona
}

const PANEL_ROLES: readonly Rol[] = ['CLIENTE', 'VETERINARIO', 'ADMINISTRATIVO', 'SUPERADMIN']

// Todos los roles conocidos comparten el dashboard general.
export function panelRouteForRole(rol: string): RouteLocationRaw | null {
  return PANEL_ROLES.includes(rol as Rol) ? { name: 'dashboard' } : null
}

export function primaryActionForRole(
  rol: string,
): { label: 'Reservar turno' | 'Mi agenda'; to: RouteLocationRaw } | null {
  switch (rol) {
    case 'CLIENTE':
      return { label: 'Reservar turno', to: { name: 'panel-reservar' } }
    case 'VETERINARIO':
      return { label: 'Mi agenda', to: { name: 'vet-agenda' } }
    case 'ADMINISTRATIVO':
      return { label: 'Mi agenda', to: { name: 'admin-agenda' } }
    case 'SUPERADMIN':
      return { label: 'Mi agenda', to: { name: 'vet-agenda' } }
    default:
      return null
  }
}

// Destino después del login: panel o inicio público.
export function homeRouteForRole(rol: string): RouteLocationRaw {
  return panelRouteForRole(rol) ?? { name: 'home' }
}
