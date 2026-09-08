"use client";

import { useState } from "react";
import { MovimientoModal } from "@/components/MovimientoModal";
import { eliminarEgreso } from "@/app/trd/clientes/acciones";

export interface FilaCosto {
  id: number;
  concepto: string;
  marca: string | null;
  valorUsd: number;
  valorCop: number | null;
  automatico: boolean;
}

/**
 * Grupo de costos (nómina / herramientas) con switch COP↔USD y desglose visible
 * hora/día/mes (nómina) o día/mes/año (herramientas), con total de todos.
 * Cada línea se puede editar o quitar; y se puede agregar una nueva al grupo.
 */
export function GrupoCostos({
  titulo, ic, filas, tasa, modo, mes, grupoAdd,
}: { titulo: string; ic: string; filas: FilaCosto[]; tasa: number; modo: "nomina" | "tool"; mes: string; grupoAdd: string }) {
  const [moneda, setMoneda] = useState<"USD" | "COP">("USD");

  const fmt = (usdVal: number) => {
    const v = moneda === "USD" ? usdVal : usdVal * tasa;
    return new Intl.NumberFormat("es-CO", { style: "currency", currency: moneda, maximumFractionDigits: moneda === "COP" ? 0 : 2 }).format(v);
  };
  const totalMes = filas.reduce((s, f) => s + f.valorUsd, 0);
  const cols = modo === "nomina" ? 3 : 3;

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
          <MovimientoModal mes={mes} tipo="egreso" grupoInicial={grupoAdd} compact label={modo === "nomina" ? "+ persona" : "+ herramienta"} />
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
              <th className="r cf-acc-col"></th>
            </tr>
          </thead>
          <tbody>
            {filas.length === 0 && (
              <tr><td className="nom" colSpan={cols + 2} style={{ color: "var(--faint)" }}>Sin líneas este mes. Usa “{modo === "nomina" ? "+ persona" : "+ herramienta"}”.</td></tr>
            )}
            {filas.map((f) => {
              const mesV = f.valorUsd, dia = mesV / 30, hora = dia / 8, anio = mesV * 12;
              return (
                <tr key={f.id}>
                  <td className="nom">{f.concepto}{f.marca ? <small>{f.marca}</small> : null}</td>
                  {modo === "nomina"
                    ? <><td className="r">{fmt(hora)}</td><td className="r">{fmt(dia)}</td><td className="r cf-mono">{fmt(mesV)}</td></>
                    : <><td className="r">{fmt(dia)}</td><td className="r cf-mono">{fmt(mesV)}</td><td className="r">{fmt(anio)}</td></>}
                  <td className="r cf-acc">
                    {f.automatico
                      ? <span className="cf-hint" title="Automático">🔒</span>
                      : <span className="cf-acc-btns">
                          <MovimientoModal mes={mes} tipo="egreso" editarEgresoData={{ id: f.id, concepto: f.concepto, marca: f.marca, valorUsd: f.valorUsd, valorCop: f.valorCop }} />
                          <form action={eliminarEgreso}><input type="hidden" name="id" value={f.id} /><button type="submit" className="btn-borrar" title="Eliminar">🗑️</button></form>
                        </span>}
                  </td>
                </tr>
              );
            })}
            {filas.length > 0 && (
              <tr className="cf-costos-total">
                <td className="nom">Total ({filas.length})</td>
                {modo === "nomina"
                  ? <><td className="r">{fmt(totalMes / 30 / 8)}</td><td className="r">{fmt(totalMes / 30)}</td><td className="r cf-mono">{fmt(totalMes)}</td></>
                  : <><td className="r">{fmt(totalMes / 30)}</td><td className="r cf-mono">{fmt(totalMes)}</td><td className="r">{fmt(totalMes * 12)}</td></>}
                <td className="r cf-acc"></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
