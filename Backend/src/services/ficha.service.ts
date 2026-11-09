import type { PoolClient } from "pg";
import { db } from "../config/database";
import {
  ensureMedicalRecord,
  insertClinicalEntry,
  insertErratum,
  updateMedicalRecord,
  type MedicalRecordUpdate,
  type NewClinicalEntry,
} from "../models/ficha.model";

async function withTransaction<T>(
  operation: (client: PoolClient) => Promise<T>,
): Promise<T> {
  const client = await db.connect();

  try {
    await client.query("BEGIN");

    const result = await operation(client);

    await client.query("COMMIT");
    return result;
  } catch (error) {
    await client.query("ROLLBACK").catch((rollbackError: unknown) => {
      console.error(
        "No se pudo revertir la operación de ficha médica:",
        rollbackError,
      );
    });

    throw error;
  } finally {
    client.release();
  }
}

export async function updateAnimalMedicalRecord(
  animalId: string,
  input: MedicalRecordUpdate,
): Promise<void> {
  await withTransaction(async (client) => {
    await updateMedicalRecord(client, animalId, input);
  });
}

export async function addClinicalEntry(
  animalId: string,
  authorId: string,
  entry: NewClinicalEntry,
): Promise<string> {
  return withTransaction(async (client) => {
    const recordId = await ensureMedicalRecord(client, animalId);

    return insertClinicalEntry(client, {
      recordId,
      authorId,
      entry,
    });
  });
}

export async function addErratum(
  animalId: string,
  evolutionId: string,
  authorId: string,
  detail: string,
): Promise<string> {
  return withTransaction(async (client) => {
    const recordId = await ensureMedicalRecord(client, animalId);

    return insertErratum(client, {
      recordId,
      evolutionId,
      authorId,
      detail,
    });
  });
}