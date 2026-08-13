/**
 * Importa afiliados-data/afiliados-backup.json (export del localStorage de la
 * plataforma de afiliados) a las tablas *_afiliados de Supabase.
 * Idempotente: borra e inserta.
 *
 * Uso: DATABASE_URL="postgresql://..." node scripts/import-afiliados.mjs
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUTA = resolve(__dirname, "../../afiliados-data/afiliados-backup.json");
const data = JSON.parse(readFileSync(RUTA, "utf8"));

const num = (v) => (v === null || v === undefined || v === "" ? null : Number(v));

const client = new pg.Client({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

async function main() {
  await client.connect();
  await client.query("begin");
  // Limpieza (re-importable)
  await client.query("truncate public.afiliados, public.clientes_afiliados, public.servicios_afiliados, public.pagos_afiliados");

  for (const a of data.leadtion_afs) {
    await client.query(
      `insert into public.afiliados (ref,nombre,email,tipo,ingreso,notas,comision_agencia,creado_en)
       values ($1,$2,$3,$4,$5,$6,$7,$8)`,
      [a.id, a.nombre, a.email || null, a.tipo, a.ingreso || null, a.notas || null, num(a.comision_agencia), a.creado_en || null],
    );
  }
  for (const c of data.leadtion_cls) {
    await client.query(
      `insert into public.clientes_afiliados (ref,nombre,email,afiliado_ref,fecha_inicio,precio_licencia,creado_en)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [c.id, c.nombre, c.email || null, c.afiliado_id || null, c.fecha_inicio || null, num(c.precio_licencia), c.creado_en || null],
    );
  }
  for (const s of data.leadtion_srvs) {
    await client.query(
      `insert into public.servicios_afiliados (ref,cliente_ref,tipo,nombre_personalizado,precio)
       values ($1,$2,$3,$4,$5)`,
      [s.id, s.cliente_id || null, s.tipo || null, s.nombre_personalizado || null, num(s.precio)],
    );
  }
  for (const p of data.leadtion_pagos) {
    await client.query(
      `insert into public.pagos_afiliados (ref,cliente_ref,mes_num,fecha_pago,monto,notas,comprobante_nombre)
       values ($1,$2,$3,$4,$5,$6,$7)`,
      [p.id || null, p.cliente_id || null, num(p.mes_num), p.fecha_pago || null, num(p.monto), p.notas || null, p.comprobante_nombre || null],
    );
  }

  await client.query("commit");
  const r = await client.query(`select
    (select count(*) from public.afiliados) afiliados,
    (select count(*) from public.clientes_afiliados) clientes,
    (select count(*) from public.servicios_afiliados) servicios,
    (select count(*) from public.pagos_afiliados) pagos`);
  console.log("Importado:", r.rows[0]);
  await client.end();
}

main().catch((e) => { console.error("Error:", e.message); client.end().catch(() => {}); process.exit(1); });
