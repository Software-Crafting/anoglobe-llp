import { Pool, type PoolClient } from "pg";

// Dev reloads re-run this module; keep one pool across them.
const globalForDb = globalThis as unknown as { pool?: Pool };

export const pool = globalForDb.pool ?? new Pool({ connectionString: process.env.DATABASE_URL, max: 8 });

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export async function many<T = Row>(sql: string, params: unknown[] = []): Promise<T[]> {
  return (await pool.query(sql, params as never[])).rows as T[];
}

export async function one<T = Row>(sql: string, params: unknown[] = []): Promise<T | null> {
  return ((await pool.query(sql, params as never[])).rows[0] as T) ?? null;
}

export async function transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    const result = await work(client);
    await client.query("commit");
    return result;
  } catch (error) {
    await client.query("rollback");
    throw error;
  } finally {
    client.release();
  }
}
