<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import FullCalendar from '@fullcalendar/vue3'
import type {
  CalendarOptions,
  EventClickInfo,
  EventInput,
  EventSourceFuncInfo,
} from '@fullcalendar/vue3'
import classicThemePlugin from '@fullcalendar/vue3/themes/classic'
import dayGridPlugin from '@fullcalendar/vue3/daygrid'
import timeGridPlugin from '@fullcalendar/vue3/timegrid'
import listPlugin from '@fullcalendar/vue3/list'
import esLocale from '@fullcalendar/vue3/locales/es'
import '@fullcalendar/vue3/skeleton.css'
import '@fullcalendar/vue3/themes/classic/theme.css'
import EstadoTurnoBadge from '@/components/admin/EstadoTurnoBadge.vue'
import { motivosTurno } from '@/data/motivosTurno'
import type { Agenda, HojaDeRuta } from '@/services/agenda'
import type { Turno } from '@/services/turnos'

const props = defineProps<{
  // Obtiene la agenda del rango visible; cambiarla vuelve a pedir los eventos.
  fetchAgenda: (desde: Date, hasta: Date) => Promise<Agenda>
  // En la vista de administración se muestran varios veterinarios a la vez.
  mostrarVeterinario?: boolean
}>()

type Seleccion = { tipo: 'turno'; turno: Turno } | { tipo: 'hoja'; hoja: HojaDeRuta }

const error = ref('')
const cargando = ref(false)
const seleccion = ref<Seleccion | null>(null)

// Colores de cada tipo de evento con los tokens del tema; FullCalendar los
// aplica como variables CSS, así que cambian con el modo claro/oscuro.
const COLORES = {
  urbano: { color: 'var(--brand-accent-soft)', contrastColor: 'var(--brand-accent-ink)' },
  rural: { color: 'var(--brand-warn-soft)', contrastColor: 'var(--brand-warn-ink)' },
  hoja: { color: 'var(--brand-muted)', contrastColor: 'var(--brand-ink)' },
}

const MODALIDAD: Record<Turno['modality'], string> = {
  URBANO: 'Consultorio',
  RURAL: 'Rural',
}

const formatoFechaHora = new Intl.DateTimeFormat('es-AR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  hour: '2-digit',
  minute: '2-digit',
})
const formatoHora = new Intl.DateTimeFormat('es-AR', { hour: '2-digit', minute: '2-digit' })

// motivo_categoria guarda el id (ej. VACUNACION); se muestra su etiqueta. Los
// turnos anteriores a los motivos estructurados solo tienen el texto libre.
const ETIQUETAS_MOTIVO = new Map(
  [...motivosTurno.URBANO, ...motivosTurno.RURAL].map((opcion) => [opcion.id, opcion.label]),
)

function motivoDe(turno: Turno) {
  return (
    (turno.reasonCategory && ETIQUETAS_MOTIVO.get(turno.reasonCategory)) || turno.reason || 'Turno'
  )
}

function conVeterinario(titulo: string, vet: { fullName: string } | null) {
  return props.mostrarVeterinario && vet ? `${titulo} · ${vet.fullName}` : titulo
}

function turnoAEvento(turno: Turno): EventInput {
  const inicio = new Date(turno.dateTime)
  const fin = new Date(inicio.getTime() + turno.durationMinutes * 60_000)
  return {
    id: `turno-${turno.id}`,
    title: conVeterinario(`${turno.animal.name} · ${motivoDe(turno)}`, turno.vet),
    start: inicio,
    end: fin,
    ...(turno.modality === 'RURAL' ? COLORES.rural : COLORES.urbano),
    className: 'agenda-evento',
    extendedProps: { seleccion: { tipo: 'turno', turno } satisfies Seleccion },
  }
}

