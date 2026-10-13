import type { RequestHandler } from "express";
import { checkDatabaseConnection } from "../services/health.service";

export const getApiHealth: RequestHandler = (_request, response) => {
  response.json({
    status: "ok",
    message: "API Vet Andina funcionando correctamente",
  });
};

export const getDatabaseHealth: RequestHandler = async (_request, response) => {
  try {
    await checkDatabaseConnection();
    response.json({ status: "ok", database: { connected: 1 } });
  } catch (error) {
    console.error("Error al comprobar la conexión con PostgreSQL:", error);
    response.status(503).json({
      status: "error",
      message: "No fue posible conectar con la base de datos.",
    });
  }
};
