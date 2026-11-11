import type { PoolClient } from "pg";
import { db } from "../config/database";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
} from "../services/errors";
import { lockAgendaDate, lockVetDay, lockVetInterval } from "./agenda-locks";
import {
  vetHasHojaDeRutaOverlap,
  type ModalidadTurno,
} from "./turno.model";

export interface BookingAnimal {
  id: string;
  name: string;
  species: string;
  modality: "URBANO" | "RURAL";
  farmId: string | null;
}

export interface BusySlot {
  vetId: string;
  dateTime: Date;
  durationMinutes: number;
}

export interface RuralAvailability {
  id: string;
  vetId: string;
  vetName: string;
  dateTime: Date;
  durationMinutes: number;
}

export interface ClientBookingInput {
  userId: string;
  animalId: string;
  vetId: string | null;
  dateTime: Date;
  modality: ModalidadTurno;
  reason: string;
  reasonCategory: string | null;
  reasonDetail: string | null;
  durationMinutes: number;
}

function argentinaDate(dateTime: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateTime);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

// Animales del tutor de la sesión. El dueño sale siempre del id_usuario
// autenticado, nunca de un parámetro del cliente. Con careType se limita además
// al tipo de atención pedido (URBANO = mascotas, RURAL = animales y lotes de campo).
export async function listOwnerAnimals(
  userId: string,
  careType?: "URBANO" | "RURAL",
): Promise<BookingAnimal[]> {
  const result = await db.query<{
    id_animal: string;
    nombre_identificacion: string;
    especie: string;
    tipo_atencion: "URBANO" | "RURAL";
    id_finca: string | null;
  }>(
    `SELECT a.id_animal, a.nombre_identificacion, a.especie, a.tipo_atencion, a.id_finca
     FROM animal a
     JOIN duenio d ON d.id_duenio = a.id_duenio
     WHERE d.id_usuario = $1
       AND ($2::text IS NULL OR a.tipo_atencion::text = $2::text)
     ORDER BY a.nombre_identificacion`,
    [userId, careType ?? null],
  );
  return result.rows.map((row) => ({
    id: row.id_animal,
    name: row.nombre_identificacion,
    species: row.especie,
    modality: row.tipo_atencion,
    farmId: row.id_finca,
  }));
}

export async function findOwnerIdForUser(
  userId: string,
): Promise<string | undefined> {
  const result = await db.query<{ id_duenio: string }>(
    `SELECT id_duenio FROM duenio WHERE id_usuario = $1 LIMIT 1`,
    [userId],
  );
  return result.rows[0]?.id_duenio;
}

export async function listBusySlots(
  from: Date,
  to: Date,
  vetId?: string | null,
): Promise<BusySlot[]> {
  const result = await db.query<{
    id_veterinario: string;
    fecha_hora: Date;
    duracion_minutos: number;
  }>(
    `SELECT id_veterinario, fecha_hora, duracion_minutos
     FROM turno
     WHERE id_veterinario IS NOT NULL
       AND fecha_hora >= $1::timestamptz - interval '2 hours'
       AND fecha_hora < $2
       AND estado NOT IN ('CANCELADA', 'AUSENTE')
       AND ($3::uuid IS NULL OR id_veterinario = $3)`,
    [from, to, vetId ?? null],
  );
  return result.rows.map((row) => ({
    vetId: row.id_veterinario,
    dateTime: row.fecha_hora,
    durationMinutes: row.duracion_minutos,
  }));
}

export async function listRuralAvailability(
  from: Date,
  to: Date,
  vetId?: string | null,
): Promise<RuralAvailability[]> {
  const result = await db.query<{
    id_disponibilidad: string;
    id_veterinario: string;
    nombre_completo: string;
    fecha_hora: Date;
    duracion_minutos: number;
  }>(
    `SELECT a.id_disponibilidad, a.id_veterinario, u.nombre_completo,
            a.fecha_hora, a.duracion_minutos
     FROM agenda_disponibilidad_rural a
     JOIN usuario u ON u.id_usuario = a.id_veterinario
     WHERE a.fecha_hora >= ($1::date::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
       AND a.fecha_hora < ($2::date::timestamp AT TIME ZONE 'America/Argentina/Buenos_Aires')
       AND ($3::uuid IS NULL OR a.id_veterinario = $3)
     ORDER BY a.fecha_hora, u.nombre_completo`,
    [
      from.toISOString().slice(0, 10),
      to.toISOString().slice(0, 10),
      vetId ?? null,
    ],
  );
  return result.rows.map((row) => ({
    id: row.id_disponibilidad,
    vetId: row.id_veterinario,
    vetName: row.nombre_completo,
    dateTime: row.fecha_hora,
    durationMinutes: row.duracion_minutos,
  }));
}

