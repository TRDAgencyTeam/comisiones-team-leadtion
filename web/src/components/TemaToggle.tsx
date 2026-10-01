"use client";

import { useEffect, useState } from "react";
import { IconoLuna, IconoSistema, IconoSol } from "@/components/Iconos";
import { CLAVE_TEMA } from "@/lib/tema";

type Tema = "light" | "dark" | "system";

/** Aplica el tema al <html>. "system" quita el atributo y manda el sistema operativo. */
function aplicar(t: Tema) {
  const html = document.documentElement;
  if (t === "system") html.removeAttribute("data-theme"); else html.setAttribute("data-theme", t);
}

/**
 * Selector de tema de la plataforma (Claro / Oscuro / Sistema). Se recuerda en el
 * navegador; el script del layout raíz lo aplica antes de pintar (sin parpadeo).
 */
export function TemaToggle() {
  const [tema, setTema] = useState<Tema>("system");
  useEffect(() => {
    try { const t = localStorage.getItem(CLAVE_TEMA); if (t === "light" || t === "dark") setTema(t); } catch {}
  }, []);
  const elegir = (t: Tema) => {
    setTema(t); aplicar(t);
    try { if (t === "system") localStorage.removeItem(CLAVE_TEMA); else localStorage.setItem(CLAVE_TEMA, t); } catch {}
  };
  const op: { t: Tema; label: string; ic: React.ReactNode }[] = [
    { t: "light", label: "Tema claro", ic: <IconoSol /> },
    { t: "dark", label: "Tema oscuro", ic: <IconoLuna /> },
    { t: "system", label: "Igual que el sistema", ic: <IconoSistema /> },
  ];
  return (
    <div className="tema-toggle" role="radiogroup" aria-label="Tema de la plataforma">
      {op.map((o) => (
        <button key={o.t} type="button" role="radio" aria-checked={tema === o.t} title={o.label} aria-label={o.label}
          className={tema === o.t ? "on" : ""} onClick={() => elegir(o.t)}>{o.ic}</button>
      ))}
    </div>
  );
}
