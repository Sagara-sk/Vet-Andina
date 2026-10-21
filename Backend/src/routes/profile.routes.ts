import { Router } from "express";
import { postClientProfile } from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { authorizeRoles } from "../middlewares/role.middleware";

const profileRouter = Router();

profileRouter.post(
  "/duenios/perfil",
  authMiddleware,
  authorizeRoles("CLIENTE"),
  postClientProfile,
);

export default profileRouter;
