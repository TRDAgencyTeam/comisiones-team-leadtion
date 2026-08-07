/**
 * Pruebas del motor de reglas contra los casos calculados a mano de la Sección 6
 * del documento de contexto. Corte de referencia base: 2026-08-05.
 *
 * Estos números son la fuente de verdad acordada con el negocio; si el motor
 * cambia y estos tests fallan, el motor está mal (no los tests).
 */

import { describe, expect, it } from "vitest";
import {
  baseLicencia,
  calcularComision,
  canceladoAntesDeBarrera,
  inicioVentana,
} from "../src/rules.js";
import { CLIENTES, COLABORADORES } from "./fixtures.js";

const CORTE_FUNDADORES = "2026-08-05";

describe("base de licencia por fecha de activación", () => {
  it("$67 antes de abril 2026", () => {
    expect(baseLicencia("2026-03-31")).toBe(67);
    expect(baseLicencia("2026-03-02")).toBe(67);
  });
  it("$69 desde abril 2026", () => {
    expect(baseLicencia("2026-04-01")).toBe(69);
    expect(baseLicencia("2026-05-11")).toBe(69);
  });
});

describe("ventana de elegibilidad", () => {
  it("fundador arranca en vigencia (2026-03-01)", () => {
    expect(inicioVentana(COLABORADORES.andres)).toBe("2026-03-01");
  });
  it("nuevo arranca en su fecha de ingreso", () => {
    expect(inicioVentana(COLABORADORES.alejandro)).toBe("2026-05-05");
  });
  it("admin no comisiona (sin ventana)", () => {
    expect(inicioVentana(COLABORADORES.mauro)).toBeNull();
  });
});

describe("barrera de 90 días", () => {
  it("Carolina Quijano (activa 2026-06-19, cancela 2026-08-01 = 43 días) cae por barrera", () => {
    const carolina = CLIENTES.find((c) => c.id === 56)!;
    expect(canceladoAntesDeBarrera(carolina)).toBe(true);
  });
  it("Vanessa Figueroa (cancela tras el mes 4) NO cae por barrera", () => {
    const vanessa = CLIENTES.find((c) => c.id === 44)!;
    expect(canceladoAntesDeBarrera(vanessa)).toBe(false);
  });
});

describe("Sección 6 — Fundadores (Andrés y Daniel), Trimestre 1, corte 2026-08-05", () => {
  const r = calcularComision(COLABORADORES.andres, CLIENTES, CORTE_FUNDADORES);

  it("total por colaborador = $122.40", () => {
    expect(r.total).toBe(122.4);
  });

  it("12 clientes elegibles (6 de marzo + 6 de abril)", () => {
    expect(r.lineas).toHaveLength(12);
    const marzo = r.lineas.filter((l) => l.fechaActivacion < "2026-04-01");
    const abril = r.lineas.filter((l) => l.fechaActivacion >= "2026-04-01");
    expect(marzo).toHaveLength(6);
    expect(abril).toHaveLength(6);
  });

  it("cada cliente de marzo paga $10.05 (5% × 3 × $67)", () => {
    const marzo = r.lineas.filter((l) => l.fechaActivacion < "2026-04-01");
    expect(marzo.every((l) => l.subtotal === 10.05)).toBe(true);
  });

  it("cada cliente de abril paga $10.35 (5% × 3 × $69)", () => {
    const abril = r.lineas.filter((l) => l.fechaActivacion >= "2026-04-01");
    expect(abril.every((l) => l.subtotal === 10.35)).toBe(true);
  });

  it("solo hito T1 alcanzado a este corte", () => {
    expect(r.lineas.every((l) => l.hitos.length === 1 && l.hitos[0]!.hito === "T1")).toBe(true);
  });

  it("Yolanda y Katherine (mayo) están pendientes: aún no alcanzan el mes 4", () => {
    const ids = r.lineas.map((l) => l.clienteId);
    expect(ids).not.toContain(53);
    expect(ids).not.toContain(54);
  });

  it("Constantino e Iris quedan en $0 (cancelaron antes de su hito)", () => {
    const ids = r.lineas.map((l) => l.clienteId);
    expect(ids).not.toContain(40);
    expect(ids).not.toContain(43);
  });

  it("Daniel Franco cobra idéntico e independiente ($122.40)", () => {
    const rd = calcularComision(COLABORADORES.daniel, CLIENTES, CORTE_FUNDADORES);
    expect(rd.total).toBe(122.4);
  });
});

