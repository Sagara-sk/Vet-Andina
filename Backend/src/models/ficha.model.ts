import type { PoolClient } from "pg";
import { db } from "../config/database";
import { BadRequestError, NotFoundError } from "../services/errors";

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
  attendedAt: Date | null;
  authorName: string;
  modality: string;
  kind: ClinicalEntryKind;
  reason: string;
  diagnosis: string | null;
  treatment: string | null;
  vaccines: unknown;
  details: ClinicalEntryDetails;
  isErratum: boolean;
  referencedEntryId: string | null;
  erratumDetail: string | null;
}

export type ClinicalEntryKind =
  | "CONSULTA"
  | "PESO"
  | "VACUNA"
  | "DESPARASITACION"
  | "TRATAMIENTO_GRUPAL"
  | "EVENTO_POBLACIONAL";

export interface ClinicalEntryDetails {
  pesoKg?: number;
  vacuna?: string;
  producto?: string;
  dosis?: string;
  proximaFecha?: string;
  cantidadTratada?: number;
  evento?: string;
  cantidadAfectada?: number;
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
    farmName: string | null;
    farmLocality: string | null;
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
  modality: "URBANO" | "RURAL";
  attendedAt: Date | null;
  kind: ClinicalEntryKind;
  reason: string;
  diagnosis: string | null;
  treatment: string | null;
  vaccines: unknown;
  details: ClinicalEntryDetails;
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
    nombre_finca: string | null;
    localidad_finca: string | null;
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
       fin.nombre_finca,
       fin.localidad AS localidad_finca,
       d.id_duenio,
       d.nombre_completo,
       d.telefono,
       fm.id_ficha,
       fm.fecha_apertura,
       fm.alergias_antecedentes,
       fm.estado
     FROM animal a
     JOIN duenio d ON d.id_duenio = a.id_duenio
     LEFT JOIN finca fin ON fin.id_finca = a.id_finca
     LEFT JOIN ficha_medica fm ON fm.id_animal = a.id_animal
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
        fecha_hora_atencion: Date | null;
        autor: string;
        modalidad: string;
        tipo_registro: ClinicalEntryKind;
        motivo_consulta: string;
        diagnostico: string | null;
        tratamiento: string | null;
        vacunas_aplicadas: unknown;
        detalles_especificos: ClinicalEntryDetails;
        es_fe_de_erratas: boolean | null;
        id_evolucion_referenciada: string | null;
        detalle_fe_erratas: string | null;
      }>(
        `SELECT
           e.id_evolucion,
           e.fecha_hora_registro,
           e.fecha_hora_atencion,
           u.nombre_completo AS autor,
           e.modalidad,
           e.tipo_registro,
           e.motivo_consulta,
           e.diagnostico,
           e.tratamiento,
           e.vacunas_aplicadas,
           e.detalles_especificos,
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
      farmName: row.nombre_finca,
      farmLocality: row.localidad_finca,
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
      attendedAt: entry.fecha_hora_atencion,
      authorName: entry.autor,
      modality: entry.modalidad,
      kind: entry.tipo_registro,
      reason: entry.motivo_consulta,
      diagnosis: entry.diagnostico,
      treatment: entry.tratamiento,
      vaccines: entry.vacunas_aplicadas,
      details: entry.detalles_especificos ?? {},
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
  const record = await client.query<{
    tipo_atencion: "URBANO" | "RURAL";
    cantidad_en_lote: number;
  }>(
    `SELECT a.tipo_atencion, COALESCE(a.cantidad_en_lote, 1) AS cantidad_en_lote
     FROM ficha_medica f
     JOIN animal a ON a.id_animal = f.id_animal
     WHERE f.id_ficha = $1
     FOR SHARE OF a`,
    [input.recordId],
  );
  const recordData = record.rows[0];
  const careType = recordData?.tipo_atencion;

  if (!careType || careType !== input.entry.modality) {
    throw new BadRequestError("La modalidad no coincide con la ficha.");
  }

  const ruralOnly = ["TRATAMIENTO_GRUPAL", "EVENTO_POBLACIONAL"].includes(
    input.entry.kind,
  );
  const urbanOnly = ["PESO", "VACUNA", "DESPARASITACION"].includes(
    input.entry.kind,
  );

  if ((ruralOnly && careType !== "RURAL") || (urbanOnly && careType !== "URBANO")) {
    throw new BadRequestError(
      "El tipo de registro no corresponde a esta ficha.",
    );
  }

  const lotSize = recordData.cantidad_en_lote;
  if (
    (input.entry.details.cantidadTratada !== undefined &&
      input.entry.details.cantidadTratada > lotSize) ||
    (input.entry.details.cantidadAfectada !== undefined &&
      input.entry.details.cantidadAfectada > lotSize)
  ) {
    throw new BadRequestError(
      "La cantidad no puede superar las cabezas registradas en el lote.",
    );
  }

  const result = await client.query<{ id_evolucion: string }>(
    `INSERT INTO evolucion_clinica (
       id_ficha,
       id_autor,
       modalidad,
       fecha_hora_atencion,
       tipo_registro,
       motivo_consulta,
       diagnostico,
       tratamiento,
       vacunas_aplicadas,
       detalles_especificos,
       es_fe_de_erratas
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9::jsonb, $10::jsonb, FALSE)
     RETURNING id_evolucion`,
    [
      input.recordId,
      input.authorId,
      input.entry.modality,
      input.entry.attendedAt,
      input.entry.kind,
      input.entry.reason,
      input.entry.diagnosis,
      input.entry.treatment,
      JSON.stringify(input.entry.vaccines ?? []),
      JSON.stringify(input.entry.details),
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
    modalidad: "URBANO" | "RURAL";
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