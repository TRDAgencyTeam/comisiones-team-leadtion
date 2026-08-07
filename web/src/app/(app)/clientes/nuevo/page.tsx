import Link from "next/link";
import { crearCliente } from "../acciones";

export const dynamic = "force-dynamic";

export default async function NuevoClientePage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="wrap">
      <header className="page">
        <h1>Agregar cliente</h1>
        <p>
          El sistema lo tendrá en cuenta automáticamente para las comisiones,
          según su fecha de activación.
        </p>
      </header>

      <section className="card">
        <form action={crearCliente} className="form-vert">
          <label>
            Nombre del cliente *
            <input type="text" name="nombre" required autoFocus />
          </label>
          <label>
            Fecha de activación *
            <input type="date" name="fechaActivacion" required />
            <small>Determina desde cuándo genera comisión y sus hitos.</small>
          </label>
          <label>
            Plan con que entró
            <select name="planTipo" defaultValue="">
              <option value="">— Sin especificar</option>
              <option value="agente_ai">Agente AI (entra pagando $847)</option>
              <option value="reactivacion">Reactivación ($991 en 3 fases)</option>
            </select>
          </label>
          <label>
            Soporte activo
            <select name="soporteValor" defaultValue="">
              <option value="">— Sin soporte (solo membresía)</option>
              <option value="87">Soporte $87</option>
              <option value="119">Soporte $119</option>
              <option value="157">Soporte $157</option>
            </select>
            <small>El soporte ya incluye la membresía. Para Agente IA solo aplican $119 o $157.</small>
          </label>
          <label className="check-label">
            <input type="checkbox" name="marketing" value="1" />
            Entró con plan de marketing (la licencia se paga dentro del plan de mkt)
          </label>
          <label>
            Valor mostrado (opcional)
            <input type="number" name="valorLicencia" step="0.01" placeholder="Ej. 197" />
            <small>Solo referencia. La base de comisión es $67/$69 según la fecha.</small>
          </label>

          {error && <p className="login-error">{error}</p>}

          <div className="form-actions">
            <Link href="/clientes" className="btn-secondary">
              Cancelar
            </Link>
            <button type="submit" className="btn-primary">
              Guardar cliente
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
