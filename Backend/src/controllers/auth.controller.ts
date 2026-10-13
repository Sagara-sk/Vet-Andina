import Joi from "joi";
import type { RequestHandler } from "express";
import {
  RegistrationConflictError,
  registerOwner,
} from "../services/auth.service";

const registerSchema = Joi.object({
  nombreCompleto: Joi.string().trim().min(2).max(200).required(),
  email: Joi.string().trim().email().max(254).required(),
  telefono: Joi.string().trim().min(6).max(50).required(),
  localidad: Joi.string().trim().min(2).max(150).required(),
  contrasena: Joi.string()
    .min(8)
    .custom((value: string, helpers) =>
      Buffer.byteLength(value, "utf8") > 72
        ? helpers.error("string.max")
        : value,
    )
    .required(),
}).unknown(false);

export const postRegister: RequestHandler = async (request, response) => {
  const { error, value } = registerSchema.validate(request.body, {
    abortEarly: false,
  });

  if (error) {
    response.status(400).json({
      status: "error",
      message: "Revisá los datos ingresados.",
      details: error.details.map((detail) => detail.message),
    });
    return;
  }

  try {
    const account = await registerOwner({
      fullName: value.nombreCompleto,
      email: value.email.toLowerCase(),
      phone: value.telefono,
      locality: value.localidad,
      password: value.contrasena,
    });

    response.status(201).json({
      status: "ok",
      message: "La cuenta se creó correctamente.",
      user: {
        id: account.userId,
        nombreCompleto: account.fullName,
        email: account.email,
        rol: account.role,
      },
    });
  } catch (error) {
    if (error instanceof RegistrationConflictError) {
      response.status(409).json({ status: "error", message: error.message });
      return;
    }

    console.error("Error al registrar una cuenta:", error);
    response.status(500).json({
      status: "error",
      message: "No fue posible crear la cuenta.",
    });
  }
};
