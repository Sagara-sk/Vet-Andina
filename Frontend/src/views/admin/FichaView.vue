<script setup lang="ts">
import {
  guardarFichaOffline,
  obtenerFichaOffline,
   guardarBorradorFicha,
} from '@/services/indexedDB'

import { computed, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import {
  addClinicalEntry,
  addErratum,
  getMedicalRecord,
  updateMedicalRecord,
  type MedicalRecord,
  type MedicalRecordStatus,
} from '@/services/fichas'

const props = defineProps<{ id: string }>()

const session = useSessionStore()
const rol = computed(() => session.user?.rol)

const canManageRecord = computed(() =>
  ['SUPERADMIN', 'VETERINARIO', 'ADMINISTRATIVO'].includes(rol.value ?? ''),
)

const ficha = ref<MedicalRecord | null>(null)
const error = ref('')
const success = ref('')
const loading = ref(false)
const savingRecord = ref(false)
const savingEntry = ref(false)
const savingErratum = ref(false)

const allergiesHistory = ref('')
const status = ref<MedicalRecordStatus>('ACTIVO')

const modality = ref<'URBANO' | 'RURAL'>('URBANO')
const reason = ref('')
const diagnosis = ref('')
const treatment = ref('')
const vaccines = ref('')

const selectedErratum = ref<string | null>(null)
const erratumDetail = ref('')

const fechaHora = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})

const fecha = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
})

const backRoute = computed(() => {
  if (rol.value === 'VETERINARIO') {
    return { name: 'vet-fichas' }
  }

  if (rol.value === 'CLIENTE') {
    return ficha.value?.animal.careType === 'RURAL'
      ? { name: 'panel-establecimientos' }
      : { name: 'panel-mascotas' }
  }

  return { name: 'admin-fichas' }
})

function syncForm() {
  if (!ficha.value) return

  allergiesHistory.value = ficha.value.record?.allergiesHistory ?? ''
  status.value = ficha.value.record?.status ?? 'ACTIVO'
  modality.value =
    ficha.value.animal.careType === 'RURAL' ? 'RURAL' : 'URBANO'
}
async function cargar() {
  loading.value = true
  error.value = ''
  success.value = ''
  ficha.value = null

  try {
    const userId = session.user?.id

    if (!userId) {
      error.value = 'No se pudo identificar al usuario de la sesión.'
      return
    }

    // Si no hay conexión, recuperar la última copia local.
    if (!navigator.onLine) {
      const cache = await obtenerFichaOffline(userId, props.id)

      if (!cache) {
        error.value = 'No hay conexión y esta ficha no fue descargada previamente.'
        return
      }

      ficha.value = cache.ficha
      syncForm()

      success.value = `Mostrando copia local guardada el ${fechaHora.format(
        new Date(cache.descargadaEn),
      )}.`

      return
    }

    // Con conexión, consultar el servidor.
    const fichaOnline = await getMedicalRecord(props.id)

    ficha.value = fichaOnline
    syncForm()

    // Guardar una copia local para futuras consultas offline.
    try {
      await guardarFichaOffline(userId, fichaOnline)
    } catch (cacheError) {
      console.error('No se pudo guardar la ficha', cacheError)
     error.value = 'La ficha se consultó correctamente, pero no se pudo guardar para usarla sin conexión.'
    }
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : 'No fue posible obtener la ficha.'
  } finally {
    loading.value = false
  }
}
async function guardarFicha() {
  if (!ficha.value || !canManageRecord.value) return

  savingRecord.value = true
  error.value = ''
  success.value = ''

  try {
    ficha.value = await updateMedicalRecord(props.id, {
      alergiasAntecedentes: allergiesHistory.value.trim() || null,
      estado: status.value,
    })

    syncForm()
    success.value = 'Los datos generales de la ficha fueron actualizados.'
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : 'No fue posible actualizar la ficha.'
  } finally {
    savingRecord.value = false
  }
}

