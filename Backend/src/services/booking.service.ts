import { BadRequestError } from "./errors";
import {
  listAgendaHolidays,
  listBusySlots,
  listRuralAvailability,
  createClientBooking,
  type RuralAvailability,
} from "../models/booking.model";
import { listAssignableVets, type ModalidadTurno } from "../models/turno.model";

const ARGENTINA_TIME_ZONE = "America/Argentina/Buenos_Aires";
const MAX_RANGE_DAYS = 62;

export interface AvailableSlot {
  fechaHora: string;
  idVeterinario: string | null;
  nombreVeterinario: string | null;
  duracionMinutos: number;
}

export interface AvailableDay {
  fecha: string;
  lleno: boolean;
  horarios: AvailableSlot[];
}

function localDate(date: Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: ARGENTINA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(date);
  const value = Object.fromEntries(
    parts.map((part) => [part.type, part.value]),
  );
  return `${value.year}-${value.month}-${value.day}`;
}

function weekday(date: string): number {
  return new Date(`${date}T00:00:00Z`).getUTCDay();
}

function dateAtArgentinaTime(date: string, time: string): Date {
  return new Date(`${date}T${time}:00-03:00`);
}

function consultHours(date: string): string[] {
  const day = weekday(date);
  if (day === 0) return [];

  const times: string[] = [];
  const addRange = (startMinutes: number, endMinutes: number) => {
    for (let minutes = startMinutes; minutes < endMinutes; minutes += 30) {
      const hours = String(Math.floor(minutes / 60)).padStart(2, "0");
      const remainder = String(minutes % 60).padStart(2, "0");
      times.push(`${hours}:${remainder}`);
    }
  };

  if (day === 6) {
    addRange(9 * 60, 13 * 60);
    return times;
  }

  addRange(8 * 60 + 30, 12 * 60 + 30);
  addRange(16 * 60, 20 * 60);
  return times;
}

function overlaps(
  start: Date,
  durationMinutes: number,
  otherStart: Date,
  otherDurationMinutes: number,
): boolean {
  return (
    start.getTime() < otherStart.getTime() + otherDurationMinutes * 60_000 &&
    start.getTime() + durationMinutes * 60_000 > otherStart.getTime()
  );
}

function assertRange(from: Date, to: Date): void {
  if (
    !Number.isFinite(from.getTime()) ||
    !Number.isFinite(to.getTime()) ||
    to <= from ||
    to.getTime() - from.getTime() > MAX_RANGE_DAYS * 24 * 60 * 60 * 1000
  ) {
    throw new BadRequestError(
      `El rango de consulta debe ser válido y no superar ${MAX_RANGE_DAYS} días.`,
    );
  }
}