describe("Sección 6 — Alejandro (nuevo), primer pago de inicios de septiembre", () => {
  it("pago el 2026-09-02: solo Yolanda + Katherine = $20.70 (Melida aún no)", () => {
    const r = calcularComision(COLABORADORES.alejandro, CLIENTES, "2026-09-02");
    expect(r.total).toBe(20.7);
    const ids = r.lineas.map((l) => l.clienteId).sort();
    expect(ids).toEqual([53, 54]);
  });

  it("pago el 2026-09-05: Yolanda + Katherine + Melida = $31.05", () => {
    const r = calcularComision(COLABORADORES.alejandro, CLIENTES, "2026-09-05");
    expect(r.total).toBe(31.05);
    const ids = r.lineas.map((l) => l.clienteId).sort();
    expect(ids).toEqual([53, 54, 55]);
  });

  it("Melida (mes 4 = 2026-09-03) NO cuenta si el pago es el 2026-09-02", () => {
    const r = calcularComision(COLABORADORES.alejandro, CLIENTES, "2026-09-02");
    expect(r.lineas.map((l) => l.clienteId)).not.toContain(55);
  });

  it("no comisiona clientes fuera de su ventana (activados antes del 2026-05-05)", () => {
    const r = calcularComision(COLABORADORES.alejandro, CLIENTES, "2026-09-05");
    // Ningún cliente de marzo/abril debe aparecer en la cartera de Alejandro.
    expect(r.lineas.every((l) => l.fechaActivacion >= "2026-05-05")).toBe(true);
  });

  it("Carolina Quijano nunca aparece (barrera de 90 días)", () => {
    const r = calcularComision(COLABORADORES.alejandro, CLIENTES, "2026-09-05");
    expect(r.lineas.map((l) => l.clienteId)).not.toContain(56);
  });
});

describe("Sección 6 — el admin (Mauro) no genera comisión", () => {
  it("total = 0, sin líneas", () => {
    const r = calcularComision(COLABORADORES.mauro, CLIENTES, CORTE_FUNDADORES);
    expect(r.total).toBe(0);
    expect(r.lineas).toHaveLength(0);
  });
});

describe("Cliente pausado/congelado no genera comisión", () => {
  const clientePausado = {
    id: 999,
    nombre: "Cliente Pausado",
    fechaActivacion: "2026-03-03", // alcanzaría T1 al corte si estuviera activo
    estadoActual: "pausado" as const,
    fechaCancelacion: null,
  };

  it("un cliente pausado queda excluido, aunque haya alcanzado su hito", () => {
    const r = calcularComision(COLABORADORES.andres, [clientePausado], CORTE_FUNDADORES);
    expect(r.total).toBe(0);
    expect(r.lineas).toHaveLength(0);
    expect(r.excluidos.some((e) => e.clienteId === 999 && /pausada/.test(e.motivo))).toBe(true);
  });

  it("el mismo cliente, activo, sí comisiona (control)", () => {
    const activo = { ...clientePausado, estadoActual: "activo" as const };
    const r = calcularComision(COLABORADORES.andres, [activo], CORTE_FUNDADORES);
    expect(r.total).toBe(10.05);
  });
});

describe("CHS como bloqueo opcional (no bloquea por defecto)", () => {
  it("con bloquearPorChs=true y todo 'pendiente', el total cae a 0", () => {
    const r = calcularComision(COLABORADORES.andres, CLIENTES, CORTE_FUNDADORES, {
      bloquearPorChs: true,
    });
    expect(r.total).toBe(0);
  });
  it("aprobando CHS de todos, vuelve a $122.40", () => {
    const r = calcularComision(COLABORADORES.andres, CLIENTES, CORTE_FUNDADORES, {
      bloquearPorChs: true,
      chs: () => "aprobado",
    });
    expect(r.total).toBe(122.4);
  });
});
