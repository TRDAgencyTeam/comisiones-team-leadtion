"use client";

import { useState } from "react";

export interface FilaCosto { concepto: string; marca: string | null; valorUsd: number; valorCop: number | null }

/**
 * Grupo de costos (nómina / herramientas) con switch COP↔USD y desglose visible
 * hora/día/mes (nómina) o día/mes/año (herramientas), con total de todos.
 */
export function GrupoCostos({
  titulo, ic, filas, tasa, modo,
}: { titulo: string; ic: string; filas: FilaCosto[]; tasa: number; modo: "nomina" | "tool" }) {
  const [moneda, setMoneda] = useState<"USD" | "COP">("USD");
  if (filas.length === 0) return null;

  const fmt = (usdVal: number) => {
    const v = moneda === "USD" ? usdVal : usdVal * tasa;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: moneda, maximumFractionDigits: moneda === "COP" ? 0 : 2 }).format(v);
  };
  const totalMes = filas.reduce((s, f) => s + f.valorUsd, 0);

  return (
    <div className="cf-egrupo">
      <div className="cf-egrupo-h">
        <span className="cf-egrupo-t"><span className="cf-egrupo-ic">{ic}</span><b>{titulo}</b><span className="count">({filas.length})</span></span>
        <span className="cf-egrupo-r">
          <span className="cf-auto">auto mensual</span>
          <span className="cf-money-switch">
            <button type="button" className={moneda === "USD" ? "on" : ""} onClick={() => setMoneda("USD")}>USD</button>
            <button type="button" className={moneda === "COP" ? "on" : ""} onClick={() => setMoneda("COP")}>COP</button>
          </span>
          <b className="cf-mono">{fmt(totalMes)}</b>
        </span>
      </div>
      <div className="cf-tbl-scroll">
        <table className="cf-costos">
          <thead>
            <tr>
              <th>{modo === "nomina" ? "Persona" : "Herramienta"}</th>
              {modo === "nomina" ? <><th className="r">Hora</th><th className="r">Día</th><th className="r">Mes</th></>
                                 : <><th className="r">Día</th><th className="r">Mes</th><th className="r">Año</th></>}
            </tr>
          </thead>
          <tbody>
            {filas.map((f, i) => {
              const mes = f.valorUsd, dia = mes / 30, hora = dia / 8, anio = mes * 12;
              return (
                <tr key={i}>
                  <td className="nom">{f.concepto}{f.marca ? <small>{f.marca}</small> : null}</td>
                  {modo === "nomina"
                    ? <><td className="r">{fmt(hora)}</td><td className="r">{fmt(dia)}</td><td className="r cf-mono">{fmt(mes)}</td></>
                    : <><td className="r">{fmt(dia)}</td><td className="r cf-mono">{fmt(mes)}</td><td className="r">{fmt(anio)}</td></>}
                </tr>
              );
            })}
            <tr className="cf-costos-total">
              <td className="nom">Total ({filas.length})</td>
              {modo === "nomina"
                ? <><td className="r">{fmt(totalMes / 30 / 8)}</td><td className="r">{fmt(totalMes / 30)}</td><td className="r cf-mono">{fmt(totalMes)}</td></>
                : <><td className="r">{fmt(totalMes / 30)}</td><td className="r cf-mono">{fmt(totalMes)}</td><td className="r">{fmt(totalMes * 12)}</td></>}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
