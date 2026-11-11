<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink, useRouter, type RouteLocationRaw } from 'vue-router'
import LogoutButton from '@/components/Redireccion/LogoutButton.vue'
import { useTheme } from '@/composables/useTheme'
import { resolvePanelNavigation } from '@/router/navigation'
import { useSessionStore } from '@/stores/session'
import { initials } from '@/utils/format'

const ACTIVE_CLASS = '!bg-brand-accentSoft !text-brand-ink'

const DASHBOARD_ROUTE: RouteLocationRaw = { name: 'dashboard' }

const session = useSessionStore()
const router = useRouter()
const { isDark, toggleTheme } = useTheme()

// Los ítems de cada rol se configuran en src/router/navigation.ts. Acá solo se
// muestran los que quedaron después de filtrar por rol y permisos de ruta.
const panel = computed(() => resolvePanelNavigation(session.user, router))

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

    <nav class="mt-6 flex gap-1 overflow-x-auto md:mt-9 md:flex-col md:gap-2 md:overflow-visible">
      <RouterLink
        v-for="link in panel.items"
        :key="link.label"
        :to="link.to"
        :active-class="link.exact ? '' : ACTIVE_CLASS"
        :exact-active-class="ACTIVE_CLASS"
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
