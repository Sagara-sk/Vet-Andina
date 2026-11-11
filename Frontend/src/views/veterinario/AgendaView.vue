<script setup lang="ts">
import AgendaCalendar from '@/components/agenda/AgendaCalendar.vue'
import RuralAvailabilityManager from '@/components/agenda/RuralAvailabilityManager.vue'
import { getMyAgenda } from '@/services/agenda'
</script>

<template>
  <div class="mx-auto max-w-[1210px] text-brand-ink">
    <header>
      <h1 class="font-serif text-[1.6rem]">Agenda</h1>
      <p class="mt-1.5 text-base text-brand-inkSoft">
        Tus turnos asignados de consultorio y rurales, junto con tus hojas de ruta.
      </p>
    </header>

    <AgendaCalendar class="mt-8" :fetch-agenda="getMyAgenda" />

    <RuralAvailabilityManager class="mt-8" />
  </div>
</template>
