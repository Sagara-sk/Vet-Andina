<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import EstadoTurnoBadge from '@/components/admin/EstadoTurnoBadge.vue'
import NuevoTurnoModal from '@/components/admin/NuevoTurnoModal.vue'
import TurnoAccionModal, { type AccionTurno } from '@/components/admin/TurnoAccionModal.vue'
import {
  CONFIRMABLE,
  MODIFICABLE,
  confirmTurno,
  listTurnos,
  listVets,
  type EstadoTurno,
  type Turno,
  type Veterinario,
} from '@/services/turnos'

const DAY_MS = 24 * 60 * 60 * 1000

const vista = ref<'dia' | 'semana'>('dia')
const inicio = ref(startOfDay(new Date()))
const filtroEstado = ref<EstadoTurno | ''>('')
const filtroVet = ref('')

const turnos = ref<Turno[]>([])
const vets = ref<Veterinario[]>([])
const cargando = ref(false)
const error = ref('')
const feedback = ref('')
const nuevo = ref(false)
const accion = ref<{ turno: Turno; tipo: AccionTurno } | null>(null)

const ESTADOS: { value: EstadoTurno | ''; label: string }[] = [
  { value: '', label: 'Todos los estados' },
  { value: 'PENDIENTE', label: 'Por confirmar' },
  { value: 'REPROGRAMADO', label: 'Reprogramados' },
  { value: 'CONFIRMADO', label: 'Confirmados' },
  { value: 'PENDIENTE_PAGO', label: 'Esperando seña' },
  { value: 'CANCELADA', label: 'Cancelados' },
  { value: 'COMPLETADO', label: 'Atendidos' },
  { value: 'AUSENTE', label: 'Ausentes' },
]

function startOfDay(date: Date) {
  const d = new Date(date)
  d.setHours(0, 0, 0, 0)
  return d
}

const fin = computed(() => new Date(inicio.value.getTime() + (vista.value === 'dia' ? 1 : 7) * DAY_MS))

const titulo = computed(() => {
  const dia = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })
  const corto = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' })
  const texto =
    vista.value === 'dia'
      ? dia.format(inicio.value)
      : `${corto.format(inicio.value)} – ${corto.format(new Date(fin.value.getTime() - DAY_MS))}`
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})

const hora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' })
const diaCorto = new Intl.DateTimeFormat('es-AR', { weekday: 'short', day: 'numeric' })

const pendientes = computed(() => turnos.value.filter((t) => CONFIRMABLE.includes(t.status)).length)

async function cargar() {
  cargando.value = true
  error.value = ''

  try {
    turnos.value = await listTurnos({
      desde: inicio.value,
      hasta: fin.value,
      estado: filtroEstado.value,
      veterinario: filtroVet.value,
    })
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No fue posible obtener los turnos.'
  } finally {
    cargando.value = false
  }
}

function mover(pasos: number) {
  const dias = vista.value === 'dia' ? 1 : 7
  inicio.value = new Date(inicio.value.getTime() + pasos * dias * DAY_MS)
}

function mostrarFeedback(mensaje: string) {
  feedback.value = mensaje
  setTimeout(() => {
    if (feedback.value === mensaje) feedback.value = ''
  }, 5000)
}

async function confirmar(turno: Turno) {
  try {
    await confirmTurno(turno.id)
    mostrarFeedback(`Turno de ${turno.animal.name} confirmado.`)
    await cargar()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No fue posible confirmar el turno.'
  }
}

async function onCreado(turno: Turno) {
  nuevo.value = false
  mostrarFeedback(`Turno de ${turno.animal.name} creado.`)
  await cargar()
}

async function onAccion(_turno: Turno, mensaje: string) {
  accion.value = null
  mostrarFeedback(mensaje)
  await cargar()
}

watch([vista, inicio, filtroEstado, filtroVet], cargar)

