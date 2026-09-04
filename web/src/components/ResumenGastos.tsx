"use client";

import { useState } from "react";

export interface GrupoGasto { label: string; total: number; count: number; unidad: string }

/** Card de gastos por categoría del Resumen, con switch COP↔USD. */
export function ResumenGastos({
  grupos, totalAfectan, totalCaja, egresosTotales, tasa,
}: { grupos: GrupoGasto[]; totalAfectan: number; totalCaja: number; egresosTotales: number; tasa: number }) {
  const [moneda, setMoneda] = useState<"USD" | "COP">("USD");
  const fmt = (usd: number) => {
    const v = moneda === "USD" ? usd : usd * tasa;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: moneda, maximumFractionDigits: moneda === "COP" ? 0 : 2 }).format(v);
  };
  const conCount = (l: string) => l === "Nómina" || l === "Herramientas & Hosting";

  return (
    <div className="cf-card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
        <h3 style={{ margin: 0 }}>Gastos por categoría <span className="cf-legend">(afectan la utilidad)</span></h3>
        <span className="cf-money-switch">
          <button type="button" className={moneda === "USD" ? "on" : ""} onClick={() => setMoneda("USD")}>USD</button>
          <button type="button" className={moneda === "COP" ? "on" : ""} onClick={() => setMoneda("COP")}>COP</button>
        </span>
      </div>
      {grupos.map((g) => (
        <div key={g.label} className="cf-li">
          <span>{g.label}{conCount(g.label) ? <small style={{ color: "var(--faint)" }}> · {g.count} {g.unidad}</small> : null}</span>
          <b>{fmt(g.total)}</b>
        </div>
      ))}
      {grupos.length === 0 && <div className="cf-li"><span>Sin gastos registrados</span><b>—</b></div>}
      <div className="cf-li tot"><span>Total que afecta utilidad</span><b>{fmt(totalAfectan)}</b></div>
      <div className="cf-li"><span>+ Sale de caja (inversiones, diezmo)</span><b>{fmt(totalCaja)}</b></div>
      <div className="cf-li tot"><span>Egresos totales del mes</span><b>{fmt(egresosTotales)}</b></div>
    </div>
  );
}
