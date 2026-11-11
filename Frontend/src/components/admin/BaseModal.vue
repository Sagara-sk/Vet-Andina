<script setup lang="ts">
import { onMounted, onUnmounted, ref, useId } from 'vue'

defineProps<{ title: string; subtitle?: string }>()
const emit = defineEmits<{ close: [] }>()

const titleId = useId()
const dialog = ref<HTMLElement | null>(null)

const FOCUSABLE =
  'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

let previousFocus: HTMLElement | null = null
let previousOverflow = ''

function focusables(): HTMLElement[] {
  return Array.from(dialog.value?.querySelectorAll<HTMLElement>(FOCUSABLE) ?? [])
}

function onKey(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    emit('close')
    return
  }

  // Mantiene el foco del teclado dentro del modal mientras está abierto.
  if (event.key !== 'Tab') return
  const items = focusables()
  const first = items[0]
  const last = items[items.length - 1]
  if (!first || !last) return

  if (
    event.shiftKey &&
    (document.activeElement === first || document.activeElement === dialog.value)
  ) {
    event.preventDefault()
    last.focus()
  } else if (!event.shiftKey && document.activeElement === last) {
    event.preventDefault()
    first.focus()
  }
}

onMounted(() => {
  previousFocus = document.activeElement instanceof HTMLElement ? document.activeElement : null
  // La página de fondo no se desplaza mientras el modal está abierto.
  previousOverflow = document.documentElement.style.overflow
  document.documentElement.style.overflow = 'hidden'
  window.addEventListener('keydown', onKey)

  // El foco va al diálogo y no a un campo, para no abrir el teclado en celular.
  dialog.value?.focus()
})

onUnmounted(() => {
  window.removeEventListener('keydown', onKey)
  document.documentElement.style.overflow = previousOverflow
  previousFocus?.focus()
})
</script>

<template>
  <div
    class="fixed inset-0 z-50 flex items-end justify-center bg-black/45 sm:items-center sm:p-4"
    @click.self="emit('close')"
  >
    <div
      ref="dialog"
      class="max-h-[92dvh] w-full max-w-lg overflow-y-auto rounded-t-lg bg-brand-surface text-brand-ink shadow-2xl outline-none sm:rounded-lg"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      :aria-labelledby="titleId"
    >
      <div
        class="flex items-start justify-between gap-4 border-b border-brand-line px-5 py-4 sm:px-6 sm:py-5"
      >
        <div>
          <h2 :id="titleId" class="font-serif text-xl">{{ title }}</h2>
          <p v-if="subtitle" class="mt-1 text-sm text-brand-inkSoft">{{ subtitle }}</p>
        </div>
        <button
          type="button"
          class="-mr-2 -mt-2 flex h-11 w-11 shrink-0 items-center justify-center text-xl text-brand-inkSoft hover:text-brand-ink"
          aria-label="Cerrar"
          @click="emit('close')"
        >
          ✕
        </button>
      </div>
      <div class="px-5 py-4 sm:px-6 sm:py-5">
        <slot />
      </div>
      <div v-if="$slots.footer" class="border-t border-brand-line px-5 py-4 sm:px-6">
        <slot name="footer" />
      </div>
    </div>
  </div>
</template>
