import { soloAdmin } from "@/lib/sesion";
import { consulta } from "@/lib/db";
import { primerDiaMes } from "@/lib/facturacion";
import { resumenDelMes, tendenciaMensual } from "@/lib/egresos";
import { ClientesHeader } from "@/components/ClientesHeader";

export const metadata = { title: "Resumen del mes" };
export const dynamic = "force-dynamic";

const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const usd2 = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const mesISO = () => { const h = new Date(); return `${h.getFullYear()}-${String(h.getMonth() + 1).padStart(2, "0")}`; };

const COLORS = ["var(--brand-indigo)", "#6d5ac0", "var(--brand-cyan)", "#f0a54a", "#8fb0ff"];

/** Línea de tendencia (área + endpoint). Sparse-safe. */
function LineaTendencia({ datos }: { datos: { mes: string; neta: number; ingresos: number }[] }) {
  const conDatos = datos.filter((d) => d.ingresos > 0);
  if (conDatos.length < 2) {
    return <p className="cf-nota" style={{ marginTop: 4 }}>La tendencia se dibuja a partir del 2º mes con datos. Este es el primer mes cargado.</p>;
  }
  const w = 640, h = 190, pad = 16;
  const vals = datos.map((d) => d.ingresos);
  const max = Math.max(...vals) * 1.12, min = Math.min(...vals.filter((v) => v > 0)) * 0.85;
  const x = (i: number) => pad + i * (w - pad * 2) / (datos.length - 1);
  const y = (v: number) => h - pad - ((v - min) / (max - min || 1)) * (h - pad * 2);
  const pts = datos.map((d, i) => [x(i), y(d.ingresos)] as const);
  const line = pts.map((p, i) => `${i ? "L" : "M"}${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(" ");
  const last = pts[pts.length - 1]!;
  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} preserveAspectRatio="none" role="img" aria-label="Tendencia de ingresos">
      <defs><linearGradient id="cfg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#6d5ac0" stopOpacity="0.28" /><stop offset="1" stopColor="#6d5ac0" stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${w - pad} ${h - pad} L${pad} ${h - pad} Z`} fill="url(#cfg)" />
      <path d={line} fill="none" stroke="#6d5ac0" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={last[0]} cy={last[1]} r="5" fill="#6d5ac0" stroke="var(--panel)" strokeWidth="2.5" />
    </svg>
  );
}

/** Dona de ingresos por fuente. */
function Donut({ fuentes, total }: { fuentes: { etiqueta: string; valor: number }[]; total: number }) {
  const top = [...fuentes].sort((a, b) => b.valor - a.valor).slice(0, 5);
  const C = 2 * Math.PI * 46;
  let offset = 0;
  const arcs = top.map((f, i) => {
    const len = total > 0 ? (f.valor / total) * C : 0;
    const el = { len, offset, color: COLORS[i % COLORS.length]! };
    offset -= len;
    return el;
  });
  return (
    <div className="cf-donut">
      <svg viewBox="0 0 120 120" width="128" height="128" role="img" aria-label="Ingresos por fuente">
        <circle cx="60" cy="60" r="46" fill="none" stroke="var(--border)" strokeWidth="16" />
        {arcs.map((a, i) => (
          <circle key={i} cx="60" cy="60" r="46" fill="none" stroke={a.color} strokeWidth="16"
            strokeDasharray={`${a.len.toFixed(1)} ${(C - a.len).toFixed(1)}`} strokeDashoffset={a.offset.toFixed(1)}
            transform="rotate(-90 60 60)" strokeLinecap="butt" />
        ))}
        <text x="60" y="57" textAnchor="middle" fontWeight="700" fontSize="15" fill="var(--text)">{usd(total)}</text>
        <text x="60" y="72" textAnchor="middle" fontSize="8" fill="var(--muted)">total</text>
      </svg>
      <div className="cf-donut-legend">
        {top.map((f, i) => (
          <div key={i} className="row"><span><i style={{ color: COLORS[i % COLORS.length], background: COLORS[i % COLORS.length] }} />{f.etiqueta}</span><b>{usd(f.valor)}</b></div>
        ))}
      </div>
    </div>
  );
}

function delta(actual: number, previo: number): { txt: string; dn: boolean } | null {
  if (!previo || previo <= 0) return null;
  const p = Math.round(((actual - previo) / previo) * 100);
  return { txt: `${p >= 0 ? "▲" : "▼"} ${Math.abs(p)}%`, dn: p < 0 };
}

