<script setup lang="ts">
import { reactive, ref, computed, onMounted } from 'vue'
import {
  getAuthSession,
  saveClientProfile,
  type ClientProfileInput,
} from '@/services/auth'
import { RouterLink } from 'vue-router'

type TipoPersona = 'INDIVIDUAL' | 'EMPRESA_PRODUCTOR'

type ClientProfileForm = {
  dni_cuit: string
  tipo_persona: TipoPersona | ''
  direccion_urbana: string
  registrar_finca: boolean
  nombre_finca: string
}

type ClientProfileErrors = Partial<Record<keyof ClientProfileForm, string>>

const form = reactive<ClientProfileForm>({
  dni_cuit: '',
  tipo_persona: '',
  direccion_urbana: '',
  registrar_finca: false,
  nombre_finca: '',
})

const errors = reactive<ClientProfileErrors>({})
const submitting = ref(false)
const feedback = ref('')
const authStatus = ref<'loading' | 'authenticated' | 'unauthenticated' | 'forbidden' | 'error'>(
  'loading',
)

const needsFarm = computed(() => {
  return form.registrar_finca || form.tipo_persona === 'EMPRESA_PRODUCTOR'
})

const normalize = (value: string) => value.trim()

onMounted(async () => {
  try {
    const user = await getAuthSession()
    authStatus.value = !user
      ? 'unauthenticated'
      : user.rol === 'CLIENTE'
        ? 'authenticated'
        : 'forbidden'
  } catch {
    authStatus.value = 'error'
    feedback.value = 'No se pudo verificar la sesión. Revisá la conexión con el backend.'
  }
})

function clearError(field: keyof ClientProfileForm) {
  if (errors[field]) {
    delete errors[field]
  }
}

function validateDniCuit(value: string): boolean {
  const cleaned = normalize(value)
  return cleaned.length >= 8 && cleaned.length <= 20 && /^[A-Za-z0-9\-]+$/.test(cleaned)
}

function validateForm(): boolean {
  const nextErrors: ClientProfileErrors = {}

  if (authStatus.value !== 'authenticated') {
    feedback.value = 'Iniciá sesión con la cuenta de cliente para guardar el perfil.'
    return false
  }

  if (!validateDniCuit(form.dni_cuit)) {
    nextErrors.dni_cuit = 'El DNI / CUIT es obligatorio.'
  }

  if (!form.tipo_persona) {
    nextErrors.tipo_persona = 'Seleccioná el tipo de persona.'
  }

  if (normalize(form.direccion_urbana).length > 250) {
    nextErrors.direccion_urbana = 'La dirección urbana no puede superar 250 caracteres.'
  }

  if (needsFarm.value && normalize(form.nombre_finca).length < 2) {
    nextErrors.nombre_finca = 'El nombre de la finca o establecimiento es obligatorio.'
  }

  Object.keys(errors).forEach((key) => delete errors[key as keyof ClientProfileForm])
  Object.assign(errors, nextErrors)

  return Object.keys(nextErrors).length === 0
}

function buildPayload(): ClientProfileInput {
  return {
    dni_cuit: normalize(form.dni_cuit),
    tipo_persona: form.tipo_persona as TipoPersona,
    direccion_urbana: normalize(form.direccion_urbana) || null,
    nombre_finca: needsFarm.value ? normalize(form.nombre_finca) || null : null,
  }
}

