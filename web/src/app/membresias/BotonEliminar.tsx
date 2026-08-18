"use client";

import { eliminarMembresia } from "./acciones";

/** Icono de basura para eliminar un cliente, con confirmación (acción irreversible). */
export function BotonEliminar({ id, nombre }: { id: number; nombre: string }) {
  return (
    <form
      action={eliminarMembresia}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar a "${nombre}"? Se borra el cliente y todo su historial (pagos, hitos, servicios). Esta acción no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="id" value={id} />
      <button type="submit" className="btn-borrar" title={`Eliminar ${nombre}`} aria-label={`Eliminar ${nombre}`}>
        🗑️
      </button>
    </form>
  );
}
