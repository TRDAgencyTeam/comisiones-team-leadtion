"use client";

import { useState } from "react";

export interface Fuente { etiqueta: string; valor: number }

const COLORS = ["#2e2a6e", "#6d5ac0", "#00c9b3", "#f0a54a", "#8fb0ff", "#c98bdb"];
const abbr = (n: number) => (n >= 1000 ? `$${(n / 1000).toFixed(1)}k` : `$${Math.round(n)}`);
const full = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/** Dona interactiva de ingresos por fuente. Hover resalta la porción y su valor. */
export function DonutChart({ fuentes, total }: { fuentes: Fuente[]; total: number }) {
  const [hover, setHover] = useState<number | null>(null);
  const top = [...fuentes].sort((a, b) => b.valor - a.valor).slice(0, 6);
  const C = 2 * Math.PI * 46;
  let offset = 0;
  const arcs = top.map((f, i) => {
    const len = total > 0 ? (f.valor / total) * C : 0;
    const el = { len, offset, color: COLORS[i % COLORS.length]!, ...f };
    offset -= len;
    return el;
  });

  const centro = hover != null ? top[hover] : null;
  const pct = centro && total > 0 ? Math.round((centro.valor / total) * 100) : null;

  return (
    <div className="cf-donut">
      <svg viewBox="0 0 120 120" width="132" height="132" role="img" aria-label="Ingresos por fuente">
        <circle cx="60" cy="60" r="46" fill="none" stroke="var(--border)" strokeWidth="15" />
        {arcs.map((a, i) => (
          <circle key={i} cx="60" cy="60" r="46" fill="none" stroke={a.color}
            strokeWidth={hover === i ? 19 : 15}
            strokeDasharray={`${a.len.toFixed(1)} ${(C - a.len).toFixed(1)}`} strokeDashoffset={a.offset.toFixed(1)}
            transform="rotate(-90 60 60)" strokeLinecap="butt" opacity={hover == null || hover === i ? 1 : 0.35}
            style={{ cursor: "pointer", transition: "stroke-width .12s, opacity .12s" }}
            onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
        ))}
        <text x="60" y="56" textAnchor="middle" fontWeight="700" fontSize="14" fill="var(--text)">{centro ? abbr(centro.valor) : abbr(total)}</text>
        <text x="60" y="70" textAnchor="middle" fontSize="7.5" fill="var(--muted)">{pct != null ? `${pct}%` : "total"}</text>
      </svg>
      <div className="cf-donut-legend">
        {top.map((f, i) => (
          <div key={i} className="row" onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}
            style={{ cursor: "default", fontWeight: hover === i ? 700 : 400 }}>
            <span><i style={{ display: "inline-block", width: 9, height: 9, borderRadius: 3, marginRight: 6, background: COLORS[i % COLORS.length] }} />{f.etiqueta}</span>
            <b>{full(f.valor)}</b>
          </div>
        ))}
      </div>
    </div>
  );
}
