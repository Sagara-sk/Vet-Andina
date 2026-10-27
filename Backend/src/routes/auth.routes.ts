import { Router } from "express";
import {
    getSession,
    postLogin,
    postLogout,
    postRegister,
    postClientProfile,
} from "../controllers/auth.controller";
import authMiddleware from "../middlewares/auth.middleware";

const authRouter = Router();

// Rutas de autenticación y sesión
authRouter.post("/login", postLogin);
authRouter.post("/logout", postLogout);
authRouter.get("/session", authMiddleware, getSession);
authRouter.post("/register", postRegister);

// Ruta para guardar el perfil obligatorio del cliente (Paso 2)
authRouter.post("/profile", authMiddleware, postClientProfile);

export default authRouter;