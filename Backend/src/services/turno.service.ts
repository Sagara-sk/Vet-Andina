import type { AuthenticatedUserRecord } from "../models/owner.model";
import {
  findTurnoByIdForUser,
  findAnimalOwner,
  findTurnoById,
  insertTurno,
  isAssignableVet,
  rescheduleTurno,
  updateTurnoStatus,
  vetHasTurnoAt,
  type EstadoTurno,
  type NewTurno,
  type TurnoRecord,
} from "../models/turno.model";
import { getAvailability } from "./booking.service";
import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "./errors";

// Estados desde los que se permite cada acción.
const CONFIRMABLE: EstadoTurno[] = ["PENDIENTE", "REPROGRAMADO"];
const RESCHEDULABLE: EstadoTurno[] = [
  "PENDIENTE",
  "PENDIENTE_PAGO",
  "CONFIRMADO",
  "REPROGRAMADO",
];
const CANCELLABLE: EstadoTurno[] = [
  "PENDIENTE",
  "PENDIENTE_PAGO",
  "CONFIRMADO",
  "REPROGRAMADO",
];

const CHANGED_MEANWHILE =
  "El turno cambió de estado mientras lo editabas. Recargá la agenda y volvé a intentarlo.";

// Matriz de roles: administrativo y superadmin gestionan la agenda global; el
// veterinario solo modifica los turnos asignados a él.
function canManage(user: AuthenticatedUserRecord, turno: TurnoRecord): boolean {
  if (user.role === "SUPERADMIN" || user.role === "ADMINISTRATIVO") return true;
  return user.role === "VETERINARIO" && turno.vet?.id === user.userId;
}

async function loadManageable(
  user: AuthenticatedUserRecord,
  id: string,
): Promise<TurnoRecord> {
  const turno = await findTurnoById(id);
  if (!turno) throw new NotFoundError("El turno no existe.");
  if (!canManage(user, turno)) {
    throw new ForbiddenError(
      "Solo podés modificar los turnos asignados a vos.",
    );
  }
  return turno;
}

function assertFuture(dateTime: Date): void {
  if (dateTime.getTime() < Date.now()) {
    throw new BadRequestError(
      "La fecha y hora del turno tiene que ser futura.",
    );
  }
}

async function assertVetAvailable(
  vetId: string,
  dateTime: Date,
  durationMinutes: number,
  excludeId: string | null,
) {
  if (!(await isAssignableVet(vetId))) {
    throw new BadRequestError(
      "El profesional elegido no puede atender turnos.",
    );
  }
  if (await vetHasTurnoAt(vetId, dateTime, excludeId, durationMinutes)) {
    throw new ConflictError(
      "El profesional ya tiene un turno en ese intervalo.",
    );
  }
}

export async function createTurno(input: NewTurno): Promise<TurnoRecord> {
  assertFuture(input.dateTime);

  const ownerId = await findAnimalOwner(input.animalId);
  if (!ownerId) throw new BadRequestError("El animal no existe.");

  const durationMinutes =
    input.durationMinutes ?? (input.modality === "RURAL" ? 120 : 30);
  if (input.vetId)
    await assertVetAvailable(
      input.vetId,
      input.dateTime,
      durationMinutes,
      null,
    );

  const id = await insertTurno(ownerId, { ...input, durationMinutes });
  return (await findTurnoById(id))!;
}

export async function confirmTurno(
  user: AuthenticatedUserRecord,
  id: string,
): Promise<TurnoRecord> {
  const turno = await loadManageable(user, id);

  if (!CONFIRMABLE.includes(turno.status)) {
    throw new ConflictError(
      "Solo se pueden confirmar turnos pendientes o reprogramados.",
    );
  }
  if (!(await updateTurnoStatus(id, CONFIRMABLE, "CONFIRMADO"))) {
    throw new ConflictError(CHANGED_MEANWHILE);
  }

  return (await findTurnoById(id))!;
}

