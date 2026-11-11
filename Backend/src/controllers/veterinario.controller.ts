import Joi from "joi";
import type { RequestHandler, Response } from "express";
import type { AuthenticatedUserRecord } from "../models/owner.model";
import { isAssignableVet } from "../models/turno.model";
import { getAgenda } from "../services/agenda.service";
import { sendError, sendNotFound, sendValidationError } from "./respond";

const MAX_RANGE_DAYS = 92;
const DAY_MS = 24 * 60 * 60 * 1000;

const rangeKeys = {
  desde: Joi.date().iso(),
  hasta: Joi.date().iso(),
};

// La agenda propia no acepta "veterinario": el id sale siempre de la sesión.
const myAgendaSchema = Joi.object(rangeKeys).unknown(false);

const agendaSchema = Joi.object({
  ...rangeKeys,
  veterinario: Joi.string().guid(),
}).unknown(false);

// Por defecto: desde hoy a las 00:00 y los próximos 7 días. Devuelve null y
// responde 400 si el rango no es válido.
function resolveRange(
  value: { desde?: Date; hasta?: Date },
  response: Response,
): { from: Date; to: Date } | null {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const from = value.desde ?? today;
  const to = value.hasta ?? new Date(from.getTime() + 7 * DAY_MS);

  if (to <= from || to.getTime() - from.getTime() > MAX_RANGE_DAYS * DAY_MS) {
    response.status(400).json({
      status: "error",
      message: `El rango de fechas tiene que ser válido y de ${MAX_RANGE_DAYS} días como máximo.`,
    });
    return null;
  }

  return { from, to };
}

// GET /api/veterinarios/me/agenda: turnos y hojas de ruta del profesional autenticado.
export const getMyAgenda: RequestHandler = async (request, response) => {
  const { error, value } = myAgendaSchema.validate(request.query, { abortEarly: false });
  if (error) return sendValidationError(response, error);

  const range = resolveRange(value, response);
  if (!range) return;

  try {
    const user = request.user as AuthenticatedUserRecord;
    const agenda = await getAgenda({ ...range, vetId: user.userId });
    response.json({ status: "ok", agenda });
  } catch (error) {
    sendError(response, error, "Error al obtener la agenda propia", "No fue posible obtener la agenda.");
  }
};

// GET /api/veterinarios/agenda: agenda de todos los veterinarios o de uno, para administración.
export const getVetsAgenda: RequestHandler = async (request, response) => {
  const { error, value } = agendaSchema.validate(request.query, { abortEarly: false });
  if (error) return sendValidationError(response, error);

  const range = resolveRange(value, response);
  if (!range) return;

  try {
    const vetId: string | null = value.veterinario ?? null;
    if (vetId && !(await isAssignableVet(vetId))) {
      return sendNotFound(response, "No se encontró el veterinario.");
    }

    const agenda = await getAgenda({ ...range, vetId });
    response.json({ status: "ok", agenda });
  } catch (error) {
    sendError(response, error, "Error al obtener la agenda", "No fue posible obtener la agenda.");
  }
};
