"use client";

import { useState, useTransition } from "react";
import { ESTADOS } from "@/lib/facturacion-calc";
import { cambiarEstadoFactura } from "@/app/trd/clientes/acciones";
import { CierreClienteModal } from "@/components/CierreClienteModal";
import { PagoFechaModal } from "@/components/PagoFechaModal";

/**
 * Selector de estado (semáforo) CONTROLADO. "Anulado" abre el popup de cierre;
 * "Pagado" abre el popup de confirmación de fecha (hoy o personalizada). Los demás
 * estados se aplican al instante.
 */
export function EstadoFactura({ id, estado }: { id: number; estado: string }) {
  const [val, setVal] = useState(estado);
  const [prev, setPrev] = useState(estado);
  const [modal, setModal] = useState<null | "anular" | "pago">(null);
  const [pending, start] = useTransition();
  const opciones = ESTADOS.filter((e) => e.value !== "por_confirmar" || val === "por_confirmar");

  const persist = (v: string, fechaPago?: string) => {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("estado", v);
    if (fechaPago) fd.set("fechaPago", fechaPago);
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
          if (v === "anulado") { setPrev(val); setVal("anulado"); setModal("anular"); return; }
          if (v === "pagado") { setPrev(val); setVal("pagado"); setModal("pago"); return; }
          setPrev(val); setVal(v); persist(v);
        }}
      >
        {opciones.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
      </select>
      {modal === "anular" && (
        <CierreClienteModal
          facturaId={id}
          onCancel={() => { setModal(null); setVal(prev); }}
          onConfirm={() => { setModal(null); }}
        />
      )}
      {modal === "pago" && (
        <PagoFechaModal
          onCancel={() => { setModal(null); setVal(prev); }}
          onConfirm={(fecha) => { setModal(null); persist("pagado", fecha); }}
        />
      )}
    </>
  );
}
