import { Router } from "express";
import { getAnimals, getMedicalRecord } from "../controllers/ficha.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

// Fichas en solo lectura para el personal. El acceso del tutor a las fichas de
// sus propios animales queda pendiente (requiere filtrar por dueño).
const animalRouter = Router();

animalRouter.use(authMiddleware, requireRole("SUPERADMIN", "ADMINISTRATIVO", "VETERINARIO"));
animalRouter.get("/", getAnimals);
animalRouter.get("/:id/ficha", getMedicalRecord);

export default animalRouter;
