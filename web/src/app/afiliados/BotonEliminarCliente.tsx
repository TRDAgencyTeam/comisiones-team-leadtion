"use client";

import { eliminarClienteAfiliado } from "./acciones";
import { IconoBorrar } from "@/components/Iconos";

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
      <button type="submit" className="btn-borrar icon-btn danger con-texto" title="Eliminar cliente de Afiliados"><IconoBorrar /><span className="lbl">Eliminar</span></button>
    </form>
  );
}
