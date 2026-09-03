"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIA_LABEL, type ServicioCatalogo } from "@/lib/catalogo-tipos";
import { MEDIOS, ESTADOS } from "@/lib/facturacion-calc";
import { crearClienteCascada } from "@/app/trd/clientes/acciones";

const money = (n: number, moneda: "USD" | "COP") =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: moneda, maximumFractionDigits: moneda === "COP" ? 0 : 2 }).format(n);

export function NuevoClienteModal({
  mes, tasa, catalogo, afiliados, colaboradores, clientes = [],
}: {
  mes: string;
  tasa: number;
  catalogo: ServicioCatalogo[];
  afiliados: { ref: string; nombre: string; tipo: string }[];
  colaboradores: { id: number; nombre: string }[];
  clientes?: { id: number; nombre: string }[];
}) {
  const [open, setOpen] = useState(false);
  const [entidad, setEntidad] = useState<"LLC" | "COL">("LLC");
  const [clave, setClave] = useState(catalogo[0]?.clave ?? "");
  const [personas, setPersonas] = useState(1);
  const [precios, setPrecios] = useState<string[]>([]);
  const [existenteId, setExistenteId] = useState("");

  const srv = useMemo(() => catalogo.find((c) => c.clave === clave), [catalogo, clave]);
  const moneda = entidad === "COL" ? "COP" : "USD";
  const nMeses = srv?.recurrente && !srv?.porPersona ? 4 : 1;

  // Recalcula los precios por defecto al cambiar servicio / entidad / personas.
  useEffect(() => {
    if (!srv) return;
    const conv = (usd: number | null): string => {
      if (usd == null) return "";
      const v = entidad === "COL" ? Math.round(usd * tasa) : Math.round(usd);
      return String(v);
    };
    if (srv.porPersona) {
      const totalUsd = (srv.precioPersona ?? 0) * Math.max(1, personas);
      setPrecios([conv(totalUsd)]);
    } else if (srv.recurrente) {
      setPrecios([conv(srv.precioMes1), conv(srv.precioResto ?? srv.precioMes1), conv(srv.precioResto ?? srv.precioMes1), conv(srv.precioResto ?? srv.precioMes1)]);
    } else {
      setPrecios([conv(srv.precioMes1)]);
    }
  }, [clave, entidad, personas, srv, tasa]);

  // Bloquea el scroll del fondo mientras el popup está abierto.
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  const grupos = useMemo(() => {
    const g: Record<string, ServicioCatalogo[]> = {};
    for (const c of catalogo) (g[c.categoria] ??= []).push(c);
    return g;
  }, [catalogo]);

  const setPrecio = (i: number, v: string) => setPrecios((p) => p.map((x, j) => (j === i ? v : x)));

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
              {srv?.porPersona && <input type="hidden" name="personas" value={personas} />}
              <div className="cf-modal-body">
                {clientes.length > 0 && (
                  <div className="cf-f">
                    <label>¿Cliente existente? (opcional)</label>
                    <input type="hidden" name="clienteExistenteId" value={existenteId} />
                    <select value={existenteId} onChange={(e) => setExistenteId(e.target.value)}>
                      <option value="">— Es un cliente nuevo —</option>
                      {clientes.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
                    </select>
                    {existenteId && <span className="cf-hint">Se usará el cliente existente y se le agrega este plan (no se crea un duplicado).</span>}
                  </div>
                )}
                {!existenteId && (
                  <div className="cf-f">
                    <label>Nombre del cliente</label>
                    <input name="nombre" required placeholder="Nombre del cliente" />
                  </div>
                )}

                <div className="cf-f">
                  <label>Entidad</label>
                  <div className="cf-seg">
                    <label><input type="radio" name="_ent" checked={entidad === "LLC"} onChange={() => setEntidad("LLC")} /><span>LLC · EE.UU. (USD)</span></label>
                    <label><input type="radio" name="_ent" checked={entidad === "COL"} onChange={() => setEntidad("COL")} /><span>Colombia (COP)</span></label>
                  </div>
                </div>

                <div className="cf-f">
                  <label>Servicio</label>
                  <select value={clave} onChange={(e) => { setClave(e.target.value); setPersonas(1); }}>
                    {Object.entries(grupos).map(([cat, items]) => (
                      <optgroup key={cat} label={CATEGORIA_LABEL[cat] ?? cat}>
                        {items.map((i) => <option key={i.clave} value={i.clave}>{i.nombre}</option>)}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {srv?.recurrente && !srv?.porPersona && (
                  <div className="cf-autonote">✓ Recurrente{srv.minMeses > 1 ? ` · contrato mínimo ${srv.minMeses} meses` : ""}. Se factura solo cada mes; al terminar el contrato pide confirmar continuidad.</div>
                )}

                {srv?.porPersona && (
                  <div className="cf-f">
                    <label>Cantidad de {srv.unidad === "hora" ? "horas" : "personas"} ({money(srv.precioPersona ?? 0, "USD")} c/u{entidad === "COL" ? ` ≈ ${money(Math.round((srv.precioPersona ?? 0) * tasa), "COP")}` : ""})</label>
                    <input type="number" min={1} value={personas} onChange={(e) => setPersonas(Math.max(1, Number(e.target.value) || 1))} />
                  </div>
                )}

                <div className="cf-f">
                  <label>{srv?.precioVariable ? `Precio (${moneda}) — este cliente` : srv?.porPersona ? `Total (${moneda}) — editable` : `Precio por mes (${moneda}) — editable`}</label>
                  <div className="cf-price-grid" style={{ gridTemplateColumns: `repeat(${Math.min(nMeses, precios.length || 1)}, 1fr)` }}>
                    {Array.from({ length: nMeses }).map((_, i) => (
                      <div className="pc" key={i}>
                        <label>{srv?.porPersona ? "Total" : `Mes ${i + 1}`}</label>
                        <input name={`precioMes${i + 1}`} inputMode="decimal" value={precios[i] ?? ""} onChange={(e) => setPrecio(i, e.target.value)} placeholder={srv?.precioVariable ? "—" : ""} />
                      </div>
                    ))}
                  </div>
                  {srv?.precioVariable && <span className="cf-hint">Valor variable: escribe el acordado con el cliente.</span>}
                  {entidad === "COL" && !srv?.precioVariable && <span className="cf-hint">Convertido a la tasa de hoy ({money(tasa, "COP")}). Puedes ajustarlo.</span>}
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

                {srv?.aplicaCs ? (
                  <div className="cf-f">
                    <label>Customer Success (comisiona su cuenta Leadtion)</label>
                    <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                      {colaboradores.map((c) => (
                        <label key={c.id} style={{ display: "flex", gap: 8, alignItems: "center", fontWeight: 500, color: "var(--text)" }}>
                          <input type="checkbox" name="asignados" value={c.id} style={{ width: "auto" }} /> {c.nombre}
                        </label>
                      ))}
                    </div>
                  </div>
                ) : (
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
