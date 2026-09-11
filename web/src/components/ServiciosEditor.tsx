"use client";

import { useState } from "react";
import { CATEGORIA_LABEL, type ServicioCatalogo } from "@/lib/catalogo-tipos";
import type { FacturaItem } from "@/lib/facturacion";
import { guardarServiciosFactura } from "@/app/trd/clientes/acciones";

const money = (n: number, m: "USD" | "COP") => new Intl.NumberFormat("es-CO", { style: "currency", currency: m, maximumFractionDigits: m === "COP" ? 0 : 2 }).format(n);

type Item = FacturaItem & { personas?: number; valorPersona?: number };

/** Editor de servicios de una factura: varias líneas elegibles del catálogo.
 *  Los servicios "por persona" muestran cantidad × valor y calculan el total solos. */
export function ServiciosEditor({
  facturaId, entidad, tasa, catalogo, iniciales,
}: { facturaId: number; entidad: "LLC" | "COL"; tasa: number; catalogo: ServicioCatalogo[]; iniciales: FacturaItem[] }) {
  const moneda = entidad === "COL" ? "COP" : "USD";
  const catDe = (clave: string | null) => (clave ? catalogo.find((x) => x.clave === clave) : undefined);

  const precioBase = (c: ServicioCatalogo) => {
    const base = c.porPersona ? (c.precioPersona ?? 0) : (c.precioMes1 ?? 0);
    if (c.precioVariable && !c.porPersona) return 0;
    return entidad === "COL" ? Math.round(base * tasa) : Math.round(base);
  };

  // Reconstruye personas × valor de los servicios "por persona" que vienen guardados.
  const hidratar = (arr: FacturaItem[]): Item[] => arr.map((it) => {
    const c = catDe(it.servicioClave);
    if (c?.porPersona) {
      const vp = precioBase(c);
      const personas = vp > 0 ? Math.max(1, Math.round((it.monto || 0) / vp)) : 1;
      return { ...it, personas, valorPersona: vp };
    }
    return it;
  });

  const [items, setItems] = useState<Item[]>(hidratar(iniciales.length ? iniciales : [{ id: null, servicioClave: null, concepto: "", monto: 0 }]));

  const grupos: Record<string, ServicioCatalogo[]> = {};
  for (const c of catalogo) (grupos[c.categoria] ??= []).push(c);

  const setItem = (i: number, patch: Partial<Item>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const pick = (i: number, clave: string) => {
    const c = catalogo.find((x) => x.clave === clave);
    if (!c) { setItem(i, { servicioClave: null, concepto: "", monto: 0, personas: undefined, valorPersona: undefined }); return; }
    if (c.porPersona) {
      const vp = precioBase(c);
      setItem(i, { servicioClave: clave, concepto: c.nombre, personas: 1, valorPersona: vp, monto: vp });
    } else {
      setItem(i, { servicioClave: clave, concepto: c.nombre, monto: precioBase(c), personas: undefined, valorPersona: undefined });
    }
  };
  const setPersonas = (i: number, n: number) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, personas: n, monto: Math.round((n || 0) * (x.valorPersona || 0)) } : x)));
  const setValorP = (i: number, v: number) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, valorPersona: v, monto: Math.round((x.personas || 0) * (v || 0)) } : x)));
  const add = () => setItems((xs) => [...xs, { id: null, servicioClave: null, concepto: "", monto: 0 }]);
  const remove = (i: number) => setItems((xs) => (xs.length > 1 ? xs.filter((_, j) => j !== i) : xs));
  const total = items.reduce((s, it) => s + (Number(it.monto) || 0), 0);

  return (
    <form action={guardarServiciosFactura} className="cf-card" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
      <input type="hidden" name="facturaId" value={facturaId} />
      {items.map((it, i) => {
        const c = catDe(it.servicioClave);
        const porPersona = Boolean(c?.porPersona);
        const conceptoEnvio = porPersona && it.personas ? `${it.concepto} (${it.personas} personas)` : it.concepto;
        return (
          <div key={i} className="cf-item">
            <select value={it.servicioClave ?? ""} onChange={(e) => pick(i, e.target.value)}>
              <option value="">— Elegir servicio —</option>
              {Object.entries(grupos).map(([cat, arr]) => (
                <optgroup key={cat} label={CATEGORIA_LABEL[cat] ?? cat}>
                  {arr.map((c) => <option key={c.clave} value={c.clave}>{c.nombre}</option>)}
                </optgroup>
              ))}
            </select>
            {porPersona ? (
              <span className="cf-perpersona">
                <input type="number" min="1" inputMode="numeric" value={it.personas || ""} onChange={(e) => setPersonas(i, Number(e.target.value) || 0)} placeholder="Personas" title="Cantidad de personas" />
                <span className="x">×</span>
                <input inputMode="decimal" value={it.valorPersona || ""} onChange={(e) => setValorP(i, Number(e.target.value) || 0)} placeholder={`Valor/persona`} title="Valor por persona" />
                <span className="eq">= <b className="cf-mono">{money(it.monto || 0, moneda)}</b></span>
              </span>
            ) : (
              <input inputMode="decimal" value={it.monto || ""} onChange={(e) => setItem(i, { monto: Number(e.target.value) || 0 })} placeholder={`Monto ${moneda}`} />
            )}
            <button type="button" className="btn-borrar" title="Quitar" onClick={() => remove(i)}>🗑️</button>
            <input type="hidden" name="itemClave" value={it.servicioClave ?? ""} />
            <input type="hidden" name="itemConcepto" value={conceptoEnvio} />
            <input type="hidden" name="itemMonto" value={it.monto || 0} />
          </div>
        );
      })}
      <button type="button" className="cf-additem" onClick={add}>＋ Agregar otro servicio</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2 }}>
        <span style={{ fontWeight: 700 }}>Total de la factura: <span className="cf-mono">{money(total, moneda)}</span></span>
        <button type="submit" className="cf-btn cf-btn-primary">Guardar servicios</button>
      </div>
    </form>
  );
}
