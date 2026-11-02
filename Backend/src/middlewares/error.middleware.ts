import type { ErrorRequestHandler, RequestHandler } from "express";

// Errores con código HTTP (por ejemplo, los de express.json) que se informan al
// cliente sin registrarlos: su objeto incluye el cuerpo crudo de la solicitud,
// que puede contener contraseñas.
const clientErrorMessages: Record<number, string> = {
  400: "La solicitud no es válida.",
  413: "La solicitud es demasiado grande.",
  415: "El tipo de contenido no es compatible.",
};

function httpStatusOf(error: unknown): number | undefined {
  if (typeof error !== "object" || error === null) return undefined;

  const status =
    "status" in error
      ? error.status
      : "statusCode" in error
        ? error.statusCode
        : undefined;

  return typeof status === "number" && status >= 400 && status < 600
    ? status
    : undefined;
}

export const notFoundHandler: RequestHandler = (_request, response) => {
  response.status(404).json({
    status: "error",
    message: "Ruta no encontrada.",
  });
};

export const errorHandler: ErrorRequestHandler = (
  error,
  _request,
  response,
  next,
) => {
  if (response.headersSent) {
    next(error);
    return;
  }

  const status = httpStatusOf(error);

  if (status !== undefined && status < 500) {
    const isInvalidJson =
      typeof error === "object" &&
      error !== null &&
      "type" in error &&
      error.type === "entity.parse.failed";

    response.status(status).json({
      status: "error",
      message: isInvalidJson
        ? "El cuerpo de la solicitud no es un JSON válido."
        : (clientErrorMessages[status] ?? "La solicitud no es válida."),
    });
    return;
  }

  console.error("Error no controlado en la API:", error);
  response.status(500).json({
    status: "error",
    message: "Error interno del servidor.",
  });
};
