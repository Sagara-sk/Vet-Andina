
<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, type RouteLocationRaw } from 'vue-router'
import LogoutButton from '@/components/Redireccion/LogoutButton.vue'
import { useTheme } from '@/composables/useTheme'
import type { Rol } from '@/router/access'
import { useSessionStore } from '@/stores/session'
import { initials } from '@/utils/format'

interface NavLink {
  label: string
  to: RouteLocationRaw
  exact?: boolean
}

interface PanelConfig {
  subtitle: string
  links: NavLink[]
}

const ACTIVE_CLASS = '!bg-brand-accentSoft !text-brand-ink'

const DASHBOARD_ROUTE: RouteLocationRaw = { name: 'dashboard' }

// Secciones compartidas por clientes urbanos y rurales.
const clientCommonLinks: NavLink[] = [
  { label: 'Inicio', to: DASHBOARD_ROUTE },
  { label: 'Mis mascotas', to: { name: 'panel-mascotas' } },
  { label: 'Reservar turno', to: { name: 'panel-reservar' } },
  { label: 'Mis turnos', to: { name: 'panel-turnos' } },

]

// Secciones exclusivas de clientes urbanos.
const urbanClientLinks: NavLink[] = [
  { label: 'Inicio', to: DASHBOARD_ROUTE },
  ...clientCommonLinks.slice(1),
]

// Secciones exclusivas de clientes rurales.
const ruralClientLinks: NavLink[] = [
  { label: 'Inicio', to: DASHBOARD_ROUTE },
  { label: 'Mis establecimientos', to: { name: 'panel-establecimientos' } },
  ...clientCommonLinks.slice(1),
]

const vetLinks: NavLink[] = [
  { label: 'Dashboard', to: DASHBOARD_ROUTE },
  { label: 'Clientes', to: { name: 'vet-clientes' } },
  { label: 'Agenda', to: { name: 'vet-agenda' } },
  { label: 'Gestión de turnos', to: { name: 'vet-turnos' } },
  { label: 'Modo offline', to: { name: 'vet-offline' } },
]

const adminLinks: NavLink[] = [
  { label: 'Turnos', to: { name: 'admin-turnos' }, exact: true },
  { label: 'Tutores', to: { name: 'admin-tutores' } },
  { label: 'Fichas', to: { name: 'admin-fichas' } },
]

// Menús del personal: se mantienen las secciones existentes.
const panels: Partial<Record<Rol, PanelConfig>> = {
  VETERINARIO: {
    subtitle: 'Panel veterinario',
    links: vetLinks,
  },
  ADMINISTRATIVO: {
    subtitle: 'Panel administrativo',
    links: [{ label: 'Inicio', to: DASHBOARD_ROUTE }, ...adminLinks],
  },
  SUPERADMIN: {
    subtitle: 'Panel de administración',
    links: [
      { label: 'Dashboard', to: DASHBOARD_ROUTE },
      ...adminLinks,
      { label: 'Agenda', to: { name: 'vet-agenda' } },
      { label: 'Modo offline', to: { name: 'vet-offline' } },
      { label: 'Usuarios', to: { name: 'vet-usuarios' } },
    ],
  },
}

const session = useSessionStore()
const { isDark, toggleTheme } = useTheme()

const panel = computed<PanelConfig | undefined>(() => {
  const user = session.user

  if (!user) return undefined

  if (user.rol === 'CLIENTE') {
    if (session.isUrbanClient) {
      return {
        subtitle: 'Panel del cliente urbano',
        links: urbanClientLinks,
      }
    }

    if (session.isRuralClient) {
      return {
        subtitle: 'Panel del cliente rural',
        links: ruralClientLinks,
      }
    }

    // Perfil todavía incompleto: no mostrar secciones específicas.
    return {
      subtitle: 'Panel del cliente',
      links: [{ label: 'Inicio', to: DASHBOARD_ROUTE }],
    }
  }

  return panels[user.rol as Rol]
})

const fullName = computed(() => session.user?.nombreCompleto ?? '')
</script>

<template>
  <aside
    v-if="panel"
    class="flex flex-col border-b border-brand-line bg-brand-sidebar px-6 py-6 md:sticky md:top-0 md:h-screen md:w-58.5 md:shrink-0 md:border-b-0 md:border-r md:py-8"
  >
    <RouterLink :to="DASHBOARD_ROUTE" class="block">
      <span class="block font-serif text-xl text-brand-ink">Vet Andina</span>
      <span class="mt-1 block text-xs text-brand-inkSoft">
        {{ panel.subtitle }}
      </span>
    </RouterLink>

    <nav
      class="mt-6 flex gap-1 overflow-x-auto md:mt-9 md:flex-col md:gap-2 md:overflow-visible"
    >
      <RouterLink
        v-for="link in panel.links"
        :key="link.label"
        :to="link.to"
        :active-class="link.exact ? '' : ACTIVE_CLASS"
        :exact-active-class="ACTIVE_CLASS"
        class="flex shrink-0 items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-brand-inkSoft transition-colors hover:text-brand-ink"
      >
        <span
          class="h-1 w-1 rounded-full bg-current"
          aria-hidden="true"
        />
        {{ link.label }}
      </RouterLink>
    </nav>

    <button
      type="button"
      class="mt-6 flex items-center gap-2 self-start rounded-sm border border-brand-line px-3 py-2 text-xs text-brand-inkSoft transition-colors hover:text-brand-ink md:mt-auto"
      :aria-pressed="isDark"
      @click="toggleTheme"
    >
      <span aria-hidden="true">{{ isDark ? '☀' : '☾' }}</span>
      {{ isDark ? 'Modo claro' : 'Modo oscuro' }}
    </button>

    <div class="mt-6 flex items-center gap-3 border-t border-brand-line pt-6">
      <span
        class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-accent text-xs text-white"
        aria-hidden="true"
      >
        {{ initials(fullName) }}
      </span>

      <div>
        <p class="text-sm text-brand-ink">{{ session.firstName }}</p>
        <LogoutButton />
      </div>
    </div>
  </aside>
</template>
