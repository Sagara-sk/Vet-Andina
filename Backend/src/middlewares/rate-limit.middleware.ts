import { rateLimit } from "express-rate-limit";

// Límites por IP guardados en memoria: alcanzan para una sola instancia de la API.
// Si se escala a varias instancias, usar un store compartido (por ejemplo, Redis).

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;
const ONE_HOUR_MS = 60 * 60 * 1000;

// Solo cuentan los intentos fallidos: un login correcto no consume el cupo.
export const loginRateLimiter = rateLimit({
  windowMs: FIFTEEN_MINUTES_MS,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "error",
    message:
      "Demasiados intentos de inicio de sesión. Esperá 15 minutos y volvé a intentarlo.",
  },
});

export const registerRateLimiter = rateLimit({
  windowMs: ONE_HOUR_MS,
  limit: 5,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: {
    status: "error",
    message:
      "Se alcanzó el límite de registros desde esta conexión. Probá de nuevo más tarde.",
  },
});
