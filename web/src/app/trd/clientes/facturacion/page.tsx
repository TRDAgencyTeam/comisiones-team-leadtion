import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { vistaFacturacion, catalogoServicios, netoUsdDeFactura, type FacturaRow } from "@/lib/facturacion";
import { calcLLC } from "@/lib/facturacion-calc";
import { otrosIngresosDelMes } from "@/lib/egresos";
import { opcionesFormulario } from "@/lib/membresias";
import { EstadoFactura } from "@/components/EstadoFactura";
import { ClientesHeader } from "@/components/ClientesHeader";
import { NuevoClienteModal } from "@/components/NuevoClienteModal";
import { MovimientoModal } from "@/components/MovimientoModal";
import { eliminarFactura, eliminarIngreso } from "../acciones";

export const metadata = { title: "Facturación" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };
const fFecha = (iso: string | null) => { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d}/${m}`; };

function Tabla({ filas, tasa, entidad }: { filas: FacturaRow[]; tasa: number; entidad: "LLC" | "COL" }) {
  const esLLC = entidad === "LLC";
  return (
    <div className="cf-table-wrap">
      <table className="cf-table">
        <thead>
          <tr>
            <th>Cliente</th><th>Servicio</th>{esLLC && <th>Mes</th>}
            <th className="r">Facturado</th>{esLLC && <th className="r">Pasarela</th>}<th className="r">Neto USD</th>
            <th>F. factura</th><th>F. pago</th><th>Estado</th><th></th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const pasarela = esLLC ? calcLLC(f.facturado, f.medio).pasarela : 0;
            return (
              <tr key={f.id} className={f.estado === "pagado" ? "pagada" : f.estado === "anulado" ? "anulada" : ""}>
                <td className="nom">{f.clienteNombre}<small>{f.reserva ? "reserva · " : ""}{f.medio ?? ""}</small></td>
                <td className="srv">{f.servicios ?? "—"}</td>
                {esLLC && <td>{f.mesContrato ? `mes ${f.mesContrato}` : "—"}</td>}
                <td className="r">{esLLC ? usd(f.facturado) : cop(f.facturado)}</td>
                {esLLC && <td className="r">{pasarela ? usd(pasarela) : "—"}</td>}
                <td className="r neto">{usd(netoUsdDeFactura(f, tasa))}</td>
                <td>{fFecha(f.fechaFactura)}</td>
                <td>{fFecha(f.fechaPago)}</td>
                <td><EstadoFactura id={f.id} estado={f.estado} /></td>
                <td>
                  <span className="acc">
                    <Link href={`/trd/clientes/${f.id}`} className="link-ver">Ver</Link>
                    <form action={eliminarFactura}><input type="hidden" name="id" value={f.id} /><button type="submit" className="btn-borrar" title="Eliminar">🗑️</button></form>
                  </span>
                </td>
              </tr>
            );
          })}
          {filas.length === 0 && <tr><td colSpan={esLLC ? 10 : 9} className="cf-empty" style={{ padding: 24 }}>Sin registros este mes.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default async function FacturacionPage({ searchParams }: { searchParams: Promise<{ mes?: string; error?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();
  const [v, catalogo, opciones, otros] = await Promise.all([vistaFacturacion(mes), catalogoServicios(), opcionesFormulario(), otrosIngresosDelMes(mes)]);

  const recLLC = v.recurrentes.filter((f) => f.entidad === "LLC");
  const recCOL = v.recurrentes.filter((f) => f.entidad === "COL");
  const otrosTotal = otros.reduce((s, o) => s + o.valorUsd, 0);

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="facturacion" tasa={v.tasa} />
      {sp.error && <p className="alerta">{decodeURIComponent(sp.error)}</p>}

      <div className="cf-sec-head">
        <h2>Clientes recurrentes · USA (LLC) <span className="count">{recLLC.length}</span></h2>
        <div style={{ display: "inline-flex", gap: 10 }}>
          <NuevoClienteModal mes={mes} tasa={v.tasa} catalogo={catalogo} afiliados={opciones.afiliados} colaboradores={opciones.colaboradores} />
          <Link href={`/trd/clientes/nuevo?mes=${mes}`} className="cf-btn cf-btn-ghost">+ Nueva factura</Link>
        </div>
      </div>
      <Tabla filas={recLLC} tasa={v.tasa} entidad="LLC" />

      <div className="cf-sec-head"><h2>Clientes recurrentes · Colombia (COP) <span className="count">{recCOL.length}</span></h2></div>
      <Tabla filas={recCOL} tasa={v.tasa} entidad="COL" />

      <div className="cf-sec-head"><h2>Servicios del momento <span className="count">{v.delMomento.length}</span></h2></div>
      <Tabla filas={v.delMomento} tasa={v.tasa} entidad="LLC" />

      <div className="cf-sec-head">
        <h2>Otros ingresos del mes <span className="count">{usd(otrosTotal)}</span></h2>
        <MovimientoModal mes={mes} tipo="ingreso" />
      </div>
      <div className="cf-table-wrap">
        <table className="cf-table" style={{ minWidth: 0 }}>
          <thead><tr><th>Concepto</th><th>Categoría</th><th className="r">Monto USD</th><th></th></tr></thead>
          <tbody>
            {otros.map((o) => (
              <tr key={o.id}>
                <td className="nom">{o.concepto}</td>
                <td><span className="cf-tag caja">{o.categoria ?? "otro"}</span></td>
                <td className="r neto">{usd(o.valorUsd)}</td>
                <td><form action={eliminarIngreso}><input type="hidden" name="id" value={o.id} /><button type="submit" className="btn-borrar" title="Eliminar">🗑️</button></form></td>
              </tr>
            ))}
            {otros.length === 0 && <tr><td colSpan={4} className="cf-empty" style={{ padding: 24 }}>Sin otros ingresos. Agrega reselling, mantenimientos, API vendida, afiliaciones…</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="cf-nota">
        <b>Otros ingresos</b> = plata que entra y no es cliente de agencia: reselling Leadtion, licencias de afiliado, mantenimientos web, reservas P2P, API vendida, afiliación de herramientas. Se cargan aquí (ya no en Leadtion).<br />
        <b>Servicios del momento</b> = compras de una sola vez o servicios Leadtion puntuales (Agente IA, Reactivación, grabación, evento…). Los recurrentes se autogeneran cada mes;
        al terminar el contrato el cliente pasa a <b>“¿Continúa?”</b> (automático) para confirmar. Neto USD = facturado − pasarela (LLC) / antes de IVA ÷ tasa (COL).
      </p>
    </main>
  );
}
