<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { confirmTurno, listTurnos, type Turno } from '@/services/turnos'
import { useSessionStore } from '@/stores/session'

const DAY_MS = 24 * 60 * 60 * 1000
const session = useSessionStore()
const turnos = ref<Turno[]>([])
const loading = ref(false)
const confirmandoId = ref('')
const error = ref('')
const feedback = ref('')
const today = new Date()
today.setHours(0, 0, 0, 0)
const until = new Date(today.getTime() + 61 * DAY_MS)

const pendientes = computed(() =>
  turnos.value.filter((turno) => turno.status === 'PENDIENTE' || turno.status === 'REPROGRAMADO'),
)
const dateFormat = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
})

async function loadAppointments() {
  const vetId = session.user?.id
  if (!vetId) {
    error.value = 'No se pudo identificar al veterinario de la sesión.'
    return
  }

  loading.value = true
  error.value = ''
  try {
    turnos.value = await listTurnos({ desde: today, hasta: until, veterinario: vetId })
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No fue posible cargar tus turnos.'
  } finally {
    loading.value = false
  }
}

async function confirmAppointment(turno: Turno) {
  confirmandoId.value = turno.id
  error.value = ''
  feedback.value = ''
  try {
    await confirmTurno(turno.id)
    feedback.value = `Turno de ${turno.animal.name} confirmado.`
    await loadAppointments()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No fue posible confirmar el turno.'
  } finally {
    confirmandoId.value = ''
  }
}

onMounted(loadAppointments)
</script>

<template>
  <section class="mx-auto max-w-5xl text-brand-ink">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-3xl">Turnos asignados</h1>
        <p class="mt-2 text-sm text-brand-inkSoft">
          Revisá tus próximas consultas y confirmá las solicitudes pendientes.
        </p>
      </div>
      <button type="button" class="btn-outline" :disabled="loading" @click="loadAppointments">
        Actualizar
      </button>
    </header>

    <p
      v-if="feedback"
      class="mt-5 rounded border border-brand-accent bg-brand-accentSoft px-4 py-3 text-sm text-brand-accentInk"
      role="status"
    >
      {{ feedback }}
    </p>
    <p
      v-if="error"
      class="mt-5 rounded border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
    </p>

    <div class="mt-6 rounded-lg border border-brand-line bg-brand-surface p-5">
      <h2 class="font-semibold">Solicitudes por confirmar ({{ pendientes.length }})</h2>
      <p v-if="loading" class="mt-4 text-sm text-brand-inkSoft">Cargando tus turnos...</p>
      <p v-else-if="!pendientes.length" class="mt-4 text-sm text-brand-inkSoft">
        No tenés solicitudes pendientes asignadas.
      </p>
      <ul v-else class="mt-4 divide-y divide-brand-line border-y border-brand-line">
        <li
          v-for="turno in pendientes"
          :key="turno.id"
          class="flex flex-wrap items-center justify-between gap-4 py-4"
        >
          <div class="min-w-0">
            <p class="font-medium">{{ turno.animal.name }} · {{ turno.animal.species }}</p>
            <p class="mt-1 text-sm text-brand-inkSoft">
              {{ dateFormat.format(new Date(turno.dateTime)) }} · {{ turno.durationMinutes }} min
            </p>
            <p class="mt-1 text-sm text-brand-inkSoft">
              Tutor: {{ turno.tutor.fullName }}
              <span v-if="turno.tutor.phone"> · {{ turno.tutor.phone }}</span>
            </p>
            <p v-if="turno.reason" class="mt-1 text-sm">{{ turno.reason }}</p>
            <span class="mt-2 inline-block text-xs font-medium text-brand-accentInk">
              {{ turno.status === 'REPROGRAMADO' ? 'Reprogramado' : 'Pendiente de aceptación' }}
            </span>
          </div>
          <button
            type="button"
            class="btn-primary w-full shrink-0 sm:w-auto"
            :disabled="confirmandoId === turno.id"
            @click="confirmAppointment(turno)"
          >
            {{ confirmandoId === turno.id ? 'Confirmando...' : 'Aceptar turno' }}
          </button>
        </li>
      </ul>
    </div>

    <div class="mt-6 rounded-lg border border-brand-line bg-brand-surface p-5">
      <h2 class="font-semibold">Agenda próxima</h2>
      <p v-if="loading" class="mt-4 text-sm text-brand-inkSoft">Cargando tus turnos...</p>
      <p v-else-if="!turnos.length" class="mt-4 text-sm text-brand-inkSoft">
        No tenés turnos asignados para los próximos 60 días.
      </p>
      <ul v-else class="mt-4 divide-y divide-brand-line border-y border-brand-line">
        <li
          v-for="turno in turnos"
          :key="turno.id"
          class="flex flex-wrap justify-between gap-3 py-3 text-sm"
        >
          <span>
            {{ dateFormat.format(new Date(turno.dateTime)) }} · {{ turno.animal.name }} ·
            {{ turno.modality === 'RURAL' ? 'Rural' : 'Consultorio' }}
          </span>
          <span class="text-brand-inkSoft">{{ turno.status.replace('_', ' ') }}</span>
        </li>
      </ul>
    </div>
  </section>
</template>
