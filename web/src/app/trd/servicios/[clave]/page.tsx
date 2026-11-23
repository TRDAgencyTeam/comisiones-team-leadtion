import Link from "next/link";
import { notFound } from "next/navigation";
import { soloAdmin } from "@/lib/sesion";
import { obtenerServicioAdmin, historialUsoServicio, historialMensualServicio } from "@/lib/servicios-catalogo";
import { ServicioForm } from "@/components/ServicioForm";
import { ServicioUsoChart } from "@/components/ServicioUsoChart";
import { actualizarServicio, eliminarServicio } from "../acciones";
import { IconoBorrar } from "@/components/Iconos";

export const metadata = { title: "Editar servicio" };
export const dynamic = "force-dynamic";

const MARCA_LABEL: Record<string, string> = { agencia: "TRD Agency", leadtion: "Leadtion", ambas: "Agency + Leadtion" };

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const fMes = (m: string) => { const [y, mm] = m.split("-").map(Number); return `${MESES[(mm ?? 1) - 1]} ${y}`; };

export default async function EditarServicioPage({
  params, searchParams,
}: { params: Promise<{ clave: string }>; searchParams: Promise<{ error?: string }> }) {
  await soloAdmin();
  const { clave } = await params;
  const { error } = await searchParams;
  const [servicio, historial, meses] = await Promise.all([
    obtenerServicioAdmin(clave), historialUsoServicio(clave), historialMensualServicio(clave, 12),
  ]);
  if (!servicio) notFound();

  return (
    <main className="wrap">
      <p><Link href="/trd/servicios" className="link-ver">← Servicios y productos</Link></p>
      <h1>{servicio.nombre}</h1>
      <p className="sub">Clave: <code>{servicio.clave}</code> · {servicio.recurrente ? "recurrente" : servicio.porPersona ? "por persona" : "un pago"}.</p>

      {/* Hoja de vida: estadísticas en tarjetas + gráficos de uso por mes. */}
      <div className="reg-totales">
        <div className="kpi destacado"><span className="kpi-lbl">Facturas</span><span className="kpi-num">{servicio.veces}</span><span className="kpi-lbl">veces facturado</span></div>
        <div className="kpi"><span className="kpi-lbl">Clientes</span><span className="kpi-num">{servicio.clientes}</span><span className="kpi-lbl">distintos</span></div>
        <div className="kpi"><span className="kpi-lbl">Ingreso neto aprox</span><span className="kpi-num">{usd(servicio.ingresoUsd)}</span><span className="kpi-lbl">USD, histórico</span></div>
        <div className="kpi"><span className="kpi-lbl">Marca</span><span className="kpi-num" style={{ fontSize: "1rem" }}>{MARCA_LABEL[servicio.marca] ?? servicio.marca}</span><span className="kpi-lbl">{servicio.categoria}</span></div>
      </div>

      <div style={{ marginTop: 14 }}>
        <ServicioUsoChart meses={meses} />
      </div>

      <h2 style={{ fontSize: "1.05rem", margin: "26px 0 10px" }}>Modificar servicio</h2>
      <ServicioForm action={actualizarServicio} servicio={servicio} error={error ? decodeURIComponent(error) : undefined} />

      <section style={{ marginTop: 26 }}>
        <h2 style={{ fontSize: "1.05rem", margin: "0 0 10px" }}>Historial de uso <span className="count">{historial.length}</span></h2>
        {historial.length === 0 ? (
          <p className="reg-nota">Este servicio aún no se ha facturado.</p>
        ) : (
          <div className="reg-tabla-wrap">
            <table className="reg-tabla">
              <thead><tr><th>Cliente</th><th>Mes</th><th className="right">Facturado</th><th>Estado</th></tr></thead>
              <tbody>
                {historial.map((h, i) => (
                  <tr key={i} className={h.estado === "anulado" ? "fila-inactiva" : ""}>
                    <td>{h.clienteNombre}</td>
                    <td className="muted">{fMes(h.mes)}</td>
                    <td className="right">{h.entidad === "COL" ? cop(h.facturado) : usd(h.facturado)}</td>
                    <td className="muted">{h.estado}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section style={{ marginTop: 22 }}>
        <form action={eliminarServicio}>
          <input type="hidden" name="clave" value={servicio.clave} />
          <button type="submit" className="btn-borrar icon-btn danger con-texto" title="Eliminar servicio">
            <IconoBorrar /> Eliminar servicio
          </button>
        </form>
        <p className="reg-nota" style={{ marginTop: 6 }}>Si el servicio tiene facturas, no se borra: se desactiva para no romper el historial.</p>
      </section>
    </main>
  );
}