onMounted(async () => {
  await cargar()
  try {
    vets.value = await listVets()
  } catch {
    // El filtro por veterinario queda vacío; la agenda igual se muestra.
  }
})
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-3xl text-brand-ink">Turnos</h1>
        <p class="mt-2 text-brand-inkSoft">
          {{ titulo }}<span v-if="pendientes"> · {{ pendientes }} por confirmar</span>
        </p>
      </div>
      <button type="button" class="btn-primary" @click="nuevo = true">Nuevo turno</button>
    </header>

    <div class="mt-7 flex flex-wrap items-center gap-2">
      <div class="flex overflow-hidden rounded-[3px] border border-brand-line" role="group" aria-label="Vista">
        <button
          v-for="v in [{ id: 'dia', label: 'Día' }, { id: 'semana', label: 'Semana' }] as const"
          :key="v.id"
          type="button"
          class="px-3 py-2 text-sm"
          :class="vista === v.id ? 'bg-brand-accentSoft text-brand-ink' : 'text-brand-inkSoft'"
          :aria-pressed="vista === v.id"
          @click="vista = v.id"
        >
          {{ v.label }}
        </button>
      </div>
      <button type="button" class="btn-outline !min-h-0 !py-2" aria-label="Anterior" @click="mover(-1)">←</button>
      <button type="button" class="btn-outline !min-h-0 !py-2" @click="inicio = startOfDay(new Date())">Hoy</button>
      <button type="button" class="btn-outline !min-h-0 !py-2" aria-label="Siguiente" @click="mover(1)">→</button>

      <select v-model="filtroEstado" class="field-input !w-auto" aria-label="Filtrar por estado">
        <option v-for="e in ESTADOS" :key="e.value" :value="e.value">{{ e.label }}</option>
      </select>
      <select v-model="filtroVet" class="field-input !w-auto" aria-label="Filtrar por veterinario">
        <option value="">Todos los veterinarios</option>
        <option v-for="v in vets" :key="v.id" :value="v.id">{{ v.fullName }}</option>
      </select>
    </div>

    <p v-if="feedback" class="mt-5 bg-brand-accentSoft px-4 py-3 text-sm text-brand-accentInk" role="status">
      {{ feedback }}
    </p>
    <p
      v-if="error"
      class="mt-5 border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
    </p>

    <div class="mt-5 overflow-x-auto border border-brand-line bg-brand-surface">
      <table class="w-full min-w-[860px] text-left text-sm">
        <thead class="text-xs text-brand-inkSoft">
          <tr>
            <th class="px-4 py-3 font-normal">{{ vista === 'dia' ? 'Hora' : 'Fecha' }}</th>
            <th class="px-4 py-3 font-normal">Paciente</th>
            <th class="px-4 py-3 font-normal">Motivo</th>
            <th class="px-4 py-3 font-normal">Veterinario</th>
            <th class="px-4 py-3 font-normal">Estado</th>
            <th class="px-4 py-3 font-normal"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in turnos" :key="t.id" class="border-t border-brand-line align-top text-brand-ink">
            <td class="whitespace-nowrap px-4 py-3.5">
              <span v-if="vista === 'semana'" class="block text-xs text-brand-inkSoft">
                {{ diaCorto.format(new Date(t.dateTime)) }}
              </span>
              {{ hora.format(new Date(t.dateTime)) }}
            </td>
            <td class="px-4 py-3.5">
              <RouterLink :to="{ name: 'admin-ficha', params: { id: t.animal.id } }" class="hover:underline">
                {{ t.animal.name }}
              </RouterLink>
              <RouterLink
                :to="{ name: 'admin-tutor', params: { id: t.tutor.id } }"
                class="mt-0.5 block text-xs text-brand-inkSoft hover:underline"
              >
                {{ t.tutor.fullName }}
              </RouterLink>
            </td>
            <td class="px-4 py-3.5">
              {{ t.reason ?? '—' }}
              <span v-if="t.modality === 'RURAL'" class="mt-0.5 block text-xs text-brand-inkSoft">Visita rural</span>
              <span v-if="t.cancellationReason" class="mt-0.5 block text-xs text-brand-dangerInk">
                {{ t.cancellationReason }}
              </span>
            </td>
            <td class="px-4 py-3.5">{{ t.vet?.fullName ?? 'Sin asignar' }}</td>
            <td class="px-4 py-3.5"><EstadoTurnoBadge :estado="t.status" /></td>
            <td class="px-4 py-3.5">
              <div v-if="MODIFICABLE.includes(t.status)" class="flex justify-end gap-1.5">
                <button
                  v-if="CONFIRMABLE.includes(t.status)"
                  type="button"
                  class="rounded-md border border-brand-accent bg-brand-accentSoft px-2.5 py-1 text-xs text-brand-accentInk hover:opacity-80"
                  @click="confirmar(t)"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  class="rounded-md border border-brand-line px-2.5 py-1 text-xs text-brand-inkSoft hover:text-brand-ink"
                  @click="accion = { turno: t, tipo: 'reprogramar' }"
                >
                  Reprogramar
                </button>
                <button
                  type="button"
                  class="rounded-md border border-brand-dangerLine bg-brand-dangerSoft px-2.5 py-1 text-xs text-brand-dangerInk hover:opacity-80"
                  @click="accion = { turno: t, tipo: 'cancelar' }"
                >
                  Cancelar
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="cargando && !turnos.length" class="px-5 py-6 text-center text-sm text-brand-inkSoft">Cargando turnos...</p>
      <p v-else-if="!turnos.length && !error" class="px-5 py-6 text-center text-sm text-brand-inkSoft">
        No hay turnos en este período.
      </p>
    </div>

    <NuevoTurnoModal v-if="nuevo" @close="nuevo = false" @created="onCreado" />
    <TurnoAccionModal
      v-if="accion"
      :turno="accion.turno"
      :accion="accion.tipo"
      :vets="vets"
      @close="accion = null"
      @done="onAccion"
    />
  </div>
</template>
