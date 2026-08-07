"use client";

import { useFormStatus } from "react-dom";
import { login } from "./actions";
import { LeadtionSymbol } from "@/components/Brand";

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
          <LeadtionSymbol size={80} className="pulse" />
          <p>Cargando la plataforma…</p>
        </div>
      )}
    </>
  );
}

export function LoginForm({ error }: { error?: string }) {
  return (
    <form action={login} className="login-form">
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
