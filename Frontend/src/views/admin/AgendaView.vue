<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AgendaCalendar from '@/components/agenda/AgendaCalendar.vue'
import { getVetsAgenda } from '@/services/agenda'
import { listVets, type Veterinario } from '@/services/turnos'

const vets = ref<Veterinario[]>([])
const filtroVet = ref('')
const errorVets = ref('')

// Una función nueva por filtro: el calendario vuelve a pedir la agenda.
const fetchAgenda = computed(() => {
  const veterinario = filtroVet.value || undefined
  return (desde: Date, hasta: Date) => getVetsAgenda(desde, hasta, veterinario)
})

onMounted(async () => {
  try {
    vets.value = await listVets()
  } catch (e) {
    errorVets.value = e instanceof Error ? e.message : 'No fue posible obtener los veterinarios.'
  }
})
</script>

<template>
  <div class="mx-auto max-w-[1210px] text-brand-ink">
    <header class="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 class="font-serif text-[1.6rem]">Agenda general</h1>
        <p class="mt-1.5 text-base text-brand-inkSoft">
          Turnos asignados y hojas de ruta de los veterinarios.
        </p>
      </div>

      <div class="w-full sm:w-64">
        <label for="agenda-filtro-vet" class="field-label">Veterinario</label>
        <select id="agenda-filtro-vet" v-model="filtroVet" class="field-input">
          <option value="">Todos</option>
          <option v-for="vet in vets" :key="vet.id" :value="vet.id">{{ vet.fullName }}</option>
        </select>
      </div>
    </header>

    <p
      v-if="errorVets"
      class="mt-4 rounded border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ errorVets }}
    </p>

    <AgendaCalendar
      class="mt-8"
      :fetch-agenda="fetchAgenda"
      :mostrar-veterinario="filtroVet === ''"
    />
  </div>
</template>
