"use client";

import { useState } from "react";
import { crearEgreso, crearIngreso } from "@/app/trd/clientes/acciones";

/** Modal para agregar un egreso o un ingreso del mes. */
export function MovimientoModal({ mes, tipo }: { mes: string; tipo: "egreso" | "ingreso" }) {
  const [open, setOpen] = useState(false);
  const [afecta, setAfecta] = useState(true);
  const esEgreso = tipo === "egreso";

  return (
    <>
      <button type="button" className={`cf-btn ${esEgreso ? "cf-btn-primary" : "cf-btn-ghost"}`} onClick={() => setOpen(true)}>
        + {esEgreso ? "Agregar egreso" : "Agregar ingreso"}
      </button>
      {open && (
        <div className="cf-scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="cf-modal" style={{ maxWidth: 460 }}>
            <div className="cf-modal-head">
              <h3>{esEgreso ? "Nuevo egreso" : "Nuevo ingreso"}</h3>
              <button type="button" className="x" onClick={() => setOpen(false)}>✕</button>
            </div>
            <form action={esEgreso ? crearEgreso : crearIngreso}>
              <input type="hidden" name="mes" value={mes} />
              {esEgreso && <input type="hidden" name="afectaUtilidad" value={afecta ? "1" : "0"} />}
              <div className="cf-modal-body">
                <div className="cf-f"><label>Concepto</label><input name="concepto" required placeholder={esEgreso ? "Ej. Gastos variables del mes" : "Ej. Reselling Leadtion"} /></div>
                {esEgreso && (
                  <>
                    <div className="cf-f"><label>Marca</label><input name="marca" placeholder="TRD / Ebenezer / Leadtion" /></div>
                    <div className="cf-f"><label>Tipo</label>
                      <div className="cf-seg">
                        <label><input type="radio" name="_af" checked={afecta} onChange={() => setAfecta(true)} /><span>Afecta utilidad</span></label>
                        <label><input type="radio" name="_af" checked={!afecta} onChange={() => setAfecta(false)} /><span>Sale de caja</span></label>
                      </div>
                    </div>
                    <div className="cf-f"><label>Fecha</label><input type="date" name="fecha" defaultValue={`${mes}-01`} /></div>
                    <div className="cf-f"><label>Valor COP (opcional)</label><input name="valorCop" inputMode="decimal" placeholder="—" /></div>
                  </>
                )}
                <div className="cf-f"><label>Valor USD</label><input name="valorUsd" inputMode="decimal" placeholder="0" required /></div>
              </div>
              <div className="cf-modal-foot">
                <button type="button" className="cf-btn cf-btn-ghost" onClick={() => setOpen(false)}>Cancelar</button>
                <button type="submit" className="cf-btn cf-btn-primary">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
