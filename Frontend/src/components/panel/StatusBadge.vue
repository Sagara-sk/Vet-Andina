<script setup lang="ts">
import type { AppointmentStatus } from '@/data/panelMock'

defineProps<{ status: AppointmentStatus }>()

const styles: Record<AppointmentStatus, { label: string; class: string }> = {
  confirmado: { label: 'Confirmado', class: 'bg-brand-accentSoft text-brand-accentInk' },
  pendiente: { label: 'Pendiente', class: 'bg-[#f4ecdc] text-[#6b5526]' },
  realizado: { label: 'Realizado', class: 'bg-[#efeee9] text-brand-inkSoft' },
}
</script>

<template>
  <span class="inline-block rounded-full px-2.5 py-1 text-xs" :class="styles[status].class">
    {{ styles[status].label }}
  </span>
</template>
