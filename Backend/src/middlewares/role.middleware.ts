import type { RequestHandler } from "express";
import type { AuthenticatedUserRecord } from "../models/owner.model";

export type Rol = "SUPERADMIN" | "ADMINISTRATIVO" | "VETERINARIO" | "CLIENTE";

// Va después de authMiddleware: el rol sale del usuario leído de la base en
// cada request, no del token, así un cambio de rol se aplica de inmediato.
export function requireRole(...allowed: Rol[]): RequestHandler {
  return (request, response, next) => {
    const user = request.user as AuthenticatedUserRecord | undefined;

    if (!user) {
      response.status(401).json({ status: "error", message: "Sesión no válida." });
      return;
    }

    if (!allowed.some((rol) => rol === user.role)) {
      response.status(403).json({
        status: "error",
        message: "No tenés permiso para realizar esta acción.",
      });
      return;
    }

    next();
  };
}
