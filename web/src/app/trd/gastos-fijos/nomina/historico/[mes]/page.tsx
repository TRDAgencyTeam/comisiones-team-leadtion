import Link from "next/link";
import { notFound } from "next/navigation";
import { soloAdmin } from "@/lib/sesion";
import { tasaUsdCop } from "@/lib/fx";
import { nominaMesDetalle } from "@/lib/nomina";
import { AREAS } from "@/lib/catalogos";

export const metadata = { title: "Nómina · histórico" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: n < 100 ? 2 : 0 }).format(n);
const AREA_LABEL: Record<string, string> = Object.fromEntries(AREAS.map((a) => [a.value, a.label]));
const DEPT_COLORS = ["#6d5ac0", "#00a0a0", "#1e5080", "#0f9d6b", "#b45309", "#c0504f", "#2e2a6e"];
const MESES = ["enero", "febrero", "marzo", "abril", "mayo", "junio", "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"];
const mesLargo = (m: string) => { const [y, mm] = m.split("-").map(Number); return `${MESES[(mm ?? 1) - 1]} ${y}`; };

export default async function NominaHistoricoMesPage({ params }: { params: Promise<{ mes: string }> }) {
  await soloAdmin();
  const { mes } = await params;
  if (!/^\d{4}-\d{2}$/.test(mes)) notFound();

  const fx = await tasaUsdCop();
  const tasa = fx.cop;
  const { personas, estimado } = await nominaMesDetalle(mes, tasa);

  const totalCop = personas.reduce((s, p) => s + p.cop, 0);
  const totalUsd = personas.reduce((s, p) => s + p.usd, 0);

  const deptos = new Map<string, { count: number; cop: number; usd: number }>();
  for (const p of personas) {
    const k = p.area ?? "—";
    const d = deptos.get(k) ?? { count: 0, cop: 0, usd: 0 };
    d.count += 1; d.cop += p.cop; d.usd += p.usd; deptos.set(k, d);
  }

  return (
    <main className="wrap">
      <p className="volver"><Link href="/trd/gastos-fijos/nomina">← Nómina</Link></p>

      <div className="reg-head">
        <div>
          <h1 style={{ textTransform: "capitalize" }}>Nómina · {mesLargo(mes)}</h1>
          <p className="sub">
            {personas.length} personas · total {cop(totalCop)} ≈ {usd(totalUsd)}
            {estimado && <span className="nhc-est" style={{ marginLeft: 8 }}>estimado</span>}
          </p>
        </div>
      </div>

      {estimado && (
        <p className="reg-nota" style={{ marginTop: 0 }}>
          Este mes no tiene registro guardado; se reconstruyó desde los contratos vigentes ese mes con el salario actual.
          Si necesitas los valores exactos de ese mes, dímelos y los cargo.
        </p>
      )}

      {personas.length === 0 ? (
        <div className="card"><p className="empty">No hay nómina para {mesLargo(mes)}.</p></div>
      ) : (
        <>
          <h2 style={{ fontSize: "1rem", margin: "6px 0 10px" }}>Por departamento</h2>
          <div className="nom-deptos">
            {[...deptos.entries()].sort((a, b) => b[1].cop - a[1].cop).map(([area, d], i) => (
              <div key={area} className="nom-dept" style={{ borderLeftColor: DEPT_COLORS[i % DEPT_COLORS.length] }}>
                <div className="d-top">
                  <span className="d-name">{AREA_LABEL[area] ?? area}</span>
                  <span className="d-count">{d.count} {d.count === 1 ? "persona" : "personas"}</span>
                </div>
                <div className="d-usd">{usd(d.usd)}<small>/mes</small></div>
                <div className="d-cop">{cop(d.cop)}</div>
              </div>
            ))}
          </div>

          <div className="nom-tabla-wrap" style={{ marginTop: 16 }}>
            <table className="reg-tabla">
              <thead>
                <tr><th>Persona</th><th>Área</th><th className="right">COP</th><th className="right">USD</th></tr>
              </thead>
              <tbody>
                {personas.map((p, i) => (
                  <tr key={`${p.nombre}-${i}`}>
                    <td>{p.nombre}</td>
                    <td className="muted">{AREA_LABEL[p.area ?? ""] ?? p.area ?? "—"}</td>
                    <td className="right cf-mono" style={{ fontWeight: 700 }}>{cop(p.cop)}</td>
                    <td className="right muted">{usd(p.usd)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="fila-total">
                  <td>Total ({personas.length})</td><td></td>
                  <td className="right cf-mono">{cop(totalCop)}</td><td className="right">{usd(totalUsd)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}
    </main>
  );
}
