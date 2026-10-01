import "server-only";
import { Pool } from "pg";
import { FuentePostgres } from "comisiones-cs-engine/postgres";

/**
 * Pool de Postgres (Supabase) reutilizado entre invocaciones. Usa el pooler de
 * Supabase (puerto 6543) vía DATABASE_URL. NUNCA se importa desde el cliente:
 * el `import "server-only"` hace fallar el build si alguien lo intenta.
 */
declare global {
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function getPool(): Pool {
  if (!process.env.DATABASE_URL) {
    throw new Error(
      "Falta DATABASE_URL. Configúrala en web/.env.local (local) o en las variables de entorno de Vercel.",
    );
  }
  if (!global._pgPool) {
    global._pgPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: { rejectUnauthorized: false }, // Supabase usa TLS
      max: 3, // conservador para entornos serverless
    });
  }
  return global._pgPool;
}

/** Ejecutor de consultas agnóstico que espera el adaptador del motor. */
export const consulta = async (sql: string, params?: unknown[]) =>
  (await getPool().query(sql, params)).rows;

/**
 * Ejecuta `fn` en UNA transacción (misma conexión). Con `candado` toma un lock
 * por clave (pg_advisory_xact_lock) para que dos requests simultáneos no
 * intercalen un "borrar y volver a insertar" (evita filas duplicadas).
 */
export async function transaccion<T>(
  fn: (q: (sql: string, params?: unknown[]) => Promise<Record<string, unknown>[]>) => Promise<T>,
  candado?: string,
): Promise<T> {
  const client = await getPool().connect();
  try {
    await client.query("begin");
    if (candado) await client.query("select pg_advisory_xact_lock(hashtext($1))", [candado]);
    const r = await fn(async (sql, params) => (await client.query(sql, params)).rows);
    await client.query("commit");
    return r;
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Fuente de datos del motor conectada a Supabase. */
export const fuente = new FuentePostgres(consulta);
