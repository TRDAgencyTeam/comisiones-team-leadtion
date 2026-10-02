import { soloAdmin } from "@/lib/sesion";
import { vistaLiquidacion, historialLiquidaciones, type Partida } from "@/lib/liquidacion";
import { tasasPorFecha } from "@/lib/fx-historial";
import { mesHoyISO } from "@/lib/fecha";
import { ClientesHeader } from "@/components/ClientesHeader";
import { BarChart } from "@/components/BarChart";
import { InputMonto } from "@/components/InputMonto";
import { LiquidacionGiroForm } from "@/components/LiquidacionGiroForm";
import { EliteAgentCampo } from "@/components/EliteAgentCampo";
import { IconoBorrar, IconoCheck } from "@/components/Iconos";
import { marcarPartida, agregarLinea, eliminarLinea, guardarTasaCalculo, reabrirLiquidacion } from "./acciones";

export const metadata = { title: "Liquidación mensual" };
export const dynamic = "force-dynamic";

const cop = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(n);
const usd = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(n);
const usd0 = (n: number) => new Intl.NumberFormat("es-CO", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
const nombreMes = (ym: string, corto = false) => {
  const [a, m] = ym.split("-").map(Number);
  const s = new Date(a!, m! - 1, 1).toLocaleDateString("es-CO", corto ? { month: "short", year: "2-digit" } : { month: "long", year: "numeric" });
  return s.charAt(0).toUpperCase() + s.slice(1);
};
const fFecha = (iso: string | null) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "short" }) : "—");

/** Agrupa partidas por grupo conservando el orden de aparición. */
function porGrupo(ps: Partida[]) {
  const m = new Map<string, Partida[]>();
  for (const p of ps) { if (!m.has(p.grupo)) m.set(p.grupo, []); m.get(p.grupo)!.push(p); }
  return [...m.entries()];
}

