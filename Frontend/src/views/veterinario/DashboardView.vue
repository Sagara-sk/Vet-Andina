<script setup lang="ts">
import { computed } from 'vue'

type AppointmentStatus = 'Confirmado' | 'Pendiente'

interface SampleAppointment {
  id: string
  time: string
  patient: string
  service: string
  place: string
  status: AppointmentStatus
}

const sampleAppointments: SampleAppointment[] = [
  {
    id: 'sample-1',
    time: '09:00',
    patient: 'Paciente de muestra A',
    service: 'Control y vacunación',
    place: 'Consultorio',
    status: 'Confirmado',
  },
  {
    id: 'sample-2',
    time: '10:30',
    patient: 'Paciente de muestra B',
    service: 'Consulta general',
    place: 'Consultorio',
    status: 'Confirmado',
  },
  {
    id: 'sample-3',
    time: '11:15',
    patient: 'Lote de muestra A',
    service: 'Control sanitario',
    place: 'Campo',
    status: 'Pendiente',
  },
]

const pendingCount = computed(
  () => sampleAppointments.filter((appointment) => appointment.status === 'Pendiente').length,
)

const currentDate = new Intl.DateTimeFormat('es-AR', { dateStyle: 'full' }).format(new Date())
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-3xl text-brand-ink">Agenda veterinaria</h1>
        <p class="mt-2 text-sm capitalize text-brand-inkSoft">{{ currentDate }}</p>
      </div>
      <span class="border border-brand-line px-3 py-1.5 text-xs text-brand-inkSoft">
        DEMOSTRACIÓN
      </span>
    </header>

    <p class="mt-6 border-l-2 border-brand-accent bg-brand-accentSoft px-4 py-3 text-sm text-brand-accentInk" role="note">
      Agenda de muestra: no contiene turnos ni información obtenidos de Neon.
    </p>

    <section class="mt-8 grid gap-4 sm:grid-cols-2" aria-label="Resumen de la agenda de muestra">
      <div class="border border-brand-line bg-brand-surface p-5">
        <p class="font-serif text-2xl text-brand-ink">{{ sampleAppointments.length }}</p>
        <p class="mt-1 text-xs text-brand-inkSoft">Turnos de muestra</p>
      </div>
      <div class="border border-brand-line bg-brand-surface p-5">
        <p class="font-serif text-2xl text-brand-ink">{{ pendingCount }}</p>
        <p class="mt-1 text-xs text-brand-inkSoft">Pendientes de muestra</p>
      </div>
    </section>

    <section class="mt-9">
      <h2 class="text-base text-brand-ink">Agenda de hoy</h2>
      <div class="mt-3 overflow-x-auto border border-brand-line bg-brand-surface">
        <table class="w-full min-w-[620px] text-left text-sm">
          <thead class="text-xs text-brand-inkSoft">
            <tr>
              <th class="px-4 py-3 font-normal">Hora</th>
              <th class="px-4 py-3 font-normal">Paciente / lote</th>
              <th class="px-4 py-3 font-normal">Atención</th>
              <th class="px-4 py-3 font-normal">Lugar</th>
              <th class="px-4 py-3 font-normal">Estado</th>
            </tr>
          </thead>
          <tbody>
            <tr
              v-for="appointment in sampleAppointments"
              :key="appointment.id"
              class="border-t border-brand-line text-brand-ink"
            >
              <td class="whitespace-nowrap px-4 py-4">{{ appointment.time }}</td>
              <td class="px-4 py-4">{{ appointment.patient }}</td>
              <td class="px-4 py-4">{{ appointment.service }}</td>
              <td class="px-4 py-4">{{ appointment.place }}</td>
              <td class="px-4 py-4">
                <span
                  class="inline-block rounded-full px-2.5 py-1 text-xs"
                  :class="appointment.status === 'Confirmado' ? 'bg-brand-accentSoft text-brand-accentInk' : 'bg-[#f3eee2] text-[#7a5b1f]'"
                >
                  {{ appointment.status }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <section class="mt-9 border-t border-brand-line pt-6">
      <h2 class="text-base text-brand-ink">Trabajo sin conexión</h2>
      <p class="mt-2 max-w-2xl text-sm leading-6 text-brand-inkSoft">
        La consulta y sincronización de fichas todavía no están habilitadas. No registres información clínica en este panel de demostración.
      </p>
    </section>
  </div>
</template>