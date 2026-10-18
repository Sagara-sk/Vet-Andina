import { Router } from "express";
import {
	getSession,
	postLogin,
	postLogout,
	postRegister,
} from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth.middleware";

const authRouter = Router();

authRouter.post("/login", postLogin);
authRouter.post("/logout", postLogout);
authRouter.get("/session", authMiddleware, getSession);
authRouter.post("/register", postRegister);

export default authRouter;
