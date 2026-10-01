"use client";

import { useEffect, useState } from "react";
import { IconoCheck } from "@/components/Iconos";

const COOKIE = "trd_flash";

function leerFlash(): string | null {
  const m = document.cookie.match(/(?:^|;\s*)trd_flash=([^;]*)/);
  if (!m || !m[1]) return null;
  document.cookie = `${COOKIE}=; Max-Age=0; path=/`;
  try { return decodeURIComponent(decodeURIComponent(m[1])); } catch { return m[1]; }
}

/**
 * Notificaciones tipo "Actualizado". El servidor deja el mensaje con `flash()`
 * (lib/flash.ts) al terminar una edición; aquí se detecta apenas llega la
 * respuesta, se muestra unos segundos y se quita el loader.
 */
export function Avisos() {
  const [lista, setLista] = useState<{ id: number; msg: string; out: boolean }[]>([]);

  useEffect(() => {
    const revisar = () => {
      const msg = leerFlash();
      if (!msg) return;
      window.dispatchEvent(new Event("trd:ocultar-carga"));
      const id = Date.now() + Math.random();
      setLista((l) => [...l, { id, msg, out: false }]);
      setTimeout(() => setLista((l) => l.map((t) => (t.id === id ? { ...t, out: true } : t))), 2600);
      setTimeout(() => setLista((l) => l.filter((t) => t.id !== id)), 2900);
    };
    revisar();
    const iv = setInterval(revisar, 300);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="trd-toasts" aria-live="polite">
      {lista.map((t) => (
        <div key={t.id} className={`trd-toast${t.out ? " out" : ""}`} role="status">
          <span className="ok"><IconoCheck size={15} /></span>{t.msg}
        </div>
      ))}
    </div>
  );
}
