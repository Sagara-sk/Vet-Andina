import { db } from "../config/database";

export async function checkDatabaseConnection(): Promise<void> {
  await db.query("SELECT 1");
}
