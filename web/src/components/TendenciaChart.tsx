"use client";

import { useState } from "react";

export interface PuntoTendencia { mes: string; ingresos: number; neta: number }

const NOMBRE_MES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const etiquetaMes = (iso: string) => { const [a, m] = iso.split("-").map(Number); return `${NOMBRE_MES[(m! - 1) % 12]} ${String(a).slice(2)}`; };
const abbr = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`);
const full = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/** Línea de tendencia interactiva: hover muestra el valor y el delta vs. mes anterior. */
export function TendenciaChart({
  datos, color = "#6d5ac0", secundarioLabel = "neta",
}: { datos: PuntoTendencia[]; color?: string; secundarioLabel?: string }) {
  const [hover, setHover] = useState<number | null>(null);
  const conDatos = datos.filter((d) => d.ingresos > 0);
  if (conDatos.length < 2) {
    return <p className="cf-nota" style={{ marginTop: 4 }}>La tendencia se dibuja con 2+ meses con datos.</p>;
  }

  const w = 640, h = 200, padX = 16, padTop = 22, padBot = 26;
  const vals = datos.map((d) => d.ingresos);
  const max = Math.max(...vals) * 1.12;
  const min = Math.min(...vals.filter((v) => v > 0)) * 0.8;
  const x = (i: number) => padX + i * (w - padX * 2) / (datos.length - 1);
  const y = (v: number) => h - padBot - ((v - min) / (max - min || 1)) * (h - padTop - padBot);
  const pts = datos.map((d, i) => [x(i), y(d.ingresos)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");

  const hp = hover != null ? datos[hover] : null;
  const prev = hover != null && hover > 0 ? datos[hover - 1] : null;
  const deltaPct = hp && prev && prev.ingresos > 0 ? Math.round(((hp.ingresos - prev.ingresos) / prev.ingresos) * 100) : null;

  return (
    <div style={{ position: "relative" }}>
      <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Tendencia de ingresos"
        onMouseLeave={() => setHover(null)}
        onMouseMove={(e) => {
          const r = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
          const px = ((e.clientX - r.left) / r.width) * w;
          let best = 0, bd = Infinity;
          pts.forEach((p, i) => { const d = Math.abs(p[0] - px); if (d < bd) { bd = d; best = i; } });
          setHover(best);
        }}>
        <defs><linearGradient id="cfgrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={color} stopOpacity="0.28" /><stop offset="1" stopColor={color} stopOpacity="0" /></linearGradient></defs>
        <path d={`${line} L${w - padX} ${h - padBot} L${padX} ${h - padBot} Z`} fill="url(#cfgrad)" />
        <path d={line} fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        {hover != null && <line x1={pts[hover]![0]} y1={padTop - 6} x2={pts[hover]![0]} y2={h - padBot} stroke="var(--border)" strokeWidth="1" strokeDasharray="3 3" />}
        {pts.map((p, i) => (
          <circle key={i} cx={p[0]} cy={p[1]} r={hover === i ? 5.5 : 3} fill={color} stroke="var(--panel)" strokeWidth="2"
            style={{ cursor: "pointer" }} onMouseEnter={() => setHover(i)} />
        ))}
        {datos.map((d, i) => (
          <text key={i} x={pts[i]![0]} y={h - 8} textAnchor="middle" fontSize="9" fill="var(--muted)">{etiquetaMes(d.mes)}</text>
        ))}
      </svg>
      {hp && (
        <div style={{
          position: "absolute", left: `${(pts[hover!]![0] / w) * 100}%`, top: 0, transform: "translateX(-50%)",
          background: "var(--text)", color: "var(--panel)", padding: "6px 10px", borderRadius: 8, fontSize: "0.72rem",
          fontWeight: 600, whiteSpace: "nowrap", pointerEvents: "none", boxShadow: "0 4px 14px rgba(0,0,0,.25)",
        }}>
          {etiquetaMes(hp.mes)}: {full(hp.ingresos)}
          {deltaPct != null && <span style={{ color: deltaPct >= 0 ? "#5bd6a8" : "#f0a", marginLeft: 6 }}>{deltaPct >= 0 ? "▲" : "▼"}{Math.abs(deltaPct)}%</span>}
          <span style={{ opacity: 0.7, marginLeft: 6 }}>· {secundarioLabel} {abbr(hp.neta)}</span>
        </div>
      )}
    </div>
  );
}
