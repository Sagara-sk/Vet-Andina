<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import {
  listMisEstablecimientos,
  type EstablecimientoPropio,
} from '@/services/establecimientos'

const establishments = ref<EstablecimientoPropio[]>([])
const loading = ref(true)
const error = ref('')

const totalAnimals = computed(() =>
  establishments.value.reduce((sum, item) => sum + item.totalAnimals, 0),
)

const totalLots = computed(() =>
  establishments.value.reduce((sum, item) => sum + item.lots.length, 0),
)

async function load() {
  loading.value = true
  error.value = ''

  try {
    establishments.value = await listMisEstablecimientos()
  } catch (err) {
    error.value =
      err instanceof Error
        ? err.message
        : 'No fue posible obtener tus establecimientos.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <header>
      <h1 class="font-serif text-3xl text-brand-ink">Mis establecimientos</h1>
      <p class="mt-2 text-sm text-brand-inkSoft">
        Campos y lotes ganaderos registrados a tu nombre.
      </p>
    </header>

    <p
      v-if="error"
      class="mt-6 rounded border border-brand-dangerLine bg-brand-dangerSoft p-3 text-sm text-brand-dangerInk"
      role="alert"
    >
      {{ error }}
      <button type="button" class="ml-2 underline" @click="load">
        Reintentar
      </button>
    </p>

    <p v-else-if="loading" class="mt-8 text-sm text-brand-inkSoft" role="status">
      Cargando tus establecimientos...
    </p>

    <p
      v-else-if="!establishments.length"
      class="mt-8 rounded-lg border border-brand-line bg-brand-surface p-6 text-sm text-brand-inkSoft"
    >
      Todavía no tenés establecimientos registrados. Comunicate con la veterinaria para darlos de
      alta.
    </p>

    <template v-else>
      <dl class="mt-8 grid gap-4 sm:grid-cols-3">
        <div class="rounded-lg border border-brand-line bg-brand-surface p-4">
          <dt class="text-xs text-brand-inkSoft">Establecimientos</dt>
          <dd class="mt-1 text-2xl text-brand-ink">{{ establishments.length }}</dd>
        </div>

        <div class="rounded-lg border border-brand-line bg-brand-surface p-4">
          <dt class="text-xs text-brand-inkSoft">Lotes</dt>
          <dd class="mt-1 text-2xl text-brand-ink">{{ totalLots }}</dd>
        </div>

        <div class="rounded-lg border border-brand-line bg-brand-surface p-4">
          <dt class="text-xs text-brand-inkSoft">Animales</dt>
          <dd class="mt-1 text-2xl text-brand-ink">{{ totalAnimals }}</dd>
        </div>
      </dl>

      <div class="mt-8 space-y-6">
        <section
          v-for="establishment in establishments"
          :key="establishment.id"
          class="rounded-lg border border-brand-line bg-brand-surface p-5 shadow-sm"
        >
          <header class="flex flex-wrap items-baseline justify-between gap-2">
            <div>
              <h2 class="text-lg font-semibold text-brand-ink">
                {{ establishment.name }}
              </h2>

              <p v-if="establishment.locality" class="text-xs text-brand-inkSoft">
                {{ establishment.locality }}
              </p>
            </div>

            <p class="text-sm text-brand-accentInk">
              {{ establishment.totalAnimals }} animales ·
              {{ establishment.lots.length }}
              {{ establishment.lots.length === 1 ? 'lote' : 'lotes' }}
            </p>
          </header>

          <p v-if="!establishment.lots.length" class="mt-4 text-sm text-brand-inkSoft">
            Este establecimiento no tiene lotes cargados.
          </p>

          <div v-else class="mt-4 overflow-x-auto">
            <table class="w-full min-w-[650px] text-left text-sm">
              <thead class="text-xs text-brand-inkSoft">
                <tr>
                  <th class="px-3 py-2 font-normal">Lote</th>
                  <th class="px-3 py-2 font-normal">Especie</th>
                  <th class="px-3 py-2 font-normal">Raza</th>
                  <th class="px-3 py-2 text-right font-normal">Cantidad</th>
                  <th class="px-3 py-2 text-center font-normal">Ficha médica</th>
                </tr>
              </thead>

              <tbody>
                <tr
                  v-for="lot in establishment.lots"
                  :key="lot.id"
                  class="border-t border-brand-line text-brand-ink"
                >
                  <td class="px-3 py-3">{{ lot.name }}</td>
                  <td class="px-3 py-3">{{ lot.species }}</td>
                  <td class="px-3 py-3">{{ lot.breed || '—' }}</td>
                  <td class="px-3 py-3 text-right">{{ lot.animalCount }}</td>

                  <td class="px-3 py-3 text-center">
                    <RouterLink
                      :to="{
                        name: 'panel-lote-ficha',
                        params: { id: lot.id },
                      }"
                      class="font-medium text-brand-accentInk underline underline-offset-2 hover:opacity-75"
                    >
                      Consultar ficha
                    </RouterLink>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </template>
  </div>
</template>
