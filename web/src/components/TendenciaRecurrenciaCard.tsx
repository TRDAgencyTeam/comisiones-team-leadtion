const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const etiqueta = (mes: string) => { const [, m] = mes.split("-").map(Number); return MESES[(m ?? 1) - 1] ?? mes; };

/**
 * Tendencia de recurrencia: columnas apiladas (base fija vs. del momento) de los
 * últimos meses. Muestra si la base recurrente crece y qué peso tienen los
 * ingresos puntuales mes a mes. Datos reales de factura_mensual.recurrente.
 */
export function TendenciaRecurrenciaCard({ datos }: { datos: { mes: string; fija: number; momento: number }[] }) {
  const max = Math.max(1, ...datos.map((d) => d.fija + d.momento));
  const conDato = datos.filter((d) => d.fija + d.momento > 0);
  const promFija = conDato.length ? conDato.reduce((s, d) => s + d.fija, 0) / conDato.length : 0;

  return (
    <div className="cf-card rec-card">
      <div className="rec-head">
        <h3 style={{ margin: 0 }}>Tendencia de recurrencia</h3>
        <span className="rec-pred">Base fija prom. <b>{usd(promFija)}/mes</b></span>
      </div>
      <p className="cf-legend" style={{ margin: "2px 0 14px" }}>Cada columna es la facturación neta del mes; la parte oscura es lo que se repite (recurrente) y la clara lo puntual.</p>

      <div className="trec-chart">
        {datos.map((d) => {
          const tot = d.fija + d.momento;
          const hF = (d.fija / max) * 100;
          const hM = (d.momento / max) * 100;
          return (
            <div key={d.mes} className="trec-col">
              <div className="trec-bars" title={`Fija ${usd(d.fija)} · Momento ${usd(d.momento)}`}>
                {tot > 0 && <span className="trec-tot">{new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(tot)}</span>}
                <div className="trec-seg mom" style={{ height: `${hM}%` }} />
                <div className="trec-seg fija" style={{ height: `${hF}%` }} />
              </div>
              <span className="trec-x">{etiqueta(d.mes)}</span>
            </div>
          );
        })}
      </div>

      <div className="rec-legend" style={{ marginTop: 6 }}>
        <div className="rec-lrow"><span className="rec-sw" style={{ background: "#4d47c2" }} /><span className="rec-n">Base fija<small>clientes recurrentes</small></span></div>
        <div className="rec-lrow"><span className="rec-sw" style={{ background: "#079c8b" }} /><span className="rec-n">Del momento<small>facturas puntuales</small></span></div>
      </div>
    </div>
  );
}
