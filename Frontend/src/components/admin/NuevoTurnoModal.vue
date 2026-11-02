<script setup lang="ts">
import { onMounted, reactive, ref, watch } from 'vue'
import BaseModal from './BaseModal.vue'
import { searchAnimals, type AnimalSearchResult } from '@/services/fichas'
import { createTurno, listVets, type Turno, type Veterinario } from '@/services/turnos'
import { toDateTimeInput } from '@/utils/format'

// Si se abre desde la ficha de un tutor, el animal ya viene elegido.
const props = defineProps<{ animal?: AnimalSearchResult }>()
const emit = defineEmits<{ close: []; created: [turno: Turno] }>()

const vets = ref<Veterinario[]>([])
const busqueda = ref('')
const resultados = ref<AnimalSearchResult[]>([])
const animal = ref<AnimalSearchResult | null>(props.animal ?? null)
const error = ref('')
const saving = ref(false)
const minFecha = toDateTimeInput(new Date())

const form = reactive({
  idVeterinario: '',
  fechaHora: '',
  modalidad: 'CONSULTORIO' as 'CONSULTORIO' | 'RURAL',
  estado: 'PENDIENTE' as 'PENDIENTE' | 'CONFIRMADO',
  motivo: '',
})

onMounted(async () => {
  try {
    vets.value = await listVets()
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No fue posible obtener los veterinarios.'
  }
})

let timer: ReturnType<typeof setTimeout> | undefined
watch(busqueda, (texto) => {
  clearTimeout(timer)
  if (texto.trim().length < 2) {
    resultados.value = []
    return
  }
  timer = setTimeout(async () => {
    try {
      resultados.value = await searchAnimals(texto.trim())
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No fue posible buscar animales.'
    }
  }, 300)
})

async function submit() {
  if (!animal.value) {
    error.value = 'Elegí el animal del turno.'
    return
  }

  error.value = ''
  saving.value = true

  try {
    const turno = await createTurno({
      idAnimal: animal.value.id,
      idVeterinario: form.idVeterinario || null,
      fechaHora: new Date(form.fechaHora).toISOString(),
      modalidad: form.modalidad,
      estado: form.estado,
      motivo: form.motivo,
    })
    emit('created', turno)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No fue posible crear el turno.'
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <BaseModal title="Nuevo turno" @close="emit('close')">
    <form class="space-y-4" @submit.prevent="submit">
      <p v-if="error" class="border border-brand-dangerLine bg-brand-dangerSoft p-3 text-sm text-brand-dangerInk" role="alert">
        {{ error }}
      </p>

      <div>
        <span class="field-label">Animal</span>
        <div v-if="animal" class="flex items-center justify-between rounded-[3px] border border-brand-accent bg-brand-accentSoft px-3 py-2.5 text-sm">
          <span>{{ animal.name }} · {{ animal.species }} · {{ animal.tutorName }}</span>
          <button v-if="!props.animal" type="button" class="text-xs underline" @click="animal = null">Cambiar</button>
        </div>
        <template v-else>
          <input
            v-model="busqueda"
            type="search"
            class="field-input"
            placeholder="Buscar por nombre del animal o del tutor"
            aria-label="Buscar animal"
          />
          <ul v-if="resultados.length" class="mt-1 max-h-48 overflow-y-auto border border-brand-line">
            <li v-for="r in resultados" :key="r.id">
              <button
                type="button"
                class="w-full px-3 py-2 text-left text-sm hover:bg-brand-accentSoft"
                @click="animal = r"
              >
                {{ r.name }} <span class="text-brand-inkSoft">· {{ r.species }} · {{ r.tutorName }}</span>
              </button>
            </li>
          </ul>
          <p v-else-if="busqueda.trim().length >= 2" class="mt-1 text-xs text-brand-inkSoft">
            Sin resultados. Si es un paciente nuevo, dalo de alta desde Tutores.
          </p>
        </template>
      </div>

      <div class="grid gap-4 sm:grid-cols-2">
        <div>
          <label for="turno-fecha" class="field-label">Fecha y hora</label>
          <input id="turno-fecha" v-model="form.fechaHora" type="datetime-local" class="field-input" :min="minFecha" required />
        </div>
        <div>
          <label for="turno-vet" class="field-label">Veterinario</label>
          <select id="turno-vet" v-model="form.idVeterinario" class="field-input">
            <option value="">Sin asignar</option>
            <option v-for="v in vets" :key="v.id" :value="v.id">{{ v.fullName }}</option>
          </select>
        </div>
        <div>
          <label for="turno-modalidad" class="field-label">Modalidad</label>
          <select id="turno-modalidad" v-model="form.modalidad" class="field-input">
            <option value="CONSULTORIO">Consultorio</option>
            <option value="RURAL">Visita rural</option>
          </select>
        </div>
        <div>
          <label for="turno-estado" class="field-label">Estado inicial</label>
          <select id="turno-estado" v-model="form.estado" class="field-input">
            <option value="PENDIENTE">Por confirmar</option>
            <option value="CONFIRMADO">Confirmado</option>
          </select>
        </div>
      </div>

      <div>
        <label for="turno-motivo" class="field-label">Motivo</label>
        <input
          id="turno-motivo"
          v-model="form.motivo"
          class="field-input"
          placeholder="Ej: Control y vacunación"
          minlength="2"
          maxlength="300"
          required
        />
      </div>

      <button type="submit" class="btn-primary w-full disabled:cursor-wait disabled:opacity-60" :disabled="saving">
        {{ saving ? 'Creando turno...' : 'Crear turno' }}
      </button>
    </form>
  </BaseModal>
</template>
