import { Router } from "express";
import {
	getSession,
	postClientProfile,
	postLogin,
	postLogout,
	postRegister,
} from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth.middleware";
import { requireRole } from "../middlewares/role.middleware";
import {
	loginRateLimiter,
	registerRateLimiter,
} from "../middlewares/rate-limit.middleware";

const authRouter = Router();

authRouter.post("/login", loginRateLimiter, postLogin);
authRouter.post("/logout", postLogout);
authRouter.get("/session", authMiddleware, getSession);
authRouter.post("/register", registerRateLimiter, postRegister);
authRouter.post("/profile", authMiddleware, requireRole("CLIENTE"), postClientProfile);

export default authRouter;
