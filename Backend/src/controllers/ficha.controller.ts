import Joi from "joi";
import type { RequestHandler } from "express";
import type { AuthenticatedUserRecord } from "../models/owner.model";
import { findMedicalRecord, searchAnimals } from "../models/ficha.model";
import { normalizeModalidadTurno } from "../models/turno.model";
import {
  addClinicalEntry,
  addErratum,
  updateAnimalMedicalRecord,
} from "../services/ficha.service";
import { isUuid, sendError, sendNotFound, sendValidationError } from "./respond";

const medicalRecordSchema = Joi.object({
  alergiasAntecedentes: Joi.string()
    .trim()
    .max(10000)
    .allow("", null)
    .required(),
  estado: Joi.string()
    .valid("ACTIVO", "INACTIVO", "FALLECIDO")
    .required(),
}).unknown(false);

const clinicalEntrySchema = Joi.object({
  modalidad: Joi.string()
    .valid("URBANO", "CONSULTORIO", "RURAL")
    .required(),
  tipoRegistro: Joi.string()
    .valid(
      "CONSULTA",
      "PESO",
      "VACUNA",
      "DESPARASITACION",
      "TRATAMIENTO_GRUPAL",
      "EVENTO_POBLACIONAL",
    )
    .default("CONSULTA"),
  fechaAtencion: Joi.date().iso().allow(null).default(null),
  motivoConsulta: Joi.string()
    .trim()
    .min(2)
    .max(5000)
    .required(),
  diagnostico: Joi.string()
    .trim()
    .max(5000)
    .allow("", null)
    .default(null),
  tratamiento: Joi.string()
    .trim()
    .max(5000)
    .allow("", null)
    .default(null),
  vacunasAplicadas: Joi.any()
    .allow(null)
    .default(null),
  detalles: Joi.object({
    pesoKg: Joi.number().positive().max(2000),
    vacuna: Joi.string().trim().min(2).max(200),
    producto: Joi.string().trim().min(2).max(200),
    dosis: Joi.string().trim().max(200),
    proximaFecha: Joi.string().isoDate().allow(null),
    cantidadTratada: Joi.number().integer().positive(),
    evento: Joi.string().trim().min(2).max(1000),
    cantidadAfectada: Joi.number().integer().positive(),
  })
    .default({})
    .unknown(false),
})
  .custom((value, helpers) => {
    const requiredFields: Partial<Record<string, string[]>> = {
      PESO: ["pesoKg"],
      VACUNA: ["vacuna"],
      DESPARASITACION: ["producto"],
      TRATAMIENTO_GRUPAL: ["producto", "cantidadTratada"],
      EVENTO_POBLACIONAL: ["evento", "cantidadAfectada"],
    };
    const allowedFields: Record<string, string[]> = {
      CONSULTA: [],
      PESO: ["pesoKg"],
      VACUNA: ["vacuna", "proximaFecha"],
      DESPARASITACION: ["producto", "dosis", "proximaFecha"],
      TRATAMIENTO_GRUPAL: ["producto", "dosis", "cantidadTratada"],
      EVENTO_POBLACIONAL: ["evento", "cantidadAfectada"],
    };
    const expectedModality =
      value.tipoRegistro === "TRATAMIENTO_GRUPAL" ||
      value.tipoRegistro === "EVENTO_POBLACIONAL"
        ? "RURAL"
        : value.tipoRegistro === "CONSULTA"
          ? null
          : "URBANO";
    const missingField = requiredFields[value.tipoRegistro]?.find(
      (field) => value.detalles[field] === undefined,
    );
    const unexpectedField = Object.keys(value.detalles).find(
      (field) => !allowedFields[value.tipoRegistro]?.includes(field),
    );

    if (missingField) {
      return helpers.error("any.required", { label: missingField });
    }

    if (unexpectedField) {
      return helpers.error("object.unknown", { child: unexpectedField });
    }

    if (expectedModality && value.modalidad !== expectedModality) {
      return helpers.error("any.invalid", { label: "tipoRegistro" });
    }

    return value;
  })
  .unknown(false);

