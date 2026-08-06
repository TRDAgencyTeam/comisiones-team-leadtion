/**
 * Genera supabase/seed/0003_seed_data.sql con los datos reales de la Fase 1
 * (comisiones_cs.db) como INSERTs de Postgres. Preserva los IDs originales con
 * OVERRIDING SYSTEM VALUE y ajusta las secuencias IDENTITY al final.
 *
 * Uso: node --experimental-sqlite scripts/export-seed.mjs
 */
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { writeFileSync } from "node:fs";

const require = createRequire(import.meta.url);
const { DatabaseSync } = require("node:sqlite");

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUTA_DB = resolve(__dirname, "../../comisiones_cs.db");
const SALIDA = resolve(__dirname, "../../supabase/seed/0003_seed_data.sql");

const db = new DatabaseSync(RUTA_DB, { readOnly: true });

/** Escapa un valor JS a literal SQL de Postgres. */
function lit(v) {
  if (v === null || v === undefined) return "null";
  if (typeof v === "number") return String(v);
  if (typeof v === "boolean") return v ? "true" : "false";
  return "'" + String(v).replace(/'/g, "''") + "'";
}

function insertar(tabla, columnas, filas) {
  if (filas.length === 0) return "";
  const cols = columnas.join(", ");
  const values = filas
    .map((f) => "  (" + columnas.map((c) => lit(f[c])).join(", ") + ")")
    .join(",\n");
  return (
    `insert into public.${tabla} (${cols}) overriding system value values\n` +
    values +
    ";\n"
  );
}

const clientes = db
  .prepare(
    `select id, nombre, plan, fecha_activacion, estado_actual, fecha_cancelacion,
            valor_licencia_general, incluye_crm_en_marketing, servicios_adicionales,
            adquirio_level_up, ltv_acumulado, notas, creado_por_rol, fuente_fila_original
       from clientes order by id`,
  )
  .all()
  .map((r) => ({ ...r, incluye_crm_en_marketing: !!r.incluye_crm_en_marketing }));

const colaboradores = db
  .prepare(
    `select id, nombre, rol, categoria, fecha_ingreso, fecha_fin_prueba, activo
       from colaboradores order by id`,
  )
  .all()
  .map((r) => ({ ...r, activo: !!r.activo }));

const pagos = db
  .prepare(
    `select id, cliente_id, mes, valor, estado_mes from pagos_mensuales order by id`,
  )
  .all();

const partes = [];
partes.push("-- =============================================================================");
partes.push("-- Seed 0003 — Datos reales de la Fase 1 (generado desde comisiones_cs.db)");
partes.push("-- Ejecutar DESPUÉS de 0001 y 0002. Preserva IDs originales.");
partes.push("-- =============================================================================\n");
partes.push("begin;\n");

partes.push(
  insertar(
    "colaboradores",
    ["id", "nombre", "rol", "categoria", "fecha_ingreso", "fecha_fin_prueba", "activo"],
    colaboradores,
  ),
);
partes.push(
  insertar(
    "clientes",
    [
      "id", "nombre", "plan", "fecha_activacion", "estado_actual", "fecha_cancelacion",
      "valor_licencia_general", "incluye_crm_en_marketing", "servicios_adicionales",
      "adquirio_level_up", "ltv_acumulado", "notas", "creado_por_rol", "fuente_fila_original",
    ],
    clientes,
  ),
);
partes.push(
  insertar(
    "pagos_mensuales",
    ["id", "cliente_id", "mes", "valor", "estado_mes"],
    pagos,
  ),
);

// Reajustar las secuencias IDENTITY al máximo id insertado.
partes.push("\n-- Reajuste de secuencias IDENTITY tras inserción con IDs explícitos");
for (const t of ["clientes", "colaboradores", "pagos_mensuales"]) {
  partes.push(
    `select setval(pg_get_serial_sequence('public.${t}', 'id'), (select max(id) from public.${t}));`,
  );
}
partes.push("\ncommit;");

writeFileSync(SALIDA, partes.join("\n") + "\n", "utf8");
console.log(
  `Seed generado: ${SALIDA}\n  colaboradores=${colaboradores.length} clientes=${clientes.length} pagos=${pagos.length}`,
);
