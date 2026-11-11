import { Router } from "express";
import {
  getTurnos,
  getVets,
  postCancel,
  postConfirm,
  postHojaDeRuta,
  postReschedule,
  postTurno,
} from "../controllers/turno.controller";
import {
  deleteHoliday,
  deleteRuralAvailabilityItem,
  getHolidays,
  getMyTurnos,
  getPublicAvailability,
  getRuralAvailability,
  postClientBooking,
  postHoliday,
  postRuralAvailability,
  putTurnoAssignment,
} from "../controllers/booking.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

// Confirmar, reprogramar y cancelar están abiertos al personal: el servicio
// limita al veterinario a sus turnos asignados.
const staff = requireRole("SUPERADMIN", "ADMINISTRATIVO", "VETERINARIO");
const management = requireRole("SUPERADMIN", "ADMINISTRATIVO");
const clientOrStaff = requireRole(
  "CLIENTE",
  "SUPERADMIN",
  "ADMINISTRATIVO",
  "VETERINARIO",
);
const client = requireRole("CLIENTE");

const turnoRouter = Router();

turnoRouter.use(authMiddleware);
turnoRouter.get("/disponibilidad", clientOrStaff, getPublicAvailability);
turnoRouter.get("/mios", client, getMyTurnos);
turnoRouter.post("/solicitudes", client, postClientBooking);
turnoRouter.get("/", staff, getTurnos);
turnoRouter.get("/veterinarios", clientOrStaff, getVets);
turnoRouter.post("/hoja-de-ruta", staff, postHojaDeRuta);
turnoRouter.get("/disponibilidad-rural", staff, getRuralAvailability);
turnoRouter.post("/disponibilidad-rural", staff, postRuralAvailability);
turnoRouter.delete(
  "/disponibilidad-rural/:id",
  staff,
  deleteRuralAvailabilityItem,
);
turnoRouter.get("/feriados", management, getHolidays);
turnoRouter.post("/feriados", management, postHoliday);
turnoRouter.delete("/feriados/:fecha", management, deleteHoliday);
turnoRouter.post("/", management, postTurno);
turnoRouter.put("/:id/asignar", management, putTurnoAssignment);
turnoRouter.post("/:id/confirmar", staff, postConfirm);
turnoRouter.post("/:id/reprogramar", clientOrStaff, postReschedule);
turnoRouter.post("/:id/cancelar", staff, postCancel);

export default turnoRouter;
