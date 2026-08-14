import Link from "next/link";
import { notFound } from "next/navigation";
import { obtenerMembresia, PLAN_LABEL } from "@/lib/membresias";

export const dynamic = "force-dynamic";

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });
const API_LABEL: Record<string, string> = { incluida: "Incluida ($10 costo)", vendida: "Vendida $12 (gana $2)", ninguna: "Sin API" };
const ESTADO: Record<string, { txt: string; cls: string }> = {
  activo: { txt: "Activo", cls: "estado-pagado" }, pausado: { txt: "Pausado", cls: "estado-pausado" }, cancelado: { txt: "Cancelado", cls: "estado-cancelado" },
};

export default async function FichaMembresiaPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const c = await obtenerMembresia(Number(id));
  if (!c) notFound();
  const badge = ESTADO[c.estado] ?? { txt: c.estado, cls: "" };

  return (
    <main className="wrap">
      <p className="volver"><Link href="/membresias">← Clientes</Link></p>
      <header className="page page-head-row">
        <div>
          <h1>{c.nombre}</h1>
          <p>
            <span className={badge.cls}>{badge.txt}</span>
            {c.esAgencia ? " · " : ""}{c.esAgencia && <span className="tag-agencia">Agencia</span>}
            {c.reserva ? " · " : ""}{c.reserva && <span className="tag-partner">Reserva</span>}
          </p>
        </div>
        <Link href={`/clientes/${c.id}`} className="btn-secondary">Ver en Comisiones CS →</Link>
      </header>

      <section className="card">
        <div className="datos-grid">
          <div><span className="dato-label">Plan de entrada</span>{c.planTipo ? PLAN_LABEL[c.planTipo] : "Estándar"}</div>
          <div><span className="dato-label">Soporte</span>{c.soporteValor ? usd(c.soporteValor) : "Básico (incluido)"}</div>
          <div><span className="dato-label">API WhatsApp</span>{c.apiEstado ? API_LABEL[c.apiEstado] : "—"}</div>
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
                  <tr key={p.mes}><td>{p.mes.slice(0, 7)}</td><td className="td-concepto">{p.estadoMes}</td><td className="num">{p.valor != null ? usd(p.valor) : "—"}</td></tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
