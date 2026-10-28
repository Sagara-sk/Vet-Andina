<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import StatusBadge from '@/components/panel/StatusBadge.vue'
import { appointments, pets } from '@/data/panelMock'
import { formatLongDate } from '@/utils/format'

const petName = (id: number) => pets.find((p) => p.id === id)?.name ?? '—'

const sorted = computed(() => [...appointments].sort((a, b) => b.date.getTime() - a.date.getTime()))
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-3xl text-brand-ink">Mis turnos</h1>
        <p class="mt-2 text-xs text-brand-inkSoft" role="note">
          Vista de demostración. Los turnos no provienen de tu cuenta ni de la base de datos.
        </p>
      </div>
      <RouterLink :to="{ name: 'panel-reservar' }" class="btn-primary">Reservar turno</RouterLink>
    </header>

    <div class="mt-8 overflow-x-auto border border-brand-line bg-brand-surface">
      <table class="w-full min-w-[640px] text-left text-sm">
        <thead class="text-xs text-brand-inkSoft">
          <tr>
            <th class="px-4 py-3 font-normal">Mascota</th>
            <th class="px-4 py-3 font-normal">Servicio</th>
            <th class="px-4 py-3 font-normal">Fecha</th>
            <th class="px-4 py-3 font-normal">Lugar</th>
            <th class="px-4 py-3 font-normal">Estado</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="a in sorted" :key="a.id" class="border-t border-brand-line text-brand-ink">
            <td class="px-4 py-4">{{ petName(a.petId) }}</td>
            <td class="px-4 py-4">{{ a.service }}</td>
            <td class="px-4 py-4">{{ formatLongDate(a.date) }}</td>
            <td class="px-4 py-4">{{ a.place }} · {{ a.vet }}</td>
            <td class="px-4 py-4"><StatusBadge :status="a.status" /></td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>
