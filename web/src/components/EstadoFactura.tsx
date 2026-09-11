"use client";

import { useState, useTransition } from "react";
import { ESTADOS } from "@/lib/facturacion-calc";
import { cambiarEstadoFactura } from "@/app/trd/clientes/acciones";
import { CierreClienteModal, type Hermana } from "@/components/CierreClienteModal";

/**
 * Selector de estado (semáforo) CONTROLADO. Al elegir "Anulado" en una factura de
 * un cliente, abre el popup de cierre (anular solo la factura o terminar contrato
 * y sincronizar con Membresías). Los demás estados se aplican al instante.
 */
export function EstadoFactura({
  id, estado, clienteId = null, clienteNombre = "", esMiembro = false, hermanas = [],
}: { id: number; estado: string; clienteId?: number | null; clienteNombre?: string; esMiembro?: boolean; hermanas?: Hermana[] }) {
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
          clienteId={clienteId}
          clienteNombre={clienteNombre}
          esMiembro={esMiembro}
          hermanas={hermanas}
          onCancel={() => { setModal(false); setVal(prev); }}
          onConfirm={() => { setModal(false); }}
        />
      )}
    </>
  );
}
