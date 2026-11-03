"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { calcularMora } from "@/lib/mora";
import { agregarMultaMora } from "@/app/trd/clientes/acciones";
import { conCarga } from "@/lib/carga";

/**
 * Botón + popup para agregar una MULTA POR MORA a una factura vencida. Manual: lo
 * usa el admin cuando no hay pago. Muestra días de atraso, % y el valor sugerido
 * (editable). El IVA (COL) se recalcula solo sobre la base de la multa.
 */
export function MultaMoraModal({ facturaId, facturado, ivaPct, entidad, fechaFactura, hoy, clienteNombre }: {
  facturaId: number; facturado: number; ivaPct: number; entidad: "LLC" | "COL";
  fechaFactura: string; hoy: string; clienteNombre: string;
}) {
  const [abierto, setAbierto] = useState(false);
  const [pending, start] = useTransition();
  const calc = useMemo(() => calcularMora(facturado, ivaPct, fechaFactura, hoy), [facturado, ivaPct, fechaFactura, hoy]);
  const [monto, setMonto] = useState<string>(String(calc.montoSinIva));
  useEffect(() => { if (abierto) { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; } }, [abierto]);

  const money = (n: number) => `${entidad === "COL" ? "$" : "US$"}${n.toLocaleString("es-CO", { maximumFractionDigits: 2 })}`;
  const base = Number(String(monto).replace(/[^\d.]/g, "")) || 0;
  const iva = entidad === "COL" ? Math.round(base * (ivaPct / 100) * 100) / 100 : 0;
  const total = Math.round((base + iva) * 100) / 100;

  const confirmar = () => {
    const fd = new FormData();
    fd.set("facturaId", String(facturaId));
    fd.set("monto", String(base));
    start(async () => { await conCarga(agregarMultaMora(fd)); });
  };

  return (
    <>
      <button type="button" className="cf-multa-btn" title="Agregar multa por mora" onClick={() => setAbierto(true)}>
        Multa
      </button>
      {abierto && (
        <div className="cf-scrim" onClick={(e) => { if (e.target === e.currentTarget) setAbierto(false); }}>
          <div className="cf-modal" style={{ maxWidth: 420 }}>
            <div className="cf-modal-head"><h3>Multa por mora</h3><button type="button" className="x" onClick={() => setAbierto(false)}>✕</button></div>
            <div className="cf-modal-body">
              <p className="cf-hint" style={{ marginTop: 0 }}>
                <b>{clienteNombre}</b> · factura #{facturaId}
              </p>
              <div className="cf-f" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                <div><small>Atraso</small><div><b>{calc.dias} días</b></div></div>
                <div><small>% de mora</small><div><b>{calc.pct}%</b></div></div>
                <div><small>Valor factura (sin IVA)</small><div>{money(facturado)}</div></div>
                <div><small>Sugerido</small><div>{money(calc.montoSinIva)}</div></div>
              </div>
              {calc.pct === 0 ? (
                <p className="alerta">Aún dentro de la gracia de 5 días ({calc.dias} días): no hay multa todavía.</p>
              ) : (
                <>
                  <div className="cf-f"><label>Valor de la multa (sin IVA) — editable</label>
                    <input inputMode="decimal" value={monto} onChange={(e) => setMonto(e.target.value)} autoFocus /></div>
                  {entidad === "COL" && (
                    <p className="cf-hint" style={{ marginTop: 6 }}>
                      + IVA {ivaPct}% = <b>{money(iva)}</b> · Total a cobrar <b>{money(total)}</b>
                    </p>
                  )}
                </>
              )}
            </div>
            <div className="cf-modal-foot">
              <button type="button" className="cf-btn cf-btn-ghost" onClick={() => setAbierto(false)}>Cancelar</button>
              <button type="button" className="cf-btn cf-btn-primary" disabled={pending || calc.pct === 0 || base <= 0} onClick={confirmar}>
                {pending ? "Agregando…" : "Agregar multa"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
