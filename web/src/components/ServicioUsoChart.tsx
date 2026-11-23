import type { UsoMes } from "@/lib/servicios-catalogo";

const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const etiquetaMes = (m: string) => { const [, mm] = m.split("-").map(Number); return MESES[(mm ?? 1) - 1]; };
const usd = (n: number) => `$${Math.round(n).toLocaleString("es-CO")}`;

/** Una barra por mes, altura proporcional al máximo. Verde = accent, gris = 0. */
function Barras({ titulo, meses, valor, fmt, color }: {
  titulo: string; meses: UsoMes[]; valor: (u: UsoMes) => number; fmt: (n: number) => string; color?: string;
}) {
  const max = Math.max(1, ...meses.map(valor));
  return (
    <div className="svc-chart">
      <h3>{titulo}</h3>
      <div className="svc-bars">
        {meses.map((u) => {
          const v = valor(u);
          const h = Math.round((v / max) * 100);
          return (
            <div key={u.mes} className={`svc-bar${v === 0 ? " cero" : ""}`} title={`${etiquetaMes(u.mes)}: ${fmt(v)}`}>
              <span className="bv">{v === 0 ? "" : fmt(v)}</span>
              <span className="bar" style={{ height: `${Math.max(v === 0 ? 0 : 4, h)}%`, ...(color ? { background: color } : {}) }} />
              <span className="bm">{etiquetaMes(u.mes)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Dos mini gráficos de uso por mes: facturas e ingreso neto aprox. */
export function ServicioUsoChart({ meses }: { meses: UsoMes[] }) {
  if (meses.length === 0) return <p className="reg-nota">Sin facturas en los últimos meses para graficar.</p>;
  return (
    <div className="svc-charts">
      <Barras titulo="Facturas por mes" meses={meses} valor={(u) => u.facturas} fmt={(n) => String(n)} />
      <Barras titulo="Ingreso neto aprox / mes (USD)" meses={meses} valor={(u) => u.ingresoUsd} fmt={usd} color="var(--paid)" />
    </div>
  );
}
