/**
 * Gráfico de barras simple en SVG inline (sin dependencias). Server-renderable.
 * Usa variables de tema para verse bien en claro y oscuro.
 */

export interface BarDatum {
  label: string;
  value: number;
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

  const max = Math.max(...data.map((d) => d.value), 1);
  const bw = 58; // ancho por barra
  const gap = 14;
  const chartH = 170;
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
          const h = Math.round((d.value / max) * chartH);
          const x = gap + i * (bw + gap);
          const y = topPad + (chartH - h);
          return (
            <g key={d.label}>
              <rect x={x} y={y} width={bw} height={h} rx={6} fill="var(--accent)" />
              <text
                x={x + bw / 2}
                y={y - 6}
                textAnchor="middle"
                fontSize="12"
                fontWeight="700"
                fill="var(--text)"
              >
                {formatValue(d.value)}
              </text>
              <text
                x={x + bw / 2}
                y={H - 12}
                textAnchor="middle"
                fontSize="11"
                fill="var(--muted)"
              >
                {d.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
