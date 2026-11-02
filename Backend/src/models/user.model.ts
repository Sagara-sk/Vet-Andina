import { db } from "../config/database";

export type StaffRole = "VETERINARIO" | "ADMINISTRATIVO";

export interface StaffUserInput {
  fullName: string;
  email: string;
  role: StaffRole;
  professionalLicense: string | null;
  passwordHash: string;
}

export interface StaffUserRecord {
  userId: string;
  fullName: string;
  email: string;
  role: StaffRole;
  professionalLicense: string | null;
}

export async function insertStaffUser(
  input: StaffUserInput,
): Promise<StaffUserRecord> {
  const result = await db.query<{ id_usuario: string }>(
    `INSERT INTO usuario (nombre_completo, rol, matricula_profesional, email, password_hash)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id_usuario`,
    [
      input.fullName,
      input.role,
      input.professionalLicense,
      input.email,
      input.passwordHash,
    ],
  );

  const userId = result.rows[0]?.id_usuario;
  if (!userId) {
    throw new Error("No se pudo crear el usuario.");
  }

  return {
    userId,
    fullName: input.fullName,
    email: input.email,
    role: input.role,
    professionalLicense: input.professionalLicense,
  };
}
