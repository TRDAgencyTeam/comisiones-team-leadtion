import Link from "next/link";
import { notFound } from "next/navigation";
import { soloAdmin } from "@/lib/sesion";
import { tasaUsdCop } from "@/lib/fx";
import { obtenerFactura, historialCliente, catalogoServicios, netoUsdDeFactura } from "@/lib/facturacion";
import { calcLLC, MEDIOS, ESTADOS } from "@/lib/facturacion-calc";
import { ClientesHeader } from "@/components/ClientesHeader";
import { EstadoFactura } from "@/components/EstadoFactura";
import { editarFactura } from "../acciones";

export const metadata = { title: "Ficha de cliente" };
export const dynamic = "force-dynamic";

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const usd0 = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const nombreMes = (iso: string) => { const [a, m] = iso.split("-").map(Number); const s = new Date(a!, m! - 1, 1).toLocaleDateString("es-CO", { month: "short", year: "2-digit" }); return s; };

export default async function FichaClientePage({ params }: { params: Promise<{ id: string }> }) {
  await soloAdmin();
  const { id } = await params;
  const factura = await obtenerFactura(Number(id));
  if (!factura) notFound();
  const [fx, historial, catalogo] = await Promise.all([tasaUsdCop(), historialCliente(factura.clienteNombre), catalogoServicios()]);
  const tasa = fx.cop;
  const mes = factura.mes;
  const esLLC = factura.entidad === "LLC";

  const activos = historial.filter((f) => f.estado !== "anulado");
  const ltvNeto = activos.reduce((s, f) => s + netoUsdDeFactura(f, tasa), 0);
  const meses = new Set(historial.map((f) => f.mes)).size;
  const servicios = Array.from(new Set(historial.map((f) => f.servicios).filter(Boolean))) as string[];
  const ultimoPago = historial.map((f) => f.fechaPago).filter(Boolean).sort().at(-1) ?? null;

  const cat = catalogo.find((c) => c.clave === factura.servicioClave);
  const mostrarReserva = Boolean(cat?.aplicaReserva) || factura.reserva;

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="facturacion" tasa={tasa} titulo={factura.clienteNombre} />
      <p style={{ margin: "0 0 8px" }}><Link href={`/trd/clientes/facturacion?mes=${mes}`} className="link-ver">← Volver a facturación</Link></p>

      <div className="cf-kpis">
        <div className="cf-kpi hero"><div className="lbl">Lifetime value (neto)</div><div className="big">{usd0(ltvNeto)}</div><div className="sub">{factura.entidad} · total invertido con nosotros</div></div>
        <div className="cf-kpi"><div className="lbl">Meses activo</div><div className="big">{meses}</div><div className="sub">{factura.mesContrato ? `contrato: mes ${factura.mesContrato}` : "—"}</div></div>
        <div className="cf-kpi"><div className="lbl">Facturas</div><div className="big">{historial.length}</div><div className="sub">{activos.length} activas</div></div>
        <div className="cf-kpi"><div className="lbl">Último pago</div><div className="big" style={{ fontSize: "1.2rem" }}>{ultimoPago ?? "—"}</div><div className="sub">fecha de pago más reciente</div></div>
      </div>

      <div className="cf-sec-head"><h2>Servicios contratados</h2></div>
      <div className="cf-card">
        {servicios.length ? servicios.map((s, i) => <span key={i} className="cf-chip llc" style={{ marginRight: 6, marginBottom: 6, display: "inline-block" }}>{s}</span>) : <span className="cf-hint">Sin servicios registrados.</span>}
      </div>

      <div className="cf-sec-head"><h2>Historial de facturación <span className="count">{historial.length}</span></h2></div>
      <div className="cf-table-wrap">
        <table className="cf-table">
          <thead><tr><th>Mes</th><th>Servicio</th><th className="r">Facturado</th><th className="r">Neto USD</th><th>F. pago</th><th>Estado</th></tr></thead>
          <tbody>
            {historial.map((f) => (
              <tr key={f.id} className={f.estado === "pagado" ? "pagada" : f.estado === "anulado" ? "anulada" : ""}>
                <td className="nom">{nombreMes(f.mes)}</td>
                <td className="srv">{f.servicios ?? "—"}</td>
                <td className="r">{f.entidad === "LLC" ? usd(f.facturado) : cop(f.facturado)}</td>
                <td className="r neto">{usd(netoUsdDeFactura(f, tasa))}</td>
                <td>{f.fechaPago ?? "—"}</td>
                <td>{f.id === factura.id ? <EstadoFactura id={f.id} estado={f.estado} /> : <span className={`estado-sel est-${f.estado}`}>{ESTADOS.find((e) => e.value === f.estado)?.label}</span>}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="cf-sec-head"><h2>Editar esta factura ({nombreMes(mes)})</h2></div>
      <div className="cf-card">
        <form action={editarFactura} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <input type="hidden" name="id" value={factura.id} />
          <input type="hidden" name="mes" value={mes} />
          <input type="hidden" name="entidad" value={factura.entidad} />
          {factura.clienteId != null && <input type="hidden" name="clienteId" value={factura.clienteId} />}
          <input type="hidden" name="recurrente" value={factura.recurrente ? "1" : "0"} />
          <div className="cf-f"><label>Nombre del cliente</label><input name="clienteNombre" defaultValue={factura.clienteNombre} /></div>
          <div className="cf-f"><label>Servicios</label><input name="servicios" defaultValue={factura.servicios ?? ""} /></div>
          <div className="cf-f"><label>Desglose de precio</label><input name="precioDesglose" defaultValue={factura.precioDesglose ?? ""} /></div>
          <div className="cf-price-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className="cf-f"><label>{esLLC ? "Facturado (USD)" : "Facturado COP (antes de IVA)"}</label><input name="facturado" inputMode="decimal" defaultValue={factura.facturado} /></div>
            <div className="cf-f"><label>Medio de pago</label><select name="medio" defaultValue={factura.medio ?? "stripe"}>{MEDIOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
          </div>
          {!esLLC && <div className="cf-f"><label>IVA %</label><input name="ivaPct" inputMode="decimal" defaultValue={factura.ivaPct} /></div>}
          <div className="cf-price-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
            <div className="cf-f"><label>Fecha de factura</label><input type="date" name="fechaFactura" defaultValue={factura.fechaFactura ?? ""} /></div>
            <div className="cf-f"><label>Fecha de pago</label><input type="date" name="fechaPago" defaultValue={factura.fechaPago ?? ""} /></div>
          </div>
          <div className="cf-f"><label>Estado</label><select name="estado" defaultValue={factura.estado}>{ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}</select></div>
          {mostrarReserva && <div className="cf-f"><label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="reserva" value="1" defaultChecked={factura.reserva} style={{ width: "auto" }} /> Vino con reserva (servicio Leadtion)</label></div>}
          <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
            <Link href={`/trd/clientes/facturacion?mes=${mes}`} className="cf-btn cf-btn-ghost">Cancelar</Link>
            <button type="submit" className="cf-btn cf-btn-primary">Guardar cambios</button>
          </div>
        </form>
      </div>
    </main>
  );
}
