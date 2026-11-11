import type { RequestHandler } from "express";
import { listOwnerEstablishments } from "../models/establecimiento.model";
import type { AuthenticatedUserRecord } from "../models/owner.model";
import { sendError } from "./respond";

export const getMyEstablishments: RequestHandler = async (request, response) => {
  const user = request.user as AuthenticatedUserRecord;

  // Los establecimientos son solo para tutores rurales. La consulta vuelve a
  // exigirlo, así que esta respuesta solo hace explícito el rechazo.
  if (user.careType !== "RURAL") {
    response.status(403).json({
      status: "error",
      message: "Tu cuenta no tiene atención rural.",
    });
    return;
  }

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
