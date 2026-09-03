"use client";

import { useState } from "react";
import { CATEGORIA_LABEL, type ServicioCatalogo } from "@/lib/catalogo-tipos";
import type { FacturaItem } from "@/lib/facturacion";
import { guardarServiciosFactura } from "@/app/trd/clientes/acciones";

const money = (n: number, m: "USD" | "COP") => new Intl.NumberFormat("es-CO", { style: "currency", currency: m, maximumFractionDigits: m === "COP" ? 0 : 2 }).format(n);

/** Editor de servicios de una factura: varias líneas elegibles del catálogo. */
export function ServiciosEditor({
  facturaId, entidad, tasa, catalogo, iniciales,
}: { facturaId: number; entidad: "LLC" | "COL"; tasa: number; catalogo: ServicioCatalogo[]; iniciales: FacturaItem[] }) {
  const [items, setItems] = useState(iniciales.length ? iniciales : [{ id: null, servicioClave: null, concepto: "", monto: 0 }]);
  const moneda = entidad === "COL" ? "COP" : "USD";

  const grupos: Record<string, ServicioCatalogo[]> = {};
  for (const c of catalogo) (grupos[c.categoria] ??= []).push(c);

  const precioBase = (c: ServicioCatalogo) => {
    const base = c.porPersona ? (c.precioPersona ?? 0) : (c.precioMes1 ?? 0);
    if (c.precioVariable && !c.porPersona) return 0;
    return entidad === "COL" ? Math.round(base * tasa) : Math.round(base);
  };

  const setItem = (i: number, patch: Partial<FacturaItem>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const pick = (i: number, clave: string) => {
    const c = catalogo.find((x) => x.clave === clave);
    if (!c) { setItem(i, { servicioClave: null }); return; }
    setItem(i, { servicioClave: clave, concepto: c.nombre, monto: precioBase(c) });
  };
  const add = () => setItems((xs) => [...xs, { id: null, servicioClave: null, concepto: "", monto: 0 }]);
  const remove = (i: number) => setItems((xs) => (xs.length > 1 ? xs.filter((_, j) => j !== i) : xs));
  const total = items.reduce((s, it) => s + (Number(it.monto) || 0), 0);

  return (
    <form action={guardarServiciosFactura} className="cf-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="facturaId" value={facturaId} />
      {items.map((it, i) => (
        <div key={i} className="cf-item">
          <select value={it.servicioClave ?? ""} onChange={(e) => pick(i, e.target.value)}>
            <option value="">— Elegir servicio —</option>
            {Object.entries(grupos).map(([cat, arr]) => (
              <optgroup key={cat} label={CATEGORIA_LABEL[cat] ?? cat}>
                {arr.map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
              </optgroup>
            ))}
          </select>
          <input name="itemMonto" inputMode="decimal" value={it.monto || ""} onChange={(e) => setItem(i, { monto: Number(e.target.value) || 0 })} placeholder={`Monto ${moneda}`} />
          <button type="button" className="btn-borrar" title="Quitar" onClick={() => remove(i)}>🗑️</button>
          <input type="hidden" name="itemClave" value={it.servicioClave ?? ""} />
          <input type="hidden" name="itemConcepto" value={it.concepto} />
        </div>
      ))}
      <button type="button" className="cf-additem" onClick={add}>＋ Agregar otro servicio</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2 }}>
        <span style={{ fontWeight: 700 }}>Total de la factura: <span className="cf-mono">{money(total, moneda)}</span></span>
        <button type="submit" className="cf-btn cf-btn-primary">Guardar servicios</button>
      </div>
    </form>
  );
}
