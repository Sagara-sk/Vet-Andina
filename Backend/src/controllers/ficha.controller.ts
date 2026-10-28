import type { RequestHandler } from "express";
import { findMedicalRecord, searchAnimals } from "../models/ficha.model";
import { isUuid, sendError, sendNotFound } from "./respond";

export const getAnimals: RequestHandler = async (request, response) => {
  const search = typeof request.query.buscar === "string" ? request.query.buscar.trim().slice(0, 100) : "";

  // Sin texto no se lista nada: evita volcar todos los pacientes de una vez.
  if (search.length < 2) {
    response.json({ status: "ok", animales: [] });
    return;
  }

  try {
    response.json({ status: "ok", animales: await searchAnimals(search) });
  } catch (error) {
    sendError(response, error, "Error al buscar animales", "No fue posible buscar animales.");
  }
};

// Solo lectura: las evoluciones se agregan desde el flujo clínico (append-only).
export const getMedicalRecord: RequestHandler = async (request, response) => {
  response.set("Cache-Control", "no-store");
  const { id } = request.params;
  if (!isUuid(id)) return sendNotFound(response, "El animal no existe.");

  try {
    const ficha = await findMedicalRecord(id);
    if (!ficha) return sendNotFound(response, "El animal no existe.");
    response.json({ status: "ok", ficha });
  } catch (error) {
    sendError(response, error, "Error al obtener una ficha", "No fue posible obtener la ficha.");
  }
};
