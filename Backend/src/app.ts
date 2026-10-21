import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import passport from "passport";
import "./config/passport";
import authRouter from "./routes/auth.routes";
import healthRouter from "./routes/health.routes";
import profileRouter from "./routes/profile.routes";

export const app = express();

const configuredOrigins = process.env.FRONTEND_URL?.split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const allowedOrigins = configuredOrigins?.length
  ? configuredOrigins
  : ["http://localhost:5173", "http://127.0.0.1:5173"];

app.use(express.json());
app.use(cookieParser());
app.use(passport.initialize());
app.use(
  cors({
    origin: allowedOrigins,
    credentials: true,
  }),
);
app.use("/api", healthRouter);
app.use("/api/auth", authRouter);
app.use("/api", profileRouter);
