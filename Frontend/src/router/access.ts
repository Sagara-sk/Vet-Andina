import type { RouteLocationRaw, RouteRecordNormalized } from 'vue-router'

// Valores del enum rol_usuario de la base.
export type Rol = 'SUPERADMIN' | 'ADMINISTRATIVO' | 'VETERINARIO' | 'CLIENTE'

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean
    allowedRoles?: readonly Rol[]
    title?: string
  }
}

// Solo decide la navegación: la autorización real tiene que hacerla la API.
// Una ruta privada sin roles declarados queda denegada.
export function canAccess(matched: readonly RouteRecordNormalized[], rol: string): boolean {
  const restrictions = matched
    .map((record) => record.meta.allowedRoles)
    .filter((roles): roles is readonly Rol[] => Array.isArray(roles))

  if (restrictions.length === 0) {
    return !matched.some((record) => record.meta.requiresAuth)
  }

  return restrictions.every((roles) => roles.some((allowed) => allowed === rol))
}

// Panel propio de cada rol.
export function panelRouteForRole(rol: string): RouteLocationRaw | null {
  switch (rol) {
    case 'CLIENTE':
      return { name: 'panel' }
    case 'VETERINARIO':
    case 'SUPERADMIN':
      return { name: 'vet-dashboard' }
    case 'ADMINISTRATIVO':
      return { name: 'admin-turnos' }
    default:
      return null
  }
}

// Destino tras el login: el panel del rol o, si no tiene, el inicio público.
export function homeRouteForRole(rol: string): RouteLocationRaw {
  return panelRouteForRole(rol) ?? { name: 'home' }
}
