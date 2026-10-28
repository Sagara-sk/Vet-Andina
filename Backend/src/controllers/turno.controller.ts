import Joi from "joi";
import type { RequestHandler } from "express";
import type { AuthenticatedUserRecord } from "../models/owner.model";
import { listAssignableVets, listTurnos } from "../models/turno.model";
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
  modalidad: Joi.string().valid("CONSULTORIO", "RURAL").required(),
  estado: Joi.string().valid("PENDIENTE", "CONFIRMADO").default("PENDIENTE"),
  motivo: Joi.string().trim().min(2).max(300).required(),
}).unknown(false);

const rescheduleSchema = Joi.object({
  fechaHora: Joi.date().iso().required(),
  idVeterinario: Joi.string().guid().allow(null).default(null),
}).unknown(false);

const cancelSchema = Joi.object({
  motivo: Joi.string().trim().max(500).allow("", null).empty("").default(null),
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

export const getVets: RequestHandler = async (_request, response) => {
  try {
    response.json({ status: "ok", veterinarios: await listAssignableVets() });
  } catch (error) {
    sendError(response, error, "Error al listar veterinarios", "No fue posible obtener los veterinarios.");
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
      modality: value.modalidad,
      status: value.estado,
      reason: value.motivo,
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