async function guardarEvolucion() {
  if (!ficha.value || !canManageRecord.value) return

  if (reason.value.trim().length < 2) {
    error.value = 'Ingresá un motivo de consulta válido.'
    return
  }

  savingEntry.value = true
  error.value = ''
  success.value = ''

  try {
    const vacunasAplicadas = vaccines.value
      .split(',')
      .map((vacuna) => vacuna.trim())
      .filter(Boolean)

    const payload = {
      modalidad: modality.value,
      tipoRegistro: 'CONSULTA' as const,
      fechaAtencion: null,
      motivoConsulta: reason.value.trim(),
      diagnostico: diagnosis.value.trim() || null,
      tratamiento: treatment.value.trim() || null,
      vacunasAplicadas,
      detalles: {},
    }

    if (!navigator.onLine) {
      const user = session.user

      if (!user?.id) {
        throw new Error('No se pudo identificar al usuario de la sesión.')
      }

      await guardarBorradorFicha({
        id: crypto.randomUUID(),
        userId: user.id,
        animalId: props.id,
        authorId: user.id,
        authorName: user.nombreCompleto,
        queuedAt: new Date().toISOString(),
        payload,
      })

      success.value = 'Evolución guardada localmente. Se sincronizará cuando vuelva la conexión.'
    } else {
      ficha.value = await addClinicalEntry(props.id, payload)

      success.value = 'La evolución clínica fue registrada correctamente.'
    }

    reason.value = ''
    diagnosis.value = ''
    treatment.value = ''
    vaccines.value = ''
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : 'No fue posible registrar la evolución.'
  } finally {
    savingEntry.value = false
  }
}
async function guardarFeErratas(evolutionId: string) {
  if (!ficha.value || !canManageRecord.value) return

  if (erratumDetail.value.trim().length < 3) {
    error.value = 'La fe de erratas debe contener una explicación.'
    return
  }

  savingErratum.value = true
  error.value = ''
  success.value = ''

  try {
    ficha.value = await addErratum(props.id, evolutionId, {
      detalle: erratumDetail.value.trim(),
    })

    selectedErratum.value = null
    erratumDetail.value = ''

    success.value = 'La fe de erratas fue registrada correctamente.'
  } catch (e) {
    error.value =
      e instanceof Error ? e.message : 'No fue posible registrar la corrección.'
  } finally {
    savingErratum.value = false
  }
}

function vacunasTexto(vacunas: unknown): string {
  if (Array.isArray(vacunas)) {
    return vacunas.join(', ')
  }

  return typeof vacunas === 'string' ? vacunas : ''
}

watch(() => props.id, cargar, { immediate: true })
</script>

