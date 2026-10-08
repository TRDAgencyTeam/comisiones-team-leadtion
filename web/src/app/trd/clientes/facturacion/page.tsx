import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { vistaFacturacion, catalogoServicios, clientesParaFactura, netoUsdDeFactura, lineasDeFacturas, type FacturaRow } from "@/lib/facturacion";
import { calcLLC, calcCOL, type LineaServicio } from "@/lib/facturacion-calc";
import { ServiciosHover } from "@/components/ServiciosHover";
import { otrosIngresosDelMes } from "@/lib/egresos";
import { opcionesFormulario } from "@/lib/membresias";
import { comercialesActivos } from "@/lib/comercial";
import { EstadoFactura } from "@/components/EstadoFactura";
import { ClientesHeader } from "@/components/ClientesHeader";
import { NuevoClienteModal } from "@/components/NuevoClienteModal";
import { MovimientoModal } from "@/components/MovimientoModal";
import { eliminarFactura, eliminarIngreso } from "../acciones";
import { mesHoyISO } from "@/lib/fecha";
import { IconoBorrar } from "@/components/Iconos";

export const metadata = { title: "Facturación" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const mesISO = () => mesHoyISO();
const fFecha = (iso: string | null) => { if (!iso) return "—"; const [, m, d] = iso.split("-"); return `${d}/${m}`; };

function Tabla({ filas, tasa, entidad, lineas }: { filas: FacturaRow[]; tasa: number; entidad: "LLC" | "COL"; lineas: Map<number, LineaServicio[]> }) {
  const esLLC = entidad === "LLC";
  const esCOL = entidad === "COL";
  return (
    <div className="cf-table-wrap">
      <table className="cf-table">
        <thead>
          <tr>
            <th>Cliente</th><th>Servicio</th>{esLLC && <th>Mes</th>}
            {esCOL
              ? <><th className="r">Antes de IVA</th><th className="r">IVA</th><th className="r">Total con IVA</th></>
              : <th className="r">Facturado</th>}
            {esLLC && <th className="r">Pasarela</th>}<th className="r">Neto USD</th>
            <th>F. factura</th><th>F. pago</th><th>Estado</th><th></th>
          </tr>
        </thead>
        <tbody>
          {filas.map((f) => {
            const pasarela = esLLC ? calcLLC(f.facturado, f.medio).pasarela : 0;
            const filaCOL = f.entidad === "COL";
            const col = filaCOL ? calcCOL(f.facturado, f.ivaPct, f.tasa ?? tasa) : null;
            return (
              <tr key={f.id} className={`fila-${f.estado}`}>
                <td className="nom">{f.clienteNombre}<small>{f.reserva ? "reserva · " : ""}{f.medio ?? ""}</small></td>
                <td className="srv">
                  <ServiciosHover texto={f.servicios ?? "—"} lineas={lineas.get(f.id) ?? []} moneda={filaCOL ? "COP" : "USD"} total={f.facturado} ivaPct={filaCOL ? f.ivaPct : undefined} />
                  {f.enCuotas && f.precioDesglose && <small className="cf-cuota-sub">{f.precioDesglose}</small>}
                </td>
                {esLLC && <td>{f.enCuotas && f.mesContrato ? `Cuota ${f.mesContrato}` : f.mesContrato ? `mes ${f.mesContrato}` : "—"}</td>}
                {esCOL
                  ? <><td className="r">{cop(f.facturado)}</td><td className="r cf-muted-num">{cop(col!.iva)}</td><td className="r">{cop(col!.copConIva)}</td></>
                  : <td className="r">{filaCOL ? cop(f.facturado) : usd(f.facturado)}</td>}
                {esLLC && <td className="r">{pasarela ? usd(pasarela) : "—"}</td>}
                <td className="r neto">{usd(netoUsdDeFactura(f, tasa))}</td>
                <td>{fFecha(f.fechaFactura)}</td>
                <td>{fFecha(f.fechaPago)}</td>
                <td><EstadoFactura id={f.id} estado={f.estado} fechaFactura={f.fechaFactura} /></td>
                <td>
                  <span className="acc">
                    <Link href={`/trd/clientes/${f.id}`} className="link-ver">Ver</Link>
                    <form action={eliminarFactura}><input type="hidden" name="id" value={f.id} /><button type="submit" className="btn-borrar icon-btn danger" title="Eliminar"><IconoBorrar /></button></form>
                  </span>
                </td>
              </tr>
            );
          })}
          {filas.length === 0 && <tr><td colSpan={esLLC ? 10 : 11} className="cf-empty" style={{ padding: 24 }}>Sin registros este mes.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}

export default async function FacturacionPage({ searchParams }: { searchParams: Promise<{ mes?: string; error?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();
  const [v, catalogo, opciones, otros, clientes, comerciales] = await Promise.all([vistaFacturacion(mes), catalogoServicios(), opcionesFormulario(), otrosIngresosDelMes(mes), clientesParaFactura(), comercialesActivos()]);

  const recLLC = v.recurrentes.filter((f) => f.entidad === "LLC");
  const recCOL = v.recurrentes.filter((f) => f.entidad === "COL");
  const otrosTotal = otros.reduce((s, o) => s + o.valorUsd, 0);
  const lineas = await lineasDeFacturas([...v.recurrentes, ...v.enCuotas, ...v.delMomento]);
  // Colombia: lo que se cobra al cliente vs. lo que es ingreso (antes de IVA → USD).
  const totCOL = recCOL.filter((f) => f.estado !== "anulado").reduce((t, f) => {
    const c = calcCOL(f.facturado, f.ivaPct, f.tasa ?? v.tasa);
    return { antes: t.antes + f.facturado, iva: t.iva + c.iva, con: t.con + c.copConIva, usd: t.usd + c.netoUsd };
  }, { antes: 0, iva: 0, con: 0, usd: 0 });

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="facturacion" tasa={v.tasa} navMes />
      {sp.error && <p className="alerta">{decodeURIComponent(sp.error)}</p>}

      <div className="cf-sec-head">
        <h2>Clientes recurrentes · USA (LLC) <span className="count">{recLLC.length}</span></h2>
        <div style={{ display: "inline-flex", gap: 10 }}>
          <NuevoClienteModal mes={mes} tasa={v.tasa} catalogo={catalogo} afiliados={opciones.afiliados} colaboradores={opciones.colaboradores} comerciales={comerciales} clientes={clientes} />
          <Link href={`/trd/clientes/nuevo?mes=${mes}`} className="cf-btn cf-btn-ghost">+ Nueva factura</Link>
        </div>
      </div>
      <Tabla filas={recLLC} tasa={v.tasa} entidad="LLC" lineas={lineas} />

      <div className="cf-sec-head"><h2>Clientes recurrentes · Colombia (COP) <span className="count">{recCOL.length}</span></h2></div>
      {recCOL.length > 0 && (
        <div className="cf-iva-strip">
          <div><span>Antes de IVA</span><b>{cop(totCOL.antes)}</b></div>
          <div><span>+ IVA (no es ganancia)</span><b>{cop(totCOL.iva)}</b></div>
          <div><span>= Total a cobrar</span><b>{cop(totCOL.con)}</b></div>
          <div className="hl"><span>Ingreso real (antes de IVA ÷ tasa)</span><b>{usd(totCOL.usd)}</b></div>
        </div>
      )}
      <Tabla filas={recCOL} tasa={v.tasa} entidad="COL" lineas={lineas} />

      <div className="cf-sec-head"><h2>Servicios del momento <span className="count">{v.delMomento.length}</span></h2></div>
      <Tabla filas={v.delMomento} tasa={v.tasa} entidad="LLC" lineas={lineas} />

      {v.enCuotas.length > 0 && (
        <>
          <div className="cf-sec-head"><h2>En cuotas (planes en pagos) <span className="count">{v.enCuotas.length}</span></h2></div>
          <Tabla filas={v.enCuotas} tasa={v.tasa} entidad="LLC" lineas={lineas} />
        </>
      )}

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
                <td><span className="acc"><MovimientoModal mes={mes} tipo="ingreso" editar={{ id: o.id, concepto: o.concepto, valorUsd: o.valorUsd, categoria: o.categoria }} /><form action={eliminarIngreso}><input type="hidden" name="id" value={o.id} /><button type="submit" className="btn-borrar icon-btn danger" title="Eliminar"><IconoBorrar /></button></form></span></td>
              </tr>
            ))}
            {otros.length === 0 && <tr><td colSpan={4} className="cf-empty" style={{ padding: 24 }}>Sin otros ingresos. Agrega reselling, mantenimientos, API vendida, afiliaciones…</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="cf-nota">
        <b>Otros ingresos</b> = plata que entra y no es cliente de agencia: reselling Leadtion, licencias de afiliado, mantenimientos web, reservas P2P, API vendida, afiliación de herramientas. Se cargan aquí (ya no en Leadtion).<br />
        <b>Servicios del momento</b> = compras de una sola vez o servicios Leadtion puntuales (Agente IA, Reactivación, grabación, evento…). Los recurrentes se autogeneran cada mes;
        al terminar el contrato el cliente pasa a <b>“¿Continúa?”</b> (automático) para confirmar. Neto USD = facturado − pasarela (LLC) / antes de IVA ÷ tasa (COL): el IVA se cobra pero no es ganancia. Pasa el cursor por el servicio para ver el detalle.
      </p>
    </main>
  );
}
