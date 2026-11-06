import { db } from "../config/database";
import { ConflictError } from "../services/errors";
import { lockVetDay } from "./agenda-locks";

export type EstadoTurno =
  | "PENDIENTE"
  | "PENDIENTE_PAGO"
  | "CONFIRMADO"
  | "REPROGRAMADO"
  | "CANCELADA"
  | "COMPLETADO"
  | "AUSENTE";

export type ModalidadTurno = "CONSULTORIO" | "RURAL";

export interface TurnoRecord {
  id: string;
  dateTime: Date;
  durationMinutes: number;
  modality: ModalidadTurno;
  status: EstadoTurno;
  reason: string | null;
  cancellationReason: string | null;
  animal: { id: string; name: string; species: string };
  tutor: { id: string; fullName: string; phone: string };
  vet: { id: string; fullName: string } | null;
}

export interface TurnoFilters {
  from: Date;
  to: Date;
  status: EstadoTurno | null;
  vetId: string | null;
}

export interface NewTurno {
  animalId: string;
  vetId: string | null;
  dateTime: Date;
  modality: ModalidadTurno;
  status: "PENDIENTE" | "PENDIENTE_PAGO" | "CONFIRMADO";
  reason: string;
  durationMinutes?: number;
}

interface TurnoRow {
  id_turno: string;
  fecha_hora: Date;
  modalidad: ModalidadTurno;
  estado: EstadoTurno;
  motivo: string | null;
  motivo_cancelacion: string | null;
  id_animal: string;
  nombre_identificacion: string;
  especie: string;
  id_duenio: string;
  duenio_nombre: string;
  telefono: string;
  id_veterinario: string | null;
  veterinario_nombre: string | null;
  duracion_minutos: number;
}

const SELECT_TURNO = `
  SELECT t.id_turno, t.fecha_hora, t.duracion_minutos, t.modalidad, t.estado, t.motivo, t.motivo_cancelacion,
         a.id_animal, a.nombre_identificacion, a.especie,
         d.id_duenio, d.nombre_completo AS duenio_nombre, d.telefono,
         t.id_veterinario, v.nombre_completo AS veterinario_nombre
  FROM turno t
  JOIN animal a ON a.id_animal = t.id_animal
  JOIN duenio d ON d.id_duenio = t.id_duenio
  LEFT JOIN usuario v ON v.id_usuario = t.id_veterinario`;

function toRecord(row: TurnoRow): TurnoRecord {
  return {
    id: row.id_turno,
    dateTime: row.fecha_hora,
    durationMinutes: row.duracion_minutos,
    modality: row.modalidad,
    status: row.estado,
    reason: row.motivo,
    cancellationReason: row.motivo_cancelacion,
    animal: {
      id: row.id_animal,
      name: row.nombre_identificacion,
      species: row.especie,
    },
    tutor: {
      id: row.id_duenio,
      fullName: row.duenio_nombre,
      phone: row.telefono,
    },
    vet: row.id_veterinario
      ? { id: row.id_veterinario, fullName: row.veterinario_nombre ?? "" }
      : null,
  };
}

export async function listTurnos(
  filters: TurnoFilters,
): Promise<TurnoRecord[]> {
  const result = await db.query<TurnoRow>(
    `${SELECT_TURNO}
     WHERE t.fecha_hora >= $1 AND t.fecha_hora < $2
       AND ($3::estado_turno IS NULL OR t.estado = $3)
       AND ($4::uuid IS NULL OR t.id_veterinario = $4)
     ORDER BY t.fecha_hora
     LIMIT 500`,
    [filters.from, filters.to, filters.status, filters.vetId],
  );

  return result.rows.map(toRecord);
}

export async function listOwnerTurnos(ownerId: string): Promise<TurnoRecord[]> {
  const result = await db.query<TurnoRow>(
    `${SELECT_TURNO}
     WHERE t.id_duenio = $1
     ORDER BY t.fecha_hora DESC
     LIMIT 100`,
    [ownerId],
  );
  return result.rows.map(toRecord);
}

export async function findTurnoById(
  id: string,
): Promise<TurnoRecord | undefined> {
  const result = await db.query<TurnoRow>(
    `${SELECT_TURNO} WHERE t.id_turno = $1`,
    [id],
  );
  const row = result.rows[0];
  return row ? toRecord(row) : undefined;
}

// Devuelve el dueño del animal; el turno lo toma de acá y no del cliente HTTP.
export async function findAnimalOwner(
  animalId: string,
): Promise<string | undefined> {
  const result = await db.query<{ id_duenio: string }>(
    `SELECT id_duenio FROM animal WHERE id_animal = $1`,
    [animalId],
  );
  return result.rows[0]?.id_duenio;
}

