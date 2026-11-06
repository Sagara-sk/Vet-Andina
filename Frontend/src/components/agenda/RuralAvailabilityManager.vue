<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useSessionStore } from '@/stores/session'
import {
  createAgendaHoliday,
  createRuralAvailability,
  deleteAgendaHoliday,
  deleteRuralAvailability,
  listAgendaHolidays,
  listRuralAvailability,
  listVeterinariosParaReserva,
} from '@/services/reservas'
import type { Veterinario } from '@/services/turnos'

const session = useSessionStore()
const vets = ref<Veterinario[]>([])
const slots = ref<
  { id: string; vetId: string; vetName: string; dateTime: string; durationMinutes: number }[]
>([])
const holidays = ref<{ date: string; reason: string }[]>([])
const loading = ref(false)
const saving = ref(false)
const error = ref('')
const notice = ref('')
const canSelectVet = computed(() => session.user?.rol !== 'VETERINARIO')

function localDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function localDateTime(date: Date): string {
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(date.getMinutes()).padStart(2, '0')
  return `${localDate(date)}T${hours}:${minutes}`
}

function startOfToday(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

const today = startOfToday()
const endDate = new Date(today)
endDate.setDate(endDate.getDate() + 60)
const form = reactive({
  vetId: session.user?.rol === 'VETERINARIO' ? (session.user.id ?? '') : '',
  dateTime: localDateTime(new Date(Date.now() + 60 * 60 * 1000)),
  durationMinutes: 120,
})
const holidayForm = reactive({ date: '', reason: '' })

const startDateString = localDate(today)
const endDateString = localDate(endDate)
const dateTimeMin = localDateTime(new Date())
const dateFormat = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'America/Argentina/Buenos_Aires',
})

async function loadSlots() {
  loading.value = true
  error.value = ''
  try {
    const [nextSlots, nextHolidays] = await Promise.all([
      listRuralAvailability({
        from: startDateString,
        to: endDateString,
        vetId: session.user?.rol === 'VETERINARIO' ? session.user.id : undefined,
      }),
      canSelectVet.value
        ? listAgendaHolidays({ from: startDateString, to: endDateString })
        : Promise.resolve([]),
    ])
    slots.value = nextSlots
    holidays.value = nextHolidays
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No fue posible cargar la hoja de ruta.'
  } finally {
    loading.value = false
  }
}

async function submit() {
  error.value = ''
  notice.value = ''
  saving.value = true
  try {
    await createRuralAvailability({
      vetId: canSelectVet.value ? form.vetId || null : (session.user?.id ?? null),
      dateTime: new Date(form.dateTime).toISOString(),
      durationMinutes: form.durationMinutes,
    })
    notice.value = 'Franja publicada en la hoja de ruta rural.'
    await loadSlots()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No fue posible publicar la franja.'
  } finally {
    saving.value = false
  }
}

async function removeSlot(id: string) {
  error.value = ''
  notice.value = ''
  try {
    await deleteRuralAvailability(id)
    notice.value = 'Franja eliminada.'
    await loadSlots()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No fue posible eliminar la franja.'
  }
}

async function submitHoliday() {
  error.value = ''
  notice.value = ''
  try {
    await createAgendaHoliday(holidayForm.date, holidayForm.reason.trim())
    holidayForm.date = ''
    holidayForm.reason = ''
    notice.value = 'El feriado quedó configurado como no laborable.'
    await loadSlots()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No fue posible configurar el feriado.'
  }
}

async function removeHoliday(date: string) {
  error.value = ''
  notice.value = ''
  try {
    await deleteAgendaHoliday(date)
    notice.value = 'El feriado se quitó de la agenda.'
    await loadSlots()
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No fue posible quitar el feriado.'
  }
}

onMounted(async () => {
  await loadSlots()
  if (canSelectVet.value) {
    try {
      vets.value = await listVeterinariosParaReserva()
    } catch (cause) {
      error.value =
        cause instanceof Error ? cause.message : 'No fue posible cargar los veterinarios.'
    }
  }
})
</script>

