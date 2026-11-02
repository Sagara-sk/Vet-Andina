import type { PoolClient } from "pg";
import { db } from "../config/database";

export type TipoPersona = "INDIVIDUAL" | "EMPRESA_PRODUCTOR";
export type TipoAtencion = "URBANO" | "RURAL";

export interface TutorFields {
  fullName: string;
  phone: string;
  email: string;
  locality: string;
  dniCuit: string | null;
  address: string | null;
  personType: TipoPersona | null;
}

export interface TutorSummary {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  locality: string;
  dniCuit: string | null;
  hasAccount: boolean;
  animalCount: number;
}

export interface AnimalRecord {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  careType: TipoAtencion;
  herdSize: number;
  birthDate: string | null;
  farmId: string | null;
}

export interface TutorDetail extends TutorSummary {
  address: string | null;
  personType: TipoPersona | null;
  missedAppointments: number;
  animals: AnimalRecord[];
  farms: { id: string; name: string; locality: string }[];
}

export interface AnimalInput {
  name: string;
  species: string;
  breed: string | null;
  careType: TipoAtencion;
  herdSize: number;
  birthDate: string | null;
  farmId: string | null;
}

interface TutorRow {
  id_duenio: string;
  nombre_completo: string;
  telefono: string;
  email: string;
  localidad: string;
  dni_cuit: string | null;
  tiene_cuenta: boolean;
  cantidad_animales: string;
}

function toSummary(row: TutorRow): TutorSummary {
  return {
    id: row.id_duenio,
    fullName: row.nombre_completo,
    phone: row.telefono,
    email: row.email,
    locality: row.localidad,
    dniCuit: row.dni_cuit,
    hasAccount: row.tiene_cuenta,
    animalCount: Number(row.cantidad_animales),
  };
}

const SUMMARY_COLUMNS = `
  d.id_duenio, d.nombre_completo, d.telefono, d.email, d.localidad, d.dni_cuit,
  (d.id_usuario IS NOT NULL) AS tiene_cuenta,
  (SELECT COUNT(*) FROM animal a WHERE a.id_duenio = d.id_duenio) AS cantidad_animales`;

export async function listTutors(search: string | null): Promise<TutorSummary[]> {
  const result = await db.query<TutorRow>(
    `SELECT ${SUMMARY_COLUMNS}
     FROM duenio d
     WHERE $1::text IS NULL
        OR d.nombre_completo ILIKE '%' || $1 || '%'
        OR d.email ILIKE '%' || $1 || '%'
        OR d.telefono ILIKE '%' || $1 || '%'
        OR d.dni_cuit ILIKE '%' || $1 || '%'
        OR EXISTS (
          SELECT 1 FROM animal a
          WHERE a.id_duenio = d.id_duenio AND a.nombre_identificacion ILIKE '%' || $1 || '%'
        )
     ORDER BY d.nombre_completo
     LIMIT 100`,
    [search],
  );

  return result.rows.map(toSummary);
}

export async function findTutorById(id: string): Promise<TutorDetail | undefined> {
  const result = await db.query<
    TutorRow & {
      direccion_urbana: string | null;
      tipo_persona: TipoPersona | null;
      turnos_inasistidos_count: number | null;
    }
  >(
    `SELECT ${SUMMARY_COLUMNS}, d.direccion_urbana, d.tipo_persona, d.turnos_inasistidos_count
     FROM duenio d
     WHERE d.id_duenio = $1`,
    [id],
  );
  const row = result.rows[0];
  if (!row) return undefined;

  const animals = await db.query<{
    id_animal: string;
    nombre_identificacion: string;
    especie: string;
    raza: string | null;
    tipo_atencion: TipoAtencion;
    cantidad_en_lote: number | null;
    fecha_nacimiento: string | null;
    id_finca: string | null;
  }>(
    `SELECT id_animal, nombre_identificacion, especie, raza, tipo_atencion,
            cantidad_en_lote, to_char(fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento, id_finca
     FROM animal
     WHERE id_duenio = $1
     ORDER BY nombre_identificacion`,
    [id],
  );

  const farms = await db.query<{ id_finca: string; nombre_finca: string; localidad: string }>(
    `SELECT id_finca, nombre_finca, localidad FROM finca WHERE id_duenio = $1 ORDER BY nombre_finca`,
    [id],
  );

  return {
    ...toSummary(row),
    address: row.direccion_urbana,
    personType: row.tipo_persona,
    missedAppointments: row.turnos_inasistidos_count ?? 0,
    animals: animals.rows.map((a) => ({
      id: a.id_animal,
      name: a.nombre_identificacion,
      species: a.especie,
      breed: a.raza,
      careType: a.tipo_atencion,
      herdSize: a.cantidad_en_lote ?? 1,
      birthDate: a.fecha_nacimiento,
      farmId: a.id_finca,
    })),
    farms: farms.rows.map((f) => ({ id: f.id_finca, name: f.nombre_finca, locality: f.localidad })),
  };
}

