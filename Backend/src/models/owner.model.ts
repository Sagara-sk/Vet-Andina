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

export type TipoPersona = "INDIVIDUAL" | "EMPRESA_PRODUCTOR";
export type TipoAtencion = "URBANO" | "RURAL";

// Tipo de atención del tutor, con la misma regla que ya usa el frontend:
// productor (EMPRESA_PRODUCTOR) = RURAL, particular (INDIVIDUAL) = URBANO y
// perfil sin tipo de persona = NULL. Requiere el alias `d` para duenio. Se usa
// en la sesión y para autorizar /establecimientos dentro de la consulta.
export const CARE_TYPE_SQL = `
  CASE d.tipo_persona
    WHEN 'EMPRESA_PRODUCTOR' THEN 'RURAL'
    WHEN 'INDIVIDUAL' THEN 'URBANO'
  END`;

export interface AuthenticatedUserRecord {
  userId: string;
  fullName: string;
  email: string;
  role: string;
  profileComplete: boolean;
  // Tipo de tutor (duenio.tipo_persona). null para el personal y para clientes
  // que todavía no completaron el perfil.
  personType: TipoPersona | null;
  // Tipo de atención del tutor (ver CARE_TYPE_SQL). null para el personal y
  // para clientes sin tipo de persona cargado.
  careType: TipoAtencion | null;
}

export interface UserCredentialsRecord extends AuthenticatedUserRecord {
  passwordHash: string;
}

interface AuthenticatedUserRow {
  id_usuario: string;
  nombre_completo: string;
  email: string;
  rol: string;
  perfil_completo: boolean;
  tipo_persona: TipoPersona | null;
  tipo_atencion: TipoAtencion | null;
}

const AUTHENTICATED_USER_COLUMNS = `
  u.id_usuario, u.nombre_completo, u.email, u.rol, d.tipo_persona,
  CASE WHEN u.rol = 'CLIENTE' THEN ${CARE_TYPE_SQL} END AS tipo_atencion,
  CASE
    WHEN u.rol <> 'CLIENTE' THEN TRUE
    WHEN d.dni_cuit IS NULL OR btrim(d.dni_cuit) = '' OR d.tipo_persona IS NULL THEN FALSE
    WHEN d.tipo_persona = 'EMPRESA_PRODUCTOR' AND NOT EXISTS (
      SELECT 1 FROM finca f
      WHERE f.id_duenio = d.id_duenio AND length(btrim(f.nombre_finca)) >= 2
    ) THEN FALSE
    ELSE TRUE
  END AS perfil_completo`;

function toAuthenticatedUser(row: AuthenticatedUserRow): AuthenticatedUserRecord {
  return {
    userId: row.id_usuario,
    fullName: row.nombre_completo,
    email: row.email,
    role: row.rol,
    profileComplete: row.perfil_completo,
    personType: row.tipo_persona,
    careType: row.tipo_atencion,
  };
}

export async function findAuthenticatedUserById(
  userId: string,
): Promise<AuthenticatedUserRecord | undefined> {
  const result = await db.query<AuthenticatedUserRow>(
    `SELECT ${AUTHENTICATED_USER_COLUMNS}
     FROM usuario u
     LEFT JOIN duenio d ON d.id_usuario = u.id_usuario
     WHERE u.id_usuario = $1
     LIMIT 1`,
    [userId],
  );
  const user = result.rows[0];

  if (!user) return undefined;

  return toAuthenticatedUser(user);
}

export async function findUserCredentialsByEmail(
  email: string,
): Promise<UserCredentialsRecord | undefined> {
  const result = await db.query<AuthenticatedUserRow & { password_hash: string }>(
    `SELECT ${AUTHENTICATED_USER_COLUMNS}, u.password_hash
     FROM usuario u
     LEFT JOIN duenio d ON d.id_usuario = u.id_usuario
     WHERE u.email = $1
     LIMIT 1`,
    [email],
  );
  const user = result.rows[0];

  if (!user) return undefined;

  return { ...toAuthenticatedUser(user), passwordHash: user.password_hash };
}

export interface OwnerProfileInput {
  dniCuit: string;
  address: string | null;
  personType: TipoPersona;
  farmName: string | null;
}

export async function updateOwnerProfile(
  client: PoolClient,
  userId: string,
  input: OwnerProfileInput,
): Promise<boolean> {
  const ownerResult = await client.query<{ id_duenio: string; localidad: string }>(
    `UPDATE duenio
     SET dni_cuit = $2, direccion_urbana = $3, tipo_persona = $4
     WHERE id_usuario = $1
     RETURNING id_duenio, localidad`,
    [userId, input.dniCuit, input.address, input.personType],
  );
  const owner = ownerResult.rows[0];

  if (!owner) return false;

  if (input.farmName) {
    await client.query(
      `INSERT INTO finca (id_duenio, nombre_finca, localidad)
       SELECT $1, $2::text, $3
       WHERE NOT EXISTS (
         SELECT 1 FROM finca
         WHERE id_duenio = $1
           AND lower(btrim(nombre_finca)) = lower(btrim($2::text))
       )`,
      [owner.id_duenio, input.farmName, owner.localidad],
    );
  }

  return true;
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