export async function getAvailability(input: {
  from: Date;
  to: Date;
  modality: ModalidadTurno;
  vetId: string | null;
}): Promise<AvailableDay[]> {
  assertRange(input.from, input.to);

  const [vets, holidays, busySlots, ruralSlots] = await Promise.all([
    listAssignableVets(),
    listAgendaHolidays(input.from, input.to),
    listBusySlots(
      new Date(input.from.getTime() + 3 * 60 * 60 * 1000),
      new Date(input.to.getTime() + 3 * 60 * 60 * 1000),
      input.vetId,
    ),
    input.modality === "RURAL"
      ? listRuralAvailability(input.from, input.to, input.vetId)
      : Promise.resolve([] as RuralAvailability[]),
  ]);
  if (input.vetId && !vets.some((vet) => vet.id === input.vetId)) {
    throw new BadRequestError(
      "El veterinario seleccionado no está disponible para reservas.",
    );
  }

  const holidaySet = new Set(holidays);
  const fromDate = new Date(
    `${input.from.toISOString().slice(0, 10)}T00:00:00Z`,
  );
  const toDate = new Date(`${input.to.toISOString().slice(0, 10)}T00:00:00Z`);
  const days: AvailableDay[] = [];

  for (
    const cursor = new Date(fromDate);
    cursor < toDate;
    cursor.setUTCDate(cursor.getUTCDate() + 1)
  ) {
    const date = cursor.toISOString().slice(0, 10);
    const hours: AvailableSlot[] = [];

    if (!holidaySet.has(date) && input.modality === "CONSULTORIO") {
      for (const time of consultHours(date)) {
        const start = dateAtArgentinaTime(date, time);
        if (start.getTime() <= Date.now()) continue;

        const availableVets = vets.filter(
          (vet) =>
            (!input.vetId || input.vetId === vet.id) &&
            !busySlots.some(
              (busy) =>
                busy.vetId === vet.id &&
                overlaps(start, 30, busy.dateTime, busy.durationMinutes),
            ),
        );

        if (availableVets.length) {
          const preferred = input.vetId ? availableVets[0] : null;
          hours.push({
            fechaHora: start.toISOString(),
            idVeterinario: preferred?.id ?? null,
            nombreVeterinario: preferred?.fullName ?? null,
            duracionMinutos: 30,
          });
        }
      }
    } else if (
      !holidaySet.has(date) &&
      input.modality === "RURAL" &&
      weekday(date) !== 0 &&
      weekday(date) !== 6
    ) {
      for (const slot of ruralSlots) {
        if (
          localDate(slot.dateTime) !== date ||
          slot.dateTime.getTime() <= Date.now()
        )
          continue;
        if (
          busySlots.some(
            (busy) =>
              busy.vetId === slot.vetId &&
              overlaps(
                slot.dateTime,
                slot.durationMinutes,
                busy.dateTime,
                busy.durationMinutes,
              ),
          )
        ) {
          continue;
        }
        const duplicate = hours.some(
          (existing) =>
            existing.fechaHora === slot.dateTime.toISOString() &&
            existing.duracionMinutos === slot.durationMinutes,
        );
        if (!duplicate) {
          hours.push({
            fechaHora: slot.dateTime.toISOString(),
            idVeterinario: input.vetId ? slot.vetId : null,
            nombreVeterinario: input.vetId ? slot.vetName : null,
            duracionMinutos: slot.durationMinutes,
          });
        }
      }
      hours.sort((a, b) => a.fechaHora.localeCompare(b.fechaHora));
    }

    days.push({ fecha: date, lleno: hours.length === 0, horarios: hours });
  }

  return days;
}

export async function requestClientBooking(input: {
  userId: string;
  animalId: string;
  vetId: string | null;
  dateTime: Date;
  modality: ModalidadTurno;
  reason: string;
  durationMinutes: number;
}): Promise<string> {
  if (input.dateTime.getTime() <= Date.now()) {
    throw new BadRequestError(
      "La fecha y hora del turno tiene que ser futura.",
    );
  }

  const date = localDate(input.dateTime);
  if (weekday(date) === 0) {
    throw new BadRequestError("No se reciben reservas los domingos.");
  }

  if (input.modality === "CONSULTORIO") {
    if (
      input.durationMinutes !== 30 ||
      !consultHours(date).some(
        (time) =>
          dateAtArgentinaTime(date, time).getTime() ===
          input.dateTime.getTime(),
      )
    ) {
      throw new BadRequestError(
        "El horario seleccionado no pertenece a la agenda de consultorio.",
      );
    }
  } else if (
    weekday(date) === 6 ||
    input.durationMinutes < 60 ||
    input.durationMinutes > 120 ||
    input.durationMinutes % 30 !== 0
  ) {
    throw new BadRequestError(
      "La agenda rural solo admite bloques de 1 a 2 horas de lunes a viernes.",
    );
  }

  return createClientBooking(input);
}

export function validateAgendaRange(from: Date, to: Date): void {
  assertRange(from, to);
}

export const agendaTimeZone = ARGENTINA_TIME_ZONE;
