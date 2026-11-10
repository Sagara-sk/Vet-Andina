export interface OpcionMotivoTurno {
  id: string
  label: string
}

export const motivosTurno: Record<'URBANO' | 'RURAL', OpcionMotivoTurno[]> = {
  URBANO: [
    { id: 'CONSULTA_GENERAL', label: 'Consulta Clínica General / Chequeo' },
    { id: 'VACUNACION', label: 'Vacunación y Desparasitación' },
    { id: 'CIRUGIA', label: 'Cirugía / Intervención Programada' },
    { id: 'ESTUDIOS', label: 'Estudios Clínicos (Ecografía, Análisis, RX)' },
    { id: 'URGENCIA', label: 'Urgencia / Sintomatología Aguda' },
    { id: 'OTRO_URBANO', label: 'Otro motivo' },
  ],
  RURAL: [
    { id: 'SANIDAD_LOTE', label: 'Sanidad de Lote / Vacunación Masiva' },
    { id: 'CONTROL_REPRODUCTIVO', label: 'Control Reproductivo / Tacto / Ecografía' },
    { id: 'ASISTENCIA_PARTO', label: 'Atención Obstétrica / Partos' },
    { id: 'REVISION_CAMPO', label: 'Revisión Clínica de Lote' },
    { id: 'OTRO_RURAL', label: 'Otro motivo rural' },
  ],
}
