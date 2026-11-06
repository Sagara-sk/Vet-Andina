import Joi from "joi";
import type { RequestHandler } from "express";
import {
  addRuralAvailability,
  assignAppointmentToVet,
  createClientBooking,
  deleteAgendaHoliday,
  deleteRuralAvailability,
  findOwnerIdForUser,
  listAgendaHolidayDetails,
  listOwnerAnimals,
  listRuralAvailabilityForStaff,
  upsertAgendaHoliday,
} from "../models/booking.model";
import { findTurnoById, listOwnerTurnos } from "../models/turno.model";
import type { AuthenticatedUserRecord } from "../models/owner.model";
import {
  getAvailability,
  requestClientBooking,
  validateAgendaRange,
} from "../services/booking.service";
import {
  isUuid,
  sendError,
  sendNotFound,
  sendValidationError,
} from "./respond";

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const availabilitySchema = Joi.object({
  desde: Joi.string().pattern(DATE_PATTERN).required(),
  hasta: Joi.string().pattern(DATE_PATTERN).required(),
  modalidad: Joi.string().valid("CONSULTORIO", "RURAL").required(),
  idVeterinario: Joi.string().guid().allow("", null).default(null),
}).unknown(false);

const bookingSchema = Joi.object({
  id_animal: Joi.string().guid().required(),
  id_veterinario: Joi.string().guid().allow(null).default(null),
  fecha_hora: Joi.date().iso().required(),
  modalidad: Joi.string().valid("CONSULTORIO", "RURAL").required(),
  motivo_consulta: Joi.string().trim().min(2).max(300).required(),
  duracion_minutos: Joi.number().integer().min(30).max(120).required(),
}).unknown(false);

const ruralAvailabilitySchema = Joi.object({
  id_veterinario: Joi.string().guid().allow(null).default(null),
  fecha_hora: Joi.date().iso().required(),
  duracion_minutos: Joi.number()
    .integer()
    .min(60)
    .max(120)
    .multiple(30)
    .required(),
}).unknown(false);

const holidaySchema = Joi.object({
  fecha: Joi.string().pattern(DATE_PATTERN).required(),
  motivo: Joi.string().trim().min(2).max(150).required(),
}).unknown(false);

function dateFromLocalDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function isValidDate(value: string): boolean {
  const date = dateFromLocalDate(value);
  return (
    Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export const getPublicAvailability: RequestHandler = async (
  request,
  response,
) => {
  response.set("Cache-Control", "no-store");
  const { error, value } = availabilitySchema.validate(request.query, {
    abortEarly: false,
  });
  if (error) return sendValidationError(response, error);

  const from = dateFromLocalDate(value.desde);
  const to = dateFromLocalDate(value.hasta);
  if (!isValidDate(value.desde) || !isValidDate(value.hasta)) {
    response
      .status(400)
      .json({ status: "error", message: "El rango de fechas no es válido." });
    return;
  }

  try {
    const days = await getAvailability({
      from,
      to,
      modality: value.modalidad,
      vetId: value.idVeterinario || null,
    });
    response.json({ status: "ok", dias: days });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al consultar disponibilidad",
      "No fue posible consultar la agenda.",
    );
  }
};

export const getMyAnimals: RequestHandler = async (request, response) => {
  const user = request.user as AuthenticatedUserRecord;
  try {
    response.json({
      status: "ok",
      animales: await listOwnerAnimals(user.userId),
    });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al listar animales del cliente",
      "No fue posible obtener tus animales.",
    );
  }
};

export const getMyTurnos: RequestHandler = async (request, response) => {
  const user = request.user as AuthenticatedUserRecord;
  try {
    const ownerId = await findOwnerIdForUser(user.userId);
    if (!ownerId) {
      response.json({ status: "ok", turnos: [] });
      return;
    }
    response.json({ status: "ok", turnos: await listOwnerTurnos(ownerId) });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al listar turnos del cliente",
      "No fue posible obtener tus turnos.",
    );
  }
};

export const postClientBooking: RequestHandler = async (request, response) => {
  const { error, value } = bookingSchema.validate(request.body, {
    abortEarly: false,
  });
  if (error) return sendValidationError(response, error);

  const user = request.user as AuthenticatedUserRecord;
  try {
    const id = await requestClientBooking({
      userId: user.userId,
      animalId: value.id_animal,
      vetId: value.id_veterinario,
      dateTime: value.fecha_hora,
      modality: value.modalidad,
      reason: value.motivo_consulta,
      durationMinutes: value.duracion_minutos,
    });
    const turno = await findTurnoById(id);
    response.status(201).json({ status: "ok", turno });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al solicitar un turno",
      "No fue posible crear la solicitud de turno.",
    );
  }
};