export async function listRuralAvailabilityForStaff(input: {
  from: Date;
  to: Date;
  vetId?: string | null;
}): Promise<RuralAvailability[]> {
  return listRuralAvailability(input.from, input.to, input.vetId);
}

export async function listAgendaHolidays(
  from: Date,
  to: Date,
): Promise<string[]> {
  const result = await db.query<{ fecha: string }>(
    `SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha
     FROM agenda_feriado
     WHERE fecha >= $1::date AND fecha < $2::date`,
    [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)],
  );
  return result.rows.map((row) => row.fecha);
}

export async function listAgendaHolidayDetails(
  from: Date,
  to: Date,
): Promise<{ date: string; reason: string }[]> {
  const result = await db.query<{ fecha: string; motivo: string }>(
    `SELECT to_char(fecha, 'YYYY-MM-DD') AS fecha, motivo
     FROM agenda_feriado
     WHERE fecha >= $1::date AND fecha < $2::date
     ORDER BY fecha`,
    [from.toISOString().slice(0, 10), to.toISOString().slice(0, 10)],
  );
  return result.rows.map((row) => ({ date: row.fecha, reason: row.motivo }));
}

async function overlapsExistingAppointment(
  client: PoolClient,
  vetId: string,
  dateTime: Date,
  durationMinutes: number,
  excludeTurnoId: string | null = null,
): Promise<boolean> {
  const result = await client.query(
    `SELECT 1
     FROM turno
     WHERE id_veterinario = $1
       AND fecha_hora < $2::timestamptz + ($3 * interval '1 minute')
       AND fecha_hora + (duracion_minutos * interval '1 minute') > $2
       AND estado NOT IN ('CANCELADA', 'AUSENTE')
       AND ($4::uuid IS NULL OR id_turno <> $4)
     LIMIT 1`,
    [vetId, dateTime, durationMinutes, excludeTurnoId],
  );
  return result.rowCount === 1;
}

export async function createClientBooking(
  input: ClientBookingInput,
): Promise<string> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const owner = await client.query<{
      id_duenio: string;
      tipo_atencion: "URBANO" | "RURAL";
      id_finca: string | null;
    }>(
      `SELECT d.id_duenio, a.tipo_atencion, a.id_finca
       FROM duenio d
       JOIN animal a ON a.id_duenio = d.id_duenio
       WHERE d.id_usuario = $1 AND a.id_animal = $2
       LIMIT 1`,
      [input.userId, input.animalId],
    );
    const ownerRow = owner.rows[0];
    const ownerId = ownerRow?.id_duenio;
    if (!ownerId)
      throw new NotFoundError("No se encontró el animal en tu cuenta.");
    const expectedModality =
      ownerRow.tipo_atencion === "RURAL" ? "RURAL" : "URBANO";
    if (
      expectedModality !== input.modality ||
      (input.modality === "RURAL" && !ownerRow.id_finca)
    ) {
      throw new BadRequestError(
        "La modalidad seleccionada no corresponde al paciente elegido.",
      );
    }

    await client.query(
      `SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`,
      [`turno-animal:${input.animalId}`],
    );
    const existingBooking = await client.query(
      `SELECT 1 FROM turno
       WHERE id_animal = $1
         AND estado NOT IN ('CANCELADA', 'COMPLETADO', 'AUSENTE')
         AND fecha_hora > CURRENT_TIMESTAMP
       LIMIT 1`,
      [input.animalId],
    );
    if (existingBooking.rowCount) {
      throw new ConflictError(
        "Este paciente ya tiene un turno vigente. Modificalo desde Mis turnos antes de solicitar otro.",
      );
    }

    await lockAgendaDate(client, argentinaDate(input.dateTime));

    const holiday = await client.query(
      `SELECT 1 FROM agenda_feriado
       WHERE fecha = ($1::timestamptz AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`,
      [input.dateTime],
    );
    if (holiday.rowCount)
      throw new ConflictError(
        "La fecha seleccionada es feriado y no recibe reservas.",
      );

    let assignedVet: string | null = null;
    if (input.modality === "URBANO") {
      const vets = await client.query<{ id_usuario: string }>(
        `SELECT id_usuario
         FROM usuario
         WHERE rol IN ('VETERINARIO', 'SUPERADMIN') AND matricula_profesional IS NOT NULL
           AND ($1::uuid IS NULL OR id_usuario = $1)
         ORDER BY id_usuario`,
        [input.vetId],
      );
      if (vets.rowCount === 0)
        throw new NotFoundError(
          "No hay veterinarios disponibles para esta solicitud.",
        );

      for (const vet of vets.rows)
        await lockVetInterval(
          client,
          vet.id_usuario,
          input.dateTime,
          input.durationMinutes,
        );

      let routeConflicts = 0;
      for (const vet of vets.rows) {
        if (
          await vetHasHojaDeRutaOverlap(
            client,
            vet.id_usuario,
            input.dateTime,
            input.durationMinutes,
          )
        ) {
          routeConflicts += 1;
          continue;
        }

        if (
          !(await overlapsExistingAppointment(
            client,
            vet.id_usuario,
            input.dateTime,
            input.durationMinutes,
          ))
        ) {
          assignedVet = vet.id_usuario;
          break;
        }
      }

      if (!assignedVet && routeConflicts === vets.rowCount)
        throw new ConflictError(
          "El veterinario seleccionado tiene un bloque de trabajo externo en ese horario. Elegí otro horario o veterinario.",
        );

      if (!assignedVet)
        throw new ConflictError("Ese horario acaba de ocuparse. Elegí otro.");
    }

    const inserted = await client.query<{ id_turno: string }>(
      `INSERT INTO turno
         (id_duenio, id_animal, id_veterinario, fecha_hora, modalidad, estado,
          motivo, motivo_categoria, motivo_detalle, duracion_minutos)
       VALUES ($1, $2, $3, $4, $5, 'PENDIENTE', $6, $7, $8, $9)
       RETURNING id_turno`,
      [
        ownerId,
        input.animalId,
        assignedVet,
        input.dateTime,
        input.modality,
        input.reason,
        input.reasonCategory,
        input.reasonDetail,
        input.durationMinutes,
      ],
    );
    const id = inserted.rows[0]?.id_turno;
    if (!id) throw new Error("No se pudo crear la solicitud de turno.");

    await client.query("COMMIT");
    return id;
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError: unknown) => {
      console.error("No se pudo revertir la reserva del turno:", rollbackError);
    });
    throw error;
  } finally {
    client.release();
  }
}

