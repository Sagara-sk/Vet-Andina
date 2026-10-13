import { Router } from "express";
import { postRegister } from "../controllers/auth.controller";

const authRouter = Router();

authRouter.post("/register", postRegister);

export default authRouter;
