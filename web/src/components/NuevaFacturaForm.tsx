"use client";

import { useEffect, useMemo, useState } from "react";
import { CATEGORIA_LABEL, type ServicioCatalogo } from "@/lib/catalogo-tipos";
import { MEDIOS, ESTADOS } from "@/lib/facturacion-calc";
import { crearFactura } from "@/app/trd/clientes/acciones";

const money = (n: number, m: "USD" | "COP") => new Intl.NumberFormat("es-CO", { style: "currency", currency: m, maximumFractionDigits: m === "COP" ? 0 : 2 }).format(n);

/** Factura suelta del mes (cliente existente o servicio puntual), con la misma
 *  estética y el mismo selector de servicios que "Nuevo cliente". */
export function NuevaFacturaForm({ mes, tasa, catalogo }: { mes: string; tasa: number; catalogo: ServicioCatalogo[] }) {
  const [entidad, setEntidad] = useState<"LLC" | "COL">("LLC");
  const [clave, setClave] = useState(catalogo[0]?.clave ?? "");
  const [personas, setPersonas] = useState(1);
  const [facturado, setFacturado] = useState("");
  const [servicios, setServicios] = useState("");

  const srv = useMemo(() => catalogo.find((c) => c.clave === clave), [catalogo, clave]);
  const moneda = entidad === "COL" ? "COP" : "USD";

  useEffect(() => {
    if (!srv) return;
    setServicios(srv.nombre);
    const base = srv.porPersona ? (srv.precioPersona ?? 0) * Math.max(1, personas) : (srv.precioMes1 ?? 0);
    const v = srv.precioVariable && !srv.porPersona ? 0 : (entidad === "COL" ? Math.round(base * tasa) : Math.round(base));
    setFacturado(v ? String(v) : "");
  }, [clave, entidad, personas, srv, tasa]);

  const grupos = useMemo(() => {
    const g: Record<string, ServicioCatalogo[]> = {};
    for (const c of catalogo) (g[c.categoria] ??= []).push(c);
    return g;
  }, [catalogo]);

  return (
    <div className="cf-card" style={{ maxWidth: 560 }}>
      <form action={crearFactura} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <input type="hidden" name="mes" value={mes} />
        <input type="hidden" name="entidad" value={entidad} />
        <input type="hidden" name="servicioClave" value={clave} />
        <input type="hidden" name="recurrente" value={srv?.recurrente ? "1" : "0"} />
        {srv?.porPersona && <input type="hidden" name="personas" value={personas} />}

        <div className="cf-f"><label>Nombre del cliente</label><input name="clienteNombre" required placeholder="Cliente existente o puntual" /></div>

        <div className="cf-f">
          <label>Entidad</label>
          <div className="cf-seg">
            <label><input type="radio" name="_ent" checked={entidad === "LLC"} onChange={() => setEntidad("LLC")} /><span>LLC · EE.UU. (USD)</span></label>
            <label><input type="radio" name="_ent" checked={entidad === "COL"} onChange={() => setEntidad("COL")} /><span>Colombia (COP)</span></label>
          </div>
        </div>

        <div className="cf-f">
          <label>Servicio</label>
          <select value={clave} onChange={(e) => { const v = e.target.value; setClave(v); setPersonas(catalogo.find((c) => c.clave === v)?.unidad === "hora" ? 3 : 1); }}>
            {Object.entries(grupos).map(([cat, items]) => (
              <optgroup key={cat} label={CATEGORIA_LABEL[cat] ?? cat}>{items.map((i) => <option key={i.clave} value={i.clave}>{i.nombre}</option>)}</optgroup>
            ))}
          </select>
        </div>

        {srv?.porPersona && (
          <div className="cf-f">
            <label>Cantidad de {srv.unidad === "hora" ? "horas" : "personas"} ({money(srv.precioPersona ?? 0, "USD")} c/u)</label>
            <input type="number" min={1} value={personas} onChange={(e) => setPersonas(Math.max(1, Number(e.target.value) || 1))} />
          </div>
        )}

        <div className="cf-f"><label>Servicios (texto en la factura)</label><input name="servicios" value={servicios} onChange={(e) => setServicios(e.target.value)} /></div>

        <div className="cf-price-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          <div className="cf-f"><label>{esLabel(entidad)}</label><input name="facturado" inputMode="decimal" value={facturado} onChange={(e) => setFacturado(e.target.value)} placeholder="0" /></div>
          <div className="cf-f"><label>Medio de pago</label><select name="medio" defaultValue={entidad === "COL" ? "bancolombia" : "stripe"}>{MEDIOS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></div>
        </div>
        {entidad === "COL" && <input type="hidden" name="ivaPct" value="19" />}

        <div className="cf-price-grid" style={{ gridTemplateColumns: "repeat(2, 1fr)" }}>
          <div className="cf-f"><label>Fecha de factura</label><input type="date" name="fechaFactura" defaultValue={`${mes}-01`} /></div>
          <div className="cf-f"><label>Fecha de pago</label><input type="date" name="fechaPago" /></div>
        </div>

        <div className="cf-f"><label>Estado</label><select name="estado" defaultValue="por_facturar">{ESTADOS.filter((e) => e.value !== "por_confirmar").map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}</select></div>

        {srv?.aplicaReserva && (
          <div className="cf-f"><label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="reserva" value="1" style={{ width: "auto" }} /> Vino con reserva</label></div>
        )}
        {entidad === "COL" && <span className="cf-hint">Precio convertido a la tasa de hoy ({money(tasa, "COP")}). Editable.</span>}

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
          <button type="submit" className="cf-btn cf-btn-primary">Crear factura</button>
        </div>
      </form>
    </div>
  );
}

function esLabel(entidad: "LLC" | "COL") { return entidad === "LLC" ? "Facturado (USD)" : "Facturado COP (antes de IVA)"; }
