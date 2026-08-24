import { soloAdmin } from "@/lib/sesion";
import { renglonesDelMes, totalizar, uvtDeMes, primerDiaMes } from "@/lib/reg";
import { RegFila } from "@/components/RegFila";
import { FreelanceForm } from "@/components/RegFreelance";

export const metadata = { title: "Registro contable" };
export const dynamic = "force-dynamic";

function mesActualISO(): string {
  const h = new Date();
  return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`;
}

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

const nombreMes = (iso: string) => {
  const [a, m] = iso.split("-").map(Number);
  return new Date(a!, (m! - 1), 1).toLocaleDateString("es-CO", { month: "long", year: "numeric" });
};

export default async function RegPage({
  searchParams,
}: {
  searchParams: Promise<{ mes?: string; error?: string; ok?: string }>;
}) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesActualISO();
  const [renglones, uvt] = await Promise.all([renglonesDelMes(mes), uvtDeMes(mes)]);
  const totales = totalizar(renglones);
  const primer = primerDiaMes(mes);

  return (
    <main className="wrap">
      <div className="reg-head">
        <div>
          <h1>Registro contable</h1>
          <p className="sub">
            Pago a colaboradores de <strong>{nombreMes(mes)}</strong> · UVT {cop(uvt)} · ICA 8,66‰ · calcula solo.
          </p>
        </div>
        <form method="get" className="reg-mes">
          <label htmlFor="mes">Mes</label>
          <input type="month" id="mes" name="mes" defaultValue={mes} />
          <button type="submit" className="btn-secondary">Ver</button>
        </form>
      </div>

      {sp.error && <p className="alerta">{decodeURIComponent(sp.error)}</p>}
      {sp.ok && <p className="ok-msg">{decodeURIComponent(sp.ok)}</p>}

      <div className="reg-totales">
        <div className="kpi"><span className="kpi-lbl">Cuentas de cobro</span><span className="kpi-num">{cop(totales.cuentaCobro)}</span></div>
        <div className="kpi"><span className="kpi-lbl">ReteICA</span><span className="kpi-num neg">{cop(totales.reteIca)}</span></div>
        <div className="kpi"><span className="kpi-lbl">ReteRenta</span><span className="kpi-num neg">{cop(totales.reteRenta)}</span></div>
        <div className="kpi destacado"><span className="kpi-lbl">Total a girar</span><span className="kpi-num">{cop(totales.valorGirar)}</span></div>
        <div className="kpi"><span className="kpi-lbl">Pendientes por pagar</span><span className="kpi-num">{totales.pendientes}</span></div>
      </div>

      <div className="reg-tabla-wrap">
        <table className="reg-tabla">
          <thead>
            <tr>
              <th>Colaborador</th>
              <th className="right">Mes anterior</th>
              <th className="right">Pago fijo</th>
              <th>Adicional</th>
              <th className="right">Comisión</th>
              <th className="right">Total</th>
              <th className="right">ReteICA</th>
              <th className="right">ReteRenta</th>
              <th className="right">A girar</th>
              <th className="center">Correo</th>
              <th className="center">Drive</th>
              <th className="center">Registro</th>
              <th className="center">Pagado</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {renglones.map((r) => (
              <RegFila key={`${r.colaboradorId ?? "f"}-${r.pagoId ?? "new"}-${r.nombre}`} r={r} mes={mes} uvt={uvt} />
            ))}
            {renglones.length === 0 && (
              <tr><td colSpan={14} className="vacio">No hay personas activas. Créalas en Gastos Fijos → Nómina.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="reg-costos">
        <h2>Costos de la empresa (solo pagos ya marcados como pagados)</h2>
        <div className="reg-costos-grid">
          <div className="kpi"><span className="kpi-lbl">4×1000 (GMF)</span><span className="kpi-num neg">{cop(totales.gmf)}</span></div>
          <div className="kpi"><span className="kpi-lbl">Costo transferencia</span><span className="kpi-num neg">{cop(totales.costoTransferencia)}</span></div>
          <div className="kpi"><span className="kpi-lbl">IVA transferencia</span><span className="kpi-num neg">{cop(totales.ivaTransferencia)}</span></div>
          <div className="kpi destacado"><span className="kpi-lbl">Total costos banco</span><span className="kpi-num neg">{cop(totales.gmf + totales.costoTransferencia + totales.ivaTransferencia)}</span></div>
        </div>
        <p className="reg-nota" style={{ marginTop: 8 }}>
          Estos costos los asume Ebenezer (no se le descuentan al colaborador). Bancolombia y Nequi no tienen costo de
          transferencia; otros bancos $7.590 + IVA 19%. El 4×1000 es 0,4% del valor girado.
        </p>
      </div>

      <FreelanceForm mes={mes} />
      <p className="reg-nota">
        El <strong>costo de transferencia</strong> lo asume Ebenezer y no se descuenta al colaborador. Marca los
        4 estados a medida que completas el proceso; más adelante el sistema enviará el correo al colaborador
        automáticamente y te avisará de pendientes por pagar. Referencia del día del pago: {primer}.
      </p>
    </main>
  );
}
