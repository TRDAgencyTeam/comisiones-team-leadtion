"use client";

import { useState, useTransition } from "react";
import { ESTADOS } from "@/lib/facturacion-calc";
import { cambiarEstadoFactura } from "@/app/trd/clientes/acciones";

/**
 * Selector de estado (semáforo) CONTROLADO: el valor mostrado sigue al estado
 * elegido (sin revertir el texto). "¿Continúa?" (por_confirmar) es automático:
 * solo aparece si la fila ya está en ese estado; no se puede elegir a mano.
 */
export function EstadoFactura({ id, estado }: { id: number; estado: string }) {
  const [val, setVal] = useState(estado);
  const [pending, start] = useTransition();
  const opciones = ESTADOS.filter((e) => e.value !== "por_confirmar" || val === "por_confirmar");

  return (
    <select
      className={`estado-sel est-${val}`}
      value={val}
      disabled={pending}
      onChange={(e) => {
        const v = e.target.value;
        setVal(v);
        const fd = new FormData();
        fd.set("id", String(id));
        fd.set("estado", v);
        start(async () => { await cambiarEstadoFactura(fd); });
      }}
    >
      {opciones.map((e) => <option key={e.value} value={e.value}>{e.label}</option>)}
    </select>
  );
}
