import { Router } from "express";
import { getMyAgenda, getVetsAgenda } from "../controllers/veterinario.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const veterinarioRouter = Router();

veterinarioRouter.use(authMiddleware);

// Cada profesional consulta solo su propia agenda.
veterinarioRouter.get("/me/agenda", requireRole("VETERINARIO", "SUPERADMIN"), getMyAgenda);

// Administración ve la agenda de todos los veterinarios (o filtra por uno).
veterinarioRouter.get("/agenda", requireRole("ADMINISTRATIVO", "SUPERADMIN"), getVetsAgenda);

export default veterinarioRouter;
