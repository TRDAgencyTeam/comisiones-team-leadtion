"use client";

import { eliminarServicio } from "./acciones";

/** Botón para eliminar un servicio adquirido, con confirmación (recalcula el historial). */
export function BotonEliminarServicio({
  servicioId,
  clienteId,
  etiqueta,
}: {
  servicioId: number;
  clienteId: number;
  etiqueta: string;
}) {
  return (
    <form
      action={eliminarServicio}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar el servicio "${etiqueta}"? Se recalculará el historial mensual (se quitarán sus cobros).`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="servicioId" value={servicioId} />
      <input type="hidden" name="clienteId" value={clienteId} />
      <button type="submit" className="btn-borrar" title="Eliminar servicio" aria-label={`Eliminar ${etiqueta}`}>🗑️</button>
    </form>
  );
}
