<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

<template>
  <section class="relative overflow-hidden border-b border-brand-line">
    <svg
      class="pointer-events-none absolute right-0 top-0 hidden h-full w-[65%] lg:block"
      viewBox="0 0 900 580"
      preserveAspectRatio="none"
      fill="none"
      stroke="#e4e2dc"
      stroke-width="2"
      aria-hidden="true"
    >
      <path d="M280 0 C 420 60, 430 210, 600 220 S 820 230, 900 236" />
      <path d="M140 30 C 330 100, 380 250, 580 268 S 820 296, 900 302" />
      <path d="M50 100 C 300 170, 320 320, 560 350 S 820 378, 900 382" />
      <path d="M0 180 C 260 240, 280 380, 540 410 S 800 448, 900 458" />
    </svg>

    <div class="container-page relative py-20 md:py-24">
      <div class="max-w-[540px]">
        <h1 class="font-serif text-[40px] leading-[1.2] text-brand-ink md:text-[54px]">
          Reservá el turno de tu mascota sin llamar por teléfono
        </h1>
        <p class="mt-10 text-lg leading-8 text-brand-inkSoft">
          Atendemos en el consultorio de Cipolletti y viajamos a los establecimientos rurales del
          Alto Valle. La historia clínica de tu mascota queda guardada y disponible siempre que la
          necesites.
        </p>
        <div class="mt-10 flex flex-wrap gap-3">
          <RouterLink to="/turnos" class="btn-primary">Reservar turno</RouterLink>
          <a href="#servicios" class="btn-outline">Ver servicios</a>
        </div>
      </div>
    </div>
  </section>
</template>
