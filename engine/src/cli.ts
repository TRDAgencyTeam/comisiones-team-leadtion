/**
 * CLI de reporte de comisiones. Lee la base SQLite de la Fase 1 y muestra, para
 * cada colaborador que comisiona, el detalle a una fecha de corte.
 *
 * Uso:
 *   npm run reporte -- [fechaCorte]
 *   (por defecto usa 2026-08-05 para fundadores; ver Sección 6)
 *
 * Requiere Node con --experimental-sqlite (ya incluido en el script npm).
 */

import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { calcularComision } from "./rules.js";
import { FuenteSQLite } from "./db.js";
import type { ResultadoComision } from "./types.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUTA_DB = resolve(__dirname, "../../comisiones_cs.db");

const usd = (n: number) => `$${n.toFixed(2)}`;

function imprimir(r: ResultadoComision): void {
  const prueba = r.enPeriodoPrueba ? " [EN PERIODO DE PRUEBA]" : "";
  console.log(`\n=== ${r.colaboradorNombre} (${r.categoria ?? r.colaboradorNombre}) — corte ${r.fechaCorte}${prueba} ===`);
  if (r.lineas.length === 0) {
    console.log("  (sin comisión a este corte)");
  }
  for (const l of r.lineas) {
    const hitos = l.hitos.map((h) => `${h.hito} ${usd(h.monto)}`).join(", ");
    console.log(`  ${l.fechaActivacion}  ${l.clienteNombre.padEnd(42)} ${usd(l.subtotal).padStart(8)}  [${hitos}]`);
  }
  console.log(`  ${"TOTAL".padStart(60)} ${usd(r.total).padStart(8)}`);
}

function main(): void {
  const fuente = new FuenteSQLite(RUTA_DB);
  const clientes = fuente.cargarClientes();
  const arg = process.argv[2];

  const colaboradores = fuente
    .cargarColaboradores()
    .filter((c) => c.categoria === "fundador" || c.categoria === "nuevo");

  for (const col of colaboradores) {
    // Fundadores: corte 2026-08-05. Alejandro (nuevo): primer pago 2026-09-05.
    const corte = arg ?? (col.categoria === "nuevo" ? "2026-09-05" : "2026-08-05");
    imprimir(calcularComision(col, clientes, corte));
  }
}

main();
