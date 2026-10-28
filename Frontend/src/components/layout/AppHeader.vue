<script setup lang="ts">
import { ref } from 'vue'
import { RouterLink } from 'vue-router'

const links = [
  { label: 'Quiénes somos', hash: '#quienes-somos' },
  { label: 'Servicios', hash: '#servicios' },
  { label: 'Contacto', hash: '#contacto' },
]

const menuOpen = ref(false)
</script>

<template>
  <header class="sticky top-0 z-50 border-b border-brand-line bg-brand-bg/80 backdrop-blur">
    <div class="mx-auto flex h-[82px] w-full items-center justify-between px-6 md:px-12">
      <RouterLink to="/" class="font-serif text-[22px] text-brand-ink" @click="menuOpen = false">
        Vet Andina
      </RouterLink>

      <nav class="hidden items-center gap-8 md:flex">
        <RouterLink
          v-for="link in links"
          :key="link.hash"
          :to="{ path: '/', hash: link.hash }"
          class="text-sm text-brand-inkSoft transition-colors hover:text-brand-ink"
        >
          {{ link.label }}
        </RouterLink>
      </nav>

      <div class="hidden items-center gap-3 md:flex">
        <RouterLink to="/login" class="btn-outline">Iniciar sesión</RouterLink>
        <RouterLink to="/turnos" class="btn-primary">Reservar turno</RouterLink>
      </div>

      <button
        type="button"
        class="p-2 text-brand-ink md:hidden"
        :aria-expanded="menuOpen"
        aria-label="Abrir menú"
        @click="menuOpen = !menuOpen"
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path v-if="!menuOpen" d="M4 7h16M4 12h16M4 17h16" />
          <path v-else d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
    </div>

    <div v-if="menuOpen" class="border-t border-brand-line bg-brand-bg px-6 pb-6 md:hidden">
      <nav class="flex flex-col py-2">
        <RouterLink
          v-for="link in links"
          :key="link.hash"
          :to="{ path: '/', hash: link.hash }"
          class="py-3 text-sm text-brand-inkSoft"
          @click="menuOpen = false"
        >
          {{ link.label }}
        </RouterLink>
      </nav>
      <div class="flex flex-col gap-3">
        <RouterLink to="/login" class="btn-outline" @click="menuOpen = false">Iniciar sesión</RouterLink>
        <RouterLink to="/turnos" class="btn-primary" @click="menuOpen = false">Reservar turno</RouterLink>
      </div>
    </div>
  </header>
</template>
