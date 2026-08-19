import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerMembresia, PLAN_LABEL, TIPO_LABEL } from "@/lib/membresias";
import { serviciosDeCliente, SERVICIO_LABEL, PRECIO_MES1_ESTANDAR } from "@/lib/servicios";
import { soportesDeCliente, soporteEnMes } from "@/lib/soportes";
import { BotonEliminar } from "../BotonEliminar";
import { BotonEliminarServicio } from "../BotonEliminarServicio";
import { BotonEliminarSoporte } from "../BotonEliminarSoporte";

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
  const soportes = await soportesDeCliente(c.id);
  const badge = ESTADO[c.estado] ?? { txt: c.estado, cls: "" };

  const hoyMes = new Date().toISOString().slice(0, 7);
  // Soporte efectivo hoy: período activo si lo hay; si no, el soporte base del cliente.
  const soporteActual = soporteEnMes(soportes, hoyMes, hoyMes) ?? c.soporteValor;
  const soporteEsPeriodo = soporteEnMes(soportes, hoyMes, hoyMes) != null;

  // Tipo del cliente por mes (para el historial): desde el mes en que compró un
  // servicio se muestra "Servicio Leadtion"; antes, su tipo base (agencia si vino
  // con marketing, si no estándar; o su tipo actual si nunca compró un servicio).
  const primerServicio = servicios.map((s) => (s.fechaCompra ?? s.mesInicio).slice(0, 7)).sort()[0] ?? null;
  const tipoBase = servicios.length > 0 ? (c.esAgencia ? "agencia" : "estandar") : (c.tipoCliente ?? "estandar");
  const tipoEnMes = (mes: string) =>
    primerServicio && mes.slice(0, 7) >= primerServicio ? "servicio" : tipoBase;

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
          <Link href={`/cs/clientes/${c.id}`} className="btn-secondary">Ver en CS →</Link>
          <BotonEliminar id={c.id} nombre={c.nombre} />
        </div>
      </header>

      <section className="card">
        <div className="datos-grid">
          <div><span className="dato-label">Plan de entrada</span>{c.planTipo ? PLAN_LABEL[c.planTipo] : "Estándar"}</div>
          <div><span className="dato-label">Soporte {soporteEsPeriodo ? "(activo este mes)" : ""}</span>{soporteActual ? usd(soporteActual) : "Básico (incluido)"}</div>
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
              <thead><tr><th>Servicio</th><th>Fecha de compra</th><th className="num">Precio mes 1</th><th>Soporte (mes 3)</th><th>Nota</th><th></th></tr></thead>
              <tbody>
                {servicios.map((s) => (
                  <tr key={s.id}>
                    <td className="td-concepto">{SERVICIO_LABEL[s.tipoServicio]}</td>
                    <td>{(s.fechaCompra ?? s.mesInicio).slice(0, 10)}</td>
                    <td className="num">{s.precioMes1 != null ? usd(s.precioMes1) : `Estándar ${usd(PRECIO_MES1_ESTANDAR[s.tipoServicio])}`}</td>
                    <td>{s.soporteValor != null ? usd(s.soporteValor) : "—"}</td>
                    <td>{s.nota ?? "—"}</td>
                    <td className="col-accion">
                      <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                        <Link href={`/membresias/${c.id}/servicio/${s.id}/editar`} className="link-ver">Editar</Link>
                        <BotonEliminarServicio servicioId={s.id} clienteId={c.id} etiqueta={SERVICIO_LABEL[s.tipoServicio]} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {soportes.length > 0 && (
        <section className="card">
          <div className="card-head"><span className="who">Períodos de soporte</span></div>
          <div className="table-scroll">
            <table>
              <thead><tr><th>Nivel</th><th>Desde</th><th>Hasta</th><th>Nota</th><th></th></tr></thead>
              <tbody>
                {soportes.map((s) => (
                  <tr key={s.id}>
                    <td className="num">{usd(s.valor)}</td>
                    <td>{s.desde.slice(0, 10)}</td>
                    <td>{s.hasta ? s.hasta.slice(0, 10) : <span className="tag-partner">Indefinido</span>}</td>
                    <td>{s.nota ?? "—"}</td>
                    <td className="col-accion">
                      <div style={{ display: "flex", gap: 6, alignItems: "center", justifyContent: "flex-end" }}>
                        <Link href={`/membresias/${c.id}/soporte/${s.id}/editar`} className="link-ver">Editar</Link>
                        <BotonEliminarSoporte soporteId={s.id} clienteId={c.id} />
                      </div>
                    </td>
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
              <thead><tr><th>Mes</th><th>Tipo de cliente</th><th>Estado</th><th className="num">Valor</th></tr></thead>
              <tbody>
                {c.pagos.map((p) => (
                  <tr key={p.mes}>
                    <td>{p.mes.slice(0, 7)}</td>
                    <td className="td-concepto">{TIPO_LABEL[tipoEnMes(p.mes)] ?? "Estándar"}</td>
                    <td className="td-concepto">{ESTADO_MES[p.estadoMes] ?? p.estadoMes}</td>
                    <td className="num">{p.valor != null ? usd(p.valor) : "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
