"use client";

import { useState } from "react";

interface Serie { label: string; usd: number }

const PALETA = ["#2e2a6e", "#1e5080", "#0f9d6b", "#b45309", "#6d5ac0", "#c0504f", "#00a0a0"];

/** Tarjetas visuales del mes en Egresos: gastos por categoría y nómina por
 *  departamento, con switch COP↔USD. Se alimentan del mes que se está viendo. */
export function EgresosCards({
  categorias, departamentos, tasa,
}: { categorias: Serie[]; departamentos: Serie[]; tasa: number }) {
  const [usd, setUsd] = useState(true);
  const fmt = (u: number) =>
    new Intl.NumberFormat("es-CO", { style: "currency", currency: usd ? "USD" : "COP", maximumFractionDigits: 0 }).format(usd ? u : u * tasa);

  function Barras({ datos }: { datos: Serie[] }) {
    if (datos.length === 0) return <p className="cf-nota" style={{ margin: 0 }}>Sin datos este mes.</p>;
    const max = Math.max(1, ...datos.map((d) => d.usd));
    const total = datos.reduce((s, d) => s + d.usd, 0) || 1;
    return (
      <div className="barras">
        {datos.map((d, i) => (
          <div className="barra-row" key={d.label} title={`${d.label}: ${fmt(d.usd)} (${Math.round((d.usd / total) * 100)}%)`}>
            <span className="barra-lbl">{d.label}</span>
            <span className="barra-track"><span className="barra-fill" style={{ width: `${(d.usd / max) * 100}%`, background: PALETA[i % PALETA.length] }} /></span>
            <span className="barra-val">{fmt(d.usd)}</span>
            <span className="barra-pct">{Math.round((d.usd / total) * 100)}%</span>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ marginTop: 14 }}>
      <div className="cf-sec-head">
        <h2>Distribución del mes</h2>
        <span className="cf-money-switch">
          <button type="button" className={usd ? "on" : ""} onClick={() => setUsd(true)}>USD</button>
          <button type="button" className={!usd ? "on" : ""} onClick={() => setUsd(false)}>COP</button>
        </span>
      </div>
      <div className="gf-charts">
        <div className="gf-card"><h3>Gastos por categoría</h3><Barras datos={categorias} /></div>
        <div className="gf-card"><h3>Nómina por departamento</h3><Barras datos={departamentos} /></div>
      </div>
    </div>
  );
}
