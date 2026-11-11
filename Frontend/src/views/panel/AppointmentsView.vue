<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import BaseModal from '@/components/admin/BaseModal.vue'
import { listMisTurnos } from '@/services/reservas'
import { MODIFICABLE, rescheduleTurno, type Turno } from '@/services/turnos'
import { toDateTimeInput } from '@/utils/format'

const turns = ref<Turno[]>([])
const loading = ref(true)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const selectedTurn = ref<Turno | null>(null)
const proposedDateTime = ref('')
const minDateTime = toDateTimeInput(new Date())

const sortedTurns = computed(() =>
  [...turns.value].sort((a, b) => b.dateTime.localeCompare(a.dateTime)),
)

const dateFormat = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
})

const statusLabels: Record<Turno['status'], string> = {
  PENDIENTE: 'Pendiente de aceptación',
  PENDIENTE_PAGO: 'Esperando seña',
  CONFIRMADO: 'Confirmado',
  REPROGRAMADO: 'Reprogramado',
  CANCELADA: 'Cancelado',
  COMPLETADO: 'Atendido',
  AUSENTE: 'Ausente',
}

function canReschedule(turn: Turno): boolean {
  return MODIFICABLE.includes(turn.status) && new Date(turn.dateTime).getTime() > Date.now()
}

function openReschedule(turn: Turno) {
  selectedTurn.value = turn
  proposedDateTime.value = toDateTimeInput(new Date(turn.dateTime))
  error.value = ''
}

async function loadTurns() {
  loading.value = true
  error.value = ''
  try {
    turns.value = await listMisTurnos()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No fue posible obtener tus turnos.'
  } finally {
    loading.value = false
  }
}

async function saveReschedule() {
  if (!selectedTurn.value || !proposedDateTime.value) return
  saving.value = true
  error.value = ''
  try {
    await rescheduleTurno(
      selectedTurn.value.id,
      new Date(proposedDateTime.value).toISOString(),
      null,
    )
    notice.value =
      selectedTurn.value.modality === 'RURAL'
        ? 'La propuesta de fecha quedó actualizada. El personal coordinará la visita al organizar la hoja de ruta.'
        : 'El cambio de fecha quedó pendiente de aceptación por el equipo.'
    selectedTurn.value = null
    await loadTurns()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No fue posible modificar el turno.'
  } finally {
    saving.value = false
  }
}

onMounted(loadTurns)
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-3xl text-brand-ink">Mis turnos</h1>
        <p class="mt-2 text-sm text-brand-inkSoft">
          Consultá tus solicitudes y modificá la fecha de un turno vigente.
        </p>
      </div>
      <RouterLink :to="{ name: 'panel-reservar' }" class="btn-primary"> Reservar turno </RouterLink>
    </header>

    <p
      v-if="error && !selectedTurn"
      class="mt-5 rounded border border-brand-dangerLine bg-brand-dangerSoft p-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
    </p>
    <p
      v-if="notice"
      class="mt-5 rounded border border-brand-accent bg-brand-accentSoft p-3 text-sm text-brand-accentInk"
      role="status"
    >
      {{ notice }}
    </p>

    <p v-if="loading" class="mt-8 text-sm text-brand-inkSoft" role="status">
      Cargando tus turnos...
    </p>
    <p
      v-else-if="!turns.length && !error"
      class="mt-8 rounded border border-brand-line bg-brand-surface p-5 text-sm text-brand-inkSoft"
    >
      Todavía no tenés turnos registrados.
    </p>
    <div
      v-else-if="turns.length"
      class="mt-8 overflow-x-auto border border-brand-line bg-brand-surface"
    >
      <table class="w-full min-w-[760px] text-left text-sm">
        <thead class="text-xs text-brand-inkSoft">
          <tr>
            <th class="px-4 py-3 font-normal">Paciente / lote</th>
            <th class="px-4 py-3 font-normal">Modalidad</th>
            <th class="px-4 py-3 font-normal">Fecha y hora</th>
            <th class="px-4 py-3 font-normal">Veterinario</th>
            <th class="px-4 py-3 font-normal">Estado</th>
            <th class="px-4 py-3 font-normal"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="turn in sortedTurns"
            :key="turn.id"
            class="border-t border-brand-line text-brand-ink"
          >
            <td class="px-4 py-4">
              <span class="font-medium">{{ turn.animal.name }}</span>
              <span class="block text-xs text-brand-inkSoft">{{ turn.animal.species }}</span>
            </td>
            <td class="px-4 py-4">{{ turn.modality === 'RURAL' ? 'Rural' : 'Consultorio' }}</td>
            <td class="px-4 py-4">{{ dateFormat.format(new Date(turn.dateTime)) }}</td>
            <td class="px-4 py-4">{{ turn.vet?.fullName ?? 'A coordinar' }}</td>
            <td class="px-4 py-4">{{ statusLabels[turn.status] }}</td>
            <td class="px-4 py-4">
              <button
                v-if="canReschedule(turn)"
                type="button"
                class="btn-outline min-h-0! px-3! py-2!"
                @click="openReschedule(turn)"
              >
                Modificar
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <BaseModal
    v-if="selectedTurn"
    title="Modificar turno"
    :subtitle="`${selectedTurn.animal.name} · ${selectedTurn.modality === 'RURAL' ? 'Visita rural' : 'Consultorio'}`"
    @close="selectedTurn = null"
  >
    <form class="space-y-4" @submit.prevent="saveReschedule">
      <p class="text-sm text-brand-inkSoft">
        {{
          selectedTurn.modality === 'RURAL'
            ? 'La fecha y hora son tentativas; el personal podrá coordinarlas al armar la hoja de ruta.'
            : 'El cambio quedará pendiente de aceptación por el equipo veterinario.'
        }}
      </p>
      <label for="mis-turnos-fecha" class="block text-sm text-brand-inkSoft">
        Nueva fecha y hora
        <input
          id="mis-turnos-fecha"
          v-model="proposedDateTime"
          type="datetime-local"
          :min="minDateTime"
          required
          class="field-input mt-1"
        />
      </label>
      <p
        v-if="error"
        class="rounded border border-brand-dangerLine bg-brand-dangerSoft p-3 text-sm text-brand-dangerInk"
        role="alert"
      >
        {{ error }}
      </p>
      <button type="submit" class="btn-primary w-full" :disabled="saving">
        {{ saving ? 'Guardando...' : 'Guardar cambio' }}
      </button>
    </form>
  </BaseModal>
</template>
