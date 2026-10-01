"use client";

import { useEffect, useState } from "react";
import { hoyISO } from "@/lib/fecha";

/** Qué fecha pide cada estado al cambiarlo. */
export const FECHA_POR_ESTADO: Record<string, { titulo: string; campo: string; hint: string; soloPasado: boolean }> = {
  pagado:       { titulo: "Marcar como pagado",       campo: "Fecha del pago (según Stripe / banco)", hint: "el pago",                       soloPasado: true },
  facturado:    { titulo: "Marcar como facturado",    campo: "Fecha en que se facturó",               hint: "la factura",                    soloPasado: true },
  por_facturar: { titulo: "Marcar como por facturar", campo: "Fecha prevista de facturación",         hint: "la facturación prevista",       soloPasado: false },
  programado:   { titulo: "Marcar como programado",   campo: "Fecha programada",                      hint: "la fecha programada",           soloPasado: false },
};

/**
 * Popup al cambiar el estado de una factura: confirma con la fecha de hoy o deja
 * poner la fecha real (ej. se facturó hace dos días, se pagó el fin de semana).
 */
export function PagoFechaModal({ estado = "pagado", fechaActual, onCancel, onConfirm }: {
  estado?: string; fechaActual?: string | null; onCancel: () => void; onConfirm: (fecha: string) => void;
}) {
  const cfg = FECHA_POR_ESTADO[estado] ?? FECHA_POR_ESTADO.pagado!;
  const hoy = hoyISO();
  // Por facturar / programado: si ya tenía fecha prevista, se propone esa.
  const inicial = !cfg.soloPasado && fechaActual ? fechaActual : hoy;
  const [custom, setCustom] = useState(inicial !== hoy);
  const [fecha, setFecha] = useState(inicial);
  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="cf-scrim" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="cf-modal" style={{ maxWidth: 400 }}>
        <div className="cf-modal-head"><h3>{cfg.titulo}</h3><button type="button" className="x" onClick={onCancel}>✕</button></div>
        <div className="cf-modal-body">
          {custom ? (
            <div className="cf-f"><label>{cfg.campo}</label>
              <input type="date" value={fecha} max={cfg.soloPasado ? hoy : undefined} onChange={(e) => setFecha(e.target.value)} autoFocus /></div>
          ) : (
            <p className="cf-hint" style={{ marginTop: 0 }}>Se registrará {cfg.hint} con fecha de <b>hoy, {fmt(hoy)}</b>.</p>
          )}
          {!custom && <button type="button" className="tasa-link" onClick={() => setCustom(true)}>Personalizar fecha</button>}
        </div>
        <div className="cf-modal-foot">
          <button type="button" className="cf-btn cf-btn-ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="cf-btn cf-btn-primary" disabled={custom && !fecha} onClick={() => onConfirm(custom ? fecha : hoy)}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
