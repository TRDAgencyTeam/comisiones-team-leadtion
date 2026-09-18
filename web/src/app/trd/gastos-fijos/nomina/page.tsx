import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { tasaUsdCop } from "@/lib/fx";
import { listarNomina, diasParaVencer, historicoNominaPasado } from "@/lib/nomina";
import { asegurarEgresosFijosDelMes } from "@/lib/egresos";
import { AREAS } from "@/lib/catalogos";
import { cambiarEstadoPersona } from "./acciones";

export const metadata = { title: "Nómina" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: n < 100 ? 2 : 0 }).format(n);
const fmt = (iso: string | null) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const AREA_LABEL: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.value, a.label]));
const DEPT_COLORS = ["#6d5ac0", "#00a0a0", "#1e5080", "#0f9d6b", "#b45309", "#c0504f", "#2e2a6e"];
const MESES = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
const mesLargo = (m: string) => { const [y, mm] = m.split("-").map(Number); return `${MESES[(mm ?? 1) - 1]} ${y}`; };

function ContratoTag({ fin }: { fin: string | null }) {
  const d = diasParaVencer(fin);
  if (d == null) return <span className="ct-tag ct-none">Sin contrato</span>;
  if (d < 0) return <span className="ct-tag ct-venc">Vencido</span>;
  if (d <= 30) return <span className="ct-tag ct-pronto">Vence en {d} d</span>;
  return <span className="ct-tag ct-ok">Vigente</span>;
}

export default async function NominaPage() {
  await soloAdmin();
  const mesActual = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, "0")}`;
  await asegurarEgresosFijosDelMes(mesActual); // deja el snapshot del mes en curso para el histórico
  const [personas, fx] = await Promise.all([listarNomina(), tasaUsdCop()]);
  const tasa = fx.cop;
  const historico = await historicoNominaPasado(3, tasa); // ago, jul, jun (meses pasados)
  // Nómina = personas activas CON valor de nómina (los freelances en $0 no cuentan).
  const conNomina = personas.filter((p) => p.activo && p.valorNomina > 0);
  const totalCop = conNomina.reduce((s, p) => s + p.valorNomina, 0);
  const activos = conNomina;

  // Costos por departamento (área) de los activos.
  const deptos = new Map<string, { count: number; cop: number }>();
  for (const p of activos) {
    const key = p.area ?? "—";
    const d = deptos.get(key) ?? { count: 0, cop: 0 };
    d.count += 1; d.cop += p.valorNomina; deptos.set(key, d);
  }

  const mesUsd = (c: number) => (tasa > 0 ? c / tasa : 0);

  return (
    <main className="wrap">
      <div className="reg-head">
        <div>
          <h1>Nómina a {mesLargo(mesActual)}</h1>
          <p className="sub">{activos.length} activas · total {cop(totalCop)} ≈ {usd(mesUsd(totalCop))} / mes · tasa {cop(tasa)}.</p>
        </div>
        <Link href="/trd/gastos-fijos/nomina/nuevo" className="btn-primary">+ Agregar persona</Link>
      </div>

      <h2 style={{ fontSize: "1rem", margin: "6px 0 10px" }}>Por departamento</h2>
      <div className="nom-deptos">
        {[...deptos.entries()].sort((a, b) => b[1].cop - a[1].cop).map(([area, d], i) => (
          <div key={area} className="nom-dept" style={{ borderLeftColor: DEPT_COLORS[i % DEPT_COLORS.length] }}>
            <div className="d-top">
              <span className="d-name">{AREA_LABEL[area] ?? area}</span>
              <span className="d-count">{d.count} {d.count === 1 ? "persona" : "personas"}</span>
            </div>
            <div className="d-usd">{usd(mesUsd(d.cop))}<small>/mes</small></div>
            <div className="d-cop">{cop(d.cop)}</div>
          </div>
        ))}
      </div>

      <div className="nom-tabla-wrap" style={{ marginTop: 16 }}>
        <table className="reg-tabla">
          <thead>
            <tr>
              <th>Persona</th><th>Área</th>
              <th className="right">USD / mes</th><th className="right">COP / mes</th><th className="right">USD / año</th>
              <th className="right">USD / día</th><th className="right">USD / hora</th>
              <th>Fin contrato</th><th>Estado</th><th></th>
            </tr>
          </thead>
          <tbody>
            {personas.map((p) => {
              const m = mesUsd(p.valorNomina);
              return (
                <tr key={p.id} className={p.activo ? "" : "fila-inactiva"}>
                  <td>
                    <Link href={`/trd/gastos-fijos/nomina/${p.id}`} className="link-ver">{p.nombre}</Link>
                    {!p.activo && <span className="freelance-tag" style={{ marginLeft: 6 }}>inactiva</span>}
                  </td>
                  <td className="muted">{p.area ?? "—"}</td>
                  <td className="right cf-mono" style={{ fontWeight: 700 }}>{p.valorNomina ? usd(m) : "—"}</td>
                  <td className="right muted">{p.valorNomina ? cop(p.valorNomina) : "—"}</td>
                  <td className="right muted">{p.valorNomina ? usd(m * 12) : "—"}</td>
                  <td className="right muted">{p.valorNomina ? usd(m / 30) : "—"}</td>
                  <td className="right muted">{p.valorNomina ? usd(m / 30 / 8) : "—"}</td>
                  <td className="muted">{fmt(p.fechaFinContrato)}</td>
                  <td><ContratoTag fin={p.fechaFinContrato} /></td>
                  <td>
                    <form action={cambiarEstadoPersona}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="activar" value={p.activo ? "0" : "1"} />
                      <button type="submit" className="btn-secondary btn-guardar">{p.activo ? "Desactivar" : "Activar"}</button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {personas.length === 0 && <tr><td colSpan={10} className="vacio">Aún no hay personas.</td></tr>}
          </tbody>
        </table>
      </div>

      <p className="reg-nota">
        Valores por hora asumen 8 h/día y 30 días/mes (como en el Excel). Las personas activas aparecen en Registro contable.
      </p>

      <section style={{ marginTop: 28 }}>
        <h2 style={{ fontSize: "1.05rem", margin: "0 0 4px" }}>Histórico mensual</h2>
        <p className="sub" style={{ margin: "0 0 12px" }}>Nómina de meses anteriores. Toca un mes para ver su cuadro completo.</p>
        <div className="nom-hist-grid">
          {historico.map((h) => (
            <Link key={h.mes} href={`/trd/gastos-fijos/nomina/historico/${h.mes}`} className="nom-hist-card">
              <div className="nhc-top">
                <span className="nhc-mes">{mesLargo(h.mes)}</span>
                <span className="nhc-chip">{h.personas} {h.personas === 1 ? "persona" : "personas"}</span>
              </div>
              <div className="nhc-cop">{cop(h.cop)}</div>
              <div className="nhc-foot">
                <span className="nhc-usd">≈ {usd(h.usd)}</span>
                {h.estimado && <span className="nhc-est" title="Reconstruido desde la nómina actual (sin snapshot de ese mes)">estimado</span>}
                <span className="nhc-ver">Ver cuadro →</span>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  );
}