export async function insertTutor(input: TutorFields): Promise<string> {
  const result = await db.query<{ id_duenio: string }>(
    `INSERT INTO duenio (nombre_completo, telefono, email, localidad, dni_cuit, direccion_urbana, tipo_persona)
     VALUES ($1, $2, $3, $4, $5, $6, $7)
     RETURNING id_duenio`,
    [
      input.fullName,
      input.phone,
      input.email,
      input.locality,
      input.dniCuit,
      input.address,
      input.personType,
    ],
  );

  const id = result.rows[0]?.id_duenio;
  if (!id) throw new Error("No se pudo crear el tutor.");
  return id;
}

export async function findTutorAccount(
  id: string,
): Promise<{ email: string; hasAccount: boolean } | undefined> {
  const result = await db.query<{ email: string; tiene_cuenta: boolean }>(
    `SELECT email, (id_usuario IS NOT NULL) AS tiene_cuenta FROM duenio WHERE id_duenio = $1`,
    [id],
  );
  const row = result.rows[0];
  return row ? { email: row.email, hasAccount: row.tiene_cuenta } : undefined;
}

// Reemplaza todos los campos editables; el servicio decide si el email puede cambiar.
export async function updateTutor(id: string, input: TutorFields): Promise<boolean> {
  const result = await db.query(
    `UPDATE duenio
     SET nombre_completo = $2, telefono = $3, email = $4, localidad = $5,
         dni_cuit = $6, direccion_urbana = $7, tipo_persona = $8
     WHERE id_duenio = $1`,
    [
      id,
      input.fullName,
      input.phone,
      input.email,
      input.locality,
      input.dniCuit,
      input.address,
      input.personType,
    ],
  );

  return result.rowCount === 1;
}

export async function farmBelongsToTutor(farmId: string, tutorId: string): Promise<boolean> {
  const result = await db.query(`SELECT 1 FROM finca WHERE id_finca = $1 AND id_duenio = $2`, [
    farmId,
    tutorId,
  ]);
  return result.rowCount === 1;
}

// El animal y su ficha médica se crean juntos: toda ficha tiene un animal y
// todo animal dado de alta desde la API tiene ficha.
export async function insertAnimalWithRecord(
  client: PoolClient,
  tutorId: string,
  input: AnimalInput,
): Promise<string> {
  const animal = await client.query<{ id_animal: string }>(
    `INSERT INTO animal (id_duenio, id_finca, tipo_atencion, nombre_identificacion, especie, raza,
                         cantidad_en_lote, fecha_nacimiento)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id_animal`,
    [
      tutorId,
      input.farmId,
      input.careType,
      input.name,
      input.species,
      input.breed,
      input.herdSize,
      input.birthDate,
    ],
  );

  const animalId = animal.rows[0]?.id_animal;
  if (!animalId) throw new Error("No se pudo crear el animal.");

  await client.query(`INSERT INTO ficha_medica (id_animal) VALUES ($1)`, [animalId]);
  return animalId;
}
