import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { vistaFacturacion, netoUsdDeFactura, type FacturaRow } from "@/lib/facturacion";
import { EstadoFactura } from "@/components/EstadoFactura";
import { eliminarFactura } from "./acciones";

export const metadata = { title: "Clientes" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };
const nombreMes = (iso: string) => { const [a, m] = iso.split("-").map(Number); return new Date(a!, m! - 1, 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" }); };

function SeccionFacturas({ titulo, filas, tasa, vacio }: { titulo: string; filas: FacturaRow[]; tasa: number; vacio: string }) {
  return (
    <div style={{ marginTop: 18 }}>
      <h2 style={{ fontSize: "1rem", margin: "0 0 8px" }}>{titulo} <span className="muted">({filas.length})</span></h2>
      <div className="reg-tabla-wrap">
        <table className="reg-tabla">
          <thead><tr>
            <th>Cliente</th><th>Entidad</th><th>Servicios</th><th className="right">Facturado</th>
            <th className="right">Neto USD</th><th>Medio</th><th>Estado</th><th></th>
          </tr></thead>
          <tbody>
            {filas.map((f) => (
              <tr key={f.id} className={f.estado === "anulado" ? "fila-inactiva" : ""}>
                <td>{f.reserva && <span className="freelance-tag" style={{ marginRight: 4 }}>reserva</span>}{f.clienteNombre}</td>
                <td><span className={f.entidad === "LLC" ? "tag-agencia" : "tag-partner"}>{f.entidad}</span></td>
                <td className="muted">{f.servicios ?? "—"}{f.precioDesglose ? ` · ${f.precioDesglose}` : ""}</td>
                <td className="right">{f.entidad === "LLC" ? usd(f.facturado) : cop(f.facturado)}</td>
                <td className="right strong">{usd(netoUsdDeFactura(f, tasa))}</td>
                <td className="muted">{f.medio ?? "—"}</td>
                <td><EstadoFactura id={f.id} estado={f.estado} /></td>
                <td>
                  <span style={{ display: "inline-flex", gap: 6 }}>
                    <Link href={`/trd/clientes/${f.id}`} className="link-ver">Editar</Link>
                    <form action={eliminarFactura}><input type="hidden" name="id" value={f.id} /><button type="submit" className="btn-borrar" title="Eliminar">🗑️</button></form>
                  </span>
                </td>
              </tr>
            ))}
            {filas.length === 0 && <tr><td colSpan={8} className="vacio">{vacio}</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function ClientesPage({ searchParams }: { searchParams: Promise<{ mes?: string; error?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();
  const v = await vistaFacturacion(mes);

  return (
    <main className="wrap">
      <div className="reg-head">
        <div>
          <h1>Clientes — Facturación</h1>
          <p className="sub">Cuadro de ingresos de <strong>{nombreMes(mes)}</strong> · tasa {cop(v.tasa)} · total ingresos {usd(v.totales.ingresosUsd)}.</p>
        </div>
        <form method="get" className="reg-mes">
          <input type="month" name="mes" defaultValue={mes} />
          <button type="submit" className="btn-secondary">Ver</button>
        </form>
      </div>
      {sp.error && <p className="alerta">{decodeURIComponent(sp.error)}</p>}

      <div className="reg-totales">
        <div className="kpi"><span className="kpi-lbl">Agencia (neto)</span><span className="kpi-num">{usd(v.totales.agenciaNetoUsd)}</span></div>
        <div className="kpi"><span className="kpi-lbl">Servicios Leadtion</span><span className="kpi-num">{usd(v.totales.leadtionServiciosUsd)}</span></div>
        <div className="kpi"><span className="kpi-lbl">Membresías Leadtion</span><span className="kpi-num">{usd(v.membresias.totalUsd)}</span><span className="kpi-lbl">{v.membresias.cuentas} cuentas</span></div>
        <div className="kpi destacado"><span className="kpi-lbl">Total ingresos</span><span className="kpi-num">{usd(v.totales.ingresosUsd)}</span></div>
        <div className="kpi"><span className="kpi-lbl">Pasarela</span><span className="kpi-num neg">{usd(v.totales.pasarelaUsd)}</span></div>
      </div>

      <div className="clientes-acciones">
        <div className="acc-item">
          <Link href={`/trd/clientes/nuevo-cliente?mes=${mes}`} className="btn-primary">+ Nuevo cliente</Link>
          <span className="acc-help">Cliente nuevo. Se conecta con Membresías, Afiliados y CS. Si es plan de marketing, queda recurrente (se autogenera cada mes).</span>
        </div>
        <div className="acc-item">
          <Link href={`/trd/clientes/nuevo?mes=${mes}`} className="btn-secondary">+ Nueva factura</Link>
          <span className="acc-help">Factura suelta de este mes (cliente existente o servicio puntual).</span>
        </div>
        <div className="acc-item">
          <span className="acc-help" style={{ marginTop: 6 }}>💡 Los recurrentes se crean solos al entrar al mes; lo de Leadtion (reactivación, servicios, membresías) se jala automático.</span>
        </div>
      </div>

      <SeccionFacturas titulo="🔵 Marketing recurrente (agencia)" filas={v.recurrentes} tasa={v.tasa}
        vacio="Sin recurrentes este mes. Crea uno con “+ Nuevo cliente” (marcado recurrente)." />

      <SeccionFacturas titulo="🟢 Servicios del momento (agencia)" filas={v.delMomento} tasa={v.tasa}
        vacio="Sin servicios puntuales de agencia este mes." />

      {/* Leadtion (automático) */}
      <div style={{ marginTop: 18 }}>
        <h2 style={{ fontSize: "1rem", margin: "0 0 8px" }}>🟠 Servicios y reactivación Leadtion <span className="muted">(automático · {v.leadtion.length})</span></h2>
        <div className="reg-tabla-wrap">
          <table className="reg-tabla">
            <thead><tr><th>Cliente</th><th>Concepto</th><th>Tipo</th><th className="right">Valor USD</th></tr></thead>
            <tbody>
              {v.leadtion.map((s, i) => (
                <tr key={i}>
                  <td>{s.clienteNombre}</td>
                  <td className="muted">{s.concepto}</td>
                  <td>{s.esReactivacion ? <span className="est-programado estado-sel">Reactivación</span> : <span className="muted">Servicio</span>}</td>
                  <td className="right strong">{usd(s.valorUsd)}</td>
                </tr>
              ))}
              {v.leadtion.length === 0 && <tr><td colSpan={4} className="vacio">Sin servicios/reactivación Leadtion este mes.</td></tr>}
            </tbody>
          </table>
        </div>
        <p className="reg-nota" style={{ marginTop: 6 }}>Se jala de Leadtion (no se re-escribe aquí). Incluye reactivaciones en curso (pagos 2/3).</p>
      </div>

      {/* Membresías (resumen) */}
      <div className="card" style={{ marginTop: 16 }}>
        <div className="card-head">
          <span className="who">Cuentas Leadtion (membresías)</span>
          <span className="total">{usd(v.membresias.totalUsd)}</span>
        </div>
        <p className="foot" style={{ marginTop: 4 }}>{v.membresias.cuentas} cuentas con cobro este mes. No se listan una por una; el detalle está en Leadtion → <Link href="/membresias/clientes" className="link-ver">Membresías</Link>.</p>
      </div>

      <p className="reg-nota">
        Pasarela Stripe = 2,9% + $0,30. COL: el IVA no es ingreso (neto = antes de IVA ÷ tasa). Los anulados no suman.
      </p>
    </main>
  );
}
