/** Indicador de carga de la plataforma madre: logo TRD palpitando. Se muestra
 *  automáticamente mientras Next carga cualquier página del módulo /trd. */
export default function Loading() {
  return (
    <div className="trd-loading" role="status" aria-live="polite">
      <div className="trd-loading-badge">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/brand/trd/trd-symbol-white.png" alt="" width={40} height={40} />
      </div>
      <span>Cargando…</span>
    </div>
  );
}
