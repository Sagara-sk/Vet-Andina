<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import NuevoTurnoModal from '@/components/admin/NuevoTurnoModal.vue'
import TutorForm from '@/components/admin/TutorForm.vue'
import type { AnimalSearchResult } from '@/services/fichas'
import {
  addAnimal,
  getTutor,
  updateTutor,
  type Animal,
  type TipoAtencion,
  type TutorDetail,
  type TutorInput,
} from '@/services/tutores'
import { whatsappNumber } from '@/utils/format'

const props = defineProps<{ id: string }>()

const tutor = ref<TutorDetail | null>(null)
const error = ref('')
const feedback = ref('')
const editando = ref(false)
const turnoPara = ref<AnimalSearchResult | null>(null)

const animalForm = reactive({
  nombre: '',
  especie: '',
  raza: '',
  tipoAtencion: 'URBANO' as TipoAtencion,
  cantidadEnLote: 1,
  fechaNacimiento: '',
  idFinca: '',
})
const animalError = ref('')
const guardandoAnimal = ref(false)
const hoy = new Date().toISOString().slice(0, 10)

const whatsapp = computed(() => (tutor.value ? `https://wa.me/${whatsappNumber(tutor.value.phone)}` : ''))

async function cargar() {
  error.value = ''
  try {
    tutor.value = await getTutor(props.id)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No fue posible obtener el tutor.'
  }
}

async function guardar(input: TutorInput): Promise<string | null> {
  try {
    tutor.value = await updateTutor(props.id, input)
    editando.value = false
    feedback.value = 'Datos guardados.'
    return null
  } catch (e) {
    return e instanceof Error ? e.message : 'No fue posible guardar los cambios.'
  }
}

async function agregarAnimal() {
  animalError.value = ''
  guardandoAnimal.value = true

  try {
    tutor.value = await addAnimal(props.id, {
      nombre: animalForm.nombre,
      especie: animalForm.especie,
      raza: animalForm.raza.trim() || null,
      tipoAtencion: animalForm.tipoAtencion,
      cantidadEnLote: animalForm.cantidadEnLote,
      fechaNacimiento: animalForm.fechaNacimiento || null,
      idFinca: animalForm.idFinca || null,
    })
    feedback.value = `${animalForm.nombre} quedó dado de alta, con su ficha.`
    Object.assign(animalForm, { nombre: '', especie: '', raza: '', cantidadEnLote: 1, fechaNacimiento: '', idFinca: '' })
  } catch (e) {
    animalError.value = e instanceof Error ? e.message : 'No fue posible dar de alta el animal.'
  } finally {
    guardandoAnimal.value = false
  }
}

function nuevoTurno(animal: Animal) {
  if (!tutor.value) return
  turnoPara.value = { id: animal.id, name: animal.name, species: animal.species, tutorId: tutor.value.id, tutorName: tutor.value.fullName }
}

function onTurnoCreado() {
  feedback.value = `Turno creado para ${turnoPara.value?.name}.`
  turnoPara.value = null
}