function hojaAEvento(hoja: HojaDeRuta): EventInput {
  return {
    id: `hoja-${hoja.id}`,
    title: conVeterinario(`Hoja de ruta${hoja.detail ? ` · ${hoja.detail}` : ''}`, hoja.vet),
    start: hoja.startsAt,
    end: hoja.endsAt,
    ...COLORES.hoja,
    className: 'agenda-evento',
    extendedProps: { seleccion: { tipo: 'hoja', hoja } satisfies Seleccion },
  }
}

// Celular: lista semanal; desde md (768px): grilla semanal. Se vuelve a evaluar
// al girar la pantalla o cambiar el tamaño de la ventana.
const VISTA_MOVIL = 'listWeek'
const VISTA_ESCRITORIO = 'timeGridWeek'
const consultaMovil =
  typeof window !== 'undefined' ? window.matchMedia?.('(max-width: 767px)') : undefined
const esMovil = consultaMovil?.matches ?? false
const calendario = ref<InstanceType<typeof FullCalendar> | null>(null)

function ajustarVista(evento: MediaQueryListEvent) {
  calendario.value?.getApi().changeView(evento.matches ? VISTA_MOVIL : VISTA_ESCRITORIO)
}

onMounted(() => consultaMovil?.addEventListener('change', ajustarVista))
onUnmounted(() => consultaMovil?.removeEventListener('change', ajustarVista))

const opciones = computed<CalendarOptions>(() => {
  // Referencia local para que el cambio de la función regenere las opciones.
  const fetchAgenda = props.fetchAgenda

  return {
    plugins: [classicThemePlugin, dayGridPlugin, timeGridPlugin, listPlugin],
    locale: esLocale,
    initialView: esMovil ? VISTA_MOVIL : VISTA_ESCRITORIO,
    headerToolbar: {
      start: 'prev,next today',
      center: 'title',
      end: 'timeGridWeek,dayGridMonth,listWeek',
    },
    firstDay: 1,
    allDaySlot: false,
    nowIndicator: true,
    scrollTime: '08:00:00',
    contentHeight: 640,
    dayMaxEvents: true,
    eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
    events: async (info: EventSourceFuncInfo) => {
      error.value = ''
      seleccion.value = null
      try {
        const agenda = await fetchAgenda(info.start, info.end)
        return [...agenda.turnos.map(turnoAEvento), ...agenda.hojasDeRuta.map(hojaAEvento)]
      } catch (e) {
        error.value = e instanceof Error ? e.message : 'No fue posible obtener la agenda.'
        return []
      }
    },
    loading: (estaCargando) => {
      cargando.value = estaCargando
    },
    eventClick: (info: EventClickInfo) => {
      seleccion.value = info.event.extendedProps.seleccion as Seleccion
    },
  }
})
</script>

