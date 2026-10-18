import type { PoolClient } from "pg";
import { db } from "../config/database";

export interface OwnerAccountInput {
  fullName: string;
  email: string;
  phone: string;
  locality: string;
  passwordHash: string;
}

export interface OwnerAccountRecord {
  userId: string;
  ownerId: string;
  fullName: string;
  email: string;
  role: "CLIENTE";
}

export interface UserCredentialsRecord {
  userId: string;
  fullName: string;
  email: string;
  passwordHash: string;
  role: string;
}

export interface AuthenticatedUserRecord {
  userId: string;
  fullName: string;
  email: string;
  role: string;
}

export async function findAuthenticatedUserById(
  userId: string,
): Promise<AuthenticatedUserRecord | undefined> {
  const result = await db.query<{
    id_usuario: string;
    nombre_completo: string;
    email: string;
    rol: string;
  }>(
    `SELECT id_usuario, nombre_completo, email, rol
     FROM usuario
     WHERE id_usuario = $1
     LIMIT 1`,
    [userId],
  );
  const user = result.rows[0];

  if (!user) return undefined;

  return {
    userId: user.id_usuario,
    fullName: user.nombre_completo,
    email: user.email,
    role: user.rol,
  };
}

export async function findUserCredentialsByEmail(
  email: string,
): Promise<UserCredentialsRecord | undefined> {
  const result = await db.query<{
    id_usuario: string;
    nombre_completo: string;
    email: string;
    password_hash: string;
    rol: string;
  }>(
    `SELECT id_usuario, nombre_completo, email, password_hash, rol
     FROM usuario
     WHERE email = $1
     LIMIT 1`,
    [email],
  );
  const user = result.rows[0];

  if (!user) return undefined;

  return {
    userId: user.id_usuario,
    fullName: user.nombre_completo,
    email: user.email,
    passwordHash: user.password_hash,
    role: user.rol,
  };
}

export async function insertOwnerAccount(
  client: PoolClient,
  input: OwnerAccountInput,
): Promise<OwnerAccountRecord> {
  const userResult = await client.query<{ id_usuario: string }>(
    `INSERT INTO usuario (nombre_completo, rol, email, password_hash)
     VALUES ($1, 'CLIENTE', $2, $3)
     RETURNING id_usuario`,
    [input.fullName, input.email, input.passwordHash],
  );

  const userId = userResult.rows[0]?.id_usuario;
  if (!userId) {
    throw new Error("No se pudo crear el usuario.");
  }

  const ownerResult = await client.query<{ id_duenio: string }>(
    `INSERT INTO duenio (id_usuario, nombre_completo, telefono, email, localidad)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_duenio`,
    [userId, input.fullName, input.phone, input.email, input.locality],
  );

  const ownerId = ownerResult.rows[0]?.id_duenio;
  if (!ownerId) {
    throw new Error("No se pudo crear el perfil del dueño.");
  }

  return {
    userId,
    ownerId,
    fullName: input.fullName,
    email: input.email,
    role: "CLIENTE",
  };
}
