"use client";

import { eliminarSoporte } from "./acciones";
import { IconoBorrar } from "@/components/Iconos";

/** Botón para eliminar un período de soporte, con confirmación (recalcula el historial). */
export function BotonEliminarSoporte({ soporteId, clienteId }: { soporteId: number; clienteId: number }) {
  return (
    <form
      action={eliminarSoporte}
      onSubmit={(e) => {
        if (!confirm("¿Eliminar este período de soporte? Esos meses vuelven a su valor normal.")) e.preventDefault();
      }}
    >
      <input type="hidden" name="soporteId" value={soporteId} />
      <input type="hidden" name="clienteId" value={clienteId} />
      <button type="submit" className="btn-borrar icon-btn danger" title="Eliminar soporte" aria-label="Eliminar soporte"><IconoBorrar /></button>
    </form>
  );
}
