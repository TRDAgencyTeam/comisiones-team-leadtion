"use client";

import { useFormStatus } from "react-dom";
import { login } from "./actions";

/** Botón + overlay de carga: mientras la acción corre, el símbolo palpita. */
function SubmitZone() {
  const { pending } = useFormStatus();
  return (
    <>
      <button type="submit" disabled={pending}>
        {pending ? "Ingresando…" : "Entrar"}
      </button>
      {pending && (
        <div className="loader-overlay" role="status" aria-live="polite">
          {/* Login general de la plataforma madre: logo TRD (el de Leadtion solo en sus módulos). */}
          <div className="trd-loading-badge">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/brand/trd/trd-symbol-white.png" alt="" width={40} height={40} />
          </div>
          <p>Cargando la plataforma…</p>
        </div>
      )}
    </>
  );
}

export function LoginForm({ error }: { error?: string }) {
  return (
    // data-sin-carga: este formulario ya tiene su propio cargador (evita dos logos encima).
    <form action={login} className="login-form" data-sin-carga>
      <label>
        Email
        <input type="email" name="email" required autoComplete="email" autoFocus />
      </label>
      <label>
        Contraseña
        <input type="password" name="password" required autoComplete="current-password" />
      </label>
      {error && <p className="login-error">{error}</p>}
      <SubmitZone />
    </form>
  );
}
