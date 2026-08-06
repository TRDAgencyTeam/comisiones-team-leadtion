/**
 * Prueba de integración: carga los datos REALES desde comisiones_cs.db (Fase 1)
 * y verifica que el motor reproduce los totales de la Sección 6. Esto blinda el
 * cargador de datos, no solo la lógica pura.
 *
 * Requiere Node >= 22 con `node:sqlite`. Si la base no está, la prueba se salta.
 */

import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { calcularComision } from "../src/rules.js";
import { FuenteSQLite } from "../src/db.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RUTA_DB = resolve(__dirname, "../../comisiones_cs.db");

const suite = existsSync(RUTA_DB) ? describe : describe.skip;

suite("Integración contra comisiones_cs.db (datos reales de Fase 1)", () => {
  const fuente = new FuenteSQLite(RUTA_DB);
  const clientes = fuente.cargarClientes();

  it("la base tiene 62 clientes y 4 colaboradores", () => {
    expect(clientes).toHaveLength(62);
    expect(fuente.cargarColaboradores()).toHaveLength(4);
  });

  it("Andrés Rodríguez (fundador) al 2026-08-05 → $122.40 en 12 clientes", () => {
    const andres = fuente.colaboradorPorNombre("Andrés Rodríguez")!;
    const r = calcularComision(andres, clientes, "2026-08-05");
    expect(r.total).toBe(122.4);
    expect(r.lineas).toHaveLength(12);
  });

  it("Daniel Franco (fundador) al 2026-08-05 → $122.40 (independiente)", () => {
    const daniel = fuente.colaboradorPorNombre("Daniel Franco")!;
    const r = calcularComision(daniel, clientes, "2026-08-05");
    expect(r.total).toBe(122.4);
  });

  it("Alejandro (nuevo) al 2026-09-02 → $20.70; al 2026-09-05 → $31.05", () => {
    const alejandro = fuente.colaboradorPorNombre("Alejandro")!;
    expect(calcularComision(alejandro, clientes, "2026-09-02").total).toBe(20.7);
    expect(calcularComision(alejandro, clientes, "2026-09-05").total).toBe(31.05);
  });
});