export default async function LiquidacionPage({ searchParams }: { searchParams: Promise<{ mes?: string }> }) {
  await soloAdmin();
  const sp = await searchParams;
  const mes = sp.mes && /^\d{4}-\d{2}$/.test(sp.mes) ? sp.mes : mesHoyISO();
  const [v, historial, tasasFecha] = await Promise.all([vistaLiquidacion(mes), historialLiquidaciones(), tasasPorFecha(90)]);
  const cerrada = v.liq?.estado === "cerrada";

  const grupos = porGrupo(v.partidas);
  const incluidos = grupos.filter(([g]) => !g.startsWith("Otros egresos"));
  const noIncluidos = grupos.filter(([g]) => g.startsWith("Otros egresos"));

  const cerradas = historial.filter((h) => h.estado === "cerrada" && h.usdEnviado);
  const anio = mes.slice(0, 4);
  const delAnio = cerradas.filter((h) => h.mes.startsWith(anio));
  const usdAnio = delAnio.reduce((s, h) => s + (h.usdEnviado ?? 0), 0);
  const copAnio = delAnio.reduce((s, h) => s + (h.copRecibido ?? 0), 0);
  const tasaProm = usdAnio > 0 ? copAnio / usdAnio : 0;
  const barras = [...cerradas].reverse().slice(-12).map((h) => ({
    label: nombreMes(h.mes, true), parts: [{ value: h.usdEnviado ?? 0, color: "var(--accent)", name: "USD bajados" }],
  }));

  const Fila = ({ p }: { p: Partida }) => (
    <div className={`liq-row${p.incluida ? "" : " off"}`}>
      {cerrada ? <span className="liq-ck on"><IconoCheck size={13} /></span> : (
        <form action={marcarPartida}>
          <input type="hidden" name="mes" value={mes} />
          <input type="hidden" name="clave" value={p.clave} />
          <input type="hidden" name="incluida" value={p.incluida ? "0" : "1"} />
          <button type="submit" className={`liq-ck${p.incluida ? " on" : ""}`} title={p.incluida ? "Quitar de la liquidación" : "Incluir en la liquidación"} aria-pressed={p.incluida}>
            {p.incluida && <IconoCheck size={13} />}
          </button>
        </form>
      )}
      <span className="liq-nom">{p.concepto}{p.detalle && <small>{p.detalle}</small>}</span>
      <b className="cf-mono">{cop(p.cop)}</b>
    </div>
  );

  return (
    <main className="cf">
      <ClientesHeader mes={mes} activo="liquidacion" tasa={v.tasaHoy} />

      <div className="cf-kpis">
        <div className="cf-kpi hero">
          <div className="lbl">{cerrada ? "USD bajados" : "USD a bajar (estimado)"}</div>
          <div className="big">{usd(cerrada ? v.liq!.usdEnviado ?? 0 : v.usdEstimado)}</div>
          <div className="sub">{cerrada ? `giro del ${fFecha(v.liq!.fechaGiro)} · tasa de la sacada ${cop(v.liq!.tasaBanco ?? 0)}` : `${cop(v.copTotal)} ÷ tasa ${cop(v.tasaCalculo)}`}</div>
        </div>
        <div className="cf-kpi"><div className="lbl">A cubrir en Colombia</div><div className="big">{cop(v.copNecesario)}</div><div className="sub">nómina, operativos, crédito, comisiones, caja y gastos en COL{v.eliteCop > 0 ? ` · + Elite ${cop(v.eliteCop)}` : ""}</div></div>
        <div className="cf-kpi"><div className="lbl">Adicional</div><div className="big">{cop(v.copAdicional)}</div><div className="sub">plata extra (no es gasto)</div></div>
        <div className="cf-kpi"><div className="lbl">Estado</div><div className="big" style={{ fontSize: "1.25rem" }}>{cerrada ? "Cerrada" : "Borrador"}</div>
          <div className="sub">{cerrada ? <>recibidos {cop(v.liq!.copRecibido ?? 0)}</> : "falta registrar el giro"}</div></div>
      </div>

      <div className="liq-grid">
        <div className="cf-card">
          <h3>Qué hay que cubrir · {nombreMes(mes)}</h3>
          {!cerrada && v.fuenteNomina === "egresos" && <p className="cf-hint" style={{ marginTop: 0 }}>REG de este mes aún no está generado: la nómina sale de Egresos (sin comisiones ni adicionales). Cuando generes REG se usa la cuenta de cobro completa.</p>}
          {incluidos.map(([g, ps]) => (
            <div key={g} className="liq-grupo">
              <div className="liq-gh"><span>{g}</span><b>{cop(ps.filter((p) => p.incluida).reduce((s, p) => s + p.cop, 0))}</b></div>
              {ps.map((p) => <Fila key={p.clave} p={p} />)}
            </div>
          ))}

          {(v.manuales.length > 0 || !cerrada) && (
            <div className="liq-grupo">
              <div className="liq-gh"><span>Otros a cubrir (manual)</span><b>{cop(v.manuales.reduce((s, m) => s + m.cop, 0))}</b></div>
              {v.manuales.map((m) => (
                <div key={m.id} className="liq-row"><span className="liq-ck on"><IconoCheck size={13} /></span><span className="liq-nom">{m.concepto}</span><b className="cf-mono">{cop(m.cop)}</b>
                  {!cerrada && <form action={eliminarLinea}><input type="hidden" name="id" value={m.id} /><button type="submit" className="btn-borrar icon-btn danger" title="Quitar"><IconoBorrar /></button></form>}
                </div>
              ))}
              {!cerrada && (
                <form action={agregarLinea} className="liq-add">
                  <input type="hidden" name="mes" value={mes} /><input type="hidden" name="origen" value="manual" />
                  <input name="concepto" placeholder="Concepto (ej. impuesto, reembolso…)" required />
                  <InputMonto name="cop" decimales={false} placeholder="COP" required />
                  <button type="submit" className="cf-btn cf-btn-ghost">+ Agregar</button>
                </form>
              )}
            </div>
          )}

          <div className="liq-grupo elite">
            <div className="liq-gh"><span>Elite Agent · Mauricio Ovalle</span><b>{cop(v.eliteCop)}</b></div>
            {cerrada ? (
              <div className="liq-row"><span className="liq-ck on"><IconoCheck size={13} /></span>
                <span className="liq-nom">Ingreso Elite Agent<small>{usd(v.eliteUsd)} × tasa de cálculo {cop(v.tasaCalculo)}</small></span>
                <b className="cf-mono">{cop(v.eliteCop)}</b></div>
            ) : (
              <EliteAgentCampo mes={mes} usdInicial={v.eliteUsd} tasa={v.tasaCalculo} />
            )}
          </div>

          <div className="liq-grupo adicional">
            <div className="liq-gh"><span>Adicional (no es gasto)</span><b>{cop(v.copAdicional)}</b></div>
            {v.adicionales.map((m) => (
              <div key={m.id} className="liq-row"><span className="liq-ck on"><IconoCheck size={13} /></span><span className="liq-nom">{m.concepto}</span><b className="cf-mono">{cop(m.cop)}</b>
                {!cerrada && <form action={eliminarLinea}><input type="hidden" name="id" value={m.id} /><button type="submit" className="btn-borrar icon-btn danger" title="Quitar"><IconoBorrar /></button></form>}
              </div>
            ))}
            {!cerrada && (
              <form action={agregarLinea} className="liq-add">
                <input type="hidden" name="mes" value={mes} /><input type="hidden" name="origen" value="adicional" />
                <input name="concepto" placeholder="Ej. utilidad, ahorro, abono a capital…" required />
                <InputMonto name="cop" decimales={false} placeholder="COP" required />
                <button type="submit" className="cf-btn cf-btn-ghost">+ Adicional</button>
              </form>
            )}
          </div>

          <div className="liq-total"><span>Total a bajar en pesos</span><b>{cop(v.copTotal)}</b></div>

          {!cerrada && noIncluidos.map(([g, ps]) => (
            <details key={g} className="liq-fuera">
              <summary>{g} · {ps.length} <small>herramientas, pagados en USA, sin medio de Colombia… márcalos si alguno sí va</small></summary>
              {ps.map((p) => <Fila key={p.clave} p={p} />)}
            </details>
          ))}
        </div>

        <div className="liq-side">
          <div className="cf-card">
            <h3>{cerrada ? "Giro registrado" : "1 · Tasa de cálculo"}</h3>
            {cerrada ? (
              <div className="liq-res">
                <div><span>Fecha del giro</span><b>{fFecha(v.liq!.fechaGiro)}</b></div>
                <div><span>USD enviados</span><b>{usd(v.liq!.usdEnviado ?? 0)}</b></div>
                <div><span>Tasa real de la sacada</span><b>{cop(v.liq!.tasaBanco ?? 0)}</b></div>
                <div><span>COP recibidos</span><b>{cop(v.liq!.copRecibido ?? 0)}</b></div>
                {v.liq!.comisionUsd ? <div><span>Costo del giro</span><b>{usd(v.liq!.comisionUsd)}</b></div> : null}
                <div className={`liq-cuadre ${(v.liq!.copRecibido ?? 0) - v.copTotal >= 0 ? "ok" : "falta"}`}>
                  <b>{(v.liq!.copRecibido ?? 0) - v.copTotal >= 0 ? `Saldo a favor en Ebenezer ≈ ${cop((v.liq!.copRecibido ?? 0) - v.copTotal)}` : `Faltaron ≈ ${cop(v.copTotal - (v.liq!.copRecibido ?? 0))}`}</b>
                  <small>Solo informativo: queda en las cuentas de Ebenezer y no se suma ni se resta al mes siguiente. Todo el cuadre se calculó con la tasa real de la sacada ({cop(v.liq!.tasaBanco ?? 0)}).</small>
                </div>
                {v.liq!.notas && <p className="cf-hint">{v.liq!.notas}</p>}
                <form action={reabrirLiquidacion}><input type="hidden" name="mes" value={mes} /><button type="submit" className="tasa-link">Reabrir para corregir</button></form>
              </div>
            ) : (
              <>
                <form action={guardarTasaCalculo} className="liq-tasa">
                  <input type="hidden" name="mes" value={mes} />
                  <InputMonto name="tasa" defaultValue={v.tasaCalculo} />
                  <button type="submit" className="cf-btn cf-btn-ghost">Usar</button>
                </form>
                <p className="cf-hint">Tasa del día: {cop(v.tasaHoy)}. Pon la que cuadres para estimar cuánto bajar: <b>{cop(v.copTotal)} ÷ {cop(v.tasaCalculo)} = {usd(v.usdEstimado)}</b>.</p>
              </>
            )}
          </div>
          {!cerrada && (
            <div className="cf-card">
              <h3>2 · Registrar el giro (tasa real de la sacada)</h3>
              <LiquidacionGiroForm mes={mes} usdEstimado={v.usdEstimado} copTotal={v.copTotal} tasaCalculo={v.tasaCalculo} tasaHoy={v.tasaHoy} tasasPorFecha={tasasFecha} />
            </div>
          )}
        </div>
      </div>

      <div className="cf-sec-head"><h2>Historial de giros <span className="count">{cerradas.length}</span></h2></div>
      <div className="cf-kpis" style={{ marginTop: 0 }}>
        <div className="cf-kpi"><div className="lbl">USD bajados en {anio}</div><div className="big">{usd0(usdAnio)}</div><div className="sub">{delAnio.length} giros</div></div>
        <div className="cf-kpi"><div className="lbl">COP recibidos en {anio}</div><div className="big">{cop(copAnio)}</div><div className="sub">a tasa del banco</div></div>
        <div className="cf-kpi"><div className="lbl">Tasa promedio del banco</div><div className="big">{tasaProm ? cop(tasaProm) : "—"}</div><div className="sub">ponderada por USD</div></div>
        <div className="cf-kpi"><div className="lbl">Promedio por mes</div><div className="big">{delAnio.length ? usd0(usdAnio / delAnio.length) : "—"}</div><div className="sub">USD por giro</div></div>
      </div>
      {barras.length > 0 && <div className="cf-card" style={{ marginTop: 14 }}><h3>USD bajados por mes</h3><BarChart data={barras} formatValue={usd0} ariaLabel="USD bajados por mes" /></div>}
      <div className="cf-table-wrap" style={{ marginTop: 14 }}>
        <table className="cf-table">
          <thead><tr><th>Mes</th><th>Fecha giro</th><th className="r">USD enviados</th><th className="r">Tasa cálculo</th><th className="r">Tasa banco</th><th className="r">COP recibidos</th><th className="r">Total a bajar (COP)</th><th className="r">Saldo en Ebenezer (aprox.)</th><th>Estado</th></tr></thead>
          <tbody>
            {historial.map((h) => {
              const total = (h.copNecesario ?? 0) + (h.eliteCop ?? 0) + (h.copAdicional ?? 0);
              const dif = h.copRecibido != null ? h.copRecibido - total : null;
              return (
                <tr key={h.mes}>
                  <td className="nom"><a href={`/trd/liquidacion?mes=${h.mes}`} className="link-ver">{nombreMes(h.mes)}</a></td>
                  <td>{fFecha(h.fechaGiro)}</td>
                  <td className="r">{h.usdEnviado != null ? usd(h.usdEnviado) : "—"}</td>
                  <td className="r cf-muted-num">{h.tasaCalculo ? cop(h.tasaCalculo) : "—"}</td>
                  <td className="r">{h.tasaBanco ? cop(h.tasaBanco) : "—"}</td>
                  <td className="r neto">{h.copRecibido != null ? cop(h.copRecibido) : "—"}</td>
                  <td className="r">{h.estado === "cerrada" ? cop(total) : "—"}</td>
                  <td className={`r ${dif != null && dif < 0 ? "liq-neg" : ""}`}>{dif != null ? cop(dif) : "—"}</td>
                  <td><span className={`cf-tag ${h.estado === "cerrada" ? "caja" : "util"}`}>{h.estado === "cerrada" ? "Cerrada" : "Borrador"}</span></td>
                </tr>
              );
            })}
            {historial.length === 0 && <tr><td colSpan={9} className="cf-empty" style={{ padding: 24 }}>Aún no hay liquidaciones. Al registrar el primer giro aparece aquí.</td></tr>}
          </tbody>
        </table>
      </div>
      <p className="cf-nota">
        El giro <b>no es un egreso</b>: es mover plata propia de TRD Investment (USA) a Ebenezer (Colombia). Los gastos ya están en Egresos y en la utilidad;
        aquí solo se registra cuánto se bajó, a qué tasa y si alcanzó. La nómina se toma completa (cuenta de cobro de REG, con comisiones y adicionales).
      </p>
    </main>
  );
}