const erratumSchema = Joi.object({
  detalle: Joi.string()
    .trim()
    .min(3)
    .max(10000)
    .required(),
}).unknown(false);

export const getAnimals: RequestHandler = async (request, response) => {
  const search =
    typeof request.query.buscar === "string"
      ? request.query.buscar.trim().slice(0, 100)
      : "";

  if (search.length < 2) {
    response.json({ status: "ok", animales: [] });
    return;
  }

  try {
    response.json({
      status: "ok",
      animales: await searchAnimals(search),
    });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al buscar animales",
      "No fue posible buscar animales.",
    );
  }
};

export const getMedicalRecord: RequestHandler = async (request, response) => {
  response.set("Cache-Control", "no-store");

  const { id } = request.params;

  if (!isUuid(id)) {
    return sendNotFound(response, "El animal no existe.");
  }

  const user = request.user as AuthenticatedUserRecord;
  const ownerUserId = user.role === "CLIENTE" ? user.userId : null;

  try {
    const ficha = await findMedicalRecord(id, ownerUserId);

    if (!ficha) {
      return sendNotFound(response, "El animal no existe.");
    }

    response.json({ status: "ok", ficha });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al obtener una ficha",
      "No fue posible obtener la ficha.",
    );
  }
};

export const patchMedicalRecord: RequestHandler = async (
  request,
  response,
) => {
  const { id } = request.params;

  if (!isUuid(id)) {
    return sendNotFound(response, "El animal no existe.");
  }

  const { error, value } = medicalRecordSchema.validate(request.body, {
    abortEarly: false,
  });

  if (error) {
    return sendValidationError(response, error);
  }

  try {
    await updateAnimalMedicalRecord(id, {
      allergiesHistory: value.alergiasAntecedentes || null,
      status: value.estado,
    });

    const ficha = await findMedicalRecord(id);

    response.json({ status: "ok", ficha });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al actualizar la ficha médica",
      "No fue posible actualizar la ficha médica.",
    );
  }
};

export const postClinicalEntry: RequestHandler = async (
  request,
  response,
) => {
  const { id } = request.params;

  if (!isUuid(id)) {
    return sendNotFound(response, "El animal no existe.");
  }

  const { error, value } = clinicalEntrySchema.validate(request.body, {
    abortEarly: false,
  });

  if (error) {
    return sendValidationError(response, error);
  }

  const user = request.user as AuthenticatedUserRecord;

  try {
    await addClinicalEntry(id, user.userId, {
      modality: normalizeModalidadTurno(value.modalidad),
      attendedAt: value.fechaAtencion ?? null,
      kind: value.tipoRegistro,
      reason: value.motivoConsulta,
      diagnosis: value.diagnostico || null,
      treatment: value.tratamiento || null,
      vaccines: value.vacunasAplicadas,
      details: value.detalles,
    });

    const ficha = await findMedicalRecord(id);

    response.status(201).json({ status: "ok", ficha });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al registrar una evolución clínica",
      "No fue posible registrar la evolución clínica.",
    );
  }
};

export const postErratum: RequestHandler = async (request, response) => {
  const { id, evolutionId } = request.params;

  if (!isUuid(id) || !isUuid(evolutionId)) {
    return sendNotFound(response, "La evolución no existe.");
  }

  const { error, value } = erratumSchema.validate(request.body, {
    abortEarly: false,
  });

  if (error) {
    return sendValidationError(response, error);
  }

  const user = request.user as AuthenticatedUserRecord;

  try {
    await addErratum(
      id,
      evolutionId,
      user.userId,
      value.detalle,
    );

    const ficha = await findMedicalRecord(id);

    response.status(201).json({ status: "ok", ficha });
  } catch (error) {
    sendError(
      response,
      error,
      "Error al registrar una fe de erratas",
      "No fue posible registrar la fe de erratas.",
    );
  }
};