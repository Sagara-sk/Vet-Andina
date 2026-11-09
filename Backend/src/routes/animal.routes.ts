import { Router } from "express";
import { getMyAnimals } from "../controllers/booking.controller";
import {
  getAnimals,
  getMedicalRecord,
  patchMedicalRecord,
  postClinicalEntry,
  postErratum,
} from "../controllers/ficha.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const animalRouter = Router();

const staff = requireRole(
  "SUPERADMIN",
  "ADMINISTRATIVO",
  "VETERINARIO",
);

const staffAndClient = requireRole(
  "SUPERADMIN",
  "ADMINISTRATIVO",
  "VETERINARIO",
  "CLIENTE",
);

animalRouter.use(authMiddleware);

// El cliente solamente consulta sus propios animales.
animalRouter.get("/mios", requireRole("CLIENTE"), getMyAnimals);

// Búsqueda general para el personal.
animalRouter.get("/", staff, getAnimals);

// Lectura de fichas para personal y clientes.
// El controlador verifica la propiedad cuando el rol es CLIENTE.
animalRouter.get("/:id/ficha", staffAndClient, getMedicalRecord);

// Los datos generales de la ficha pueden ser modificados por el personal.
animalRouter.patch("/:id/ficha", staff, patchMedicalRecord);

// Las evoluciones se agregan; no existen rutas PUT ni DELETE para ellas.
animalRouter.post("/:id/ficha/evoluciones", staff, postClinicalEntry);

// Las correcciones se registran como nuevas evoluciones vinculadas.
animalRouter.post(
  "/:id/ficha/evoluciones/:evolutionId/fe-de-erratas",
  staff,
  postErratum,
);

export default animalRouter;