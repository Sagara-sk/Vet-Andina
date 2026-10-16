import { Router } from "express";
import {
	getSession,
	postLogin,
	postLogout,
	postRegister,
} from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/login", postLogin);
authRouter.post("/logout", postLogout);
authRouter.get("/session", getSession);
authRouter.post("/register", postRegister);

export default authRouter;
