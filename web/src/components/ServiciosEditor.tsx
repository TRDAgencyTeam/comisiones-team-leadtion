"use client";

import { useState } from "react";
import { CATEGORIA_LABEL, type ServicioCatalogo } from "@/lib/catalogo-tipos";
import type { FacturaItem } from "@/lib/facturacion";
import { guardarServiciosFactura } from "@/app/trd/clientes/acciones";
import { IconoBorrar } from "@/components/Iconos";
import { InputMonto } from "@/components/InputMonto";

const money = (n: number, m: "USD" | "COP") => new Intl.NumberFormat("es-CO", { style: "currency", currency: m, maximumFractionDigits: m === "COP" ? 0 : 2 }).format(n);

type Item = FacturaItem & { personas?: number; valorPersona?: number };

/** Editor de servicios de una factura: varias líneas elegibles del catálogo.
 *  Los servicios "por persona" muestran cantidad × valor y calculan el total solos. */
export function ServiciosEditor({
  facturaId, entidad, tasa, catalogo, iniciales, ivaPct = 0,
}: { facturaId: number; entidad: "LLC" | "COL"; tasa: number; catalogo: ServicioCatalogo[]; iniciales: FacturaItem[]; ivaPct?: number }) {
  const moneda = entidad === "COL" ? "COP" : "USD";
  const catDe = (clave: string | null) => (clave ? catalogo.find((x) => x.clave === clave) : undefined);

  const precioBase = (c: ServicioCatalogo) => {
    const base = c.porPersona ? (c.precioPersona ?? 0) : (c.precioMes1 ?? 0);
    if (c.precioVariable && !c.porPersona) return 0;
    // Colombia: el precio se escribe en COP (antes de IVA); NO se convierte el precio
    // en dólares del catálogo a pesos. La única conversión es COP → USD para el ingreso.
    return entidad === "COL" ? 0 : Math.round(base);
  };

  // Reconstruye personas × valor de los servicios "por persona" que vienen guardados.
  const hidratar = (arr: FacturaItem[]): Item[] => arr.map((it) => {
    const c = catDe(it.servicioClave);
    if (c?.porPersona) {
      const vp = precioBase(c);
      if (vp <= 0) return { ...it, personas: 1, valorPersona: it.monto || 0 };
      const personas = Math.max(1, Math.round((it.monto || 0) / vp));
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
      <p className="cf-moneda-badge">
        <span className={`cf-chip ${entidad === "COL" ? "col" : "llc"}`}>{moneda}</span>
        {entidad === "COL"
          ? <>Cliente de Colombia: escribe los valores en <b>pesos (COP) antes de IVA</b>. El ingreso en dólares se calcula solo.</>
          : <>Cliente de USA (LLC): valores en <b>dólares (USD)</b>.</>}
      </p>
      {items.map((it, i) => {
        const c = catDe(it.servicioClave);
        const porPersona = Boolean(c?.porPersona);
        // El concepto que se guarda sale del servicio SELECCIONADO (catálogo), no de
        // un texto viejo heredado; así al editar no se arrastran/duplican nombres.
        const nombreCat = c?.nombre ?? it.concepto;
        const conceptoEnvio = porPersona && it.personas ? `${nombreCat} (${it.personas} personas)` : nombreCat;
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
                <InputMonto valor={it.valorPersona || 0} decimales={moneda !== "COP"} onValor={(v) => setValorP(i, v)} placeholder={`Valor/persona`} title="Valor por persona" />
                <span className="eq">= <b className="cf-mono">{money(it.monto || 0, moneda)}</b></span>
              </span>
            ) : (
              <InputMonto valor={it.monto || 0} decimales={moneda !== "COP"} onValor={(v) => setItem(i, { monto: v })} placeholder={`Monto ${moneda}`} />
            )}
            <button type="button" className="btn-borrar icon-btn danger" title="Quitar" aria-label="Quitar" onClick={() => remove(i)}><IconoBorrar /></button>
            <input type="hidden" name="itemClave" value={it.servicioClave ?? ""} />
            <input type="hidden" name="itemConcepto" value={conceptoEnvio} />
            <input type="hidden" name="itemMonto" value={Math.round((it.monto || 0) * 100) / 100} />
          </div>
        );
      })}
      <button type="button" className="cf-additem" onClick={add}>＋ Agregar otro servicio</button>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderTop: "1px solid var(--border)", paddingTop: 10, marginTop: 2 }}>
        <span style={{ fontWeight: 700 }}>
          Total de la factura{entidad === "COL" ? " (antes de IVA)" : ""}: <span className="cf-mono">{money(total, moneda)}</span>
          {entidad === "COL" && total > 0 && (
            <small className="cf-moneda-nota">
              + IVA {ivaPct}% {money(Math.round(total * ivaPct / 100), "COP")} = {money(Math.round(total * (1 + ivaPct / 100)), "COP")} a cobrar
              · ingreso ≈ {money(tasa > 0 ? total / tasa : 0, "USD")} (antes de IVA ÷ tasa)
            </small>
          )}
        </span>
        <button type="submit" className="cf-btn cf-btn-primary">Guardar servicios</button>
      </div>
    </form>
  );
}
