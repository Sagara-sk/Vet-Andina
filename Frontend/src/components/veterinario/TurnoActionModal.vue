<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseModal from '@/components/admin/BaseModal.vue'
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
  <BaseModal
    :title="tipo === 'reprogramar' ? 'Reprogramar turno' : 'Cancelar turno'"
    :subtitle="`${quien} · ${formatShortDate(turno.fechaHora)} · ${turno.motivo}`"
    @close="emit('close')"
  >
    <div class="space-y-4">
      <a
        :href="whatsapp"
        target="_blank"
        rel="noreferrer"
        class="flex min-h-11 items-center gap-3 rounded-sm bg-[#25d366] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
      >
        <span aria-hidden="true">💬</span>
        Contactar por WhatsApp antes de aplicar el cambio
      </a>

      <div v-if="tipo === 'reprogramar'" class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="nueva-fecha" class="field-label">Nueva fecha</label>
          <input id="nueva-fecha" v-model="nuevaFecha" type="date" class="field-input" />
        </div>

        <div>
          <label for="nueva-hora" class="field-label">Nuevo horario</label>
          <select id="nueva-hora" v-model="nuevaHora" class="field-input">
            <option value="">{{ horaDe(turno.fechaHora) }} (actual)</option>
            <option v-for="hora in HORARIOS" :key="hora" :value="hora">{{ hora }}</option>
          </select>
        </div>
      </div>

      <div v-else>
        <label for="motivo" class="field-label">Motivo de cancelación</label>
        <textarea
          id="motivo"
          v-model="motivoCancelacion"
          rows="3"
          placeholder="Ej: Veterinario no disponible, emergencia, solicitud del tutor..."
          class="field-input resize-none"
        />
      </div>

      <label
        class="flex cursor-pointer items-center gap-3 rounded-sm border border-brand-line bg-brand-bg px-4 py-3"
      >
        <input v-model="notificar" type="checkbox" class="h-4 w-4 accent-brand-accent" />
        <span>
          <span class="block text-sm font-medium">Notificar al tutor</span>
          <span class="mt-0.5 block text-xs text-brand-inkSoft">
            Enviar correo electrónico y notificación push
          </span>
        </span>
      </label>
    </div>

    <template #footer>
      <div class="flex flex-col-reverse gap-3 sm:flex-row">
        <button type="button" class="btn-outline" @click="emit('close')">Volver</button>
        <button
          type="button"
          class="btn-primary flex-1"
          :class="{ 'border-brand-danger! bg-brand-danger!': tipo === 'cancelar' }"
          @click="confirmarAccion"
        >
          {{ tipo === 'reprogramar' ? 'Confirmar reprogramación' : 'Confirmar cancelación' }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>
