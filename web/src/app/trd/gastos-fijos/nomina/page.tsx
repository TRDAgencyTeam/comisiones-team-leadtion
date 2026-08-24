import Link from "next/link";
import { soloAdmin } from "@/lib/sesion";
import { tasaUsdCop } from "@/lib/fx";
import { listarNomina, diasParaVencer } from "@/lib/nomina";
import { AREAS } from "@/lib/catalogos";
import { cambiarEstadoPersona } from "./acciones";

export const metadata = { title: "Nómina" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: n < 100 ? 2 : 0 }).format(n);
const fmt = (iso: string | null) => iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", { day: "2-digit", month: "short", year: "numeric" }) : "—";
const AREA_LABEL: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.value, a.label]));

function ContratoTag({ fin }: { fin: string | null }) {
  const d = diasParaVencer(fin);
  if (d == null) return <span className="ct-tag ct-none">Sin contrato</span>;
  if (d < 0) return <span className="ct-tag ct-venc">Vencido</span>;
  if (d <= 30) return <span className="ct-tag ct-pronto">Vence en {d} d</span>;
  return <span className="ct-tag ct-ok">Vigente</span>;
}

export default async function NominaPage() {
  await soloAdmin();
  const [personas, fx] = await Promise.all([listarNomina(), tasaUsdCop()]);
  const activos = personas.filter((p) => p.activo);
  const totalCop = activos.reduce((s, p) => s + p.valorNomina, 0);
  const tasa = fx.cop;

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
          <h1>Nómina</h1>
          <p className="sub">{activos.length} activas · total {cop(totalCop)} ≈ {usd(mesUsd(totalCop))} / mes · tasa {cop(tasa)}.</p>
        </div>
        <Link href="/trd/gastos-fijos/nomina/nuevo" className="btn-primary">+ Agregar persona</Link>
      </div>

      <h2 style={{ fontSize: "1rem", margin: "6px 0 10px" }}>Por departamento</h2>
      <div className="reg-costos-grid">
        {[...deptos.entries()].sort((a, b) => b[1].cop - a[1].cop).map(([area, d]) => (
          <div key={area} className="kpi">
            <span className="kpi-lbl">{AREA_LABEL[area] ?? area} · {d.count}</span>
            <span className="kpi-num">{cop(d.cop)}</span>
            <span className="kpi-lbl">{usd(mesUsd(d.cop))} / mes</span>
          </div>
        ))}
      </div>

      <div className="reg-tabla-wrap" style={{ marginTop: 16 }}>
        <table className="reg-tabla">
          <thead>
            <tr>
              <th>Persona</th><th>Área</th>
              <th className="right">COP / mes</th><th className="right">USD / mes</th><th className="right">USD / año</th>
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
                  <td className="right">{p.valorNomina ? cop(p.valorNomina) : "—"}</td>
                  <td className="right">{p.valorNomina ? usd(m) : "—"}</td>
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
    </main>
  );
}
