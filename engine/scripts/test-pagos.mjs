/**
 * Prueba de humo del camino de pagos (comision_hitos) contra Supabase real:
 * calcula, inserta un pago, confirma registro y detección de "pagado", y limpia.
 *
 * Uso: DATABASE_URL="postgresql://..." node --import tsx scripts/test-pagos.mjs
 */
import pg from "pg";
import { FuentePostgres } from "../src/db.postgres.ts";
import { calcularComision } from "../src/rules.ts";

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});
const consulta = async (sql, params) => (await pool.query(sql, params)).rows;

async function main() {
  const fuente = new FuentePostgres(consulta);
  const [clientes, colaboradores] = await Promise.all([
    fuente.cargarClientes(),
    fuente.cargarColaboradores(),
  ]);
  const andres = colaboradores.find((c) => c.nombre === "Andrés Rodríguez");
  const corte = "2026-08-05";
  const r = calcularComision(andres, clientes, corte);
  const linea = r.lineas[0];
  const h = linea.hitos[0];
  console.log(`Objetivo: ${andres.nombre} · ${linea.clienteNombre} · ${h.hito} · ${h.monto}`);

  // Insertar pago (idempotente)
  await consulta(
    `insert into public.comision_hitos
       (colaborador_id, cliente_id, hito, base, tasa, meses_base, monto, fecha_corte)
     values ($1,$2,$3,$4,$5,$6,$7,$8)
     on conflict (colaborador_id, cliente_id, hito) do nothing`,
    [r.colaboradorId, linea.clienteId, h.hito, h.base, h.tasa, h.mesesBase, h.monto, corte],
  );

  // Confirmar y verificar deteccción de "pagado"
  const rows = await consulta(
    `select colaborador_id, cliente_id, hito, monto, liquidado_en
       from public.comision_hitos where colaborador_id=$1 and cliente_id=$2 and hito=$3`,
    [r.colaboradorId, linea.clienteId, h.hito],
  );
  const pagados = new Set(rows.map((x) => `${x.colaborador_id}:${x.cliente_id}:${x.hito}`));
  const clave = `${r.colaboradorId}:${linea.clienteId}:${h.hito}`;
  console.log(`Registrado: ${rows.length === 1 ? "SÍ" : "NO"} · monto guardado: ${rows[0]?.monto}`);
  console.log(`Detectado como pagado por la lógica: ${pagados.has(clave) ? "SÍ" : "NO"}`);

  // Limpieza (dejar la base como estaba)
  await consulta(
    `delete from public.comision_hitos where colaborador_id=$1 and cliente_id=$2 and hito=$3`,
    [r.colaboradorId, linea.clienteId, h.hito],
  );
  const restantes = await consulta(`select count(*)::int n from public.comision_hitos`);
  console.log(`Limpieza ok · filas en comision_hitos ahora: ${restantes[0].n}`);

  await pool.end();
}

main().catch((e) => {
  console.error("Error:", e.message);
  pool.end().catch(() => {});
  process.exit(1);
});
