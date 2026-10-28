<script setup lang="ts">
import type { TurnoEstado } from '@/data/agendaMock'

defineProps<{ estado: TurnoEstado }>()

const styles: Record<TurnoEstado, { label: string; class: string }> = {
  confirmado: { label: 'Confirmado', class: 'bg-brand-accentSoft text-brand-accentInk' },
  pendiente: { label: 'Por confirmar', class: 'bg-brand-warnSoft text-brand-warnInk' },
  atendido: { label: 'Atendido', class: 'bg-brand-muted text-brand-inkSoft' },
  cancelado: { label: 'Cancelado', class: 'bg-brand-dangerSoft text-brand-dangerInk' },
}
</script>

<template>
  <span class="inline-block shrink-0 rounded-full px-2.5 py-1 text-xs" :class="styles[estado].class">
    {{ styles[estado].label }}
  </span>
</template>
