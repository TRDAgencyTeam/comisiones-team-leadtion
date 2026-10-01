"use client";

import { useEffect, useState } from "react";
import { IconoCheck } from "@/components/Iconos";
import { prepararSonidos, sonar, type Sonido } from "@/lib/sonidos";

const COOKIE = "trd_flash";

/** Lee y borra el aviso. Formato {m, s} (mensaje + sonido); acepta texto plano viejo. */
function leerFlash(): { msg: string; sonido: Sonido } | null {
  const m = document.cookie.match(/(?:^|;\s*)trd_flash=([^;]*)/);
  if (!m || !m[1]) return null;
  document.cookie = `${COOKIE}=; Max-Age=0; path=/`;
  let txt = m[1];
  for (let i = 0; i < 2; i++) { try { txt = decodeURIComponent(txt); } catch { break; } }
  try {
    const o = JSON.parse(txt) as { m?: string; s?: Sonido };
    if (o && typeof o.m === "string") return { msg: o.m, sonido: o.s === "caja" ? "caja" : "ok" };
  } catch { /* texto plano */ }
  return { msg: txt, sonido: "ok" };
}

/**
 * Notificaciones tipo "Actualizado" / "¡Buen trabajo!". El servidor deja el mensaje
 * con `flash()` (lib/flash.ts) al terminar; aquí se detecta apenas llega la
 * respuesta, suena, se muestra unos segundos y se quita el loader.
 */
export function Avisos() {
  const [lista, setLista] = useState<{ id: number; msg: string; sonido: Sonido; out: boolean }[]>([]);

  useEffect(() => {
    prepararSonidos();
    const revisar = () => {
      const f = leerFlash();
      if (!f) return;
      window.dispatchEvent(new Event("trd:ocultar-carga"));
      sonar(f.sonido);
      const id = Date.now() + Math.random();
      setLista((l) => [...l, { id, ...f, out: false }]);
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
        <div key={t.id} className={`trd-toast${t.sonido === "caja" ? " caja" : ""}${t.out ? " out" : ""}`} role="status">
          <span className="ok">{t.sonido === "caja" ? <span aria-hidden style={{ fontSize: 15 }}>$</span> : <IconoCheck size={15} />}</span>{t.msg}
        </div>
      ))}
    </div>
  );
}
