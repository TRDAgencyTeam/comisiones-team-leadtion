/**
 * Gráfico de barras (apilables) en SVG inline, sin dependencias. Server-render.
 * Cada barra tiene 1+ segmentos (para desgloses tipo licencia + servicio).
 */

export interface BarPart {
  value: number;
  /** Color CSS (ej. "var(--accent)"). */
  color: string;
}

export interface BarDatum {
  label: string;
  parts: BarPart[];
}

export function BarChart({
  data,
  formatValue = (n) => String(n),
  ariaLabel = "Gráfico de barras",
}: {
  data: BarDatum[];
  formatValue?: (n: number) => string;
  ariaLabel?: string;
}) {
  if (data.length === 0) return <p className="empty">Sin datos para graficar.</p>;

  const totales = data.map((d) => d.parts.reduce((s, p) => s + p.value, 0));
  const max = Math.max(...totales, 1);
  const bw = 56;
  const gap = 16;
  const chartH = 168;
  const topPad = 22;
  const botPad = 34;
  const W = data.length * (bw + gap) + gap;
  const H = chartH + topPad + botPad;

  return (
    <div className="table-scroll">
      <svg
        viewBox={`0 0 ${W} ${H}`}
        width="100%"
        height={H}
        role="img"
        aria-label={ariaLabel}
        style={{ minWidth: W, maxWidth: "100%" }}
      >
        {data.map((d, i) => {
          const total = totales[i]!;
          const x = gap + i * (bw + gap);
          let yCursor = topPad + chartH; // desde la base hacia arriba
          const segs = d.parts.map((p, j) => {
            const h = Math.round((p.value / max) * chartH);
            yCursor -= h;
            return <rect key={j} x={x} y={yCursor} width={bw} height={h} fill={p.color} />;
          });
          const yTop = topPad + (chartH - Math.round((total / max) * chartH));
          return (
            <g key={d.label}>
              {segs}
              <text x={x + bw / 2} y={yTop - 6} textAnchor="middle" fontSize="12" fontWeight="700" fill="var(--text)">
                {formatValue(total)}
              </text>
              <text x={x + bw / 2} y={H - 12} textAnchor="middle" fontSize="11" fill="var(--muted)">
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
