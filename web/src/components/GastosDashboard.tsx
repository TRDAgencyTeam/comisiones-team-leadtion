"use client";

import { useState } from "react";

interface Serie { label: string; cop: number }
interface Snap { mes: string; totalCop: number; totalUsd: number }

const PALETA = ["#2e2a6e", "#1e5080", "#0f9d6b", "#b45309", "#6d5ac0", "#c0504f", "#00a0a0"];

export function GastosDashboard({
  categorias, departamentos, snapshots, tasa,
}: {
  categorias: Serie[];
  departamentos: Serie[];
  snapshots: Snap[];
  tasa: number;
}) {
  const [usd, setUsd] = useState(false);

  const conv = (cop: number) => (usd && tasa > 0 ? cop / tasa : cop);
  const fmt = (cop: number) =>
    new Intl.NumberFormat("es-CO", {
      style: "currency", currency: usd ? "USD" : "COP", maximumFractionDigits: usd ? 0 : 0,
    }).format(conv(cop));

  function Barras({ datos }: { datos: Serie[] }) {
    const max = Math.max(1, ...datos.map((d) => d.cop));
    const total = datos.reduce((s, d) => s + d.cop, 0) || 1;
    return (
      <div className="barras">
        {datos.map((d, i) => (
          <div className="barra-row" key={d.label} title={`${d.label}: ${fmt(d.cop)} (${Math.round((d.cop / total) * 100)}%)`}>
            <span className="barra-lbl">{d.label}</span>
            <span className="barra-track">
              <span className="barra-fill" style={{ width: `${(d.cop / max) * 100}%`, background: PALETA[i % PALETA.length] }} />
            </span>
            <span className="barra-val">{fmt(d.cop)}</span>
            <span className="barra-pct">{Math.round((d.cop / total) * 100)}%</span>
          </div>
        ))}
      </div>
    );
  }

  const histMax = Math.max(1, ...snapshots.map((s) => s.totalCop));
  const nombreMes = (iso: string) => {
    const [a, m] = iso.split("-").map(Number);
    return new Date(a!, m! - 1, 1).toLocaleDateString("es-CO", { month: "short", year: "2-digit" });
  };

  return (
    <div className="gf-dash">
      <div className="gf-toggle">
        <button className={!usd ? "on" : ""} onClick={() => setUsd(false)}>COP</button>
        <button className={usd ? "on" : ""} onClick={() => setUsd(true)}>USD</button>
      </div>

      <div className="gf-charts">
        <div className="gf-card">
          <h3>Gastos por categoría</h3>
          <Barras datos={categorias} />
        </div>
        <div className="gf-card">
          <h3>Nómina por departamento</h3>
          <Barras datos={departamentos} />
        </div>
      </div>

      <div className="gf-card">
        <h3>Histórico de gastos fijos por mes</h3>
        {snapshots.length === 0 ? (
          <p className="muted">Aún no hay meses guardados. Usa “Guardar mes actual” para empezar el histórico.</p>
        ) : (
          <div className="hist">
            {[...snapshots].reverse().map((s) => (
              <div className="hist-col" key={s.mes} title={`${s.mes}: ${fmt(s.totalCop)}`}>
                <span className="hist-bar" style={{ height: `${Math.max(4, (s.totalCop / histMax) * 130)}px` }} />
                <span className="hist-val">{usd ? `$${Math.round(s.totalUsd / 1000)}k` : `$${Math.round(s.totalCop / 1_000_000)}M`}</span>
                <span className="hist-mes">{nombreMes(s.mes)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
