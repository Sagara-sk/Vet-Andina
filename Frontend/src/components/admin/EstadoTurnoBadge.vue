<script setup lang="ts">
import type { EstadoTurno } from '@/services/turnos'

defineProps<{ estado: EstadoTurno }>()

const styles: Record<EstadoTurno, { label: string; class: string }> = {
  PENDIENTE: { label: 'Por confirmar', class: 'bg-brand-warnSoft text-brand-warnInk' },
  PENDIENTE_PAGO: { label: 'Esperando seña', class: 'bg-brand-warnSoft text-brand-warnInk' },
  REPROGRAMADO: { label: 'Reprogramado', class: 'bg-brand-warnSoft text-brand-warnInk' },
  CONFIRMADO: { label: 'Confirmado', class: 'bg-brand-accentSoft text-brand-accentInk' },
  COMPLETADO: { label: 'Atendido', class: 'bg-brand-muted text-brand-inkSoft' },
  AUSENTE: { label: 'Ausente', class: 'bg-brand-muted text-brand-inkSoft' },
  CANCELADA: { label: 'Cancelado', class: 'bg-brand-dangerSoft text-brand-dangerInk' },
}
</script>

<template>
  <span class="inline-block shrink-0 whitespace-nowrap rounded-full px-2.5 py-1 text-xs" :class="styles[estado].class">
    {{ styles[estado].label }}
  </span>
</template>
