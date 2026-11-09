import { Router } from "express";
import { getMyEstablishments } from "../controllers/establecimiento.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

// Establecimientos y lotes propios del tutor. El listado se limita al dueño de
// la sesión dentro de la consulta.
const establecimientoRouter = Router();

establecimientoRouter.use(authMiddleware);
establecimientoRouter.get("/mios", requireRole("CLIENTE"), getMyEstablishments);

export default establecimientoRouter;
