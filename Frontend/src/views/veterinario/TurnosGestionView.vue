<script setup lang="ts">
import { computed, ref } from 'vue'
import TurnoActionModal, { type TipoModal } from '@/components/veterinario/TurnoActionModal.vue'
import TurnoEstadoBadge from '@/components/veterinario/TurnoEstadoBadge.vue'
import type { TurnoDemo, TurnoEstado } from '@/data/agendaMock'
import { useAgendaDemoStore } from '@/stores/agendaDemo'
import { useSessionStore } from '@/stores/session'
import { formatShortDate } from '@/utils/format'

const agenda = useAgendaDemoStore()
const session = useSessionStore()

const busqueda = ref('')
const filtroEstado = ref<TurnoEstado | ''>('')
const modal = ref<{ turno: TurnoDemo; tipo: TipoModal } | null>(null)
const feedbackOk = ref('')

const ESTADOS: { value: TurnoEstado | ''; label: string }[] = [
  { value: '', label: 'Todos' },
  { value: 'pendiente', label: 'Por confirmar' },
  { value: 'confirmado', label: 'Confirmados' },
  { value: 'atendido', label: 'Atendidos' },
  { value: 'cancelado', label: 'Cancelados' },
]

const tutor = (turno: TurnoDemo) => agenda.cliente(turno.idCliente)?.nombreCompleto ?? '—'

const filtrados = computed(() => {
  const texto = busqueda.value.trim().toLowerCase()

  return agenda.turnos
    .filter((t) => !filtroEstado.value || t.estado === filtroEstado.value)
    .filter(
      (t) =>
        !texto ||
        t.animal.toLowerCase().includes(texto) ||
        tutor(t).toLowerCase().includes(texto) ||
        t.motivo.toLowerCase().includes(texto),
    )
    .sort((a, b) => a.fechaHora.getTime() - b.fechaHora.getTime())
})

const editable = (turno: TurnoDemo) =>
  (turno.estado === 'pendiente' || turno.estado === 'confirmado') && agenda.puedeModificar(turno)

const esVeterinario = computed(() => session.user?.rol === 'VETERINARIO')

function mostrarFeedback(mensaje: string) {
  modal.value = null
  feedbackOk.value = mensaje

  setTimeout(() => {
    feedbackOk.value = ''
  }, 4000)
}

function confirmar(turno: TurnoDemo) {
  agenda.confirmar(turno.id)
  mostrarFeedback(`Turno de ${turno.animal} confirmado`)
}
</script>

<template>
  <div class="mx-auto max-w-[1210px] text-brand-ink">
    <h1 class="font-serif text-[1.6rem]">Gestión de turnos</h1>
    <p class="mt-2 text-xs text-brand-inkSoft" role="note">
      Vista de demostración. Los cambios se guardan solo en memoria y se pierden al recargar.
    </p>
    <p v-if="esVeterinario" class="mt-1 text-xs text-brand-inkSoft">
      Ves la agenda general, pero solo podés modificar los turnos asignados a vos.
    </p>

    <div class="mt-7 flex flex-wrap items-center gap-3">
      <input
        v-model="busqueda"
        type="search"
        placeholder="Buscar por mascota, tutor o motivo"
        aria-label="Buscar turnos"
        class="w-[280px] max-w-full rounded-sm border border-brand-line bg-brand-surface px-3 py-2.5 text-sm outline-none focus:border-brand-accent"
      />
      <div class="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar por estado">
        <button
          v-for="estado in ESTADOS"
          :key="estado.value"
          type="button"
          class="rounded-full border px-3 py-1.5 text-xs"
          :class="
            filtroEstado === estado.value
              ? 'border-brand-accent bg-brand-accentSoft text-brand-accentInk'
              : 'border-brand-line bg-brand-surface text-brand-inkSoft'
          "
          :aria-pressed="filtroEstado === estado.value"
          @click="filtroEstado = estado.value"
        >
          {{ estado.label }}
        </button>
      </div>
    </div>

    <div
      v-if="feedbackOk"
      class="mt-5 rounded-lg bg-brand-accentSoft px-4 py-3 text-sm text-brand-accentInk"
      role="status"
    >
      ✅ {{ feedbackOk }}
    </div>

    <div class="mt-5 overflow-x-auto rounded border border-brand-line bg-brand-surface">
      <table class="w-full min-w-[820px] text-left text-sm">
        <thead class="text-xs text-brand-inkSoft">
          <tr>
            <th class="px-4 py-3 font-normal">Fecha</th>
            <th class="px-4 py-3 font-normal">Paciente</th>
            <th class="px-4 py-3 font-normal">Motivo</th>
            <th class="px-4 py-3 font-normal">Veterinario</th>
            <th class="px-4 py-3 font-normal">Estado</th>
            <th class="px-4 py-3 font-normal"><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="turno in filtrados" :key="turno.id" class="border-t border-brand-line align-top">
            <td class="whitespace-nowrap px-4 py-3.5">{{ formatShortDate(turno.fechaHora) }}</td>
            <td class="px-4 py-3.5">
              {{ turno.animal }}
              <p class="mt-0.5 text-xs text-brand-inkSoft">{{ tutor(turno) }}</p>
            </td>
            <td class="px-4 py-3.5">
              {{ turno.motivo }}
              <p v-if="turno.motivoCancelacion" class="mt-0.5 text-xs text-brand-dangerInk">
                {{ turno.motivoCancelacion }}
              </p>
            </td>
            <td class="px-4 py-3.5">{{ turno.veterinario }}</td>
            <td class="px-4 py-3.5"><TurnoEstadoBadge :estado="turno.estado" /></td>
            <td class="px-4 py-3.5">
              <div v-if="editable(turno)" class="flex justify-end gap-1.5">
                <button
                  v-if="turno.estado === 'pendiente'"
                  type="button"
                  class="rounded-md border border-brand-accentSoft bg-brand-accentSoft px-2.5 py-1 text-xs text-brand-accentInk hover:opacity-80"
                  @click="confirmar(turno)"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  class="rounded-md border border-brand-line px-2.5 py-1 text-xs text-brand-inkSoft hover:opacity-80"
                  @click="modal = { turno, tipo: 'reprogramar' }"
                >
                  Reprogramar
                </button>
                <button
                  type="button"
                  class="rounded-md border border-brand-dangerLine bg-brand-dangerSoft px-2.5 py-1 text-xs text-brand-dangerInk hover:opacity-80"
                  @click="modal = { turno, tipo: 'cancelar' }"
                >
                  Cancelar
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      <p v-if="filtrados.length === 0" class="px-5 py-6 text-center text-sm text-brand-inkSoft">
        No hay turnos que coincidan con la búsqueda.
      </p>
    </div>

    <TurnoActionModal
      v-if="modal"
      :turno="modal.turno"
      :tipo="modal.tipo"
      @close="modal = null"
      @done="mostrarFeedback"
    />
  </div>
</template>
