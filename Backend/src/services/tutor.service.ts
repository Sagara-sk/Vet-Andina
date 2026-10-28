import type { PoolClient } from "pg";
import { db } from "../config/database";
import {
  farmBelongsToTutor,
  findTutorAccount,
  findTutorById,
  insertAnimalWithRecord,
  insertTutor,
  updateTutor,
  type AnimalInput,
  type TutorDetail,
  type TutorFields,
} from "../models/tutor.model";
import { BadRequestError, ConflictError, NotFoundError, pgErrorCode } from "./errors";

const DUPLICATE_TUTOR = "Ya existe un tutor con ese correo electrónico o DNI/CUIT.";

export async function createTutor(input: TutorFields): Promise<TutorDetail> {
  try {
    const id = await insertTutor(input);
    return (await findTutorById(id))!;
  } catch (error) {
    if (pgErrorCode(error) === "23505") throw new ConflictError(DUPLICATE_TUTOR);
    throw error;
  }
}

export async function editTutor(id: string, input: TutorFields): Promise<TutorDetail> {
  const current = await findTutorAccount(id);
  if (!current) throw new NotFoundError("El tutor no existe.");

  // El email de un tutor con cuenta es su usuario de login (tabla usuario):
  // cambiarlo solo acá dejaría los dos registros desincronizados.
  if (current.hasAccount && input.email !== current.email) {
    throw new BadRequestError(
      "Este tutor tiene cuenta propia: el correo electrónico solo lo puede cambiar el tutor.",
    );
  }

  try {
    await updateTutor(id, input);
  } catch (error) {
    if (pgErrorCode(error) === "23505") throw new ConflictError(DUPLICATE_TUTOR);
    throw error;
  }

  return (await findTutorById(id))!;
}

export async function addAnimal(tutorId: string, input: AnimalInput): Promise<TutorDetail> {
  if (!(await findTutorAccount(tutorId))) throw new NotFoundError("El tutor no existe.");

  if (input.farmId && !(await farmBelongsToTutor(input.farmId, tutorId))) {
    throw new BadRequestError("El establecimiento no pertenece a este tutor.");
  }

  const client: PoolClient = await db.connect();

  try {
    await client.query("BEGIN");
    await insertAnimalWithRecord(client, tutorId, input);
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK").catch(() => undefined);
    throw error;
  } finally {
    client.release();
  }

  return (await findTutorById(tutorId))!;
}
