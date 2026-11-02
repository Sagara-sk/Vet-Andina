import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import type { PoolClient } from "pg";
import { db } from "../config/database";
import {
  findUserCredentialsByEmail,
  insertOwnerAccount,
  type OwnerAccountRecord,
} from "../models/owner.model";

const sessionTtlSeconds = Number(process.env.AUTH_SESSION_TTL_SECONDS ?? 28800);

if (
  !Number.isInteger(sessionTtlSeconds) ||
  sessionTtlSeconds < 300 ||
  sessionTtlSeconds > 2592000
) {
  throw new Error("AUTH_SESSION_TTL_SECONDS debe estar entre 300 y 2592000.");
}

export const SESSION_COOKIE_NAME = "vet_andina_session";

export interface AuthenticatedUser {
  userId: string;
  fullName: string;
  email: string;
  role: string;
}

export class InvalidCredentialsError extends Error {
  constructor() {
    super("Email o contraseña incorrectos.");
    this.name = "InvalidCredentialsError";
  }
}

export function getJwtSecret(): string {
  const secret = process.env.JWT_SECRET;

  if (!secret || Buffer.byteLength(secret, "utf8") < 32) {
    throw new Error("JWT_SECRET debe tener al menos 32 bytes.");
  }

  return secret;
}

// Hash descartable para comparar cuando el email no existe: así la respuesta tarda
// lo mismo y no revela qué correos están registrados.
const dummyPasswordHash = bcrypt.hash("vet-andina-cuenta-inexistente", 12);

export async function authenticateUser(
  email: string,
  password: string,
): Promise<AuthenticatedUser> {
  const user = await findUserCredentialsByEmail(email.trim().toLowerCase());
  const passwordMatches = await bcrypt.compare(
    password,
    user?.passwordHash ?? (await dummyPasswordHash),
  );

  if (!user || !passwordMatches) {
    throw new InvalidCredentialsError();
  }

  return {
    userId: user.userId,
    fullName: user.fullName,
    email: user.email,
    role: user.role,
  };
}

export function createSessionToken(user: Pick<AuthenticatedUser, "userId" | "role">): string {
  return jwt.sign({ role: user.role }, getJwtSecret(), {
    subject: user.userId,
    expiresIn: sessionTtlSeconds,
  });
}

export function verifySessionToken(
  token: string,
): { userId: string; role: string } | undefined {
  try {
    const payload = jwt.verify(token, getJwtSecret());

    if (
      typeof payload === "string" ||
      typeof payload.sub !== "string" ||
      typeof payload.role !== "string"
    ) {
      return undefined;
    }

    return { userId: payload.sub, role: payload.role };
  } catch {
    return undefined;
  }
}

export function sessionCookieOptions() {
  const sameSite = (process.env.AUTH_COOKIE_SAME_SITE ?? "strict").toLowerCase();

  if (!["strict", "lax", "none"].includes(sameSite)) {
    throw new Error("AUTH_COOKIE_SAME_SITE debe ser strict, lax o none.");
  }

  const secure = process.env.NODE_ENV === "production";

  if (sameSite === "none" && !secure) {
    throw new Error("SameSite=None requiere NODE_ENV=production y HTTPS.");
  }

  return {
    httpOnly: true,
    secure,
    sameSite: sameSite as "strict" | "lax" | "none",
    path: "/",
    maxAge: sessionTtlSeconds * 1000,
  };
}

export interface RegisterOwnerInput {
  fullName: string;
  email: string;
  phone: string;
  locality: string;
  password: string;
}

export class RegistrationConflictError extends Error {
  constructor() {
    super("Ya existe una cuenta con ese correo electrónico.");
    this.name = "RegistrationConflictError";
  }
}

function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "23505"
  );
}

export async function registerOwner(
  input: RegisterOwnerInput,
): Promise<OwnerAccountRecord> {
  const passwordHash = await bcrypt.hash(input.password, 12);
  const client: PoolClient = await db.connect();

  try {
    await client.query("BEGIN");
    const account = await insertOwnerAccount(client, {
      fullName: input.fullName,
      email: input.email,
      phone: input.phone,
      locality: input.locality,
      passwordHash,
    });
    await client.query("COMMIT");
    return account;
  } catch (error) {
    try {
      await client.query("ROLLBACK");
    } catch (rollbackError) {
      console.error(
        "No se pudo revertir la transacción de registro:",
        rollbackError,
      );
    }

    if (isUniqueViolation(error)) {
      throw new RegistrationConflictError();
    }

    throw error;
  } finally {
    client.release();
  }
}