export async function addRuralAvailability(input: {
  vetId: string;
  dateTime: Date;
  durationMinutes: number;
}): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await lockAgendaDate(client, argentinaDate(input.dateTime));
    await lockVetDay(client, input.vetId, input.dateTime);
    if (
      input.durationMinutes < 60 ||
      input.durationMinutes > 120 ||
      input.durationMinutes % 30 !== 0
    ) {
      throw new BadRequestError(
        "La duración de una franja rural debe ser de 1 a 2 horas.",
      );
    }

    const vet = await client.query(
      `SELECT 1 FROM usuario
       WHERE id_usuario = $1 AND rol IN ('VETERINARIO', 'SUPERADMIN')
         AND matricula_profesional IS NOT NULL`,
      [input.vetId],
    );
    if (!vet.rowCount)
      throw new NotFoundError(
        "El veterinario no está habilitado para recibir turnos.",
      );

    const holiday = await client.query(
      `SELECT 1 FROM agenda_feriado
       WHERE fecha = ($1::timestamptz AT TIME ZONE 'America/Argentina/Buenos_Aires')::date`,
      [input.dateTime],
    );
    if (holiday.rowCount)
      throw new ConflictError(
        "No se puede publicar disponibilidad para un feriado.",
      );

    const localParts = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Argentina/Buenos_Aires",
      weekday: "short",
      hour: "2-digit",
      hourCycle: "h23",
    }).formatToParts(input.dateTime);
    const localWeekday = localParts.find(
      (part) => part.type === "weekday",
    )?.value;
    const hour = Number(localParts.find((part) => part.type === "hour")?.value);
    const weekend = localWeekday === "Sat" || localWeekday === "Sun";
    if (weekend) {
      throw new ConflictError(
        "La disponibilidad rural solo se publica de lunes a viernes.",
      );
    }
    if (hour < 6 || hour >= 18) {
      throw new ConflictError(
        "La franja rural debe comenzar entre las 06:00 y las 17:59.",
      );
    }

    const busy = await overlapsExistingAppointment(
      client,
      input.vetId,
      input.dateTime,
      input.durationMinutes,
    );
    if (busy)
      throw new ConflictError(
        "El veterinario ya tiene un turno en ese intervalo.",
      );

    const existing = await client.query(
      `SELECT 1 FROM agenda_disponibilidad_rural
       WHERE id_veterinario = $1
         AND fecha_hora < $2::timestamptz + ($3 * interval '1 minute')
         AND fecha_hora + (duracion_minutos * interval '1 minute') > $2
       LIMIT 1`,
      [input.vetId, input.dateTime, input.durationMinutes],
    );
    if (existing.rowCount)
      throw new ConflictError("Ya existe una franja rural superpuesta.");

    await client.query(
      `INSERT INTO agenda_disponibilidad_rural (id_veterinario, fecha_hora, duracion_minutos)
       VALUES ($1, $2, $3)`,
      [input.vetId, input.dateTime, input.durationMinutes],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError: unknown) => {
      console.error(
        "No se pudo revertir la disponibilidad rural:",
        rollbackError,
      );
    });
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteRuralAvailability(
  id: string,
  vetId?: string,
): Promise<boolean> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const route = await client.query<{
      id_veterinario: string;
      fecha_hora: Date;
    }>(
      `SELECT id_veterinario, fecha_hora
       FROM agenda_disponibilidad_rural
       WHERE id_disponibilidad = $1 AND ($2::uuid IS NULL OR id_veterinario = $2)`,
      [id, vetId ?? null],
    );
    const row = route.rows[0];
    if (!row) {
      await client.query("ROLLBACK");
      return false;
    }

    await lockAgendaDate(client, argentinaDate(row.fecha_hora));
    await lockVetDay(client, row.id_veterinario, row.fecha_hora);
    const result = await client.query(
      `DELETE FROM agenda_disponibilidad_rural a
       WHERE a.id_disponibilidad = $1
         AND NOT EXISTS (
           SELECT 1 FROM turno t
           WHERE t.id_veterinario = a.id_veterinario
             AND t.fecha_hora < a.fecha_hora + (a.duracion_minutos * interval '1 minute')
             AND t.fecha_hora + (t.duracion_minutos * interval '1 minute') > a.fecha_hora
             AND t.estado NOT IN ('CANCELADA', 'AUSENTE')
         )`,
      [id],
    );
    await client.query("COMMIT");
    return result.rowCount === 1;
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError: unknown) => {
      console.error(
        "No se pudo revertir la eliminación de disponibilidad:",
        rollbackError,
      );
    });
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertAgendaHoliday(
  date: string,
  reason: string,
): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await lockAgendaDate(client, date);
    await client.query(
      `INSERT INTO agenda_feriado (fecha, motivo) VALUES ($1, $2)
       ON CONFLICT (fecha) DO UPDATE SET motivo = EXCLUDED.motivo`,
      [date, reason],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError: unknown) => {
      console.error(
        "No se pudo revertir la configuración del feriado:",
        rollbackError,
      );
    });
    throw error;
  } finally {
    client.release();
  }
}

