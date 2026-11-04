import type { PoolClient } from "pg";

export async function lockAgendaDate(
  client: PoolClient,
  date: string,
): Promise<void> {
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
    `agenda:${date}`,
  ]);
}

export async function lockVetDay(
  client: PoolClient,
  vetId: string,
  dateTime: Date,
): Promise<void> {
  const day = dateTime.toISOString().slice(0, 10);
  await client.query(`SELECT pg_advisory_xact_lock(hashtextextended($1, 0))`, [
    `${vetId}:${day}`,
  ]);
}
