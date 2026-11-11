<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { createMyAnimal, type AnimalInput } from '@/services/animales'
import { listMisEstablecimientos, type EstablecimientoPropio } from '@/services/establecimientos'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const route = useRoute()
const session = useSessionStore()
const isRuralClient = computed(() => session.isRuralClient)
const registeringUrbanPet = computed(() => !isRuralClient.value || route.query.tipo === 'URBANO')
const registeringRuralLot = computed(() => !registeringUrbanPet.value)
const form = reactive({
  name: '',
  species: '',
  otherSpecies: '',
  category: '',
  breed: '',
  birthDate: '',
  herdSize: '1',
  farmId: '',
})
const establishments = ref<EstablecimientoPropio[]>([])
const loadingEstablishments = ref(false)
const saving = ref(false)
const error = ref('')
const ruralSpecies = ['Bovino', 'Ovino', 'Caprino', 'Equino', 'Porcino', 'Aviar', 'Otros']
const urbanSpecies = [
  'Perro',
  'Gato',
  'Conejo',
  'Ave',
  'Pez',
  'Hámster',
  'Hurón',
  'Tortuga',
  'Otros',
]
const speciesOptions = computed(() => (registeringRuralLot.value ? ruralSpecies : urbanSpecies))
const now = new Date()
const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`

async function loadEstablishments() {
  if (!registeringRuralLot.value) return

  loadingEstablishments.value = true
  error.value = ''
  try {
    establishments.value = await listMisEstablecimientos()
    const [firstEstablishment] = establishments.value
    if (!form.farmId && firstEstablishment && establishments.value.length === 1) {
      form.farmId = firstEstablishment.id
    }
  } catch (cause) {
    error.value =
      cause instanceof Error ? cause.message : 'No fue posible cargar tus establecimientos.'
  } finally {
    loadingEstablishments.value = false
  }
}

async function submit() {
  error.value = ''
  const species = form.species === 'Otros' ? form.otherSpecies.trim() : form.species
  if (!species) {
    error.value = 'Ingresá la especie del animal.'
    return
  }
  if (registeringUrbanPet.value && !form.name.trim()) {
    error.value = 'Ingresá el nombre de tu mascota.'
    return
  }
  if (registeringRuralLot.value && !form.category.trim()) {
    error.value = 'Ingresá la categoría del lote.'
    return
  }
  if (registeringRuralLot.value && !form.farmId) {
    error.value = 'Seleccioná un establecimiento para asociar el lote.'
    return
  }

  const input: AnimalInput = {
    nombre: registeringRuralLot.value ? form.category.trim() : form.name.trim(),
    especie: species,
    raza: form.breed.trim() || null,
    tipoAtencion: registeringRuralLot.value ? 'RURAL' : 'URBANO',
    cantidadEnLote: registeringRuralLot.value ? Number(form.herdSize) : 1,
    fechaNacimiento: registeringRuralLot.value ? null : form.birthDate || null,
    idFinca: registeringRuralLot.value ? form.farmId : null,
  }

  saving.value = true
  try {
    await createMyAnimal(input)
    await router.replace({
      name: 'panel-reservar',
      query: registeringUrbanPet.value ? { modalidad: 'URBANO' } : undefined,
    })
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'No fue posible registrar el animal.'
  } finally {
    saving.value = false
  }
}

onMounted(loadEstablishments)
</script>

<template>
  <div class="mx-auto max-w-3xl">
    <header class="mb-7">
      <p class="text-xs font-semibold uppercase tracking-[0.14em] text-brand-accent">Paso 3</p>
      <h1 class="mt-2 font-serif text-3xl text-brand-ink">
        {{ registeringRuralLot ? 'Registrar lote' : 'Registrar mascota' }}
      </h1>
      <p class="mt-2 text-sm text-brand-inkSoft">
        Completá estos datos para poder continuar con la reserva de tu turno.
      </p>
    </header>

    <section class="rounded-lg border border-brand-line bg-brand-surface p-6">
      <p
        v-if="error"
        class="mb-5 rounded border border-brand-dangerLine bg-brand-dangerSoft p-3 text-sm text-brand-dangerInk"
        role="alert"
      >
        {{ error }}
      </p>

      <p
        v-if="registeringRuralLot && loadingEstablishments"
        class="mb-5 text-sm text-brand-inkSoft"
        role="status"
      >
        Cargando establecimientos...
      </p>
      <p
        v-else-if="registeringRuralLot && !error && establishments.length === 0"
        class="mb-5 rounded border border-brand-warnLine bg-brand-warnSoft p-3 text-sm text-brand-warnInk"
        role="status"
      >
        No hay establecimientos disponibles para asociar el lote. Revisá los datos de tu perfil o
        volvé a intentar.
        <button type="button" class="ml-1 underline" @click="loadEstablishments">Reintentar</button>
      </p>

      <form class="grid gap-5 sm:grid-cols-2" @submit.prevent="submit">
        <label v-if="registeringUrbanPet" class="text-xs text-brand-inkSoft">
          Nombre
          <input
            v-model="form.name"
            type="text"
            maxlength="150"
            autocomplete="off"
            placeholder="Ej.: Luna"
            class="mt-1 w-full rounded-[3px] border border-brand-line bg-brand-bg px-3 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent"
            required
          />
        </label>

        <label class="text-xs text-brand-inkSoft">
          Especie
          <select
            v-model="form.species"
            class="mt-1 w-full rounded-[3px] border border-brand-line bg-brand-bg px-3 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent"
            required
          >
            <option value="" disabled>Seleccioná una especie</option>
            <option v-for="species in speciesOptions" :key="species" :value="species">
              {{ species }}
            </option>
          </select>
        </label>

        <label v-if="form.species === 'Otros'" class="text-xs text-brand-inkSoft">
          Especificá la especie
          <input
            v-model="form.otherSpecies"
            type="text"
            maxlength="100"
            class="mt-1 w-full rounded-[3px] border border-brand-line bg-brand-bg px-3 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent"
            required
          />
        </label>

        <label v-if="registeringRuralLot" class="text-xs text-brand-inkSoft">
          Categoría / identificación del lote
          <input
            v-model="form.category"
            type="text"
            maxlength="150"
            placeholder="Ej.: Vacas de cría"
            class="mt-1 w-full rounded-[3px] border border-brand-line bg-brand-bg px-3 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent"
            required
          />
        </label>

        <label class="text-xs text-brand-inkSoft">
          Raza
          <input
            v-model="form.breed"
            type="text"
            maxlength="100"
            class="mt-1 w-full rounded-[3px] border border-brand-line bg-brand-bg px-3 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent"
            placeholder="Ej.: Caniche"
          />
        </label>

        <label v-if="registeringUrbanPet" class="text-xs text-brand-inkSoft">
          Fecha de nacimiento (opcional)
          <input
            v-model="form.birthDate"
            type="date"
            :max="today"
            class="mt-1 w-full rounded-[3px] border border-brand-line bg-brand-bg px-3 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent"
          />
        </label>

        <label v-if="registeringRuralLot" class="text-xs text-brand-inkSoft">
          Cantidad de animales en el lote
          <input
            v-model="form.herdSize"
            type="number"
            min="1"
            max="100000"
            step="1"
            class="mt-1 w-full rounded-[3px] border border-brand-line bg-brand-bg px-3 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent"
            required
          />
        </label>

        <label v-if="registeringRuralLot" class="text-xs text-brand-inkSoft sm:col-span-2">
          Establecimiento
          <select
            v-model="form.farmId"
            :disabled="loadingEstablishments || !establishments.length"
            class="mt-1 w-full rounded-[3px] border border-brand-line bg-brand-bg px-3 py-2.5 text-sm text-brand-ink outline-none focus:border-brand-accent disabled:opacity-60"
            required
          >
            <option value="" disabled>Seleccioná un establecimiento</option>
            <option v-for="farm in establishments" :key="farm.id" :value="farm.id">
              {{ farm.name }}
            </option>
          </select>
        </label>

        <button
          type="submit"
          :disabled="
            saving || loadingEstablishments || (registeringRuralLot && !establishments.length)
          "
          class="btn-primary sm:col-span-2 disabled:cursor-wait disabled:opacity-60"
        >
          {{
            saving ? 'Guardando...' : registeringRuralLot ? 'Registrar lote' : 'Registrar mascota'
          }}
        </button>
      </form>
    </section>
  </div>
</template>
