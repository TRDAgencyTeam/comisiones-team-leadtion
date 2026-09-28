const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const usd2 = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);

/**
 * Base fija (clientes recurrentes) vs. del momento. Complementa "Ingresos por fuente":
 * dice qué tan segura/predecible es la facturación del mes.
 */
export function RecurrenciaCard({
  fijaNeto, fijaClientes, momentoNeto, momentoClientes, leadtionRec, apiVendida,
}: {
  fijaNeto: number; fijaClientes: number; momentoNeto: number; momentoClientes: number;
  leadtionRec: number; apiVendida: number;
}) {
  const momento = momentoNeto + apiVendida;
  const bandas = [
    { k: "fija", label: "Base fija (recurrentes)", nota: `${fijaClientes} clientes · planes fijos`, val: fijaNeto, c: "#4d47c2" },
    { k: "lead", label: "Recurrente Leadtion", nota: "membresías + reselling", val: leadtionRec, c: "#6d5ac0" },
    { k: "mom", label: "Del momento y puntuales", nota: `${momentoClientes} clientes + API`, val: momento, c: "#079c8b" },
  ].filter((b) => b.val > 0);
  const base = bandas.reduce((s, b) => s + b.val, 0);
  const pct = (v: number) => (base > 0 ? Math.round((v / base) * 1000) / 10 : 0);
  const predecible = fijaNeto + leadtionRec;
  const pctPred = base > 0 ? Math.round((predecible / base) * 100) : 0;
  const tFija = fijaClientes > 0 ? fijaNeto / fijaClientes : 0;
  const tMom = momentoClientes > 0 ? momentoNeto / momentoClientes : 0;
  const ratio = tMom > 0 ? Math.round((tFija / tMom) * 10) / 10 : 0;

  return (
    <div className="cf-card rec-card">
      <div className="rec-head">
        <h3 style={{ margin: 0 }}>Base fija vs. del momento</h3>
        <span className="rec-pred">Ingreso predecible <b>{usd(predecible)} · {pctPred}%</b></span>
      </div>
      <p className="cf-legend" style={{ margin: "2px 0 12px" }}>Ingresos por fuente dice de dónde viene la plata; esto dice qué tan segura es (se repite cada mes).</p>

      {base > 0 && (
        <>
          <div className="rec-bar">
            {bandas.map((b) => <div key={b.k} style={{ width: `${pct(b.val)}%`, background: b.c }} title={`${b.label}: ${usd(b.val)} (${pct(b.val)}%)`} />)}
          </div>
          <div className="rec-legend">
            {bandas.map((b) => (
              <div key={b.k} className="rec-lrow">
                <span className="rec-sw" style={{ background: b.c }} />
                <span className="rec-n">{b.label}<small>{b.nota}</small></span>
                <b className="rec-amt">{usd2(b.val)}</b>
                <span className="rec-pct">{pct(b.val)}%</span>
              </div>
            ))}
          </div>
        </>
      )}

      <div className="rec-vs">
        <div className="rec-mini">
          <div className="rec-mini-h"><span className="rec-sw" style={{ background: "#4d47c2" }} /> Clientes recurrentes</div>
          <div className="rec-stats">
            <div><span className="l">Clientes</span><span className="v">{fijaClientes}</span></div>
            <div><span className="l">Facturación</span><span className="v">{usd(fijaNeto)}</span></div>
            <div><span className="l">Ticket prom.</span><span className="v">{usd(tFija)}</span></div>
          </div>
        </div>
        <div className="rec-mini">
          <div className="rec-mini-h"><span className="rec-sw" style={{ background: "#079c8b" }} /> Clientes del momento</div>
          <div className="rec-stats">
            <div><span className="l">Clientes</span><span className="v">{momentoClientes}</span></div>
            <div><span className="l">Facturación</span><span className="v">{usd(momentoNeto)}</span></div>
            <div><span className="l">Ticket prom.</span><span className="v">{usd(tMom)}</span></div>
          </div>
        </div>
      </div>

      {ratio > 0 && (
        <p className="rec-callout">Un cliente fijo deja <b>{ratio.toLocaleString("es-CO")} veces</b> lo de uno del momento, y lo vuelve a dejar cada mes. Cada venta del momento que se vuelve plan fijo suma a la base.</p>
      )}
    </div>
  );
}
