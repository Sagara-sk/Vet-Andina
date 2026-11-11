<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter, type RouteLocationRaw } from 'vue-router'
import LogoutButton from '@/components/Redireccion/LogoutButton.vue'
import { useTheme } from '@/composables/useTheme'
import { resolvePanelNavigation } from '@/router/navigation'
import { useSessionStore } from '@/stores/session'
import { initials } from '@/utils/format'

const ACTIVE_CLASS = '!bg-brand-accentSoft !text-brand-ink'

const DASHBOARD_ROUTE: RouteLocationRaw = { name: 'dashboard' }

const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const { isDark, toggleTheme } = useTheme()

// Menú desplegable en celular; en escritorio siempre está visible.
const menuAbierto = ref(false)

// Al navegar a otra sección se cierra el menú para mostrar el contenido.
watch(
  () => route.fullPath,
  () => {
    menuAbierto.value = false
  },
)

// Los ítems de cada rol se configuran en src/router/navigation.ts. Acá solo se
// muestran los que quedaron después de filtrar por rol y permisos de ruta.
const panel = computed(() => resolvePanelNavigation(session.user, router))

const fullName = computed(() => session.user?.nombreCompleto ?? '')
</script>

<template>
  <aside
    v-if="panel"
    class="sticky top-0 z-40 flex max-h-dvh flex-col overflow-y-auto border-b border-brand-line bg-brand-sidebar px-4 py-3 sm:px-6 md:h-screen md:max-h-none md:w-58.5 md:shrink-0 md:overflow-visible md:border-b-0 md:border-r md:py-8"
  >
    <!-- En celular el menú es una barra compacta: solo marca y botón. -->
    <div class="flex items-center justify-between gap-4">
      <RouterLink :to="DASHBOARD_ROUTE" class="block">
        <span class="block font-serif text-xl text-brand-ink">Vet Andina</span>
        <span class="mt-1 block text-xs text-brand-inkSoft">
          {{ panel.subtitle }}
        </span>
      </RouterLink>

      <button
        type="button"
        class="flex h-11 w-11 shrink-0 items-center justify-center rounded-sm border border-brand-line text-lg text-brand-ink md:hidden"
        aria-controls="panel-menu"
        :aria-expanded="menuAbierto"
        :aria-label="menuAbierto ? 'Cerrar menú' : 'Abrir menú'"
        @click="menuAbierto = !menuAbierto"
      >
        <span aria-hidden="true">{{ menuAbierto ? '✕' : '☰' }}</span>
      </button>
    </div>

    <div
      id="panel-menu"
      class="flex-col pb-3 md:flex md:flex-1 md:pb-0"
      :class="menuAbierto ? 'flex' : 'hidden'"
    >
      <nav class="mt-4 flex flex-col gap-1 md:mt-9 md:gap-2">
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
    </div>
  </aside>
</template>
