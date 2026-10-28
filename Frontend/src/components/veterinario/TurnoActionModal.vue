<script setup lang="ts">
import { computed, ref } from 'vue'
import { HORARIOS, type TurnoDemo } from '@/data/agendaMock'
import { horaDe, useAgendaDemoStore } from '@/stores/agendaDemo'
import { formatShortDate } from '@/utils/format'

export type TipoModal = 'reprogramar' | 'cancelar'

const props = defineProps<{ turno: TurnoDemo; tipo: TipoModal }>()
const emit = defineEmits<{ close: []; done: [mensaje: string] }>()

const agenda = useAgendaDemoStore()

const nuevaFecha = ref('')
const nuevaHora = ref('')
const motivoCancelacion = ref('')
const notificar = ref(true)

const cliente = computed(() => agenda.cliente(props.turno.idCliente))
const quien = computed(() => `${props.turno.animal} · ${cliente.value?.nombreCompleto ?? '—'}`)

const whatsapp = computed(() => {
  const texto = `Hola, te contactamos desde Vet Andina respecto al turno de ${props.turno.animal} (${formatShortDate(props.turno.fechaHora)}).`
  return `https://wa.me/${cliente.value?.telefono ?? ''}?text=${encodeURIComponent(texto)}`
})

function confirmarAccion() {
  const aviso = notificar.value ? ' · Notificación enviada (demo)' : ''

  if (props.tipo === 'cancelar') {
    agenda.cancelar(props.turno.id, motivoCancelacion.value.trim())
    emit('done', `Turno de ${quien.value} cancelado${aviso}`)
  } else {
    agenda.reprogramar(props.turno.id, nuevaFecha.value, nuevaHora.value)
    emit('done', `Turno de ${quien.value} reprogramado${aviso}`)
  }
}
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4"
    @click.self="emit('close')"
  >
    <div class="w-full max-w-md overflow-hidden rounded-2xl bg-brand-surface shadow-2xl" role="dialog" aria-modal="true">
      <div class="flex items-start justify-between border-b border-brand-line px-6 py-5">
        <div>
          <h3 class="font-serif text-[1.2rem]">
            {{ tipo === 'reprogramar' ? 'Reprogramar turno' : 'Cancelar turno' }}
          </h3>
          <p class="mt-1 text-sm text-brand-inkSoft">{{ quien }}</p>
          <p class="mt-0.5 text-xs text-brand-inkSoft">
            {{ formatShortDate(turno.fechaHora) }} · {{ turno.motivo }}
          </p>
        </div>

        <button
          type="button"
          class="text-xl text-brand-inkSoft transition-opacity hover:opacity-60"
          aria-label="Cerrar"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>

      <div class="space-y-4 px-6 py-5">
        <a
          :href="whatsapp"
          target="_blank"
          rel="noreferrer"
          class="flex items-center gap-3 rounded-xl bg-[#25d366] px-4 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
        >
          <span class="text-lg">💬</span>
          Contactar por WhatsApp antes de aplicar el cambio
        </a>

        <div v-if="tipo === 'reprogramar'" class="grid grid-cols-2 gap-3">
          <div>
            <label for="nueva-fecha" class="mb-1.5 block text-xs font-semibold text-brand-inkSoft">
              Nueva fecha
            </label>
            <input
              id="nueva-fecha"
              v-model="nuevaFecha"
              type="date"
              class="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2.5 text-sm text-brand-ink outline-none"
            />
          </div>

          <div>
            <label for="nueva-hora" class="mb-1.5 block text-xs font-semibold text-brand-inkSoft">
              Nuevo horario
            </label>
            <select
              id="nueva-hora"
              v-model="nuevaHora"
              class="w-full rounded-lg border border-brand-line bg-brand-bg px-3 py-2.5 text-sm text-brand-ink outline-none"
            >
              <option value="">{{ horaDe(turno.fechaHora) }} (actual)</option>
              <option v-for="hora in HORARIOS" :key="hora" :value="hora">{{ hora }}</option>
            </select>
          </div>
        </div>

        <div v-else>
          <label for="motivo" class="mb-1.5 block text-xs font-semibold text-brand-inkSoft">
            Motivo de cancelación
          </label>
          <textarea
            id="motivo"
            v-model="motivoCancelacion"
            rows="3"
            placeholder="Ej: Veterinario no disponible, emergencia, solicitud del tutor..."
            class="w-full resize-none rounded-lg border border-brand-line bg-brand-bg px-3 py-2.5 text-sm text-brand-ink outline-none"
          />
        </div>

        <label class="flex cursor-pointer items-center gap-3 rounded-xl border border-brand-line bg-brand-bg px-4 py-3">
          <input v-model="notificar" type="checkbox" class="h-4 w-4 rounded accent-brand-accent" />
          <div>
            <p class="text-sm font-medium">Notificar al tutor</p>
            <p class="mt-0.5 text-xs text-brand-inkSoft">Enviar correo electrónico y notificación push</p>
          </div>
        </label>
      </div>

      <div class="flex gap-3 border-t border-brand-line px-6 py-4">
        <button
          type="button"
          class="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all hover:opacity-90"
          :class="tipo === 'cancelar' ? 'bg-brand-danger' : 'bg-brand-accent'"
          @click="confirmarAccion"
        >
          {{ tipo === 'reprogramar' ? 'Confirmar reprogramación' : 'Confirmar cancelación' }}
        </button>
        <button
          type="button"
          class="rounded-xl border border-brand-line px-5 py-2.5 text-sm text-brand-inkSoft transition-all hover:opacity-80"
          @click="emit('close')"
        >
          Volver
        </button>
      </div>
    </div>
  </div>
</template>