export async function rescheduleTurnoFor(
  user: AuthenticatedUserRecord,
  id: string,
  dateTime: Date,
  vetId: string | null,
): Promise<TurnoRecord> {
  const turno = await loadManageable(user, id);

  // Reasignar a otro profesional es tarea de la gestión de agenda, no del veterinario.
  if (vetId && vetId !== turno.vet?.id && user.role === "VETERINARIO") {
    throw new ForbiddenError("No podés reasignar el turno a otro profesional.");
  }
  if (!RESCHEDULABLE.includes(turno.status)) {
    throw new ConflictError("Este turno ya no se puede reprogramar.");
  }

  assertFuture(dateTime);
  const finalVet = vetId ?? turno.vet?.id ?? null;
  if (finalVet)
    await assertVetAvailable(finalVet, dateTime, turno.durationMinutes, id);

  if (!(await rescheduleTurno(id, RESCHEDULABLE, dateTime, vetId))) {
    throw new ConflictError(CHANGED_MEANWHILE);
  }

  return (await findTurnoById(id))!;
}

export async function rescheduleClientTurno(
  user: AuthenticatedUserRecord,
  id: string,
  dateTime: Date,
): Promise<TurnoRecord> {
  const turno = await findTurnoByIdForUser(id, user.userId);
  if (!turno) throw new NotFoundError("El turno no existe.");
  if (!RESCHEDULABLE.includes(turno.status)) {
    throw new ConflictError("Este turno ya no se puede reprogramar.");
  }
  // Las solicitudes rurales son tentativas y pueden no tener veterinario: el
  // personal lo asigna al armar la hoja de ruta. Las urbanas siempre lo tienen.
  const vetId = turno.vet?.id ?? null;
  if (turno.modality === "URBANO" && !vetId) {
    throw new ConflictError("No se puede reprogramar un turno sin veterinario asignado.");
  }

  assertFuture(dateTime);
  const localDateParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(dateTime);
  const localDateValues = Object.fromEntries(
    localDateParts.map((part) => [part.type, part.value]),
  );
  const localDate = `${localDateValues.year}-${localDateValues.month}-${localDateValues.day}`;
  const from = new Date(`${localDate}T00:00:00.000Z`);
  const to = new Date(from);
  to.setUTCDate(to.getUTCDate() + 1);
  const availableDays = await getAvailability({
    from,
    to,
    modality: turno.modality,
    vetId,
  });
  const availableSlot = availableDays
    .flatMap((day) => day.horarios)
    .some(
      (slot) =>
        new Date(slot.fechaHora).getTime() === dateTime.getTime() &&
        slot.duracionMinutos === turno.durationMinutes,
    );
  if (!availableSlot) {
    throw new ConflictError(
      "Ese horario ya no está disponible. Elegí otro horario de la agenda.",
    );
  }

  if (!(await rescheduleTurno(id, RESCHEDULABLE, dateTime, vetId))) {
    throw new ConflictError(CHANGED_MEANWHILE);
  }

  return (await findTurnoById(id))!;
}

export async function cancelClientTurno(
  user: AuthenticatedUserRecord,
  id: string,
): Promise<TurnoRecord> {
  const turno = await findTurnoByIdForUser(id, user.userId);
  if (!turno) throw new NotFoundError("El turno no existe.");
  if (!CANCELLABLE.includes(turno.status)) {
    throw new ConflictError("Este turno ya no se puede cancelar.");
  }
  if (turno.dateTime.getTime() <= Date.now()) {
    throw new BadRequestError("Solo se pueden cancelar turnos futuros.");
  }
  if (!(await updateTurnoStatus(id, CANCELLABLE, "CANCELADA"))) {
    throw new ConflictError(CHANGED_MEANWHILE);
  }

  return (await findTurnoById(id))!;
}

export async function cancelTurno(
  user: AuthenticatedUserRecord,
  id: string,
  reason: string | null,
): Promise<TurnoRecord> {
  const turno = await loadManageable(user, id);

  if (!CANCELLABLE.includes(turno.status)) {
    throw new ConflictError("Este turno ya no se puede cancelar.");
  }
  if (!(await updateTurnoStatus(id, CANCELLABLE, "CANCELADA", reason))) {
    throw new ConflictError(CHANGED_MEANWHILE);
  }

  return (await findTurnoById(id))!;
}
