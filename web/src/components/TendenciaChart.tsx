"use client";

import { useState } from "react";

export interface PuntoTendencia { mes: string; ingresos: number; neta: number; egresos?: number }

const NOMBRE_MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const etiquetaMes = (iso: string) => { const [a, m] = iso.split("-").map(Number); return `${NOMBRE_MES[(m! - 1) % 12]} ${String(a).slice(2)}`; };
const abbr = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`);
const full = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

const ROJO = "#e0554e";

/** Línea de tendencia interactiva. Si los datos traen `egresos`, dibuja una 2ª
 *  línea roja (egresos) para comparar contra la de ingresos. */
export function TendenciaChart({
  datos, color = "#6d5ac0", secundarioLabel = "neta",
}: { datos: PuntoTendencia[]; color?: string; secundarioLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const conDatos = datos.filter((d) => d.ingresos > 0);
  if (conDatos.length < 2) {
    return <p className="cf-nota" style={{ marginTop: 4 }}>La tendencia se dibuja con 2+ meses con datos.</p>;
  }
  const hayEgresos = datos.some((d) => (d.egresos ?? 0) > 0);

  const w = 640, h = 200, padX = 16, padTop = 22, padBot = 26;
  const todos = [...datos.map((d) => d.ingresos), ...(hayEgresos ? datos.map((d) => d.egresos ?? 0) : [])];
  const max = Math.max(...todos) * 1.12;
  const min = Math.min(...todos.filter((v) => v > 0)) * 0.8;
  const x = (i: number) => padX + i * (w - padX * 2) / (datos.length - 1);
  const y = (v: number) => h - padBot - ((v - min) / (max - min || 1)) * (h - padTop - padBot);
  const linea = (get: (d: PuntoTendencia) => number) => datos.map((d, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(get(d)).toFixed(1)}`).join(" ");
  const ptsIng = datos.map((d, i) => [x(i), y(d.ingresos)] as const);
  const lineIng = linea((d) => d.ingresos);
  const lineEgr = hayEgresos ? linea((d) => d.egresos ?? 0) : "";

  const hp = hover != null ? datos[hover] : null;
  const prev = hover != null && hover > 0 ? datos[hover - 1] : null;
  const deltaPct = hp && prev && prev.ingresos > 0 ? Math.round(((hp.ingresos - prev.ingresos) / prev.ingresos) * 100) : null;

  return (
    <div style={{ position: "relative" }}>
      {hayEgresos && (
        <div style={{ display: "flex", gap: 14, fontSize: "0.72rem", color: "var(--muted)", marginBottom: 4 }}>
          <span><i style={{ display: "inline-block", width: 10, height: 3, borderRadius: 2, background: color, verticalAlign: "middle", marginRight: 5 }} />Ingresos</span>
          <span><i style={{ display: "inline-block", width: 10, height: 3, borderRadius: 2, background: ROJO, verticalAlign: "middle", marginRight: 5 }} />Egresos</span>
        </div>
      )}
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Tendencia de ingresos y egresos"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * w;
          let best = 0, bd = Infinity;
          ptsIng.forEach((p, i) => { const d = Math.abs(p[0] - px); if (d < bd) { bd = d; best = i; } });
          setHover(best);
        }}>
        <defs><linearGradient id="cfgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.24" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={`${lineIng} L${w - padX} ${h - padBot} L${padX} ${h - padBot} Z`} fill="url(#cfgrad)" />
        <path d={lineIng} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {hayEgresos && <path d={lineEgr} fill="none" stroke={ROJO} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="1 0" opacity="0.9" />}
        {hover != null && <line x1={ptsIng[hover]![0]} y1={padTop - 6} x2={ptsIng[hover]![0]} y2={h - padBot} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />}
        {ptsIng.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 5.5 : 3} fill={color} stroke="var(--panel)" strokeWidth="2" style={{ cursor: "pointer" }} onMouseEnter={() => setHover(i)} />
        ))}
        {hayEgresos && datos.map((d, i) => (d.egresos ?? 0) > 0 ? <circle key={`e${i}`} cx={x(i)} cy={y(d.egresos ?? 0)} r={hover === i ? 5 : 2.5} fill={ROJO} stroke="var(--panel)" strokeWidth="2" /> : null)}
        {datos.map((d, i) => (
          <text key={i} x={ptsIng[i]![0]} y={h - 8} textAnchor="middle" fontSize="9" fill="var(--muted)">{etiquetaMes(d.mes)}</text>
        ))}
      </svg>
      {hp && (
        <div style={{
          position: "absolute", left: `${(ptsIng[hover!]![0] / w) * 100}%`, top: hayEgresos ? 18 : 0, transform: "translateX(-50%)",
          background: "var(--text)", color: "var(--panel)", padding: "6px 10px", borderRadius: 8, fontSize: "0.72rem",
          fontWeight: 600, whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 4px 14px rgba(0,0,0,.25)",
        }}>
          {etiquetaMes(hp.mes)}: {full(hp.ingresos)}
          {deltaPct != null && <span style={{ color: deltaPct >= 0 ? "#5bd6a8" : "#f2a", marginLeft: 6 }}>{deltaPct >= 0 ? "▲" : "▼"}{Math.abs(deltaPct)}%</span>}
          {hayEgresos
            ? <span style={{ opacity: 0.85, marginLeft: 6, color: "#ffb4ae" }}>· egresos {abbr(hp.egresos ?? 0)}</span>
            : <span style={{ opacity: 0.7, marginLeft: 6 }}>· {secundarioLabel} {abbr(hp.neta)}</span>}
        </div>
      )}
    </div>
  );
}
