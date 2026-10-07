<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { currentUser } from '@/data/panelMock'
import { initials } from '@/utils/format'

const links = [
  { label: 'Inicio', to: '/panel' },
  { label: 'Mis mascotas', to: '/panel/mascotas' },
  { label: 'Reservar turno', to: '/panel/reservar' },
  { label: 'Mis turnos', to: '/panel/turnos' },
]

const fullName = `${currentUser.firstName} ${currentUser.lastName}`
</script>

<template>
  <aside
    class="flex flex-col border-b border-brand-line bg-[#f3f2ec] px-6 py-6 md:sticky md:top-0 md:h-screen md:w-[234px] md:shrink-0 md:border-b-0 md:border-r md:py-8"
  >
    <RouterLink to="/" class="block">
      <span class="block font-serif text-xl text-brand-ink">Vet Andina</span>
      <span class="mt-1 block text-xs text-brand-inkSoft">Panel del cliente</span>
    </RouterLink>

    <nav class="mt-6 flex gap-1 overflow-x-auto md:mt-9 md:flex-col md:gap-2 md:overflow-visible">
      <RouterLink
        v-for="link in links"
        :key="link.to"
        :to="link.to"
        exact-active-class="!bg-brand-accentSoft !text-brand-ink"
        class="flex shrink-0 items-center gap-3 rounded-sm px-3 py-2.5 text-sm text-brand-inkSoft transition-colors hover:text-brand-ink"
      >
        <span class="h-1 w-1 rounded-full bg-current" aria-hidden="true" />
        {{ link.label }}
      </RouterLink>
    </nav>

    <div class="mt-6 flex items-center gap-3 border-t border-brand-line pt-6 md:mt-auto">
      <span
        class="flex h-8 w-8 items-center justify-center rounded-full bg-brand-accent text-xs text-white"
        aria-hidden="true"
      >
        {{ initials(fullName) }}
      </span>
      <div>
        <p class="text-sm text-brand-ink">{{ currentUser.firstName }}</p>
        <RouterLink to="/" class="text-xs text-brand-inkSoft underline hover:text-brand-ink">
          Cerrar sesión
        </RouterLink>
      </div>
    </div>
  </aside>
</template>
