"use client";

import { useState, useTransition } from "react";
import { ESTADOS } from "@/lib/facturacion-calc";
import { cambiarEstadoFactura } from "@/app/trd/clientes/acciones";
import { CierreClienteModal } from "@/components/CierreClienteModal";

/**
 * Selector de estado (semáforo) CONTROLADO. Al elegir "Anulado" abre el popup de
 * cierre (analiza los servicios del cliente y permite desactivarlos por separado).
 * Los demás estados se aplican al instante.
 */
export function EstadoFactura({ id, estado }: { id: number; estado: string }) {
  const [val, setVal] = useState(estado);
  const [prev, setPrev] = useState(estado);
  const [modal, setModal] = useState(false);
  const [pending, start] = useTransition();
  const opciones = ESTADOS.filter((e) => e.value !== "por_confirmar" || val === "por_confirmar");

  const persist = (v: string) => {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("estado", v);
    start(async () => { await cambiarEstadoFactura(fd); });
  };

  return (
    <>
      <select
        className={`estado-sel est-${val}`}
        value={val}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          if (v === "anulado") { setPrev(val); setVal("anulado"); setModal(true); return; }
          setPrev(val); setVal(v); persist(v);
        }}
      >
        {opciones.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
      </select>
      {modal && (
        <CierreClienteModal
          facturaId={id}
          onCancel={() => { setModal(false); setVal(prev); }}
          onConfirm={() => { setModal(false); }}
        />
      )}
    </>
  );
}