watch(() => props.id, cargar, { immediate: true })
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <RouterLink :to="{ name: 'admin-tutores' }" class="text-xs text-brand-inkSoft hover:text-brand-ink">← Tutores</RouterLink>

    <p
      v-if="error"
      class="mt-5 border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
    </p>

    <template v-if="tutor">
      <header class="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 class="font-serif text-3xl text-brand-ink">{{ tutor.fullName }}</h1>
          <p class="mt-2 text-sm text-brand-inkSoft">
            {{ tutor.locality }} · {{ tutor.hasAccount ? 'Con cuenta propia' : 'Sin cuenta' }}
            <span v-if="tutor.missedAppointments"> · {{ tutor.missedAppointments }} turnos sin asistir</span>
          </p>
        </div>
        <div class="flex gap-2">
          <a :href="whatsapp" target="_blank" rel="noreferrer" class="btn-outline">WhatsApp</a>
          <button type="button" class="btn-outline" @click="editando = !editando">
            {{ editando ? 'Cancelar edición' : 'Editar datos' }}
          </button>
        </div>
      </header>

      <p v-if="feedback" class="mt-5 bg-brand-accentSoft px-4 py-3 text-sm text-brand-accentInk" role="status">
        {{ feedback }}
      </p>

      <section class="mt-7 border border-brand-line bg-brand-surface p-6">
        <h2 class="text-base text-brand-ink">Datos de contacto</h2>
        <div v-if="editando" class="mt-5">
          <TutorForm :key="tutor.id" :initial="tutor" submit-label="Guardar cambios" :save="guardar" />
        </div>
        <dl v-else class="mt-4 grid gap-4 text-sm sm:grid-cols-3">
          <div><dt class="text-xs text-brand-inkSoft">Teléfono</dt><dd class="mt-1">{{ tutor.phone }}</dd></div>
          <div><dt class="text-xs text-brand-inkSoft">Correo</dt><dd class="mt-1 break-all">{{ tutor.email }}</dd></div>
          <div><dt class="text-xs text-brand-inkSoft">DNI / CUIT</dt><dd class="mt-1">{{ tutor.dniCuit ?? '—' }}</dd></div>
          <div><dt class="text-xs text-brand-inkSoft">Dirección</dt><dd class="mt-1">{{ tutor.address ?? '—' }}</dd></div>
          <div>
            <dt class="text-xs text-brand-inkSoft">Tipo</dt>
            <dd class="mt-1">
              {{ tutor.personType === 'EMPRESA_PRODUCTOR' ? 'Empresa / productor' : tutor.personType === 'INDIVIDUAL' ? 'Particular' : '—' }}
            </dd>
          </div>
          <div>
            <dt class="text-xs text-brand-inkSoft">Establecimientos</dt>
            <dd class="mt-1">{{ tutor.farms.map((f) => f.name).join(', ') || '—' }}</dd>
          </div>
        </dl>
      </section>

      <section class="mt-7">
        <h2 class="text-base text-brand-ink">Animales y lotes</h2>
        <p v-if="!tutor.animals.length" class="mt-3 text-sm text-brand-inkSoft">Todavía no tiene animales cargados.</p>
        <div v-else class="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <article v-for="a in tutor.animals" :key="a.id" class="flex flex-col border border-brand-line bg-brand-surface p-5">
            <h3 class="text-sm text-brand-ink">{{ a.name }}</h3>
            <p class="mt-1 text-xs text-brand-inkSoft">
              {{ a.species }}<span v-if="a.breed"> · {{ a.breed }}</span>
              · {{ a.careType === 'RURAL' ? 'Rural' : 'Urbano' }}
              <span v-if="a.herdSize > 1"> · {{ a.herdSize }} cabezas</span>
            </p>
            <div class="mt-4 flex gap-3 text-xs">
              <RouterLink :to="{ name: 'admin-ficha', params: { id: a.id } }" class="text-brand-accentInk underline">
                Ver ficha
              </RouterLink>
              <button type="button" class="text-brand-accentInk underline" @click="nuevoTurno(a)">Nuevo turno</button>
            </div>
          </article>
        </div>
      </section>

      <section class="mt-7 border border-brand-line bg-brand-surface p-6">
        <h2 class="text-base text-brand-ink">Alta de animal o lote</h2>
        <p class="mt-1 text-xs text-brand-inkSoft">Alta preliminar: se crea con su ficha médica vacía.</p>

        <p
          v-if="animalError"
          class="mt-4 border border-brand-dangerLine bg-brand-dangerSoft p-3 text-sm text-brand-dangerInk"
          role="alert"
        >
          {{ animalError }}
        </p>

        <form class="mt-5 grid gap-4 sm:grid-cols-3" @submit.prevent="agregarAnimal">
          <div>
            <label for="animal-nombre" class="field-label">Nombre o identificación</label>
            <input id="animal-nombre" v-model="animalForm.nombre" class="field-input" maxlength="150" required />
          </div>
          <div>
            <label for="animal-especie" class="field-label">Especie</label>
            <input id="animal-especie" v-model="animalForm.especie" class="field-input" placeholder="Perro, gato, bovino..." minlength="2" maxlength="100" required />
          </div>
          <div>
            <label for="animal-raza" class="field-label">Raza (opcional)</label>
            <input id="animal-raza" v-model="animalForm.raza" class="field-input" maxlength="100" />
          </div>
          <div>
            <label for="animal-tipo" class="field-label">Atención</label>
            <select id="animal-tipo" v-model="animalForm.tipoAtencion" class="field-input">
              <option value="URBANO">Urbana (consultorio)</option>
              <option value="RURAL">Rural (campo)</option>
            </select>
          </div>
          <div>
            <label for="animal-cantidad" class="field-label">Cantidad (lotes)</label>
            <input id="animal-cantidad" v-model.number="animalForm.cantidadEnLote" type="number" min="1" max="100000" class="field-input" required />
          </div>
          <div>
            <label for="animal-nacimiento" class="field-label">Nacimiento (opcional)</label>
            <input id="animal-nacimiento" v-model="animalForm.fechaNacimiento" type="date" :max="hoy" class="field-input" />
          </div>
          <div v-if="tutor.farms.length" class="sm:col-span-3">
            <label for="animal-finca" class="field-label">Establecimiento (opcional)</label>
            <select id="animal-finca" v-model="animalForm.idFinca" class="field-input">
              <option value="">Ninguno</option>
              <option v-for="f in tutor.farms" :key="f.id" :value="f.id">{{ f.name }} · {{ f.locality }}</option>
            </select>
          </div>
          <div class="sm:col-span-3">
            <button type="submit" class="btn-primary disabled:cursor-wait disabled:opacity-60" :disabled="guardandoAnimal">
              {{ guardandoAnimal ? 'Guardando...' : 'Dar de alta' }}
            </button>
          </div>
        </form>
      </section>
    </template>

    <NuevoTurnoModal v-if="turnoPara" :animal="turnoPara" @close="turnoPara = null" @created="onTurnoCreado" />
  </div>
</template>
