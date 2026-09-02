import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { vistaFacturacion, catalogoServicios, type FacturaRow } from "@/lib/facturacion";
import { opcionesFormulario } from "@/lib/membresias";
import { EstadoFactura } from "@/components/EstadoFactura";
import { ClientesHeader } from "@/components/ClientesHeader";
import { NuevoClienteModal } from "@/components/NuevoClienteModal";
import { eliminarFactura } from "../acciones";

export const metadata = { title: "Facturación" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };

function Tabla({ filas }: { filas: FacturaRow[] }) {
  return (
    <div className="cf-tbl cf-tbl-scroll">
      <div className="cf-trow head"><span>Cliente</span><span>Servicio</span><span>Entidad</span><span>Monto</span><span>Estado</span><span></span></div>
      {filas.map((f) => (
        <div key={f.id} className="cf-trow">
          <span className="cf-cli">{f.clienteNombre}<small>{f.mesContrato ? `mes ${f.mesContrato}` : ""}{f.reserva ? " · reserva" : ""}</small></span>
          <span className="cf-cli" style={{ fontWeight: 500 }}>{f.servicios ?? "—"}</span>
          <span><span className={`cf-chip ${f.entidad === "LLC" ? "llc" : "col"}`}>{f.entidad}</span></span>
          <span className="cf-mono">{f.entidad === "LLC" ? usd(f.facturado) : cop(f.facturado)}</span>
          <span><EstadoFactura id={f.id} estado={f.estado} /></span>
          <span style={{ display: "inline-flex", gap: 8 }}>
            <Link href={`/trd/clientes/${f.id}`} className="link-ver">Editar</Link>
            <form action={eliminarFactura}><input type="hidden" name="id" value={f.id} /><button type="submit" className="btn-borrar" title="Eliminar">🗑️</button></form>
          </span>
        </div>
      ))}
      {filas.length === 0 && <div className="cf-empty">Sin registros este mes.</div>}
    </div>
  );
}

export default async function FacturacionPage({ searchParams }: { searchParams: Promise<{ mes?: string; error?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();
  const [v, catalogo, opciones] = await Promise.all([vistaFacturacion(mes), catalogoServicios(), opcionesFormulario()]);

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="facturacion" tasa={v.tasa} />
      {sp.error && <p className="alerta">{decodeURIComponent(sp.error)}</p>}

      <div className="cf-sec-head">
        <h2>Clientes recurrentes <span className="count">{v.recurrentes.length}</span></h2>
        <div style={{ display: "inline-flex", gap: 10 }}>
          <NuevoClienteModal mes={mes} catalogo={catalogo} afiliados={opciones.afiliados} colaboradores={opciones.colaboradores} />
          <Link href={`/trd/clientes/nuevo?mes=${mes}`} className="cf-btn cf-btn-ghost">+ Nueva factura</Link>
        </div>
      </div>
      <Tabla filas={v.recurrentes} />

      <div className="cf-sec-head"><h2>Servicios del momento <span className="count">{v.delMomento.length}</span></h2></div>
      <Tabla filas={v.delMomento} />

      <p className="cf-nota">
        Los recurrentes se autogeneran al abrir el mes. Al terminar el contrato, el cliente aparece como <b>“¿Continúa?”</b> para confirmar antes de facturar.
        Estado: Pagado / Facturado / Por facturar (cambio con un clic). Pasarela Stripe = 2,9% + $0,30.
      </p>
    </main>
  );
}
