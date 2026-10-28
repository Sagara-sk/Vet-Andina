import Joi from "joi";
import type { RequestHandler } from "express";
import {
  createStaffUser,
  StaffUserConflictError,
} from "../services/user.service";

// El superadmin solo da de alta personal; los clientes se registran solos y
// otro SUPERADMIN no se crea desde la API.
const createStaffSchema = Joi.object({
  nombreCompleto: Joi.string().trim().min(2).max(200).required(),
  email: Joi.string().trim().email().max(254).required(),
  rol: Joi.string().valid("VETERINARIO", "ADMINISTRATIVO").required(),
  matriculaProfesional: Joi.when("rol", {
    is: "VETERINARIO",
    then: Joi.string().trim().min(2).max(50).required(),
    otherwise: Joi.forbidden(),
  }),
  contrasena: Joi.string()
    .min(8)
    .custom((value: string, helpers) =>
      Buffer.byteLength(value, "utf8") > 72
        ? helpers.error("string.max")
        : value,
    )
    .required(),
}).unknown(false);

export const postStaffUser: RequestHandler = async (request, response) => {
  response.set("Cache-Control", "no-store");
  const { error, value } = createStaffSchema.validate(request.body, {
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
    const user = await createStaffUser({
      fullName: value.nombreCompleto,
      email: value.email.toLowerCase(),
      role: value.rol,
      professionalLicense: value.matriculaProfesional ?? null,
      password: value.contrasena,
    });

    response.status(201).json({
      status: "ok",
      message: "El usuario se creó correctamente.",
      user: {
        id: user.userId,
        nombreCompleto: user.fullName,
        email: user.email,
        rol: user.role,
        matriculaProfesional: user.professionalLicense,
      },
    });
  } catch (error) {
    if (error instanceof StaffUserConflictError) {
      response.status(409).json({ status: "error", message: error.message });
      return;
    }

    console.error("Error al crear un usuario del personal:", error);
    response.status(500).json({
      status: "error",
      message: "No fue posible crear el usuario.",
    });
  }
};
