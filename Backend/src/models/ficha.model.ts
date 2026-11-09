import type { PoolClient } from "pg";
import { db } from "../config/database";
import { NotFoundError } from "../services/errors";

export interface AnimalSearchResult {
  id: string;
  name: string;
  species: string;
  tutorId: string;
  tutorName: string;
}

export interface ClinicalEntry {
  id: string;
  recordedAt: Date;
  authorName: string;
  modality: string;
  reason: string;
  diagnosis: string | null;
  treatment: string | null;
  vaccines: unknown;
  isErratum: boolean;
  referencedEntryId: string | null;
  erratumDetail: string | null;
}

export interface MedicalRecord {
  animal: {
    id: string;
    name: string;
    species: string;
    breed: string | null;
    careType: string;
    herdSize: number;
    birthDate: string | null;
  };
  tutor: {
    id: string;
    fullName: string;
    phone: string;
  };
  record: {
    id: string;
    openedAt: Date;
    allergiesHistory: string | null;
    status: string;
  } | null;
  entries: ClinicalEntry[];
}

export interface MedicalRecordUpdate {
  allergiesHistory: string | null;
  status: "ACTIVO" | "INACTIVO" | "FALLECIDO";
}

export interface NewClinicalEntry {
  modality: "CONSULTORIO" | "RURAL";
  reason: string;
  diagnosis: string | null;
  treatment: string | null;
  vaccines: unknown;
}

// Busca animales por nombre o por nombre del tutor.
export async function searchAnimals(
  search: string,
): Promise<AnimalSearchResult[]> {
  const result = await db.query<{
    id_animal: string;
    nombre_identificacion: string;
    especie: string;
    id_duenio: string;
    nombre_completo: string;
  }>(
    `SELECT
       a.id_animal,
       a.nombre_identificacion,
       a.especie,
       d.id_duenio,
       d.nombre_completo
     FROM animal a
     JOIN duenio d ON d.id_duenio = a.id_duenio
     WHERE a.nombre_identificacion ILIKE '%' || $1 || '%'
        OR d.nombre_completo ILIKE '%' || $1 || '%'
     ORDER BY a.nombre_identificacion
     LIMIT 50`,
    [search],
  );

  return result.rows.map((row) => ({
    id: row.id_animal,
    name: row.nombre_identificacion,
    species: row.especie,
    tutorId: row.id_duenio,
    tutorName: row.nombre_completo,
  }));
}

// Obtiene la ficha médica de un animal y sus evoluciones.
export async function findMedicalRecord(
  animalId: string,
  ownerUserId: string | null = null,
): Promise<MedicalRecord | undefined> {
  const head = await db.query<{
    id_animal: string;
    nombre_identificacion: string;
    especie: string;
    raza: string | null;
    tipo_atencion: string;
    cantidad_en_lote: number | null;
    fecha_nacimiento: string | null;
    id_duenio: string;
    nombre_completo: string;
    telefono: string;
    id_ficha: string | null;
    fecha_apertura: Date | null;
    alergias_antecedentes: string | null;
    estado: string | null;
  }>(
    `SELECT
       a.id_animal,
       a.nombre_identificacion,
       a.especie,
       a.raza,
       a.tipo_atencion,
       a.cantidad_en_lote,
       to_char(a.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
       d.id_duenio,
       d.nombre_completo,
       d.telefono,
       f.id_ficha,
       f.fecha_apertura,
       f.alergias_antecedentes,
       f.estado
     FROM animal a
     JOIN duenio d ON d.id_duenio = a.id_duenio
     LEFT JOIN ficha_medica f ON f.id_animal = a.id_animal
     WHERE a.id_animal = $1
       AND ($2::uuid IS NULL OR d.id_usuario = $2)`,
    [animalId, ownerUserId],
  );

  const row = head.rows[0];

  if (!row) {
    return undefined;
  }

  const entries = row.id_ficha
    ? await db.query<{
        id_evolucion: string;
        fecha_hora_registro: Date;
        autor: string;
        modalidad: string;
        motivo_consulta: string;
        diagnostico: string | null;
        tratamiento: string | null;
        vacunas_aplicadas: unknown;
        es_fe_de_erratas: boolean | null;
        id_evolucion_referenciada: string | null;
        detalle_fe_erratas: string | null;
      }>(
        `SELECT
           e.id_evolucion,
           e.fecha_hora_registro,
           u.nombre_completo AS autor,
           e.modalidad,
           e.motivo_consulta,
           e.diagnostico,
           e.tratamiento,
           e.vacunas_aplicadas,
           e.es_fe_de_erratas,
           e.id_evolucion_referenciada,
           e.detalle_fe_erratas
         FROM evolucion_clinica e
         JOIN usuario u ON u.id_usuario = e.id_autor
         WHERE e.id_ficha = $1
         ORDER BY e.fecha_hora_registro ASC, e.id_evolucion ASC`,
        [row.id_ficha],
      )
    : { rows: [] };

  return {
    animal: {
      id: row.id_animal,
      name: row.nombre_identificacion,
      species: row.especie,
      breed: row.raza,
      careType: row.tipo_atencion,
      herdSize: row.cantidad_en_lote ?? 1,
      birthDate: row.fecha_nacimiento,
    },
    tutor: {
      id: row.id_duenio,
      fullName: row.nombre_completo,
      phone: row.telefono,
    },
    record:
      row.id_ficha && row.fecha_apertura && row.estado
        ? {
            id: row.id_ficha,
            openedAt: row.fecha_apertura,
            allergiesHistory: row.alergias_antecedentes,
            status: row.estado,
          }
        : null,
    entries: entries.rows.map((entry) => ({
      id: entry.id_evolucion,
      recordedAt: entry.fecha_hora_registro,
      authorName: entry.autor,
      modality: entry.modalidad,
      reason: entry.motivo_consulta,
      diagnosis: entry.diagnostico,
      treatment: entry.tratamiento,
      vaccines: entry.vacunas_aplicadas,
      isErratum: entry.es_fe_de_erratas ?? false,
      referencedEntryId: entry.id_evolucion_referenciada,
      erratumDetail: entry.detalle_fe_erratas,
    })),
  };
}

