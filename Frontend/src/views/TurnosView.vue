<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { site } from '@/config/site'
</script>

<template>
  <main class="border-b border-brand-line">
    <div class="container-page py-20 md:py-24">
      <div class="max-w-[540px]">
        <h1 class="font-serif text-4xl text-brand-ink">Reservar turno</h1>
        <p class="mt-6 leading-7 text-brand-inkSoft">
          Estamos terminando el sistema de turnos en línea. Mientras tanto, podés pedir tu turno por
          WhatsApp y te respondemos a la brevedad.
        </p>
        <div class="mt-10 flex flex-wrap gap-3">
          <a :href="site.phone.whatsapp" target="_blank" rel="noopener" class="btn-primary">
            Pedir turno por WhatsApp
          </a>
          <RouterLink to="/" class="btn-outline">Volver al inicio</RouterLink>
        </div>
      </div>
    </div>
  </main>
</template>
