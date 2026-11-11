<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { Rol } from '@/router/access'
import { getMyAgenda, getVetsAgenda, type Agenda } from '@/services/agenda'
import type { EstadoTurno } from '@/services/turnos'

const props = defineProps<{ rol: Exclude<Rol, 'CLIENTE'> }>()

const agenda = ref<Agenda | null>(null)
const cargando = ref(true)
const error = ref('')

const titulo = computed(() => {
  switch (props.rol) {
    case 'VETERINARIO':
      return 'Tu agenda de hoy'
    case 'ADMINISTRATIVO':
      return 'Agenda del consultorio y de campo'
    case 'SUPERADMIN':
      return 'Agenda general de hoy'
  }
})

const enlaceAgenda = computed(() =>
  props.rol === 'VETERINARIO' ? { name: 'vet-agenda' } : { name: 'admin-agenda' },
)

const turnos = computed(() => agenda.value?.turnos ?? [])
const hojasDeRuta = computed(() => agenda.value?.hojasDeRuta ?? [])

const turnosActivos = computed(() =>
  turnos.value
    .filter((turno) => turno.status !== 'CANCELADA' && Number.isFinite(Date.parse(turno.dateTime)))
    .sort((a, b) => Date.parse(a.dateTime) - Date.parse(b.dateTime)),
)

const metricas = computed(() => [
  { etiqueta: 'Turnos de hoy', valor: turnosActivos.value.length },
  {
    etiqueta: 'Pendientes',
    valor: turnosActivos.value.filter((turno) =>
      ['PENDIENTE', 'PENDIENTE_PAGO', 'REPROGRAMADO'].includes(turno.status),
    ).length,
  },
  {
    etiqueta: 'Confirmados',
    valor: turnosActivos.value.filter((turno) => turno.status === 'CONFIRMADO').length,
  },
  {
    etiqueta: 'Visitas rurales',
    valor: turnosActivos.value.filter((turno) => turno.modality === 'RURAL').length,
  },
])

const estados: Record<EstadoTurno, { nombre: string; clases: string }> = {
  PENDIENTE: { nombre: 'Pendiente', clases: 'bg-brand-warnSoft text-brand-warnInk' },
  PENDIENTE_PAGO: { nombre: 'Pendiente de pago', clases: 'bg-brand-warnSoft text-brand-warnInk' },
  CONFIRMADO: { nombre: 'Confirmado', clases: 'bg-brand-accentSoft text-brand-accentInk' },
  REPROGRAMADO: { nombre: 'Reprogramado', clases: 'bg-brand-muted text-brand-inkSoft' },
  CANCELADA: { nombre: 'Cancelado', clases: 'bg-brand-dangerSoft text-brand-dangerInk' },
  COMPLETADO: { nombre: 'Completado', clases: 'bg-brand-muted text-brand-inkSoft' },
  AUSENTE: { nombre: 'Ausente', clases: 'bg-brand-dangerSoft text-brand-dangerInk' },
}

const hora = new Intl.DateTimeFormat('es-AR', {
  hour: '2-digit',
  minute: '2-digit',
  timeZone: 'America/Argentina/Buenos_Aires',
})

function inicioDiaEnArgentina(): { desde: Date; hasta: Date } {
  const partes = Object.fromEntries(
    new Intl.DateTimeFormat('en-CA', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      timeZone: 'America/Argentina/Buenos_Aires',
    })
      .formatToParts(new Date())
      .map((parte) => [parte.type, parte.value]),
  )
  const desde = new Date(`${partes.year}-${partes.month}-${partes.day}T00:00:00-03:00`)

  return { desde, hasta: new Date(desde.getTime() + 24 * 60 * 60 * 1000) }
}

async function cargar() {
  cargando.value = true
  error.value = ''

  try {
    const { desde, hasta } = inicioDiaEnArgentina()
    agenda.value =
      props.rol === 'VETERINARIO'
        ? await getMyAgenda(desde, hasta)
        : await getVetsAgenda(desde, hasta)
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : 'No fue posible obtener la agenda de hoy.'
  } finally {
    cargando.value = false
  }
}