// Garantiza que el animal tenga una ficha médica.
export async function ensureMedicalRecord(
  client: PoolClient,
  animalId: string,
): Promise<string> {
  const animal = await client.query(
    `SELECT id_animal
     FROM animal
     WHERE id_animal = $1
     FOR UPDATE`,
    [animalId],
  );

  if (!animal.rowCount) {
    throw new NotFoundError("El animal no existe.");
  }

  await client.query(
    `INSERT INTO ficha_medica (id_animal)
     VALUES ($1)
     ON CONFLICT (id_animal) DO NOTHING`,
    [animalId],
  );

  const result = await client.query<{ id_ficha: string }>(
    `SELECT id_ficha
     FROM ficha_medica
     WHERE id_animal = $1`,
    [animalId],
  );

  const fichaId = result.rows[0]?.id_ficha;

  if (!fichaId) {
    throw new Error("No se pudo obtener la ficha médica.");
  }

  return fichaId;
}

// Actualiza los datos generales de la ficha médica.
export async function updateMedicalRecord(
  client: PoolClient,
  animalId: string,
  input: MedicalRecordUpdate,
): Promise<void> {
  const fichaId = await ensureMedicalRecord(client, animalId);

  await client.query(
    `UPDATE ficha_medica
     SET alergias_antecedentes = $2,
         estado = $3
     WHERE id_ficha = $1`,
    [fichaId, input.allergiesHistory, input.status],
  );
}

// Registra una nueva evolución clínica.
export async function insertClinicalEntry(
  client: PoolClient,
  input: {
    recordId: string;
    authorId: string;
    entry: NewClinicalEntry;
  },
): Promise<string> {
  const result = await client.query<{ id_evolucion: string }>(
    `INSERT INTO evolucion_clinica (
       id_ficha,
       id_autor,
       modalidad,
       motivo_consulta,
       diagnostico,
       tratamiento,
       vacunas_aplicadas,
       es_fe_de_erratas
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, FALSE)
     RETURNING id_evolucion`,
    [
      input.recordId,
      input.authorId,
      input.entry.modality,
      input.entry.reason,
      input.entry.diagnosis,
      input.entry.treatment,
      JSON.stringify(input.entry.vaccines ?? []),
    ],
  );

  const id = result.rows[0]?.id_evolucion;

  if (!id) {
    throw new Error("No se pudo registrar la evolución clínica.");
  }

  return id;
}

// Registra una fe de erratas vinculada a una evolución existente.
export async function insertErratum(
  client: PoolClient,
  input: {
    recordId: string;
    evolutionId: string;
    authorId: string;
    detail: string;
  },
): Promise<string> {
  // La evolución original debe pertenecer a esta misma ficha.
  const original = await client.query<{
    modalidad: "CONSULTORIO" | "RURAL";
  }>(
    `SELECT modalidad
     FROM evolucion_clinica
     WHERE id_evolucion = $1
       AND id_ficha = $2
     FOR SHARE`,
    [input.evolutionId, input.recordId],
  );

  const originalEntry = original.rows[0];

  if (!originalEntry) {
    throw new NotFoundError(
      "La evolución que intentás corregir no existe en esta ficha.",
    );
  }

  const result = await client.query<{ id_evolucion: string }>(
    `INSERT INTO evolucion_clinica (
       id_ficha,
       id_autor,
       modalidad,
       motivo_consulta,
       es_fe_de_erratas,
       id_evolucion_referenciada,
       detalle_fe_erratas
     )
     VALUES ($1, $2, $3, 'Fe de erratas', TRUE, $4, $5)
     RETURNING id_evolucion`,
    [
      input.recordId,
      input.authorId,
      originalEntry.modalidad,
      input.evolutionId,
      input.detail,
    ],
  );

  const id = result.rows[0]?.id_evolucion;

  if (!id) {
    throw new Error("No se pudo registrar la fe de erratas.");
  }

  return id;
}