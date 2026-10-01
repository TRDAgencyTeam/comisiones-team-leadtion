"use client";

import { useState, useTransition } from "react";
import { ESTADOS } from "@/lib/facturacion-calc";
import { cambiarEstadoFactura } from "@/app/trd/clientes/acciones";
import { CierreClienteModal } from "@/components/CierreClienteModal";
import { PagoFechaModal, FECHA_POR_ESTADO } from "@/components/PagoFechaModal";
import { conCarga } from "@/lib/carga";

/**
 * Selector de estado (semáforo) CONTROLADO. "Anulado" abre el popup de cierre;
 * Pagado / Facturado / Por facturar / Programado abren el popup de fecha (hoy o
 * personalizada). Los demás estados se aplican al instante.
 */
export function EstadoFactura({ id, estado, fechaFactura }: { id: number; estado: string; fechaFactura?: string | null }) {
  const [val, setVal] = useState(estado);
  const [prev, setPrev] = useState(estado);
  const [modal, setModal] = useState<null | "anular" | "fecha">(null);
  const [pending, start] = useTransition();
  const opciones = ESTADOS.filter((e) => e.value !== "por_confirmar" || val === "por_confirmar");

  const persist = (v: string, fecha?: string) => {
    const fd = new FormData();
    fd.set("id", String(id));
    fd.set("estado", v);
    if (fecha) fd.set("fecha", fecha);
    start(async () => { await conCarga(cambiarEstadoFactura(fd)); });
  };

  return (
    <>
      <select
        className={`estado-sel est-${val}`}
        value={val}
        disabled={pending}
        onChange={(e) => {
          const v = e.target.value;
          setPrev(val); setVal(v);
          if (v === "anulado") { setModal("anular"); return; }
          if (FECHA_POR_ESTADO[v]) { setModal("fecha"); return; }
          persist(v);
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
      {modal === "fecha" && (
        <PagoFechaModal
          estado={val}
          fechaActual={fechaFactura}
          onCancel={() => { setModal(null); setVal(prev); }}
          onConfirm={(fecha) => { setModal(null); persist(val, fecha); }}
        />
      )}
    </>
  );
}
