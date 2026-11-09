import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import passport from "passport";
import "./config/passport";
import { errorHandler, notFoundHandler } from "./middlewares/error.middleware";
import authRouter from "./routes/auth.routes";
import animalRouter from "./routes/animal.routes";
import establecimientoRouter from "./routes/establecimiento.routes";
import healthRouter from "./routes/health.routes";
import turnoRouter from "./routes/turno.routes";
import tutorRouter from "./routes/tutor.routes";
import userRouter from "./routes/user.routes";
import { envs } from "./config/env";

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
app.use("/api/users", userRouter);
app.use("/api/tutores", tutorRouter);
app.use("/api/animales", animalRouter);
app.use("/api/establecimientos", establecimientoRouter);
app.use("/api/turnos", turnoRouter);
app.use(notFoundHandler);
app.use(errorHandler);
app.set('port', envs.PORT);

app.get("/", (_request, response) => {
  response.status(200).json({
    status: "ok",
    message: "Bienvenido a la API de Vet Andina",
    version: "1.0.0",
    endpoints: {
      health: "/api/health",
      database: "/api/db/health",
      auth: "/api/auth",
      users: "/api/users",
      tutors: "/api/tutores",
      animals: "/api/animales",
      appointments: "/api/turnos"
    }
  });
});

export default app;