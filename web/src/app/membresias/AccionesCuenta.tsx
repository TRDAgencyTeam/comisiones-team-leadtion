"use client";

import { useState } from "react";
import { cambiarEstadoCuenta } from "./acciones";
import { hoyISO } from "@/lib/fecha";

/**
 * Botones rápidos de estado de la cuenta en la ficha (sin entrar a Editar):
 *  - Activa:   [Pausar] [Cancelar cuenta]
 *  - Pausada:  [Reactivar] [Cancelar cuenta]
 *  - Cancelada:[Reactivar]
 * Cancelar abre un mini-formulario para la FECHA EXACTA: si se canceló antes del corte
 * de ese mes, ese mes queda en $0 (el modelo de cargos es corte-consciente).
 */
export function AccionesCuenta({ id, estado }: { id: number; estado: string }) {
  const [cancelando, setCancelando] = useState(false);

  const BtnEstado = ({ a, label, cls }: { a: string; label: string; cls: string }) => (
    <form action={cambiarEstadoCuenta}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="estado" value={a} />
      <button type="submit" className={cls}>{label}</button>
    </form>
  );

  return (
    <>
      {estado === "activo" && <BtnEstado a="pausado" label="Pausar" cls="btn-secondary" />}
      {(estado === "pausado" || estado === "cancelado") && <BtnEstado a="activo" label="Reactivar" cls="btn-secondary" />}
      {estado !== "cancelado" && (
        <button type="button" className="btn-cancelar-cuenta" onClick={() => setCancelando(true)}>Cancelar cuenta</button>
      )}

      {cancelando && (
        <div className="modal-overlay" onClick={() => setCancelando(false)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h3>Cancelar cuenta</h3>
            <p className="modal-sub">
              Indica la <b>fecha exacta</b> de cancelación. Si es <b>antes del corte</b> del mes,
              ese mes queda en $0 (no se cobra); si es después, el mes ya cuenta como cobrado.
            </p>
            <form action={cambiarEstadoCuenta}>
              <input type="hidden" name="id" value={id} />
              <input type="hidden" name="estado" value="cancelado" />
              <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: 4 }}>Fecha de cancelación</label>
              <input type="date" name="fechaCancelacion" defaultValue={hoyISO()} required className="modal-input" />
              <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, margin: "10px 0 4px" }}>Motivo (opcional)</label>
              <input type="text" name="motivo" placeholder="Ej: el cliente avisó el 15/10" className="modal-input" />
              <div className="modal-acciones">
                <button type="button" className="btn-secondary" onClick={() => setCancelando(false)}>Volver</button>
                <button type="submit" className="btn-danger">Cancelar cuenta</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
