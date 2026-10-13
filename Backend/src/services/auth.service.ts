import bcrypt from "bcrypt";
import type { PoolClient } from "pg";
import { db } from "../config/database";
import {
  insertOwnerAccount,
  type OwnerAccountRecord,
} from "../models/owner.model";

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
