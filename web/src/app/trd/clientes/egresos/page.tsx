import { soloAdmin } from "@/lib/sesion";
import { resumenDelMes, otrosIngresosDelMes } from "@/lib/egresos";
import { ClientesHeader } from "@/components/ClientesHeader";
import { MovimientoModal } from "@/components/MovimientoModal";
import { eliminarEgreso, eliminarIngreso } from "../acciones";

export const metadata = { title: "Egresos" };
export const dynamic = "force-dynamic";

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };
const fmtFecha = (iso: string | null) => { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d} ${["ene","feb","mar","abr","may","jun","jul","ago","sep","oct","nov","dic"][Number(m) - 1]}`; };

export default async function EgresosPage({ searchParams }: { searchParams: Promise<{ mes?: string; error?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();
  const [r, otros] = await Promise.all([resumenDelMes(mes), otrosIngresosDelMes(mes)]);
  const egresos = [...r.egresos.afectanUtilidad, ...r.egresos.saleDeCaja];

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="egresos" tasa={r.tasa} />
      {sp.error && <p className="alerta">{decodeURIComponent(sp.error)}</p>}

      <div className="cf-kpis" style={{ gridTemplateColumns: "repeat(3, 1fr)" }}>
        <div className="cf-kpi"><div className="lbl">Gastos que afectan la utilidad</div><div className="big">{usd(r.egresos.totalAfectan)}</div><div className="sub">bajan la utilidad del mes</div></div>
        <div className="cf-kpi"><div className="lbl">Sale de caja</div><div className="big">{usd(r.egresos.totalCaja)}</div><div className="sub">incluye diezmo {usd(r.diezmo)}</div></div>
        <div className="cf-kpi"><div className="lbl">Otros ingresos del mes</div><div className="big">{usd(otros.reduce((s, o) => s + o.valorUsd, 0))}</div><div className="sub">no-factura (reselling, API…)</div></div>
      </div>

      <div className="cf-sec-head">
        <h2>Egresos del mes <span className="count">{egresos.length}</span></h2>
        <MovimientoModal mes={mes} tipo="egreso" />
      </div>
      <div className="cf-tbl cf-tbl-scroll">
        <div className="cf-trow erow head"><span>Concepto</span><span>Marca</span><span>Fecha</span><span>Monto</span><span>Tipo</span><span></span></div>
        {egresos.map((e) => (
          <div key={`${e.id}-${e.concepto}`} className="cf-trow erow">
            <span className="cf-cli" style={{ fontWeight: 500 }}>{e.concepto}</span>
            <span>{e.marca ?? "—"}</span>
            <span>{fmtFecha(e.fecha)}</span>
            <span className="cf-mono">{usd(e.valorUsd)}</span>
            <span><span className={`cf-tag ${e.afectaUtilidad ? "util" : "caja"}`}>{e.afectaUtilidad ? "Afecta utilidad" : "Sale de caja"}</span></span>
            <span>
              {e.automatico
                ? <span className="cf-hint" title="Automático">auto</span>
                : <form action={eliminarEgreso}><input type="hidden" name="id" value={e.id} /><button type="submit" className="btn-borrar" title="Eliminar">🗑️</button></form>}
            </span>
          </div>
        ))}
        {egresos.length === 0 && <div className="cf-empty">Sin egresos este mes.</div>}
      </div>

      <div className="cf-sec-head">
        <h2>Otros ingresos del mes <span className="count">{otros.length}</span></h2>
        <MovimientoModal mes={mes} tipo="ingreso" />
      </div>
      <div className="cf-tbl">
        {otros.map((o) => (
          <div key={o.id} className="cf-trow" style={{ gridTemplateColumns: "2.5fr 1fr 0.5fr", minWidth: 0 }}>
            <span className="cf-cli" style={{ fontWeight: 500 }}>{o.concepto}</span>
            <span className="cf-mono">{usd(o.valorUsd)}</span>
            <span><form action={eliminarIngreso}><input type="hidden" name="id" value={o.id} /><button type="submit" className="btn-borrar" title="Eliminar">🗑️</button></form></span>
          </div>
        ))}
        {otros.length === 0 && <div className="cf-empty">Sin otros ingresos este mes.</div>}
      </div>

      <p className="cf-nota">“Afecta utilidad” = gasto real del mes (baja la utilidad). “Sale de caja” = inversión/pago que baja la caja pero no la utilidad. El diezmo (10%) es automático.</p>
    </main>
  );
}
