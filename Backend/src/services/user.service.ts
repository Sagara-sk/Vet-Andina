import bcrypt from "bcrypt";
import {
  insertStaffUser,
  type StaffRole,
  type StaffUserRecord,
} from "../models/user.model";

export interface CreateStaffUserInput {
  fullName: string;
  email: string;
  role: StaffRole;
  professionalLicense: string | null;
  password: string;
}

export class StaffUserConflictError extends Error {
  constructor() {
    super("Ya existe un usuario con ese correo electrónico o matrícula.");
    this.name = "StaffUserConflictError";
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

export async function createStaffUser(
  input: CreateStaffUserInput,
): Promise<StaffUserRecord> {
  const passwordHash = await bcrypt.hash(input.password, 12);

  try {
    return await insertStaffUser({
      fullName: input.fullName,
      email: input.email,
      role: input.role,
      professionalLicense: input.professionalLicense,
      passwordHash,
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new StaffUserConflictError();
    }

    throw error;
  }
}
