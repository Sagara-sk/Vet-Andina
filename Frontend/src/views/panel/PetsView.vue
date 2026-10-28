<script setup lang="ts">
import PetCard from '@/components/panel/PetCard.vue'
import { pets } from '@/data/panelMock'
</script>

<template>
  <div class="mx-auto max-w-[1210px]">
    <h1 class="font-serif text-3xl text-brand-ink">Mis mascotas</h1>
    <p class="mt-2 text-xs text-brand-inkSoft" role="note">
      Vista de demostración. Las mascotas no provienen de tu cuenta ni de la base de datos.
    </p>

    <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      <PetCard v-for="pet in pets" :key="pet.id" :pet="pet" />
    </div>
  </div>
</template>
