<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { motivosTurno } from '@/data/motivosTurno'
import {
  getDisponibilidad,
  listVeterinariosParaReserva,
  solicitarTurno,
  type DiaDisponible,
  type HorarioDisponible,
} from '@/services/reservas'
import { listMisAnimales, type AnimalPropio } from '@/services/animales'
import type { ModalidadTurno, Turno, Veterinario } from '@/services/turnos'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const modality = ref<ModalidadTurno | ''>('')
const animals = ref<AnimalPropio[]>([])
const vets = ref<Veterinario[]>([])
const availability = ref<DiaDisponible[]>([])
const animalId = ref('')
const preferredVetId = ref('')
const selectedDate = ref('')
const selectedSlot = ref<HorarioDisponible | null>(null)
const selectedReason = ref('')
const currentMonth = ref(firstOfMonth(new Date()))
const booking = ref(false)
const loadingSetup = ref(true)
const loadingAvailability = ref(false)
const error = ref('')
const notice = ref('')
const confirmedTurn = ref<Turno | null>(null)
let availabilityRequest = 0

function firstOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function localDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const monthStart = computed(() => localDate(currentMonth.value))
const nextMonthStart = computed(() => {
  const date = new Date(currentMonth.value.getFullYear(), currentMonth.value.getMonth() + 1, 1)
  return localDate(date)
})
const monthLabel = computed(() =>
  new Intl.DateTimeFormat('es-AR', { month: 'long', year: 'numeric' }).format(currentMonth.value),
)
const today = localDate(new Date())
const isCurrentMonth = computed(() => monthStart.value === localDate(firstOfMonth(new Date())))
const isUrbanClient = computed(() => session.user?.tipoAtencion === 'URBANO')
const hasRuralLots = computed(() =>
  animals.value.some((animal) => animal.modality === 'RURAL' && animal.farmId !== null),
)
const reasonOptions = computed(() => (modality.value ? motivosTurno[modality.value] : []))
const selectedReasonOption = computed(() =>
  reasonOptions.value.find((option) => option.id === selectedReason.value),
)
const eligibleAnimals = computed(() =>
  animals.value.filter((animal) =>
    modality.value === 'RURAL'
      ? animal.modality === 'RURAL' && animal.farmId !== null
      : animal.modality === 'URBANO',
  ),
)
const daysByDate = computed(() => new Map(availability.value.map((day) => [day.fecha, day])))
const calendarDays = computed(() => {
  const offset = new Date(`${monthStart.value}T00:00:00`).getDay()
  const daysInMonth = new Date(
    currentMonth.value.getFullYear(),
    currentMonth.value.getMonth() + 1,
    0,
  ).getDate()
  return [
    ...Array.from({ length: offset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, index) => {
      const date = new Date(
        currentMonth.value.getFullYear(),
        currentMonth.value.getMonth(),
        index + 1,
      )
      return (
        daysByDate.value.get(localDate(date)) ?? {
          fecha: localDate(date),
          lleno: true,
          horarios: [],
        }
      )
    }),
  ]
})
const selectedDay = computed(
  () => availability.value.find((day) => day.fecha === selectedDate.value) ?? null,
)
const weekdays = ['Do', 'Lu', 'Ma', 'Mi', 'Ju', 'Vi', 'Sá']
const displayDate = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'full',
  timeZone: 'America/Argentina/Buenos_Aires',
})
const displayTime = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Argentina/Buenos_Aires',
})

async function loadAvailability() {
  const requestId = ++availabilityRequest
  selectedDate.value = ''
  selectedSlot.value = null

  if (!modality.value) {
    availability.value = []
    loadingAvailability.value = false
    return
  }

  loadingAvailability.value = true
  error.value = ''

  try {
    const days = await getDisponibilidad({
      desde: monthStart.value,
      hasta: nextMonthStart.value,
      modalidad: modality.value,
      idVeterinario: preferredVetId.value,
    })
    if (requestId === availabilityRequest) availability.value = days
  } catch (cause) {
    if (requestId === availabilityRequest) {
      error.value =
        cause instanceof Error ? cause.message : 'No fue posible consultar la disponibilidad.'
      availability.value = []
    }
  } finally {
    if (requestId === availabilityRequest) loadingAvailability.value = false
  }
}

