import type { RequestHandler } from "express";
import passport from "passport";
import type { AuthenticatedUserRecord } from "../models/owner.model";

const authMiddleware: RequestHandler = (request, response, next) => {
  response.set("Cache-Control", "no-store");

  passport.authenticate(
    "session-cookie",
    { session: false },
    (error: Error | null, user: AuthenticatedUserRecord | false) => {
      if (error) {
        console.error("Error al verificar la sesión:", error);
        response.status(500).json({
          status: "error",
          message: "No fue posible verificar la sesión.",
        });
        return;
      }

      if (!user) {
        response.status(401).json({
          status: "error",
          message: "Sesión no válida.",
        });
        return;
      }

      request.user = user;
      next();
    },
  )(request, response, next);
};

export default authMiddleware;