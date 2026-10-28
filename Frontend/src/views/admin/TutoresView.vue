<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import BaseModal from '@/components/admin/BaseModal.vue'
import TutorForm from '@/components/admin/TutorForm.vue'
import { createTutor, listTutors, type TutorInput, type TutorSummary } from '@/services/tutores'

const router = useRouter()

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
        <h1 class="font-serif text-3xl text-brand-ink">Tutores</h1>
        <p class="mt-2 text-brand-inkSoft">Clientes, sus mascotas y establecimientos.</p>
      </div>
      <button type="button" class="btn-primary" @click="nuevo = true">Nuevo tutor</button>
    </header>

    <input
      v-model="busqueda"
      type="search"
      class="field-input mt-7 !w-[320px] max-w-full"
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

    <div class="mt-5 overflow-x-auto border border-brand-line bg-brand-surface">
      <table class="w-full min-w-[720px] text-left text-sm">
        <thead class="text-xs text-brand-inkSoft">
          <tr>
            <th class="px-4 py-3 font-normal">Nombre</th>
            <th class="px-4 py-3 font-normal">Contacto</th>
            <th class="px-4 py-3 font-normal">Localidad</th>
            <th class="px-4 py-3 font-normal">Animales</th>
            <th class="px-4 py-3 font-normal">Cuenta</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="t in tutores" :key="t.id" class="border-t border-brand-line text-brand-ink">
            <td class="px-4 py-3.5">
              <RouterLink :to="{ name: 'admin-tutor', params: { id: t.id } }" class="hover:underline">
                {{ t.fullName }}
              </RouterLink>
            </td>
            <td class="px-4 py-3.5">
              {{ t.phone }}
              <span class="mt-0.5 block text-xs text-brand-inkSoft">{{ t.email }}</span>
            </td>
            <td class="px-4 py-3.5">{{ t.locality }}</td>
            <td class="px-4 py-3.5">{{ t.animalCount }}</td>
            <td class="px-4 py-3.5 text-xs text-brand-inkSoft">{{ t.hasAccount ? 'Registrado' : 'Sin cuenta' }}</td>
          </tr>
        </tbody>
      </table>

      <p v-if="cargando && !tutores.length" class="px-5 py-6 text-center text-sm text-brand-inkSoft">Cargando...</p>
      <p v-else-if="!tutores.length && !error" class="px-5 py-6 text-center text-sm text-brand-inkSoft">
        No hay tutores que coincidan con la búsqueda.
      </p>
    </div>

    <BaseModal v-if="nuevo" title="Nuevo tutor" @close="nuevo = false">
      <TutorForm submit-label="Crear tutor" :save="guardarNuevo" />
    </BaseModal>
  </div>
</template>
