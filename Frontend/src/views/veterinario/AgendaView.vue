<script setup lang="ts">
import { computed, ref } from 'vue'
import TurnoEstadoBadge from '@/components/veterinario/TurnoEstadoBadge.vue'
import { horaDe, mismoDia, useAgendaDemoStore } from '@/stores/agendaDemo'

const agenda = useAgendaDemoStore()

// Lunes de la semana visible.
const inicioSemana = ref(lunesDe(new Date()))

function lunesDe(fecha: Date) {
  const lunes = new Date(fecha)
  lunes.setHours(0, 0, 0, 0)
  lunes.setDate(lunes.getDate() - ((lunes.getDay() + 6) % 7))
  return lunes
}

function moverSemana(semanas: number) {
  const nueva = new Date(inicioSemana.value)
  nueva.setDate(nueva.getDate() + semanas * 7)
  inicioSemana.value = nueva
}

const formatoDia = new Intl.DateTimeFormat('es-AR', { weekday: 'long', day: 'numeric', month: 'short' })
const formatoRango = new Intl.DateTimeFormat('es-AR', { day: 'numeric', month: 'long' })

const dias = computed(() =>
  Array.from({ length: 6 }, (_, i) => {
    const fecha = new Date(inicioSemana.value)
    fecha.setDate(fecha.getDate() + i)
    const etiqueta = formatoDia.format(fecha)
    return {
      fecha,
      etiqueta: etiqueta.charAt(0).toUpperCase() + etiqueta.slice(1),
      esHoy: mismoDia(fecha, new Date()),
      turnos: agenda.turnosDelDia(fecha),
    }
  }),
)

const rango = computed(() => {
  const fin = dias.value[dias.value.length - 1]!.fecha
  return `${formatoRango.format(inicioSemana.value)} – ${formatoRango.format(fin)}`
})
</script>

<template>
  <div class="mx-auto max-w-[1210px] text-brand-ink">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-[1.6rem]">Agenda</h1>
        <p class="mt-1.5 text-base text-brand-inkSoft">{{ rango }}</p>
        <p class="mt-2 text-xs text-brand-inkSoft" role="note">
          Vista de demostración. Los turnos no provienen de la base de datos.
        </p>
      </div>

      <div class="flex gap-2">
        <button type="button" class="btn-outline" @click="moverSemana(-1)">← Anterior</button>
        <button type="button" class="btn-outline" @click="inicioSemana = lunesDe(new Date())">Hoy</button>
        <button type="button" class="btn-outline" @click="moverSemana(1)">Siguiente →</button>
      </div>
    </header>

    <div class="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      <section
        v-for="dia in dias"
        :key="dia.fecha.toISOString()"
        class="rounded border bg-brand-surface"
        :class="dia.esHoy ? 'border-brand-accent' : 'border-brand-line'"
      >
        <h2 class="flex items-center justify-between border-b border-brand-line px-4 py-3 text-sm font-medium">
          {{ dia.etiqueta }}
          <span v-if="dia.esHoy" class="text-xs font-normal text-brand-accentInk">Hoy</span>
        </h2>

        <p v-if="dia.turnos.length === 0" class="px-4 py-6 text-center text-xs text-brand-inkSoft">Sin turnos.</p>

        <ul v-else>
          <li
            v-for="turno in dia.turnos"
            :key="turno.id"
            class="flex items-start gap-3 border-b border-brand-line px-4 py-3 last:border-b-0"
          >
            <span class="w-11 shrink-0 text-sm text-brand-inkSoft">{{ horaDe(turno.fechaHora) }}</span>
            <div class="min-w-0 flex-1">
              <p class="text-sm">{{ turno.animal }}</p>
              <p class="mt-0.5 text-xs text-brand-inkSoft">
                {{ turno.motivo }} · {{ turno.veterinario }}
                <span v-if="turno.tipo === 'campo'"> · A campo</span>
              </p>
            </div>
            <TurnoEstadoBadge :estado="turno.estado" />
          </li>
        </ul>
      </section>
    </div>
  </div>
</template>
