import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { facturasDelMes, type FacturaRow } from "@/lib/facturacion";
import { calcLLC, calcCOL } from "@/lib/facturacion-calc";
import { EstadoFactura } from "@/components/EstadoFactura";
import { eliminarFactura, copiarMesAnterior } from "./acciones";

export const metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };
const nombreMes = (iso: string) => { const [a, m] = iso.split("-").map(Number); return new Date(a!, m! - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" }); };

function Acciones({ f }: { f: FacturaRow }) {
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <Link href={`/trd/clientes/${f.id}`} className="link-ver">Editar</Link>
      <form action={eliminarFactura}><input type="hidden" name="id" value={f.id} /><button type="submit" className="btn-borrar" title="Eliminar">🗑️</button></form>
    </span>
  );
}

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ mes?: string; error?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();
  const { llc, col, totales } = await facturasDelMes(mes);

  return (
    <main className="wrap">
      <div className="reg-head">
        <div>
          <h1>Clientes — Facturación</h1>
          <p className="sub">Cuadro de ingresos de <strong>{nombreMes(mes)}</strong> · tasa {cop(totales.tasa)} · ingresos netos {usd(totales.ingresosUsd)}.</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <form method="get" className="reg-mes">
            <input type="month" name="mes" defaultValue={mes} />
            <button type="submit" className="btn-secondary">Ver</button>
          </form>
          <Link href={`/trd/clientes/nuevo-cliente?mes=${mes}`} className="btn-primary">+ Nuevo cliente</Link>
          <Link href={`/trd/clientes/nuevo?mes=${mes}`} className="btn-secondary">+ Factura (existente)</Link>
          <form action={copiarMesAnterior}><input type="hidden" name="mes" value={mes} /><button type="submit" className="btn-secondary">Copiar mes anterior</button></form>
        </div>
      </div>
      {sp.error && <p className="alerta">{decodeURIComponent(sp.error)}</p>}

      <div className="reg-totales">
        <div className="kpi"><span className="kpi-lbl">Clientes USA (neto)</span><span className="kpi-num">{usd(totales.llc.neto)}</span></div>
        <div className="kpi"><span className="kpi-lbl">Clientes COL (neto USD)</span><span className="kpi-num">{usd(totales.col.netoUsd)}</span></div>
        <div className="kpi destacado"><span className="kpi-lbl">Total ingresos netos</span><span className="kpi-num">{usd(totales.ingresosUsd)}</span></div>
        <div className="kpi"><span className="kpi-lbl">Comisión pasarela</span><span className="kpi-num neg">{usd(totales.llc.pasarela)}</span></div>
      </div>

      {/* LLC */}
      <h2 style={{ fontSize: "1rem", margin: "18px 0 8px" }}>Clientes LLC (USD)</h2>
      <div className="reg-tabla-wrap">
        <table className="reg-tabla">
          <thead><tr>
            <th>#</th><th>Cliente</th><th>Servicios</th><th>Precio</th>
            <th className="right">Facturado</th><th className="right">Pasarela</th><th className="right">Neto</th>
            <th>Medio</th><th>Estado</th><th></th>
          </tr></thead>
          <tbody>
            {llc.map((f) => { const c = calcLLC(f.facturado, f.medio); return (
              <tr key={f.id} className={f.estado === "anulado" ? "fila-inactiva" : ""}>
                <td className="muted">{f.reserva ? "Reserva" : f.mrr ? `MRR ${f.mrr}` : "—"}</td>
                <td>{f.clienteNombre}</td>
                <td className="muted">{f.servicios ?? "—"}</td>
                <td className="muted">{f.precioDesglose ?? "—"}</td>
                <td className="right">{usd(f.facturado)}</td>
                <td className="right neg">{usd(c.pasarela)}</td>
                <td className="right strong">{usd(c.neto)}</td>
                <td className="muted">{f.medio ?? "—"}</td>
                <td><EstadoFactura id={f.id} estado={f.estado} /></td>
                <td><Acciones f={f} /></td>
              </tr>
            ); })}
            {llc.length === 0 && <tr><td colSpan={10} className="vacio">Sin clientes LLC este mes.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* COL */}
      <h2 style={{ fontSize: "1rem", margin: "22px 0 8px" }}>Clientes Colombia (COP · Ebenezer)</h2>
      <div className="reg-tabla-wrap">
        <table className="reg-tabla">
          <thead><tr>
            <th>Cliente</th><th>Servicios</th><th className="right">COP antes IVA</th><th className="right">IVA</th>
            <th className="right">COP con IVA</th><th className="right">Neto agencia USD</th><th>Medio</th><th>Estado</th><th></th>
          </tr></thead>
          <tbody>
            {col.map((f) => { const c = calcCOL(f.facturado, f.ivaPct, totales.tasa); return (
              <tr key={f.id} className={f.estado === "anulado" ? "fila-inactiva" : ""}>
                <td>{f.clienteNombre}</td>
                <td className="muted">{f.servicios ?? "—"}</td>
                <td className="right">{cop(f.facturado)}</td>
                <td className="right muted">{cop(c.iva)} <span className="muted">({f.ivaPct}%)</span></td>
                <td className="right">{cop(c.copConIva)}</td>
                <td className="right strong">{usd(c.netoUsd)}</td>
                <td className="muted">{f.medio ?? "—"}</td>
                <td><EstadoFactura id={f.id} estado={f.estado} /></td>
                <td><Acciones f={f} /></td>
              </tr>
            ); })}
            {col.length === 0 && <tr><td colSpan={9} className="vacio">Sin clientes Colombia este mes.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="reg-nota">
        Pasarela Stripe = 2,9% + $0,30 (otros medios $0). En Colombia, el IVA (19%) no es ingreso: el neto de agencia
        es el valor antes de IVA ÷ tasa. Los anulados no suman a los totales. “Copiar mes anterior” trae los recurrentes.
      </p>
    </main>
  );
}
