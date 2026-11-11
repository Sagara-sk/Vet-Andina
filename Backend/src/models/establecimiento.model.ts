import { db } from "../config/database";
import { CARE_TYPE_SQL } from "./owner.model";

export interface OwnLot {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  animalCount: number;
}

export interface OwnEstablishment {
  id: string;
  name: string;
  locality: string | null;
  totalAnimals: number;
  lots: OwnLot[];
}

// Establecimientos (fincas) del tutor de la sesión con sus lotes. El filtro por
// dueño sale del id_usuario autenticado, nunca de un parámetro del cliente, así
// un tutor no puede pedir fincas ajenas. El animal también se filtra por dueño
// para no mostrar un lote de otro tutor aunque quedara asociado a esta finca.
// Además se exige que el tutor sea RURAL y solo se listan lotes de atención
// rural, así una mascota urbana no aparece como lote de campo.
export async function listOwnerEstablishments(userId: string): Promise<OwnEstablishment[]> {
  const result = await db.query<{
    id_finca: string;
    nombre_finca: string;
    localidad: string | null;
    id_animal: string | null;
    nombre_identificacion: string | null;
    especie: string | null;
    raza: string | null;
    cantidad_en_lote: number | null;
  }>(
    `SELECT f.id_finca, f.nombre_finca, f.localidad,
            a.id_animal, a.nombre_identificacion, a.especie, a.raza, a.cantidad_en_lote
     FROM finca f
     JOIN duenio d ON d.id_duenio = f.id_duenio
     LEFT JOIN animal a
       ON a.id_finca = f.id_finca
      AND a.id_duenio = d.id_duenio
      AND a.tipo_atencion = 'RURAL'
     WHERE d.id_usuario = $1
       AND (${CARE_TYPE_SQL}) = 'RURAL'
     ORDER BY f.nombre_finca, a.nombre_identificacion`,
    [userId],
  );

  const establishments = new Map<string, OwnEstablishment>();

  for (const row of result.rows) {
    let establishment = establishments.get(row.id_finca);
    if (!establishment) {
      establishment = {
        id: row.id_finca,
        name: row.nombre_finca,
        locality: row.localidad,
        totalAnimals: 0,
        lots: [],
      };
      establishments.set(row.id_finca, establishment);
    }

    if (row.id_animal) {
      const animalCount = row.cantidad_en_lote ?? 1;
      establishment.lots.push({
        id: row.id_animal,
        name: row.nombre_identificacion ?? "",
        species: row.especie ?? "",
        breed: row.raza,
        animalCount,
      });
      establishment.totalAnimals += animalCount;
    }
  }

  return [...establishments.values()];
}
