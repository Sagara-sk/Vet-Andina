import { Router } from "express";
import { postStaffUser } from "../controllers/user.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";

const userRouter = Router();

userRouter.post("/", authMiddleware, requireRole("SUPERADMIN"), postStaffUser);

export default userRouter;
