<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'

defineProps<{ title: string; subtitle?: string }>()
const emit = defineEmits<{ close: [] }>()

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') emit('close')
}

onMounted(() => window.addEventListener('keydown', onKey))
onUnmounted(() => window.removeEventListener('keydown', onKey))
</script>

<template>
  <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4" @click.self="emit('close')">
    <div
      class="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-lg bg-brand-surface text-brand-ink shadow-2xl"
      role="dialog"
      aria-modal="true"
      :aria-label="title"
    >
      <div class="flex items-start justify-between border-b border-brand-line px-6 py-5">
        <div>
          <h2 class="font-serif text-xl">{{ title }}</h2>
          <p v-if="subtitle" class="mt-1 text-sm text-brand-inkSoft">{{ subtitle }}</p>
        </div>
        <button
          type="button"
          class="text-xl text-brand-inkSoft hover:text-brand-ink"
          aria-label="Cerrar"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>
      <div class="px-6 py-5">
        <slot />
      </div>
    </div>
  </div>
</template>
