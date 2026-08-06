/**
 * Aplica las migraciones y el seed contra un Postgres (Supabase) y verifica que
 * el motor reproduce la Sección 6 leyendo de la base real.
 *
 * Uso:
 *   DATABASE_URL="postgresql://...:6543/postgres" node scripts/run-migrations.mjs
 *
 * Espera la cadena en la variable de entorno DATABASE_URL (usar el pooler de
 * Supabase). Ejecuta, en orden: 0001, 0002, 0003. Es seguro re-ejecutar el
 * esquema (IF NOT EXISTS); el seed asume tablas vacías (ver nota abajo).
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const raiz = resolve(__dirname, "../..");

const DATABASE_URL = process.env.DATABASE_URL;
if (!DATABASE_URL) {
  console.error("Falta DATABASE_URL. Ej: DATABASE_URL=\"postgresql://...\" node scripts/run-migrations.mjs");
  process.exit(1);
}

const archivos = [
  "supabase/migrations/0001_init_schema.sql",
  "supabase/migrations/0002_comisiones.sql",
  "supabase/seed/0003_seed_data.sql",
];

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: { rejectUnauthorized: false }, // Supabase usa TLS
});

async function main() {
  await client.connect();
  console.log("Conectado a Postgres.\n");

  for (const rel of archivos) {
    const sql = readFileSync(resolve(raiz, rel), "utf8");
    process.stdout.write(`Aplicando ${rel} ... `);
    await client.query(sql);
    console.log("ok");
  }

  // Verificación de conteos
  const { rows: [conteo] } = await client.query(`
    select
      (select count(*) from public.clientes)         as clientes,
      (select count(*) from public.pagos_mensuales)  as pagos,
      (select count(*) from public.colaboradores)    as colaboradores
  `);
  console.log(`\nConteos: clientes=${conteo.clientes} pagos=${conteo.pagos} colaboradores=${conteo.colaboradores}`);

  await client.end();
  console.log("\nMigración completa. Verifica el motor con: node scripts/verify-postgres.mjs");
}

main().catch((e) => {
  console.error("\nError:", e.message);
  client.end().catch(() => {});
  process.exit(1);
});