export async function isAssignableVet(userId: string): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM usuario
     WHERE id_usuario = $1 AND rol IN ('VETERINARIO', 'SUPERADMIN') AND matricula_profesional IS NOT NULL`,
    [userId],
  );
  return result.rowCount === 1;
}

export async function listAssignableVets(): Promise<
  { id: string; fullName: string }[]
> {
  const result = await db.query<{
    id_usuario: string;
    nombre_completo: string;
  }>(
    `SELECT id_usuario, nombre_completo FROM usuario
     WHERE rol IN ('VETERINARIO', 'SUPERADMIN') AND matricula_profesional IS NOT NULL
     ORDER BY nombre_completo`,
  );
  return result.rows.map((row) => ({
    id: row.id_usuario,
    fullName: row.nombre_completo,
  }));
}

// Otro turno activo del mismo veterinario en el mismo horario exacto.
export async function vetHasTurnoAt(
  vetId: string,
  dateTime: Date,
  excludeTurnoId: string | null,
  durationMinutes = 30,
): Promise<boolean> {
  const result = await db.query(
    `SELECT 1 FROM turno
     WHERE id_veterinario = $1
       AND fecha_hora < $2::timestamptz + ($4 * interval '1 minute')
       AND fecha_hora + (duracion_minutos * interval '1 minute') > $2
       AND estado NOT IN ('CANCELADA', 'AUSENTE')
       AND ($3::uuid IS NULL OR id_turno <> $3)
     LIMIT 1`,
    [vetId, dateTime, excludeTurnoId, durationMinutes],
  );
  return result.rowCount === 1;
}

export async function insertTurno(
  ownerId: string,
  input: NewTurno,
): Promise<string> {
  const client = await db.connect();
  const durationMinutes =
    input.durationMinutes ?? (input.modality === "RURAL" ? 120 : 30);
  try {
    await client.query("BEGIN");
    if (input.vetId) {
      await lockVetDay(client, input.vetId, input.dateTime);
      const overlap = await client.query(
        `SELECT 1 FROM turno
         WHERE id_veterinario = $1
           AND fecha_hora < $2::timestamptz + ($3 * interval '1 minute')
           AND fecha_hora + (duracion_minutos * interval '1 minute') > $2
           AND estado NOT IN ('CANCELADA', 'AUSENTE')
         LIMIT 1`,
        [input.vetId, input.dateTime, durationMinutes],
      );
      if (overlap.rowCount) {
        throw new ConflictError(
          "El profesional ya tiene un turno en ese intervalo.",
        );
      }
    }

    const result = await client.query<{ id_turno: string }>(
      `INSERT INTO turno
         (id_duenio, id_animal, id_veterinario, fecha_hora, modalidad, estado, motivo, duracion_minutos)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING id_turno`,
      [
        ownerId,
        input.animalId,
        input.vetId,
        input.dateTime,
        input.modality,
        input.status,
        input.reason,
        durationMinutes,
      ],
    );
    const id = result.rows[0]?.id_turno;
    if (!id) throw new Error("No se pudo crear el turno.");
    await client.query("COMMIT");
    return id;
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError: unknown) => {
      console.error(
        "No se pudo revertir la creación del turno:",
        rollbackError,
      );
    });
    throw error;
  } finally {
    client.release();
  }
}

// Las transiciones se aplican solo si el turno sigue en uno de los estados
// esperados: si otra persona lo cambió en el medio, no se pisa ese cambio.
export async function updateTurnoStatus(
  id: string,
  from: EstadoTurno[],
  to: EstadoTurno,
  cancellationReason: string | null = null,
): Promise<boolean> {
  const result = await db.query(
    `UPDATE turno
     SET estado = $3,
         motivo_cancelacion = CASE WHEN $3 = 'CANCELADA'::estado_turno THEN $4 ELSE motivo_cancelacion END
     WHERE id_turno = $1 AND estado = ANY($2::estado_turno[])`,
    [id, from, to, cancellationReason],
  );
  return result.rowCount === 1;
}

export async function rescheduleTurno(
  id: string,
  from: EstadoTurno[],
  dateTime: Date,
  vetId: string | null,
): Promise<boolean> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const current = await client.query<{
      id_veterinario: string | null;
      duracion_minutos: number;
    }>(
      `SELECT id_veterinario, duracion_minutos
       FROM turno
       WHERE id_turno = $1 AND estado = ANY($2::estado_turno[])
       FOR UPDATE`,
      [id, from],
    );
    const row = current.rows[0];
    if (!row) {
      await client.query("COMMIT");
      return false;
    }

    const targetVetId = vetId ?? row.id_veterinario;
    if (targetVetId) {
      await lockVetDay(client, targetVetId, dateTime);
      const overlap = await client.query(
        `SELECT 1 FROM turno
         WHERE id_veterinario = $1
           AND fecha_hora < $2::timestamptz + ($3 * interval '1 minute')
           AND fecha_hora + (duracion_minutos * interval '1 minute') > $2
           AND estado NOT IN ('CANCELADA', 'AUSENTE')
           AND id_turno <> $4
         LIMIT 1`,
        [targetVetId, dateTime, row.duracion_minutos, id],
      );
      if (overlap.rowCount) {
        throw new ConflictError(
          "El profesional ya tiene un turno en ese intervalo.",
        );
      }
    }

    const result = await client.query(
      `UPDATE turno
       SET fecha_hora = $3, estado = 'REPROGRAMADO', id_veterinario = COALESCE($4, id_veterinario)
       WHERE id_turno = $1 AND estado = ANY($2::estado_turno[])`,
      [id, from, dateTime, vetId],
    );
    await client.query("COMMIT");
    return result.rowCount === 1;
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError: unknown) => {
      console.error(
        "No se pudo revertir la reprogramación del turno:",
        rollbackError,
      );
    });
    throw error;
  } finally {
    client.release();
  }
}

export async function assignTurnoVeterinario(
  id: string,
  vetId: string,
): Promise<boolean> {
  const result = await db.query(
    `UPDATE turno SET id_veterinario = $2
     WHERE id_turno = $1 AND estado IN ('PENDIENTE', 'PENDIENTE_PAGO', 'CONFIRMADO', 'REPROGRAMADO')`,
    [id, vetId],
  );
  return result.rowCount === 1;
}
