"use client";

import { useEffect, useState } from "react";
import { cerrarClienteDesdeFactura } from "@/app/trd/clientes/acciones";

export interface Hermana { id: number; label: string }

/**
 * Popup al anular una factura: decide si es solo esa factura/servicio o si el
 * cliente termina contrato (cancelar/pausar), qué otros servicios del mes cerrar
 * y el motivo. Al confirmar, sincroniza el estado del cliente con Membresías/CS.
 */
export function CierreClienteModal({
  facturaId, clienteId, clienteNombre, esMiembro, hermanas, onCancel, onConfirm,
}: {
  facturaId: number; clienteId: number | null; clienteNombre: string; esMiembro: boolean; hermanas: Hermana[];
  onCancel: () => void; onConfirm: () => void;
}) {
  const [alcance, setAlcance] = useState<"cliente" | "factura">("cliente");
  const [estado, setEstado] = useState<"cancelado" | "pausado">("cancelado");
  useEffect(() => {
    const p = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = p; };
  }, []);

  return (
    <div className="cf-scrim" onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="cf-modal" style={{ maxWidth: 480 }}>
        <div className="cf-modal-head"><h3>Anular factura de {clienteNombre}</h3><button type="button" className="x" onClick={onCancel}>✕</button></div>
        <form action={cerrarClienteDesdeFactura} onSubmit={onConfirm}>
          <input type="hidden" name="facturaId" value={facturaId} />
          {clienteId != null && <input type="hidden" name="clienteId" value={clienteId} />}
          <input type="hidden" name="alcance" value={alcance} />
          <input type="hidden" name="estado" value={estado} />
          <div className="cf-modal-body">
            <p className="cf-hint" style={{ marginTop: 0 }}>¿Qué pasó con este cliente?</p>
            <label className="cf-radio"><input type="radio" name="_alc" checked={alcance === "cliente"} onChange={() => setAlcance("cliente")} /> <span>El cliente <b>termina contrato</b> (cierra todo y sincroniza con Membresías)</span></label>
            <label className="cf-radio"><input type="radio" name="_alc" checked={alcance === "factura"} onChange={() => setAlcance("factura")} /> <span>Solo anular <b>esta factura / servicio</b> (el cliente sigue activo; ese servicio no se vuelve a generar)</span></label>

            {alcance === "cliente" && (
              <>
                {esMiembro && (
                  <div className="cf-f" style={{ marginTop: 12 }}>
                    <label>Estado del cliente</label>
                    <div style={{ display: "flex", gap: 8 }}>
                      <button type="button" className={`cf-chipbtn${estado === "cancelado" ? " on" : ""}`} onClick={() => setEstado("cancelado")}>Cancelado</button>
                      <button type="button" className={`cf-chipbtn${estado === "pausado" ? " on" : ""}`} onClick={() => setEstado("pausado")}>Pausado</button>
                    </div>
                  </div>
                )}
                {hermanas.length > 0 && (
                  <div className="cf-f">
                    <label>Otros servicios de este mes a cerrar</label>
                    {hermanas.map((h) => (
                      <label key={h.id} className="cf-radio"><input type="checkbox" name="cerrar" value={h.id} defaultChecked /> <span>{h.label}</span></label>
                    ))}
                  </div>
                )}
                <p className="cf-hint">
                  {esMiembro
                    ? <>Se marcará como <b>{estado}</b> en <b>Membresías</b> y <b>CS</b>, y no se le generarán cobros los próximos meses.</>
                    : <>Cliente de agencia (no es miembro Leadtion): se <b>detiene su facturación</b> (no se le generan cobros los próximos meses).</>}
                </p>
              </>
            )}

            <div className="cf-f"><label>Motivo (opcional)</label><input name="motivo" placeholder="Ej. terminó contrato, no renovó…" /></div>
          </div>
          <div className="cf-modal-foot">
            <button type="button" className="cf-btn cf-btn-ghost" onClick={onCancel}>Cancelar</button>
            <button type="submit" className="cf-btn cf-btn-primary">Confirmar</button>
          </div>
        </form>
      </div>
    </div>
  );
}
