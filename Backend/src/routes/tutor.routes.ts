import { Router } from "express";
import { getTutor, getTutors, postAnimal, postTutor, putTutor } from "../controllers/tutor.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

// Lectura para todo el personal; alta y edición para la gestión administrativa.
const staff = requireRole("SUPERADMIN", "ADMINISTRATIVO", "VETERINARIO");
const management = requireRole("SUPERADMIN", "ADMINISTRATIVO");

const tutorRouter = Router();

tutorRouter.use(authMiddleware);
tutorRouter.get("/", staff, getTutors);
tutorRouter.post("/", management, postTutor);
tutorRouter.get("/:id", staff, getTutor);
tutorRouter.put("/:id", management, putTutor);
tutorRouter.post("/:id/animales", management, postAnimal);

export default tutorRouter;