function changeMonth(offset: number) {
  const next = new Date(currentMonth.value)
  next.setMonth(next.getMonth() + offset)
  currentMonth.value = firstOfMonth(next)
}

function selectDay(day: DiaDisponible) {
  if (day.lleno || day.fecha < today || loadingAvailability.value) return
  selectedDate.value = day.fecha
  selectedSlot.value = null
  error.value = ''
}

function selectSlot(slot: HorarioDisponible) {
  selectedSlot.value = slot
  error.value = ''
}

async function submitBooking() {
  if (!modality.value || !animalId.value || !selectedDay.value || !selectedSlot.value) {
    error.value = 'Seleccioná el paciente, el día y un horario disponible.'
    return
  }
  if (!selectedReasonOption.value) {
    error.value = 'Seleccioná el motivo de la consulta.'
    return
  }

  booking.value = true
  error.value = ''
  try {
    confirmedTurn.value = await solicitarTurno({
      id_animal: animalId.value,
      id_veterinario: preferredVetId.value || null,
      fecha_hora: selectedSlot.value.fechaHora,
      modalidad: modality.value,
      motivo_consulta: `${selectedReasonOption.value.id} - ${selectedReasonOption.value.label}`,
      motivo_categoria: selectedReasonOption.value.id,
      motivo_detalle: '',
      duracion_minutos: selectedSlot.value.duracionMinutos,
    })
    notice.value = ''
    await loadAvailability()
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : 'No fue posible enviar la solicitud de turno.'
    await loadAvailability()
  } finally {
    booking.value = false
  }
}

function resetForm() {
  confirmedTurn.value = null
  modality.value = isUrbanClient.value || !hasRuralLots.value ? 'URBANO' : ''
  animalId.value = ''
  selectedReason.value = ''
  selectedDate.value = ''
  selectedSlot.value = null
}

onMounted(async () => {
  loadingSetup.value = true
  if (isUrbanClient.value) modality.value = 'URBANO'

  try {
    const [ownAnimals, availableVets] = await Promise.all([
      listMisAnimales(),
      listVeterinariosParaReserva(),
    ])
    animals.value = ownAnimals
    vets.value = availableVets
    if (isUrbanClient.value || !hasRuralLots.value) modality.value = 'URBANO'
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : 'No fue posible cargar tus datos para reservar.'
  } finally {
    loadingSetup.value = false
  }
})

watch(modality, () => {
  animalId.value = ''
  selectedReason.value = ''
})

watch([modality, preferredVetId, currentMonth], () => {
  void loadAvailability()
})
</script>

