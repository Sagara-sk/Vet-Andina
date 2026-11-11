<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { useSessionStore } from '@/stores/session'
import {
  addClinicalEntry,
  addErratum,
  getMedicalRecord,
  updateMedicalRecord,
  type ClinicalEntry,
  type ClinicalEntryKind,
  type MedicalRecord,
  type MedicalRecordStatus,
  type NewClinicalEntryPayload,
} from '@/services/fichas'
import {
  guardarBorradorFicha,
  guardarFichaOffline,
  obtenerBorradoresFicha,
  obtenerFichaOffline,
  type BorradorFichaLocal,
} from '@/services/indexedDB'

const props = defineProps<{ id: string }>()
const session = useSessionStore()
const role = computed(() => session.user?.rol)
const canManageRecord = computed(() =>
  ['SUPERADMIN', 'VETERINARIO', 'ADMINISTRATIVO'].includes(role.value ?? ''),
)

const ficha = ref<MedicalRecord | null>(null)
const drafts = ref<BorradorFichaLocal[]>([])
const loading = ref(false)
const connected = ref(navigator.onLine)
const usingCachedRecord = ref(false)
const savingRecord = ref(false)
const savingEntry = ref(false)
const savingErratum = ref(false)
const error = ref('')
const success = ref('')
const offlineNotice = ref('')
const cachedAt = ref<string | null>(null)

const allergiesHistory = ref('')
const status = ref<MedicalRecordStatus>('ACTIVO')
const kind = ref<ClinicalEntryKind>('CONSULTA')
const attendedAt = ref(currentLocalDateTime())
const reason = ref('')
const diagnosis = ref('')
const treatment = ref('')
const weightKg = ref('')
const vaccine = ref('')
const product = ref('')
const dose = ref('')
const nextDate = ref('')
const treatedCount = ref('')
const populationEvent = ref('')
const affectedCount = ref('')
const selectedErratum = ref<string | null>(null)
const erratumDetail = ref('')

const isLot = computed(() => ficha.value?.animal.careType === 'RURAL')
const canWriteOnline = computed(() => connected.value && !usingCachedRecord.value)
const backRoute = computed(() => {
  if (role.value === 'VETERINARIO') return { name: 'vet-fichas' }
  if (role.value === 'CLIENTE') {
    return isLot.value ? { name: 'panel-establecimientos' } : { name: 'panel-mascotas' }
  }
  return { name: 'admin-fichas' }
})

const entries = computed(() =>
  [...(ficha.value?.entries ?? [])].sort(
    (a, b) => Date.parse(b.attendedAt || b.recordedAt) - Date.parse(a.attendedAt || a.recordedAt),
  ),
)
const weightEntries = computed(() =>
  entries.value.filter((entry) => entry.kind === 'PESO' && !entry.isErratum),
)
const vaccineEntries = computed(() =>
  entries.value.filter((entry) => entry.kind === 'VACUNA' && !entry.isErratum),
)
const dewormingEntries = computed(() =>
  entries.value.filter((entry) => entry.kind === 'DESPARASITACION' && !entry.isErratum),
)
const groupTreatmentEntries = computed(() =>
  entries.value.filter((entry) => entry.kind === 'TRATAMIENTO_GRUPAL' && !entry.isErratum),
)
const populationEventEntries = computed(() =>
  entries.value.filter((entry) => entry.kind === 'EVENTO_POBLACIONAL' && !entry.isErratum),
)
const latestWeight = computed(() => weightEntries.value[0]?.details.pesoKg)

const fechaHora = new Intl.DateTimeFormat('es-AR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' })

