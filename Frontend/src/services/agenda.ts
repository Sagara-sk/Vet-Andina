import { apiRequest } from './http'
import type { Turno } from './turnos'

export interface HojaDeRuta {
  id: string
  startsAt: string
  endsAt: string
  detail: string | null
  vet: { id: string; fullName: string }
}

// Turnos asignados (sin cancelados) y bloques de hoja de ruta del rango.
export interface Agenda {
  desde: string
  hasta: string
  veterinario: string | null
  turnos: Turno[]
  hojasDeRuta: HojaDeRuta[]
}

function rangeParams(desde: Date, hasta: Date) {
  return new URLSearchParams({ desde: desde.toISOString(), hasta: hasta.toISOString() })
}

// Agenda del profesional autenticado (VETERINARIO o SUPERADMIN).
export async function getMyAgenda(desde: Date, hasta: Date): Promise<Agenda> {
  const params = rangeParams(desde, hasta)
  return (await apiRequest<{ agenda: Agenda }>(`/api/veterinarios/me/agenda?${params}`)).agenda
}

// Agenda de todos los veterinarios o de uno (ADMINISTRATIVO o SUPERADMIN).
export async function getVetsAgenda(
  desde: Date,
  hasta: Date,
  veterinario?: string,
): Promise<Agenda> {
  const params = rangeParams(desde, hasta)
  if (veterinario) params.set('veterinario', veterinario)
  return (await apiRequest<{ agenda: Agenda }>(`/api/veterinarios/agenda?${params}`)).agenda
}
