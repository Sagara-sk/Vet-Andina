import Joi from "joi";
import type { RequestHandler } from "express";
import {
  authenticateUser,
  createSessionToken,
  type AuthenticatedUser,
  InvalidCredentialsError,
  RegistrationConflictError,
  registerOwner,
  SESSION_COOKIE_NAME,
  sessionCookieOptions,
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

const loginSchema = Joi.object({
  email: Joi.string().trim().email().max(254).required(),
  contrasena: Joi.string()
    .min(1)
    .custom((value: string, helpers) =>
      Buffer.byteLength(value, "utf8") > 72
        ? helpers.error("string.max")
        : value,
    )
    .required(),
}).unknown(false);

function clearSessionCookie(response: Parameters<RequestHandler>[1]): void {
  const { httpOnly, secure, sameSite, path } = sessionCookieOptions();
  response.clearCookie(SESSION_COOKIE_NAME, {
    httpOnly,
    secure,
    sameSite,
    path,
  });
}

export const postLogin: RequestHandler = async (request, response) => {
  response.set("Cache-Control", "no-store");
  const { error, value } = loginSchema.validate(request.body, {
    abortEarly: false,
  });

  if (error) {
    response.status(400).json({
      status: "error",
      message: "Ingresá un email y una contraseña válidos.",
    });
    return;
  }

  try {
    const user = await authenticateUser(value.email, value.contrasena);
    const token = createSessionToken(user);

    response.cookie(SESSION_COOKIE_NAME, token, sessionCookieOptions());
    response.json({
      status: "ok",
      user: {
        id: user.userId,
        nombreCompleto: user.fullName,
        email: user.email,
        rol: user.role,
      },
    });
  } catch (error) {
    if (error instanceof InvalidCredentialsError) {
      response.status(401).json({ status: "error", message: error.message });
      return;
    }

    console.error("Error al iniciar sesión:", error);
    response.status(500).json({
      status: "error",
      message: "No fue posible iniciar sesión.",
    });
  }
};

export const getSession: RequestHandler = (request, response) => {
  response.set("Cache-Control", "no-store");
  const user = request.user as AuthenticatedUser;

  response.json({
    status: "ok",
    user: { id: user.userId, nombreCompleto: user.fullName, rol: user.role },
  });
};

export const postLogout: RequestHandler = (_request, response) => {
  response.set("Cache-Control", "no-store");
  clearSessionCookie(response);
  response.json({ status: "ok", message: "Sesión cerrada." });
};

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
