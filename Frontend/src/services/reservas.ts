import { apiRequest } from './http'
import type { ModalidadTurno, Turno, Veterinario } from './turnos'

export interface AnimalPropio {
  id: string
  name: string
  species: string
  modality: 'URBANO' | 'RURAL'
  farmId: string | null
}

export interface HorarioDisponible {
  fechaHora: string
  idVeterinario: string | null
  nombreVeterinario: string | null
  duracionMinutos: number
}

export interface DiaDisponible {
  fecha: string
  lleno: boolean
  horarios: HorarioDisponible[]
}

export interface SolicitudTurno {
  id_animal: string
  id_veterinario: string | null
  fecha_hora: string
  modalidad: ModalidadTurno
  motivo_consulta: string
  motivo_categoria: string
  motivo_detalle: string
  duracion_minutos: number
}

export async function listMisAnimales(): Promise<AnimalPropio[]> {
  return (await apiRequest<{ animales: AnimalPropio[] }>('/api/animales/mios')).animales
}

export async function listMisTurnos(): Promise<Turno[]> {
  return (await apiRequest<{ turnos: Turno[] }>('/api/turnos/mios')).turnos
}

export async function listVeterinariosParaReserva(): Promise<Veterinario[]> {
  return (await apiRequest<{ veterinarios: Veterinario[] }>('/api/turnos/veterinarios'))
    .veterinarios
}

export async function getDisponibilidad(input: {
  desde: string
  hasta: string
  modalidad: ModalidadTurno
  idVeterinario: string
}): Promise<DiaDisponible[]> {
  const query = new URLSearchParams({
    desde: input.desde,
    hasta: input.hasta,
    modalidad: input.modalidad,
  })
  if (input.idVeterinario) query.set('idVeterinario', input.idVeterinario)
  return (await apiRequest<{ dias: DiaDisponible[] }>(`/api/turnos/disponibilidad?${query}`)).dias
}

export async function solicitarTurno(input: SolicitudTurno): Promise<Turno> {
  return (
    await apiRequest<{ turno: Turno }>('/api/turnos/solicitudes', {
      method: 'POST',
      body: input,
    })
  ).turno
}

export async function createRuralAvailability(input: {
  vetId: string | null
  dateTime: string
  durationMinutes: number
}): Promise<void> {
  await apiRequest('/api/turnos/disponibilidad-rural', {
    method: 'POST',
    body: {
      id_veterinario: input.vetId,
      fecha_hora: input.dateTime,
      duracion_minutos: input.durationMinutes,
    },
  })
}

export async function listRuralAvailability(input: {
  from: string
  to: string
  vetId?: string
}): Promise<
  { id: string; vetId: string; vetName: string; dateTime: string; durationMinutes: number }[]
> {
  const query = new URLSearchParams({ desde: input.from, hasta: input.to })
  if (input.vetId) query.set('veterinario', input.vetId)
  return (
    await apiRequest<{
      disponibilidad: {
        id: string
        vetId: string
        vetName: string
        dateTime: string
        durationMinutes: number
      }[]
    }>(`/api/turnos/disponibilidad-rural?${query}`)
  ).disponibilidad
}

export async function deleteRuralAvailability(id: string): Promise<void> {
  await apiRequest(`/api/turnos/disponibilidad-rural/${id}`, { method: 'DELETE' })
}

export async function listAgendaHolidays(input: {
  from: string
  to: string
}): Promise<{ date: string; reason: string }[]> {
  const query = new URLSearchParams({ desde: input.from, hasta: input.to })
  return (
    await apiRequest<{ feriados: { date: string; reason: string }[] }>(
      `/api/turnos/feriados?${query}`,
    )
  ).feriados
}

export async function createAgendaHoliday(date: string, reason: string): Promise<void> {
  await apiRequest('/api/turnos/feriados', {
    method: 'POST',
    body: { fecha: date, motivo: reason },
  })
}

export async function deleteAgendaHoliday(date: string): Promise<void> {
  await apiRequest(`/api/turnos/feriados/${date}`, { method: 'DELETE' })
}

export async function assignTurno(id: string, idVeterinario: string): Promise<Turno> {
  return (
    await apiRequest<{ turno: Turno }>(`/api/turnos/${id}/asignar`, {
      method: 'PUT',
      body: { idVeterinario },
    })
  ).turno
}
