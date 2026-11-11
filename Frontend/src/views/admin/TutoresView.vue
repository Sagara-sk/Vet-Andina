<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseModal from '@/components/admin/BaseModal.vue'
import TutorForm from '@/components/admin/TutorForm.vue'
import { createTutor, listTutors, type TutorInput, type TutorSummary } from '@/services/tutores'
import { useSessionStore } from '@/stores/session'

const router = useRouter()
const session = useSessionStore()
const tutorRouteName = computed(() =>
  session.user?.rol === 'VETERINARIO' ? 'vet-tutor' : 'admin-tutor',
)

const busqueda = ref('')
const tutores = ref<TutorSummary[]>([])
const cargando = ref(false)
const error = ref('')
const nuevo = ref(false)

async function cargar() {
  cargando.value = true
  error.value = ''

  try {
    tutores.value = await listTutors(busqueda.value.trim())
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'No fue posible obtener los tutores.'
  } finally {
    cargando.value = false
  }
}

let timer: ReturnType<typeof setTimeout> | undefined
watch(busqueda, () => {
  clearTimeout(timer)
  timer = setTimeout(cargar, 300)
})

async function guardarNuevo(input: TutorInput): Promise<string | null> {
  try {
    const tutor = await createTutor(input)
    nuevo.value = false
    await router.push({ name: 'admin-tutor', params: { id: tutor.id } })
    return null
  } catch (e) {
    return e instanceof Error ? e.message : 'No fue posible crear el tutor.'
  }
}

onMounted(cargar)
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 class="font-serif text-3xl text-brand-ink">Clientes</h1>
        <p class="mt-2 text-brand-inkSoft">Clientes, sus mascotas y establecimientos.</p>
      </div>
      <button
        v-if="session.user?.rol !== 'VETERINARIO'"
        type="button"
        class="btn-primary"
        @click="nuevo = true"
      >
        Nuevo tutor
      </button>
    </header>

    <input
      v-model="busqueda"
      type="search"
      class="field-input mt-7 sm:w-80"
      placeholder="Buscar por nombre, email, teléfono, DNI o mascota"
      aria-label="Buscar tutores"
    />

    <p
      v-if="error"
      class="mt-5 border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
    </p>

    <!-- En celular cada cliente es una tarjeta; desde md se muestra como tabla. -->
    <div class="mt-5 border border-brand-line bg-brand-surface md:overflow-x-auto">
      <table class="block w-full text-left text-sm md:table md:min-w-180">
        <thead class="hidden text-xs text-brand-inkSoft md:table-header-group">
          <tr>
            <th class="px-4 py-3 font-normal">Nombre</th>
            <th class="px-4 py-3 font-normal">Contacto</th>
            <th class="px-4 py-3 font-normal">Localidad</th>
            <th class="px-4 py-3 font-normal">Animales</th>
            <th class="px-4 py-3 font-normal">Cuenta</th>
            <th class="px-4 py-3 text-right font-normal">Acceso clínico</th>
          </tr>
        </thead>
        <tbody class="block md:table-row-group">
          <tr
            v-for="t in tutores"
            :key="t.id"
            class="grid grid-cols-2 gap-x-4 gap-y-1 border-brand-line p-4 text-brand-ink not-first:border-t md:table-row md:border-t md:p-0"
          >
            <td class="col-span-2 font-medium md:px-4 md:py-3.5 md:font-normal">
              <RouterLink
                :to="{ name: tutorRouteName, params: { id: t.id } }"
                class="hover:underline"
              >
                {{ t.fullName }}
              </RouterLink>
            </td>
            <td class="col-span-2 md:px-4 md:py-3.5">
              {{ t.phone }}
              <span class="mt-0.5 block text-xs text-brand-inkSoft">{{ t.email }}</span>
            </td>
            <td class="text-brand-inkSoft md:px-4 md:py-3.5 md:text-brand-ink">{{ t.locality }}</td>
            <td
              class="text-right text-brand-inkSoft md:px-4 md:py-3.5 md:text-left md:text-brand-ink"
            >
              {{ t.animalCount
              }}<span class="md:hidden"> {{ t.animalCount === 1 ? 'animal' : 'animales' }}</span>
            </td>
            <td class="self-center text-xs text-brand-inkSoft md:px-4 md:py-3.5">
              {{ t.hasAccount ? 'Registrado' : 'Sin cuenta' }}
            </td>
            <td class="mt-2 text-right md:mt-0 md:px-4 md:py-3.5">
              <RouterLink
                :to="{ name: tutorRouteName, params: { id: t.id } }"
                class="btn-outline !px-3 text-xs md:!min-h-0 md:!py-2"
                :aria-label="`Acceder a las fichas clínicas de ${t.fullName} y sus pacientes`"
              >
                Ver fichas
              </RouterLink>
            </td>
          </tr>
        </tbody>
      </table>

      <p
        v-if="cargando && !tutores.length"
        class="px-5 py-6 text-center text-sm text-brand-inkSoft"
      >
        Cargando...
      </p>
      <p
        v-else-if="!tutores.length && !error"
        class="px-5 py-6 text-center text-sm text-brand-inkSoft"
      >
        No hay tutores que coincidan con la búsqueda.
      </p>
    </div>

    <BaseModal v-if="nuevo" title="Nuevo tutor" @close="nuevo = false">
      <TutorForm submit-label="Crear tutor" :save="guardarNuevo" />
    </BaseModal>
  </div>
</template>
