<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import { searchAnimals, type AnimalSearchResult } from '@/services/fichas'

const busqueda = ref('')
const resultados = ref<AnimalSearchResult[]>([])
const error = ref('')
const buscado = ref(false)

let timer: ReturnType<typeof setTimeout> | undefined
watch(busqueda, (texto) => {
  clearTimeout(timer)
  if (texto.trim().length < 2) {
    resultados.value = []
    buscado.value = false
    return
  }
  timer = setTimeout(async () => {
    error.value = ''
    try {
      resultados.value = await searchAnimals(texto.trim())
      buscado.value = true
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'No fue posible buscar.'
    }
  }, 300)
})
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <h1 class="font-serif text-3xl text-brand-ink">Fichas</h1>
    <p class="mt-2 text-brand-inkSoft">Consultá la ficha clínica de un paciente. Solo lectura.</p>

    <input
      v-model="busqueda"
      type="search"
      class="field-input mt-7 !w-[320px] max-w-full"
      placeholder="Nombre del animal o del tutor"
      aria-label="Buscar paciente"
    />

    <p
      v-if="error"
      class="mt-5 border border-brand-dangerLine bg-brand-dangerSoft px-4 py-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
    </p>

    <ul v-if="resultados.length" class="mt-5 divide-y divide-brand-line border border-brand-line bg-brand-surface">
      <li v-for="r in resultados" :key="r.id">
        <RouterLink
          :to="{ name: 'admin-ficha', params: { id: r.id } }"
          class="flex items-center justify-between px-5 py-4 text-sm text-brand-ink hover:bg-brand-accentSoft"
        >
          <span>{{ r.name }} <span class="text-brand-inkSoft">· {{ r.species }}</span></span>
          <span class="text-xs text-brand-inkSoft">{{ r.tutorName }}</span>
        </RouterLink>
      </li>
    </ul>
    <p v-else-if="buscado" class="mt-5 text-sm text-brand-inkSoft">No se encontraron pacientes.</p>
    <p v-else class="mt-5 text-sm text-brand-inkSoft">Escribí al menos 2 letras para buscar.</p>
  </div>
</template>
