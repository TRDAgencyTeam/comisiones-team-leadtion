"use client";

import { useEffect, useState } from "react";
import { crearEgreso, crearIngreso, editarIngreso } from "@/app/trd/clientes/acciones";

export interface IngresoEdit { id: number; concepto: string; valorUsd: number; categoria: string | null }

// Grupos de egreso → (categoria, subcategoria, afectaUtilidad)
const GRUPOS_EGRESO: Record<string, { label: string; categoria: string; subcategoria: string | null; afecta: boolean }> = {
  nomina:     { label: "Nómina (persona)", categoria: "fijo", subcategoria: "nomina", afecta: true },
  operativo:  { label: "Operativo fijo (arriendo, luz, internet…)", categoria: "fijo", subcategoria: "servicio_publico", afecta: true },
  herramienta:{ label: "Herramienta / Hosting", categoria: "fijo", subcategoria: "herramienta", afecta: true },
  leadtion:   { label: "Operación Leadtion (comisión, API, bono…)", categoria: "api", subcategoria: null, afecta: true },
  variable:   { label: "Gasto variable del mes", categoria: "variable", subcategoria: null, afecta: true },
  caja:       { label: "Sale de caja (inversión, cuota…)", categoria: "otro", subcategoria: null, afecta: false },
};

// Categorías de "otro ingreso" (van a Facturación)
const CAT_INGRESO = ["reselling", "afiliado", "mantenimiento", "reserva", "api", "afiliacion", "otro"];

export function MovimientoModal({ mes, tipo, grupoInicial, editar }: { mes: string; tipo: "egreso" | "ingreso"; grupoInicial?: string; editar?: IngresoEdit }) {
  const [open, setOpen] = useState(false);
  const [grupo, setGrupo] = useState(grupoInicial ?? "variable");
  const esEgreso = tipo === "egreso";
  const esEdit = !!editar;
  const g = GRUPOS_EGRESO[grupo] ?? GRUPOS_EGRESO.variable!;

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [open]);

  return (
    <>
      {esEdit
        ? <button type="button" className="link-ver" onClick={() => setOpen(true)} title="Editar">✎</button>
        : <button type="button" className={`cf-btn ${esEgreso ? "cf-btn-primary" : "cf-btn-ghost"}`} onClick={() => setOpen(true)}>+ {esEgreso ? "Agregar egreso" : "Agregar otro ingreso"}</button>}
      {open && (
        <div className="cf-scrim" onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}>
          <div className="cf-modal" style={{ maxWidth: 460 }}>
            <div className="cf-modal-head"><h3>{esEdit ? "Editar ingreso" : esEgreso ? "Nuevo egreso" : "Nuevo ingreso"}</h3><button type="button" className="x" onClick={() => setOpen(false)}>✕</button></div>
            <form action={esEdit ? editarIngreso : esEgreso ? crearEgreso : crearIngreso}>
              <input type="hidden" name="mes" value={mes} />
              {esEdit && <input type="hidden" name="id" value={editar!.id} />}
              {esEgreso && !esEdit && <><input type="hidden" name="afectaUtilidad" value={g.afecta ? "1" : "0"} /><input type="hidden" name="categoria" value={g.categoria} />{g.subcategoria && <input type="hidden" name="subcategoria" value={g.subcategoria} />}</>}
              <div className="cf-modal-body">
                {esEgreso && !esEdit && (
                  <div className="cf-f"><label>Grupo</label>
                    <select value={grupo} onChange={(e) => setGrupo(e.target.value)}>
                      {Object.entries(GRUPOS_EGRESO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <span className="cf-hint">{g.afecta ? "Afecta la utilidad del mes." : "Sale de caja: no baja la utilidad."}</span>
                  </div>
                )}
                <div className="cf-f"><label>Concepto</label><input name="concepto" required defaultValue={editar?.concepto ?? ""} placeholder={esEgreso ? (grupo === "nomina" ? "Nombre de la persona" : "Ej. Zoom, arriendo…") : "Ej. Reselling Leadtion"} /></div>
                {esEgreso && !esEdit && grupo !== "nomina" && <div className="cf-f"><label>Marca</label><input name="marca" placeholder="TRD / Ebenezer / Leadtion" /></div>}
                {esEgreso && !esEdit && grupo === "nomina" && <div className="cf-f"><label>Área</label><input name="marca" placeholder="SM / LT / AV…" /></div>}
                {!esEgreso && (
                  <div className="cf-f"><label>Categoría</label>
                    <select name="categoria" defaultValue={editar?.categoria ?? "reselling"}>{CAT_INGRESO.map((c) => <option key={c} value={c}>{c}</option>)}</select>
                  </div>
                )}
                {esEgreso && !esEdit && <div className="cf-f"><label>Fecha</label><input type="date" name="fecha" defaultValue={`${mes}-01`} /></div>}
                {esEgreso && !esEdit && <div className="cf-f"><label>Valor COP (opcional)</label><input name="valorCop" inputMode="decimal" placeholder="—" /></div>}
                <div className="cf-f"><label>Valor USD</label><input name="valorUsd" inputMode="decimal" defaultValue={editar?.valorUsd ?? ""} placeholder="0" required /></div>
              </div>
              <div className="cf-modal-foot"><button type="button" className="cf-btn cf-btn-ghost" onClick={() => setOpen(false)}>Cancelar</button><button type="submit" className="cf-btn cf-btn-primary">Guardar</button></div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
