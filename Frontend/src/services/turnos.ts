import { apiRequest } from './http'

export type EstadoTurno =
  | 'PENDIENTE'
  | 'PENDIENTE_PAGO'
  | 'CONFIRMADO'
  | 'REPROGRAMADO'
  | 'CANCELADA'
  | 'COMPLETADO'
  | 'AUSENTE'

export type ModalidadTurno = 'CONSULTORIO' | 'RURAL'

export interface Turno {
  id: string
  dateTime: string
  modality: ModalidadTurno
  status: EstadoTurno
  reason: string | null
  cancellationReason: string | null
  animal: { id: string; name: string; species: string }
  tutor: { id: string; fullName: string; phone: string }
  vet: { id: string; fullName: string } | null
}

export interface Veterinario {
  id: string
  fullName: string
}

export interface NuevoTurno {
  idAnimal: string
  idVeterinario: string | null
  fechaHora: string
  modalidad: ModalidadTurno
  estado: 'PENDIENTE' | 'CONFIRMADO'
  motivo: string
}

// Estados desde los que la API acepta cada acción (ver turno.service.ts).
export const CONFIRMABLE: EstadoTurno[] = ['PENDIENTE', 'REPROGRAMADO']
export const MODIFICABLE: EstadoTurno[] = ['PENDIENTE', 'PENDIENTE_PAGO', 'CONFIRMADO', 'REPROGRAMADO']

export async function listTurnos(filters: {
  desde: Date
  hasta: Date
  estado?: EstadoTurno | ''
  veterinario?: string
}): Promise<Turno[]> {
  const params = new URLSearchParams({
    desde: filters.desde.toISOString(),
    hasta: filters.hasta.toISOString(),
  })
  if (filters.estado) params.set('estado', filters.estado)
  if (filters.veterinario) params.set('veterinario', filters.veterinario)

  return (await apiRequest<{ turnos: Turno[] }>(`/api/turnos?${params}`)).turnos
}

export async function listVets(): Promise<Veterinario[]> {
  return (await apiRequest<{ veterinarios: Veterinario[] }>('/api/turnos/veterinarios')).veterinarios
}

export async function createTurno(input: NuevoTurno): Promise<Turno> {
  return (await apiRequest<{ turno: Turno }>('/api/turnos', { method: 'POST', body: input })).turno
}

export async function confirmTurno(id: string): Promise<Turno> {
  return (await apiRequest<{ turno: Turno }>(`/api/turnos/${id}/confirmar`, { method: 'POST' })).turno
}

export async function rescheduleTurno(
  id: string,
  fechaHora: string,
  idVeterinario: string | null,
): Promise<Turno> {
  return (
    await apiRequest<{ turno: Turno }>(`/api/turnos/${id}/reprogramar`, {
      method: 'POST',
      body: { fechaHora, idVeterinario },
    })
  ).turno
}

export async function cancelTurno(id: string, motivo: string): Promise<Turno> {
  return (
    await apiRequest<{ turno: Turno }>(`/api/turnos/${id}/cancelar`, {
      method: 'POST',
      body: { motivo },
    })
  ).turno
}
