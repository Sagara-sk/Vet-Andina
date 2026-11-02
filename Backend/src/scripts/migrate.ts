import "../config/env";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { db } from "../config/database";

// Aplica en orden los archivos de Backend/migrations que todavía no corrieron y
// los registra en schema_migrations. Cada archivo va en su propia transacción:
// si falla, no queda aplicado a medias. El esquema anterior a 001 se creó a mano
// en Neon y no está versionado.

const MIGRATIONS_DIR = resolve(__dirname, "../../migrations");

async function main(): Promise<void> {
  await db.query(
    `CREATE TABLE IF NOT EXISTS schema_migrations (
       nombre VARCHAR(255) PRIMARY KEY,
       aplicada_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
     )`,
  );

  const applied = new Set(
    (await db.query<{ nombre: string }>("SELECT nombre FROM schema_migrations")).rows.map(
      (row) => row.nombre,
    ),
  );
  const files = (await readdir(MIGRATIONS_DIR)).filter((file) => file.endsWith(".sql")).sort();
  const pending = files.filter((file) => !applied.has(file));

  if (pending.length === 0) {
    console.log("No hay migraciones pendientes.");
    return;
  }

  for (const file of pending) {
    const sql = await readFile(resolve(MIGRATIONS_DIR, file), "utf8");
    const client = await db.connect();

    try {
      await client.query("BEGIN");
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (nombre) VALUES ($1)", [file]);
      await client.query("COMMIT");
      console.log(`Aplicada: ${file}`);
    } catch (error) {
      await client.query("ROLLBACK").catch(() => undefined);
      throw new Error(`Falló ${file}: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      client.release();
    }
  }
}

main()
  .catch((error: unknown) => {
    console.error("No se pudieron aplicar las migraciones:", error);
    process.exitCode = 1;
  })
  .finally(() => db.end());
