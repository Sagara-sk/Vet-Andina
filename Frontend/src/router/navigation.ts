import type { RouteLocationRaw, Router } from 'vue-router'
import type { AuthUser } from '@/services/auth'
import { canAccess, type Rol } from './access'

// Navegación del panel por rol.
//
// Para sumar un rol nuevo alcanza con agregar su entrada en PANEL_NAVIGATION
// (además de declararlo en el tipo Rol y en el allowedRoles de sus rutas): el
// menú lateral solo recorre lo que devuelve resolvePanelNavigation.
//
// Cada ítem se muestra únicamente si el usuario puede entrar a su ruta según
// los mismos meta.allowedRoles/allowedTipoPersona que usan los guards, de modo
// que el menú y los permisos de navegación no pueden desincronizarse. Ocultar
// un ítem es solo experiencia de usuario: la API vuelve a validar cada acceso.

export interface PanelNavItem {
  label: string
  to: RouteLocationRaw
  // Marca activo solo con coincidencia exacta (rutas padre como /panel-administrativo).
  exact?: boolean
  // Condición adicional que no expresan las rutas (por ejemplo, el tipo de atención).
  visible?: (user: AuthUser) => boolean
}

export interface PanelNavConfig {
  subtitle: string | ((user: AuthUser) => string)
  items: PanelNavItem[]
}

export interface ResolvedPanelNav {
  subtitle: string
  items: PanelNavItem[]
}

const DASHBOARD_ROUTE: RouteLocationRaw = { name: 'dashboard' }

// Un cliente sin tipo de atención todavía no completó su perfil.
const isClassifiedClient = (user: AuthUser) => user.tipoAtencion !== null
const isRuralClient = (user: AuthUser) => user.tipoAtencion === 'RURAL'

const adminItems: PanelNavItem[] = [
  { label: 'Turnos', to: { name: 'admin-turnos' }, exact: true },
  { label: 'Agenda general', to: { name: 'admin-agenda' } },
  { label: 'Clientes', to: { name: 'admin-tutores' } },
  { label: 'Fichas', to: { name: 'admin-fichas' } },
]

export const PANEL_NAVIGATION: Partial<Record<Rol, PanelNavConfig>> = {
  CLIENTE: {
    subtitle: (user) =>
      user.tipoAtencion === 'URBANO'
        ? 'Panel del cliente urbano'
        : user.tipoAtencion === 'RURAL'
          ? 'Panel del cliente rural'
          : 'Panel del cliente',
    items: [
      { label: 'Inicio', to: DASHBOARD_ROUTE },
      { label: 'Mis mascotas', to: { name: 'panel-mascotas' }, visible: isClassifiedClient },
      {
        label: 'Mis establecimientos',
        to: { name: 'panel-establecimientos' },
        visible: isRuralClient,
      },
      { label: 'Reservar turno', to: { name: 'panel-reservar' }, visible: isClassifiedClient },
      { label: 'Mis turnos', to: { name: 'panel-turnos' }, visible: isClassifiedClient },
    ],
  },
  VETERINARIO: {
    subtitle: 'Panel veterinario',
    items: [
      { label: 'Dashboard', to: DASHBOARD_ROUTE },
      { label: 'Clientes', to: { name: 'vet-tutores' } },
      { label: 'Agenda', to: { name: 'vet-agenda' } },
      { label: 'Gestión de turnos', to: { name: 'vet-turnos' } },
      { label: 'Fichas médicas', to: { name: 'vet-fichas' } },
      { label: 'Modo offline', to: { name: 'vet-offline' } },
    ],
  },
  ADMINISTRATIVO: {
    subtitle: 'Panel administrativo',
    items: [{ label: 'Inicio', to: DASHBOARD_ROUTE }, ...adminItems],
  },
  SUPERADMIN: {
    subtitle: 'Panel de administración',
    items: [
      { label: 'Dashboard', to: DASHBOARD_ROUTE },
      ...adminItems,
      { label: 'Agenda', to: { name: 'vet-agenda' } },
      { label: 'Modo offline', to: { name: 'vet-offline' } },
      { label: 'Usuarios', to: { name: 'vet-usuarios' } },
    ],
  },
}

function canNavigate(router: Router, user: AuthUser, to: RouteLocationRaw): boolean {
  try {
    return canAccess(router.resolve(to).matched, user.rol, user.tipoPersona)
  } catch {
    // Ruta inexistente o mal configurada: se oculta (denegar por defecto).
    return false
  }
}

// Devuelve el menú del usuario, o null si su rol no tiene panel configurado.
export function resolvePanelNavigation(
  user: AuthUser | null,
  router: Router,
  navigation: Partial<Record<string, PanelNavConfig>> = PANEL_NAVIGATION,
): ResolvedPanelNav | null {
  if (!user) return null

  // hasOwn evita tomar propiedades heredadas si la API enviara un rol inesperado.
  const config = Object.hasOwn(navigation, user.rol) ? navigation[user.rol] : undefined
  if (!config) return null

  return {
    subtitle: typeof config.subtitle === 'function' ? config.subtitle(user) : config.subtitle,
    items: config.items.filter(
      (item) => (item.visible?.(user) ?? true) && canNavigate(router, user, item.to),
    ),
  }
}
