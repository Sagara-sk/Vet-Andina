import type { Response } from "express";
import type Joi from "joi";
import { isBusinessError, pgErrorCode } from "../services/errors";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Un id de ruta mal formado se responde como inexistente, sin llegar a la base.
export function isUuid(value: unknown): value is string {
  return typeof value === "string" && UUID_PATTERN.test(value);
}

export function sendValidationError(response: Response, error: Joi.ValidationError): void {
  response.status(400).json({
    status: "error",
    message: "Revisá los datos ingresados.",
    details: error.details.map((detail) => detail.message),
  });
}

export function sendNotFound(response: Response, message: string): void {
  response.status(404).json({ status: "error", message });
}

// Traduce errores de negocio a su código HTTP; el resto se registra y responde 500.
export function sendError(response: Response, error: unknown, context: string, fallback: string): void {
  if (isBusinessError(error)) {
    response.status(error.status).json({ status: "error", message: error.message });
    return;
  }

  if (pgErrorCode(error) === "22001") {
    response.status(400).json({ status: "error", message: "Algún dato supera el largo permitido." });
    return;
  }

  console.error(`${context}:`, error);
  response.status(500).json({ status: "error", message: fallback });
}
