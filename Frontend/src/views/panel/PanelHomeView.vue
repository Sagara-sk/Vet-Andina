<script setup lang="ts">
import { computed } from 'vue'
import { RouterLink } from 'vue-router'
import PetCard from '@/components/panel/PetCard.vue'
import StatusBadge from '@/components/panel/StatusBadge.vue'
import { appointments, currentUser, pets } from '@/data/panelMock'
import { formatLongDate, formatShortDate } from '@/utils/format'

const petName = (id: number) => pets.find((p) => p.id === id)?.name ?? '—'

const nextAppointment = computed(() =>
  appointments
    .filter((a) => a.status !== 'realizado')
    .sort((a, b) => a.date.getTime() - b.date.getTime())[0],
)

function cancelAppointment() {
  // TODO: pedir confirmación y llamar al Backend para cancelar el turno.
}
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-3xl text-brand-ink">Hola, {{ currentUser.firstName }}</h1>
        <p class="mt-3 text-brand-inkSoft">Así está la agenda de tus mascotas.</p>
      </div>
      <RouterLink to="/panel/reservar" class="btn-primary">Reservar turno</RouterLink>
    </header>

    <section
      v-if="nextAppointment"
      class="mt-9 flex flex-wrap items-center justify-between gap-6 border border-brand-line bg-brand-surface px-7 py-8"
    >
      <div>
        <p class="text-xs text-brand-inkSoft">Próximo turno</p>
        <h2 class="mt-2 font-serif text-xl text-brand-ink">
          {{ petName(nextAppointment.petId) }} · {{ nextAppointment.service }}
        </h2>
        <p class="mt-3 text-sm text-brand-inkSoft">
          {{ formatLongDate(nextAppointment.date) }} · {{ nextAppointment.place }} · atiende
          {{ nextAppointment.vet }}
        </p>
      </div>
      <div class="flex gap-3">
        <button type="button" class="btn-outline" @click="cancelAppointment">Cancelar</button>
        <RouterLink to="/panel/turnos" class="btn-primary">Ver detalle</RouterLink>
      </div>
    </section>

    <section class="mt-11">
      <div class="flex items-baseline justify-between">
        <h2 class="text-base text-brand-ink">Tus mascotas</h2>
        <RouterLink to="/panel/mascotas" class="text-xs text-brand-inkSoft hover:text-brand-ink">
          Ver todas
        </RouterLink>
      </div>
      <div class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <PetCard v-for="pet in pets" :key="pet.id" :pet="pet" />
      </div>
    </section>

    <section class="mt-10">
      <div class="flex items-baseline justify-between">
        <h2 class="text-base text-brand-ink">Tus turnos</h2>
        <RouterLink to="/panel/turnos" class="text-xs text-brand-inkSoft hover:text-brand-ink">
          Ver todos
        </RouterLink>
      </div>
      <div class="mt-4 overflow-x-auto border border-brand-line bg-brand-surface">
        <table class="w-full min-w-[560px] text-left text-sm">
          <thead class="text-xs text-brand-inkSoft">
            <tr>
              <th class="w-[18%] px-4 py-3 font-normal">Mascota</th>
              <th class="w-[33%] px-4 py-3 font-normal">Servicio</th>
              <th class="w-[26%] px-4 py-3 font-normal">Fecha</th>
              <th class="px-4 py-3 font-normal">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="a in appointments" :key="a.id" class="border-t border-brand-line text-brand-ink">
              <td class="px-4 py-4">{{ petName(a.petId) }}</td>
              <td class="px-4 py-4">{{ a.service }}</td>
              <td class="px-4 py-4">{{ formatShortDate(a.date) }}</td>
              <td class="px-4 py-4"><StatusBadge :status="a.status" /></td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <RouterLink
      to="/panel/reservar"
      class="mt-7 block max-w-[598px] border border-brand-line bg-brand-surface px-5 py-6 transition-colors hover:border-brand-inkSoft"
    >
      <span class="block text-sm text-brand-ink">Reservar turno</span>
      <span class="mt-1.5 block text-xs text-brand-inkSoft">Elegí día, horario y mascota.</span>
    </RouterLink>
  </div>
</template>