export default async function ResumenPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesISO();

  const [r, tendencia, cnt] = await Promise.all([
    resumenDelMes(mes),
    tendenciaMensual(mes, 8),
    consulta(
      `select count(*) filter (where recurrente) rec, count(*) filter (where not recurrente) mom
         from public.factura_mensual where mes = $1 and estado <> 'anulado'`,
      [primerDiaMes(mes)],
    ),
  ]);
  const rec = Number(cnt[0]?.rec ?? 0), mom = Number(cnt[0]?.mom ?? 0);
  const prev = tendencia.length >= 2 ? tendencia[tendencia.length - 2]! : null;
  const dIng = prev ? delta(r.ingresos.total, prev.ingresos) : null;
  const dNeta = prev ? delta(r.utilidadNeta, prev.neta) : null;

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="resumen" tasa={r.tasa} />

      <div className="cf-kpis">
        <div className="cf-kpi hero">
          <div className="lbl">Total ingresos del mes</div>
          <div className="big">{usd(r.ingresos.total)}</div>
          <div className="sub">USD · {new Intl.NumberFormat("es-CO", { notation: "compact", maximumFractionDigits: 1 }).format(r.ingresos.total * r.tasa)} COP</div>
          {dIng && <div className="cf-delta">{dIng.txt} vs. mes anterior</div>}
        </div>
        <div className="cf-kpi"><div className="lbl">Utilidad bruta del mes</div><div className="big">{usd(r.utilidadBruta)}</div><div className="sub">ingresos − gastos</div></div>
        <div className="cf-kpi"><div className="lbl">Utilidad neta</div><div className="big">{usd(r.utilidadNeta)}</div><div className="sub">{r.margen}% de margen</div>{dNeta && <div className={`cf-delta${dNeta.dn ? " dn" : ""}`}>{dNeta.txt}</div>}</div>
        <div className="cf-kpi"><div className="lbl">Clientes activos</div><div className="big">{rec + mom}</div><div className="sub">{rec} recurrentes · {mom} del momento</div></div>
      </div>

      <div className="cf-charts">
        <div className="cf-card">
          <h3>Tendencia de ingresos <span className="cf-legend"><i style={{ background: "#6d5ac0" }} />netos por mes</span></h3>
          <LineaTendencia datos={tendencia} />
        </div>
        <div className="cf-card"><h3>Ingresos por fuente</h3><Donut fuentes={r.ingresos.porFuente} total={r.ingresos.total} /></div>
      </div>

      <div className="cf-ie">
        <div className="cf-card">
          <h3>Ingresos</h3>
          <div className="cf-li"><span>Clientes USA (LLC)</span><b>{usd2(r.ingresos.clientesUsa)}</b></div>
          <div className="cf-li"><span>Clientes Colombia</span><b>{usd2(r.ingresos.clientesCol)}</b></div>
          {r.ingresos.otros.map((o) => (<div key={o.id} className="cf-li"><span>{o.concepto}</span><b>{usd2(o.valorUsd)}</b></div>))}
          <div className="cf-li tot"><span>Total ingresos</span><b>{usd2(r.ingresos.total)}</b></div>
        </div>
        <div className="cf-card">
          <h3>Gastos (afectan la utilidad)</h3>
          {r.egresos.afectanUtilidad.map((e) => (<div key={e.id} className="cf-li"><span>{e.concepto}</span><b>{usd2(e.valorUsd)}</b></div>))}
          {r.egresos.afectanUtilidad.length === 0 && <div className="cf-li"><span>Sin gastos registrados</span><b>—</b></div>}
          <div className="cf-li tot"><span>Total gastos</span><b>{usd2(r.egresos.totalAfectan)}</b></div>
        </div>
      </div>

      <div className="cf-util-strip">
        <div className="cf-util"><div className="lbl">Utilidad bruta</div><div className="v">{usd2(r.utilidadBruta)}</div></div>
        <div className="cf-util"><div className="lbl">Diezmo (10%)</div><div className="v">−{usd2(r.diezmo)}</div></div>
        <div className="cf-util net"><div className="lbl">Utilidad neta</div><div className="v">{usd2(r.utilidadNeta)}</div></div>
      </div>

      <p className="cf-nota">El diezmo (10% de la utilidad) es automático y sale de caja. Los egresos que “salen de caja” no bajan la utilidad del mes; los ves en la pestaña Egresos.</p>
    </main>
  );
}
