import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerMembresia, PLAN_LABEL, TIPO_LABEL } from "@/lib/membresias";
import { serviciosDeCliente, SERVICIO_LABEL } from "@/lib/servicios";
import { BotonEliminar } from "../BotonEliminar";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
function apiTexto(estado: string | null, valor: number | null): string {
  if (estado === "incluida") return "Incluida ($10 costo)";
  if (estado === "vendida") return valor === 12 ? "Vendida $12 (gana $2)" : `Vendida $${valor ?? 10}`;
  if (estado === "ninguna") return "Sin API";
  return "—";
}
const ESTADO: Record<string, { txt: string; cls: string }> = {
  activo: { txt: "Activo", cls: "estado-pagado" }, pausado: { txt: "Pausado", cls: "estado-pausado" }, cancelado: { txt: "Cancelado", cls: "estado-cancelado" },
};
const ESTADO_MES: Record<string, string> = {
  activo: "Activo", cancelado: "Cancelado", incluido_en_marketing: "Incluido en marketing",
  en_riesgo_o_mora: "En riesgo / mora", previo_a_activacion: "Previo a activación",
  sin_datos: "Sin datos", garantia: "Garantía (mes 2)",
};

export default async function FichaMembresiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await obtenerMembresia(Number(id));
  if (!c) notFound();
  const servicios = await serviciosDeCliente(c.id);
  const badge = ESTADO[c.estado] ?? { txt: c.estado, cls: "" };

  return (
    <main className="wrap">
      <p className="volver"><Link href="/membresias/clientes">← Clientes</Link></p>
      <header className="page page-head-row">
        <div>
          <h1>{c.nombre}</h1>
          <p>
            <span className={badge.cls}>{badge.txt}</span>
            {c.tipoCliente && c.tipoCliente !== "estandar" ? " · " : ""}
            {c.tipoCliente && c.tipoCliente !== "estandar" && <span className="tag-agencia">{TIPO_LABEL[c.tipoCliente]}</span>}
            {c.reserva ? " · " : ""}{c.reserva && <span className="tag-partner">Reserva</span>}
          </p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Link href={`/membresias/${c.id}/servicio`} className="btn-primary">+ Registrar servicio</Link>
          <Link href={`/membresias/${c.id}/editar`} className="btn-secondary">Editar</Link>
          <Link href={`/clientes/${c.id}`} className="btn-secondary">Ver en CS →</Link>
          <BotonEliminar id={c.id} nombre={c.nombre} />
        </div>
      </header>

      <section className="card">
        <div className="datos-grid">
          <div><span className="dato-label">Plan de entrada</span>{c.planTipo ? PLAN_LABEL[c.planTipo] : "Estándar"}</div>
          <div><span className="dato-label">Soporte</span>{c.soporteValor ? usd(c.soporteValor) : "Básico (incluido)"}</div>
          <div><span className="dato-label">API WhatsApp</span>{apiTexto(c.apiEstado, c.apiValor)}</div>
          <div><span className="dato-label">Activación</span>{c.fechaActivacion ?? "—"}</div>
          <div><span className="dato-label">Antigüedad</span>{c.tiempoMeses} {c.tiempoMeses === 1 ? "mes" : "meses"}</div>
          <div><span className="dato-label">Licencia mostrada</span>{c.valorLicencia != null ? usd(c.valorLicencia) : "—"}</div>
          {c.bono != null && <div><span className="dato-label">Bono reactivación</span>{usd(c.bono)}</div>}
          {c.reserva && <div><span className="dato-label">Inicio real</span>{c.fechaInicioReal ?? "pendiente"}</div>}
          <div><span className="dato-label">Personas asignadas (CS)</span>{c.asignados.length ? c.asignados.map((a) => a.nombre).join(", ") : "—"}</div>
          <div><span className="dato-label">Recomendado por</span>{c.afiliadoNombre ?? "Directo"}</div>
        </div>
      </section>

      <section className="card">
        <div className="card-head"><span className="who">Lifetime Value</span><span className="total">{usd(c.ltv)}</span></div>
        <p className="foot" style={{ marginTop: 8 }}>Suma de todos los cobros mensuales registrados (licencia + servicios).</p>
      </section>

      {servicios.length > 0 && (
        <section className="card">
          <div className="card-head"><span className="who">Servicios adquiridos</span></div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Servicio</th><th>Mes de compra</th><th>Soporte (mes 3)</th><th>Nota</th></tr></thead>
              <tbody>
                {servicios.map((s) => (
                  <tr key={s.id}>
                    <td className="td-concepto">{SERVICIO_LABEL[s.tipoServicio]}</td>
                    <td>{s.mesInicio.slice(0, 7)}</td>
                    <td>{s.soporteValor != null ? usd(s.soporteValor) : "—"}</td>
                    <td>{s.nota ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-head"><span className="who">Historial mensual</span></div>
        {c.pagos.length === 0 ? (
          <p className="empty">Sin historial mensual todavía.</p>
        ) : (
          <div className="table-scroll">
            <table>
              <thead><tr><th>Mes</th><th>Estado</th><th className="num">Valor</th></tr></thead>
              <tbody>
                {c.pagos.map((p) => (
                  <tr key={p.mes}><td>{p.mes.slice(0, 7)}</td><td className="td-concepto">{ESTADO_MES[p.estadoMes] ?? p.estadoMes}</td><td className="num">{p.valor != null ? usd(p.valor) : "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