<template>
  <section class="rounded border border-brand-line bg-brand-surface p-5 text-brand-ink">
    <header>
      <h2 class="text-base font-semibold">Hoja de ruta rural</h2>
      <p class="mt-1 text-sm text-brand-inkSoft">
        Publicá bloques de 1 a 2 horas. Solo aparecerán para reservar los bloques previamente
        cargados y libres de superposición.
      </p>
    </header>

    <form class="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_160px_auto]" @submit.prevent="submit">
      <label v-if="canSelectVet" class="text-xs text-brand-inkSoft">
        Veterinario
        <select
          v-model="form.vetId"
          class="mt-1 w-full rounded border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-ink"
          required
        >
          <option value="">Seleccioná un profesional</option>
          <option v-for="vet in vets" :key="vet.id" :value="vet.id">{{ vet.fullName }}</option>
        </select>
      </label>
      <label class="text-xs text-brand-inkSoft">
        Inicio de ruta
        <input
          v-model="form.dateTime"
          type="datetime-local"
          :min="dateTimeMin"
          class="mt-1 w-full rounded border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-ink"
          required
        />
      </label>
      <label class="text-xs text-brand-inkSoft">
        Duración
        <select
          v-model.number="form.durationMinutes"
          class="mt-1 w-full rounded border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-ink"
        >
          <option :value="60">1 hora</option>
          <option :value="90">1 hora y media</option>
          <option :value="120">2 horas</option>
        </select>
      </label>
      <button
        type="submit"
        class="btn-primary self-end disabled:cursor-wait disabled:opacity-60"
        :disabled="saving || (canSelectVet && !form.vetId)"
      >
        {{ saving ? 'Publicando...' : 'Publicar franja' }}
      </button>
    </form>

    <p
      v-if="notice"
      class="mt-4 rounded border border-brand-accent bg-brand-accentSoft px-3 py-2 text-sm text-brand-accentInk"
      role="status"
    >
      {{ notice }}
    </p>
    <p
      v-if="error"
      class="mt-4 rounded border border-brand-dangerLine bg-brand-dangerSoft px-3 py-2 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
    </p>

    <div class="mt-5">
      <h3 class="text-sm font-medium">Próximas franjas publicadas</h3>
      <p v-if="loading" class="mt-3 text-sm text-brand-inkSoft">Cargando hoja de ruta...</p>
      <p v-else-if="!slots.length" class="mt-3 text-sm text-brand-inkSoft">
        No hay franjas rurales publicadas para los próximos 60 días.
      </p>
      <ul v-else class="mt-3 divide-y divide-brand-line border-y border-brand-line">
        <li
          v-for="slot in slots"
          :key="slot.id"
          class="flex flex-wrap items-center justify-between gap-3 py-3 text-sm"
        >
          <span>
            {{ dateFormat.format(new Date(slot.dateTime)) }} · {{ slot.durationMinutes / 60 }} h
            <span v-if="canSelectVet" class="text-brand-inkSoft">· {{ slot.vetName }}</span>
          </span>
          <button
            type="button"
            class="rounded border border-brand-dangerLine px-3 py-1 text-xs text-brand-dangerInk hover:bg-brand-dangerSoft"
            @click="removeSlot(slot.id)"
          >
            Quitar
          </button>
        </li>
      </ul>
    </div>

    <div v-if="canSelectVet" class="mt-7 border-t border-brand-line pt-5">
      <h3 class="text-sm font-medium">Feriados no laborables</h3>
      <form class="mt-3 grid gap-3 md:grid-cols-[200px_1fr_auto]" @submit.prevent="submitHoliday">
        <label class="text-xs text-brand-inkSoft">
          Fecha
          <input
            v-model="holidayForm.date"
            type="date"
            :min="startDateString"
            :max="endDateString"
            class="mt-1 w-full rounded border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-ink"
            required
          />
        </label>
        <label class="text-xs text-brand-inkSoft">
          Motivo
          <input
            v-model="holidayForm.reason"
            type="text"
            minlength="2"
            maxlength="150"
            class="mt-1 w-full rounded border border-brand-line bg-brand-bg px-3 py-2 text-sm text-brand-ink"
            placeholder="Ej.: feriado nacional"
            required
          />
        </label>
        <button type="submit" class="btn-outline self-end min-h-0! py-2!">Agregar feriado</button>
      </form>

      <ul v-if="holidays.length" class="mt-3 divide-y divide-brand-line border-y border-brand-line">
        <li
          v-for="holiday in holidays"
          :key="holiday.date"
          class="flex items-center justify-between gap-3 py-2 text-sm"
        >
          <span>{{ holiday.date }} · {{ holiday.reason }}</span>
          <button
            type="button"
            class="text-xs text-brand-dangerInk underline"
            @click="removeHoliday(holiday.date)"
          >
            Quitar
          </button>
        </li>
      </ul>
      <p v-else class="mt-3 text-xs text-brand-inkSoft">
        No hay feriados configurados en este período.
      </p>
    </div>
  </section>
</template>
