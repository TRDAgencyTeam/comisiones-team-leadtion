"use client";

import { useEffect, useState } from "react";

/**
 * Overlay global de carga: muestra el logo TRD palpitando cuando se envía
 * cualquier formulario/acción (guardar, agregar, marcar…) y lo oculta cuando el
 * contenido del área principal se actualiza (revalidación o navegación).
 */
export function ActionLoader() {
  const [on, setOn] = useState(false);
  useEffect(() => {
    let hideT: ReturnType<typeof setTimeout> | undefined;
    let obs: MutationObserver | undefined;
    const show = () => {
      setOn(true);
      clearTimeout(hideT);
      hideT = setTimeout(() => setOn(false), 8000); // red de seguridad
      const main = document.querySelector(".trd-main") ?? document.body;
      obs?.disconnect();
      obs = new MutationObserver(() => { clearTimeout(hideT); hideT = setTimeout(() => setOn(false), 150); });
      obs.observe(main, { childList: true, subtree: true });
    };
    const onSubmit = (e: Event) => { if (e.target instanceof HTMLFormElement) show(); };
    document.addEventListener("submit", onSubmit, true);
    return () => { document.removeEventListener("submit", onSubmit, true); obs?.disconnect(); clearTimeout(hideT); };
  }, []);

  if (!on) return null;
  return (
    <div className="trd-action-scrim" role="status" aria-label="Cargando">
      <div className="trd-loading-badge">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/trd/trd-symbol-white.png" alt="" width={40} height={40} />
      </div>
    </div>
  );
}
