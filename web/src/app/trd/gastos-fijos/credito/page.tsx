import { soloAdmin } from "@/lib/sesion";
import { listarCreditos, cuotasRestantes } from "@/lib/credito";
import { CreditoForm } from "@/components/CreditoForm";
import { actualizarCredito } from "./acciones";

export const metadata = { title: "Crédito" };
export const dynamic = "force-dynamic";

const cop = (n: number) =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);

export default async function CreditoPage() {
  await soloAdmin();
  const creditos = await listarCreditos();

  return (
    <main className="wrap">
      <h1>Crédito</h1>
      <p className="sub">Amortización y plan de prepago.</p>

      {creditos.length === 0 && <p className="empty">No hay créditos registrados.</p>}

      {creditos.map((c) => {
        const n = cuotasRestantes(c.saldo, c.cuota, c.tasaEa);
        const capital = Math.max(0, c.cuota - c.interesCorriente);
        return (
          <div key={c.id} className="card" style={{ marginBottom: 18 }}>
            <div className="card-head">
              <span className="who">{c.nombre}</span>
              <span className="cat">tasa {c.tasaEa}% E.A. · paga {c.diaPago}</span>
            </div>
            <div className="reg-totales" style={{ marginTop: 12 }}>
              <div className="kpi"><span className="kpi-lbl">Saldo</span><span className="kpi-num">{cop(c.saldo)}</span></div>
              <div className="kpi"><span className="kpi-lbl">Cuota</span><span className="kpi-num">{cop(c.cuota)}</span></div>
              <div className="kpi"><span className="kpi-lbl">Interés / capital</span><span className="kpi-num">{cop(c.interesCorriente)} / {cop(capital)}</span></div>
              <div className="kpi destacado"><span className="kpi-lbl">Cuotas restantes</span><span className="kpi-num">{n ?? "—"}</span></div>
            </div>
            <CreditoForm action={actualizarCredito} credito={c} />
          </div>
        );
      })}
    </main>
  );
}
