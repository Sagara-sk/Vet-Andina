import { db } from "../config/database";

export async function checkDatabaseConnection(): Promise<boolean> {
  await db.query("SELECT 1");
  return true;
}
