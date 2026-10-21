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

export interface ClientProfileUpdateInput {
  dniCuit: string;
  tipoPersona: "INDIVIDUAL" | "EMPRESA_PRODUCTOR";
  direccionUrbana?: string | null;
  nombreFinca?: string | null;
}

interface TableColumn {
  column_name: string;
  is_nullable: "YES" | "NO";
  column_default: string | null;
  is_identity: "YES" | "NO";
}

export class ClientProfileSchemaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ClientProfileSchemaError";
  }
}

export class ClientProfileConflictError extends Error {
  constructor() {
    super("El DNI/CUIT ya está asociado a otro perfil.");
    this.name = "ClientProfileConflictError";
  }
}

async function getTableColumns(
  client: PoolClient,
  tableName: "duenio" | "finca",
): Promise<Map<string, TableColumn>> {
  const result = await client.query<TableColumn>(
    `SELECT column_name, is_nullable, column_default, is_identity
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1`,
    [tableName],
  );

  return new Map(result.rows.map((column) => [column.column_name, column]));
}

export async function saveClientProfileForUser(
  userId: string,
  input: ClientProfileUpdateInput,
): Promise<void> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const duenioColumns = await getTableColumns(client, "duenio");

    if (!duenioColumns.size) {
      throw new ClientProfileSchemaError(
        "No existe la tabla public.duenio en la base de datos.",
      );
    }

    const requiredFields = [
      "id_usuario",
      "id_duenio",
      "dni_cuit",
      "tipo_persona",
      "localidad",
    ];
    const missingRequiredFields = requiredFields.filter(
      (field) => !duenioColumns.has(field),
    );

    if (missingRequiredFields.length) {
      throw new ClientProfileSchemaError(
        `La tabla public.duenio no tiene los campos requeridos: ${missingRequiredFields.join(", ")}. Aplicá las migraciones del backend y volvé a intentar.`,
      );
    }

    if (input.direccionUrbana && !duenioColumns.has("direccion_urbana")) {
      throw new ClientProfileSchemaError(
        "La tabla public.duenio no tiene el campo direccion_urbana requerido para guardar la dirección.",
      );
    }

    const ownerResult = await client.query<{
      id_duenio: string;
      localidad: string;
    }>(
      `SELECT d.id_duenio, d.localidad
       FROM public.duenio AS d
       WHERE d.id_usuario = $1
       FOR UPDATE`,
      [userId],
    );

    const owner = ownerResult.rows[0];
    if (!owner) {
      throw new Error(
        "No se encontró el perfil de dueño asociado a la cuenta autenticada.",
      );
    }

    const updateFields = ["dni_cuit = $1", "tipo_persona = $2"];
    const updateValues: unknown[] = [input.dniCuit, input.tipoPersona];
    if (duenioColumns.has("direccion_urbana")) {
      updateFields.push(`direccion_urbana = $${updateValues.length + 1}`);
      updateValues.push(input.direccionUrbana ?? null);
    }

    const updatedOwner = await client.query(
      `UPDATE public.duenio AS d
       SET ${updateFields.join(", ")}
       WHERE d.id_usuario = $${updateValues.length + 1}`,
      [...updateValues, userId],
    );
    if (updatedOwner.rowCount !== 1) {
      throw new Error("No se pudo actualizar el perfil de dueño.");
    }

    if (input.nombreFinca?.trim()) {
      const fincaColumns = await getTableColumns(client, "finca");
      if (!fincaColumns.size) {
        throw new ClientProfileSchemaError(
          "No existe la tabla public.finca para guardar el establecimiento indicado.",
        );
      }

      const requiredFincaFields = [
        "id_finca",
        "id_duenio",
        "nombre_finca",
        "localidad",
      ];
      const missingFincaFields = requiredFincaFields.filter(
        (field) => !fincaColumns.has(field),
      );
      if (missingFincaFields.length) {
        throw new ClientProfileSchemaError(
          `La tabla public.finca no tiene los campos requeridos: ${missingFincaFields.join(", ")}.`,
        );
      }

      const fincaInsertFields = new Set([
        "id_duenio",
        "nombre_finca",
        "localidad",
      ]);
      const missingRequiredFincaFields = [...fincaColumns.values()]
        .filter(
          (column) =>
            column.is_nullable === "NO" &&
            column.column_default === null &&
            column.is_identity === "NO" &&
            !fincaInsertFields.has(column.column_name),
        )
        .map((column) => column.column_name);
      if (missingRequiredFincaFields.length) {
        throw new ClientProfileSchemaError(
          `La tabla public.finca exige otros campos sin valor por defecto: ${missingRequiredFincaFields.join(", ")}.`,
        );
      }

      const fincaResult = await client.query<{ id_finca: string }>(
        `SELECT f.id_finca
         FROM public.finca AS f
         WHERE f.id_duenio = $1
         ORDER BY f.id_finca
         LIMIT 1
         FOR UPDATE`,
        [owner.id_duenio],
      );

      if (fincaResult.rowCount) {
        await client.query(
          `UPDATE public.finca AS f
           SET nombre_finca = $1, localidad = $2
           WHERE f.id_finca = $3`,
          [input.nombreFinca.trim(), owner.localidad, fincaResult.rows[0].id_finca],
        );
      } else {
        await client.query(
          `INSERT INTO public.finca (id_duenio, nombre_finca, localidad)
           VALUES ($1, $2, $3)`,
          [owner.id_duenio, input.nombreFinca.trim(), owner.localidad],
        );
      }
    }

    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      error.code === "23505" &&
      "constraint" in error &&
      error.constraint === "duenio_dni_cuit_key"
    ) {
      throw new ClientProfileConflictError();
    }
    throw error;
  } finally {
    client.release();
  }
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
