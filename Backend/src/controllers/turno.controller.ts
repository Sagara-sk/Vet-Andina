import Joi from "joi";
import type { RequestHandler } from "express";
import type { AuthenticatedUserRecord } from "../models/owner.model";
import {
  listAssignableVets,
  listTurnos,
  listVeterinarians,
  insertHojaDeRutaBlock,
  normalizeModalidadTurno,
} from "../models/turno.model";
import {
  cancelTurno,
  confirmTurno,
  createTurno,
  rescheduleTurnoFor,
} from "../services/turno.service";
import { isUuid, sendError, sendNotFound, sendValidationError } from "./respond";

const ESTADOS = ["PENDIENTE", "PENDIENTE_PAGO", "CONFIRMADO", "REPROGRAMADO", "CANCELADA", "COMPLETADO", "AUSENTE"];
const MAX_RANGE_DAYS = 92;
const DAY_MS = 24 * 60 * 60 * 1000;

const listSchema = Joi.object({
  desde: Joi.date().iso(),
  hasta: Joi.date().iso(),
  estado: Joi.string().valid(...ESTADOS),
  veterinario: Joi.string().guid(),
}).unknown(false);

const createSchema = Joi.object({
  idAnimal: Joi.string().guid().required(),
  idVeterinario: Joi.string().guid().allow(null).default(null),
  fechaHora: Joi.date().iso().required(),
  modalidad: Joi.string().valid("URBANO", "CONSULTORIO", "RURAL").required(),
  estado: Joi.string().valid("PENDIENTE", "CONFIRMADO").default("PENDIENTE"),
  motivo: Joi.string().trim().min(2).max(300),
  motivo_categoria: Joi.string().trim().min(2).max(80),
  motivo_detalle: Joi.string().trim().max(300).allow("", null).default(null),
})
  .or("motivo", "motivo_categoria")
  .unknown(false);

const rescheduleSchema = Joi.object({
  fechaHora: Joi.date().iso().required(),
  idVeterinario: Joi.string().guid().allow(null).default(null),
}).unknown(false);

const cancelSchema = Joi.object({
  motivo: Joi.string().trim().max(500).allow("", null).empty("").default(null),
}).unknown(false);

const hojaDeRutaSchema = Joi.object({
  id_veterinario: Joi.string().guid().required(),
  fecha_hora_inicio: Joi.date().iso().required(),
  fecha_hora_fin: Joi.date().iso().required(),
  detalle: Joi.string().trim().max(300).allow("", null).default(null),
}).unknown(false);

export const getTurnos: RequestHandler = async (request, response) => {
  response.set("Cache-Control", "no-store");
  const { error, value } = listSchema.validate(request.query, { abortEarly: false });
  if (error) return sendValidationError(response, error);

  // Por defecto: desde hoy a las 00:00 y los próximos 7 días.
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from: Date = value.desde ?? today;
  const to: Date = value.hasta ?? new Date(from.getTime() + 7 * DAY_MS);

  if (to <= from || to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) {
    response.status(400).json({
      status: "error",
      message: `El rango de fechas tiene que ser válido y de ${MAX_RANGE_DAYS} días como máximo.`,
    });
    return;
  }

  try {
    const turnos = await listTurnos({
      from,
      to,
      status: value.estado ?? null,
      vetId: value.veterinario ?? null,
    });
    response.json({ status: "ok", turnos });
  } catch (error) {
    sendError(response, error, "Error al listar turnos", "No fue posible obtener los turnos.");
  }
};

export const getVets: RequestHandler = async (request, response) => {
  try {
    const user = request.user as AuthenticatedUserRecord;
    const veterinarios =
      user.role === "CLIENTE"
        ? await listVeterinarians()
        : await listAssignableVets();
    response.json({ status: "ok", veterinarios });
  } catch (error) {
    sendError(response, error, "Error al listar veterinarios", "No fue posible obtener los veterinarios.");
  }
};

export const postHojaDeRuta: RequestHandler = async (request, response) => {
  const { error, value } = hojaDeRutaSchema.validate(request.body, {
    abortEarly: false,
  });
  if (error) return sendValidationError(response, error);

  const user = request.user as AuthenticatedUserRecord;
  if (value.fecha_hora_fin <= value.fecha_hora_inicio) {
    response.status(400).json({
      status: "error",
      message: "La hora de fin debe ser posterior a la hora de inicio.",
    });
    return;
  }
  if (user.role === "VETERINARIO" && value.id_veterinario !== user.userId) {
    response.status(403).json({
      status: "error",
      message: "Solo podés registrar bloques externos en tu propia agenda.",
    });
    return;
  }

  try {
    await insertHojaDeRutaBlock({
      vetId: value.id_veterinario,
      startsAt: value.fecha_hora_inicio,
      endsAt: value.fecha_hora_fin,
      detail: value.detalle || null,
    });
    response.status(201).json({ status: "ok" });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al registrar un bloque de trabajo externo",
      "No fue posible registrar el bloque en la hoja de ruta.",
    );
  }
};

export const postTurno: RequestHandler = async (request, response) => {
  const { error, value } = createSchema.validate(request.body, { abortEarly: false });
  if (error) return sendValidationError(response, error);

  try {
    const turno = await createTurno({
      animalId: value.idAnimal,
      vetId: value.idVeterinario,
      dateTime: value.fechaHora,
      modality: normalizeModalidadTurno(value.modalidad),
      status: value.estado,
      reason:
        value.motivo ??
        [value.motivo_categoria, value.motivo_detalle].filter(Boolean).join(" - "),
      reasonCategory: value.motivo_categoria ?? null,
      reasonDetail:
        value.motivo_detalle ||
        (value.motivo_categoria ? null : value.motivo ?? null),
    });
    response.status(201).json({ status: "ok", turno });
  } catch (error) {
    sendError(response, error, "Error al crear un turno", "No fue posible crear el turno.");
  }
};

export const postConfirm: RequestHandler = async (request, response) => {
  const { id } = request.params;
  if (!isUuid(id)) return sendNotFound(response, "El turno no existe.");

  try {
    const turno = await confirmTurno(request.user as AuthenticatedUserRecord, id);
    response.json({ status: "ok", turno });
  } catch (error) {
    sendError(response, error, "Error al confirmar un turno", "No fue posible confirmar el turno.");
  }
};

export const postReschedule: RequestHandler = async (request, response) => {
  const { id } = request.params;
  if (!isUuid(id)) return sendNotFound(response, "El turno no existe.");

  const { error, value } = rescheduleSchema.validate(request.body, { abortEarly: false });
  if (error) return sendValidationError(response, error);

  try {
    const turno = await rescheduleTurnoFor(
      request.user as AuthenticatedUserRecord,
      id,
      value.fechaHora,
      value.idVeterinario,
    );
    response.json({ status: "ok", turno });
  } catch (error) {
    sendError(response, error, "Error al reprogramar un turno", "No fue posible reprogramar el turno.");
  }
};

export const postCancel: RequestHandler = async (request, response) => {
  const { id } = request.params;
  if (!isUuid(id)) return sendNotFound(response, "El turno no existe.");

  const { error, value } = cancelSchema.validate(request.body ?? {}, { abortEarly: false });
  if (error) return sendValidationError(response, error);

  try {
    const turno = await cancelTurno(request.user as AuthenticatedUserRecord, id, value.motivo);
    response.json({ status: "ok", turno });
  } catch (error) {
    sendError(response, error, "Error al cancelar un turno", "No fue posible cancelar el turno.");
  }
};
