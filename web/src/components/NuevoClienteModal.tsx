"use client";

import { useMemo, useState } from "react";
import { CATEGORIA_LABEL, type ServicioCatalogo } from "@/lib/catalogo-tipos";
import { MEDIOS, ESTADOS } from "@/lib/facturacion-calc";
import { crearClienteCascada } from "@/app/trd/clientes/acciones";

export function NuevoClienteModal({
  mes, catalogo, afiliados, colaboradores,
}: {
  mes: string;
  catalogo: ServicioCatalogo[];
  afiliados: { ref: string; nombre: string; tipo: string }[];
  colaboradores: { id: number; nombre: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [entidad, setEntidad] = useState<"LLC" | "COL">("LLC");
  const [clave, setClave] = useState(catalogo[0]?.clave ?? "");

  const srv = useMemo(() => catalogo.find((c) => c.clave === clave), [catalogo, clave]);
  const meses = srv?.recurrente ? [1, 2, 3, 4] : [1];
  const preciosDefault = (n: number) => {
    if (!srv || srv.precioVariable) return "";
    return String(n === 1 ? (srv.precioMes1 ?? "") : (srv.precioResto ?? srv.precioMes1 ?? ""));
  };
  const moneda = entidad === "COL" ? "COP" : "USD";

  const grupos = useMemo(() => {
    const g: Record<string, ServicioCatalogo[]> = {};
    for (const c of catalogo) (g[c.categoria] ??= []).push(c);
    return g;
  }, [catalogo]);

  return (
    <>
      <button type="button" className="cf-btn cf-btn-primary" onClick={() => setOpen(true)}>+ Nuevo cliente</button>
      {open && (
        <div className="cf-scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="cf-modal">
            <div className="cf-modal-head">
              <h3>Nuevo cliente</h3>
              <button type="button" className="x" onClick={() => setOpen(false)}>✕</button>
            </div>
            <form action={crearClienteCascada}>
              <input type="hidden" name="mes" value={mes} />
              <input type="hidden" name="entidad" value={entidad} />
              <input type="hidden" name="servicioClave" value={clave} />
              <div className="cf-modal-body">
                <div className="cf-f">
                  <label>Nombre del cliente</label>
                  <input name="nombre" required placeholder="Nombre del cliente" />
                </div>

                <div className="cf-f">
                  <label>Entidad</label>
                  <div className="cf-seg">
                    <label><input type="radio" name="_ent" checked={entidad === "LLC"} onChange={() => setEntidad("LLC")} /><span>LLC · EE.UU. (USD)</span></label>
                    <label><input type="radio" name="_ent" checked={entidad === "COL"} onChange={() => setEntidad("COL")} /><span>Colombia (COP)</span></label>
                  </div>
                </div>

                <div className="cf-f">
                  <label>Servicio</label>
                  <select value={clave} onChange={(e) => setClave(e.target.value)}>
                    {Object.entries(grupos).map(([cat, items]) => (
                      <optgroup key={cat} label={CATEGORIA_LABEL[cat] ?? cat}>
                        {items.map((i) => <option key={i.clave} value={i.clave}>{i.nombre}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {srv?.recurrente && (
                  <div className="cf-autonote">✓ Recurrente{srv.minMeses > 1 ? ` · contrato mínimo ${srv.minMeses} meses` : ""}. Se factura solo cada mes; al terminar el contrato pide confirmar continuidad.</div>
                )}

                <div className="cf-f">
                  <label>{srv?.precioVariable ? `Precio (${moneda}) — este cliente` : `Precio por mes (${moneda}) — editable`}</label>
                  <div className="cf-price-grid" style={{ gridTemplateColumns: `repeat(${meses.length}, 1fr)` }}>
                    {meses.map((m) => (
                      <div className="pc" key={m}>
                        <label>Mes {m}</label>
                        <input name={`precioMes${m}`} inputMode="decimal" defaultValue={preciosDefault(m)} placeholder={srv?.precioVariable ? "—" : ""} />
                      </div>
                    ))}
                  </div>
                  {srv?.precioVariable && <span className="cf-hint">Servicio de valor variable: escribe el valor acordado con el cliente.</span>}
                </div>

                <div className="cf-f">
                  <label>Fecha de activación</label>
                  <input type="date" name="fechaActivacion" defaultValue={`${mes}-01`} />
                </div>

                <div className="cf-f">
                  <label>Medio de pago</label>
                  <select name="medio" defaultValue={entidad === "COL" ? "bancolombia" : "stripe"}>
                    {MEDIOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                  </select>
                </div>

                <div className="cf-f">
                  <label>Estado inicial</label>
                  <select name="estado" defaultValue="por_facturar">
                    {ESTADOS.filter((e) => e.value !== "anulado" && e.value !== "por_confirmar").map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
                  </select>
                </div>

                {srv?.aplicaCs && (
                  <div className="cf-f">
                    <label>Customer Success (comisiona su cuenta Leadtion)</label>
                    <div className="cf-donut-legend" style={{ gap: 6 }}>
                      {colaboradores.map((c) => (
                        <label key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 500, color: "var(--text)" }}>
                          <input type="checkbox" name="asignados" value={c.id} style={{ width: "auto" }} /> {c.nombre}
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {!srv?.aplicaCs && (
                  <span className="cf-hint">Este servicio no comisiona CS (no incluye cuenta Leadtion).</span>
                )}

                {srv?.aplicaReferido && (
                  <div className="cf-f">
                    <label>Referido por afiliado (solo Leadtion)</label>
                    <select name="afiliadoRef" defaultValue="">
                      <option value="">— Ninguno —</option>
                      {afiliados.map((a) => <option key={a.ref} value={a.ref}>{a.nombre} ({a.tipo})</option>)}
                    </select>
                  </div>
                )}

                {srv?.aplicaReserva && (
                  <div className="cf-f">
                    <label style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <input type="checkbox" name="reserva" value="1" style={{ width: "auto" }} /> Vino con reserva
                    </label>
                  </div>
                )}
              </div>
              <div className="cf-modal-foot">
                <button type="button" className="cf-btn cf-btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                <button type="submit" className="cf-btn cf-btn-primary">Crear cliente</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
