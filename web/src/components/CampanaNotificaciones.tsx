"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Notificacion } from "@/lib/notificaciones";

/**
 * Campanita de notificaciones (popup de resumen). Muestra un badge con el total;
 * al abrir, lista las alertas; al tocar una, lleva al origen (ficha del cliente).
 */
export function CampanaNotificaciones({ notificaciones }: { notificaciones: Notificacion[] }) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const ref = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const n = notificaciones.length;
  const urgentes = notificaciones.filter((x) => x.nivel === "urgente").length;

  // El popup se posiciona FIJO respecto al botón: la campana vive dentro del
  // sidebar con overflow oculto, así que `position:absolute` lo recortaría.
  const abrir = () => {
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      const ancho = 300;
      const left = Math.min(r.left, window.innerWidth - ancho - 12);
      setPos({ top: r.bottom + 8, left: Math.max(12, left) });
    }
    setOpen((o) => !o);
  };

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    const cerrar = () => setOpen(false);
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onEsc);
    window.addEventListener("resize", cerrar);
    return () => { document.removeEventListener("mousedown", onDoc); document.removeEventListener("keydown", onEsc); window.removeEventListener("resize", cerrar); };
  }, [open]);

  return (
    <div className="campana" ref={ref}>
      <button ref={btnRef} type="button" className="campana-btn" onClick={abrir} aria-label={`Notificaciones${n ? ` (${n})` : ""}`} title="Notificaciones">
        <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" /><path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {n > 0 && <span className={`campana-badge${urgentes ? " urg" : ""}`}>{n}</span>}
      </button>
      {open && (
        <div className="campana-pop" style={{ top: pos.top, left: pos.left }}>
          <div className="campana-pop-h">Notificaciones {n > 0 && <span>({n})</span>}</div>
          <div className="campana-pop-body">
            {n === 0 && <p className="campana-vacio">No tienes notificaciones por revisar.</p>}
            {notificaciones.map((x) => (
              <Link key={x.id} href={x.href} className={`campana-item ${x.nivel}`} onClick={() => setOpen(false)}>
                <span className="ci-dot" aria-hidden />
                <span className="ci-txt">
                  <b>{x.titulo}</b>
                  <small>{x.detalle}</small>
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