<template>
  <div class="agenda-calendar">
    <div
      class="mb-3 flex min-h-5 flex-wrap items-center gap-x-4 gap-y-2 text-xs text-brand-inkSoft"
    >
      <span class="flex items-center gap-1.5">
        <span
          class="h-2.5 w-2.5 rounded-sm bg-brand-accentSoft ring-1 ring-brand-accent"
          aria-hidden="true"
        />
        Consultorio
      </span>
      <span class="flex items-center gap-1.5">
        <span
          class="h-2.5 w-2.5 rounded-sm bg-brand-warnSoft ring-1 ring-brand-warnInk"
          aria-hidden="true"
        />
        Rural
      </span>
      <span class="flex items-center gap-1.5">
        <span
          class="h-2.5 w-2.5 rounded-sm bg-brand-muted ring-1 ring-brand-inkSoft"
          aria-hidden="true"
        />
        Hoja de ruta
      </span>
      <span v-if="cargando" class="ml-auto" role="status">Cargando agenda…</span>
    </div>

    <p
      v-if="error"
      class="mb-3 rounded border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
    </p>

    <div class="rounded border border-brand-line bg-brand-surface p-2 sm:p-3 md:p-4">
      <FullCalendar ref="calendario" :options="opciones" />
    </div>

    <section
      v-if="seleccion"
      class="mt-4 rounded border border-brand-line bg-brand-surface p-4 text-sm"
      aria-live="polite"
    >
      <template v-if="seleccion.tipo === 'turno'">
        <div class="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 class="font-medium">
              {{ seleccion.turno.animal.name }}
              <span class="font-normal text-brand-inkSoft">
                ({{ seleccion.turno.animal.species }})
              </span>
            </h2>
            <p class="mt-1 text-brand-inkSoft">
              {{ formatoFechaHora.format(new Date(seleccion.turno.dateTime)) }} ·
              {{ seleccion.turno.durationMinutes }} min ·
              {{ MODALIDAD[seleccion.turno.modality] }}
            </p>
          </div>
          <EstadoTurnoBadge :estado="seleccion.turno.status" />
        </div>
        <dl class="mt-3 grid gap-x-6 gap-y-2 sm:grid-cols-2">
          <div>
            <dt class="text-xs text-brand-inkSoft">Motivo</dt>
            <dd>
              {{ motivoDe(seleccion.turno) }}
              <span v-if="seleccion.turno.reasonDetail" class="text-brand-inkSoft">
                · {{ seleccion.turno.reasonDetail }}
              </span>
            </dd>
          </div>
          <div>
            <dt class="text-xs text-brand-inkSoft">Tutor</dt>
            <dd>{{ seleccion.turno.tutor.fullName }} · {{ seleccion.turno.tutor.phone }}</dd>
          </div>
          <div v-if="mostrarVeterinario && seleccion.turno.vet">
            <dt class="text-xs text-brand-inkSoft">Veterinario</dt>
            <dd>{{ seleccion.turno.vet.fullName }}</dd>
          </div>
        </dl>
      </template>

      <template v-else>
        <h2 class="font-medium">Hoja de ruta</h2>
        <p class="mt-1 text-brand-inkSoft">
          {{ formatoFechaHora.format(new Date(seleccion.hoja.startsAt)) }} –
          {{ formatoHora.format(new Date(seleccion.hoja.endsAt)) }}
        </p>
        <p v-if="seleccion.hoja.detail" class="mt-2">{{ seleccion.hoja.detail }}</p>
        <p v-if="mostrarVeterinario" class="mt-2 text-brand-inkSoft">
          {{ seleccion.hoja.vet.fullName }}
        </p>
      </template>

      <button type="button" class="btn-outline mt-4" @click="seleccion = null">Cerrar</button>
    </section>
  </div>
</template>

<style>
/* Paleta del tema "classic" de FullCalendar tomada de los tokens brand-*: el
   calendario sigue el modo claro/oscuro del panel sin estilos propios. */
.agenda-calendar {
  --fc-classic-button: var(--brand-surface);
  --fc-classic-button-border: var(--brand-line);
  --fc-classic-button-strong: var(--brand-accent-soft);
  --fc-classic-button-strong-border: var(--brand-accent);
  --fc-classic-button-outline: var(--brand-accent);
  --fc-classic-button-foreground: var(--brand-ink);
  --fc-classic-primary: var(--brand-accent-soft);
  --fc-classic-primary-foreground: var(--brand-accent-ink);
  --fc-classic-highlight: var(--brand-accent-soft);
  --fc-classic-today: var(--brand-muted);
  --fc-classic-now: var(--brand-danger);
  --fc-classic-background: var(--brand-surface);
  --fc-classic-faint: var(--brand-bg);
  --fc-classic-muted: var(--brand-muted);
  --fc-classic-strong: var(--brand-line);
  --fc-classic-foreground: var(--brand-ink);
  --fc-classic-faint-foreground: var(--brand-ink-soft);
  --fc-classic-muted-foreground: var(--brand-ink-soft);
  --fc-classic-border: var(--brand-line);
  --fc-classic-strong-border: var(--brand-ink-soft);
  color: var(--brand-ink);
}

.agenda-calendar .agenda-evento {
  cursor: pointer;
}
</style>
