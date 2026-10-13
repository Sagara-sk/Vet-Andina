import type { PoolClient } from "pg";

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
