import {
  listAgendaTurnos,
  listHojaDeRutaRecords,
  type HojaDeRutaRecord,
  type TurnoRecord,
} from "../models/turno.model";

export interface AgendaQuery {
  from: Date;
  to: Date;
  // null = todos los veterinarios (solo para administración).
  vetId: string | null;
}

export interface Agenda {
  desde: Date;
  hasta: Date;
  veterinario: string | null;
  turnos: TurnoRecord[];
  hojasDeRuta: HojaDeRutaRecord[];
}

// Une en un mismo payload los turnos asignados (urbanos y rurales, sin los
// cancelados) y los bloques de hoja de ruta del mismo rango.
export async function getAgenda(query: AgendaQuery): Promise<Agenda> {
  const [turnos, hojasDeRuta] = await Promise.all([
    listAgendaTurnos(query.from, query.to, query.vetId),
    listHojaDeRutaRecords(query.from, query.to, query.vetId),
  ]);

  return {
    desde: query.from,
    hasta: query.to,
    veterinario: query.vetId,
    turnos,
    hojasDeRuta,
  };
}
