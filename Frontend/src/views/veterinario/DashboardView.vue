<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import TurnoActionModal, { type TipoModal } from '@/components/veterinario/TurnoActionModal.vue'
import TurnoEstadoBadge from '@/components/veterinario/TurnoEstadoBadge.vue'
import type { TurnoDemo } from '@/data/agendaMock'
import { horaDe, useAgendaDemoStore } from '@/stores/agendaDemo'
import { useSessionStore } from '@/stores/session'

const session = useSessionStore()
const agendaDemo = useAgendaDemoStore()

const agenda = computed(() => agendaDemo.turnosDelDia(new Date()))

const METRICAS = computed(() => [
  { valor: String(agenda.value.length), etiqueta: 'Turnos hoy' },
  {
    valor: String(agendaDemo.turnos.filter((t) => t.estado === 'pendiente').length),
    etiqueta: 'Pendientes de confirmar',
  },
  { valor: String(agendaDemo.clientes.length), etiqueta: 'Clientes activos' },
  { valor: '2', etiqueta: 'Fichas sin sincronizar' },
])

const OFFLINE = [
  { clave: 'Última sincronización', valor: 'Hoy, 08:42 h' },
  { clave: 'Fichas disponibles sin conexión', valor: '42' },
  { clave: 'Cargas pendientes de subir', valor: '2' },
  { clave: 'Visitas a campo hoy', valor: '1 programada' },
]

const saludo = computed(() => (session.firstName ? `Hola, ${session.firstName}` : 'Hola'))

const fechaHoy = (() => {
  const texto = new Intl.DateTimeFormat('es-AR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
  return texto.charAt(0).toUpperCase() + texto.slice(1)
})()

const quien = (turno: TurnoDemo) =>
  `${turno.animal} · ${agendaDemo.cliente(turno.idCliente)?.nombreCompleto ?? '—'}`

const modal = ref<{ turno: TurnoDemo; tipo: TipoModal } | null>(null)
const feedbackOk = ref('')

function accionRealizada(mensaje: string) {
  modal.value = null
  feedbackOk.value = mensaje

  setTimeout(() => {
    feedbackOk.value = ''
  }, 4000)
}
</script>

<template>
  <div class="min-h-screen bg-brand-bg text-brand-ink font-sans">

    <!-- CABECERA -->
    <div class="flex items-start justify-between gap-6">
      <div>
        <h1 class="font-serif text-[1.6rem]">
          {{ saludo }}
        </h1>

        <p class="mt-1.5 text-base text-brand-inkSoft">
          {{ fechaHoy }}
        </p>

        <p class="mt-2 text-xs text-brand-inkSoft" role="note">
          Vista de demostración. Turnos, clientes y métricas no provienen de la base de datos.
        </p>
      </div>

      <div class="flex items-center gap-2 whitespace-nowrap text-xs text-brand-accentInk">
        <span class="h-[7px] w-[7px] rounded-full bg-brand-accent" />
        Conectado · datos sincronizados
      </div>
    </div>

    <!-- MÉTRICAS -->
    <div class="mt-8 grid grid-cols-2 gap-3.5 lg:grid-cols-4">
      <div
        v-for="metrica in METRICAS"
        :key="metrica.etiqueta"
        class="rounded border border-brand-line bg-brand-surface p-5"
      >
        <p class="font-serif text-[1.7rem]">
          {{ metrica.valor }}
        </p>

        <p class="mt-1 text-xs text-brand-inkSoft">
          {{ metrica.etiqueta }}
        </p>
      </div>
    </div>

    <!-- AGENDA + OFFLINE -->
    <div class="mt-9 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.6fr_1fr]">

      <!-- AGENDA -->
      <section>
        <div class="mb-3.5 flex items-baseline justify-between">
          <h3 class="text-base font-medium">
            Agenda de hoy
          </h3>

          <RouterLink :to="{ name: 'vet-agenda' }" class="text-xs text-brand-inkSoft hover:underline">
            Ver agenda completa
          </RouterLink>
        </div>

        <div
          v-if="feedbackOk"
          class="mb-3 flex items-center gap-2 rounded-lg bg-brand-accentSoft px-4 py-3 text-sm text-brand-accentInk"
          role="status"
        >
          ✅ {{ feedbackOk }}
        </div>

        <div class="overflow-hidden rounded border border-brand-line bg-brand-surface">
          <div
            v-for="(turno, index) in agenda"
            :key="turno.id"
            class="flex flex-wrap items-center gap-4 px-5 py-4"
            :class="index < agenda.length - 1 ? 'border-b border-brand-line' : ''"
          >
            <span class="w-14 shrink-0 text-sm text-brand-inkSoft">
              {{ horaDe(turno.fechaHora) }}
            </span>

            <div class="min-w-0 flex-1">
              <p class="text-sm font-medium">
                {{ quien(turno) }}
              </p>

              <p class="mt-0.5 text-xs text-brand-inkSoft">
                {{ turno.motivo }}
              </p>
            </div>

            <TurnoEstadoBadge :estado="turno.estado" />

            <div v-if="agendaDemo.puedeModificar(turno)" class="flex shrink-0 gap-1.5">
              <button
                class="rounded-md border border-brand-line px-2.5 py-1 text-xs text-brand-inkSoft transition-all hover:opacity-80"
                @click="modal = { turno, tipo: 'reprogramar' }"
              >
                Reprogramar
              </button>

              <button
                class="rounded-md border border-brand-dangerLine bg-brand-dangerSoft px-2.5 py-1 text-xs text-brand-dangerInk transition-all hover:opacity-80"
                @click="modal = { turno, tipo: 'cancelar' }"
              >
                Cancelar
              </button>
            </div>
          </div>

          <p
            v-if="agenda.length === 0"
            class="px-5 py-6 text-center text-sm text-brand-inkSoft"
          >
            Sin turnos para hoy.
          </p>
        </div>
      </section>

      <!-- MODO OFFLINE -->
      <section>
        <div class="mb-3.5 flex items-baseline justify-between">
          <h3 class="text-base font-medium">
            Modo offline
          </h3>

          <RouterLink :to="{ name: 'vet-offline' }" class="text-xs text-brand-inkSoft hover:underline">
            Ver detalle
          </RouterLink>
        </div>

        <div class="rounded border border-brand-line bg-brand-surface p-5">
          <div class="mb-3.5 flex items-center gap-2">
            <span class="h-[7px] w-[7px] rounded-full bg-brand-accent" />

            <p class="text-sm font-medium">
              Todo sincronizado
            </p>
          </div>

          <div
            v-for="(fila, index) in OFFLINE"
            :key="fila.clave"
            class="flex justify-between gap-4 py-2.5 text-sm"
            :class="index > 0 ? 'border-t border-brand-line' : ''"
          >
            <span class="text-brand-inkSoft">
              {{ fila.clave }}
            </span>

            <span>
              {{ fila.valor }}
            </span>
          </div>

          <RouterLink
            :to="{ name: 'vet-offline' }"
            class="mt-4 block w-full rounded-sm bg-brand-accent py-2.5 text-center text-sm font-medium text-white"
          >
            Ir a modo offline
          </RouterLink>
        </div>
      </section>
    </div>

    <TurnoActionModal
      v-if="modal"
      :turno="modal.turno"
      :tipo="modal.tipo"
      @close="modal = null"
      @done="accionRealizada"
    />

  </div>
</template>
