import Link from "next/link";
import { notFound } from "next/navigation";
import { soloAdmin } from "@/lib/sesion";
import { cierreDelMes, totalizar } from "@/lib/reg";

export const metadata = { title: "Registro contable · cierre" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const nombreMes = (iso: string) => { const [a, m] = iso.split("-").map(Number); return new Date(a!, (m! - 1), 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" }); };

export default async function RegHistoricoMesPage({ params }: { params: Promise<{ mes: string }> }) {
  await soloAdmin();
  const { mes } = await params;
  if (!/^\d{4}-\d{2}$/.test(mes)) notFound();

  // Cierre = todos los renglones con registro ese mes (incluye inactivos y freelances).
  const renglones = await cierreDelMes(mes);
  const t = totalizar(renglones);
  const costosBanco = t.gmf + t.costoTransferencia + t.ivaTransferencia;

  return (
    <main className="wrap">
      <p className="volver"><Link href="/trd/reg">← Registro contable</Link></p>

      <div className="reg-head">
        <div>
          <h1 style={{ textTransform: "capitalize" }}>Cierre · {nombreMes(mes)}</h1>
          <p className="sub">{renglones.length} personas · {renglones.filter((r) => r.ckPagado).length} pagadas.</p>
        </div>
      </div>

      <div className="reg-totales">
        <div className="kpi"><span className="kpi-lbl">Cuentas de cobro</span><span className="kpi-num">{cop(t.cuentaCobro)}</span></div>
        <div className="kpi"><span className="kpi-lbl">ReteICA</span><span className="kpi-num neg">{cop(t.reteIca)}</span></div>
        <div className="kpi"><span className="kpi-lbl">ReteRenta</span><span className="kpi-num neg">{cop(t.reteRenta)}</span></div>
        <div className="kpi destacado"><span className="kpi-lbl">Total girado</span><span className="kpi-num">{cop(t.valorGirar)}</span></div>
      </div>

      {renglones.length === 0 ? (
        <div className="card"><p className="empty">No hay registros de {nombreMes(mes)}.</p></div>
      ) : (
        <div className="reg-tabla-wrap">
          <table className="reg-tabla">
            <thead>
              <tr>
                <th>Colaborador</th><th className="right">Pago fijo</th><th className="right">Comisión</th>
                <th className="right">Cuenta cobro</th><th className="right">ReteICA</th><th className="right">ReteRenta</th>
                <th className="right">A girar</th><th className="center">Pagado</th>
              </tr>
            </thead>
            <tbody>
              {renglones.map((r) => (
                <tr key={`${r.colaboradorId ?? "f"}-${r.pagoId}`}>
                  <td>{r.nombre}{r.esFreelance && <span className="freelance-tag" style={{ marginLeft: 6 }}>freelance</span>}</td>
                  <td className="right">{cop(r.pagoFijo)}</td>
                  <td className="right">{r.comision > 0 ? cop(r.comision) : "—"}</td>
                  <td className="right cf-mono" style={{ fontWeight: 700 }}>{cop(r.valorCuentaCobro)}</td>
                  <td className="right neg">{r.reteIca !== 0 ? cop(r.reteIca) : "—"}</td>
                  <td className="right neg">{r.reteRenta !== 0 ? cop(r.reteRenta) : "—"}</td>
                  <td className="right cf-mono">{cop(r.valorGirar)}</td>
                  <td className="center">{r.ckPagado ? <span className="estado-pagado">✓</span> : <span className="estado-pendiente">—</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="reg-costos" style={{ marginTop: 16 }}>
        <h2>Costos de la empresa (de los pagos de este mes)</h2>
        <div className="reg-costos-grid">
          <div className="kpi"><span className="kpi-lbl">4×1000 (GMF)</span><span className="kpi-num neg">{cop(t.gmf)}</span></div>
          <div className="kpi"><span className="kpi-lbl">Costo transferencia</span><span className="kpi-num neg">{cop(t.costoTransferencia)}</span></div>
          <div className="kpi"><span className="kpi-lbl">IVA transferencia</span><span className="kpi-num neg">{cop(t.ivaTransferencia)}</span></div>
          <div className="kpi destacado"><span className="kpi-lbl">Total costos banco</span><span className="kpi-num neg">{cop(costosBanco)}</span></div>
        </div>
      </div>
    </main>
  );
}
