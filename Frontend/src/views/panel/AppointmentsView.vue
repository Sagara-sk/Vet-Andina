<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import BaseModal from '@/components/admin/BaseModal.vue'
import { listMisTurnos } from '@/services/reservas'
import { cancelTurno, type EstadoTurno, type Turno } from '@/services/turnos'

const turnos = ref<Turno[]>([])
const route = useRoute()
const loading = ref(true)
const error = ref('')
const canceling = ref(false)
const cancelError = ref('')
const turnoParaCancelar = ref<Turno | null>(null)

const sortedTurnos = computed(() =>
  [...turnos.value].sort(
    (first, second) => new Date(first.dateTime).getTime() - new Date(second.dateTime).getTime(),
  ),
)

const editableStatuses: EstadoTurno[] = [
  'PENDIENTE',
  'PENDIENTE_PAGO',
  'CONFIRMADO',
  'REPROGRAMADO',
]

function canManage(turno: Turno): boolean {
  return editableStatuses.includes(turno.status) && new Date(turno.dateTime).getTime() > Date.now()
}

function statusLabel(status: EstadoTurno): string {
  const labels: Record<EstadoTurno, string> = {
    PENDIENTE: 'Pendiente',
    PENDIENTE_PAGO: 'Pendiente de pago',
    CONFIRMADO: 'Confirmado',
    REPROGRAMADO: 'Reprogramado',
    CANCELADA: 'Cancelado',
    COMPLETADO: 'Completado',
    AUSENTE: 'Ausente',
  }
  return labels[status]
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat('es-AR', {
    dateStyle: 'full',
    timeStyle: 'short',
    timeZone: 'America/Argentina/Buenos_Aires',
  }).format(new Date(value))
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    turnos.value = await listMisTurnos()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No fue posible obtener tus turnos.'
  } finally {
    loading.value = false
  }
}

async function confirmCancel() {
  if (!turnoParaCancelar.value) return

  canceling.value = true
  cancelError.value = ''
  try {
    const updated = await cancelTurno(turnoParaCancelar.value.id, '')
    turnos.value = turnos.value.map((turno) => (turno.id === updated.id ? updated : turno))
    turnoParaCancelar.value = null
  } catch (cause) {
    cancelError.value = cause instanceof Error ? cause.message : 'No fue posible cancelar el turno.'
  } finally {
    canceling.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-[1210px] text-brand-ink">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-3xl">Mis turnos</h1>
        <p class="mt-2 text-sm text-brand-inkSoft">
          Consultá tus turnos y gestioná la fecha o cancelación de los próximos.
        </p>
      </div>
      <RouterLink :to="{ name: 'panel-reservar' }" class="btn-primary"> Reservar turno </RouterLink>
    </header>

    <p
      v-if="route.query.actualizado === 'reprogramado'"
      class="mt-6 border border-brand-accent bg-brand-accentSoft px-4 py-3 text-sm text-brand-accentInk"
      role="status"
    >
      El turno se reprogramó correctamente.
    </p>

    <p
      v-if="error"
      class="mt-6 border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
      <button type="button" class="ml-2 underline" @click="load">Reintentar</button>
    </p>

    <p v-else-if="loading" class="mt-8 text-sm text-brand-inkSoft" role="status">
      Cargando tus turnos...
    </p>

    <p
      v-else-if="!sortedTurnos.length"
      class="mt-8 border border-brand-line bg-brand-surface p-6 text-sm text-brand-inkSoft"
    >
      Todavía no tenés turnos registrados.
    </p>

    <div v-else class="mt-8 space-y-4">
      <article
        v-for="turno in sortedTurnos"
        :key="turno.id"
        class="rounded-lg border border-brand-line bg-brand-surface p-5"
      >
        <div class="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold">{{ turno.animal.name }}</h2>
            <p class="mt-1 text-sm text-brand-inkSoft">
              {{ turno.animal.species }} ·
              {{ turno.modality === 'RURAL' ? 'Visita rural' : 'Consultorio' }}
            </p>
          </div>
          <span class="rounded-full bg-brand-accentSoft px-3 py-1 text-xs text-brand-accentInk">
            {{ statusLabel(turno.status) }}
          </span>
        </div>

        <dl class="mt-5 grid gap-3 text-sm sm:grid-cols-2">
          <div>
            <dt class="text-xs text-brand-inkSoft">Fecha y horario</dt>
            <dd class="mt-1">{{ formatDate(turno.dateTime) }}</dd>
          </div>
          <div>
            <dt class="text-xs text-brand-inkSoft">Profesional</dt>
            <dd class="mt-1">{{ turno.vet?.fullName ?? 'A confirmar' }}</dd>
          </div>
          <div>
            <dt class="text-xs text-brand-inkSoft">Motivo</dt>
            <dd class="mt-1">{{ turno.reason ?? '—' }}</dd>
          </div>
          <div v-if="turno.status === 'CANCELADA' && turno.cancellationReason">
            <dt class="text-xs text-brand-inkSoft">Motivo de cancelación</dt>
            <dd class="mt-1">{{ turno.cancellationReason }}</dd>
          </div>
        </dl>

        <div v-if="canManage(turno)" class="mt-5 flex flex-wrap gap-3">
          <RouterLink
            :to="{ name: 'panel-reservar', query: { reprogramar: turno.id } }"
            class="btn-outline"
          >
            Cambiar fecha y horario
          </RouterLink>
          <button type="button" class="btn-outline" @click="turnoParaCancelar = turno">
            Cancelar turno
          </button>
        </div>
      </article>
    </div>

    <BaseModal
      v-if="turnoParaCancelar"
      title="Cancelar turno"
      :subtitle="`${turnoParaCancelar.animal.name} · ${formatDate(turnoParaCancelar.dateTime)}`"
      @close="turnoParaCancelar = null"
    >
      <p class="text-sm text-brand-inkSoft">
        ¿Querés cancelar este turno? Esta acción no se puede deshacer.
      </p>
      <p
        v-if="cancelError"
        class="mt-4 border border-brand-dangerLine bg-brand-dangerSoft p-3 text-sm text-brand-dangerInk"
        role="alert"
      >
        {{ cancelError }}
      </p>
      <div class="mt-5 flex justify-end gap-3">
        <button
          type="button"
          class="btn-outline"
          :disabled="canceling"
          @click="turnoParaCancelar = null"
        >
          Volver
        </button>
        <button
          type="button"
          class="rounded-[3px] bg-brand-danger px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          :disabled="canceling"
          @click="confirmCancel"
        >
          {{ canceling ? 'Cancelando...' : 'Confirmar cancelación' }}
        </button>
      </div>
    </BaseModal>
  </div>
</template>
