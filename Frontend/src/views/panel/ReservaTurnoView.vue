<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import BaseModal from '@/components/admin/BaseModal.vue'
import { motivosTurno } from '@/data/motivosTurno'
import {
  getDisponibilidad,
  listMisTurnos,
  listVeterinariosParaReserva,
  solicitarTurno,
  type DiaDisponible,
  type HorarioDisponible,
} from '@/services/reservas'
import { listMisAnimales, type AnimalPropio } from '@/services/animales'
import {
  rescheduleMyTurno,
  type EstadoTurno,
  type ModalidadTurno,
  type Turno,
  type Veterinario,
} from '@/services/turnos'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const route = useRoute()
const router = useRouter()
const modality = ref<ModalidadTurno | ''>('')
const animals = ref<AnimalPropio[]>([])
const ownerTurnos = ref<Turno[]>([])
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
const reschedulingTurn = ref<Turno | null>(null)
const duplicateTurn = ref<Turno | null>(null)
const showDuplicateDialog = ref(false)
const showMissingPetDialog = ref(false)
const availabilitySection = ref<HTMLElement | null>(null)
const slotsSection = ref<HTMLElement | null>(null)
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
const petRegistrationRoute = computed(() => ({
  name: 'panel-animal-nuevo',
  query: session.isRuralClient ? { tipo: 'URBANO' } : undefined,
}))
const activeAppointmentStatuses: EstadoTurno[] = [
  'PENDIENTE',
  'PENDIENTE_PAGO',
  'CONFIRMADO',
  'REPROGRAMADO',
]
const hasUpcomingAppointment = (turno: Turno) =>
  activeAppointmentStatuses.includes(turno.status) &&
  new Date(turno.dateTime).getTime() > Date.now()
