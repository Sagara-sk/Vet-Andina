import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import passport from "passport";
import "./config/passport";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import authRouter from "./routes/auth.routes";
import healthRouter from "./routes/health.routes";

export const app = express();

const allowedOrigins = process.env.FRONTEND_URL?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean) ?? ["http://localhost:5173", "http://127.0.0.1:5173"];

// Detrás de un proxy (Render), indica cuántos saltos confiar para obtener la IP
// real del cliente; sin esto, el límite de intentos agruparía a todos en una IP.
const trustProxy = process.env.TRUST_PROXY?.trim();

if (trustProxy) {
  const hops = Number(trustProxy);

  if (!Number.isInteger(hops) || hops < 0) {
    throw new Error("TRUST_PROXY debe ser un número entero mayor o igual a 0.");
  }

  app.set("trust proxy", hops);
}

// CORS va primero para que también las respuestas de error lleguen legibles al frontend.
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use(notFoundHandler);
app.use(errorHandler);
