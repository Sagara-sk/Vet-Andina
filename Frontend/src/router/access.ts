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

const PANEL_ROLES: readonly Rol[] = ['CLIENTE', 'VETERINARIO', 'ADMINISTRATIVO', 'SUPERADMIN']

// Inicio del panel: todos los roles conocidos comparten /dashboard, que pinta
// los módulos según el rol. Un rol desconocido no tiene panel.
export function panelRouteForRole(rol: string): RouteLocationRaw | null {
  return PANEL_ROLES.some((known) => known === rol) ? { name: 'dashboard' } : null
}

// Destino tras el login: el panel del rol o, si no tiene, el inicio público.
export function homeRouteForRole(rol: string): RouteLocationRaw {
  return panelRouteForRole(rol) ?? { name: 'home' }
}
