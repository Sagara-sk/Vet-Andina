import Joi from "joi";
import type { RequestHandler } from "express";
import { findTutorById, listTutors } from "../models/tutor.model";
import { addAnimal, createTutor, editTutor } from "../services/tutor.service";
import { isUuid, sendError, sendNotFound, sendValidationError } from "./respond";

const optionalText = (max: number) => Joi.string().trim().max(max).allow("", null).empty("").default(null);

const tutorSchema = Joi.object({
  nombreCompleto: Joi.string().trim().min(2).max(200).required(),
  telefono: Joi.string().trim().min(6).max(50).required(),
  email: Joi.string().trim().email().max(254).required(),
  localidad: Joi.string().trim().min(2).max(150).required(),
  dniCuit: optionalText(20),
  direccionUrbana: optionalText(200),
  tipoPersona: Joi.string().valid("INDIVIDUAL", "EMPRESA_PRODUCTOR").allow(null).default(null),
}).unknown(false);

const animalSchema = Joi.object({
  nombre: Joi.string().trim().min(1).max(150).required(),
  especie: Joi.string().trim().min(2).max(100).required(),
  raza: optionalText(100),
  tipoAtencion: Joi.string().valid("URBANO", "RURAL").required(),
  cantidadEnLote: Joi.number().integer().min(1).max(100000).default(1),
  fechaNacimiento: Joi.date().iso().max("now").allow(null).default(null),
  idFinca: Joi.string().guid().allow(null).default(null),
}).unknown(false);

function toTutorFields(value: {
  nombreCompleto: string;
  telefono: string;
  email: string;
  localidad: string;
  dniCuit: string | null;
  direccionUrbana: string | null;
  tipoPersona: "INDIVIDUAL" | "EMPRESA_PRODUCTOR" | null;
}) {
  return {
    fullName: value.nombreCompleto,
    phone: value.telefono,
    email: value.email.toLowerCase(),
    locality: value.localidad,
    dniCuit: value.dniCuit,
    address: value.direccionUrbana,
    personType: value.tipoPersona,
  };
}

export const getTutors: RequestHandler = async (request, response) => {
  const search = typeof request.query.buscar === "string" ? request.query.buscar.trim().slice(0, 100) : "";

  try {
    response.json({ status: "ok", tutores: await listTutors(search || null) });
  } catch (error) {
    sendError(response, error, "Error al listar tutores", "No fue posible obtener los tutores.");
  }
};

export const getTutor: RequestHandler = async (request, response) => {
  const { id } = request.params;
  if (!isUuid(id)) return sendNotFound(response, "El tutor no existe.");

  try {
    const tutor = await findTutorById(id);
    if (!tutor) return sendNotFound(response, "El tutor no existe.");
    response.json({ status: "ok", tutor });
  } catch (error) {
    sendError(response, error, "Error al obtener un tutor", "No fue posible obtener el tutor.");
  }
};

export const postTutor: RequestHandler = async (request, response) => {
  const { error, value } = tutorSchema.validate(request.body, { abortEarly: false });
  if (error) return sendValidationError(response, error);

  try {
    response.status(201).json({ status: "ok", tutor: await createTutor(toTutorFields(value)) });
  } catch (error) {
    sendError(response, error, "Error al crear un tutor", "No fue posible crear el tutor.");
  }
};

export const putTutor: RequestHandler = async (request, response) => {
  const { id } = request.params;
  if (!isUuid(id)) return sendNotFound(response, "El tutor no existe.");

  const { error, value } = tutorSchema.validate(request.body, { abortEarly: false });
  if (error) return sendValidationError(response, error);

  try {
    response.json({ status: "ok", tutor: await editTutor(id, toTutorFields(value)) });
  } catch (error) {
    sendError(response, error, "Error al editar un tutor", "No fue posible guardar los cambios.");
  }
};

export const postAnimal: RequestHandler = async (request, response) => {
  const { id } = request.params;
  if (!isUuid(id)) return sendNotFound(response, "El tutor no existe.");

  const { error, value } = animalSchema.validate(request.body, { abortEarly: false });
  if (error) return sendValidationError(response, error);

  try {
    const tutor = await addAnimal(id, {
      name: value.nombre,
      species: value.especie,
      breed: value.raza,
      careType: value.tipoAtencion,
      herdSize: value.cantidadEnLote,
      birthDate: value.fechaNacimiento ? value.fechaNacimiento.toISOString().slice(0, 10) : null,
      farmId: value.idFinca,
    });
    response.status(201).json({ status: "ok", tutor });
  } catch (error) {
    sendError(response, error, "Error al dar de alta un animal", "No fue posible dar de alta el animal.");
  }
};
