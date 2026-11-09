import { Router } from "express";
import { getTutor, getTutors, postAnimal, postTutor, putTutor } from "../controllers/tutor.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

// Lectura para todo el personal.
const staff = requireRole("SUPERADMIN", "ADMINISTRATIVO", "VETERINARIO");

// Gestión de tutores: Superadmin y Administrativo.
const management = requireRole("SUPERADMIN", "ADMINISTRATIVO");

// Alta de animales: también habilitada para Veterinario.
const animalManagement = requireRole(
  "SUPERADMIN",
  "ADMINISTRATIVO",
  "VETERINARIO",
);

const tutorRouter = Router();

tutorRouter.use(authMiddleware);
tutorRouter.get("/", staff, getTutors);
tutorRouter.post("/", management, postTutor);
tutorRouter.get("/:id", staff, getTutor);
tutorRouter.put("/:id", management, putTutor);
tutorRouter.post("/:id/animales", animalManagement, postAnimal);
export default tutorRouter;
