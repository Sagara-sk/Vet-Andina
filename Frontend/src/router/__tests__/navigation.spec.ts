import { describe, expect, it, vi } from 'vitest'
import type { AuthUser } from '@/services/auth'

// El router real usa createWebHistory, que necesita el navegador. En las
// pruebas se reemplaza por el historial en memoria y se usan las rutas reales,
// para comprobar que el menú coincide con los permisos de los guards.
vi.mock('vue-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('vue-router')>()
  return { ...actual, createWebHistory: () => actual.createMemoryHistory() }
})

const { default: router } = await import('@/router')
const { PANEL_NAVIGATION, resolvePanelNavigation } = await import('@/router/navigation')

function user(overrides: Partial<AuthUser>): AuthUser {
  return {
    id: 'user-id',
    nombreCompleto: 'Usuario de prueba',
    email: 'usuario@example.com',
    rol: 'CLIENTE',
    tipoPersona: null,
    tipoAtencion: null,
    profileComplete: true,
    ...overrides,
  }
}

function labelsFor(value: AuthUser | null): string[] | undefined {
  return resolvePanelNavigation(value, router)?.items.map((item) => item.label)
}

describe('panel navigation by role', () => {
  it('shows the full staff menus', () => {
    expect(labelsFor(user({ rol: 'VETERINARIO' }))).toEqual([
      'Dashboard',
      'Clientes',
      'Agenda',
      'Gestión de turnos',
      'Fichas médicas',
      'Modo offline',
    ])
    expect(labelsFor(user({ rol: 'ADMINISTRATIVO' }))).toEqual([
      'Inicio',
      'Turnos',
      'Agenda general',
      'Clientes',
      'Fichas',
    ])
    expect(labelsFor(user({ rol: 'SUPERADMIN' }))).toEqual([
      'Dashboard',
      'Turnos',
      'Agenda general',
      'Clientes',
      'Fichas',
      'Agenda',
      'Modo offline',
      'Usuarios',
    ])
  })

  it('shows rural sections only to rural producers', () => {
    expect(labelsFor(user({ tipoAtencion: 'RURAL', tipoPersona: 'EMPRESA_PRODUCTOR' }))).toEqual([
      'Inicio',
      'Mis mascotas',
      'Mis establecimientos',
      'Reservar turno',
      'Mis turnos',
    ])

    expect(labelsFor(user({ tipoAtencion: 'URBANO', tipoPersona: 'INDIVIDUAL' }))).toEqual([
      'Inicio',
      'Mis mascotas',
      'Reservar turno',
      'Mis turnos',
    ])
  })

  it('hides a rural link when the route guard would deny it', () => {
    // Clasificado como rural pero sin tipoPersona de productor: la ruta de
    // establecimientos lo rechazaría, así que el menú no la ofrece.
    expect(labelsFor(user({ tipoAtencion: 'RURAL', tipoPersona: 'INDIVIDUAL' }))).not.toContain(
      'Mis establecimientos',
    )
  })

  it('only offers the dashboard to clients without a classified profile', () => {
    const navigation = resolvePanelNavigation(user({ profileComplete: false }), router)

    expect(navigation?.subtitle).toBe('Panel del cliente')
    expect(navigation?.items.map((item) => item.label)).toEqual(['Inicio'])
  })

  it('uses a subtitle for each client care type', () => {
    expect(
      resolvePanelNavigation(user({ tipoAtencion: 'URBANO', tipoPersona: 'INDIVIDUAL' }), router)
        ?.subtitle,
    ).toBe('Panel del cliente urbano')
    expect(
      resolvePanelNavigation(
        user({ tipoAtencion: 'RURAL', tipoPersona: 'EMPRESA_PRODUCTOR' }),
        router,
      )?.subtitle,
    ).toBe('Panel del cliente rural')
  })

  it('denies by default without a session or with an unknown role', () => {
    expect(resolvePanelNavigation(null, router)).toBeNull()
    expect(resolvePanelNavigation(user({ rol: 'INVITADO' }), router)).toBeNull()
    expect(resolvePanelNavigation(user({ rol: 'constructor' }), router)).toBeNull()
  })

  it('never lists a link that the route guards would reject', () => {
    const configuredLinks = Object.values(PANEL_NAVIGATION).flatMap((panel) => panel?.items ?? [])
    expect(configuredLinks.length).toBeGreaterThan(0)

    for (const [rol, panel] of Object.entries(PANEL_NAVIGATION)) {
      const configured = panel?.items.map((item) => item.label) ?? []
      const resolved = labelsFor(
        user({ rol, tipoAtencion: 'RURAL', tipoPersona: 'EMPRESA_PRODUCTOR' }),
      )
      // Con el perfil más amplio de cada rol, todo lo configurado es accesible:
      // si alguien agrega un link a una ruta que el rol no puede abrir, falla.
      expect(resolved, `menú de ${rol}`).toEqual(configured)
    }
  })

  it('builds the menu of a new role from configuration, still bounded by route permissions', () => {
    const navigation = resolvePanelNavigation(user({ rol: 'AUDITOR' }), router, {
      ...PANEL_NAVIGATION,
      AUDITOR: {
        subtitle: 'Panel de auditoría',
        items: [{ label: 'Inicio', to: { name: 'dashboard' } }],
      },
    })

    // El panel sale de la configuración sin tocar la plantilla, pero ningún
    // link aparece hasta que las rutas incluyan el rol en allowedRoles.
    expect(navigation).toEqual({ subtitle: 'Panel de auditoría', items: [] })
  })

  it('filters configured links the role cannot open and unknown routes', () => {
    const navigation = resolvePanelNavigation(user({ rol: 'VETERINARIO' }), router, {
      ...PANEL_NAVIGATION,
      VETERINARIO: {
        subtitle: 'Panel de prueba',
        items: [
          { label: 'Inicio', to: { name: 'dashboard' } },
          // Ruta solo de SUPERADMIN: se filtra aunque esté configurada.
          { label: 'Usuarios', to: { name: 'vet-usuarios' } },
          // Ruta inexistente: se oculta en lugar de romper el menú.
          { label: 'Inexistente', to: { name: 'ruta-que-no-existe' } },
        ],
      },
    })

    expect(navigation).toEqual({
      subtitle: 'Panel de prueba',
      items: [{ label: 'Inicio', to: { name: 'dashboard' } }],
    })
  })
})
