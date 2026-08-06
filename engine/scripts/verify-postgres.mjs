/**
 * Verifica el motor de comisiones leyendo de Supabase/Postgres (adaptador
 * FuentePostgres) y comprueba los totales de la Sección 6.
 *
 * Uso:
 *   DATABASE_URL="postgresql://..." node --import tsx scripts/verify-postgres.mjs
 */
import pg from "pg";
import { FuentePostgres } from "../src/db.postgres.ts";
import { calcularComision } from "../src/rules.ts";

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

const consulta = async (sql, params) => (await pool.query(sql, params)).rows;

const casos = [
  ["Andrés Rodríguez", "2026-08-05", 122.4],
  ["Daniel Franco", "2026-08-05", 122.4],
  ["Alejandro", "2026-09-02", 20.7],
  ["Alejandro", "2026-09-05", 31.05],
];

async function main() {
  const fuente = new FuentePostgres(consulta);
  const [clientes, colaboradores] = await Promise.all([
    fuente.cargarClientes(),
    fuente.cargarColaboradores(),
  ]);

  let ok = true;
  for (const [nombre, corte, esperado] of casos) {
    const col = colaboradores.find((c) => c.nombre === nombre);
    const total = calcularComision(col, clientes, corte).total;
    const paso = total === esperado;
    ok = ok && paso;
    console.log(`${paso ? "✓" : "✗"} ${nombre} @ ${corte}: $${total} (esperado $${esperado})`);
  }

  await pool.end();
  console.log(ok ? "\nTODOS LOS CASOS DE LA SECCIÓN 6 PASAN contra Supabase." : "\nHAY DISCREPANCIAS.");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error("Error:", e.message);
  pool.end().catch(() => {});
  process.exit(1);
});
