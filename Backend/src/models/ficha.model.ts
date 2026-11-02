import { db } from "../config/database";

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
  tutor: { id: string; fullName: string; phone: string };
  record: {
    id: string;
    openedAt: Date;
    allergiesHistory: string | null;
    status: string;
  } | null;
  entries: ClinicalEntry[];
}

export async function searchAnimals(search: string): Promise<AnimalSearchResult[]> {
  const result = await db.query<{
    id_animal: string;
    nombre_identificacion: string;
    especie: string;
    id_duenio: string;
    nombre_completo: string;
  }>(
    `SELECT a.id_animal, a.nombre_identificacion, a.especie, d.id_duenio, d.nombre_completo
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

export async function findMedicalRecord(animalId: string): Promise<MedicalRecord | undefined> {
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
    `SELECT a.id_animal, a.nombre_identificacion, a.especie, a.raza, a.tipo_atencion,
            a.cantidad_en_lote, to_char(a.fecha_nacimiento, 'YYYY-MM-DD') AS fecha_nacimiento,
            d.id_duenio, d.nombre_completo, d.telefono,
            f.id_ficha, f.fecha_apertura, f.alergias_antecedentes, f.estado
     FROM animal a
     JOIN duenio d ON d.id_duenio = a.id_duenio
     LEFT JOIN ficha_medica f ON f.id_animal = a.id_animal
     WHERE a.id_animal = $1`,
    [animalId],
  );
  const row = head.rows[0];
  if (!row) return undefined;

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
      }>(
        `SELECT e.id_evolucion, e.fecha_hora_registro, u.nombre_completo AS autor, e.modalidad,
                e.motivo_consulta, e.diagnostico, e.tratamiento, e.vacunas_aplicadas,
                e.es_fe_de_erratas, e.id_evolucion_referenciada
         FROM evolucion_clinica e
         JOIN usuario u ON u.id_usuario = e.id_autor
         WHERE e.id_ficha = $1
         ORDER BY e.fecha_hora_registro`,
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
    tutor: { id: row.id_duenio, fullName: row.nombre_completo, phone: row.telefono },
    record:
      row.id_ficha && row.fecha_apertura && row.estado
        ? {
            id: row.id_ficha,
            openedAt: row.fecha_apertura,
            allergiesHistory: row.alergias_antecedentes,
            status: row.estado,
          }
        : null,
    entries: entries.rows.map((e) => ({
      id: e.id_evolucion,
      recordedAt: e.fecha_hora_registro,
      authorName: e.autor,
      modality: e.modalidad,
      reason: e.motivo_consulta,
      diagnosis: e.diagnostico,
      treatment: e.tratamiento,
      vaccines: e.vacunas_aplicadas,
      isErratum: e.es_fe_de_erratas ?? false,
      referencedEntryId: e.id_evolucion_referenciada,
    })),
  };
}
