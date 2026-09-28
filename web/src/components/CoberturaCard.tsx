import type { CoberturaResumen } from "@/lib/cobertura";

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);

/** ¿La base fija (ingresos recurrentes) sostiene cada negocio? Escala 0–150%, marca a 100%. */
export function CoberturaCard({ cobertura }: { cobertura: CoberturaResumen }) {
  const filas = [
    { k: "ag", label: "Agencia", sub: "clientes recurrentes ÷ fijos de la agencia", c: "#4d47c2", d: cobertura.agencia },
    { k: "lt", label: "Leadtion", sub: "recurrente Leadtion ÷ costos de Leadtion", c: "#6d5ac0", d: cobertura.leadtion },
    { k: "emp", label: "Toda la empresa", sub: "todo lo recurrente ÷ todos los costos fijos", c: "#079c8b", d: cobertura.empresa },
  ];
  const ancho = (pct: number) => `${Math.min(100, (Math.min(pct, 150) / 150) * 100)}%`;

  return (
    <div className="cf-card cov-card">
      <h3 style={{ margin: 0 }}>¿La base fija sostiene la agencia?</h3>
      <p className="cf-legend" style={{ margin: "2px 0 14px" }}>Cada negocio se mide contra sus propios costos fijos. La nómina se reparte por % de dedicación.</p>

      <div className="cov-meters">
        {filas.map((f) => {
          const cubre = f.d.pct >= 100;
          return (
            <div key={f.k} className="cov-meter">
              <div className="cov-h">
                <span className="cov-n">{f.label}<small>{f.sub}</small></span>
                <span className="cov-pct" style={{ color: f.c }}>{f.d.pct}%</span>
              </div>
              <div className="cov-track">
                <div className="cov-fill" style={{ width: ancho(f.d.pct), background: f.c }} />
                <div className="cov-mark" />
              </div>
              <div className="cov-f">
                <span className={`cov-chip ${cubre ? "good" : "warn"}`}>
                  {cubre ? `✓ Cubre · sobran ${usd(f.d.sobra)}` : `⚠ Falta ${usd(Math.abs(f.d.sobra))}`}
                </span>
                <span className="cov-io">{usd(f.d.ingreso)} ÷ {usd(f.d.costo)}</span>
              </div>
            </div>
          );
        })}
        <div className="cov-scale" aria-hidden="true">
          <span style={{ left: 0 }}>0%</span><span style={{ left: "33.33%" }}>50%</span>
          <span style={{ left: "66.67%" }}><b>100%</b></span><span style={{ left: "100%", transform: "translateX(-100%)" }}>150%</span>
        </div>
      </div>

      <details className="cov-det">
        <summary>Ver de dónde sale cada número</summary>
        <div className="cov-units">
          <div className="cov-u">
            <h4><span className="rec-sw" style={{ background: "#4d47c2" }} /> Costos Agencia</h4>
            <div className="cf-li"><span>Nómina agencia</span><b>{usd(cobertura.detalle.nomAgencia)}</b></div>
            <div className="cf-li"><span>Operativos fijos</span><b>{usd(cobertura.detalle.operativos)}</b></div>
            <div className="cf-li"><span>Herramientas agencia</span><b>{usd(cobertura.detalle.toolsAgencia)}</b></div>
            <div className="cf-li tot"><span>Total</span><b>{usd(cobertura.agencia.costo)}</b></div>
          </div>
          <div className="cov-u">
            <h4><span className="rec-sw" style={{ background: "#6d5ac0" }} /> Costos Leadtion</h4>
            <div className="cf-li"><span>Nómina Leadtion</span><b>{usd(cobertura.detalle.nomLeadtion)}</b></div>
            <div className="cf-li"><span>Herramientas Leadtion (GHL…)</span><b>{usd(cobertura.detalle.toolsLeadtion)}</b></div>
            <div className="cf-li"><span>Operación Leadtion</span><b>{usd(cobertura.detalle.operacionLeadtion)}</b></div>
            <div className="cf-li tot"><span>Total</span><b>{usd(cobertura.leadtion.costo)}</b></div>
          </div>
        </div>
        <p className="cf-legend" style={{ marginTop: 8 }}>La nómina se reparte con el “% a Leadtion” de cada persona (Nómina) y las herramientas por su “negocio” (Herramientas).</p>
      </details>
    </div>
  );
}
