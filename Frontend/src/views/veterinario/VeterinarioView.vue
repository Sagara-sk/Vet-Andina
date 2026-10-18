<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'
</script>

<template>
  <div class="min-h-screen md:flex">
    <aside class="border-b border-brand-line bg-[#f3f2ec] px-6 py-6 md:sticky md:top-0 md:h-screen md:w-60 md:shrink-0 md:border-b-0 md:border-r md:py-8">
      <RouterLink to="/" class="block">
        <span class="block font-serif text-xl text-brand-ink">Vet Andina</span>
        <span class="mt-1 block text-xs text-brand-inkSoft">Área veterinaria</span>
      </RouterLink>

      <nav class="mt-7 flex gap-2 overflow-x-auto md:flex-col md:overflow-visible">
        <RouterLink
          :to="{ name: 'vet-dashboard' }"
          exact-active-class="!bg-brand-accentSoft !text-brand-ink"
          class="shrink-0 rounded-sm px-3 py-2.5 text-sm text-brand-inkSoft hover:text-brand-ink"
        >
          Agenda
        </RouterLink>
      </nav>

      <RouterLink
        to="/"
        class="mt-7 inline-block text-xs text-brand-inkSoft underline underline-offset-2 hover:text-brand-ink"
      >
        Volver al inicio
      </RouterLink>
    </aside>

    <main class="min-w-0 flex-1 px-6 py-8 md:px-10 md:py-10">
      <RouterView />
    </main>
  </div>
</template>