function currentLocalDateTime(): string {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function formatDate(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T12:00:00` : value)
  return Number.isNaN(parsed.getTime()) ? '—' : fecha.format(parsed)
}

function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—'
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? '—' : fechaHora.format(parsed)
}

function recordKindLabel(entry: ClinicalEntry): string {
  const labels: Record<ClinicalEntryKind, string> = {
    CONSULTA: 'Consulta',
    PESO: 'Control de peso',
    VACUNA: 'Vacunación',
    DESPARASITACION: 'Desparasitación',
    TRATAMIENTO_GRUPAL: 'Tratamiento grupal',
    EVENTO_POBLACIONAL: 'Evento poblacional',
  }
  return labels[entry.kind] ?? 'Evolución'
}

function entryDetails(entry: ClinicalEntry): string[] {
  const details = entry.details ?? {}
  const result: string[] = []

  if (details.pesoKg !== undefined) result.push(`Peso: ${details.pesoKg} kg`)
  if (details.vacuna) result.push(`Vacuna: ${details.vacuna}`)
  if (details.producto) result.push(`Producto: ${details.producto}`)
  if (details.dosis) result.push(`Dosis: ${details.dosis}`)
  if (details.proximaFecha) {
    result.push(`Próxima aplicación: ${formatDate(details.proximaFecha)}`)
  }
  if (details.cantidadTratada !== undefined) {
    result.push(`Animales tratados: ${details.cantidadTratada}`)
  }
  if (details.evento) result.push(`Evento: ${details.evento}`)
  if (details.cantidadAfectada !== undefined) {
    result.push(`Animales afectados: ${details.cantidadAfectada}`)
  }

  return result
}

function vacunasTexto(vacunas: unknown): string {
  if (Array.isArray(vacunas)) return vacunas.join(', ')
  return typeof vacunas === 'string' ? vacunas : ''
}

function syncForm() {
  if (!ficha.value) return

  allergiesHistory.value = ficha.value.record?.allergiesHistory ?? ''
  status.value = ficha.value.record?.status ?? 'ACTIVO'
  kind.value = isLot.value ? 'TRATAMIENTO_GRUPAL' : 'CONSULTA'
}

async function loadDrafts(userId: string, animalId: string) {
  try {
    drafts.value = await obtenerBorradoresFicha(userId, animalId)
  } catch (e) {
    offlineNotice.value =
      e instanceof Error
        ? `No se pudieron leer los borradores locales: ${e.message}`
        : 'No se pudieron leer los borradores locales.'
  }
}

async function cargar() {
  loading.value = true
  error.value = ''
  success.value = ''
  offlineNotice.value = ''
  ficha.value = null
  cachedAt.value = null
  drafts.value = []
  usingCachedRecord.value = false

  const user = session.user

  try {
    const record = await getMedicalRecord(props.id)
    usingCachedRecord.value = false
    ficha.value = record
    syncForm()

    if (user) {
      try {
        const cached = await obtenerFichaOffline(user.id, props.id)
        cachedAt.value = cached?.descargadaEn ?? null
      } catch (e) {
        offlineNotice.value =
          e instanceof Error
            ? `La ficha se cargó, pero no se pudo consultar la copia local: ${e.message}`
            : 'La ficha se cargó, pero no se pudo consultar la copia local.'
      }
      await loadDrafts(user.id, props.id)
    }
  } catch (e) {
    if (user && (!navigator.onLine || e instanceof TypeError)) {
      try {
        const cached = await obtenerFichaOffline(user.id, props.id)
        if (cached) {
          usingCachedRecord.value = true
          ficha.value = cached.ficha
          cachedAt.value = cached.descargadaEn
          syncForm()
          offlineNotice.value =
            'Estás viendo una copia local. Puede estar desactualizada y no reemplaza la ficha del servidor.'
          await loadDrafts(user.id, props.id)
          return
        }
      } catch (cacheError) {
        error.value =
          cacheError instanceof Error
            ? `No se pudo consultar la ficha ni leer la copia local: ${cacheError.message}`
            : 'No se pudo consultar la ficha ni leer la copia local.'
        return
      }
    }

    error.value = e instanceof Error ? e.message : 'No fue posible obtener la ficha.'
  } finally {
    loading.value = false
  }
}

async function guardarCopiaOffline() {
  if (!ficha.value || !session.user || !canWriteOnline.value) return

  error.value = ''
  try {
    const cached = await guardarFichaOffline(session.user.id, ficha.value)
    cachedAt.value = cached.descargadaEn
    success.value = 'La copia de esta ficha quedó guardada en este dispositivo para tu cuenta.'
  } catch (e) {
    error.value =
      e instanceof Error
        ? `No se pudo guardar la copia offline: ${e.message}`
        : 'No se pudo guardar la copia offline.'
  }
}

async function actualizarCopiaSiExiste(record: MedicalRecord) {
  if (!session.user || !cachedAt.value) return

  try {
    const cached = await guardarFichaOffline(session.user.id, record)
    cachedAt.value = cached.descargadaEn
  } catch (e) {
    offlineNotice.value =
      e instanceof Error
        ? `Cambios guardados en el servidor; no se pudo actualizar la copia local: ${e.message}`
        : 'Cambios guardados en el servidor; no se pudo actualizar la copia local.'
  }
}

async function guardarFicha() {
  if (!ficha.value || !canManageRecord.value || !canWriteOnline.value) return

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
    await actualizarCopiaSiExiste(ficha.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No fue posible actualizar la ficha.'
  } finally {
    savingRecord.value = false
  }
}

function buildPayload(): NewClinicalEntryPayload | null {
  if (!ficha.value) return null

  const details: NewClinicalEntryPayload['detalles'] = {}
  const animalCount = ficha.value.animal.herdSize

  if (kind.value === 'PESO') {
    const parsedWeight = Number(weightKg.value)
    if (!Number.isFinite(parsedWeight) || parsedWeight <= 0) {
      error.value = 'Ingresá un peso mayor a cero.'
      return null
    }
    details.pesoKg = parsedWeight
  }

  if (kind.value === 'VACUNA') {
    if (vaccine.value.trim().length < 2) {
      error.value = 'Ingresá el nombre de la vacuna aplicada.'
      return null
    }
    details.vacuna = vaccine.value.trim()
    details.proximaFecha = nextDate.value || undefined
  }

  if (kind.value === 'DESPARASITACION') {
    if (product.value.trim().length < 2) {
      error.value = 'Ingresá el producto utilizado para desparasitar.'
      return null
    }
    details.producto = product.value.trim()
    details.dosis = dose.value.trim() || undefined
    details.proximaFecha = nextDate.value || undefined
  }

  if (kind.value === 'TRATAMIENTO_GRUPAL') {
    const count = Number(treatedCount.value)
    if (product.value.trim().length < 2 || !Number.isInteger(count) || count < 1) {
      error.value = 'Ingresá el producto y la cantidad de animales tratados.'
      return null
    }
    if (count > animalCount) {
      error.value = `La cantidad tratada no puede superar las ${animalCount} cabezas del lote.`
      return null
    }
    details.producto = product.value.trim()
    details.dosis = dose.value.trim() || undefined
    details.cantidadTratada = count
  }

  if (kind.value === 'EVENTO_POBLACIONAL') {
    const count = Number(affectedCount.value)
    if (populationEvent.value.trim().length < 2 || !Number.isInteger(count) || count < 1) {
      error.value = 'Describí el evento e ingresá cuántos animales afectó.'
      return null
    }
    if (count > animalCount) {
      error.value = `La cantidad afectada no puede superar las ${animalCount} cabezas del lote.`
      return null
    }
    details.evento = populationEvent.value.trim()
    details.cantidadAfectada = count
  }

  const occurredAt = attendedAt.value ? new Date(attendedAt.value) : null
  if (occurredAt && Number.isNaN(occurredAt.getTime())) {
    error.value = 'Ingresá una fecha y hora de atención válidas.'
    return null
  }

  const vaccineApplied = kind.value === 'VACUNA' && details.vacuna ? [details.vacuna] : []

  return {
    modalidad: isLot.value ? 'RURAL' : 'URBANO',
    tipoRegistro: kind.value,
    fechaAtencion: occurredAt?.toISOString() ?? null,
    motivoConsulta: reason.value.trim(),
    diagnostico: diagnosis.value.trim() || null,
    tratamiento: treatment.value.trim() || null,
    vacunasAplicadas: vaccineApplied,
    detalles: details,
  }
}

function clearEntryForm() {
  reason.value = ''
  diagnosis.value = ''
  treatment.value = ''
  weightKg.value = ''
  vaccine.value = ''
  product.value = ''
  dose.value = ''
  nextDate.value = ''
  treatedCount.value = ''
  populationEvent.value = ''
  affectedCount.value = ''
  attendedAt.value = currentLocalDateTime()
}

async function guardarEvolucion() {
  if (!ficha.value || !canManageRecord.value) return

  error.value = ''
  success.value = ''
  if (reason.value.trim().length < 2) {
    error.value = 'Ingresá un motivo o descripción de al menos 2 caracteres.'
    return
  }

  const payload = buildPayload()
  if (!payload) return

  const user = session.user
  if (!user) {
    error.value = 'La sesión ya no está disponible. Volvé a iniciar sesión.'
    return
  }

  savingEntry.value = true
  try {
    if (!canWriteOnline.value) {
      const draft: BorradorFichaLocal = {
        id: crypto.randomUUID(),
        userId: user.id,
        animalId: props.id,
        authorId: user.id,
        authorName: user.nombreCompleto,
        queuedAt: new Date().toISOString(),
        payload,
      }
      await guardarBorradorFicha(draft)
      drafts.value = [...drafts.value, draft]
      success.value =
        'Borrador guardado en este dispositivo. Todavía no forma parte de la ficha del servidor ni se sincronizará automáticamente.'
      clearEntryForm()
      return
    }

    ficha.value = await addClinicalEntry(props.id, payload)
    success.value = 'El registro clínico fue agregado a la ficha.'
    clearEntryForm()
    await actualizarCopiaSiExiste(ficha.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No fue posible registrar el evento.'
  } finally {
    savingEntry.value = false
  }
}

async function guardarFeErratas(evolutionId: string) {
  if (!ficha.value || !canManageRecord.value || !canWriteOnline.value) return
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
    success.value = 'La corrección se agregó como una nueva entrada trazable.'
    await actualizarCopiaSiExiste(ficha.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No fue posible registrar la corrección.'
  } finally {
    savingErratum.value = false
  }
}

function cancelarFeErratas() {
  selectedErratum.value = null
  erratumDetail.value = ''
}

function updateConnection() {
  connected.value = navigator.onLine
  if (connected.value && usingCachedRecord.value) {
    offlineNotice.value =
      'Se recuperó la conexión. Actualizá la ficha desde el servidor antes de registrar cambios oficiales.'
  }
}

watch(
  () => props.id,
  () => cargar(),
  { immediate: true },
)
watch(isLot, (lot) => {
  kind.value = lot ? 'TRATAMIENTO_GRUPAL' : 'CONSULTA'
})
onMounted(() => {
  window.addEventListener('online', updateConnection)
  window.addEventListener('offline', updateConnection)
})
onUnmounted(() => {
  window.removeEventListener('online', updateConnection)
  window.removeEventListener('offline', updateConnection)
})
</script>

<template>
  <div class="mx-auto max-w-[1050px]">
    <RouterLink :to="backRoute" class="text-xs text-brand-inkSoft hover:text-brand-ink">
      ← Volver
    </RouterLink>

    <div
      class="mt-4 flex flex-wrap items-center gap-2 text-xs"
      :class="canWriteOnline ? 'text-brand-accentInk' : 'text-brand-warnInk'"
      role="status"
    >
      <span
        class="h-2 w-2 rounded-full"
        :class="canWriteOnline ? 'bg-brand-accent' : 'bg-brand-warnInk'"
      />
      {{
        usingCachedRecord
          ? connected
            ? 'Con conexión · copia sin revalidar'
            : 'Sin conexión · copia local'
          : connected
            ? 'Con conexión'
            : 'Sin conexión'
      }}
      <span v-if="cachedAt" class="text-brand-inkSoft">
        · Copia local: {{ formatDateTime(cachedAt) }}
      </span>
    </div>

    <p v-if="loading" class="mt-5 text-sm text-brand-inkSoft" role="status">Cargando ficha...</p>

    <div
      v-if="error"
      class="mt-5 flex flex-wrap items-center justify-between gap-3 border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
      <button type="button" class="underline" @click="cargar">Reintentar</button>
    </div>

    <p
      v-if="offlineNotice"
      class="mt-5 border border-brand-warnLine bg-brand-warnSoft px-4 py-3 text-sm text-brand-warnInk"
      role="status"
    >
      {{ offlineNotice }}
    </p>

    <p
      v-if="success"
      class="mt-5 border border-brand-line bg-brand-muted px-4 py-3 text-sm text-brand-ink"
      role="status"
    >
      {{ success }}
    </p>

    <template v-if="ficha">
      <header class="mt-5 border border-brand-line bg-brand-surface p-5 sm:p-7">
        <p class="text-xs font-semibold uppercase tracking-wide text-brand-accentInk">
          {{ isLot ? 'Ficha de lote rural' : 'Ficha individual de mascota' }}
        </p>
        <div class="mt-2 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 class="font-serif text-3xl text-brand-ink">
              {{ ficha.animal.name }}
            </h1>
            <p class="mt-2 text-sm text-brand-inkSoft">
              {{ ficha.animal.species }}
              <span v-if="ficha.animal.breed"> · {{ ficha.animal.breed }}</span>
              <template v-if="isLot">
                · {{ ficha.animal.herdSize }} cabezas
                <span v-if="ficha.animal.farmName"> · {{ ficha.animal.farmName }}</span>
                <span v-if="ficha.animal.farmLocality"> · {{ ficha.animal.farmLocality }}</span>
              </template>
              <template v-else-if="ficha.animal.birthDate">
                · Nacimiento: {{ formatDate(ficha.animal.birthDate) }}
              </template>
            </p>
          </div>
          <span class="border border-brand-line bg-brand-muted px-3 py-1 text-xs text-brand-ink">
            {{ isLot ? 'Manejo poblacional' : 'Seguimiento individual' }}
          </span>
          <button
            v-if="canWriteOnline"
            type="button"
            class="border border-brand-line px-3 py-2 text-xs text-brand-ink hover:bg-brand-accentSoft disabled:opacity-50"
            :disabled="loading"
            @click="guardarCopiaOffline"
          >
            {{ cachedAt ? 'Actualizar copia offline' : 'Guardar copia offline' }}
          </button>
          <button
            v-if="usingCachedRecord && connected"
            type="button"
            class="border border-brand-line px-3 py-2 text-xs text-brand-ink hover:bg-brand-accentSoft"
            :disabled="loading"
            @click="cargar"
          >
            Revalidar desde el servidor
          </button>
        </div>
        <p class="mt-4 text-xs text-brand-inkSoft">
          Responsable: {{ ficha.tutor.fullName }}
          <span v-if="ficha.tutor.phone"> · {{ ficha.tutor.phone }}</span>
        </p>
      </header>

      <dl v-if="isLot" class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="border border-brand-line bg-brand-surface p-4">
          <dt class="text-xs text-brand-inkSoft">Cabezas registradas</dt>
          <dd class="mt-1 text-2xl text-brand-ink">{{ ficha.animal.herdSize }}</dd>
        </div>
        <div class="border border-brand-line bg-brand-surface p-4">
          <dt class="text-xs text-brand-inkSoft">Tratamientos grupales</dt>
          <dd class="mt-1 text-2xl text-brand-ink">{{ groupTreatmentEntries.length }}</dd>
        </div>
        <div class="border border-brand-line bg-brand-surface p-4">
          <dt class="text-xs text-brand-inkSoft">Eventos poblacionales</dt>
          <dd class="mt-1 text-2xl text-brand-ink">{{ populationEventEntries.length }}</dd>
        </div>
      </dl>

      <dl v-else class="mt-4 grid gap-3 sm:grid-cols-3">
        <div class="border border-brand-line bg-brand-surface p-4">
          <dt class="text-xs text-brand-inkSoft">Último peso registrado</dt>
          <dd class="mt-1 text-2xl text-brand-ink">
            {{ latestWeight !== undefined ? `${latestWeight} kg` : 'Sin dato' }}
          </dd>
        </div>
        <div class="border border-brand-line bg-brand-surface p-4">
          <dt class="text-xs text-brand-inkSoft">Vacunaciones</dt>
          <dd class="mt-1 text-2xl text-brand-ink">{{ vaccineEntries.length }}</dd>
        </div>
        <div class="border border-brand-line bg-brand-surface p-4">
          <dt class="text-xs text-brand-inkSoft">Desparasitaciones</dt>
          <dd class="mt-1 text-2xl text-brand-ink">{{ dewormingEntries.length }}</dd>
        </div>
      </dl>

      <section class="mt-5 border border-brand-line bg-brand-surface p-5 sm:p-6">
        <div class="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 class="text-base font-semibold text-brand-ink">
              {{ isLot ? 'Datos generales del lote' : 'Datos generales de la mascota' }}
            </h2>
            <p class="mt-1 text-xs text-brand-inkSoft">
              Ficha abierta: {{ ficha.record ? formatDate(ficha.record.openedAt) : 'sin fecha' }}
            </p>
          </div>
          <span
            v-if="ficha.record"
            class="border border-brand-line px-2.5 py-1 text-xs text-brand-ink"
          >
            {{ ficha.record.status }}
          </span>
        </div>

        <p v-if="!ficha.record" class="mt-4 text-sm text-brand-inkSoft">
          Todavía no hay datos generales asociados. Se crearán al guardar desde el personal.
        </p>

        <div class="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label for="record-status" class="field-label">
              {{ isLot ? 'Estado del lote' : 'Estado de la ficha' }}
            </label>
            <select
              id="record-status"
              v-model="status"
              :disabled="!canManageRecord || savingRecord || !canWriteOnline"
              class="field-input"
            >
              <option value="ACTIVO">Activo</option>
              <option value="INACTIVO">Inactivo</option>
              <option v-if="!isLot || status === 'FALLECIDO'" value="FALLECIDO">Fallecido</option>
            </select>
          </div>
          <div class="sm:col-span-2">
            <label for="record-history" class="field-label">
              {{
                isLot
                  ? 'Antecedentes sanitarios y observaciones del lote'
                  : 'Alergias y antecedentes'
              }}
            </label>
            <textarea
              id="record-history"
              v-model="allergiesHistory"
              :disabled="!canManageRecord || savingRecord || !canWriteOnline"
              rows="4"
              maxlength="10000"
              class="field-input resize-y"
              :placeholder="
                isLot
                  ? 'Antecedentes sanitarios del rodeo...'
                  : 'Alergias, antecedentes y observaciones relevantes...'
              "
            />
          </div>
        </div>
        <div v-if="canManageRecord" class="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            class="bg-brand-accent px-4 py-2.5 text-sm text-brand-bg disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="savingRecord || !canWriteOnline"
            @click="guardarFicha"
          >
            {{ savingRecord ? 'Guardando...' : 'Guardar datos generales' }}
          </button>
          <p v-if="!canWriteOnline" class="text-xs text-brand-warnInk">
            La edición de datos generales requiere conexión para evitar sobrescribir cambios
            concurrentes.
          </p>
        </div>
        <p v-else class="mt-4 text-xs text-brand-inkSoft">
          Consulta de solo lectura. Los cambios clínicos los registra el personal veterinario.
        </p>
      </section>

      <section v-if="!isLot" class="mt-5 grid gap-5 lg:grid-cols-2">
        <div class="border border-brand-line bg-brand-surface p-5">
          <h2 class="text-base font-semibold text-brand-ink">Control de peso</h2>
          <ol v-if="weightEntries.length" class="mt-4 space-y-3">
            <li
              v-for="entry in weightEntries"
              :key="entry.id"
              class="border-t border-brand-line pt-3"
            >
              <p class="font-medium text-brand-ink">{{ entry.details.pesoKg }} kg</p>
              <p class="mt-1 text-xs text-brand-inkSoft">
                {{ formatDateTime(entry.attendedAt || entry.recordedAt) }} · {{ entry.authorName }}
              </p>
            </li>
          </ol>
          <p v-else class="mt-3 text-sm text-brand-inkSoft">
            Todavía no hay controles de peso registrados.
          </p>
        </div>

        <div class="border border-brand-line bg-brand-surface p-5">
          <h2 class="text-base font-semibold text-brand-ink">Vacunas y desparasitación</h2>
          <ol class="mt-4 space-y-3">
            <li
              v-for="entry in [...vaccineEntries, ...dewormingEntries].sort(
                (a, b) =>
                  Date.parse(b.attendedAt || b.recordedAt) -
                  Date.parse(a.attendedAt || a.recordedAt),
              )"
              :key="entry.id"
              class="border-t border-brand-line pt-3"
            >
              <p class="font-medium text-brand-ink">{{ recordKindLabel(entry) }}</p>
              <p class="mt-1 text-sm text-brand-ink">
                {{ entry.details.vacuna || entry.details.producto || vacunasTexto(entry.vaccines) }}
              </p>
              <p class="mt-1 text-xs text-brand-inkSoft">
                {{ formatDateTime(entry.attendedAt || entry.recordedAt) }} · {{ entry.authorName }}
                <span v-if="entry.details.proximaFecha">
                  · Próxima: {{ formatDate(entry.details.proximaFecha) }}
                </span>
              </p>
            </li>
          </ol>
          <p
            v-if="!vaccineEntries.length && !dewormingEntries.length"
            class="mt-3 text-sm text-brand-inkSoft"
          >
            Todavía no hay vacunas ni desparasitaciones registradas.
          </p>
        </div>
      </section>

      <section v-else class="mt-5 border border-brand-line bg-brand-surface p-5 sm:p-6">
        <h2 class="text-base font-semibold text-brand-ink">Actividad sanitaria del rodeo</h2>
        <div class="mt-4 grid gap-5 md:grid-cols-2">
          <div>
            <h3 class="text-sm font-medium text-brand-ink">Tratamientos grupales</h3>
            <p v-if="!groupTreatmentEntries.length" class="mt-2 text-sm text-brand-inkSoft">
              Todavía no hay tratamientos grupales registrados.
            </p>
            <ul v-else class="mt-3 space-y-3">
              <li
                v-for="entry in groupTreatmentEntries"
                :key="entry.id"
                class="border-l-2 border-brand-accent pl-3"
              >
                <p class="text-sm text-brand-ink">
                  {{ entry.details.producto }} · {{ entry.details.cantidadTratada }} de
                  {{ ficha.animal.herdSize }} cabezas
                </p>
                <p class="mt-1 text-xs text-brand-inkSoft">
                  {{ formatDateTime(entry.attendedAt || entry.recordedAt) }} ·
                  {{ entry.authorName }}
                  <span v-if="entry.details.dosis"> · Dosis: {{ entry.details.dosis }}</span>
                </p>
                <p v-if="entry.treatment" class="mt-1 text-sm text-brand-inkSoft">
                  {{ entry.treatment }}
                </p>
              </li>
            </ul>
          </div>
          <div>
            <h3 class="text-sm font-medium text-brand-ink">Eventos poblacionales</h3>
            <p v-if="!populationEventEntries.length" class="mt-2 text-sm text-brand-inkSoft">
              Todavía no hay eventos poblacionales registrados.
            </p>
            <ul v-else class="mt-3 space-y-3">
              <li
                v-for="entry in populationEventEntries"
                :key="entry.id"
                class="border-l-2 border-brand-warnLine pl-3"
              >
                <p class="text-sm text-brand-ink">
                  {{ entry.details.evento }} · {{ entry.details.cantidadAfectada }} de
                  {{ ficha.animal.herdSize }} cabezas
                </p>
                <p class="mt-1 text-xs text-brand-inkSoft">
                  {{ formatDateTime(entry.attendedAt || entry.recordedAt) }} ·
                  {{ entry.authorName }}
                </p>
                <p
                  v-if="entry.diagnosis || entry.treatment"
                  class="mt-1 text-sm text-brand-inkSoft"
                >
                  {{ entry.diagnosis }}<span v-if="entry.diagnosis && entry.treatment"> · </span
                  >{{ entry.treatment }}
                </p>
              </li>
            </ul>
          </div>
        </div>
      </section>

      <section v-if="drafts.length" class="mt-5 border border-brand-warnLine bg-brand-warnSoft p-5">
        <h2 class="text-base font-semibold text-brand-warnInk">
          Borradores locales sin sincronizar ({{ drafts.length }})
        </h2>
        <p class="mt-1 text-xs text-brand-warnInk">
          No integran el historial oficial. Revisalos y cargalos en el servidor cuando haya
          conexión; no se enviarán automáticamente.
        </p>
        <ul class="mt-4 space-y-3">
          <li v-for="draft in drafts" :key="draft.id" class="border-t border-brand-warnLine pt-3">
            <p class="text-sm font-medium text-brand-ink">
              {{ draft.payload.tipoRegistro }} · {{ draft.payload.motivoConsulta }}
            </p>
            <p class="mt-1 text-xs text-brand-warnInk">
              Atención: {{ formatDateTime(draft.payload.fechaAtencion) }} · Borrador:
              {{ formatDateTime(draft.queuedAt) }} · {{ draft.authorName }}
            </p>
          </li>
        </ul>
      </section>

      <section class="mt-7">
        <h2 class="text-xl font-semibold text-brand-ink">
          {{ isLot ? 'Historial de eventos del lote' : 'Historial individual' }}
        </h2>
        <p class="mt-1 text-sm text-brand-inkSoft">
          Cada entrada es inmutable; las correcciones se agregan como fe de erratas.
        </p>

        <p v-if="!entries.length" class="mt-4 text-sm text-brand-inkSoft">
          Sin registros clínicos.
        </p>
        <ol v-else class="mt-4 space-y-3">
          <li
            v-for="entry in entries"
            :key="entry.id"
            class="border bg-brand-surface p-5"
            :class="entry.isErratum ? 'border-brand-warnLine' : 'border-brand-line'"
          >
            <div class="flex flex-wrap items-center justify-between gap-2">
              <span class="text-sm font-semibold text-brand-ink">
                {{ entry.isErratum ? 'Fe de erratas' : recordKindLabel(entry) }}
              </span>
              <span class="text-xs text-brand-inkSoft">
                {{ entry.modality === 'RURAL' ? 'Atención rural' : 'Atención urbana' }}
              </span>
            </div>
            <p class="mt-2 text-xs text-brand-inkSoft">
              {{ entry.attendedAt ? `Atención: ${formatDateTime(entry.attendedAt)} · ` : '' }}
              Registrado: {{ formatDateTime(entry.recordedAt) }} · {{ entry.authorName }}
            </p>
            <p class="mt-3 whitespace-pre-line text-sm text-brand-ink">
              {{ entry.reason }}
            </p>
            <ul v-if="entryDetails(entry).length" class="mt-2 space-y-1 text-sm text-brand-ink">
              <li v-for="detail in entryDetails(entry)" :key="detail">{{ detail }}</li>
            </ul>
            <p v-if="entry.diagnosis" class="mt-2 text-sm text-brand-ink">
              <span class="text-brand-inkSoft">Diagnóstico:</span> {{ entry.diagnosis }}
            </p>
            <p v-if="entry.treatment" class="mt-1 whitespace-pre-line text-sm text-brand-ink">
              <span class="text-brand-inkSoft">Tratamiento / observaciones:</span>
              {{ entry.treatment }}
            </p>
            <p
              v-if="vacunasTexto(entry.vaccines) && entry.kind !== 'VACUNA'"
              class="mt-1 text-sm text-brand-ink"
            >
              <span class="text-brand-inkSoft">Vacunas aplicadas:</span>
              {{ vacunasTexto(entry.vaccines) }}
            </p>
            <div v-if="entry.isErratum" class="mt-3 border-l-2 border-brand-warnLine pl-3">
              <p class="text-xs text-brand-warnInk">
                Corrección de la evolución {{ entry.referencedEntryId }}
              </p>
              <p class="mt-1 whitespace-pre-line text-sm text-brand-ink">
                {{ entry.erratumDetail || entry.reason }}
              </p>
            </div>
            <div
              v-if="canManageRecord && !entry.isErratum && !entry.referencedEntryId"
              class="mt-4 border-t border-brand-line pt-3"
            >
              <button
                v-if="selectedErratum !== entry.id"
                type="button"
                class="text-xs text-brand-accentInk underline disabled:opacity-50"
                :disabled="!canWriteOnline"
                @click="selectedErratum = entry.id"
              >
                Registrar fe de erratas
              </button>
              <form v-else class="space-y-3" @submit.prevent="guardarFeErratas(entry.id)">
                <label :for="`erratum-${entry.id}`" class="field-label">
                  Detalle de la corrección
                </label>
                <textarea
                  :id="`erratum-${entry.id}`"
                  v-model="erratumDetail"
                  rows="3"
                  maxlength="10000"
                  class="field-input resize-y"
                  required
                />
                <div class="flex gap-3">
                  <button
                    type="submit"
                    class="bg-brand-accent px-4 py-2 text-xs text-brand-bg disabled:opacity-50"
                    :disabled="savingErratum || !canWriteOnline"
                  >
                    {{ savingErratum ? 'Guardando...' : 'Agregar corrección' }}
                  </button>
                  <button
                    type="button"
                    class="px-3 py-2 text-xs text-brand-inkSoft underline"
                    @click="cancelarFeErratas"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            </div>
          </li>
        </ol>
      </section>

      <section
        v-if="canManageRecord"
        class="mt-7 border border-brand-line bg-brand-surface p-5 sm:p-6"
      >
        <h2 class="text-lg font-semibold text-brand-ink">
          {{
            isLot ? 'Registrar tratamiento o evento del lote' : 'Registrar atención de la mascota'
          }}
        </h2>
        <p class="mt-1 text-xs text-brand-inkSoft">
          Los registros confirmados en el servidor no se editan ni eliminan. Sin conexión o con una
          copia sin revalidar, se guardan como borrador local pendiente de revisión.
        </p>

        <form class="mt-5 space-y-4" @submit.prevent="guardarEvolucion">
          <div class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="entry-kind" class="field-label">Tipo de registro</label>
              <select id="entry-kind" v-model="kind" class="field-input" :disabled="savingEntry">
                <template v-if="isLot">
                  <option value="TRATAMIENTO_GRUPAL">Tratamiento grupal</option>
                  <option value="EVENTO_POBLACIONAL">Evento poblacional</option>
                  <option value="CONSULTA">Consulta / visita</option>
                </template>
                <template v-else>
                  <option value="CONSULTA">Consulta / evolución</option>
                  <option value="PESO">Control de peso</option>
                  <option value="VACUNA">Vacunación</option>
                  <option value="DESPARASITACION">Desparasitación</option>
                </template>
              </select>
            </div>
            <div>
              <label for="attended-at" class="field-label">Fecha y hora de atención</label>
              <input
                id="attended-at"
                v-model="attendedAt"
                type="datetime-local"
                class="field-input"
                required
                :disabled="savingEntry"
              />
            </div>
          </div>

          <div>
            <label for="entry-reason" class="field-label">
              {{ isLot ? 'Motivo de visita / intervención' : 'Motivo de consulta' }}
            </label>
            <textarea
              id="entry-reason"
              v-model="reason"
              required
              minlength="2"
              maxlength="5000"
              rows="2"
              class="field-input resize-y"
              :disabled="savingEntry"
            />
          </div>

          <div v-if="kind === 'PESO'">
            <label for="entry-weight" class="field-label">Peso (kg)</label>
            <input
              id="entry-weight"
              v-model="weightKg"
              type="number"
              min="0.01"
              max="2000"
              step="0.01"
              class="field-input"
              required
              :disabled="savingEntry"
            />
          </div>

          <div v-if="kind === 'VACUNA'">
            <label for="entry-vaccine" class="field-label">Vacuna aplicada</label>
            <input
              id="entry-vaccine"
              v-model="vaccine"
              type="text"
              maxlength="200"
              class="field-input"
              required
              :disabled="savingEntry"
            />
          </div>

          <template v-if="kind === 'DESPARASITACION' || kind === 'TRATAMIENTO_GRUPAL'">
            <div class="grid gap-4 sm:grid-cols-2">
              <div>
                <label for="entry-product" class="field-label">
                  {{ kind === 'TRATAMIENTO_GRUPAL' ? 'Producto / tratamiento' : 'Antiparasitario' }}
                </label>
                <input
                  id="entry-product"
                  v-model="product"
                  type="text"
                  maxlength="200"
                  class="field-input"
                  required
                  :disabled="savingEntry"
                />
              </div>
              <div>
                <label for="entry-dose" class="field-label">Dosis / indicación</label>
                <input
                  id="entry-dose"
                  v-model="dose"
                  type="text"
                  maxlength="200"
                  class="field-input"
                  :disabled="savingEntry"
                />
              </div>
            </div>
          </template>

          <div v-if="kind === 'TRATAMIENTO_GRUPAL'">
            <label for="entry-treated-count" class="field-label">
              Cabezas tratadas (máximo {{ ficha.animal.herdSize }})
            </label>
            <input
              id="entry-treated-count"
              v-model="treatedCount"
              type="number"
              min="1"
              :max="ficha.animal.herdSize"
              step="1"
              class="field-input"
              required
              :disabled="savingEntry"
            />
          </div>

          <div v-if="kind === 'EVENTO_POBLACIONAL'" class="grid gap-4 sm:grid-cols-2">
            <div>
              <label for="entry-population-event" class="field-label">Evento poblacional</label>
              <input
                id="entry-population-event"
                v-model="populationEvent"
                type="text"
                maxlength="1000"
                class="field-input"
                required
                :disabled="savingEntry"
              />
            </div>
            <div>
              <label for="entry-affected-count" class="field-label">
                Cabezas afectadas (máximo {{ ficha.animal.herdSize }})
              </label>
              <input
                id="entry-affected-count"
                v-model="affectedCount"
                type="number"
                min="1"
                :max="ficha.animal.herdSize"
                step="1"
                class="field-input"
                required
                :disabled="savingEntry"
              />
            </div>
          </div>

          <div v-if="kind === 'VACUNA' || kind === 'DESPARASITACION'">
            <label for="entry-next-date" class="field-label"
              >Próxima fecha sugerida (opcional)</label
            >
            <input
              id="entry-next-date"
              v-model="nextDate"
              type="date"
              class="field-input"
              :disabled="savingEntry"
            />
          </div>

          <div v-if="kind === 'CONSULTA' || kind === 'EVENTO_POBLACIONAL'">
            <label for="entry-diagnosis" class="field-label">
              {{ isLot ? 'Observación / diagnóstico del evento' : 'Diagnóstico' }}
            </label>
            <textarea
              id="entry-diagnosis"
              v-model="diagnosis"
              maxlength="5000"
              rows="2"
              class="field-input resize-y"
              :disabled="savingEntry"
            />
          </div>

          <div v-if="kind !== 'PESO' && kind !== 'VACUNA' && kind !== 'DESPARASITACION'">
            <label for="entry-treatment" class="field-label">
              {{ isLot ? 'Plan / observaciones' : 'Tratamiento' }}
            </label>
            <textarea
              id="entry-treatment"
              v-model="treatment"
              maxlength="5000"
              rows="3"
              class="field-input resize-y"
              :disabled="savingEntry"
            />
          </div>

          <button
            type="submit"
            class="bg-brand-accent px-5 py-2.5 text-sm text-brand-bg disabled:cursor-not-allowed disabled:opacity-50"
            :disabled="savingEntry"
          >
            {{
              savingEntry
                ? 'Guardando...'
                : canWriteOnline
                  ? 'Registrar en la ficha'
                  : 'Guardar borrador en este dispositivo'
            }}
          </button>
        </form>
      </section>
    </template>
  </div>
</template>