<template>
  <div class="mx-auto max-w -[900px]">
    <RouterLink :to="backRoute" class="text-xs text-brand-inkSoft hover:text-brand-ink">
      ← Fichas
    </RouterLink>

    <p v-if="loading" class="mt-5 text-sm text-brand-inkSoft" role="status">
      Cargando ficha médica...
    </p>

    <p v-if="error"
      class="mt-5 border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert">
      {{ error }}
    </p>

    <p v-if="success" class="mt-5 border border-brand-line bg-brand-muted px-4 py-3 text-sm text-brand-ink"
      role="status">
      {{ success }}
    </p>

    <template v-if="ficha">
      <header class="mt-3">
        <h1 class="font-serif text-3xl text-brand-ink">
          {{ ficha.animal.name }}
        </h1>

        <p class="mt-2 text-sm text-brand-inkSoft">
          {{ ficha.animal.species }}
          <span v-if="ficha.animal.breed"> · {{ ficha.animal.breed }}</span>
          · {{ ficha.animal.careType === 'RURAL' ? 'Rural' : 'Urbano' }}
          <span v-if="ficha.animal.herdSize > 1">
            · {{ ficha.animal.herdSize }} cabezas
          </span>
          <span v-if="ficha.animal.birthDate">
            · Nació el
            {{ fecha.format(new Date(`${ficha.animal.birthDate}T00:00`)) }}
          </span>
        </p>

        <p class="mt-1 text-sm text-brand-inkSoft">
          Tutor: {{ ficha.tutor.fullName }} · {{ ficha.tutor.phone }}
        </p>
      </header>

      <section class="mt-6 border border-brand-line bg-brand-surface p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <h2 class="text-base text-brand-ink">Ficha médica</h2>
          <span class="text-xs text-brand-inkSoft">
            Apertura:
            {{
              ficha.record
                ? fecha.format(new Date(ficha.record.openedAt))
                : 'Sin fecha'
            }}
          </span>
        </div>

        <p v-if="!ficha.record" class="mt-3 text-sm text-brand-inkSoft">
          Este animal todavía no tiene una ficha médica asociada.
        </p>

        <template v-else>
          <div class="mt-5 grid gap-5">
            <div>
              <label for="record-status" class="mb-2 block text-sm text-brand-ink">
                Estado de la ficha
              </label>

              <select id="record-status" v-model="status" :disabled="!canManageRecord || savingRecord"
                class="field-input w-full">
                <option value="ACTIVO">Activa</option>
                <option value="INACTIVO">Inactiva</option>
                <option value="FALLECIDO">Fallecido</option>
              </select>
            </div>

            <div>
              <label for="record-history" class="mb-2 block text-sm text-brand-ink">
                Alergias y antecedentes
              </label>

              <textarea id="record-history" v-model="allergiesHistory" :disabled="!canManageRecord || savingRecord"
                rows="5" maxlength="10000" class="field-input w-full resize-y"
                placeholder="Antecedentes, alergias y observaciones relevantes..." />
            </div>

            <button v-if="canManageRecord" type="button" :disabled="savingRecord"
              class="w-fit bg-brand-ink px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              @click="guardarFicha">
              {{ savingRecord ? 'Guardando...' : 'Guardar datos generales' }}
            </button>

            <p v-else class="text-xs text-brand-inkSoft">
              Los datos generales se muestran en modo de solo lectura.
            </p>
          </div>
        </template>
      </section>

      <section class="mt-7">
        <h2 class="text-base text-brand-ink">Evoluciones clínicas</h2>

        <p v-if="!ficha.entries.length" class="mt-3 text-sm text-brand-inkSoft">
          Sin evoluciones registradas.
        </p>

        <ol v-else class="mt-4 space-y-3">
          <li v-for="e in ficha.entries" :key="e.id" class="border bg-brand-surface p-5" :class="e.isErratum
            ? 'border-brand-warnLine'
            : 'border-brand-line'
            ">
            <p class="text-xs text-brand-inkSoft">
              {{ fechaHora.format(new Date(e.recordedAt)) }}
              · {{ e.authorName }}
              · {{ e.modality === 'RURAL' ? 'Visita rural' : 'Consultorio' }}

              <span v-if="e.isErratum" class="text-brand-warnInk">
                · Fe de erratas
              </span>
            </p>

            <p class="mt-2 text-sm text-brand-ink">
              {{ e.reason }}
            </p>

            <p v-if="e.diagnosis" class="mt-2 text-sm">
              <span class="text-brand-inkSoft">Diagnóstico:</span>
              {{ e.diagnosis }}
            </p>

            <p v-if="e.treatment" class="mt-1 text-sm">
              <span class="text-brand-inkSoft">Tratamiento:</span>
              {{ e.treatment }}
            </p>

            <p v-if="vacunasTexto(e.vaccines)" class="mt-1 text-sm">
              <span class="text-brand-inkSoft">Vacunas:</span>
              {{ vacunasTexto(e.vaccines) }}
            </p>

            <div v-if="e.isErratum" class="mt-3 border-l-2 border-brand-warnLine pl-3">
              <p class="text-xs text-brand-warnInk">
                Corrección de la evolución:
                {{ e.referencedEntryId }}
              </p>
              <p class="mt-1 whitespace-pre-line text-sm">
                {{ e.erratumDetail || e.reason }}
              </p>
            </div>

            <div v-if="
              canManageRecord &&
              !e.isErratum &&
              !e.referencedEntryId
            " class="mt-4 border-t border-brand-line pt-3">
              <button v-if="selectedErratum !== e.id" type="button"
                class="text-xs text-brand-inkSoft underline hover:text-brand-ink" @click="selectedErratum = e.id">
                Registrar fe de erratas
              </button>

              <div v-else class="space-y-3">
                <label :for="`erratum-${e.id}`" class="block text-sm text-brand-ink">
                  Motivo y detalle de la corrección
                </label>

                <textarea :id="`erratum-${e.id}`" v-model="erratumDetail" rows="3" maxlength="10000"
                  class="field-input w-full resize-y"
                  placeholder="Explicá qué dato debe corregirse y cuál es el correcto..." />

                <div class="flex flex-wrap gap-3">
                  <button type="button" :disabled="savingErratum"
                    class="bg-brand-ink px-4 py-2 text-xs text-white disabled:opacity-50"
                    @click="guardarFeErratas(e.id)">
                    {{ savingErratum ? 'Guardando...' : 'Guardar corrección' }}
                  </button>

                  <button type="button" class="px-4 py-2 text-xs text-brand-inkSoft underline" @click="
                    selectedErratum = null;
                  erratumDetail = ''
                    ">
                    Cancelar
                  </button>
                </div>
              </div>
            </div>
          </li>
        </ol>
      </section>

      <section v-if="canManageRecord" class="mt-7 border border-brand-line bg-brand-surface p-6">
        <h2 class="text-base text-brand-ink">
          Registrar evolución clínica
        </h2>

        <p class="mt-1 text-xs text-brand-inkSoft">
          Una vez guardada, la evolución no podrá editarse ni eliminarse.
        </p>

        <form class="mt-5 space-y-4" @submit.prevent="guardarEvolucion">
          <div>
            <label for="entry-modality" class="mb-2 block text-sm">
              Modalidad
            </label>

            <select id="entry-modality" v-model="modality" class="field-input w-full">
              <option value="URBANO">Consultorio (urbano)</option>
              <option value="RURAL">Rural</option>
            </select>
          </div>

          <div>
            <label for="entry-reason" class="mb-2 block text-sm">
              Motivo de consulta
            </label>

            <textarea id="entry-reason" v-model="reason" required minlength="2" maxlength="5000" rows="3"
              class="field-input w-full resize-y" />
          </div>

          <div>
            <label for="entry-diagnosis" class="mb-2 block text-sm">
              Diagnóstico
            </label>

            <textarea id="entry-diagnosis" v-model="diagnosis" maxlength="5000" rows="3"
              class="field-input w-full resize-y" />
          </div>

          <div>
            <label for="entry-treatment" class="mb-2 block text-sm">
              Tratamiento
            </label>

            <textarea id="entry-treatment" v-model="treatment" maxlength="5000" rows="3"
              class="field-input w-full resize-y" />
          </div>

          <div>
            <label for="entry-vaccines" class="mb-2 block text-sm">
              Vacunas aplicadas
            </label>

            <input id="entry-vaccines" v-model="vaccines" type="text" class="field-input w-full"
              placeholder="Ej.: Antirrábica, Séxtuple" />

            <p class="mt-1 text-xs text-brand-inkSoft">
              Si cargás más de una, separalas con comas.
            </p>
          </div>

          <button type="submit" :disabled="savingEntry"
            class="bg-brand-ink px-5 py-2.5 text-sm text-white transition-opacity hover:opacity-90 disabled:opacity-50">
            {{ savingEntry ? 'Registrando...' : 'Registrar evolución' }}
          </button>
        </form>
      </section>
    </template>
  </div>
</template>