async function handleSubmit() {
  feedback.value = ''

  if (!validateForm()) {
    feedback.value = 'Revisá los campos marcados en rojo.'
    return
  }

  submitting.value = true

  try {
    await saveClientProfile(buildPayload())
    feedback.value = 'Perfil del cliente guardado correctamente.'
  } catch (error) {
    feedback.value = error instanceof Error ? error.message : 'No se pudo guardar el perfil.'
  } finally {
    submitting.value = false
  }
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-brand-bg px-4 py-10 text-brand-ink">
    <section class="w-full max-w-3xl rounded-2xl border border-brand-line bg-white p-6 shadow-sm md:p-8">
      <div class="mb-6">
        <p class="text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">Paso 2</p>
        <h1 class="mt-2 text-2xl font-bold">Datos del tutor / dueño</h1>
        <p class="mt-2 text-sm text-brand-inkSoft">
          Completá los datos adicionales del perfil. El nombre, correo, teléfono y localidad de tu
          cuenta ya están asociados y no hace falta volver a cargarlos.
        </p>
      </div>

      <div
        v-if="authStatus === 'loading'"
        class="rounded-md border border-brand-line bg-brand-surface p-4 text-sm text-brand-inkSoft"
        role="status"
      >
        Verificando la sesión...
      </div>

      <div
        v-else-if="authStatus === 'unauthenticated'"
        class="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        role="alert"
      >
        Para guardar el perfil, iniciá sesión con la cuenta que registraste.
        <RouterLink to="/login" class="font-semibold underline">Iniciar sesión</RouterLink>.
      </div>

      <div
        v-else-if="authStatus === 'forbidden'"
        class="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800"
        role="alert"
      >
        Esta sección está disponible únicamente para cuentas de cliente.
      </div>

      <div
        v-else-if="authStatus === 'error'"
        class="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-700"
        role="alert"
      >
        {{ feedback }}
      </div>

      <div
        v-else-if="feedback"
        class="mb-5 rounded-md border px-3 py-2 text-sm"
        :class="
          feedback.includes('correctamente')
            ? 'border-green-200 bg-green-50 text-green-800'
            : 'border-red-200 bg-red-50 text-red-700'
        "
        role="status"
      >
        {{ feedback }}
      </div>

      <form
        v-if="authStatus === 'authenticated'"
        class="space-y-5"
        @submit.prevent="handleSubmit"
      >
        <div class="grid gap-5 md:grid-cols-2">
          <div>
            <label class="mb-1.5 block text-xs text-brand-inkSoft">DNI / CUIT</label>
            <input
              v-model="form.dni_cuit"
              type="text"
              @blur="clearError('dni_cuit')"
              placeholder="20-12345678-9"
              required
              class="w-full rounded-[3px] border bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
              :class="errors.dni_cuit ? 'border-red-300' : 'border-brand-line'"
            />
            <p v-if="errors.dni_cuit" class="mt-1 text-xs text-red-600">{{ errors.dni_cuit }}</p>
          </div>

          <div>
            <label class="mb-1.5 block text-xs text-brand-inkSoft">Tipo de persona</label>
            <select
              v-model="form.tipo_persona"
              @change="clearError('tipo_persona')"
              class="w-full rounded-[3px] border bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
              :class="errors.tipo_persona ? 'border-red-300' : 'border-brand-line'"
            >
              <option value="">Seleccioná una opción</option>
              <option value="INDIVIDUAL">INDIVIDUAL</option>
              <option value="EMPRESA_PRODUCTOR">EMPRESA_PRODUCTOR</option>
            </select>
            <p v-if="errors.tipo_persona" class="mt-1 text-xs text-red-600">
              {{ errors.tipo_persona }}
            </p>
          </div>

          <div class="md:col-span-2">
            <label class="mb-1.5 block text-xs text-brand-inkSoft">Dirección urbana (opcional)</label>
            <input
              v-model="form.direccion_urbana"
              type="text"
              @blur="clearError('direccion_urbana')"
              placeholder="Calle, número, barrio"
              class="w-full rounded-[3px] border bg-brand-surface px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
              :class="errors.direccion_urbana ? 'border-red-300' : 'border-brand-line'"
            />
            <p v-if="errors.direccion_urbana" class="mt-1 text-xs text-red-600">
              {{ errors.direccion_urbana }}
            </p>
          </div>
        </div>

        <div class="rounded-xl border border-brand-line bg-brand-surface p-4">
          <label class="flex items-center gap-3 text-sm text-brand-ink">
            <input v-model="form.registrar_finca" type="checkbox" class="h-4 w-4" />
            <span>Quiero registrar una finca / establecimiento</span>
          </label>

          <div v-if="needsFarm" class="mt-4">
            <label class="mb-1.5 block text-xs text-brand-inkSoft">
              Nombre de la finca / establecimiento
            </label>
            <input
              v-model="form.nombre_finca"
              type="text"
              @blur="clearError('nombre_finca')"
              placeholder="Ej: Estancia La Esperanza"
              class="w-full rounded-[3px] border bg-white px-3 py-2.5 text-base text-brand-ink outline-none transition focus:border-brand-accent focus:ring-2 focus:ring-brand-accent/15"
              :class="errors.nombre_finca ? 'border-red-300' : 'border-brand-line'"
            />
            <p v-if="errors.nombre_finca" class="mt-1 text-xs text-red-600">
              {{ errors.nombre_finca }}
            </p>
          </div>
        </div>

        <button
          type="submit"
          :disabled="submitting"
          class="w-full rounded-[3px] bg-brand-accent py-3 text-sm font-semibold text-white transition hover:bg-brand-accentInk disabled:cursor-wait disabled:opacity-60"
        >
          {{ submitting ? 'Guardando...' : 'Guardar perfil' }}
        </button>
      </form>
    </section>
  </main>
</template>
