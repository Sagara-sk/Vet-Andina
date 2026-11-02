<script setup lang="ts">
import { reactive, ref } from 'vue'
import type { TipoPersona, TutorDetail, TutorInput } from '@/services/tutores'

const props = defineProps<{
  initial?: TutorDetail
  submitLabel: string
  // Guarda y devuelve el mensaje de error, o null si salió bien.
  save: (input: TutorInput) => Promise<string | null>
}>()

const form = reactive({
  nombreCompleto: props.initial?.fullName ?? '',
  telefono: props.initial?.phone ?? '',
  email: props.initial?.email ?? '',
  localidad: props.initial?.locality ?? '',
  dniCuit: props.initial?.dniCuit ?? '',
  direccionUrbana: props.initial?.address ?? '',
  tipoPersona: (props.initial?.personType ?? '') as TipoPersona | '',
})

const error = ref('')
const saving = ref(false)

async function submit() {
  error.value = ''
  saving.value = true

  const message = await props.save({
    nombreCompleto: form.nombreCompleto,
    telefono: form.telefono,
    email: form.email,
    localidad: form.localidad,
    dniCuit: form.dniCuit.trim() || null,
    direccionUrbana: form.direccionUrbana.trim() || null,
    tipoPersona: form.tipoPersona || null,
  })

  error.value = message ?? ''
  saving.value = false
}
</script>

<template>
  <form class="grid gap-4 sm:grid-cols-2" @submit.prevent="submit">
    <p
      v-if="error"
      class="border border-brand-dangerLine bg-brand-dangerSoft p-3 text-sm text-brand-dangerInk sm:col-span-2"
      role="alert"
    >
      {{ error }}
    </p>

    <div class="sm:col-span-2">
      <label for="tutor-nombre" class="field-label">Nombre completo o razón social</label>
      <input id="tutor-nombre" v-model="form.nombreCompleto" class="field-input" minlength="2" maxlength="200" required />
    </div>

    <div>
      <label for="tutor-telefono" class="field-label">Teléfono</label>
      <input id="tutor-telefono" v-model="form.telefono" type="tel" class="field-input" minlength="6" maxlength="50" required />
    </div>

    <div>
      <label for="tutor-email" class="field-label">Correo electrónico</label>
      <input
        id="tutor-email"
        v-model="form.email"
        type="email"
        class="field-input"
        maxlength="254"
        required
        :disabled="initial?.hasAccount"
        :aria-describedby="initial?.hasAccount ? 'tutor-email-ayuda' : undefined"
      />
      <p v-if="initial?.hasAccount" id="tutor-email-ayuda" class="mt-1 text-xs text-brand-inkSoft">
        Tiene cuenta propia: solo el tutor puede cambiar su correo.
      </p>
    </div>

    <div>
      <label for="tutor-localidad" class="field-label">Localidad</label>
      <input id="tutor-localidad" v-model="form.localidad" class="field-input" minlength="2" maxlength="150" required />
    </div>

    <div>
      <label for="tutor-dni" class="field-label">DNI / CUIT (opcional)</label>
      <input id="tutor-dni" v-model="form.dniCuit" class="field-input" maxlength="20" />
    </div>

    <div>
      <label for="tutor-direccion" class="field-label">Dirección (opcional)</label>
      <input id="tutor-direccion" v-model="form.direccionUrbana" class="field-input" maxlength="200" />
    </div>

    <div>
      <label for="tutor-tipo" class="field-label">Tipo (opcional)</label>
      <select id="tutor-tipo" v-model="form.tipoPersona" class="field-input">
        <option value="">Sin especificar</option>
        <option value="INDIVIDUAL">Particular</option>
        <option value="EMPRESA_PRODUCTOR">Empresa / productor</option>
      </select>
    </div>

    <div class="sm:col-span-2">
      <button type="submit" class="btn-primary disabled:cursor-wait disabled:opacity-60" :disabled="saving">
        {{ saving ? 'Guardando...' : submitLabel }}
      </button>
    </div>
  </form>
</template>
