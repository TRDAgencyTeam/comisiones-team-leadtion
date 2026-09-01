"use client";

import { useRef } from "react";
import { ESTADOS } from "@/lib/facturacion-calc";
import { cambiarEstadoFactura } from "@/app/trd/clientes/acciones";

/** Chip-selector del estado (semáforo) de una factura; guarda al cambiar. */
export function EstadoFactura({ id, estado }: { id: number; estado: string }) {
  const ref = useRef<HTMLFormElement>(null);
  return (
    <form action={cambiarEstadoFactura} ref={ref}>
      <input type="hidden" name="id" value={id} />
      <select name="estado" defaultValue={estado} className={`estado-sel est-${estado}`} onChange={() => ref.current?.requestSubmit()}>
        {ESTADOS.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
      </select>
    </form>
  );
}
