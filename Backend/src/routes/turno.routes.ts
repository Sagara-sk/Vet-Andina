import { Router } from "express";
import {
  getTurnos,
  getVets,
  postCancel,
  postConfirm,
  postReschedule,
  postTurno,
} from "../controllers/turno.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

// Confirmar, reprogramar y cancelar están abiertos al personal: el servicio
// limita al veterinario a sus turnos asignados.
const staff = requireRole("SUPERADMIN", "ADMINISTRATIVO", "VETERINARIO");
const management = requireRole("SUPERADMIN", "ADMINISTRATIVO");

const turnoRouter = Router();

turnoRouter.use(authMiddleware);
turnoRouter.get("/", staff, getTurnos);
turnoRouter.get("/veterinarios", staff, getVets);
turnoRouter.post("/", management, postTurno);
turnoRouter.post("/:id/confirmar", staff, postConfirm);
turnoRouter.post("/:id/reprogramar", staff, postReschedule);
turnoRouter.post("/:id/cancelar", staff, postCancel);

export default turnoRouter;
