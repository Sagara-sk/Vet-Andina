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
}

interface PanelConfig {
  subtitle: string
  links: NavLink[]
}

const clientLinks: NavLink[] = [
  { label: 'Inicio', to: { name: 'panel' } },
  { label: 'Mis mascotas', to: { name: 'panel-mascotas' } },
  { label: 'Reservar turno', to: { name: 'panel-reservar' } },
  { label: 'Mis turnos', to: { name: 'panel-turnos' } },
]

const vetLinks: NavLink[] = [
  { label: 'Dashboard', to: { name: 'vet-dashboard' } },
  { label: 'Clientes', to: { name: 'vet-clientes' } },
  { label: 'Agenda', to: { name: 'vet-agenda' } },
  { label: 'Gestión de turnos', to: { name: 'vet-turnos' } },
  { label: 'Modo offline', to: { name: 'vet-offline' } },
]

// Opciones del menú por rol. Ocultar un link no protege nada: la API tiene que
// validar el rol en cada endpoint.
const panels: Partial<Record<Rol, PanelConfig>> = {
  CLIENTE: { subtitle: 'Panel del cliente', links: clientLinks },
  VETERINARIO: { subtitle: 'Panel veterinario', links: vetLinks },
  // Por ahora el superadmin tiene lo mismo que el veterinario más el alta de usuarios.
  SUPERADMIN: {
    subtitle: 'Panel de administración',
    links: [...vetLinks, { label: 'Usuarios', to: { name: 'vet-usuarios' } }],
  },
}

const session = useSessionStore()
const { isDark, toggleTheme } = useTheme()

const panel = computed(() => panels[session.user?.rol as Rol])
const fullName = computed(() => session.user?.nombreCompleto ?? '')
</script>

<template>
  <aside
    v-if="panel"
    class="flex flex-col border-b border-brand-line bg-brand-sidebar px-6 py-6 md:sticky md:top-0 md:h-screen md:w-[234px] md:shrink-0 md:border-b-0 md:border-r md:py-8"
  >
    <RouterLink to="/" class="block">
      <span class="block font-serif text-xl text-brand-ink">Vet Andina</span>
      <span class="mt-1 block text-xs text-brand-inkSoft">{{ panel.subtitle }}</span>
    </RouterLink>

    <nav class="mt-6 flex gap-1 overflow-x-auto md:mt-9 md:flex-col md:gap-2 md:overflow-visible">
      <RouterLink
        v-for="link in panel.links"
        :key="link.label"
        :to="link.to"
        exact-active-class="!bg-brand-accentSoft !text-brand-ink"
        class="flex shrink-0 items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-brand-inkSoft transition-colors hover:text-brand-ink"
      >
        <span class="h-1 w-1 rounded-full bg-current" aria-hidden="true" />
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