export async function deleteAgendaHoliday(date: string): Promise<boolean> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    await lockAgendaDate(client, date);
    const result = await client.query(
      `DELETE FROM agenda_feriado WHERE fecha = $1`,
      [date],
    );
    await client.query("COMMIT");
    return result.rowCount === 1;
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError: unknown) => {
      console.error(
        "No se pudo revertir la eliminación del feriado:",
        rollbackError,
      );
    });
    throw error;
  } finally {
    client.release();
  }
}

export async function assignAppointmentToVet(
  turnoId: string,
  vetId: string,
): Promise<void> {
  const client = await db.connect();
  try {
    await client.query("BEGIN");
    const turn = await client.query<{
      fecha_hora: Date;
      modalidad: ModalidadTurno;
      duracion_minutos: number;
      estado: string;
    }>(
      `SELECT fecha_hora, modalidad, duracion_minutos, estado
       FROM turno WHERE id_turno = $1 FOR UPDATE`,
      [turnoId],
    );
    const row = turn.rows[0];
    if (!row) throw new NotFoundError("El turno no existe.");
    if (
      !["PENDIENTE", "PENDIENTE_PAGO", "CONFIRMADO", "REPROGRAMADO"].includes(
        row.estado,
      )
    ) {
      throw new ConflictError("Este turno ya no se puede asignar.");
    }

    await lockVetInterval(
      client,
      vetId,
      row.fecha_hora,
      row.duracion_minutos,
    );
    const vet = await client.query(
      `SELECT 1 FROM usuario
       WHERE id_usuario = $1 AND rol IN ('VETERINARIO', 'SUPERADMIN')
         AND matricula_profesional IS NOT NULL`,
      [vetId],
    );
    if (!vet.rowCount)
      throw new NotFoundError(
        "El veterinario no está habilitado para recibir turnos.",
      );

    if (
      await vetHasHojaDeRutaOverlap(
        client,
        vetId,
        row.fecha_hora,
        row.duracion_minutos,
      )
    ) {
      throw new ConflictError(
        "El veterinario tiene un bloque de trabajo externo en ese horario.",
      );
    }

    if (
      await overlapsExistingAppointment(
        client,
        vetId,
        row.fecha_hora,
        row.duracion_minutos,
        turnoId,
      )
    ) {
      throw new ConflictError(
        "El veterinario ya tiene un turno en ese intervalo.",
      );
    }

    await client.query(
      `UPDATE turno SET id_veterinario = $2 WHERE id_turno = $1`,
      [turnoId, vetId],
    );
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError: unknown) => {
      console.error(
        "No se pudo revertir la asignación del turno:",
        rollbackError,
      );
    });
    throw error;
  } finally {
    client.release();
  }
}
