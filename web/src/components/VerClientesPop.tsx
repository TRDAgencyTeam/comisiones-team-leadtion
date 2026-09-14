"use client";
import { useState } from "react";

export interface ClientePopItem {
  nombre: string;
  /** Texto secundario opcional (p. ej. el tipo de servicio). */
  detalle?: string;
  /** Monto opcional a la derecha. */
  monto?: number;
}

const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD" });

/**
 * Botón "ver clientes" que despliega un POP-UP (no navega a otra página) con la
 * lista de clientes de esa fila. Reutiliza los estilos .pop-card/.pop-lista.
 */
export function VerClientesPop({
  titulo,
  items,
  label = "ver clientes",
}: {
  titulo: string;
  items: ClientePopItem[];
  label?: string;
}) {
  const [open, setOpen] = useState(false);
  return (
    <span className="verpop-wrap">
      <button
        type="button"
        className="link-ver verpop-btn"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        {label} ({items.length}) {open ? "▲" : "▾"}
      </button>
      {open && (
        <>
          <button type="button" className="verpop-back" aria-label="Cerrar" onClick={() => setOpen(false)} />
          <div className="verpop" role="dialog">
            <div className="pop-card">
              <div className="pop-title">{titulo} ({items.length})</div>
              {items.length === 0 ? (
                <p className="empty" style={{ margin: 0 }}>Ninguno este mes.</p>
              ) : (
                <ul className="pop-lista verpop-scroll">
                  {items.map((it, i) => (
                    <li key={`${it.nombre}-${i}`}>
                      <span className="pop-cli">{it.nombre}</span>
                      {it.detalle && <span className="pop-serv">{it.detalle}</span>}
                      {it.monto != null && <span className="pop-monto">{usd(it.monto)}</span>}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </span>
  );
}