function horaTurno(value: string): string {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Hora no disponible' : hora.format(date)
}

onMounted(() => {
  void cargar()
})
</script>

<template>
  <section class="mt-8">
    <div class="flex flex-wrap items-baseline justify-between gap-3">
      <div>
        <h2 class="text-base font-semibold text-brand-ink">{{ titulo }}</h2>
        <p class="mt-1 text-sm text-brand-inkSoft">
          Información cargada desde la agenda disponible para tu rol.
        </p>
      </div>
      <RouterLink
        :to="enlaceAgenda"
        class="text-sm text-brand-accentInk underline underline-offset-2"
      >
        Ver agenda completa
      </RouterLink>
    </div>

    <p v-if="cargando" class="mt-4 text-sm text-brand-inkSoft" role="status">
      Cargando la agenda...
    </p>
    <div
      v-else-if="error"
      class="mt-4 border border-brand-dangerLine bg-brand-dangerSoft p-4 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
      <button type="button" class="ml-2 underline" @click="cargar">Reintentar</button>
    </div>
    <template v-else>
      <div class="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <article
          v-for="metrica in metricas"
          :key="metrica.etiqueta"
          class="rounded border border-brand-line bg-brand-surface p-4"
        >
          <p class="font-serif text-2xl text-brand-ink">{{ metrica.valor }}</p>
          <p class="mt-1 text-xs text-brand-inkSoft">{{ metrica.etiqueta }}</p>
        </article>
      </div>

      <div class="mt-4 overflow-hidden rounded border border-brand-line bg-brand-surface">
        <article
          v-for="(turno, index) in turnosActivos.slice(0, 6)"
          :key="turno.id"
          class="flex flex-wrap items-center gap-4 px-5 py-4"
          :class="index < Math.min(turnosActivos.length, 6) - 1 ? 'border-b border-brand-line' : ''"
        >
          <time class="w-14 shrink-0 text-sm text-brand-inkSoft">
            {{ horaTurno(turno.dateTime) }}
          </time>
          <div class="min-w-0 flex-1">
            <p class="text-sm font-medium text-brand-ink">
              {{ turno.animal.name }} · {{ turno.tutor.fullName }}
            </p>
            <p class="mt-0.5 text-xs text-brand-inkSoft">
              {{ turno.modality === 'RURAL' ? 'Visita rural' : 'Consultorio' }}
              <span v-if="turno.reason"> · {{ turno.reason }}</span>
              <span v-if="turno.vet && rol !== 'VETERINARIO'"> · {{ turno.vet.fullName }}</span>
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2.5 py-1 text-xs"
            :class="estados[turno.status].clases"
          >
            {{ estados[turno.status].nombre }}
          </span>
        </article>
        <p
          v-if="!turnosActivos.length"
          class="px-5 py-6 text-center text-sm text-brand-inkSoft"
          role="status"
        >
          No hay turnos activos para hoy.
        </p>
      </div>

      <section v-if="hojasDeRuta.length" class="mt-6">
        <h3 class="text-sm font-semibold text-brand-ink">Hojas de ruta de hoy</h3>
        <div class="mt-3 overflow-hidden rounded border border-brand-line bg-brand-surface">
          <article
            v-for="(hoja, index) in hojasDeRuta"
            :key="hoja.id"
            class="flex flex-wrap items-center justify-between gap-3 px-5 py-4"
            :class="index < hojasDeRuta.length - 1 ? 'border-b border-brand-line' : ''"
          >
            <p class="text-sm font-medium text-brand-ink">
              {{ hoja.detail || 'Bloque de trabajo externo' }}
            </p>
            <p class="text-xs text-brand-inkSoft">
              {{ horaTurno(hoja.startsAt) }}–{{ horaTurno(hoja.endsAt) }}
              <span v-if="rol !== 'VETERINARIO'"> · {{ hoja.vet.fullName }}</span>
            </p>
          </article>
        </div>
      </section>
    </template>
  </section>
</template>
