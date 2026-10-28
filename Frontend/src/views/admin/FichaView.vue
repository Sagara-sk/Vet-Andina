<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { getMedicalRecord, type MedicalRecord } from '@/services/fichas'

const props = defineProps<{ id: string }>()

const ficha = ref<MedicalRecord | null>(null)
const error = ref('')

const fechaHora = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium', timeStyle: 'short' })
const fecha = new Intl.DateTimeFormat('es-AR', { dateStyle: 'medium' })

const ESTADOS: Record<string, string> = { ACTIVO: 'Activa', INACTIVO: 'Inactiva', FALLECIDO: 'Fallecido' }

async function cargar() {
  error.value = ''
  try {
    ficha.value = await getMedicalRecord(props.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No fue posible obtener la ficha.'
  }
}

watch(() => props.id, cargar, { immediate: true })
</script>

<template>
  <div class="mx-auto max-w-[900px]">
    <RouterLink :to="{ name: 'admin-fichas' }" class="text-xs text-brand-inkSoft hover:text-brand-ink">← Fichas</RouterLink>

    <p
      v-if="error"
      class="mt-5 border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
    </p>

    <template v-if="ficha">
      <header class="mt-3">
        <h1 class="font-serif text-3xl text-brand-ink">{{ ficha.animal.name }}</h1>
        <p class="mt-2 text-sm text-brand-inkSoft">
          {{ ficha.animal.species }}<span v-if="ficha.animal.breed"> · {{ ficha.animal.breed }}</span>
          · {{ ficha.animal.careType === 'RURAL' ? 'Rural' : 'Urbano' }}
          <span v-if="ficha.animal.herdSize > 1"> · {{ ficha.animal.herdSize }} cabezas</span>
          <span v-if="ficha.animal.birthDate"> · Nació el {{ fecha.format(new Date(`${ficha.animal.birthDate}T00:00`)) }}</span>
        </p>
        <p class="mt-1 text-sm text-brand-inkSoft">
          Tutor:
          <RouterLink :to="{ name: 'admin-tutor', params: { id: ficha.tutor.id } }" class="underline">
            {{ ficha.tutor.fullName }}
          </RouterLink>
          · {{ ficha.tutor.phone }}
        </p>
      </header>

      <p class="mt-5 bg-brand-muted px-4 py-3 text-xs text-brand-inkSoft" role="note">
        Vista de solo lectura. Las evoluciones clínicas las registra el veterinario y no se pueden editar ni borrar.
      </p>

      <section class="mt-6 border border-brand-line bg-brand-surface p-6">
        <h2 class="text-base text-brand-ink">Ficha médica</h2>
        <p v-if="!ficha.record" class="mt-3 text-sm text-brand-inkSoft">Este animal todavía no tiene ficha abierta.</p>
        <dl v-else class="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt class="text-xs text-brand-inkSoft">Estado</dt><dd class="mt-1">{{ ESTADOS[ficha.record.status] ?? ficha.record.status }}</dd></div>
          <div><dt class="text-xs text-brand-inkSoft">Apertura</dt><dd class="mt-1">{{ fecha.format(new Date(ficha.record.openedAt)) }}</dd></div>
          <div class="sm:col-span-3">
            <dt class="text-xs text-brand-inkSoft">Alergias y antecedentes</dt>
            <dd class="mt-1 whitespace-pre-line">{{ ficha.record.allergiesHistory || 'Sin datos cargados.' }}</dd>
          </div>
        </dl>
      </section>

      <section class="mt-7">
        <h2 class="text-base text-brand-ink">Evoluciones clínicas</h2>
        <p v-if="!ficha.entries.length" class="mt-3 text-sm text-brand-inkSoft">Sin evoluciones registradas.</p>
        <ol v-else class="mt-4 space-y-3">
          <li
            v-for="e in ficha.entries"
            :key="e.id"
            class="border bg-brand-surface p-5"
            :class="e.isErratum ? 'border-brand-warnLine' : 'border-brand-line'"
          >
            <p class="text-xs text-brand-inkSoft">
              {{ fechaHora.format(new Date(e.recordedAt)) }} · {{ e.authorName }} ·
              {{ e.modality === 'RURAL' ? 'Visita rural' : 'Consultorio' }}
              <span v-if="e.isErratum" class="text-brand-warnInk"> · Fe de erratas</span>
            </p>
            <p class="mt-2 text-sm text-brand-ink">{{ e.reason }}</p>
            <p v-if="e.diagnosis" class="mt-2 text-sm"><span class="text-brand-inkSoft">Diagnóstico:</span> {{ e.diagnosis }}</p>
            <p v-if="e.treatment" class="mt-1 text-sm"><span class="text-brand-inkSoft">Tratamiento:</span> {{ e.treatment }}</p>
          </li>
        </ol>
      </section>
    </template>
  </div>
</template>