const reservedTurnForAnimal = computed(() => {
  if (!animalId.value || reschedulingTurn.value) return null
  return (
    ownerTurnos.value.find(
      (turno) => turno.animal.id === animalId.value && hasUpcomingAppointment(turno),
    ) ?? null
  )
})
const hasRuralLots = computed(() =>
  animals.value.some((animal) => animal.modality === 'RURAL' && animal.farmId !== null),
)
const reasonOptions = computed(() => (modality.value ? motivosTurno[modality.value] : []))
const selectedReasonOption = computed(() =>
  reasonOptions.value.find((option) => option.id === selectedReason.value),
)
const eligibleAnimals = computed(() =>
  animals.value.filter((animal) =>
    animal.id === reschedulingTurn.value?.animal.id
      ? animal.modality === modality.value
      : reschedulingTurn.value
        ? false
        : modality.value === 'RURAL'
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
const consultationComplete = computed(() =>
  Boolean(
    modality.value && animalId.value && (reschedulingTurn.value || selectedReasonOption.value),
  ),
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

function preserveAvailabilityPosition(sectionTop?: number) {
  if (sectionTop === undefined || !availabilitySection.value) return
  const topDifference = availabilitySection.value.getBoundingClientRect().top - sectionTop
  if (topDifference) window.scrollBy(0, topDifference)
}

async function loadAvailability(sectionTop?: number) {
  const requestId = ++availabilityRequest
  selectedDate.value = ''
  selectedSlot.value = null

  if (!modality.value || reservedTurnForAnimal.value) {
    availability.value = []
    loadingAvailability.value = false
    return
  }

  loadingAvailability.value = true
  error.value = ''
  await nextTick()
  preserveAvailabilityPosition(sectionTop)

  try {
    const days = await getDisponibilidad({
      desde: monthStart.value,
      hasta: nextMonthStart.value,
      modalidad: modality.value,
      idVeterinario: preferredVetId.value,
    })
    if (requestId === availabilityRequest) {
      availability.value = days
      await nextTick()
      preserveAvailabilityPosition(sectionTop)
    }
  } catch (cause) {
    if (requestId === availabilityRequest) {
      error.value =
        cause instanceof Error ? cause.message : 'No fue posible consultar la disponibilidad.'
      availability.value = []
      await nextTick()
      preserveAvailabilityPosition(sectionTop)
    }
  } finally {
    if (requestId === availabilityRequest) loadingAvailability.value = false
  }
}

function changeMonth(offset: number) {
  const sectionTop = availabilitySection.value?.getBoundingClientRect().top
  const next = new Date(currentMonth.value)
  next.setMonth(next.getMonth() + offset)
  currentMonth.value = firstOfMonth(next)
  void loadAvailability(sectionTop)
}

async function scrollToSection(section: 'availability' | 'slots') {
  await nextTick()
  const target = section === 'availability' ? availabilitySection.value : slotsSection.value
  target?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function selectDay(day: DiaDisponible) {
  if (day.lleno || day.fecha < today || loadingAvailability.value) return
  selectedDate.value = day.fecha
  selectedSlot.value = null
  error.value = ''
  void scrollToSection('slots')
}

function selectSlot(slot: HorarioDisponible) {
  selectedSlot.value = slot
  error.value = ''
}

async function submitBooking() {
  if (reservedTurnForAnimal.value) {
    duplicateTurn.value = reservedTurnForAnimal.value
    showDuplicateDialog.value = true
    return
  }

  if (!modality.value || !animalId.value || !selectedDay.value || !selectedSlot.value) {
    error.value = 'Seleccioná el paciente, el día y un horario disponible.'
    return
  }
  if (!reschedulingTurn.value && !selectedReasonOption.value) {
    error.value = 'Seleccioná el motivo de la consulta.'
    return
  }

  booking.value = true
  error.value = ''
  try {
    if (reschedulingTurn.value) {
      await rescheduleMyTurno(reschedulingTurn.value.id, selectedSlot.value.fechaHora)
      await router.replace({ name: 'panel-turnos', query: { actualizado: 'reprogramado' } })
      return
    }

    if (!selectedReasonOption.value) {
      error.value = 'Seleccioná el motivo de la consulta.'
      return
    }

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
    const bookingError =
      cause instanceof Error ? cause.message : 'No fue posible enviar la solicitud de turno.'
    const duplicateConflict = bookingError.includes('ya tiene un turno reservado')
    let turnosRefreshError = ''
    if (duplicateConflict) {
      try {
        ownerTurnos.value = await listMisTurnos()
      } catch (refreshError) {
        turnosRefreshError =
          refreshError instanceof Error
            ? refreshError.message
            : 'No fue posible actualizar la lista de turnos.'
      }
      duplicateTurn.value = reservedTurnForAnimal.value
      showDuplicateDialog.value = true
    }
    await loadAvailability()
    if (duplicateConflict) {
      error.value = turnosRefreshError ? `${bookingError} ${turnosRefreshError}` : ''
    } else {
      error.value = error.value ? `${bookingError} ${error.value}` : bookingError
    }
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
    const [ownAnimals, ownTurnos] = await Promise.all([listMisAnimales(), listMisTurnos()])
    animals.value = ownAnimals
    ownerTurnos.value = ownTurnos
    const requestedModality = route.query.modalidad
    if (requestedModality === 'URBANO' || requestedModality === 'RURAL') {
      modality.value = requestedModality
    } else if (isUrbanClient.value || !hasRuralLots.value) {
      modality.value = 'URBANO'
    }
    if (
      !animals.value.some((animal) => animal.modality === 'URBANO') &&
      (isUrbanClient.value || !hasRuralLots.value)
    ) {
      showMissingPetDialog.value = true
    }
    if (!animals.value.length) return

    vets.value = await listVeterinariosParaReserva()
    const rescheduleId = route.query.reprogramar
    if (typeof rescheduleId === 'string') {
      const target = ownTurnos.find(
        (turno) => turno.id === rescheduleId && hasUpcomingAppointment(turno),
      )
      if (!target || !target.vet) {
        error.value = 'No encontramos un turno futuro que puedas reprogramar.'
        return
      }

      reschedulingTurn.value = target
      modality.value = target.modality
      await nextTick()
      animalId.value = target.animal.id
      preferredVetId.value = target.vet.id
      selectedReason.value = target.reasonCategory ?? ''
      return
    }
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

watch([modality, loadingSetup], ([currentModality, isLoading]) => {
  if (
    !isLoading &&
    currentModality === 'URBANO' &&
    !animals.value.some((animal) => animal.modality === 'URBANO')
  ) {
    showMissingPetDialog.value = true
  }
})

watch(animalId, () => {
  selectedDate.value = ''
  selectedSlot.value = null
  duplicateTurn.value = reservedTurnForAnimal.value
  showDuplicateDialog.value = duplicateTurn.value !== null
  if (duplicateTurn.value) {
    availability.value = []
    availabilityRequest += 1
    loadingAvailability.value = false
  }
})

watch(reservedTurnForAnimal, (turno) => {
  if (turno) {
    duplicateTurn.value = turno
    showDuplicateDialog.value = true
  }
})

watch(consultationComplete, (complete) => {
  if (complete) void scrollToSection('availability')
})

watch([modality, preferredVetId], () => {
  void loadAvailability()
})
</script>

<template>
  <div class="mx-auto max-w-4xl text-brand-ink">
    <header class="mb-8">
      <h1 class="font-serif text-3xl">
        {{ reschedulingTurn ? 'Cambiar fecha y horario' : 'Reservar turno' }}
      </h1>
      <p class="mt-2 text-sm text-brand-inkSoft">
        {{
          reschedulingTurn
            ? `Elegí un nuevo horario para ${reschedulingTurn.animal.name}.`
            : 'Elegí primero la modalidad de atención; luego vas a poder seleccionar el paciente y un horario disponible.'
        }}
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
      v-if="!loadingSetup && !error && !animals.length"
      class="mb-6 rounded-lg border border-brand-accent bg-brand-accentSoft p-6 text-brand-accentInk"
      role="status"
    >
      <h2 class="text-lg font-semibold">
        {{
          session.isRuralClient ? 'Registrá tus primeros pacientes' : 'Registrá tu primera mascota'
        }}
      </h2>
      <p class="mt-2 text-sm">
        {{
          session.isRuralClient
            ? 'Para reservar en consultorio registrá una mascota; para solicitar una visita rural, registrá un lote.'
            : 'Para solicitar un turno necesitamos que registres una mascota.'
        }}
      </p>
      <div class="mt-4 flex flex-wrap gap-3">
        <RouterLink :to="petRegistrationRoute" class="btn-primary inline-flex">
          Registrar mascota
        </RouterLink>
        <RouterLink
          v-if="session.isRuralClient"
          :to="{ name: 'panel-animal-nuevo' }"
          class="btn-outline"
        >
          Registrar lote
        </RouterLink>
      </div>
    </section>

    <section
      v-if="animals.length && confirmedTurn"
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

    <div v-else-if="!loadingSetup && animals.length" class="space-y-6">
      <section class="rounded-lg border border-brand-line bg-brand-surface p-5 shadow-sm">
        <h2 class="text-base font-semibold text-brand-accentInk">1. Datos de la consulta</h2>
        <div v-if="loadingSetup" class="mt-4 text-sm text-brand-inkSoft">Cargando tus datos...</div>
        <div v-else class="mt-4 grid gap-4 sm:grid-cols-2">
          <label
            v-if="!reschedulingTurn && !isUrbanClient && hasRuralLots"
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
              :disabled="!modality || Boolean(reschedulingTurn)"
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

          <label
            v-if="!reschedulingTurn"
            class="text-xs font-medium text-brand-inkSoft sm:col-span-2"
          >
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
        <p v-if="modality && !eligibleAnimals.length" class="mt-3 text-sm text-brand-warnInk">
          {{
            modality === 'RURAL'
              ? 'No tenés animales o lotes rurales registrados para reservar una visita a campo.'
              : 'No tenés pacientes urbanos registrados para reservar en consultorio.'
          }}
          <button
            v-if="modality === 'URBANO'"
            type="button"
            class="ml-1 font-semibold underline underline-offset-2"
            @click="showMissingPetDialog = true"
          >
            Ver cómo registrar una mascota
          </button>
        </p>
      </section>

      <section
        v-if="modality && eligibleAnimals.length && !reservedTurnForAnimal"
        ref="availabilitySection"
        class="scroll-mt-6 rounded-lg border border-brand-line bg-brand-surface p-5 shadow-sm"
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

        <div class="mt-4 min-h-5" aria-live="polite">
          <p v-if="loadingAvailability" class="text-sm text-brand-inkSoft" role="status">
            Consultando disponibilidad...
          </p>
        </div>
        <div :aria-busy="loadingAvailability" :inert="loadingAvailability" class="mt-1">
          <div class="grid grid-cols-7 gap-2 text-center text-xs text-brand-inkSoft">
            <span v-for="day in weekdays" :key="day" class="py-2">{{ day }}</span>
          </div>
          <div class="grid grid-cols-7 gap-2">
            <template v-for="(day, index) in calendarDays" :key="day?.fecha ?? `blank-${index}`">
              <span v-if="!day" aria-hidden="true" />
              <button
                v-else
                type="button"
                :disabled="loadingAvailability || day.lleno || day.fecha < today"
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
                  {{
                    loadingAvailability
                      ? 'Consultando'
                      : day.lleno
                        ? 'Lleno'
                        : `${day.horarios.length} horarios`
                  }}
                </span>
              </button>
            </template>
          </div>
        </div>
      </section>

      <section
        v-if="selectedDay && !reservedTurnForAnimal"
        ref="slotsSection"
        class="scroll-mt-6 rounded-lg border border-brand-line bg-brand-surface p-5 shadow-sm"
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

        <p
          v-if="notice"
          class="mt-5 rounded border border-brand-accent bg-brand-accentSoft p-3 text-sm text-brand-accentInk"
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
            (!reschedulingTurn && !selectedReasonOption) ||
            !selectedSlot
          "
          class="btn-primary mt-5 w-full disabled:cursor-not-allowed disabled:opacity-50"
          @click="submitBooking"
        >
          {{
            booking
              ? reschedulingTurn
                ? 'Guardando cambio...'
                : 'Enviando solicitud...'
              : reschedulingTurn
                ? 'Confirmar nuevo horario'
                : 'Solicitar turno'
          }}
        </button>
      </section>
    </div>

    <BaseModal
      v-if="showDuplicateDialog"
      title="Mascota con turno reservado"
      :subtitle="
        duplicateTurn
          ? `${duplicateTurn.animal.name} · ${displayDate.format(new Date(duplicateTurn.dateTime))}`
          : undefined
      "
      @close="showDuplicateDialog = false"
    >
      <p class="text-sm text-brand-inkSoft">
        Tu mascota ya tiene un turno reservado. Para evitar duplicados, primero cambiá la fecha y el
        horario o cancelalo desde
        <RouterLink
          :to="{ name: 'panel-turnos' }"
          class="font-semibold text-brand-accentInk underline underline-offset-2"
          @click="showDuplicateDialog = false"
        >
          Mis turnos </RouterLink
        >.
      </p>
    </BaseModal>

    <BaseModal
      v-if="showMissingPetDialog"
      title="Registrá una mascota para reservar"
      @close="showMissingPetDialog = false"
    >
      <p class="text-sm text-brand-inkSoft">
        {{
          session.isRuralClient
            ? 'Todavía no tenés mascotas urbanas registradas. Para pedir un turno de consultorio, primero agregá tu mascota; tus lotes rurales siguen disponibles para visitas a campo.'
            : 'Todavía no tenés mascotas registradas. Agregá los datos de tu mascota para poder elegirla al solicitar un turno.'
        }}
      </p>
      <div class="mt-5 flex flex-wrap justify-end gap-3">
        <button type="button" class="btn-outline" @click="showMissingPetDialog = false">
          Ahora no
        </button>
        <RouterLink
          :to="petRegistrationRoute"
          class="btn-primary"
          @click="showMissingPetDialog = false"
        >
          Registrar mascota
        </RouterLink>
      </div>
    </BaseModal>
  </div>
</template>