<template>
  <div class="mx-auto max-w-4xl text-brand-ink">
    <header class="mb-8">
      <h1 class="font-serif text-3xl">Reservar turno</h1>
      <p class="mt-2 text-sm text-brand-inkSoft">
        Elegí primero la modalidad de atención; luego vas a poder seleccionar el paciente y un
        horario disponible.
      </p>
    </header>

    <p
      v-if="error"
      class="mb-5 rounded border border-brand-dangerLine bg-brand-dangerSoft p-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
    </p>

    <section
      v-if="confirmedTurn"
      class="rounded-lg border border-brand-accent bg-brand-accentSoft p-6 text-brand-accentInk"
      role="status"
    >
      <h2 class="text-xl font-semibold">Solicitud de turno enviada</h2>
      <p class="mt-2 text-sm">
        {{ displayDate.format(new Date(confirmedTurn.dateTime)) }} a las
        {{ displayTime.format(new Date(confirmedTurn.dateTime)) }} ·
        {{ confirmedTurn.modality === 'RURAL' ? 'Visita rural' : 'Consultorio' }}
      </p>
      <p class="mt-3 text-sm">
        La solicitud quedó pendiente de aceptación. El equipo veterinario o administrativo
        confirmará el turno.
        <span v-if="confirmedTurn.vet"> Profesional: {{ confirmedTurn.vet.fullName }}.</span>
      </p>
      <button type="button" class="btn-primary mt-5" @click="resetForm">Reservar otro turno</button>
    </section>

    <div v-else class="space-y-6">
      <section class="rounded-lg border border-brand-line bg-brand-surface p-5 shadow-sm">
        <h2 class="text-base font-semibold text-brand-accentInk">1. Datos de la consulta</h2>
        <div v-if="loadingSetup" class="mt-4 text-sm text-brand-inkSoft">Cargando tus datos...</div>
        <div v-else class="mt-4 grid gap-4 sm:grid-cols-2">
          <label
            v-if="!isUrbanClient && hasRuralLots"
            class="text-xs font-medium text-brand-inkSoft"
          >
            Modalidad de atención
            <select
              v-model="modality"
              class="mt-1 w-full rounded border border-brand-line bg-brand-bg p-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent"
              required
            >
              <option value="" disabled>Seleccioná una modalidad</option>
              <option value="URBANO">Consultorio (urbano)</option>
              <option value="RURAL">Visita a campo (rural)</option>
            </select>
          </label>

          <label class="text-xs font-medium text-brand-inkSoft">
            Paciente
            <select
              v-model="animalId"
              :disabled="!modality"
              class="mt-1 w-full rounded border border-brand-line bg-brand-bg p-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent"
              required
            >
              <option value="">
                {{
                  !modality
                    ? 'Primero seleccioná la modalidad'
                    : modality === 'RURAL'
                      ? 'Seleccioná un lote'
                      : 'Seleccioná una mascota'
                }}
              </option>
              <option v-for="animal in eligibleAnimals" :key="animal.id" :value="animal.id">
                {{ animal.name }} · {{ animal.species }}
              </option>
            </select>
          </label>

          <label class="text-xs font-medium text-brand-inkSoft sm:col-span-2">
            Veterinario de preferencia
            <select
              v-model="preferredVetId"
              :disabled="!modality"
              class="mt-1 w-full rounded border border-brand-line bg-brand-bg p-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent"
            >
              <option value="">Cualquier veterinario disponible</option>
              <option v-for="vet in vets" :key="vet.id" :value="vet.id">{{ vet.fullName }}</option>
            </select>
          </label>

          <label class="text-xs font-medium text-brand-inkSoft sm:col-span-2">
            Motivo de consulta
            <select
              v-model="selectedReason"
              :disabled="!modality"
              class="mt-1 w-full rounded border border-brand-line bg-brand-bg p-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent"
              required
            >
              <option value="" disabled>Seleccioná un motivo</option>
              <option v-for="option in reasonOptions" :key="option.id" :value="option.id">
                {{ option.label }}
              </option>
            </select>
          </label>
        </div>
        <p
          v-if="modality && !eligibleAnimals.length"
          class="mt-3 text-sm text-brand-warnInk"
        >
          {{
            modality === 'RURAL'
              ? 'No tenés animales o lotes rurales registrados para reservar una visita a campo.'
              : 'No tenés pacientes urbanos registrados para reservar en consultorio.'
          }}
        </p>
      </section>

      <section
        v-if="modality"
        class="rounded-lg border border-brand-line bg-brand-surface p-5 shadow-sm"
      >
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-brand-accentInk">2. Elegí un día disponible</h2>
            <p class="mt-1 text-xs text-brand-inkSoft">
              Los días sin horarios libres no se pueden seleccionar.
            </p>
          </div>
          <div class="flex items-center gap-2">
            <button
              type="button"
              class="btn-outline min-h-0! px-3! py-2!"
              aria-label="Mes anterior"
              :disabled="isCurrentMonth"
              @click="changeMonth(-1)"
            >
              ←
            </button>
            <span class="min-w-36 text-center text-sm font-medium capitalize">{{
              monthLabel
            }}</span>
            <button
              type="button"
              class="btn-outline min-h-0! px-3! py-2!"
              aria-label="Mes siguiente"
              @click="changeMonth(1)"
            >
              →
            </button>
          </div>
        </div>

        <p v-if="loadingAvailability" class="mt-5 text-sm text-brand-inkSoft" role="status">
          Consultando disponibilidad...
        </p>
        <div v-else class="mt-5">
          <div class="grid grid-cols-7 gap-2 text-center text-xs text-brand-inkSoft">
            <span v-for="day in weekdays" :key="day" class="py-2">{{ day }}</span>
          </div>
          <div class="grid grid-cols-7 gap-2">
            <template v-for="(day, index) in calendarDays" :key="day?.fecha ?? `blank-${index}`">
              <span v-if="!day" aria-hidden="true" />
              <button
                v-else
                type="button"
                :disabled="day.lleno || day.fecha < today"
                :aria-pressed="selectedDate === day.fecha"
                class="flex min-h-16 flex-col items-center justify-center rounded border p-1 transition"
                :class="
                  selectedDate === day.fecha
                    ? 'border-brand-accent bg-brand-accent text-white'
                    : day.lleno || day.fecha < today
                      ? 'cursor-not-allowed border-brand-line bg-brand-muted text-brand-inkSoft opacity-60'
                      : 'border-brand-line bg-brand-bg text-brand-ink hover:border-brand-accent hover:bg-brand-accentSoft'
                "
                @click="selectDay(day)"
              >
                <span class="text-sm font-semibold">{{ Number(day.fecha.slice(-2)) }}</span>
                <span class="text-[10px]">
                  {{ day.lleno ? 'Lleno' : `${day.horarios.length} horarios` }}
                </span>
              </button>
            </template>
          </div>
        </div>
      </section>

      <section
        v-if="selectedDay"
        class="rounded-lg border border-brand-line bg-brand-surface p-5 shadow-sm"
      >
        <h2 class="text-base font-semibold text-brand-accentInk">
          3. Horarios del {{ displayDate.format(new Date(`${selectedDay.fecha}T12:00:00-03:00`)) }}
        </h2>
        <div class="mt-4 flex flex-wrap gap-3">
          <button
            v-for="slot in selectedDay.horarios"
            :key="`${slot.fechaHora}-${slot.duracionMinutos}`"
            type="button"
            :aria-pressed="selectedSlot?.fechaHora === slot.fechaHora"
            class="rounded border px-4 py-2 text-sm font-medium transition"
            :class="
              selectedSlot?.fechaHora === slot.fechaHora
                ? 'border-brand-accent bg-brand-accent text-white'
                : 'border-brand-line bg-brand-bg text-brand-ink hover:border-brand-accent'
            "
            @click="selectSlot(slot)"
          >
            {{ displayTime.format(new Date(slot.fechaHora)) }}
            <span v-if="modality === 'RURAL'"> · {{ slot.duracionMinutos / 60 }} h</span>
            <span v-if="slot.nombreVeterinario"> · {{ slot.nombreVeterinario }}</span>
          </button>
        </div>
        <p v-if="!selectedDay.horarios.length" class="mt-3 text-sm text-brand-inkSoft">
          No quedan horarios para este día.
        </p>
      </section>

      <p
        v-if="notice"
        class="rounded border border-brand-accent bg-brand-accentSoft p-3 text-sm text-brand-accentInk"
        role="status"
      >
        {{ notice }}
      </p>

      <button
        type="button"
        :disabled="
          loadingSetup ||
          booking ||
          !modality ||
          !animalId ||
          !selectedReasonOption ||
          !selectedSlot
        "
        class="btn-primary w-full disabled:cursor-not-allowed disabled:opacity-50"
        @click="submitBooking"
      >
        {{ booking ? 'Enviando solicitud...' : 'Solicitar turno' }}
      </button>
    </div>
  </div>
</template>
