"use client";

import { eliminarClienteAfiliado } from "./acciones";

/** Botón para eliminar un cliente referido (con confirmación). */
export function BotonEliminarCliente({ refCliente, nombre }: { refCliente: string; nombre: string }) {
  return (
    <form
      action={eliminarClienteAfiliado}
      onSubmit={(e) => {
        if (!confirm(`¿Eliminar a "${nombre}" de Afiliados? Se quitan sus servicios y pagos de comisión aquí. (No afecta al cliente en Membresías.)`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="ref" value={refCliente} />
      <button type="submit" className="btn-borrar" title="Eliminar cliente de Afiliados">🗑️ Eliminar</button>
    </form>
  );
}
