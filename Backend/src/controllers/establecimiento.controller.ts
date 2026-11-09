import type { RequestHandler } from "express";
import { listOwnerEstablishments } from "../models/establecimiento.model";
import type { AuthenticatedUserRecord } from "../models/owner.model";
import { sendError } from "./respond";

export const getMyEstablishments: RequestHandler = async (request, response) => {
  const user = request.user as AuthenticatedUserRecord;
  try {
    response.json({
      status: "ok",
      establecimientos: await listOwnerEstablishments(user.userId),
    });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al listar establecimientos del cliente",
      "No fue posible obtener tus establecimientos.",
    );
  }
};
