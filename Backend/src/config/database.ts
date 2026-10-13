import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("Falta configurar DATABASE_URL en Backend/.env.");
}

export const db = new Pool({
  connectionString,
  ssl: { rejectUnauthorized: true },
});

db.on("error", (error) => {
  console.error("Error inesperado en el pool de PostgreSQL:", error);
});