export const getRuralAvailability: RequestHandler = async (
  request,
  response,
) => {
  const { error, value } = Joi.object({
    desde: Joi.string().pattern(DATE_PATTERN).required(),
    hasta: Joi.string().pattern(DATE_PATTERN).required(),
    veterinario: Joi.string().guid(),
  })
    .unknown(false)
    .validate(request.query, { abortEarly: false });
  if (error) return sendValidationError(response, error);

  const user = request.user as AuthenticatedUserRecord;
  const vetId =
    user.role === "VETERINARIO" ? user.userId : (value.veterinario ?? null);
  try {
    const from = dateFromLocalDate(value.desde);
    const to = dateFromLocalDate(value.hasta);
    if (!isValidDate(value.desde) || !isValidDate(value.hasta)) {
      response
        .status(400)
        .json({ status: "error", message: "El rango de fechas no es válido." });
      return;
    }
    validateAgendaRange(from, to);
    const disponibilidad = await listRuralAvailabilityForStaff({
      from,
      to,
      vetId,
    });
    response.json({ status: "ok", disponibilidad });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al listar la agenda rural",
      "No fue posible obtener la agenda rural.",
    );
  }
};

export const postRuralAvailability: RequestHandler = async (
  request,
  response,
) => {
  const { error, value } = ruralAvailabilitySchema.validate(request.body, {
    abortEarly: false,
  });
  if (error) return sendValidationError(response, error);

  const user = request.user as AuthenticatedUserRecord;
  const vetId =
    user.role === "VETERINARIO" ? user.userId : value.id_veterinario;
  if (!vetId) {
    response.status(400).json({
      status: "error",
      message: "Seleccioná el veterinario para la ruta.",
    });
    return;
  }
  if (value.fecha_hora.getTime() <= Date.now()) {
    response
      .status(400)
      .json({ status: "error", message: "La disponibilidad debe ser futura." });
    return;
  }

  try {
    await addRuralAvailability({
      vetId,
      dateTime: value.fecha_hora,
      durationMinutes: value.duracion_minutos,
    });
    response
      .status(201)
      .json({ status: "ok", message: "Franja rural publicada." });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al publicar disponibilidad rural",
      "No fue posible publicar la franja.",
    );
  }
};

export const deleteRuralAvailabilityItem: RequestHandler = async (
  request,
  response,
) => {
  const id = Number(request.params.id);
  if (!Number.isSafeInteger(id) || id < 1)
    return sendNotFound(response, "La franja no existe.");

  const user = request.user as AuthenticatedUserRecord;
  try {
    const deleted = await deleteRuralAvailability(
      id.toString(),
      user.role === "VETERINARIO" ? user.userId : undefined,
    );
    if (!deleted)
      return sendNotFound(
        response,
        "La franja no existe o ya tiene un turno reservado.",
      );
    response.json({ status: "ok" });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al eliminar disponibilidad rural",
      "No fue posible eliminar la franja.",
    );
  }
};

export const postHoliday: RequestHandler = async (request, response) => {
  const { error, value } = holidaySchema.validate(request.body, {
    abortEarly: false,
  });
  if (error) return sendValidationError(response, error);
  if (!isValidDate(value.fecha)) {
    response
      .status(400)
      .json({ status: "error", message: "La fecha del feriado no es válida." });
    return;
  }

  try {
    await upsertAgendaHoliday(value.fecha, value.motivo);
    response.status(201).json({ status: "ok" });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al configurar feriado",
      "No fue posible configurar el feriado.",
    );
  }
};

export const deleteHoliday: RequestHandler = async (request, response) => {
  const { fecha } = request.params;
  if (
    typeof fecha !== "string" ||
    !DATE_PATTERN.test(fecha) ||
    !isValidDate(fecha)
  ) {
    return sendNotFound(response, "El feriado no existe.");
  }

  try {
    if (!(await deleteAgendaHoliday(fecha)))
      return sendNotFound(response, "El feriado no existe.");
    response.json({ status: "ok" });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al eliminar feriado",
      "No fue posible eliminar el feriado.",
    );
  }
};

export const getHolidays: RequestHandler = async (request, response) => {
  const { error, value } = Joi.object({
    desde: Joi.string().pattern(DATE_PATTERN).required(),
    hasta: Joi.string().pattern(DATE_PATTERN).required(),
  })
    .unknown(false)
    .validate(request.query, { abortEarly: false });
  if (error) return sendValidationError(response, error);

  try {
    const from = dateFromLocalDate(value.desde);
    const to = dateFromLocalDate(value.hasta);
    if (!isValidDate(value.desde) || !isValidDate(value.hasta)) {
      response
        .status(400)
        .json({ status: "error", message: "El rango de fechas no es válido." });
      return;
    }
    validateAgendaRange(from, to);
    const feriados = await listAgendaHolidayDetails(from, to);
    response.json({ status: "ok", feriados });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al listar feriados",
      "No fue posible obtener los feriados.",
    );
  }
};

export const putTurnoAssignment: RequestHandler = async (request, response) => {
  const { id } = request.params;
  if (!isUuid(id)) return sendNotFound(response, "El turno no existe.");

  const { error, value } = Joi.object({
    idVeterinario: Joi.string().guid().required(),
  })
    .unknown(false)
    .validate(request.body, { abortEarly: false });
  if (error) return sendValidationError(response, error);

  try {
    await assignAppointmentToVet(id, value.idVeterinario);
    const turno = await findTurnoById(id);
    response.json({ status: "ok", turno });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al asignar veterinario",
      "No fue posible asignar el turno.",
    );
  }
};
