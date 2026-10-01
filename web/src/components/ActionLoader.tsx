"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { EVENTO_CARGA } from "@/lib/carga";
import { LeadtionSymbol } from "@/components/Brand";

/**
 * Overlay global de carga: el logo TRD palpitando mientras la plataforma trabaja.
 * Se activa con:
 *  - cualquier formulario que se envía (guardar, agregar, eliminar, filtros…),
 *  - cualquier enlace interno (cambiar de pestaña, opción o módulo),
 *  - acciones sueltas que avisan con `conCarga()` (lib/carga.ts).
 * Se oculta cuando cambia la ruta, cuando el contenido se actualiza o al llegar el
 * aviso del servidor. Si un confirm() se cancela, no se queda pegado.
 */
export function ActionLoader() {
  const [on, setOn] = useState(false);
  const path = usePathname();
  const qs = useSearchParams().toString();
  const ref = useRef<{ hide: () => void }>({ hide: () => {} });

  // Cambió la ruta o los filtros → terminó la navegación.
  useEffect(() => { ref.current.hide(); }, [path, qs]);

  useEffect(() => {
    let tSafe: ReturnType<typeof setTimeout> | undefined;
    let tHide: ReturnType<typeof setTimeout> | undefined;
    let obs: MutationObserver | undefined;
    let formActivo: HTMLFormElement | null = null;
    let manual = 0; // acciones con conCarga() en curso

    const hide = () => {
      if (manual > 0) return;
      clearTimeout(tSafe); clearTimeout(tHide); obs?.disconnect(); formActivo = null; setOn(false);
    };
    ref.current.hide = hide;

    const show = (form: HTMLFormElement | null = null, observar = true) => {
      formActivo = form;
      setOn(true);
      clearTimeout(tSafe);
      tSafe = setTimeout(() => { manual = 0; hide(); }, 15000); // red de seguridad
      obs?.disconnect();
      // Navegación por enlace: solo se oculta cuando cambia la ruta (no por cambios sueltos del DOM).
      if (!observar) return;
      obs = new MutationObserver((recs) => {
        // Ignora cambios del propio formulario (botón deshabilitado…), del overlay y de los avisos.
        const propio = (n: Node) => {
          const el = n instanceof Element ? n : n.parentElement;
          return !el || !!el.closest(".trd-action-scrim, .trd-toasts") || !!(formActivo && formActivo.contains(el));
        };
        const relevante = recs.some((r) => {
          if (propio(r.target)) return false;
          // El overlay/aviso apareciendo o desapareciendo no cuenta como "contenido actualizado".
          const nodos = [...Array.from(r.addedNodes), ...Array.from(r.removedNodes)];
          return nodos.length === 0 || !nodos.every((n) => n instanceof Element && n.matches(".trd-action-scrim, .trd-toast"));
        });
        if (!relevante) return;
        clearTimeout(tHide); tHide = setTimeout(hide, 180);
      });
      obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    };

    const onSubmit = (e: Event) => {
      const f = e.target;
      if (!(f instanceof HTMLFormElement) || f.target === "_blank" || f.hasAttribute("data-sin-carga")) return;
      show(f);
    };
    const onClick = (e: MouseEvent) => {
      // Fase de captura: los <Link> de Next cancelan el clic (preventDefault) para navegar sin recargar.
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]") as HTMLAnchorElement | null;
      if (!a || a.target === "_blank" || a.hasAttribute("download") || a.hasAttribute("data-sin-carga")) return;
      const url = new URL(a.href, location.href);
      if (url.origin !== location.origin) return;
      if (url.pathname === location.pathname && url.search === location.search) return; // mismo lugar / ancla
      show(null, false);
    };
    const onCarga = (e: Event) => {
      if ((e as CustomEvent<boolean>).detail) { manual++; show(); return; }
      manual = Math.max(0, manual - 1);
      if (!manual) { clearTimeout(tHide); tHide = setTimeout(hide, 180); }
    };
    // confirm() cancelado (p. ej. "¿Eliminar…?") → no hay acción: quitar el loader.
    const confirmOriginal = window.confirm;
    window.confirm = (msg?: string) => { const ok = confirmOriginal.call(window, msg); if (!ok) hide(); return ok; };

    document.addEventListener("submit", onSubmit, true);
    window.addEventListener("click", onClick, true);
    window.addEventListener(EVENTO_CARGA, onCarga);
    window.addEventListener("trd:ocultar-carga", hide);
    return () => {
      document.removeEventListener("submit", onSubmit, true);
      window.removeEventListener("click", onClick, true);
      window.removeEventListener(EVENTO_CARGA, onCarga);
      window.removeEventListener("trd:ocultar-carga", hide);
      window.confirm = confirmOriginal;
      obs?.disconnect(); clearTimeout(tSafe); clearTimeout(tHide);
    };
  }, []);

  if (!on) return null;
  // Logo según la plataforma: Leadtion en sus módulos; TRD en todo lo demás.
  const esLeadtion = /^\/(membresias|cs|afiliados)(\/|$)/.test(path);
  return (
    <div className="trd-action-scrim" role="status" aria-label="Cargando">
      {esLeadtion ? (
        <LeadtionSymbol size={84} color="white" className="pulse" />
      ) : (
        <div className="trd-loading-badge">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/trd/trd-symbol-white.png" alt="" width={40} height={40} />
        </div>
      )}
    </div>
  );
}
