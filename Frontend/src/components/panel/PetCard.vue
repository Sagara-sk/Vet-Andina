<script setup lang="ts">
import type { Pet } from '@/data/panelMock'
import { initials } from '@/utils/format'

defineProps<{ pet: Pet }>()
</script>

<template>
  <article class="flex gap-3 border border-brand-line bg-brand-surface p-5">
    <span
      class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-brand-accentSoft text-xs text-brand-accentInk"
      aria-hidden="true"
    >
      {{ initials(pet.name) }}
    </span>
    <div>
      <h3 class="text-sm text-brand-ink">{{ pet.name }}</h3>
      <p class="mt-1 text-xs text-brand-inkSoft">
        {{ pet.species }} · {{ pet.breed }} · {{ pet.age }} {{ pet.age === 1 ? 'año' : 'años' }}
      </p>
      <p class="mt-4 text-xs text-brand-ink">{{ pet.note }}</p>
    </div>
  </article>
</template>
