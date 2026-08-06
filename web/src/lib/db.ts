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

/** Fuente de datos del motor conectada a Supabase. */
export const fuente = new FuentePostgres(consulta);
