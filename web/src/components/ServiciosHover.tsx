"use client";

import { useRef, useState } from "react";
import type { LineaServicio } from "@/lib/facturacion-calc";

const fmt = (n: number, m: "USD" | "COP") =>
  new Intl.NumberFormat("es-CO", { style: "currency", currency: m, maximumFractionDigits: m === "COP" ? 0 : 2 }).format(n);

/**
 * Columna "Servicio" de Facturación: al pasar el cursor (o tocar) muestra los
 * servicios discriminados con el valor de cada uno, sin entrar a "Ver".
 * Va con position: fixed para que la tabla (con scroll horizontal) no lo recorte.
 */
export function ServiciosHover({
  texto, lineas, moneda, total, ivaPct,
}: { texto: string; lineas: LineaServicio[]; moneda: "USD" | "COP"; total: number; ivaPct?: number }) {
  const ref = useRef<HTMLSpanElement>(null);
  const [pos, setPos] = useState<{ top: number; left: number; arriba: boolean } | null>(null);

  const abrir = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const ancho = 300;
    const left = Math.max(12, Math.min(r.left, window.innerWidth - ancho - 12));
    const arriba = r.bottom + 220 > window.innerHeight && r.top > 240; // sin espacio abajo → arriba
    setPos({ top: arriba ? r.top - 8 : r.bottom + 8, left, arriba });
  };
  const cerrar = () => setPos(null);
  const paquete = lineas.length > 1 && lineas.some((l) => l.monto == null);
  const esCOL = moneda === "COP";
  const iva = esCOL && ivaPct ? Math.round(total * (ivaPct / 100)) : 0;

  return (
    <span ref={ref} className="srv-hover" tabIndex={0} onMouseEnter={abrir} onMouseLeave={cerrar} onFocus={abrir} onBlur={cerrar}>
      <span className="srv-texto">{texto}</span>
      {pos && (
        <span className={`srv-pop${pos.arriba ? " arriba" : ""}`} role="tooltip" style={{ top: pos.top, left: pos.left }}>
          <span className="srv-pop-h">Servicios · {moneda}{esCOL ? " (antes de IVA)" : ""}</span>
          {lineas.map((l, i) => (
            <span key={i} className="srv-pop-l"><span>{l.concepto}</span><b>{l.monto != null ? fmt(l.monto, moneda) : "—"}</b></span>
          ))}
          {paquete && <span className="srv-pop-nota">Paquete: un solo precio por todos los servicios.</span>}
          <span className="srv-pop-l tot"><span>Total{esCOL ? " antes de IVA" : ""}</span><b>{fmt(total, moneda)}</b></span>
          {esCOL && iva > 0 && <>
            <span className="srv-pop-l sub"><span>IVA {ivaPct}%</span><b>{fmt(iva, moneda)}</b></span>
            <span className="srv-pop-l sub"><span>Total con IVA</span><b>{fmt(total + iva, moneda)}</b></span>
          </>}
        </span>
      )}
    </span>
  );
}
