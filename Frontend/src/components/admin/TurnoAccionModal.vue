<script setup lang="ts">
import { computed, ref } from 'vue'
import BaseModal from './BaseModal.vue'
import { cancelTurno, rescheduleTurno, type Turno, type Veterinario } from '@/services/turnos'
import { formatShortDate, toDateTimeInput, whatsappNumber } from '@/utils/format'

export type AccionTurno = 'reprogramar' | 'cancelar'

const props = defineProps<{ turno: Turno; accion: AccionTurno; vets: Veterinario[] }>()
const emit = defineEmits<{ close: []; done: [turno: Turno, mensaje: string] }>()

const fechaHora = ref(toDateTimeInput(new Date(props.turno.dateTime)))
const idVeterinario = ref(props.turno.vet?.id ?? '')
const motivo = ref('')
const error = ref('')
const saving = ref(false)
const minFecha = toDateTimeInput(new Date())

const fecha = computed(() => formatShortDate(new Date(props.turno.dateTime)))
const whatsapp = computed(() => {
  const texto = `Hola, te contactamos desde Vet Andina por el turno de ${props.turno.animal.name} (${fecha.value}).`
  return `https://wa.me/${whatsappNumber(props.turno.tutor.phone)}?text=${encodeURIComponent(texto)}`
})

async function submit() {
  error.value = ''
  saving.value = true

  try {
    if (props.accion === 'reprogramar') {
      const turno = await rescheduleTurno(
        props.turno.id,
        new Date(fechaHora.value).toISOString(),
        idVeterinario.value || null,
      )
      emit('done', turno, `Turno de ${turno.animal.name} reprogramado para el ${formatShortDate(new Date(turno.dateTime))}.`)
    } else {
      const turno = await cancelTurno(props.turno.id, motivo.value)
      emit('done', turno, `Turno de ${turno.animal.name} cancelado.`)
    }
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No fue posible guardar el cambio.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal
    :title="accion === 'reprogramar' ? 'Reprogramar turno' : 'Cancelar turno'"
    :subtitle="`${turno.animal.name} · ${turno.tutor.fullName} · ${fecha}`"
    @close="emit('close')"
  >
    <form class="space-y-4" @submit.prevent="submit">
      <p v-if="error" class="border border-brand-dangerLine bg-brand-dangerSoft p-3 text-sm text-brand-dangerInk" role="alert">
        {{ error }}
      </p>

      <a
        :href="whatsapp"
        target="_blank"
        rel="noreferrer"
        class="flex items-center gap-3 rounded-lg bg-[#25d366] px-4 py-3 text-sm font-semibold text-white hover:opacity-90"
      >
        <span aria-hidden="true">💬</span>
        Coordinar con el tutor por WhatsApp
      </a>

      <div v-if="accion === 'reprogramar'" class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="accion-fecha" class="field-label">Nueva fecha y hora</label>
          <input id="accion-fecha" v-model="fechaHora" type="datetime-local" class="field-input" :min="minFecha" required />
        </div>
        <div>
          <label for="accion-vet" class="field-label">Veterinario</label>
          <select id="accion-vet" v-model="idVeterinario" class="field-input">
            <option v-if="!turno.vet" value="">Sin asignar</option>
            <option v-for="v in vets" :key="v.id" :value="v.id">{{ v.fullName }}</option>
          </select>
        </div>
      </div>

      <div v-else>
        <label for="accion-motivo" class="field-label">Motivo de cancelación (opcional)</label>
        <textarea
          id="accion-motivo"
          v-model="motivo"
          rows="3"
          maxlength="500"
          class="field-input resize-none"
          placeholder="Ej: solicitud del tutor, veterinario no disponible"
        />
      </div>

      <button
        type="submit"
        class="w-full rounded-[3px] py-2.5 text-sm font-medium text-white hover:opacity-90 disabled:cursor-wait disabled:opacity-60"
        :class="accion === 'cancelar' ? 'bg-brand-danger' : 'bg-brand-accent'"
        :disabled="saving"
      >
        {{ saving ? 'Guardando...' : accion === 'reprogramar' ? 'Confirmar reprogramación' : 'Confirmar cancelación' }}
      </button>
    </form>
  </BaseModal>
</template>
