import { neon } from '@neondatabase/serverless';

export async function getData() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error('Falta configurar DATABASE_URL en el entorno del Backend.');
  }

  const sql = neon(databaseUrl);
  return sql`SELECT 1 AS connected`;
}
