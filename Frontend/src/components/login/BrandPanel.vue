<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <aside
    class="relative isolate flex min-h-[19rem] flex-col justify-between overflow-hidden bg-brand-accent px-7 py-7 text-white sm:px-10 sm:py-9 md:min-h-screen md:px-12 md:py-10"
  >
    <svg
      viewBox="0 0 400 600"
      preserveAspectRatio="none"
      class="pointer-events-none absolute inset-0 -z-10 h-full w-full"
      aria-hidden="true"
    >
      <path d="M-20,120 C80,80 160,170 260,140 S400,70 440,120" fill="none" stroke="white" stroke-opacity="0.18" stroke-width="1.5" />
      <path d="M-20,190 C80,150 160,240 260,210 S400,140 440,190" fill="none" stroke="white" stroke-opacity="0.18" stroke-width="1.5" />
      <path d="M-20,260 C80,220 160,310 260,280 S400,210 440,260" fill="none" stroke="white" stroke-opacity="0.18" stroke-width="1.5" />
      <path d="M-20,330 C80,290 160,380 260,350 S400,280 440,330" fill="none" stroke="white" stroke-opacity="0.18" stroke-width="1.5" />
    </svg>

    <div class="relative">
      <RouterLink to="/" class="font-serif text-[1.3rem] text-white no-underline">
        Vet Andina
      </RouterLink>

      <div class="mt-9 md:mt-14">
        <h2 class="max-w-[14ch] font-serif text-[1.9rem] leading-[1.25]">
          Tus turnos y fichas, en un solo lugar
        </h2>
        <p class="mt-4 max-w-[34ch] text-base leading-relaxed text-white/80">
          Entrá para reservar turnos, ver la historia clínica de tus mascotas y consultar el calendario de vacunas.
        </p>
      </div>
    </div>

    <RouterLink to="/" class="relative mt-8 w-fit text-sm text-white/75 underline-offset-4 hover:underline">
      Volver al inicio
    </RouterLink>
  </aside>
</template>
