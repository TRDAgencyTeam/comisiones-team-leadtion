"use client";

import { useEffect, useState } from "react";

/** Popup al marcar una factura como Pagado: confirma con fecha de hoy o permite
 *  poner la fecha real en que se pagó (según Stripe). */
export function PagoFechaModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: (fecha: string) => void }) {
  const hoy = new Date().toISOString().slice(0, 10);
  const [custom, setCustom] = useState(false);
  const [fecha, setFecha] = useState(hoy);
  useEffect(() => { document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = ""; }; }, []);
  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

  return (
    <div className="cf-scrim" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="cf-modal" style={{ maxWidth: 400 }}>
        <div className="cf-modal-head"><h3>Marcar como pagado</h3><button type="button" className="x" onClick={onCancel}>✕</button></div>
        <div className="cf-modal-body">
          {custom ? (
            <div className="cf-f"><label>Fecha del pago (según Stripe)</label>
              <input type="date" value={fecha} max={hoy} onChange={(e) => setFecha(e.target.value)} autoFocus /></div>
          ) : (
            <p className="cf-hint" style={{ marginTop: 0 }}>Se registrará el pago con fecha de <b>hoy, {fmt(hoy)}</b>.</p>
          )}
          {!custom && <button type="button" className="tasa-link" onClick={() => setCustom(true)}>Personalizar fecha</button>}
        </div>
        <div className="cf-modal-foot">
          <button type="button" className="cf-btn cf-btn-ghost" onClick={onCancel}>Cancelar</button>
          <button type="button" className="cf-btn cf-btn-primary" onClick={() => onConfirm(custom ? fecha : hoy)}>Guardar</button>
        </div>
      </div>
    </div>
  );
}
