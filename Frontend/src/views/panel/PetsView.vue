<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { listMisAnimales, type AnimalPropio } from '@/services/animales'

const animales = ref<AnimalPropio[]>([])
const loading = ref(true)
const error = ref('')

// La API ya filtra por tutor y tipo URBANO; el filtro local solo es resguardo.
const mascotas = computed(() =>
  animales.value.filter((animal) => animal.modality === 'URBANO'),
)

async function cargarMascotas() {
  loading.value = true
  error.value = ''

  try {
    animales.value = await listMisAnimales('URBANO')
  } catch (e) {
    error.value =
      e instanceof Error
        ? e.message
        : 'No fue posible obtener tus mascotas.'
  } finally {
    loading.value = false
  }
}

onMounted(cargarMascotas)
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <header>
      <h1 class="font-serif text-3xl text-brand-ink">Mis mascotas</h1>
      <p class="mt-2 text-sm text-brand-inkSoft">
        Consultá los animales registrados en tu cuenta y sus fichas médicas.
      </p>
    </header>

    <p
      v-if="error"
      class="mt-6 border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
      <button type="button" class="ml-2 underline" @click="cargarMascotas">
        Reintentar
      </button>
    </p>

    <p
      v-else-if="loading"
      class="mt-8 text-sm text-brand-inkSoft"
      role="status"
    >
      Cargando tus mascotas...
    </p>

    <p
      v-else-if="!mascotas.length"
      class="mt-8 border border-brand-line bg-brand-surface p-6 text-sm text-brand-inkSoft"
    >
      Todavía no tenés mascotas urbanas registradas.
    </p>

    <div v-else class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <article
        v-for="mascota in mascotas"
        :key="mascota.id"
        class="border border-brand-line bg-brand-surface p-5"
      >
        <h2 class="text-base text-brand-ink">{{ mascota.name }}</h2>

        <p class="mt-2 text-sm text-brand-inkSoft">
          {{ mascota.species }}
        </p>

        <RouterLink
          :to="{
            name: 'panel-mascota-ficha',
            params: { id: mascota.id },
          }"
          class="mt-5 inline-block text-sm text-brand-ink underline hover:text-brand-accentInk"
        >
          Consultar ficha médica
        </RouterLink>
      </article>
    </div>
  </div>
</template>
