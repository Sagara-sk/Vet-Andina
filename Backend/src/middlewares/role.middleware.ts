import type { RequestHandler } from "express";

export const USER_ROLES = [
  "SUPERADMIN",
  "ADMINISTRATIVO",
  "VETERINARIO",
  "CLIENTE",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

function hasUserRole(user: unknown): user is { role: UserRole } {
  if (typeof user !== "object" || user === null || !("role" in user)) {
    return false;
  }

  return USER_ROLES.some((role) => role === user.role);
}

export function authorizeRoles(...allowedRoles: UserRole[]): RequestHandler {
  return (request, response, next) => {
    response.set("Cache-Control", "no-store");
    const user = request.user;

    if (!user) {
      response.status(401).json({
        status: "error",
        message: "Se requiere una sesión válida.",
      });
      return;
    }

    if (!hasUserRole(user) || !allowedRoles.includes(user.role)) {
      response.status(403).json({
        status: "error",
        message: "No tenés permisos para realizar esta acción.",
      });
      return;
    }

    next();
  };
}
