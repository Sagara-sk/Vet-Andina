import { Router } from "express";
import { getMyAnimals } from "../controllers/booking.controller";
import { getAnimals, getMedicalRecord } from "../controllers/ficha.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

// Fichas en solo lectura para el personal. El acceso del tutor a las fichas de
// sus propios animales queda pendiente (requiere filtrar por dueño).
const animalRouter = Router();

animalRouter.use(authMiddleware);
animalRouter.get("/mios", requireRole("CLIENTE"), getMyAnimals);
animalRouter.use(requireRole("SUPERADMIN", "ADMINISTRATIVO", "VETERINARIO"));
animalRouter.get("/", getAnimals);
animalRouter.get("/:id/ficha", getMedicalRecord);

export default animalRouter;
